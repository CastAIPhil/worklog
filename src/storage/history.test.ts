import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProjectWorkSummary } from "../types.ts";

const TEST_DIR = join(tmpdir(), `worklog-history-test-${Date.now()}`);

describe("history storage", () => {
	beforeEach(async () => {
		await mkdir(TEST_DIR, { recursive: true });
	});

	afterEach(async () => {
		try {
			await rm(TEST_DIR, { recursive: true });
		} catch {}
	});

	test("saveToHistory creates file and appends entry", async () => {
		const { saveToHistory } = await import("./history.ts");

		const mockSummary: ProjectWorkSummary = {
			dateRange: {
				start: new Date("2025-01-15T00:00:00Z"),
				end: new Date("2025-01-15T23:59:59Z"),
			},
			projects: [
				{
					projectName: "test-project",
					projectPath: "/path/to/project",
					dailyActivity: [
						{
							date: new Date("2025-01-15T00:00:00Z"),
							commits: [
								{
									source: "git",
									timestamp: new Date("2025-01-15T10:00:00Z"),
									title: "Initial commit",
								},
							],
							sessions: [
								{
									source: "claude",
									timestamp: new Date("2025-01-15T11:00:00Z"),
									title: "Claude session: Fix authentication",
								},
							],
							githubActivity: [],
							otherActivity: [],
						},
					],
				},
			],
			generatedAt: new Date(),
		};

		const entry = await saveToHistory(mockSummary);

		expect(entry.id).toBeDefined();
		expect(entry.projects).toHaveLength(1);
		expect(entry.projects[0]?.name).toBe("test-project");
		expect(entry.projects[0]?.items).toHaveLength(2);
	});

	test("loadHistory returns empty array when file does not exist", async () => {
		const { loadHistory } = await import("./history.ts");

		const entries = await loadHistory();

		expect(entries).toBeInstanceOf(Array);
	});

	test("getAllHistoryItems flattens all items", async () => {
		const { saveToHistory, getAllHistoryItems } = await import("./history.ts");

		const mockSummary: ProjectWorkSummary = {
			dateRange: {
				start: new Date("2025-01-15T00:00:00Z"),
				end: new Date("2025-01-15T23:59:59Z"),
			},
			projects: [
				{
					projectName: "project-a",
					projectPath: "/a",
					dailyActivity: [
						{
							date: new Date("2025-01-15T00:00:00Z"),
							commits: [
								{
									source: "git",
									timestamp: new Date("2025-01-15T10:00:00Z"),
									title: "Commit A",
								},
							],
							sessions: [],
							githubActivity: [],
							otherActivity: [],
						},
					],
				},
				{
					projectName: "project-b",
					projectPath: "/b",
					dailyActivity: [
						{
							date: new Date("2025-01-15T00:00:00Z"),
							commits: [
								{
									source: "git",
									timestamp: new Date("2025-01-15T11:00:00Z"),
									title: "Commit B",
								},
							],
							sessions: [],
							githubActivity: [],
							otherActivity: [],
						},
					],
				},
			],
			generatedAt: new Date(),
		};

		await saveToHistory(mockSummary);
		const items = await getAllHistoryItems();

		expect(items.length).toBeGreaterThanOrEqual(2);
	});

	test("getHistoryPath returns correct path", async () => {
		const { getHistoryPath } = await import("./history.ts");

		const path = getHistoryPath();

		expect(path).toContain("history.jsonl");
		expect(path).toContain(".local");
		expect(path).toContain("worklog");
	});
});
