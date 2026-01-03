#!/usr/bin/env bun

import chalk from "chalk";
import { program } from "commander";
import pkg from "../package.json" with { type: "json" };
import { aggregateByProject } from "../src/aggregator.ts";
import { formatRecoveryReport, generateRecoveryReport } from "../src/context/recovery.ts";
import { cronInstall, cronRun, cronStatus, cronUninstall, postToSlack } from "../src/cron.ts";
import { formatProjectOutput, getFormat } from "../src/formatters/index.ts";
import {
	formatSmartSummaryJson,
	formatSmartSummaryMarkdown,
	formatSmartSummaryPlain,
	formatSmartSummarySlack,
} from "../src/formatters/projects.ts";
import { collectAllItems, generateSmartSummary, summarizeProjectActivity } from "../src/llm.ts";
import { formatSearchResults, search } from "../src/search/index.ts";
import { getReadersByNames } from "../src/sources/index.ts";
import { getHistoryPath, saveToHistory } from "../src/storage/history.ts";
import type { CliOptions, SourceType, WorkItem, WorkSummary } from "../src/types.ts";
import { loadConfig } from "../src/utils/config.ts";
import { formatDateRange, parseDateRange } from "../src/utils/dates.ts";
import {
	analyzeProductivity,
	formatProductivityJson,
	formatProductivityMarkdown,
	formatProductivityPlain,
} from "../src/utils/productivity.ts";
import { calculateTrends, getPreviousDateRange } from "../src/utils/trends.ts";

const VERSION = pkg.version;

function parseCommaSeparated(value: string): string[] {
	return value.split(",").map((s) => s.trim());
}

program
	.name("worklog")
	.description(
		"Generate daily stand-up summaries from AI coding sessions, git commits, and GitHub activity",
	)
	.version(VERSION)
	.option("-d, --date <date>", "Specific date (YYYY-MM-DD)")
	.option("-y, --yesterday", "Use yesterday's date", false)
	.option("-w, --week", "Include entire current week", false)
	.option("-m, --month", "Include entire current month", false)
	.option("-q, --quarter", "Include entire current quarter", false)
	.option(
		"-l, --last",
		"Report on previous period (e.g., -lw for last week, -lm for last month, -lq for last quarter)",
		false,
	)
	.option("-j, --json", "Output as JSON", false)
	.option("-p, --plain", "Output as plain text", false)
	.option("-s, --slack", "Output in Slack format", false)
	.option(
		"-S, --sources <sources>",
		"Comma-separated list of sources (opencode,claude,codex,factory,git,github,vscode,cursor,terminal,filesystem,calendar)",
		parseCommaSeparated,
	)
	.option("-r, --repos <repos>", "Comma-separated list of git repo paths", parseCommaSeparated)
	.option("-L, --llm", "Enable LLM summarization", false)
	.option("-x, --smart", "Enable smart context clustering and summarization", false)
	.option("-t, --trends", "Show activity trends compared to previous period", false)
	.option("-D, --dashboard", "Launch interactive web dashboard", false)
	.option("-T, --theme <theme>", "Dashboard theme (default, chaos)", "default")
	.option("-P, --productivity", "Analyze productivity patterns (peak hours, focus time, etc.)", false)
	.option("-v, --verbose", "Show detailed output (default is concise summaries)", false)
	.option("--no-progress", "Disable progress while reading sources")
	.action(async (opts) => {
		try {
			await run(opts as CliOptions);
		} catch (error) {
			if (opts.verbose) {
				console.error(chalk.red("Error:"), error);
			} else {
				console.error(chalk.red("Error:"), error instanceof Error ? error.message : String(error));
			}
			process.exit(1);
		}
	});

