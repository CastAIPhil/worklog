import { describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computePreviousPeriodDateRange, scheduleRun } from "./schedule.ts";
import type { DateRange, WorkItem } from "./types.ts";

describe("computePreviousPeriodDateRange", () => {
	test("daily returns yesterday", () => {
		const now = new Date(2025, 0, 10, 12, 0, 0);
		const range = computePreviousPeriodDateRange("daily", now);
		expect(range.start.getFullYear()).toBe(2025);
		expect(range.start.getMonth()).toBe(0);
		expect(range.start.getDate()).toBe(9);
	});

	test("weekly returns previous week (Mon-Sun)", () => {
		const now = new Date(2025, 0, 10, 12, 0, 0);
		const range = computePreviousPeriodDateRange("weekly", now);
		expect(range.start.getFullYear()).toBe(2024);
		expect(range.start.getMonth()).toBe(11);
		expect(range.start.getDate()).toBe(30);
		expect(range.start.getDay()).toBe(1);
	});

	test("monthly returns previous month", () => {
		const now = new Date(2025, 0, 10, 12, 0, 0);
		const range = computePreviousPeriodDateRange("monthly", now);
		expect(range.start.getFullYear()).toBe(2024);
		expect(range.start.getMonth()).toBe(11);
		expect(range.start.getDate()).toBe(1);
	});

	test("quarterly returns previous quarter", () => {
		const now = new Date(2025, 1, 10, 12, 0, 0);
		const range = computePreviousPeriodDateRange("quarterly", now);
		expect(range.start.getFullYear()).toBe(2024);
		expect(range.start.getMonth()).toBe(9);
		expect(range.start.getDate()).toBe(1);
	});
});

describe("scheduleRun", () => {
	test("writes snapshot and posts to Slack when webhook provided", async () => {
		const rootDir = join(tmpdir(), `worklog-schedule-test-${Date.now()}`);
		await mkdir(rootDir, { recursive: true });

		try {
			const now = new Date(2025, 0, 10, 12, 0, 0);

			const readers = [
				{
					name: "test",
					async read(_range: DateRange, _config: unknown): Promise<WorkItem[]> {
						return [
							{
								source: "git",
								timestamp: new Date("2025-01-09T10:00:00Z"),
								title: "Commit",
							},
						];
					},
				},
			];

			const slackCalls: Array<{ webhook: string; text: string }> = [];

			const result = await scheduleRun(
				{ period: "daily", slackWebhook: "https://example.test/hook", rootDir, now },
				{
					config: {},
					readers,
					aggregator: (items) => ({ items }),
					formatter: () => "hello",
					slackPoster: async (webhook, text) => {
						slackCalls.push({ webhook, text });
						return { ok: true };
					},
				},
			);

			expect(result.snapshot.key).toBe("2025-01-09");
			expect(slackCalls).toHaveLength(1);
			expect(slackCalls[0]?.text).toBe("hello");

			const snapshotFile = Bun.file(result.snapshot.path);
			expect(await snapshotFile.exists()).toBe(true);
		} finally {
			try {
				await rm(rootDir, { recursive: true });
			} catch {}
		}
	});
});
