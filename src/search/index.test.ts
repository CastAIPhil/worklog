import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { HistoryEntry, HistoryWorkItem } from "../storage/history.ts";
import { formatSearchResults, type SearchResult, search } from "./index.ts";

const mockLoadHistory = mock(() => Promise.resolve([] as HistoryEntry[]));

mock.module("../storage/history.ts", () => ({
	loadHistory: mockLoadHistory,
}));

function createMockEntry(items: Partial<HistoryWorkItem>[]): HistoryEntry {
	return {
		id: "test-entry",
		timestamp: new Date("2025-01-15T10:00:00Z"),
		dateRange: {
			start: new Date("2025-01-15T00:00:00Z"),
			end: new Date("2025-01-15T23:59:59Z"),
		},
		projects: [
			{
				name: "test-project",
				path: "/path/to/project",
				items: items.map((item) => ({
					source: item.source ?? "git",
					timestamp: item.timestamp ?? new Date("2025-01-15T12:00:00Z"),
					title: item.title ?? "Test item",
					description: item.description,
					project: item.project ?? "test-project",
				})),
			},
		],
		sources: ["git"],
	};
}

describe("search", () => {
	beforeEach(() => {
		mockLoadHistory.mockClear();
	});

	test("finds exact matches in title", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([{ title: "Fix authentication bug" }, { title: "Add new feature" }]),
		]);

		const results = await search({ query: "authentication" });

		expect(results).toHaveLength(1);
		expect(results[0]?.item.title).toBe("Fix authentication bug");
		expect(results[0]?.matchType).toBe("exact");
	});

	test("finds case-insensitive matches", async () => {
		mockLoadHistory.mockResolvedValueOnce([createMockEntry([{ title: "Fix OAuth Integration" }])]);

		const results = await search({ query: "oauth" });

		expect(results).toHaveLength(1);
		expect(results[0]?.item.title).toBe("Fix OAuth Integration");
	});

	test("finds matches in description", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([{ title: "Update config", description: "Changed authentication settings" }]),
		]);

		const results = await search({ query: "authentication" });

		expect(results).toHaveLength(1);
		expect(results[0]?.item.title).toBe("Update config");
	});

	test("filters out request interrupted by user noise items", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([
				{ title: "Request interrupted by user for tool use" },
				{ title: "Fix authentication bug" },
			]),
		]);

		const results = await search({ query: "authentication" });

		expect(results).toHaveLength(1);
		expect(results[0]?.item.title).toBe("Fix authentication bug");
	});

	test("never returns request interrupted by user noise even when query matches", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([{ title: "[REQUEST INTERRUPTED BY USER]" }]),
		]);

		const results = await search({ query: "request interrupted by user" });

		expect(results).toHaveLength(0);
	});

	test("regex matching works", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([
				{ title: "fix: resolve memory leak" },
				{ title: "feat: add caching" },
				{ title: "fix: handle timeout" },
			]),
		]);

		const results = await search({ query: "^fix:", regex: true });

		expect(results).toHaveLength(2);
		expect(results.every((r) => r.item.title.startsWith("fix:"))).toBe(true);
		expect(results[0]?.matchType).toBe("regex");
	});

	test("fuzzy matching finds similar words", async () => {
		mockLoadHistory.mockResolvedValueOnce([createMockEntry([{ title: "authentication handler" }])]);

		const results = await search({ query: "authenticaton", fuzzy: true });

		expect(results).toHaveLength(1);
		expect(results[0]?.matchType).toBe("fuzzy");
	});

	test("filters by source", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([
				{ title: "Git commit", source: "git" },
				{ title: "Claude session", source: "claude" },
			]),
		]);

		const results = await search({ query: "session", sources: ["claude"] });

		expect(results).toHaveLength(1);
		expect(results[0]?.item.source).toBe("claude");
	});

	test("filters by project", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([
				{ title: "Fix bug", project: "frontend" },
				{ title: "Add API", project: "backend" },
			]),
		]);

		const results = await search({ query: "Fix", projects: ["frontend"] });

		expect(results).toHaveLength(1);
		expect(results[0]?.item.project).toBe("frontend");
	});

	test("filters by date range", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([
				{ title: "Old commit", timestamp: new Date("2025-01-01T12:00:00Z") },
				{ title: "New commit", timestamp: new Date("2025-01-20T12:00:00Z") },
			]),
		]);

		const results = await search({
			query: "commit",
			startDate: new Date("2025-01-15"),
		});

		expect(results).toHaveLength(1);
		expect(results[0]?.item.title).toBe("New commit");
	});

	test("respects limit option", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([{ title: "Fix bug 1" }, { title: "Fix bug 2" }, { title: "Fix bug 3" }]),
		]);

		const results = await search({ query: "Fix", limit: 2 });

		expect(results).toHaveLength(2);
	});

	test("sorts results by score and recency", async () => {
		mockLoadHistory.mockResolvedValueOnce([
			createMockEntry([
				{ title: "authentication", timestamp: new Date("2025-01-10T12:00:00Z") },
				{ title: "authentication fix", timestamp: new Date("2025-01-15T12:00:00Z") },
			]),
		]);

		const results = await search({ query: "authentication" });

		expect(results).toHaveLength(2);
		expect(results[0]?.score).toBeGreaterThanOrEqual(results[1]?.score ?? 0);
	});
});

describe("formatSearchResults", () => {
	const mockResults: SearchResult[] = [
		{
			item: {
				source: "git",
				timestamp: new Date("2025-01-15T12:00:00Z"),
				title: "Fix authentication bug",
				description: "Resolved issue with OAuth flow",
				project: "backend",
			},
			entry: createMockEntry([]),
			score: 0.9,
			matchType: "exact",
		},
	];

	test("formats as timeline", () => {
		const output = formatSearchResults(mockResults, "timeline");

		expect(output).toContain("Found 1 result");
		expect(output).toContain("Fix authentication bug");
		expect(output).toContain("backend");
		expect(output).toContain("git");
	});

	test("formats as grouped", () => {
		const output = formatSearchResults(mockResults, "grouped");

		expect(output).toContain("## backend");
		expect(output).toContain("Fix authentication bug");
	});

	test("formats as JSON", () => {
		const output = formatSearchResults(mockResults, "json");
		const parsed = JSON.parse(output);

		expect(parsed).toHaveLength(1);
		expect(parsed[0].title).toBe("Fix authentication bug");
		expect(parsed[0].source).toBe("git");
		expect(parsed[0].score).toBe(0.9);
	});

	test("handles empty results", () => {
		const output = formatSearchResults([], "timeline");

		expect(output).toBe("No results found.");
	});
});
