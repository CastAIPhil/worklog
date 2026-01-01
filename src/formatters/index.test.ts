import { describe, expect, test } from "bun:test";
import { formatOutput } from "../formatters/index.ts";
import type { WorkSummary } from "../types.ts";

describe("formatOutput integration", () => {
	const mockSummary: WorkSummary = {
		dateRange: {
			start: new Date("2025-01-01T00:00:00"),
			end: new Date("2025-01-01T23:59:59"),
		},
		items: [
			{
				source: "git",
				timestamp: new Date("2025-01-01T10:30:00"),
				title: "feat: add user authentication",
			},
		],
		sources: ["git"],
		generatedAt: new Date("2025-01-01T16:00:00"),
	};

	test("produces valid markdown output", () => {
		const result = formatOutput(mockSummary, "markdown", false);
		expect(result).toContain("# Daily Standup");
		expect(result).toContain("Git Commits");
		expect(result).toContain("1 item");
	});

	test("produces valid JSON output", () => {
		const result = formatOutput(mockSummary, "json", false);
		expect(() => JSON.parse(result)).not.toThrow();
		const parsed = JSON.parse(result);
		expect(parsed.items).toHaveLength(1);
		expect(parsed.sources).toContain("git");
	});

	test("concise mode vs verbose mode", () => {
		const concise = formatOutput(mockSummary, "markdown", false);
		const verbose = formatOutput(mockSummary, "markdown", true);

		expect(verbose.length).toBeGreaterThan(concise.length);
		expect(verbose).toContain("10:30");
	});
});
