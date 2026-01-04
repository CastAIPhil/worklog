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
});
