import { homedir } from "node:os";
import type { SchedulePeriod } from "../schedule.ts";
import {
	getCronFallbackStatus,
	installCronFallback,
	uninstallCronFallback,
} from "./cron_fallback.ts";
import {
	getSystemdTimersStatus,
	installSystemdUnits,
	isSystemdUserAvailable,
	uninstallSystemdUnits,
} from "./systemd.ts";
import {
	getWindowsTasksStatus,
	installWindowsTasks,
	isWindowsTaskSchedulerAvailable,
	uninstallWindowsTasks,
} from "./windows.ts";

export type SchedulerBackend = "systemd" | "cron" | "windows";

export async function detectSchedulerBackend(): Promise<SchedulerBackend> {
	if (await isSystemdUserAvailable()) {
		return "systemd";
	}
	if (await isWindowsTaskSchedulerAvailable()) {
		return "windows";
	}
	return "cron";
}

export function getDefaultPeriods(options: {
	noWeekly?: boolean;
	noMonthly?: boolean;
	noQuarterly?: boolean;
}): SchedulePeriod[] {
	const periods: SchedulePeriod[] = ["daily", "weekly", "monthly", "quarterly"];
	return periods.filter((p) => {
		if (p === "weekly" && options.noWeekly) return false;
		if (p === "monthly" && options.noMonthly) return false;
		if (p === "quarterly" && options.noQuarterly) return false;
		return true;
	});
}

function resolveWorklogExecStartParts(): string[] {
	const execPath = process.execPath;
	const scriptPath = process.argv[1];

	if (execPath.endsWith("/worklog") || execPath.includes("/worklog-")) {
		return [execPath];
	}

	if (scriptPath) {
		return [execPath, scriptPath];
	}

	return [execPath];
}

function quoteSystemdArg(value: string): string {
	const escaped = value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
	return `"${escaped}"`;
}

function formatSystemdExecStart(args: string[]): string {
	return args.map(quoteSystemdArg).join(" ");
}

export async function scheduleInstall(options: {
	noWeekly?: boolean;
	noMonthly?: boolean;
	noQuarterly?: boolean;
	slackWebhook?: string;
}): Promise<{ backend: SchedulerBackend; periods: SchedulePeriod[] }> {
	const periods = getDefaultPeriods(options);
	const backend = await detectSchedulerBackend();
	const home = homedir();

	if (backend === "systemd") {
		const execParts = resolveWorklogExecStartParts();
		const execStart = formatSystemdExecStart(execParts);
		await installSystemdUnits(home, {
			worklogPath: execStart,
			periods,
			slackWebhook: options.slackWebhook,
		});
		return { backend, periods };
	}

	if (backend === "windows") {
		const execStart = resolveWorklogExecStartParts();
		await installWindowsTasks(periods, execStart);
		return { backend, periods };
	}

	await installCronFallback({ periods, slackWebhook: options.slackWebhook });
	return { backend, periods };
}

export async function scheduleUninstall(options: {
	noWeekly?: boolean;
	noMonthly?: boolean;
	noQuarterly?: boolean;
}): Promise<{ backend: SchedulerBackend; periods: SchedulePeriod[] }> {
	const periods = getDefaultPeriods(options);
	const backend = await detectSchedulerBackend();
	const home = homedir();

	if (backend === "systemd") {
		await uninstallSystemdUnits(home, periods);
		return { backend, periods };
	}

	if (backend === "windows") {
		await uninstallWindowsTasks(periods);
		return { backend, periods };
	}

	await uninstallCronFallback(periods);
	return { backend, periods };
}

export async function scheduleStatus(): Promise<
	| { backend: "systemd"; timers: string }
	| { backend: "cron"; installed: SchedulePeriod[] }
	| { backend: "windows"; installed: SchedulePeriod[] }
> {
	const backend = await detectSchedulerBackend();
	if (backend === "systemd") {
		const timers = await getSystemdTimersStatus(["daily", "weekly", "monthly", "quarterly"]);
		return { backend, timers };
	}

	if (backend === "windows") {
		const { installed } = await getWindowsTasksStatus(["daily", "weekly", "monthly", "quarterly"]);
		return { backend, installed };
	}

	const cron = await getCronFallbackStatus();
	return { backend, installed: cron.installed };
}
