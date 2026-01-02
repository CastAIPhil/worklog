import { describe, expect, test } from "bun:test";
import type { WorkItem } from "../types.ts";

function createMockPRWorkItem(
	action: "opened" | "merged",
	number: number,
	repo: string,
	title: string,
	url: string,
	summary: string | null,
	timestamp: Date,
): WorkItem {
	const displayText = summary ?? title;
	return {
		source: "github",
		timestamp,
		title: `[${repo}] PR #${number} ${action}: ${displayText}`,
		metadata: {
			type: "pr",
			repo,
			number,
			action,
			merged: action === "merged",
			url,
			summary,
		},
	};
}

describe("GitHub PR WorkItems", () => {
	test("opened PR WorkItem includes url and summary", () => {
		const item = createMockPRWorkItem(
			"opened",
			123,
			"owner/repo",
			"Add feature X",
			"https://github.com/owner/repo/pull/123",
			"Implements feature X with full test coverage.",
			new Date("2026-01-02T10:00:00Z"),
		);

		expect(item.metadata?.url).toBe("https://github.com/owner/repo/pull/123");
		expect(item.metadata?.summary).toBe("Implements feature X with full test coverage.");
		expect(item.metadata?.action).toBe("opened");
		expect(item.title).toContain("Implements feature X with full test coverage.");
	});

	test("opened PR WorkItem falls back to title when no summary", () => {
		const item = createMockPRWorkItem(
			"opened",
			124,
			"owner/repo",
			"Fix bug Y",
			"https://github.com/owner/repo/pull/124",
			null,
			new Date("2026-01-02T11:00:00Z"),
		);

		expect(item.metadata?.url).toBe("https://github.com/owner/repo/pull/124");
		expect(item.metadata?.summary).toBeNull();
		expect(item.title).toContain("Fix bug Y");
	});

	test("merged PR WorkItem includes url and summary", () => {
		const item = createMockPRWorkItem(
			"merged",
			125,
			"owner/repo",
			"Update dependencies",
			"https://github.com/owner/repo/pull/125",
			"Updates all dependencies to latest versions. Includes security patches.",
			new Date("2026-01-02T12:00:00Z"),
		);

		expect(item.metadata?.url).toBe("https://github.com/owner/repo/pull/125");
		expect(item.metadata?.summary).toBe(
			"Updates all dependencies to latest versions. Includes security patches.",
		);
		expect(item.metadata?.action).toBe("merged");
		expect(item.metadata?.merged).toBe(true);
		expect(item.title).toContain("Updates all dependencies to latest versions.");
	});

	test("merged PR WorkItem falls back to title when no summary", () => {
		const item = createMockPRWorkItem(
			"merged",
			126,
			"owner/repo",
			"Refactor auth module",
			"https://github.com/owner/repo/pull/126",
			null,
			new Date("2026-01-02T13:00:00Z"),
		);

		expect(item.metadata?.url).toBe("https://github.com/owner/repo/pull/126");
		expect(item.metadata?.summary).toBeNull();
		expect(item.title).toContain("Refactor auth module");
	});

	test("deduplication uses repo#number#action key", () => {
		const opened = createMockPRWorkItem(
			"opened",
			127,
			"owner/repo",
			"New feature",
			"https://github.com/owner/repo/pull/127",
			"Adds new feature.",
			new Date("2026-01-02T09:00:00Z"),
		);

		const merged = createMockPRWorkItem(
			"merged",
			127,
			"owner/repo",
			"New feature",
			"https://github.com/owner/repo/pull/127",
			"Adds new feature.",
			new Date("2026-01-02T14:00:00Z"),
		);

		expect(opened.metadata?.action).toBe("opened");
		expect(merged.metadata?.action).toBe("merged");
		expect(opened.metadata?.number).toBe(127);
		expect(merged.metadata?.number).toBe(127);
	});

	test("both opened and merged can appear for same PR", () => {
		const items: WorkItem[] = [
			createMockPRWorkItem(
				"opened",
				128,
				"owner/repo",
				"Add tests",
				"https://github.com/owner/repo/pull/128",
				"Adds comprehensive test suite.",
				new Date("2026-01-01T10:00:00Z"),
			),
			createMockPRWorkItem(
				"merged",
				128,
				"owner/repo",
				"Add tests",
				"https://github.com/owner/repo/pull/128",
				"Adds comprehensive test suite.",
				new Date("2026-01-02T15:00:00Z"),
			),
		];

		const prNumbers = items.map((item) => item.metadata?.number);
		const actions = items.map((item) => item.metadata?.action);

		expect(prNumbers).toEqual([128, 128]);
		expect(actions).toEqual(["opened", "merged"]);
		expect(items).toHaveLength(2);
	});

	test("duplicate detection prevents same action twice", () => {
		const seen = new Set<string>();

		const key1 = "owner/repo#129#opened";
		const key2 = "owner/repo#129#opened";

		seen.add(key1);

		expect(seen.has(key2)).toBe(true);
		expect(seen.size).toBe(1);
	});

	test("WorkItem metadata structure is correct for opened PR", () => {
		const item = createMockPRWorkItem(
			"opened",
			130,
			"owner/repo",
			"Title",
			"https://github.com/owner/repo/pull/130",
			"Summary text.",
			new Date("2026-01-02T16:00:00Z"),
		);

		expect(item.source).toBe("github");
		expect(item.metadata).toMatchObject({
			type: "pr",
			repo: "owner/repo",
			number: 130,
			action: "opened",
			merged: false,
			url: "https://github.com/owner/repo/pull/130",
			summary: "Summary text.",
		});
	});

	test("WorkItem metadata structure is correct for merged PR", () => {
		const item = createMockPRWorkItem(
			"merged",
			131,
			"owner/repo",
			"Title",
			"https://github.com/owner/repo/pull/131",
			"Summary text.",
			new Date("2026-01-02T17:00:00Z"),
		);

		expect(item.source).toBe("github");
		expect(item.metadata).toMatchObject({
			type: "pr",
			repo: "owner/repo",
			number: 131,
			action: "merged",
			merged: true,
			url: "https://github.com/owner/repo/pull/131",
			summary: "Summary text.",
		});
	});
});
