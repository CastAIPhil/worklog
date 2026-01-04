import {
	addDays,
	addMonths,
	addQuarters,
	addWeeks,
	endOfMonth,
	endOfQuarter,
	startOfDay,
	startOfMonth,
	startOfQuarter,
	startOfWeek,
	subDays,
	subMonths,
	subQuarters,
	subWeeks,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { SchedulePeriod, ScheduleRunDependencies, ScheduleRunOptions } from "../schedule.ts";
import { scheduleRun } from "../schedule.ts";
import { getSnapshotKey, getSnapshotPath } from "../storage/snapshots.ts";

export interface BackfillPlanItem {
	period: SchedulePeriod;
	now: Date;
	expectedKey: string;
	expectedPath: string;
	rootDir?: string;
}

export interface BuildBackfillPlanOptions {
	now?: Date;
	weeks: number;
	months: number;
	daily: boolean;
	weekly: boolean;
	monthly: boolean;
	quarterly: boolean;
	since?: Date;
	until?: Date;
	rootDir?: string;
	timeZone?: string;
}

function toZoned(date: Date, timeZone?: string): Date {
	return timeZone ? toZonedTime(date, timeZone) : date;
}

function fromZoned(date: Date, timeZone?: string): Date {
	return timeZone ? fromZonedTime(date, timeZone) : date;
}

function atNoon(date: Date): Date {
	const copy = new Date(date);
	copy.setHours(12, 0, 0, 0);
	return copy;
}

function pushPlanItem(
	items: BackfillPlanItem[],
	period: SchedulePeriod,
	periodStart: Date,
	now: Date,
	rootDir?: string,
	timeZone?: string,
) {
	const key = getSnapshotKey(period, periodStart, timeZone);
	const expectedPath = getSnapshotPath(period, key, rootDir);
	items.push({ period, now, expectedKey: key, expectedPath, rootDir });
}

export function buildBackfillPlan(options: BuildBackfillPlanOptions): BackfillPlanItem[] {
	const now = options.now ?? new Date();
	const timeZone = options.timeZone;
	const nowZoned = toZoned(now, timeZone);
	const items: BackfillPlanItem[] = [];

	if (options.since || options.until) {
		const endZoned = startOfDay(
			options.until ? toZoned(options.until, timeZone) : subDays(startOfDay(nowZoned), 1),
		);
		const startZoned = startOfDay(options.since ? toZoned(options.since, timeZone) : endZoned);

		if (options.daily) {
			for (let cursor = startZoned; cursor <= endZoned; cursor = addDays(cursor, 1)) {
				pushPlanItem(
					items,
					"daily",
					fromZoned(cursor, timeZone),
					fromZoned(atNoon(addDays(cursor, 1)), timeZone),
					options.rootDir,
					timeZone,
				);
			}
		}

		if (options.weekly) {
			const weekStart = startOfWeek(startZoned, { weekStartsOn: 1 });
			const lastWeekStart = startOfWeek(endZoned, { weekStartsOn: 1 });
			for (let cursor = weekStart; cursor <= lastWeekStart; cursor = addWeeks(cursor, 1)) {
				const weekEnd = addDays(cursor, 6);
				if (weekEnd > endZoned) {
					continue;
				}
				pushPlanItem(
					items,
					"weekly",
					fromZoned(cursor, timeZone),
					fromZoned(atNoon(addWeeks(cursor, 1)), timeZone),
					options.rootDir,
					timeZone,
				);
			}
		}

		if (options.monthly) {
			const monthStart = startOfMonth(startZoned);
			const lastMonthStart = startOfMonth(endZoned);
			for (let cursor = monthStart; cursor <= lastMonthStart; cursor = addMonths(cursor, 1)) {
				const monthEnd = endOfMonth(cursor);
				if (monthEnd > endZoned) {
					continue;
				}
				pushPlanItem(
					items,
					"monthly",
					fromZoned(cursor, timeZone),
					fromZoned(atNoon(addMonths(cursor, 1)), timeZone),
					options.rootDir,
					timeZone,
				);
			}
		}

		if (options.quarterly) {
			const quarterStart = startOfQuarter(startZoned);
			const lastQuarterStart = startOfQuarter(endZoned);
			for (let cursor = quarterStart; cursor <= lastQuarterStart; cursor = addQuarters(cursor, 1)) {
				const quarterEnd = endOfQuarter(cursor);
				if (quarterEnd > endZoned) {
					continue;
				}
				pushPlanItem(
					items,
					"quarterly",
					fromZoned(cursor, timeZone),
					fromZoned(atNoon(addQuarters(cursor, 1)), timeZone),
					options.rootDir,
					timeZone,
				);
			}
		}

		return items;
	}

	const todayZoned = startOfDay(nowZoned);
	const yesterdayZoned = subDays(todayZoned, 1);

	if (options.daily) {
		const days = Math.max(options.weeks * 7, 1);
		const startZoned = subDays(yesterdayZoned, days - 1);
		for (let cursor = startZoned; cursor <= yesterdayZoned; cursor = addDays(cursor, 1)) {
			pushPlanItem(
				items,
				"daily",
				fromZoned(cursor, timeZone),
				fromZoned(atNoon(addDays(cursor, 1)), timeZone),
				options.rootDir,
				timeZone,
			);
		}
	}

	if (options.weekly) {
		const currentWeekStart = startOfWeek(nowZoned, { weekStartsOn: 1 });
		for (let i = options.weeks; i >= 1; i--) {
			const weekStart = subWeeks(currentWeekStart, i);
			pushPlanItem(
				items,
				"weekly",
				fromZoned(weekStart, timeZone),
				fromZoned(atNoon(addWeeks(weekStart, 1)), timeZone),
				options.rootDir,
				timeZone,
			);
		}
	}

	if (options.monthly) {
		const currentMonthStart = startOfMonth(nowZoned);
		for (let i = options.months; i >= 1; i--) {
			const monthStart = subMonths(currentMonthStart, i);
			pushPlanItem(
				items,
				"monthly",
				fromZoned(monthStart, timeZone),
				fromZoned(atNoon(addMonths(monthStart, 1)), timeZone),
				options.rootDir,
				timeZone,
			);
		}
	}

	if (options.quarterly) {
		const currentQuarterStart = startOfQuarter(nowZoned);
		const quarterStart = subQuarters(currentQuarterStart, 1);
		pushPlanItem(
			items,
			"quarterly",
			fromZoned(quarterStart, timeZone),
			fromZoned(atNoon(currentQuarterStart), timeZone),
			options.rootDir,
			timeZone,
		);
	}

	return items;
}

export interface ExecuteBackfillPlanOptions {
	skipExisting: boolean;
	overwrite: boolean;
	dryRun: boolean;
	slackWebhook?: string;
}

export interface ExecuteBackfillPlanResult {
	planned: number;
	written: number;
	skipped: number;
	errors: number;
	results: Array<{
		period: SchedulePeriod;
		expectedPath: string;
		status: "written" | "skipped" | "error";
		error?: string;
	}>;
}

export async function executeBackfillPlan<TConfig extends { timezone?: string }, TProjectSummary>(
	plan: BackfillPlanItem[],
	executeOptions: ExecuteBackfillPlanOptions,
	deps: ScheduleRunDependencies<TConfig, TProjectSummary>,
): Promise<ExecuteBackfillPlanResult> {
	let written = 0;
	let skipped = 0;
	let errors = 0;
	const results: ExecuteBackfillPlanResult["results"] = [];

	for (const item of plan) {
		const file = Bun.file(item.expectedPath);
		const exists = await file.exists();
		if (executeOptions.skipExisting && exists && !executeOptions.overwrite) {
			skipped++;
			results.push({ period: item.period, expectedPath: item.expectedPath, status: "skipped" });
			continue;
		}

		if (executeOptions.dryRun) {
			results.push({ period: item.period, expectedPath: item.expectedPath, status: "skipped" });
			skipped++;
			continue;
		}

		try {
			const runOptions: ScheduleRunOptions = {
				period: item.period,
				now: item.now,
				rootDir: item.rootDir,
				slackWebhook: executeOptions.slackWebhook,
			};
			await scheduleRun(runOptions, deps);
			written++;
			results.push({ period: item.period, expectedPath: item.expectedPath, status: "written" });
		} catch (error) {
			errors++;
			results.push({
				period: item.period,
				expectedPath: item.expectedPath,
				status: "error",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return { planned: plan.length, written, skipped, errors, results };
}
