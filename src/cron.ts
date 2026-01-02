import { mkdir } from "node:fs/promises";
import chalk from "chalk";

const CRON_MARKER = "# worklog-daily-standup";
const DEFAULT_HOUR = 9;
const DEFAULT_MINUTE = 0;

interface CronConfig {
	hour: number;
	minute: number;
	outputDir: string;
	slackWebhook?: string;
}

function getWorklogPath(): string {
	const execPath = process.execPath;
	const scriptPath = process.argv[1] ?? "";

	if (execPath.endsWith("/worklog") || execPath.includes("/worklog-")) {
		return execPath;
	}
	if (scriptPath.includes("/bin/worklog")) {
		return scriptPath;
	}
	return `cd ${process.cwd()} && bun run dev`;
}

export function buildCronLine(config: CronConfig): string {
	const worklogCmd = getWorklogPath();
	const dateCmd = "$(date +%Y-%m-%d)";
	const outputFile = `${config.outputDir}/standup-${dateCmd}.md`;

	let cmd = `${worklogCmd} cron run`;

	if (config.slackWebhook) {
		cmd += " --slack";
	} else {
		cmd += ` --output "${outputFile}"`;
	}

	return `${config.minute} ${config.hour} * * * ${cmd} ${CRON_MARKER}`;
}

export function buildCronEnvLine(webhook: string): string {
	return `WORKLOG_SLACK_WEBHOOK=${webhook}`;
}

async function getCurrentCrontab(): Promise<string> {
	try {
		const proc = Bun.spawn(["crontab", "-l"], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const output = await new Response(proc.stdout).text();
		await proc.exited;
		return output;
	} catch {
		return "";
	}
}

async function setCrontab(content: string): Promise<boolean> {
	const proc = Bun.spawn(["crontab", "-"], {
		stdin: "pipe",
		stdout: "pipe",
		stderr: "pipe",
	});

	proc.stdin.write(content);
	proc.stdin.end();

	const exitCode = await proc.exited;
	return exitCode === 0;
}

function parseTime(timeStr: string): { hour: number; minute: number } | null {
	const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
	if (!match) return null;

	const hour = Number.parseInt(match[1] ?? "0", 10);
	const minute = Number.parseInt(match[2] ?? "0", 10);

	if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

	return { hour, minute };
}

export async function cronInstall(options: { time?: string; slack?: string }): Promise<void> {
	const outputDir = `${process.env.HOME}/.local/share/worklog/daily`;

	let hour = DEFAULT_HOUR;
	let minute = DEFAULT_MINUTE;

	if (options.time) {
		const parsed = parseTime(options.time);
		if (!parsed) {
			console.error(chalk.red("Invalid time format. Use HH:MM (e.g., 09:00)"));
			process.exit(1);
		}
		hour = parsed.hour;
		minute = parsed.minute;
	}

	await mkdir(outputDir, { recursive: true });

	const config: CronConfig = {
		hour,
		minute,
		outputDir,
		slackWebhook: options.slack,
	};

	const crontab = await getCurrentCrontab();
	const lines = crontab
		.split("\n")
		.filter((line) => !line.includes(CRON_MARKER) && !line.startsWith("WORKLOG_SLACK_WEBHOOK="));

	if (options.slack) {
		lines.push(buildCronEnvLine(options.slack));
	}

	const cronLine = buildCronLine(config);
	lines.push(cronLine);

	const newCrontab = `${lines.filter((l) => l.trim()).join("\n")}\n`;
	const success = await setCrontab(newCrontab);

	if (success) {
		const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
		console.log(chalk.green("✓"), "Daily standup cron job installed");
		console.log(chalk.dim(`  Schedule: Every day at ${timeStr}`));
		if (options.slack) {
			console.log(chalk.dim("  Output: Slack webhook"));
		} else {
			console.log(chalk.dim(`  Output: ${outputDir}/standup-YYYY-MM-DD.md`));
		}
	} else {
		console.error(chalk.red("Failed to install cron job"));
		process.exit(1);
	}
}

export async function cronUninstall(): Promise<void> {
	const crontab = await getCurrentCrontab();
	const lines = crontab
		.split("\n")
		.filter((line) => !line.includes(CRON_MARKER) && !line.startsWith("WORKLOG_SLACK_WEBHOOK="));

	const newCrontab = `${lines.filter((l) => l.trim()).join("\n")}\n`;
	const success = await setCrontab(newCrontab);

	if (success) {
		console.log(chalk.green("✓"), "Daily standup cron job removed");
	} else {
		console.error(chalk.red("Failed to update crontab"));
		process.exit(1);
	}
}

export async function cronStatus(): Promise<void> {
	const crontab = await getCurrentCrontab();
	const worklogLine = crontab.split("\n").find((line) => line.includes(CRON_MARKER));

	if (worklogLine) {
		const parts = worklogLine.split(" ");
		const minute = parts[0] ?? "0";
		const hour = parts[1] ?? "9";
		const timeStr = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

		console.log(chalk.green("✓"), "Daily standup cron job is installed");
		console.log(chalk.dim(`  Schedule: Every day at ${timeStr}`));

		if (worklogLine.includes("curl")) {
			console.log(chalk.dim("  Output: Slack webhook"));
		} else {
			const match = worklogLine.match(/> ([^\s]+)/);
			if (match?.[1]) {
				console.log(chalk.dim(`  Output: ${match[1].replace("$(date +%Y-%m-%d)", "YYYY-MM-DD")}`));
			}
		}
	} else {
		console.log(chalk.yellow("○"), "No daily standup cron job installed");
		console.log(chalk.dim("  Run: worklog cron install"));
	}
}

export type Fetcher = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;

export type SlackPostResult = { ok: true } | { ok: false; status: number; statusText: string };

export async function postToSlack(
	webhook: string,
	text: string,
	fetchImpl: Fetcher = fetch,
): Promise<SlackPostResult> {
	const response = await fetchImpl(webhook, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ text }),
	});

	if (response.ok) {
		return { ok: true };
	}

	return {
		ok: false,
		status: response.status,
		statusText: response.statusText || String(response.status),
	};
}

