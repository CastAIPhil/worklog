import {
	differenceInDays,
	endOfDay,
	endOfMonth,
	endOfQuarter,
	endOfWeek,
	getQuarter,
	isValid,
	parseISO,
	startOfDay,
	startOfMonth,
	startOfQuarter,
	startOfWeek,
	subDays,
	subMonths,
	subQuarters,
	subWeeks,
} from "date-fns";
import type { CliOptions, DateRange } from "../types.ts";

export type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";

const WEEKDAYS: Record<string, number> = {
	mon: 1,
	monday: 1,
	tue: 2,
	tues: 2,
	tuesday: 2,
	wed: 3,
	weds: 3,
	wednesday: 3,
	thu: 4,
	thurs: 4,
	thursday: 4,
	fri: 5,
	friday: 5,
	sat: 6,
	saturday: 6,
	sun: 0,
	sunday: 0,
};

function parseNamedWeekday(value: string): number | null {
	const normalized = value.trim().toLowerCase();
	return WEEKDAYS[normalized] ?? null;
}

function resolvePreviousWeekday(targetDay: number, reference: Date): Date {
	const referenceDayStart = startOfDay(reference);
	const today = referenceDayStart.getDay();
	const rawDelta = (today - targetDay + 7) % 7;
	const delta = rawDelta === 0 ? 7 : rawDelta;
	return subDays(referenceDayStart, delta);
}

function parseDateOrWeekday(value: string, reference: Date): Date {
	const parsed = parseISO(value);
	if (isValid(parsed)) {
		return parsed;
	}

	const weekday = parseNamedWeekday(value);
	if (weekday !== null) {
		return resolvePreviousWeekday(weekday, reference);
	}

	throw new Error(`Invalid date format: ${value}. Use YYYY-MM-DD or weekday name.`);
}

export function parseDateInput(value: string, referenceNow = new Date()): Date {
	return parseDateOrWeekday(value, referenceNow);
}

export function parseDateRange(options: CliOptions, referenceNow = new Date()): DateRange {
	let now = referenceNow;

	if (options.date) {
		const parsed = parseDateOrWeekday(options.date, referenceNow);
		return {
			start: startOfDay(parsed),
			end: endOfDay(parsed),
		};
	}

	if (options.last) {
		if (options.quarter) {
			now = subQuarters(now, 1);
		} else if (options.week) {
			now = subWeeks(now, 1);
		} else if (options.month) {
			now = subMonths(now, 1);
		} else {
			now = subDays(now, 1);
		}
	}

	if (options.yesterday) {
		const yesterday = subDays(now, 1);
		return {
			start: startOfDay(yesterday),
			end: endOfDay(yesterday),
		};
	}

	if (options.quarter) {
		return {
			start: startOfQuarter(now),
			end: endOfQuarter(now),
		};
	}

	if (options.week) {
		return {
			start: startOfWeek(now, { weekStartsOn: 1 }),
			end: endOfWeek(now, { weekStartsOn: 1 }),
		};
	}

	if (options.month) {
		return {
			start: startOfMonth(now),
			end: endOfMonth(now),
		};
	}

	return {
		start: startOfDay(now),
		end: endOfDay(now),
	};
}

export function isWithinRange(timestamp: Date, range: DateRange): boolean {
	return timestamp >= range.start && timestamp <= range.end;
}

export function formatDateRange(range: DateRange): string {
	const opts: Intl.DateTimeFormatOptions = {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
	};

	const startStr = range.start.toLocaleDateString("en-US", opts);
	const endStr = range.end.toLocaleDateString("en-US", opts);

	if (startStr === endStr) {
		return startStr;
	}

	return `${startStr} - ${endStr}`;
}

export function getPeriodType(range: DateRange): PeriodType {
	const days = differenceInDays(range.end, range.start);

	if (days <= 1) {
		return "daily";
	}
	if (days <= 7) {
		return "weekly";
	}
	if (days <= 31) {
		return "monthly";
	}
	return "quarterly";
}

export function getQuarterLabel(date: Date): string {
	const q = getQuarter(date);
	const year = date.getFullYear();
	return `Q${q} ${year}`;
}

export function getMonthLabel(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
