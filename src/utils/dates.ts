import {
	differenceInDays,
	endOfDay,
	endOfMonth,
	endOfQuarter,
	endOfWeek,
	getQuarter,
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

function parseYmd(value: string): { year: number; month: number; day: number } | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
	if (!match) {
		return null;
	}

	const year = Number.parseInt(match[1] ?? "0", 10);
	const month = Number.parseInt(match[2] ?? "0", 10);
	const day = Number.parseInt(match[3] ?? "0", 10);
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return null;
	}

	const candidate = new Date(year, month - 1, day);
	if (
		candidate.getFullYear() !== year ||
		candidate.getMonth() !== month - 1 ||
		candidate.getDate() !== day
	) {
		return null;
	}

	return { year, month, day };
}

function toZoned(date: Date, timeZone?: string): Date {
	return timeZone ? toZonedTime(date, timeZone) : date;
}

function fromZoned(date: Date, timeZone?: string): Date {
	return timeZone ? fromZonedTime(date, timeZone) : date;
}

function resolvePreviousWeekday(targetDay: number, reference: Date, timeZone?: string): Date {
	const referenceZoned = toZoned(reference, timeZone);
	const referenceDayStartZoned = startOfDay(referenceZoned);
	const today = referenceDayStartZoned.getDay();
	const rawDelta = (today - targetDay + 7) % 7;
	const delta = rawDelta === 0 ? 7 : rawDelta;
	const previousStartZoned = subDays(referenceDayStartZoned, delta);
	return fromZoned(previousStartZoned, timeZone);
}

export function parseDateInput(value: string, referenceNow = new Date(), timeZone?: string): Date {
	const ymd = parseYmd(value);
	if (ymd) {
		const candidate = new Date(ymd.year, ymd.month - 1, ymd.day);
		return fromZoned(startOfDay(candidate), timeZone);
	}

	const weekday = parseNamedWeekday(value);
	if (weekday !== null) {
		return resolvePreviousWeekday(weekday, referenceNow, timeZone);
	}

	throw new Error(`Invalid date format: ${value}. Use YYYY-MM-DD or weekday name.`);
}

export function parseDateRange(
	options: CliOptions,
	referenceNow = new Date(),
	timeZone?: string,
): DateRange {
	let nowZoned = toZoned(referenceNow, timeZone);

	if (options.last) {
		if (options.quarter) {
			nowZoned = subQuarters(nowZoned, 1);
		} else if (options.week) {
			nowZoned = subWeeks(nowZoned, 1);
		} else if (options.month) {
			nowZoned = subMonths(nowZoned, 1);
		} else {
			nowZoned = subDays(nowZoned, 1);
		}
	}

	if (options.date) {
		const start = parseDateInput(options.date, referenceNow, timeZone);
		const startZoned = toZoned(start, timeZone);
		return {
			start,
			end: fromZoned(endOfDay(startZoned), timeZone),
		};
	}

	if (options.yesterday) {
		const yesterdayZoned = subDays(nowZoned, 1);
		return {
			start: fromZoned(startOfDay(yesterdayZoned), timeZone),
			end: fromZoned(endOfDay(yesterdayZoned), timeZone),
		};
	}

	if (options.quarter) {
		return {
			start: fromZoned(startOfQuarter(nowZoned), timeZone),
			end: fromZoned(endOfQuarter(nowZoned), timeZone),
		};
	}

	if (options.week) {
		return {
			start: fromZoned(startOfWeek(nowZoned, { weekStartsOn: 1 }), timeZone),
			end: fromZoned(endOfWeek(nowZoned, { weekStartsOn: 1 }), timeZone),
		};
	}

	if (options.month) {
		return {
			start: fromZoned(startOfMonth(nowZoned), timeZone),
			end: fromZoned(endOfMonth(nowZoned), timeZone),
		};
	}

	return {
		start: fromZoned(startOfDay(nowZoned), timeZone),
		end: fromZoned(endOfDay(nowZoned), timeZone),
	};
}

export function isWithinRange(timestamp: Date, range: DateRange): boolean {
	return timestamp >= range.start && timestamp <= range.end;
}

export function formatDateRange(range: DateRange, timeZone?: string): string {
	const opts: Intl.DateTimeFormatOptions = {
		weekday: "short",
		year: "numeric",
		month: "short",
		day: "numeric",
		...(timeZone ? { timeZone } : {}),
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

export function getQuarterLabel(date: Date, timeZone?: string): string {
	const zoned = toZoned(date, timeZone);
	const q = getQuarter(zoned);
	const year = zoned.getFullYear();
	return `Q${q} ${year}`;
}

export function getMonthLabel(date: Date, timeZone?: string): string {
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
		...(timeZone ? { timeZone } : {}),
	});
}
