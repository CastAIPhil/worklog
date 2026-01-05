#!/usr/bin/env bun

import chalk from "chalk";
import { program } from "commander";
import pkg from "../package.json" with { type: "json" };
import { aggregateByProject } from "../src/aggregator.ts";
import { formatRecoveryReport, generateRecoveryReport } from "../src/context/recovery.ts";
import { postToSlack } from "../src/cron.ts";
import { formatProjectOutput, getFormat } from "../src/formatters/index.ts";
import {
	formatSmartSummaryJson,
	formatSmartSummaryMarkdown,
	formatSmartSummaryPlain,
	formatSmartSummarySlack,
} from "../src/formatters/projects.ts";
import { collectAllItems, generateSmartSummary, summarizeProjectActivity } from "../src/llm.ts";
import { type SchedulePeriod, scheduleRun } from "../src/schedule.ts";
import { formatSearchResults, search } from "../src/search/index.ts";
import { getReadersByNames } from "../src/sources/index.ts";
import { getHistoryPath, saveToHistory } from "../src/storage/history.ts";
import {
	aggregateDailySnapshots,
	getSnapshotKey,
	listSnapshotKeys,
	loadSnapshot,
} from "../src/storage/snapshots.ts";
import type { CliOptions, SourceType, WorkItem, WorkSummary } from "../src/types.ts";
import { loadConfig } from "../src/utils/config.ts";
import { formatDateRange, parseDateInput, parseDateRange } from "../src/utils/dates.ts";
import { filterNoiseWorkItems } from "../src/utils/noise.ts";
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
	.option("-d, --date <date>", "Specific date (YYYY-MM-DD) or weekday name (e.g., Wednesday)")
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
		"Comma-separated list of sources (opencode,claude,codex,factory,git,github,vscode,cursor,terminal,filesystem,calendar,slack)",
		parseCommaSeparated,
	)
	.option("-r, --repos <repos>", "Comma-separated list of git repo paths", parseCommaSeparated)
	.option("-L, --llm", "Enable LLM summarization", false)
	.option("-x, --smart", "Enable smart context clustering and summarization", false)
	.option("-t, --trends", "Show activity trends compared to previous period", false)
	.option(
		"-P, --productivity",
		"Analyze productivity patterns (peak hours, focus time, etc.)",
		false,
	)
	.option("-v, --verbose", "Show detailed output (default is concise summaries)", false)
	.option("--no-progress", "Disable progress while reading sources")
	.action(async (opts) => {
		if (process.argv.slice(2).length === 0) {
			program.outputHelp();
			return;
		}

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

	const dateRange = parseDateRange(opts, new Date(), config.timezone);

	if (opts.verbose) {
		console.error(chalk.dim(`Date range: ${formatDateRange(dateRange, config.timezone)}`));
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

	const filteredItems = filterNoiseWorkItems(allItems);

	if (opts.verbose) {
		console.error(chalk.dim(`Total items: ${filteredItems.length}`));
		console.error("");
	}

	if (opts.productivity) {
		if (opts.verbose) {
			console.error(chalk.dim("Analyzing productivity patterns..."));
		}

		const sources = [...new Set(filteredItems.map((item) => item.source))] as SourceType[];
		const summary: WorkSummary = {
			dateRange,
			items: filteredItems,
			sources,
			generatedAt: new Date(),
		};

		const patterns = analyzeProductivity(summary, { timeZone: config.timezone });

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

	let projectSummary = aggregateByProject(filteredItems, config, dateRange);

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

		const filteredPreviousItems = filterNoiseWorkItems(previousItems);

		const previousSources = [
			...new Set(filteredPreviousItems.map((item) => item.source)),
		] as SourceType[];
		const currentSources = [...new Set(filteredItems.map((item) => item.source))] as SourceType[];

		const previousSummary: WorkSummary = {
			dateRange: previousRange,
			items: filteredPreviousItems,
			sources: previousSources,
			generatedAt: new Date(),
		};

		const currentSummary: WorkSummary = {
			dateRange,
			items: filteredItems,
			sources: currentSources,
			generatedAt: new Date(),
		};

		const trendData = calculateTrends(currentSummary, previousSummary);
		projectSummary.trendData = trendData;

		if (opts.verbose) {
			console.error(chalk.dim(`Previous period had ${filteredPreviousItems.length} items`));
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

const schedule = program.command("schedule").description("Manage scheduled reports (systemd/cron)");

schedule
	.command("install")
	.description("Install scheduled reports (systemd user timers preferred)")
	.option("--no-weekly", "Disable weekly schedule")
	.option("--no-monthly", "Disable monthly schedule")
	.option("--no-quarterly", "Disable quarterly schedule")
	.option("--slack <webhook>", "Slack webhook for scheduled posts")
	.option("--backfill", "Generate historical snapshots after installing", false)
	.action(
		async (opts: {
			noWeekly?: boolean;
			noMonthly?: boolean;
			noQuarterly?: boolean;
			slack?: string;
			backfill?: boolean;
		}) => {
			try {
				const { scheduleInstall } = await import("../src/scheduling/index.ts");
				const result = await scheduleInstall({
					noWeekly: opts.noWeekly,
					noMonthly: opts.noMonthly,
					noQuarterly: opts.noQuarterly,
					slackWebhook: opts.slack,
				});

				console.log(
					chalk.green("✓"),
					`Installed ${result.backend} schedule for: ${result.periods.join(", ")}`,
				);
				if (result.backend === "systemd") {
					console.log(chalk.dim("  Check timers: systemctl --user list-timers | rg worklog"));
				}

				if (opts.backfill) {
					const { buildBackfillPlan, executeBackfillPlan } = await import(
						"../src/scheduling/backfill.ts"
					);
					const config = await loadConfig();
					const readers = getReadersByNames(config.defaultSources);

					const plan = buildBackfillPlan({
						now: new Date(),
						weeks: 4,
						months: 1,
						daily: true,
						weekly: !opts.noWeekly,
						monthly: !opts.noMonthly,
						quarterly: !opts.noQuarterly,
						timeZone: config.timezone,
					});

					const exec = await executeBackfillPlan(
						plan,
						{ dryRun: false, skipExisting: true, overwrite: false },
						{
							config,
							readers,
							aggregator: aggregateByProject,
							formatter: formatProjectOutput,
							slackPoster: postToSlack,
						},
					);

					console.log(
						chalk.green("✓"),
						`Backfill complete: wrote ${exec.written}, skipped ${exec.skipped}, errors ${exec.errors}`,
					);
					if (exec.errors > 0) {
						process.exit(1);
					}
				}
			} catch (error) {
				console.error(chalk.red("Failed to install schedule:"), error);
				process.exit(1);
			}
		},
	);

schedule
	.command("uninstall")
	.description("Remove scheduled reports")
	.option("--no-weekly", "Do not uninstall weekly schedule")
	.option("--no-monthly", "Do not uninstall monthly schedule")
	.option("--no-quarterly", "Do not uninstall quarterly schedule")
	.action(async (opts: { noWeekly?: boolean; noMonthly?: boolean; noQuarterly?: boolean }) => {
		try {
			const { scheduleUninstall } = await import("../src/scheduling/index.ts");
			const result = await scheduleUninstall({
				noWeekly: opts.noWeekly,
				noMonthly: opts.noMonthly,
				noQuarterly: opts.noQuarterly,
			});

			console.log(
				chalk.green("✓"),
				`Uninstalled ${result.backend} schedule for: ${result.periods.join(", ")}`,
			);
		} catch (error) {
			console.error(chalk.red("Failed to uninstall schedule:"), error);
			process.exit(1);
		}
	});

schedule
	.command("status")
	.description("Show schedule backend and active timers")
	.action(async () => {
		try {
			const { scheduleStatus } = await import("../src/scheduling/index.ts");
			const status = await scheduleStatus();
			if (status.backend === "systemd") {
				console.log(chalk.green("✓"), "Scheduler: systemd user timers");
				console.log(status.timers || chalk.dim("(no worklog timers found)"));
			} else {
				console.log(chalk.yellow("○"), "Scheduler: cron fallback");
				console.log(chalk.dim(`Installed: ${status.installed.join(", ") || "none"}`));
			}
		} catch (error) {
			console.error(chalk.red("Failed to read schedule status:"), error);
			process.exit(1);
		}
	});

schedule
	.command("backfill")
	.description("Generate historical snapshot JSON files")
	.option(
		"--weeks <number>",
		"Weeks of daily/weekly snapshots (default: 4)",
		(v) => Number.parseInt(v, 10),
		4,
	)
	.option(
		"--months <number>",
		"Months of monthly snapshots (default: 1)",
		(v) => Number.parseInt(v, 10),
		1,
	)
	.option("--no-daily", "Disable daily snapshot backfill")
	.option("--no-weekly", "Disable weekly snapshot backfill")
	.option("--no-monthly", "Disable monthly snapshot backfill")
	.option("--quarterly", "Include quarterly snapshots", false)
	.option("--since <date>", "Start date (YYYY-MM-DD or weekday name)")
	.option("--until <date>", "End date (YYYY-MM-DD or weekday name)")
	.option("--dry-run", "Print planned snapshots without writing", false)
	.option("--overwrite", "Overwrite existing snapshot files", false)
	.option("-s, --slack [webhook]", "Also post to Slack (or use WORKLOG_SLACK_WEBHOOK env var)")
	.action(
		async (opts: {
			weeks: number;
			months: number;
			daily: boolean;
			weekly: boolean;
			monthly: boolean;
			quarterly: boolean;
			since?: string;
			until?: string;
			dryRun: boolean;
			overwrite: boolean;
			slack?: string | boolean;
		}) => {
			try {
				const { buildBackfillPlan, executeBackfillPlan } = await import(
					"../src/scheduling/backfill.ts"
				);
				const config = await loadConfig();
				const referenceNow = new Date();
				const since = opts.since
					? parseDateInput(opts.since, referenceNow, config.timezone)
					: undefined;
				const until = opts.until
					? parseDateInput(opts.until, referenceNow, config.timezone)
					: undefined;

				const slackWebhook =
					typeof opts.slack === "string" ? opts.slack : process.env.WORKLOG_SLACK_WEBHOOK;
				if (opts.slack && !slackWebhook) {
					console.error(chalk.red("No Slack webhook provided"));
					console.error(chalk.dim("Pass --slack <url> or set WORKLOG_SLACK_WEBHOOK"));
					process.exit(1);
				}

				const readers = getReadersByNames(config.defaultSources);

				const plan = buildBackfillPlan({
					now: referenceNow,
					weeks: opts.weeks,
					months: opts.months,
					daily: opts.daily,
					weekly: opts.weekly,
					monthly: opts.monthly,
					quarterly: opts.quarterly,
					since,
					until,
					timeZone: config.timezone,
				});

				const result = await executeBackfillPlan(
					plan,
					{
						dryRun: opts.dryRun,
						skipExisting: true,
						overwrite: opts.overwrite,
						slackWebhook: opts.slack ? slackWebhook : undefined,
					},
					{
						config,
						readers,
						aggregator: aggregateByProject,
						formatter: formatProjectOutput,
						slackPoster: postToSlack,
					},
				);

				console.log(
					chalk.green("✓"),
					`Backfill: planned ${result.planned}, wrote ${result.written}, skipped ${result.skipped}, errors ${result.errors}`,
				);

				if (opts.dryRun) {
					for (const item of result.results) {
						console.log(chalk.dim(`  ${item.period}: ${item.expectedPath} (${item.status})`));
					}
				}

				if (result.errors > 0) {
					process.exit(1);
				}
			} catch (error) {
				console.error(chalk.red("Backfill failed:"), error);
				process.exit(1);
			}
		},
	);

schedule
	.command("run")
	.description("Generate snapshot JSON and optionally post to Slack")
	.requiredOption(
		"--period <period>",
		"Report period: daily, weekly, monthly, quarterly (always generates the previous period)",
	)
	.option(
		"-s, --slack [webhook]",
		"Post to Slack webhook URL (or use WORKLOG_SLACK_WEBHOOK env var)",
	)
	.action(async (opts: { period: string; slack?: string | boolean }) => {
		try {
			const allowedPeriods: SchedulePeriod[] = ["daily", "weekly", "monthly", "quarterly"];
			if (!allowedPeriods.includes(opts.period as SchedulePeriod)) {
				console.error(
					chalk.red("Invalid period:"),
					opts.period,
					"(expected daily|weekly|monthly|quarterly)",
				);
				process.exit(1);
			}

			const period = opts.period as SchedulePeriod;
			const slackWebhook =
				typeof opts.slack === "string" ? opts.slack : process.env.WORKLOG_SLACK_WEBHOOK;

			const config = await loadConfig();
			const readers = getReadersByNames(config.defaultSources);

			const result = await scheduleRun(
				{ period, slackWebhook },
				{
					config,
					readers,
					aggregator: aggregateByProject,
					formatter: formatProjectOutput,
					slackPoster: postToSlack,
				},
			);

			console.log(chalk.green("✓"), `Wrote snapshot: ${result.snapshot.path}`);
			console.log(
				chalk.dim(`  Items: ${result.itemsCount} (skipped sources: ${result.skippedSources})`),
			);

			if (slackWebhook) {
				if (!result.slack) {
					console.error(chalk.red("Slack post missing result"));
					process.exit(1);
				}
				if (!result.slack.ok) {
					console.error(chalk.red("Failed to post to Slack:"), result.slack.statusText);
					process.exit(1);
				}
				console.log(chalk.green("✓"), "Posted to Slack");
			} else {
				console.log(chalk.yellow("○"), "No Slack webhook configured; skipping Slack post");
				console.log(chalk.dim("  Pass --slack <url> or set WORKLOG_SLACK_WEBHOOK"));
			}
		} catch (error) {
			console.error(chalk.red("Error running scheduled report:"), error);
			process.exit(1);
		}
	});

const snapshot = program.command("snapshot").description("Verify and repair saved snapshots");

snapshot
	.command("regenerate")
	.description("Regenerate daily snapshots from weekly parents")
	.option("--daily <date>", "Regenerate a specific day (YYYY-MM-DD)")
	.option("--week <date>", "Regenerate all days in a week (pass the week start YYYY-MM-DD)")
	.option("--month <month>", "Regenerate all days in a month (YYYY-MM)")
	.option("--all", "Regenerate all dailies that appear incomplete", false)
	.option("--dry-run", "Show what would be regenerated without writing", false)
	.option("--no-backup", "Do not backup existing daily snapshots")
	.option("--force", "Overwrite even when counts match", false)
	.option("-v, --verbose", "Detailed per-day output", false)
	.action(
		async (opts: {
			daily?: string;
			week?: string;
			month?: string;
			all: boolean;
			dryRun: boolean;
			backup: boolean;
			force: boolean;
			verbose: boolean;
		}) => {
			try {
				const config = await loadConfig();
				const timeZone = config.timezone;

				const { fromZonedTime, toZonedTime } = await import("date-fns-tz");
				const {
					getSnapshotDateRange,
					getSnapshotKey,
					listSnapshotKeys,
					regenerateDailyFromWeekly,
				} = await import("../src/storage/snapshots.ts");

				const modeCount = [opts.daily, opts.week, opts.month, opts.all ? "all" : undefined].filter(
					Boolean,
				).length;
				if (modeCount !== 1) {
					console.error(chalk.red("Pick exactly one of --daily, --week, --month, or --all"));
					process.exit(1);
				}

				function zonedDayStart(date: Date): Date {
					const d = new Date(date);
					d.setHours(0, 0, 0, 0);
					return d;
				}

				function addZonedDays(date: Date, days: number): Date {
					const d = new Date(date);
					d.setDate(d.getDate() + days);
					return d;
				}

				function buildDailyKeysForRange(range: { start: Date; end: Date }): string[] {
					const startZoned = timeZone ? toZonedTime(range.start, timeZone) : new Date(range.start);
					const endZoned = timeZone ? toZonedTime(range.end, timeZone) : new Date(range.end);

					const keys: string[] = [];
					for (
						let cursor = zonedDayStart(startZoned);
						cursor <= endZoned;
						cursor = addZonedDays(cursor, 1)
					) {
						const anchor = timeZone ? fromZonedTime(cursor, timeZone) : cursor;
						keys.push(getSnapshotKey("daily", anchor, timeZone));
					}
					return keys;
				}

				let dailyKeys: string[] = [];
				if (opts.daily) {
					dailyKeys = [opts.daily];
				} else if (opts.week) {
					const range = getSnapshotDateRange("weekly", opts.week, timeZone);
					dailyKeys = buildDailyKeysForRange(range);
				} else if (opts.month) {
					const range = getSnapshotDateRange("monthly", opts.month, timeZone);
					dailyKeys = buildDailyKeysForRange(range);
				} else if (opts.all) {
					const weeklyKeys = await listSnapshotKeys("weekly");
					const allKeys = new Set<string>();
					for (const weeklyKey of weeklyKeys) {
						const range = getSnapshotDateRange("weekly", weeklyKey, timeZone);
						for (const dailyKey of buildDailyKeysForRange(range)) {
							allKeys.add(dailyKey);
						}
					}
					dailyKeys = [...allKeys].sort();
				}

				let written = 0;
				let skipped = 0;
				let errors = 0;
				let added = 0;

				for (const dailyKey of dailyKeys) {
					const probe = await regenerateDailyFromWeekly(dailyKey, {
						timeZone,
						backup: opts.backup,
						overwrite: true,
						force: opts.force,
						dryRun: true,
					});

					if (!probe.success) {
						errors++;
						console.error(chalk.red("✗"), `${dailyKey}: ${probe.error ?? "unknown error"}`);
						continue;
					}

					const delta = probe.newItems - probe.originalItems;
					const shouldWrite = opts.force || delta !== 0 || probe.originalItems === 0;

					if (opts.dryRun || !shouldWrite) {
						skipped++;
						if (opts.verbose) {
							console.log(
								chalk.dim("○"),
								`${dailyKey}: ${probe.originalItems} → ${probe.newItems} items (${delta >= 0 ? "+" : ""}${delta})`,
							);
						}
						continue;
					}

					const result = await regenerateDailyFromWeekly(dailyKey, {
						timeZone,
						backup: opts.backup,
						overwrite: true,
						force: opts.force,
						now: new Date(),
					});

					if (!result.success) {
						errors++;
						console.error(chalk.red("✗"), `${dailyKey}: ${result.error ?? "unknown error"}`);
						continue;
					}

					written++;
					added += result.itemsAdded;

					const suffixParts: string[] = [];
					if (result.backedUp) {
						suffixParts.push("backed up");
					}
					const suffix = suffixParts.length > 0 ? ` (${suffixParts.join(", ")})` : "";
					console.log(
						chalk.green("✓"),
						`${dailyKey}: ${result.originalItems} → ${result.newItems} items (+${result.itemsAdded})${suffix}`,
					);
				}

				console.log(
					chalk.dim(
						`Regenerated ${written} daily snapshots, skipped ${skipped}, errors ${errors}, items added ${added}`,
					),
				);
				if (errors > 0) {
					process.exit(1);
				}
			} catch (error) {
				console.error(chalk.red("Snapshot regeneration failed:"), error);
				process.exit(1);
			}
		},
	);

snapshot
	.command("verify")
	.description("Verify consistency between weekly and daily snapshots")
	.option("-j, --json", "Output as JSON", false)
	.action(async (opts: { json: boolean }) => {
		try {
			const config = await loadConfig();
			const timeZone = config.timezone;
			const { verifyWeeklySnapshots } = await import("../src/storage/snapshots.ts");

			const result = await verifyWeeklySnapshots({ timeZone });
			if (opts.json) {
				console.log(JSON.stringify(result, null, 2));
				return;
			}

			console.log(chalk.green("✓"), `Checked ${result.weeksChecked} weekly snapshots`);
			if (result.ok) {
				console.log(chalk.green("✓"), "No inconsistencies found");
				return;
			}

			for (const week of result.weekly) {
				if (week.issues.length === 0) continue;
				console.log("");
				console.log(chalk.dim(`Weekly ${week.weeklyKey}:`));
				for (const issue of week.issues) {
					const where = issue.dailyKey ? `${issue.dailyKey}: ` : "";
					console.log(chalk.red("✗"), `${where}${issue.message}`);
				}
			}

			console.log("");
			console.log(
				chalk.yellow("○"),
				`Found ${result.weeksWithIssues} weekly snapshots with issues`,
			);
			process.exit(1);
		} catch (error) {
			console.error(chalk.red("Snapshot verification failed:"), error);
			process.exit(1);
		}
	});

program
	.command("dashboard")
	.description("Launch interactive dashboard from saved snapshots")
	.option("-T, --theme <theme>", "Dashboard theme (default, chaos)", "default")
	.option("--port <port>", "Preferred port (default: from config or 3000)", Number.parseInt)
	.action(async (opts: { theme: string; port?: number }) => {
		const config = await loadConfig();
		const preferredPort = Number.isFinite(opts.port)
			? (opts.port as number)
			: (config.dashboard?.port ?? 3000);
		const host = "127.0.0.1";
		const config = await loadConfig();
		const timeZone = config.timezone;

		const { generateDashboardHTML } = await import("../src/utils/dashboard.ts");
		const { getAvailableThemes } = await import("../src/utils/themes/index.ts");

		const availableThemes = getAvailableThemes();
		if (!availableThemes.includes(opts.theme)) {
			console.error(
				chalk.red("Invalid theme:"),
				opts.theme,
				`(available: ${availableThemes.join(", ")})`,
			);
			process.exit(1);
		}

		function formatSummaryAsJson(summary: WorkSummary) {
			const items = filterNoiseWorkItems(summary.items);
			const sources = [...new Set(items.map((item) => item.source))];
			return {
				dateRange: {
					start: summary.dateRange.start.toISOString(),
					end: summary.dateRange.end.toISOString(),
				},
				items: items.map((item) => ({
					source: item.source,
					timestamp: item.timestamp.toISOString(),
					title: item.title,
					description: item.description,
				})),
				sources,
				generatedAt: summary.generatedAt.toISOString(),
			};
		}

		async function resolveDefaultDailySummary(): Promise<WorkSummary> {
			const baseOptions = {
				yesterday: false,
				week: false,
				month: false,
				quarter: false,
				last: false,
				json: false,
				plain: false,
				slack: false,
				llm: false,
				smart: false,
				trends: false,
				dashboard: false,
				productivity: false,
				verbose: false,
			} as const;

			const dateRange = parseDateRange({ ...baseOptions, yesterday: true }, new Date(), timeZone);
			const key = getSnapshotKey("daily", dateRange.start, timeZone);

			try {
				const summary = await loadSnapshot("daily", key);
				return { ...summary, items: filterNoiseWorkItems(summary.items) };
			} catch {
				const keys = await listSnapshotKeys("daily");
				const latest = keys[0];
				if (latest) {
					const summary = await loadSnapshot("daily", latest);
					return { ...summary, items: filterNoiseWorkItems(summary.items) };
				}

				return {
					dateRange,
					items: [],
					sources: [],
					generatedAt: new Date(),
				};
			}
		}

		async function loadSelectedSummary(url: URL): Promise<WorkSummary> {
			const period = (url.searchParams.get("period") ?? "daily") as SchedulePeriod;
			const allowedPeriods: SchedulePeriod[] = ["daily", "weekly", "monthly", "quarterly"];
			if (!allowedPeriods.includes(period)) {
				return resolveDefaultDailySummary();
			}

			const start = url.searchParams.get("start");
			const end = url.searchParams.get("end");
			if (period === "daily" && start && end) {
				const referenceNow = new Date();
				const startDate = parseDateInput(start, referenceNow, timeZone);
				const endDate = parseDateInput(end, referenceNow, timeZone);
				const summary = await aggregateDailySnapshots(startDate, endDate, undefined, timeZone);
				return { ...summary, items: filterNoiseWorkItems(summary.items) };
			}

			const key = url.searchParams.get("key");
			if (key) {
				try {
					const summary = await loadSnapshot(period, key);
					return { ...summary, items: filterNoiseWorkItems(summary.items) };
				} catch {
					if (period === "daily") {
						return resolveDefaultDailySummary();
					}
					const keys = await listSnapshotKeys(period);
					const latest = keys[0];
					if (latest) {
						const summary = await loadSnapshot(period, latest);
						return { ...summary, items: filterNoiseWorkItems(summary.items) };
					}
					return resolveDefaultDailySummary();
				}
			}

			if (period === "daily") {
				return resolveDefaultDailySummary();
			}

			const keys = await listSnapshotKeys(period);
			const latest = keys[0];
			if (!latest) {
				return resolveDefaultDailySummary();
			}
			try {
				const summary = await loadSnapshot(period, latest);
				return { ...summary, items: filterNoiseWorkItems(summary.items) };
			} catch {
				return resolveDefaultDailySummary();
			}
		}

		const fetchHandler = async (req: Request): Promise<Response> => {
			const url = new URL(req.url);
			if (url.pathname === "/api/reports") {
				const period = (url.searchParams.get("period") ?? "daily") as SchedulePeriod;
				const allowedPeriods: SchedulePeriod[] = ["daily", "weekly", "monthly", "quarterly"];
				if (!allowedPeriods.includes(period)) {
					return new Response(JSON.stringify({ error: "invalid period" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const keys = await listSnapshotKeys(period);
				return new Response(JSON.stringify({ period, keys }), {
					headers: { "Content-Type": "application/json" },
				});
			}

			if (url.pathname === "/api/report") {
				const period = (url.searchParams.get("period") ?? "daily") as SchedulePeriod;
				const key = url.searchParams.get("key");
				if (!key) {
					return new Response(JSON.stringify({ error: "missing key" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				try {
					const summary = await loadSnapshot(period, key);
					return new Response(JSON.stringify(formatSummaryAsJson(summary)), {
						headers: { "Content-Type": "application/json" },
					});
				} catch (error) {
					return new Response(JSON.stringify({ error: String(error) }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}
			}

			if (url.pathname === "/api/report-range") {
				const start = url.searchParams.get("start");
				const end = url.searchParams.get("end");
				if (!start || !end) {
					return new Response(JSON.stringify({ error: "missing start/end" }), {
						status: 400,
						headers: { "Content-Type": "application/json" },
					});
				}

				const referenceNow = new Date();
				const startDate = parseDateInput(start, referenceNow, timeZone);
				const endDate = parseDateInput(end, referenceNow, timeZone);
				const summary = await aggregateDailySnapshots(startDate, endDate, undefined, timeZone);
				return new Response(JSON.stringify(formatSummaryAsJson(summary)), {
					headers: { "Content-Type": "application/json" },
				});
			}

			const theme = url.searchParams.get("theme") ?? opts.theme;
			const summary = await loadSelectedSummary(url);
			const html = generateDashboardHTML(summary, { theme, timeZone });
			return new Response(html, {
				headers: { "Content-Type": "text/html" },
			});
		};

		function serveWithFallbackPort(startPort: number): ReturnType<typeof Bun.serve> {
			for (let port = startPort; port < startPort + 10; port++) {
				try {
					return Bun.serve({ hostname: host, port, fetch: fetchHandler });
				} catch (error) {
					const message = String(error);
					if (message.includes("EADDRINUSE") || message.includes("address already in use")) {
						continue;
					}
					throw error;
				}
			}

			return Bun.serve({ hostname: host, port: 0, fetch: fetchHandler });
		}

		const server = serveWithFallbackPort(preferredPort);
		console.log(`🚀 Dashboard: http://${host}:${server.port}`);
		console.log(chalk.dim(`  Theme: ${opts.theme} (available: ${availableThemes.join(", ")})`));
		console.log(chalk.dim("  Press Ctrl+C to stop"));
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
				const config = await loadConfig();
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
				const output = formatSearchResults(results, format, { timeZone: config.timezone });
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
  opts="-V --version -d --date -y --yesterday -w --week -m --month -q --quarter -l --last -j --json -p --plain -s --slack -S --sources -r --repos -L --llm -x --smart -t --trends -v --verbose --no-progress -h --help"

  # Prefer bash-completion helpers when available.
  if declare -F _init_completion >/dev/null 2>&1; then
    _init_completion -s || return
  else
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    words=("\${COMP_WORDS[@]}")
    cword=$COMP_CWORD
  fi

  local -a top_level_commands=(schedule dashboard search recover completion)
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
    -v --verbose
    --no-progress
    -h --help
  )

  local -a sources=(opencode claude codex factory git github vscode cursor terminal filesystem calendar slack)

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
      -d|--date|-S|--sources|-r|--repos|-t|--time|-s|--slack)
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


  # Default: complete global options anywhere when starting with '-'.
  if [[ "$cur" == -* ]]; then
    _worklog_compgen_array "\${global_opts[@]}"
  fi
}

complete -o bashdefault -o default -F _worklog worklog
`);
	});

program.parse();