export interface CronRunOptions {
	slackWebhook?: string;
	outputFile?: string;
}

export interface CronRunResult {
	success: boolean;
	output: string;
	destination: "slack" | "file" | "stdout";
	error?: string;
}

export interface CronRunDependencies<
	TConfig = unknown,
	TItem = unknown,
	TSummary = unknown,
	TFormat = unknown,
> {
	config: TConfig;
	dateRange: { start: Date; end: Date };
	readers: Array<{
		name: string;
		read(dateRange: { start: Date; end: Date }, config: TConfig): Promise<TItem[]>;
	}>;
	aggregator: (items: TItem[], config: TConfig, dateRange: { start: Date; end: Date }) => TSummary;
	formatter: (summary: TSummary, format: TFormat, verbose: boolean) => string;
	slackPoster?: (webhook: string, text: string) => Promise<SlackPostResult>;
}

export async function cronRun<
	TConfig = unknown,
	TItem = unknown,
	TSummary = unknown,
	TFormat = unknown,
>(
	options: CronRunOptions,
	dependencies: CronRunDependencies<TConfig, TItem, TSummary, TFormat>,
): Promise<CronRunResult> {
	const {
		config,
		dateRange,
		readers,
		aggregator,
		formatter,
		slackPoster = postToSlack,
	} = dependencies;

	const allItems: TItem[] = [];
	for (const reader of readers) {
		try {
			const items = await reader.read(dateRange, config);
			allItems.push(...items);
		} catch {
			// Silently skip failing sources in cron mode
		}
	}

	allItems.sort((a: TItem, b: TItem) => {
		const aTime = (a as { timestamp?: Date })?.timestamp?.getTime() ?? 0;
		const bTime = (b as { timestamp?: Date })?.timestamp?.getTime() ?? 0;
		return aTime - bTime;
	});

	const projectSummary = aggregator(allItems, config, dateRange);

	const format = (options.slackWebhook ? "slack" : "markdown") as TFormat;
	const output = formatter(projectSummary, format, false);

	if (options.slackWebhook) {
		const result = await slackPoster(options.slackWebhook, output);
		if (!result.ok) {
			return {
				success: false,
				output,
				destination: "slack",
				error: result.statusText,
			};
		}
		return {
			success: true,
			output,
			destination: "slack",
		};
	}

	if (options.outputFile) {
		return {
			success: true,
			output,
			destination: "file",
		};
	}

	return {
		success: true,
		output,
		destination: "stdout",
	};
}
