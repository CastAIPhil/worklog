#!/usr/bin/env bun

import chalk from "chalk";
import { program } from "commander";
import pkg from "../package.json" with { type: "json" };
import { aggregateByProject } from "../src/aggregator.ts";
import { cronInstall, cronStatus, cronUninstall } from "../src/cron.ts";
import { formatProjectOutput, getFormat } from "../src/formatters/index.ts";
import { summarizeProjectActivity } from "../src/llm.ts";
import { getReadersByNames } from "../src/sources/index.ts";
import type { CliOptions, SourceType, WorkItem, WorkSummary } from "../src/types.ts";
import { loadConfig } from "../src/utils/config.ts";
import { formatDateRange, parseDateRange } from "../src/utils/dates.ts";

const VERSION = pkg.version;

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
	.option(
		"-l, --last",
		"Report on previous period (e.g., -lw for last week, -lm for last month)",
		false,
	)
	.option("-j, --json", "Output as JSON", false)
	.option("-p, --plain", "Output as plain text", false)
	.option("-s, --slack", "Output in Slack format", false)
	.option(
		"--sources <sources>",
		"Comma-separated list of sources (opencode,claude,codex,factory,git,github,vscode,cursor,terminal,filesystem)",
	)
	.option("--repos <repos>", "Comma-separated list of git repo paths")
	.option("--llm", "Enable LLM summarization", false)
	.option("--trends", "Show activity trends compared to previous period", false)
	.option("--dashboard", "Launch interactive web dashboard", false)
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
		const repos = opts.repos as unknown as string;
		config.gitRepos = repos.split(",").map((r) => r.trim());
	}

	const dateRange = parseDateRange(opts);

	if (opts.verbose) {
		console.error(chalk.dim(`Date range: ${formatDateRange(dateRange)}`));
	}

	const sourceNames = opts.sources
		? (opts.sources as unknown as string).split(",").map((s) => s.trim())
		: config.defaultSources;

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
		const html = generateDashboardHTML(summary);

		console.log("🚀 Launching dashboard at http://localhost:3000");
		console.log("Press Ctrl+C to stop the server");

		Bun.serve({
			port: 3000,
			async fetch() {
				return new Response(html, {
					headers: { "Content-Type": "text/html" },
				});
			},
		});
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

	const output = formatProjectOutput(projectSummary, format, opts.verbose);

	if (opts.trends) {
		console.error(
			chalk.yellow("Note: Trends feature is not yet supported in project mode. Coming soon!"),
		);
	}

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
  opts="-V --version -d --date -y --yesterday -w --week -m --month -l --last -j --json -p --plain -s --slack --sources --repos --llm --trends --dashboard -v --verbose --no-progress -h --help"

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
    -j --json
    -p --plain
    -s --slack
    --sources
    --repos
    --no-llm
    --trends
    --dashboard
    -v --verbose
    --no-progress
    --legacy
    -h --help
  )

  local -a sources=(opencode claude codex factory git github vscode cursor terminal filesystem)

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
    --sources)
      _worklog_complete_csv_words "" "$cur" "\${sources[@]}"
      return
      ;;
    --repos)
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
      -d|--date|--sources|--repos|-t|--time|-s|--slack)
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
