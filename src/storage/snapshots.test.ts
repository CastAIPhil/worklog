import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WorkSummary } from "../types.ts";

const TEST_ROOT = join(tmpdir(), `worklog-snapshots-test-${Date.now()}`);

describe("snapshot storage", () => {
	beforeEach(async () => {
		await mkdir(TEST_ROOT, { recursive: true });
	});

	afterEach(async () => {
		try {
			await rm(TEST_ROOT, { recursive: true });
		} catch {}
	});

	test("writeSnapshot and loadSnapshot roundtrip (daily)", async () => {
		const { loadSnapshot, writeSnapshot } = await import("./snapshots.ts");

		const summary: WorkSummary = {
			dateRange: {
				start: new Date("2025-01-15T00:00:00Z"),
				end: new Date("2025-01-15T23:59:59Z"),
			},
			items: [
				{
					source: "git",
					timestamp: new Date("2025-01-15T12:34:56Z"),
					title: "Commit A",
				},
			],
			sources: ["git"],
			generatedAt: new Date("2025-01-16T00:00:00Z"),
		};

		const { key } = await writeSnapshot("daily", summary, TEST_ROOT, "UTC");
		expect(key).toBe("2025-01-15");

		const loaded = await loadSnapshot("daily", key, TEST_ROOT);
		expect(loaded.items).toHaveLength(1);
		expect(loaded.items[0]?.title).toBe("Commit A");
	});

	test("listSnapshotKeys returns keys sorted newest-first", async () => {
		const { listSnapshotKeys, writeSnapshot } = await import("./snapshots.ts");

		const mkSummary = (day: string): WorkSummary => ({
			dateRange: {
				start: new Date(`${day}T00:00:00Z`),
				end: new Date(`${day}T23:59:59Z`),
			},
			items: [],
			sources: [],
			generatedAt: new Date(`${day}T23:59:59Z`),
		});

		await writeSnapshot("daily", mkSummary("2025-01-01"), TEST_ROOT, "UTC");
		await writeSnapshot("daily", mkSummary("2025-01-03"), TEST_ROOT, "UTC");
		await writeSnapshot("daily", mkSummary("2025-01-02"), TEST_ROOT, "UTC");

		const keys = await listSnapshotKeys("daily", TEST_ROOT);
		expect(keys).toEqual(["2025-01-03", "2025-01-02", "2025-01-01"]);
	});

	test("aggregateDailySnapshots merges items across date range and skips missing days", async () => {
		const { aggregateDailySnapshots, writeSnapshot } = await import("./snapshots.ts");

		const summaryA: WorkSummary = {
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-01T23:59:59Z"),
			},
			items: [
				{
					source: "git",
					timestamp: new Date("2025-01-01T10:00:00Z"),
					title: "A",
				},
			],
			sources: ["git"],
			generatedAt: new Date("2025-01-02T00:00:00Z"),
		};

		const summaryC: WorkSummary = {
			dateRange: {
				start: new Date("2025-01-03T00:00:00Z"),
				end: new Date("2025-01-03T23:59:59Z"),
			},
			items: [
				{
					source: "github",
					timestamp: new Date("2025-01-03T09:00:00Z"),
					title: "C",
				},
			],
			sources: ["github"],
			generatedAt: new Date("2025-01-04T00:00:00Z"),
		};

		await writeSnapshot("daily", summaryA, TEST_ROOT, "UTC");
		await writeSnapshot("daily", summaryC, TEST_ROOT, "UTC");

		const merged = await aggregateDailySnapshots(
			new Date("2025-01-01T12:00:00Z"),
			new Date("2025-01-03T12:00:00Z"),
			TEST_ROOT,
			"UTC",
		);

		expect(merged.items.map((i) => i.title)).toEqual(["A", "C"]);
		expect(new Set(merged.sources)).toEqual(new Set(["git", "github"]));
	});

	test("regenerateDailyFromWeekly overwrites daily snapshot and writes backup", async () => {
		const { getSnapshotPath, loadSnapshot, regenerateDailyFromWeekly, writeSnapshot } =
			await import("./snapshots.ts");

		const timeZone = "UTC";

		const weeklySummary: WorkSummary = {
			dateRange: {
				start: new Date("2025-01-06T00:00:00Z"),
				end: new Date("2025-01-12T23:59:59.999Z"),
			},
			items: [
				{ source: "git", timestamp: new Date("2025-01-08T10:00:00Z"), title: "W1" },
				{ source: "github", timestamp: new Date("2025-01-08T20:00:00Z"), title: "W2" },
				{ source: "git", timestamp: new Date("2025-01-09T10:00:00Z"), title: "Other" },
			],
			sources: ["git", "github"],
			generatedAt: new Date("2025-01-13T00:05:00Z"),
		};

		await writeSnapshot("weekly", weeklySummary, TEST_ROOT, timeZone);

		const dailyKey = "2025-01-08";
		const dailySummary: WorkSummary = {
			dateRange: {
				start: new Date("2025-01-08T00:00:00Z"),
				end: new Date("2025-01-08T23:59:59.999Z"),
			},
			items: [{ source: "git", timestamp: new Date("2025-01-08T10:00:00Z"), title: "W1" }],
			sources: ["git"],
			generatedAt: new Date("2025-01-08T17:00:00Z"),
		};

		await writeSnapshot("daily", dailySummary, TEST_ROOT, timeZone);

		const result = await regenerateDailyFromWeekly(dailyKey, {
			rootDir: TEST_ROOT,
			timeZone,
			overwrite: true,
			backup: true,
			now: new Date("2025-01-20T00:00:00Z"),
		});

		expect(result.success).toBe(true);
		if (!result.success) {
			throw new Error("Expected regenerateDailyFromWeekly to succeed");
		}
		expect(result.path).toBe(getSnapshotPath("daily", dailyKey, TEST_ROOT));
		expect(result.backedUp).toBe(true);
		expect(result.backupPath).toBeDefined();
		if (!result.backupPath) {
			throw new Error("Expected backupPath");
		}

		expect(await Bun.file(result.backupPath).exists()).toBe(true);

		const updated = await loadSnapshot("daily", dailyKey, TEST_ROOT);
		expect(updated.items.map((item) => item.title)).toEqual(["W1", "W2"]);
	});

	test("verifyWeeklySnapshots reports missing or mismatched dailies", async () => {
		const { verifyWeeklySnapshots, writeSnapshot } = await import("./snapshots.ts");

		const timeZone = "UTC";

		const weeklySummary: WorkSummary = {
			dateRange: {
				start: new Date("2025-01-06T00:00:00Z"),
				end: new Date("2025-01-12T23:59:59.999Z"),
			},
			items: [
				{ source: "git", timestamp: new Date("2025-01-08T10:00:00Z"), title: "W1" },
				{ source: "github", timestamp: new Date("2025-01-08T20:00:00Z"), title: "W2" },
				{ source: "git", timestamp: new Date("2025-01-09T10:00:00Z"), title: "Other" },
			],
			sources: ["git", "github"],
			generatedAt: new Date("2025-01-13T00:05:00Z"),
		};

		await writeSnapshot("weekly", weeklySummary, TEST_ROOT, timeZone);

		const result = await verifyWeeklySnapshots({ rootDir: TEST_ROOT, timeZone });
		expect(result.ok).toBe(false);

		const week = result.weekly.find((w) => w.weeklyKey === "2025-01-06");
		expect(week).toBeDefined();
		if (!week) {
			throw new Error("Expected weekly result");
		}

		const missing = week.issues.find(
			(i) => i.type === "missing-daily" && i.dailyKey === "2025-01-09",
		);
		expect(missing).toBeDefined();
	});
});
