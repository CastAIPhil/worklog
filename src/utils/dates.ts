import {
	endOfDay,
	endOfMonth,
	endOfWeek,
	isValid,
	parseISO,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
import type { CliOptions, DateRange } from "../types.ts";

export function parseDateRange(options: CliOptions): DateRange {
	let now = new Date();

	if (options.last) {
		if (options.week) {
			now = subWeeks(now, 1);
		} else if (options.month) {
			now = subMonths(now, 1);
		} else {
			now = subDays(now, 1);
		}
	}

	if (options.date) {
		const parsed = parseISO(options.date);
		if (!isValid(parsed)) {
			throw new Error(`Invalid date format: ${options.date}. Use YYYY-MM-DD.`);
		}
		return {
			start: startOfDay(parsed),
			end: endOfDay(parsed),
		};
	}

	if (options.yesterday) {
		const yesterday = subDays(now, 1);
		return {
			start: startOfDay(yesterday),
			end: endOfDay(yesterday),
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
