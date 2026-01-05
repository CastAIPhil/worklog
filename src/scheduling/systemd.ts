import { mkdir, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SchedulePeriod } from "../schedule.ts";

export interface SystemdInstallOptions {
	worklogPath: string;
	periods: SchedulePeriod[];
	slackWebhook?: string;
}

export interface SystemdUnit {
	name: string;
	content: string;
}

export function getSystemdUserUnitDir(home = homedir()): string {
	return join(home, ".config", "systemd", "user");
}

export function getWorklogEnvFilePath(home = homedir()): string {
	return join(home, ".config", "worklog", "worklog.env");
}

export function buildServiceUnit(period: SchedulePeriod, execStart: string): SystemdUnit {
	const name = `worklog-${period}.service`;

	const content = `[Unit]
Description=worklog ${period} report

[Service]
Type=oneshot
EnvironmentFile=%h/.config/worklog/worklog.env
ExecStart=${execStart} schedule run --period ${period}
`;

	return { name, content };
}

function timerOnCalendarLines(period: SchedulePeriod): string[] {
	switch (period) {
		case "daily":
			return ["OnCalendar=*-*-* 00:05:00"];
		case "weekly":
			return ["OnCalendar=Mon *-*-* 00:05:00"];
		case "monthly":
			return ["OnCalendar=*-*-01 00:05:00"];
		case "quarterly":
			return [
				"OnCalendar=*-01-01 00:05:00",
				"OnCalendar=*-04-01 00:05:00",
				"OnCalendar=*-07-01 00:05:00",
				"OnCalendar=*-10-01 00:05:00",
			];
	}
}

export function buildTimerUnit(period: SchedulePeriod): SystemdUnit {
	const name = `worklog-${period}.timer`;
	const onCalendar = timerOnCalendarLines(period).join("\n");
	const content = `[Unit]
Description=worklog ${period} report timer

[Timer]
${onCalendar}
Persistent=true

[Install]
WantedBy=timers.target
`;

	return { name, content };
}

export function buildUnits(periods: readonly SchedulePeriod[], execStart: string): SystemdUnit[] {
	const units: SystemdUnit[] = [];
	for (const period of periods) {
		units.push(buildServiceUnit(period, execStart));
		units.push(buildTimerUnit(period));
	}
	return units;
}

function quoteEnvFileValue(value: string): string {
	const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
	return `"${escaped}"`;
}

export async function writeWorklogEnvFile(
	home: string,
	opts: { slackWebhook?: string },
): Promise<string> {
	const envDir = join(home, ".config", "worklog");
	await mkdir(envDir, { recursive: true });

	const envPath = getWorklogEnvFilePath(home);
	const lines: string[] = [];
	if (opts.slackWebhook) {
		lines.push(`WORKLOG_SLACK_WEBHOOK=${quoteEnvFileValue(opts.slackWebhook)}`);
	}

	await Bun.write(envPath, `${lines.join("\n")}\n`);
	return envPath;
}

function systemctlUserArgs(...args: string[]): string[] {
	return ["systemctl", "--user", ...args];
}

export async function isSystemdUserAvailable(): Promise<boolean> {
	try {
		const proc = Bun.spawn(systemctlUserArgs("list-timers", "--all"), {
			stdout: "ignore",
			stderr: "ignore",
		});
		const code = await proc.exited;
		return code === 0;
	} catch {
		return false;
	}
}

export async function installSystemdUnits(
	home: string,
	options: SystemdInstallOptions,
): Promise<void> {
	const unitDir = getSystemdUserUnitDir(home);
	await mkdir(unitDir, { recursive: true });

	await writeWorklogEnvFile(home, { slackWebhook: options.slackWebhook });

	const units = buildUnits(options.periods, options.worklogPath);
	for (const unit of units) {
		await Bun.write(join(unitDir, unit.name), unit.content);
	}

	await Bun.spawn(systemctlUserArgs("daemon-reload"), { stdout: "ignore", stderr: "inherit" })
		.exited;

	for (const period of options.periods) {
		await Bun.spawn(systemctlUserArgs("enable", "--now", `worklog-${period}.timer`), {
			stdout: "ignore",
			stderr: "inherit",
		}).exited;
	}
}

export async function uninstallSystemdUnits(
	home: string,
	periods: readonly SchedulePeriod[],
): Promise<void> {
	for (const period of periods) {
		await Bun.spawn(systemctlUserArgs("disable", "--now", `worklog-${period}.timer`), {
			stdout: "ignore",
			stderr: "ignore",
		}).exited;
	}

	const unitDir = getSystemdUserUnitDir(home);
	for (const period of periods) {
		await rm(join(unitDir, `worklog-${period}.timer`), { force: true });
		await rm(join(unitDir, `worklog-${period}.service`), { force: true });
	}

	await Bun.spawn(systemctlUserArgs("daemon-reload"), { stdout: "ignore", stderr: "ignore" })
		.exited;
}

export async function getSystemdTimersStatus(periods: readonly SchedulePeriod[]): Promise<string> {
	const proc = Bun.spawn(systemctlUserArgs("list-timers", "--all"), {
		stdout: "pipe",
		stderr: "pipe",
	});
	const output = await new Response(proc.stdout).text();
	await proc.exited;

	const wanted = new Set(periods.map((p) => `worklog-${p}.timer`));
	const lines = output
		.split("\n")
		.filter((line) => Array.from(wanted).some((name) => line.includes(name)))
		.join("\n");

	return lines.trim();
}
