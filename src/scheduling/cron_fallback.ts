import type { SchedulePeriod } from "../schedule.ts";

const WORKLOG_ENV_PREFIX = "WORKLOG_SLACK_WEBHOOK=";

const MARKERS: Record<SchedulePeriod, string> = {
	daily: "# worklog-daily-standup",
	weekly: "# worklog-weekly-standup",
	monthly: "# worklog-monthly-standup",
	quarterly: "# worklog-quarterly-standup",
};

function quoteShellArg(value: string): string {
	const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
	return `"${escaped}"`;
}

export function resolveWorklogCommandForShell(): string {
	const execPath = process.execPath;
	const scriptPath = process.argv[1];

	if (execPath.endsWith("/worklog") || execPath.includes("/worklog-")) {
		return quoteShellArg(execPath);
	}

	if (scriptPath) {
		return `${quoteShellArg(execPath)} ${quoteShellArg(scriptPath)}`;
	}

	return quoteShellArg(execPath);
}

export function buildCronLine(period: SchedulePeriod, worklogCmd: string): string {
	const marker = MARKERS[period];
	const command = `${worklogCmd} schedule run --period ${period}`;

	switch (period) {
		case "daily":
			return `5 0 * * * ${command} ${marker}`;
		case "weekly":
			return `5 0 * * 1 ${command} ${marker}`;
		case "monthly":
			return `5 0 1 * * ${command} ${marker}`;
		case "quarterly":
			return `5 0 1 1,4,7,10 * ${command} ${marker}`;
	}
}

async function getCurrentCrontab(): Promise<string> {
	try {
		const proc = Bun.spawn(["crontab", "-l"], { stdout: "pipe", stderr: "pipe" });
		const output = await new Response(proc.stdout).text();
		await proc.exited;
		return output;
	} catch {
		return "";
	}
}

async function setCrontab(content: string): Promise<boolean> {
	const proc = Bun.spawn(["crontab", "-"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
	proc.stdin.write(content);
	proc.stdin.end();
	const exitCode = await proc.exited;
	return exitCode === 0;
}

export async function installCronFallback(options: {
	periods: SchedulePeriod[];
	slackWebhook?: string;
}): Promise<void> {
	const worklogCmd = resolveWorklogCommandForShell();
	const crontab = await getCurrentCrontab();

	const existingLines = crontab.split("\n");
	const filtered = existingLines.filter((line) => {
		if (line.startsWith(WORKLOG_ENV_PREFIX)) return false;
		return !Object.values(MARKERS).some((marker) => line.includes(marker));
	});

	if (options.slackWebhook) {
		filtered.push(`${WORKLOG_ENV_PREFIX}${options.slackWebhook}`);
	}

	for (const period of options.periods) {
		filtered.push(buildCronLine(period, worklogCmd));
	}

	const newCrontab = `${filtered.filter((l) => l.trim()).join("\n")}\n`;
	const ok = await setCrontab(newCrontab);
	if (!ok) {
		throw new Error("Failed to update crontab");
	}
}

export async function uninstallCronFallback(periods: readonly SchedulePeriod[]): Promise<void> {
	const crontab = await getCurrentCrontab();
	const markers = new Set(periods.map((p) => MARKERS[p]));

	const filtered = crontab.split("\n").filter((line) => {
		if (line.startsWith(WORKLOG_ENV_PREFIX)) return false;
		return !Array.from(markers).some((marker) => line.includes(marker));
	});

	const newCrontab = `${filtered.filter((l) => l.trim()).join("\n")}\n`;
	const ok = await setCrontab(newCrontab);
	if (!ok) {
		throw new Error("Failed to update crontab");
	}
}

export async function getCronFallbackStatus(): Promise<{ installed: SchedulePeriod[] }> {
	const crontab = await getCurrentCrontab();
	const installed = (Object.keys(MARKERS) as SchedulePeriod[]).filter((period) =>
		crontab.includes(MARKERS[period]),
	);

	return { installed };
}
