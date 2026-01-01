import { describe, expect, test } from "bun:test";
import type { WorkSummary } from "../types.ts";
import { formatMarkdown } from "./markdown.ts";

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
			description: "Implemented JWT-based authentication system",
		},
		{
			source: "vscode",
			timestamp: new Date("2025-01-01T14:15:00"),
			title: 'VS Code: Opened workspace "my-project"',
			description: "Workspace ID: abc123",
		},
	],
	sources: ["git", "vscode"],
	generatedAt: new Date("2025-01-01T16:00:00"),
};

describe("formatMarkdown", () => {
	test("concise mode shows source counts", () => {
		const result = formatMarkdown(mockSummary, false);
		expect(result).toContain("📝 **Git Commits**: 1 item");
		expect(result).toContain("💙 **VS Code**: 1 item");
		expect(result).not.toContain("## 📝 Git Commits");
	});

	test("verbose mode shows detailed items", () => {
		const result = formatMarkdown(mockSummary, true);
		expect(result).toContain("- **10:30** feat: add user authentication");
		expect(result).toContain("Implemented JWT-based authentication system");
		expect(result).toContain('- **14:15** VS Code: Opened workspace "my-project"');
	});

	test("includes header and footer", () => {
		const result = formatMarkdown(mockSummary, false);
		expect(result).toContain("# Daily Standup");
		expect(result).toContain("*Generated at");
	});

	test("handles empty summary", () => {
		const emptySummary: WorkSummary = {
			...mockSummary,
			items: [],
		};
		const result = formatMarkdown(emptySummary, false);
		expect(result).toContain("No activity recorded");
	});
});
