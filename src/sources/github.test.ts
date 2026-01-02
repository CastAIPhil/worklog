import { describe, expect, test } from "bun:test";
import { buildGitHubPrWorkItem, dedupeGitHubPrWorkItems } from "./githubPrs.ts";

describe("GitHub PR WorkItem helpers", () => {
	describe("buildGitHubPrWorkItem", () => {
		test("builds opened PR item with extracted summary", () => {
			const pr = {
				number: 12,
				title: "Add rate limiting",
				url: "https://github.com/acme/api/pull/12",
				body: "## Summary\n\nAdds rate limiting middleware. It caps requests to 100/minute.",
				createdAt: "2026-01-02T10:00:00Z",
				closedAt: null,
				repository: { nameWithOwner: "acme/api" },
			};

			const item = buildGitHubPrWorkItem(pr, "opened");
			expect(item).not.toBeNull();
			if (!item) return;

			expect(item.title).toContain("opened");
			expect(item.metadata).toMatchObject({
				type: "pr",
				action: "opened",
				repo: "acme/api",
				number: 12,
				url: "https://github.com/acme/api/pull/12",
				title: "Add rate limiting",
				summary: "Adds rate limiting middleware. It caps requests to 100/minute.",
			});
		});

		test("falls back to title when extracted summary is null", () => {
			const pr = {
				number: 99,
				title: "Update docs",
				url: "https://github.com/acme/api/pull/99",
				body: "## Summary\n\nTBD",
				createdAt: "2026-01-02T10:00:00Z",
				repository: { nameWithOwner: "acme/api" },
			};

			const item = buildGitHubPrWorkItem(pr, "opened");
			expect(item).not.toBeNull();
			if (!item) return;

			expect(item.metadata).toMatchObject({
				summary: "Update docs",
			});
		});

		test("builds merged PR item using closedAt timestamp", () => {
			const pr = {
				number: 7,
				title: "Fix crash",
				url: "https://github.com/acme/api/pull/7",
				body: "Fixes a crash when config is empty.",
				createdAt: "2026-01-01T10:00:00Z",
				closedAt: "2026-01-02T10:00:00Z",
				repository: { nameWithOwner: "acme/api" },
			};

			const item = buildGitHubPrWorkItem(pr, "merged");
			expect(item).not.toBeNull();
			if (!item) return;

			expect(item.title).toContain("merged");
			expect(item.metadata).toMatchObject({
				action: "merged",
				repo: "acme/api",
				number: 7,
				url: "https://github.com/acme/api/pull/7",
				title: "Fix crash",
			});
		});

		test("returns null when required timestamps are missing", () => {
			const base = {
				number: 1,
				title: "Anything",
				url: "https://github.com/acme/api/pull/1",
				repository: { nameWithOwner: "acme/api" },
			};

			expect(buildGitHubPrWorkItem({ ...base, createdAt: null }, "opened")).toBeNull();
			expect(buildGitHubPrWorkItem({ ...base, closedAt: null }, "merged")).toBeNull();
		});
	});

	describe("dedupeGitHubPrWorkItems", () => {
		test("dedupes exact duplicates by repo+number+action", () => {
			const pr = {
				number: 12,
				title: "Add rate limiting",
				url: "https://github.com/acme/api/pull/12",
				body: "Adds rate limiting middleware.",
				createdAt: "2026-01-02T10:00:00Z",
				closedAt: "2026-01-02T11:00:00Z",
				repository: { nameWithOwner: "acme/api" },
			};

			const opened1 = buildGitHubPrWorkItem(pr, "opened");
			const opened2 = buildGitHubPrWorkItem(pr, "opened");
			const merged = buildGitHubPrWorkItem(pr, "merged");

			expect(opened1).not.toBeNull();
			expect(opened2).not.toBeNull();
			expect(merged).not.toBeNull();
			if (!opened1 || !opened2 || !merged) return;

			const deduped = dedupeGitHubPrWorkItems([opened1, opened2, merged]);
			expect(deduped).toHaveLength(2);

			const actions = deduped.map((i) => (i.metadata as Record<string, unknown>).action).sort();
			expect(actions).toEqual(["merged", "opened"]);
		});
	});
});
