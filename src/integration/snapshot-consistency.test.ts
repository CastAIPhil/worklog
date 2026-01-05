import { expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addDays } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import {
	aggregateDailySnapshots,
	getSnapshotDateRange,
	getSnapshotKey,
	loadSnapshot,
	regenerateDailyFromWeekly,
	writeSnapshot,
} from "../storage/snapshots.ts";
import type { WorkItem, WorkSummary } from "../types.ts";

const TEST_ROOT = join(tmpdir(), `worklog-snapshot-consistency-${Date.now()}`);

test("snapshot consistency: regenerate dailies from weekly and aggregate back", async () => {
	await mkdir(TEST_ROOT, { recursive: true });
	try {
		const timeZone = "America/New_York";
		const weeklyKey = "2025-12-22";

		const weeklyRange = getSnapshotDateRange("weekly", weeklyKey, timeZone);
		const weekStartZoned = toZonedTime(weeklyRange.start, timeZone);

		const items: WorkItem[] = [];
		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const dayZoned = addDays(weekStartZoned, dayIndex);
			const middayZoned = new Date(dayZoned);
			middayZoned.setHours(12, 0, 0, 0);
			const middayUtc = fromZonedTime(middayZoned, timeZone);
			items.push({
				source: "git",
				timestamp: middayUtc,
				title: `weekly-${weeklyKey}-${dayIndex}`,
			});
		}

		const weeklySummary: WorkSummary = {
			dateRange: weeklyRange,
			items,
			sources: ["git"],
			generatedAt: new Date("2025-12-29T00:05:00Z"),
		};

		await writeSnapshot("weekly", weeklySummary, TEST_ROOT, timeZone);
		await loadSnapshot("weekly", weeklyKey, TEST_ROOT);

		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const dayZoned = addDays(weekStartZoned, dayIndex);
			const dayUtc = fromZonedTime(dayZoned, timeZone);
			const dailyKey = getSnapshotKey("daily", dayUtc, timeZone);

			const regen = await regenerateDailyFromWeekly(dailyKey, {
				rootDir: TEST_ROOT,
				timeZone,
				overwrite: true,
				backup: false,
			});

			expect(regen.success).toBe(true);
			if (!regen.success) {
				throw new Error(`Expected regeneration to succeed for ${dailyKey}`);
			}
		}

		const aggregatedWeekly = await aggregateDailySnapshots(
			weeklyRange.start,
			weeklyRange.end,
			TEST_ROOT,
			timeZone,
		);

		const originalItems = new Set(
			weeklySummary.items.map((item) =>
				JSON.stringify({
					timestamp: item.timestamp.toISOString(),
					source: item.source,
					title: item.title,
					description: item.description,
				}),
			),
		);

		const aggregatedItems = new Set(
			aggregatedWeekly.items.map((item) =>
				JSON.stringify({
					timestamp: item.timestamp.toISOString(),
					source: item.source,
					title: item.title,
					description: item.description,
				}),
			),
		);

		expect([...originalItems].filter((item) => !aggregatedItems.has(item))).toHaveLength(0);
		expect([...aggregatedItems].filter((item) => !originalItems.has(item))).toHaveLength(0);
	} finally {
		await rm(TEST_ROOT, { recursive: true, force: true });
	}
});
