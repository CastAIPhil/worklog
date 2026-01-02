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