async function run(opts: CliOptions): Promise<void> {
	const config = await loadConfig();

	if (opts.llm) {
		config.llm.enabled = true;
	}

	if (opts.repos) {
		config.gitRepos = opts.repos;
	}

	const dateRange = parseDateRange(opts);

	if (opts.verbose) {
		console.error(chalk.dim(`Date range: ${formatDateRange(dateRange)}`));
	}

	const sourceNames = opts.sources ?? config.defaultSources;

	const readers = getReadersByNames(sourceNames);

	if (opts.verbose) {
		console.error(chalk.dim(`Sources: ${readers.map((r) => r.name).join(", ")}`));
	}

	const allItems: WorkItem[] = [];

	const progressOptionSource =
		typeof program.getOptionValueSource === "function"
			? program.getOptionValueSource("progress")
			: "default";

	let progressEnabled = Boolean(opts.progress);
	if (!process.stderr.isTTY && progressOptionSource !== "cli") {
		progressEnabled = false;
	}
	if (opts.json && progressOptionSource !== "cli") {
		progressEnabled = false;
	}

	process.env.WORKLOG_PROGRESS = progressEnabled ? "1" : "0";

	if (progressEnabled && !opts.verbose) {
		console.error(chalk.dim(`Reading ${readers.length} sources...`));
	}

	for (const [index, reader] of readers.entries()) {
		const step = index + 1;
		const prefix = `[${step}/${readers.length}]`;

		if (opts.verbose) {
			console.error(chalk.dim(`Reading ${reader.name}...`));
		} else if (progressEnabled) {
			console.error(chalk.dim(`${prefix} ${reader.name}...`));
		}

		const startedAt = Date.now();

		try {
			const items = await reader.read(dateRange, config);
			allItems.push(...items);

			const elapsedMs = Date.now() - startedAt;

			if (opts.verbose) {
				console.error(
					chalk.dim(`  Found ${items.length} items (${(elapsedMs / 1000).toFixed(2)}s)`),
				);
			} else if (progressEnabled) {
				console.error(
					chalk.dim(
						`${prefix} ${reader.name}: ${items.length} items (${(elapsedMs / 1000).toFixed(2)}s)`,
					),
				);
			}
		} catch (error) {
			const elapsedMs = Date.now() - startedAt;

			if (opts.verbose) {
				console.error(
					chalk.yellow(`  Failed to read ${reader.name} (${(elapsedMs / 1000).toFixed(2)}s):`),
					error,
				);
			} else if (progressEnabled) {
				console.error(
					chalk.yellow(`${prefix} ${reader.name}: failed (${(elapsedMs / 1000).toFixed(2)}s)`),
				);
			}
		}
	}

	allItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	const activeSources = [...new Set(allItems.map((item) => item.source))] as SourceType[];

	const summary: WorkSummary = {
		dateRange,
		items: allItems,
		sources: activeSources,
		generatedAt: new Date(),
	};

	if (opts.verbose) {
		console.error(chalk.dim(`Total items: ${allItems.length}`));
		console.error("");
	}

	if (opts.dashboard) {
		const { generateDashboardHTML } = await import("../src/utils/dashboard.ts");
		const { getAvailableThemes } = await import("../src/utils/themes/index.ts");
		const defaultTheme = opts.theme ?? "default";

		console.log("🚀 Launching dashboard at http://localhost:3000");
		console.log(`   Theme: ${defaultTheme} (available: ${getAvailableThemes().join(", ")})`);
		console.log("Press Ctrl+C to stop the server");

		Bun.serve({
			port: 3000,
			async fetch(req) {
				const url = new URL(req.url);
				const theme = url.searchParams.get("theme") ?? defaultTheme;
				const html = generateDashboardHTML(summary, { theme });
				return new Response(html, {
					headers: { "Content-Type": "text/html" },
				});
			},
		});
		return;
	}

	if (opts.productivity) {
		if (opts.verbose) {
			console.error(chalk.dim("Analyzing productivity patterns..."));
		}

		const summary: WorkSummary = {
			dateRange,
			items: allItems,
			sources: activeSources,
			generatedAt: new Date(),
		};

		const patterns = analyzeProductivity(summary);

		let output: string;
		if (opts.json) {
			output = formatProductivityJson(patterns);
		} else if (opts.plain) {
			output = formatProductivityPlain(patterns);
		} else {
			output = formatProductivityMarkdown(patterns);
		}

		console.log(output);
		return;
	}

	const format = getFormat(opts);

	if (opts.verbose) {
		console.error(chalk.dim("Aggregating by project..."));
	}

	let projectSummary = aggregateByProject(allItems, config, dateRange);

	if (opts.verbose) {
		console.error(chalk.dim(`Found ${projectSummary.projects.length} projects with activity`));
	}

	if (config.llm.enabled && projectSummary.projects.length > 0) {
		if (opts.verbose) {
			console.error(chalk.dim("Generating LLM summaries..."));
		}
		projectSummary = await summarizeProjectActivity(projectSummary, config);
	}

	if (projectSummary.projects.length > 0) {
		try {
			await saveToHistory(projectSummary);
			if (opts.verbose) {
				console.error(chalk.dim(`Saved to history: ${getHistoryPath()}`));
			}
		} catch (error) {
			if (opts.verbose) {
				console.error(chalk.yellow("Failed to save to history:"), error);
			}
		}
	}

	if (opts.trends) {
		if (opts.verbose) {
			console.error(chalk.dim("Computing trends..."));
		}

		const previousRange = getPreviousDateRange(dateRange);
		const previousItems: WorkItem[] = [];

		for (const reader of readers) {
			try {
				const items = await reader.read(previousRange, config);
				previousItems.push(...items);
			} catch {}
		}

		previousItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const previousSummary: WorkSummary = {
			dateRange: previousRange,
			items: previousItems,
			sources: activeSources,
			generatedAt: new Date(),
		};

		const currentSummary: WorkSummary = {
			dateRange,
			items: allItems,
			sources: activeSources,
			generatedAt: new Date(),
		};

		const trendData = calculateTrends(currentSummary, previousSummary);
		projectSummary.trendData = trendData;

		if (opts.verbose) {
			console.error(chalk.dim(`Previous period had ${previousItems.length} items`));
		}
	}

	if (opts.smart) {
		if (opts.verbose) {
			console.error(chalk.dim("Generating smart context summary..."));
		}

		const allWorkItems = collectAllItems(projectSummary);
		const smartResult = await generateSmartSummary(allWorkItems, config);

		if (opts.verbose) {
			console.error(chalk.dim(`Found ${smartResult.summary.clusters.length} work clusters`));
		}

		let smartOutput: string;
		if (format === "json") {
			smartOutput = formatSmartSummaryJson(projectSummary, smartResult, opts.verbose);
		} else if (format === "plain") {
			smartOutput = formatSmartSummaryPlain(projectSummary, smartResult, opts.verbose);
		} else if (format === "slack") {
			smartOutput = formatSmartSummarySlack(projectSummary, smartResult, opts.verbose);
		} else {
			smartOutput = formatSmartSummaryMarkdown(projectSummary, smartResult, opts.verbose);
		}

		console.log(smartOutput);
		return;
	}

	const output = formatProjectOutput(projectSummary, format, opts.verbose);

	console.log(output);
}

