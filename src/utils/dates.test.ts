import { describe, expect, test } from "bun:test";
import type { CliOptions, DateRange } from "../types.ts";
import { formatDateRange, isWithinRange, parseDateRange } from "./dates.ts";

const defaultOptions: CliOptions = {
	yesterday: false,
	week: false,
	month: false,
	json: false,
	plain: false,
	slack: false,
	noLlm: false,
	trends: false,
	dashboard: false,
	verbose: false,
};

describe("parseDateRange", () => {
	test("returns today's range by default", () => {
		const range = parseDateRange(defaultOptions);
		const now = new Date();

		expect(range.start.getDate()).toBe(now.getDate());
		expect(range.end.getDate()).toBe(now.getDate());
		expect(range.start.getHours()).toBe(0);
		expect(range.end.getHours()).toBe(23);
	});

	test("parses specific date", () => {
		const range = parseDateRange({ ...defaultOptions, date: "2025-06-15" });

		expect(range.start.getFullYear()).toBe(2025);
		const JUNE = 5;
		expect(range.start.getMonth()).toBe(JUNE);
		expect(range.start.getDate()).toBe(15);
	});

	test("throws on invalid date", () => {
		expect(() => parseDateRange({ ...defaultOptions, date: "invalid" })).toThrow(
			"Invalid date format",
		);
	});

	test("returns yesterday's range", () => {
		const range = parseDateRange({ ...defaultOptions, yesterday: true });
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);

		expect(range.start.getDate()).toBe(yesterday.getDate());
	});
});

describe("isWithinRange", () => {
	const range: DateRange = {
		start: new Date("2025-06-15T00:00:00"),
		end: new Date("2025-06-15T23:59:59"),
	};

	test("returns true for timestamp within range", () => {
		const timestamp = new Date("2025-06-15T12:00:00");
		expect(isWithinRange(timestamp, range)).toBe(true);
	});

	test("returns false for timestamp before range", () => {
		const timestamp = new Date("2025-06-14T12:00:00");
		expect(isWithinRange(timestamp, range)).toBe(false);
	});

	test("returns false for timestamp after range", () => {
		const timestamp = new Date("2025-06-16T12:00:00");
		expect(isWithinRange(timestamp, range)).toBe(false);
	});
});

describe("formatDateRange", () => {
	test("formats single day range", () => {
		const range: DateRange = {
			start: new Date("2025-06-15T00:00:00"),
			end: new Date("2025-06-15T23:59:59"),
		};
		const formatted = formatDateRange(range);

		expect(formatted).toContain("Jun");
		expect(formatted).toContain("15");
		expect(formatted).toContain("2025");
	});

	test("formats multi-day range with separator", () => {
		const range: DateRange = {
			start: new Date("2025-06-15T00:00:00"),
			end: new Date("2025-06-20T23:59:59"),
		};
		const formatted = formatDateRange(range);

		expect(formatted).toContain("-");
		expect(formatted).toContain("15");
		expect(formatted).toContain("20");
	});
});
