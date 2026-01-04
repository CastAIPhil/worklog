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
) {
	const key = getSnapshotKey(period, periodStart);
	const expectedPath = getSnapshotPath(period, key, rootDir);
	items.push({ period, now, expectedKey: key, expectedPath, rootDir });
}

export function buildBackfillPlan(options: BuildBackfillPlanOptions): BackfillPlanItem[] {
	const now = options.now ?? new Date();
	const items: BackfillPlanItem[] = [];

	if (options.since || options.until) {
		const end = startOfDay(options.until ?? subDays(now, 1));
		const start = startOfDay(options.since ?? end);

		if (options.daily) {
			for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
				pushPlanItem(items, "daily", cursor, atNoon(addDays(cursor, 1)), options.rootDir);
			}
		}

		if (options.weekly) {
			const weekStart = startOfWeek(start, { weekStartsOn: 1 });
			const lastWeekStart = startOfWeek(end, { weekStartsOn: 1 });
			for (let cursor = weekStart; cursor <= lastWeekStart; cursor = addWeeks(cursor, 1)) {
				const weekEnd = addDays(cursor, 6);
				if (weekEnd > end) {
					continue;
				}
				pushPlanItem(items, "weekly", cursor, atNoon(addWeeks(cursor, 1)), options.rootDir);
			}
		}

		if (options.monthly) {
			const monthStart = startOfMonth(start);
			const lastMonthStart = startOfMonth(end);
			for (let cursor = monthStart; cursor <= lastMonthStart; cursor = addMonths(cursor, 1)) {
				const monthEnd = endOfMonth(cursor);
				if (monthEnd > end) {
					continue;
				}
				pushPlanItem(items, "monthly", cursor, atNoon(addMonths(cursor, 1)), options.rootDir);
			}
		}

		if (options.quarterly) {
			const quarterStart = startOfQuarter(start);
			const lastQuarterStart = startOfQuarter(end);
			for (let cursor = quarterStart; cursor <= lastQuarterStart; cursor = addQuarters(cursor, 1)) {
				const quarterEnd = endOfQuarter(cursor);
				if (quarterEnd > end) {
					continue;
				}
				pushPlanItem(items, "quarterly", cursor, atNoon(addQuarters(cursor, 1)), options.rootDir);
			}
		}

		return items;
	}

	const today = startOfDay(now);
	const yesterday = subDays(today, 1);

	if (options.daily) {
		const days = Math.max(options.weeks * 7, 1);
		const start = subDays(yesterday, days - 1);
		for (let cursor = start; cursor <= yesterday; cursor = addDays(cursor, 1)) {
			pushPlanItem(items, "daily", cursor, atNoon(addDays(cursor, 1)), options.rootDir);
		}
	}

	if (options.weekly) {
		const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
		for (let i = options.weeks; i >= 1; i--) {
			const weekStart = subWeeks(currentWeekStart, i);
			pushPlanItem(items, "weekly", weekStart, atNoon(addWeeks(weekStart, 1)), options.rootDir);
		}
	}

	if (options.monthly) {
		const currentMonthStart = startOfMonth(now);
		for (let i = options.months; i >= 1; i--) {
			const monthStart = subMonths(currentMonthStart, i);
			pushPlanItem(items, "monthly", monthStart, atNoon(addMonths(monthStart, 1)), options.rootDir);
		}
	}

	if (options.quarterly) {
		const currentQuarterStart = startOfQuarter(now);
		const quarterStart = subQuarters(currentQuarterStart, 1);
		pushPlanItem(items, "quarterly", quarterStart, atNoon(currentQuarterStart), options.rootDir);
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

export async function executeBackfillPlan<TConfig, TProjectSummary>(
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