const cron = program.command("cron").description("Manage daily standup cron job");

cron
	.command("install")
	.description("Install daily cron job")
	.option("-t, --time <HH:MM>", "Time to run (default: 09:00)")
	.option("-s, --slack <webhook>", "Send to Slack webhook instead of file")
	.action(async (opts) => {
		await cronInstall(opts);
	});

cron
	.command("uninstall")
	.description("Remove daily cron job")
	.action(async () => {
		await cronUninstall();
	});

cron
	.command("status")
	.description("Check cron job status")
	.action(async () => {
		await cronStatus();
	});

cron
	.command("run")
	.description("Run worklog and optionally post to Slack (used by cron job)")
	.option(
		"-s, --slack [webhook]",
		"Post to Slack webhook URL (or use WORKLOG_SLACK_WEBHOOK env var)",
	)
	.option("-o, --output <file>", "Write to file instead of stdout")
	.action(async (opts: { slack?: string | boolean; output?: string }) => {
		try {
			const slackWebhook =
				typeof opts.slack === "string" ? opts.slack : process.env.WORKLOG_SLACK_WEBHOOK;

			const cliOpts: CliOptions = {
				yesterday: true,
				week: false,
				month: false,
				quarter: false,
				last: false,
				json: false,
				plain: false,
				slack: Boolean(slackWebhook),
				llm: false,
				smart: false,
				trends: false,
				dashboard: false,
				productivity: false,
				verbose: false,
				progress: false,
			};

			const config = await loadConfig();
			const dateRange = parseDateRange(cliOpts);
			const sourceNames = config.defaultSources;
			const readers = getReadersByNames(sourceNames);

			const result = await cronRun(
				{
					slackWebhook,
					outputFile: opts.output,
				},
				{
					config,
					dateRange,
					readers,
					aggregator: aggregateByProject,
					formatter: formatProjectOutput,
					slackPoster: postToSlack,
				},
			);

			if (!result.success) {
				console.error(chalk.red("Failed to post to Slack:"), result.error);
				process.exit(1);
			}

			if (result.destination === "file" && opts.output) {
				await Bun.write(opts.output, result.output);
			} else if (result.destination === "stdout") {
				console.log(result.output);
			}
		} catch (error) {
			console.error(chalk.red("Error running worklog:"), error);
			process.exit(1);
		}
	});

