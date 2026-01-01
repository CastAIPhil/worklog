#!/usr/bin/env bun

import chalk from "chalk";
import { program } from "commander";
import { cronInstall, cronStatus, cronUninstall } from "../src/cron.ts";
import { formatOutput, getFormat } from "../src/formatters/index.ts";
import { getReadersByNames } from "../src/sources/index.ts";
import type { CliOptions, SourceType, WorkItem, WorkSummary } from "../src/types.ts";
import { loadConfig } from "../src/utils/config.ts";
import { formatDateRange, parseDateRange } from "../src/utils/dates.ts";

const VERSION = "0.1.0";

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
	.option("-j, --json", "Output as JSON", false)
	.option("-p, --plain", "Output as plain text", false)
	.option("-s, --slack", "Output in Slack format", false)
	.option(
		"--sources <sources>",
		"Comma-separated list of sources (opencode,claude,codex,factory,git,github,vscode,cursor,terminal,filesystem)",
	)
	.option("--repos <repos>", "Comma-separated list of git repo paths")
	.option("--no-llm", "Disable LLM summarization")
	.option("--trends", "Show activity trends compared to previous period", false)
	.option("--dashboard", "Launch interactive web dashboard", false)
	.option("-v, --verbose", "Show detailed output (default is concise summaries)", false)
	.action(async (opts) => {
		try {
			await run(opts);
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

	for (const reader of readers) {
		if (opts.verbose) {
			console.error(chalk.dim(`Reading ${reader.name}...`));
		}

		try {
			const items = await reader.read(dateRange, config);
			allItems.push(...items);

			if (opts.verbose) {
				console.error(chalk.dim(`  Found ${items.length} items`));
			}
		} catch (error) {
			if (opts.verbose) {
				console.error(chalk.yellow(`  Failed to read ${reader.name}:`), error);
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
	let output = formatOutput(summary, format, opts.verbose);

	if (opts.trends) {
		const { calculateTrends, formatTrendSummary, getPreviousDateRange } = await import(
			"../src/utils/trends.ts"
		);

		const previousRange = getPreviousDateRange(dateRange);
		const previousItems: WorkItem[] = [];

		for (const reader of readers) {
			try {
				const items = await reader.read(previousRange, config);
				previousItems.push(...items);
			} catch {}
		}

		previousItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const previousSources = [...new Set(previousItems.map((item) => item.source))] as SourceType[];
		const previousSummary: WorkSummary = {
			dateRange: previousRange,
			items: previousItems,
			sources: previousSources,
			generatedAt: new Date(),
		};

		const trendData = calculateTrends(summary, previousSummary);
		const trendOutput = formatTrendSummary(trendData);

		if (format === "json") {
			const jsonSummary = JSON.parse(output);
			jsonSummary.trends = trendData;
			output = JSON.stringify(jsonSummary, null, 2);
		} else {
			output = `${output}\n\n${trendOutput}`;
		}
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

program.parse();
