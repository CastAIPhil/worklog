import { describe, expect, test } from "bun:test";
import type { WorkSummary } from "../types.ts";
import { generateDashboardHTML } from "./dashboard.ts";

describe("generateDashboardHTML", () => {
	test("handles empty summary without NaN", () => {
		const emptySummary: WorkSummary = {
			items: [],
			sources: [],
			dateRange: {
				start: new Date("2026-01-02T00:00:00Z"),
				end: new Date("2026-01-02T23:59:59Z"),
			},
			generatedAt: new Date("2026-01-02T12:00:00Z"),
		};

		const html = generateDashboardHTML(emptySummary);

		expect(html).not.toContain("NaN");
		expect(html).not.toContain("Infinity");
		expect(html).toContain('id="totalActivities">0</div>');
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("</html>");
	});

	test("handles non-empty summary correctly", () => {
		const summary: WorkSummary = {
			items: [
				{
					source: "git",
					timestamp: new Date("2026-01-02T10:30:00Z"),
					title: "feat: add new feature",
					metadata: {},
				},
				{
					source: "git",
					timestamp: new Date("2026-01-02T14:15:00Z"),
					title: "fix: resolve bug",
					metadata: {},
				},
				{
					source: "github",
					timestamp: new Date("2026-01-02T16:45:00Z"),
					title: "PR #42: Update docs",
					metadata: {},
				},
			],
			sources: ["git", "github"],
			dateRange: {
				start: new Date("2026-01-02T00:00:00Z"),
				end: new Date("2026-01-02T23:59:59Z"),
			},
			generatedAt: new Date("2026-01-02T17:00:00Z"),
		};

		const html = generateDashboardHTML(summary);

		expect(html).not.toContain("NaN");
		expect(html).not.toContain("Infinity");
		expect(html).toContain('id="totalActivities">3</div>');
		expect(html).toContain('id="activeHours">3</div>');
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("</html>");
	});

	test("escapes untrusted item titles in HTML and script JSON", () => {
		const title = "</script><script>window.__worklog_xss__=1</script>";
		const summary: WorkSummary = {
			items: [
				{
					source: "git",
					timestamp: new Date("2026-01-02T10:30:00Z"),
					title,
					metadata: {},
				},
			],
			sources: ["git"],
			dateRange: {
				start: new Date("2026-01-02T00:00:00Z"),
				end: new Date("2026-01-02T23:59:59Z"),
			},
			generatedAt: new Date("2026-01-02T17:00:00Z"),
		};

		const html = generateDashboardHTML(summary);

		expect(html).toContain("&lt;/script&gt;&lt;script&gt;window.__worklog_xss__=1&lt;/script&gt;");
		expect(html).not.toContain(title);
		expect(html).toContain(
			"\\u003c/script\\u003e\\u003cscript\\u003ewindow.__worklog_xss__=1\\u003c/script\\u003e",
		);
	});
});