program
	.command("search <query>")
	.description("Search past worklog history")
	.option("-r, --regex", "Use regular expression matching", false)
	.option("-f, --fuzzy", "Enable fuzzy matching", false)
	.option("--sources <sources>", "Filter by sources (comma-separated)", parseCommaSeparated)
	.option("--projects <projects>", "Filter by projects (comma-separated)", parseCommaSeparated)
	.option("--since <date>", "Start date (YYYY-MM-DD)")
	.option("--until <date>", "End date (YYYY-MM-DD)")
	.option("-n, --limit <number>", "Limit number of results", Number.parseInt)
	.option("--format <format>", "Output format: timeline, grouped, json", "timeline")
	.option("-j, --json", "Output as JSON (shorthand for --format json)", false)
	.action(
		async (
			query: string,
			opts: {
				regex: boolean;
				fuzzy: boolean;
				sources?: string[];
				projects?: string[];
				since?: string;
				until?: string;
				limit?: number;
				format: string;
				json: boolean;
			},
		) => {
			try {
				const results = await search({
					query,
					regex: opts.regex,
					fuzzy: opts.fuzzy,
					sources: opts.sources,
					projects: opts.projects,
					startDate: opts.since ? new Date(opts.since) : undefined,
					endDate: opts.until ? new Date(opts.until) : undefined,
					limit: opts.limit,
				});

				const format = opts.json ? "json" : (opts.format as "timeline" | "grouped" | "json");
				const output = formatSearchResults(results, format);
				console.log(output);
			} catch (error) {
				console.error(chalk.red("Error:"), error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		},
	);

program
	.command("recover")
	.description("Recover context from previous sessions")
	.option("-w, --week", "Include last week's context", false)
	.option("--project <project>", "Filter by project name")
	.option("-j, --json", "Output as JSON", false)
	.option("-p, --plain", "Output as plain text", false)
	.option("-v, --verbose", "Show detailed output", false)
	.action(
		async (opts: {
			week?: boolean;
			project?: string;
			json?: boolean;
			plain?: boolean;
			verbose?: boolean;
		}) => {
			try {
				const config = await loadConfig();
				const readers = getReadersByNames(config.defaultSources);

				if (opts.verbose) {
					console.error(chalk.dim("Analyzing recent work..."));
				}

				const report = await generateRecoveryReport(config, readers, {
					week: opts.week,
					project: opts.project,
					verbose: opts.verbose,
				});

				const format = opts.json ? "json" : opts.plain ? "plain" : "markdown";
				const output = formatRecoveryReport(report, format, opts.verbose);
				console.log(output);
			} catch (error) {
				console.error(chalk.red("Error:"), error instanceof Error ? error.message : String(error));
				process.exit(1);
			}
		},
	);

program
	.command("completion")
	.description("generate bash completion script")
	.action(() => {
		console.log(`#!/usr/bin/env bash
# bash completion for worklog
# Usage:
#   source <(worklog completion)

_worklog_completions() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  opts="-V --version -d --date -y --yesterday -w --week -m --month -q --quarter -l --last -j --json -p --plain -s --slack -S --sources -r --repos -L --llm -x --smart -t --trends -D --dashboard -T --theme -v --verbose --no-progress -h --help"

  # Prefer bash-completion helpers when available.
  if declare -F _init_completion >/dev/null 2>&1; then
    _init_completion -s || return
  else
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  fi

  local -a top_level_commands=(cron completion)
  local -a global_opts=(
    -V --version
    -d --date
    -y --yesterday
    -w --week
    -m --month
    -q --quarter
    -j --json
    -p --plain
    -s --slack
    -S --sources
    -r --repos
    -L --llm
    -x --smart
    -t --trends
    -D --dashboard
    -T --theme
    -v --verbose
    --no-progress
    -h --help
  )

  local -a sources=(opencode claude codex factory git github vscode cursor terminal filesystem calendar)

  _worklog_compgen_array() {
    local -a items=("$@")
    COMPREPLY=( $(compgen -W "\${items[*]}" -- "$cur") )
  }

  _worklog_compopt_nospace() {
    type compopt >/dev/null 2>&1 && compopt -o nospace 2>/dev/null || true
  }

  _worklog_complete_dates() {
    local -a suggestions=()

    local today
    today="$(date +%F 2>/dev/null)"
    [[ -n "$today" ]] && suggestions+=("$today")

    local yesterday=""
    yesterday="$(date -d yesterday +%F 2>/dev/null)" || yesterday="$(date -v -1d +%F 2>/dev/null)" || true
    [[ -n "$yesterday" ]] && suggestions+=("$yesterday")

    COMPREPLY=( $(compgen -W "\${suggestions[*]}" -- "$cur") )
  }

  _worklog_complete_csv_words() {
    local optprefix="$1" # "" or "--sources="
    local value="$2"
    shift 2
    local -a candidates=("$@")

    local head="" tail="$value"
    if [[ "$value" == *,* ]]; then
      head="\${value%,*},"
      tail="\${value##*,}"
    fi

    COMPREPLY=()
    local match
    for match in $(compgen -W "\${candidates[*]}" -- "$tail"); do
      COMPREPLY+=("\${optprefix}\${head}\${match}")
    done

    _worklog_compopt_nospace
  }

  _worklog_complete_csv_paths() {
    local optprefix="$1" # "" or "--repos="
    local value="$2"

    local head="" tail="$value"
    if [[ "$value" == *,* ]]; then
      head="\${value%,*},"
      tail="\${value##*,}"
    fi

    local IFS=$'\\n'
    local -a matches=( $(compgen -d -- "$tail") $(compgen -f -- "$tail") )
    unset IFS

    COMPREPLY=()
    local m
    for m in "\${matches[@]}"; do
      COMPREPLY+=("\${optprefix}\${head}\${m}")
    done

    _worklog_compopt_nospace
  }

  # --opt=value forms
  case "$cur" in
    --sources=*)
      _worklog_complete_csv_words "--sources=" "\${cur#--sources=}" "\${sources[@]}"
      return
      ;;
    --repos=*)
      _worklog_complete_csv_paths "--repos=" "\${cur#--repos=}"
      return
      ;;
    --date=*)
      # free-form
      return
      ;;
  esac

  # Options expecting a value
  case "$prev" in
    -d|--date)
      _worklog_complete_dates
      return
      ;;
    -S|--sources)
      _worklog_complete_csv_words "" "$cur" "\${sources[@]}"
      return
      ;;
    -r|--repos)
      _worklog_complete_csv_paths "" "$cur"
      return
      ;;
  esac

  # Detect subcommand context: first two non-option words.
  local cmd="" subcmd=""
  local i=1
  while [[ $i -lt $cword ]]; do
    local w="\${words[i]}"
    case "$w" in
      --)
        break
        ;;
      -d|--date|-S|--sources|-r|--repos|-t|--time|-T|--theme|-s|--slack)
        ((i+=2))
        continue
        ;;
      --date=*|--sources=*|--repos=*|--time=*|--slack=*)
        ((i++))
        continue
        ;;
      -* )
        ((i++))
        continue
        ;;
      *)
        if [[ -z "$cmd" ]]; then
          cmd="$w"
        elif [[ -z "$subcmd" ]]; then
          subcmd="$w"
        fi
        ((i++))
        ;;
    esac
  done

  # Top-level: suggest subcommands or global options.
  if [[ -z "$cmd" ]]; then
    if [[ "$cur" == -* ]]; then
      _worklog_compgen_array "\${global_opts[@]}"
    else
      _worklog_compgen_array "\${top_level_commands[@]}"
    fi
    return
  fi

  # cron subcommands + options
  if [[ "$cmd" == "cron" ]]; then
    local -a cron_subcommands=(install uninstall status)

    if [[ -z "$subcmd" ]]; then
      if [[ "$cur" == -* ]]; then
        _worklog_compgen_array "\${global_opts[@]}"
      else
        _worklog_compgen_array "\${cron_subcommands[@]}"
      fi
      return
    fi

    if [[ "$subcmd" == "install" ]]; then
      local -a cron_install_opts=(-t --time -s --slack -h --help)

      case "$cur" in
        --time=*)
          local time_cur="\${cur#--time=}"
          COMPREPLY=( $(compgen -W "09:00" -- "$time_cur") )
          COMPREPLY=( "\${COMPREPLY[@]/#/--time=}" )
          _worklog_compopt_nospace
          return
          ;;
        --slack=*)
          return
          ;;
      esac

      case "$prev" in
        -t|--time)
          COMPREPLY=( $(compgen -W "09:00" -- "$cur") )
          return
          ;;
        -s|--slack)
          return
          ;;
      esac

      if [[ -z "$cur" || "$cur" == -* ]]; then
        _worklog_compgen_array "\${cron_install_opts[@]}"
      fi
      return
    fi

    return
  fi

  # Default: complete global options anywhere when starting with '-'.
  if [[ "$cur" == -* ]]; then
    _worklog_compgen_array "\${global_opts[@]}"
  fi
}

complete -o bashdefault -o default -F _worklog worklog
`);
	});

program.parse();
