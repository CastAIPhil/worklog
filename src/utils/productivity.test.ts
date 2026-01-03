import { describe, expect, test } from "bun:test";
import type { WorkItem, WorkSummary } from "../types.ts";
import {
	analyzeProductivity,
	formatProductivityJson,
	formatProductivityMarkdown,
	formatProductivityPlain,
} from "./productivity.ts";

function createWorkItem(source: string, timestamp: Date, title = "Test item"): WorkItem {
	return {
		source: source as WorkItem["source"],
		timestamp,
		title,
	};
}

function createSummary(items: WorkItem[]): WorkSummary {
	const sources = [...new Set(items.map((i) => i.source))];
	return {
		dateRange: {
			start: new Date("2024-01-15T00:00:00"),
			end: new Date("2024-01-21T23:59:59"),
		},
		items,
		sources,
		generatedAt: new Date(),
	};
}

describe("analyzeProductivity", () => {
	test("handles empty items", () => {
		const summary = createSummary([]);
		const patterns = analyzeProductivity(summary);

		expect(patterns.summary.totalItems).toBe(0);
		expect(patterns.summary.totalActiveDays).toBe(0);
		// Peak hours returns top 3 hours even if all have 0 count
		expect(patterns.peakHours.peakHours).toHaveLength(3);
		const allZero = patterns.peakHours.peakHours.every((h) => h.count === 0);
		expect(allZero).toBe(true);
		expect(patterns.focusTime.focusSessions).toHaveLength(0);
	});

	test("identifies peak hours correctly", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-15T09:30:00")),
			createWorkItem("git", new Date("2024-01-15T09:45:00")),
			createWorkItem("git", new Date("2024-01-15T14:00:00")),
			createWorkItem("git", new Date("2024-01-15T14:30:00")),
			createWorkItem("git", new Date("2024-01-15T20:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		const peak0 = patterns.peakHours.peakHours[0];
		const peak1 = patterns.peakHours.peakHours[1];
		expect(peak0?.hour).toBe(9);
		expect(peak0?.count).toBe(3);
		expect(peak1?.hour).toBe(14);
		expect(peak1?.count).toBe(2);
	});

	test("calculates time of day breakdown", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T07:00:00")),
			createWorkItem("git", new Date("2024-01-15T10:00:00")),
			createWorkItem("git", new Date("2024-01-15T14:00:00")),
			createWorkItem("git", new Date("2024-01-15T15:00:00")),
			createWorkItem("git", new Date("2024-01-15T19:00:00")),
			createWorkItem("git", new Date("2024-01-15T02:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.peakHours.timeOfDayBreakdown.morning).toBe(2);
		expect(patterns.peakHours.timeOfDayBreakdown.afternoon).toBe(2);
		expect(patterns.peakHours.timeOfDayBreakdown.evening).toBe(1);
		expect(patterns.peakHours.timeOfDayBreakdown.night).toBe(1);
	});

	test("detects focus sessions with 30+ min duration", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-15T09:10:00")),
			createWorkItem("git", new Date("2024-01-15T09:20:00")),
			createWorkItem("git", new Date("2024-01-15T09:30:00")),
			createWorkItem("git", new Date("2024-01-15T09:40:00")),
			createWorkItem("git", new Date("2024-01-15T14:00:00")),
			createWorkItem("git", new Date("2024-01-15T14:05:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.focusTime.focusSessions.length).toBeGreaterThanOrEqual(1);
		const firstSession = patterns.focusTime.focusSessions[0];
		expect(firstSession?.durationMinutes).toBe(40);
		expect(firstSession?.itemCount).toBe(5);
	});

	test("counts context switches between sources", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("claude", new Date("2024-01-15T09:05:00")),
			createWorkItem("git", new Date("2024-01-15T09:10:00")),
			createWorkItem("vscode", new Date("2024-01-15T09:15:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.focusTime.contextSwitches).toBe(3);
	});

	test("calculates day of week patterns", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-15T10:00:00")),
			createWorkItem("git", new Date("2024-01-16T09:00:00")),
			createWorkItem("git", new Date("2024-01-17T09:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.dayPatterns.mostActiveDay?.day).toBe("Monday");
		expect(patterns.dayPatterns.mostActiveDay?.count).toBe(2);
	});

	test("calculates source distribution", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-15T09:10:00")),
			createWorkItem("git", new Date("2024-01-15T09:20:00")),
			createWorkItem("claude", new Date("2024-01-15T10:00:00")),
			createWorkItem("claude", new Date("2024-01-15T10:10:00")),
			createWorkItem("vscode", new Date("2024-01-15T11:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.sourcePatterns.primarySource).toBe("git");
		const topSource = patterns.sourcePatterns.sourceDistribution[0];
		expect(topSource?.source).toBe("git");
		expect(topSource?.count).toBe(3);
		expect(topSource?.percentage).toBe(50);
	});

	test("detects common source pairings", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("claude", new Date("2024-01-15T09:10:00")),
			createWorkItem("git", new Date("2024-01-16T09:00:00")),
			createWorkItem("claude", new Date("2024-01-16T09:10:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.sourcePatterns.commonPairings.length).toBeGreaterThan(0);
		const pairing = patterns.sourcePatterns.commonPairings[0];
		expect(pairing).toBeDefined();
		expect(pairing?.sources).toContain("git");
		expect(pairing?.sources).toContain("claude");
	});

	test("generates correct summary", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-15T10:00:00")),
			createWorkItem("git", new Date("2024-01-16T09:00:00")),
			createWorkItem("claude", new Date("2024-01-16T10:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.summary.totalItems).toBe(4);
		expect(patterns.summary.totalActiveDays).toBe(2);
		expect(patterns.summary.averageItemsPerDay).toBe(2);
		expect(patterns.summary.primaryWorkSource).toBe("git");
	});

	test("handles weekend vs weekday ratio", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-16T09:00:00")),
			createWorkItem("git", new Date("2024-01-17T09:00:00")),
			createWorkItem("git", new Date("2024-01-18T09:00:00")),
			createWorkItem("git", new Date("2024-01-19T09:00:00")),
			createWorkItem("git", new Date("2024-01-20T09:00:00")),
			createWorkItem("git", new Date("2024-01-21T09:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);

		expect(patterns.dayPatterns.weekendVsWeekdayRatio).toBeDefined();
		expect(patterns.dayPatterns.weekendVsWeekdayRatio).toBeCloseTo(0.4, 1);
	});
});

describe("formatProductivityMarkdown", () => {
	test("generates valid markdown output", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("git", new Date("2024-01-15T09:30:00")),
			createWorkItem("git", new Date("2024-01-15T10:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);
		const output = formatProductivityMarkdown(patterns);

		expect(output).toContain("## Productivity Patterns");
		expect(output).toContain("### Summary");
		expect(output).toContain("### Peak Hours");
		expect(output).toContain("### Focus Sessions");
		expect(output).toContain("### Day of Week");
		expect(output).toContain("### Source Distribution");
		expect(output).toContain("**Total Activities:** 3");
	});

	test("handles empty data gracefully", () => {
		const summary = createSummary([]);
		const patterns = analyzeProductivity(summary);
		const output = formatProductivityMarkdown(patterns);

		expect(output).toContain("## Productivity Patterns");
		expect(output).toContain("**Total Activities:** 0");
	});
});

describe("formatProductivityJson", () => {
	test("produces valid JSON", () => {
		const items: WorkItem[] = [createWorkItem("git", new Date("2024-01-15T09:00:00"))];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);
		const output = formatProductivityJson(patterns);

		expect(() => JSON.parse(output)).not.toThrow();
		const parsed = JSON.parse(output);
		expect(parsed.summary.totalItems).toBe(1);
		expect(parsed.peakHours).toBeDefined();
		expect(parsed.focusTime).toBeDefined();
		expect(parsed.dayPatterns).toBeDefined();
		expect(parsed.sourcePatterns).toBeDefined();
	});
});

describe("formatProductivityPlain", () => {
	test("generates plain text output", () => {
		const items: WorkItem[] = [
			createWorkItem("git", new Date("2024-01-15T09:00:00")),
			createWorkItem("claude", new Date("2024-01-15T10:00:00")),
		];

		const summary = createSummary(items);
		const patterns = analyzeProductivity(summary);
		const output = formatProductivityPlain(patterns);

		expect(output).toContain("PRODUCTIVITY PATTERNS");
		expect(output).toContain("=====================");
		expect(output).toContain("Total Activities: 2");
		expect(output).toContain("PEAK HOURS");
		expect(output).toContain("FOCUS SESSIONS");
		expect(output).toContain("DAY PATTERNS");
		expect(output).toContain("SOURCES");
	});
});
