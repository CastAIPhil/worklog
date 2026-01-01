import { describe, expect, test } from "bun:test";
import type { SourceType, WorkItem } from "../types.ts";
import { summarizeSourceItems } from "./summary.ts";

function createMockItem(
	source: SourceType,
	title: string,
	description?: string,
	metadata?: Record<string, unknown>,
): WorkItem {
	return {
		source,
		timestamp: new Date(),
		title,
		description,
		metadata: metadata || {},
	};
}

describe("summarizeSourceItems", () => {
	describe("git", () => {
		test("single commit", () => {
			const items = [
				createMockItem("git", "[repo1] feat: add login", undefined, { repo: "repo1" }),
			];
			expect(summarizeSourceItems("git", items)).toBe("1 commit (feat 1)");
		});

		test("multiple commit types", () => {
			const items = [
				createMockItem("git", "[repo1] feat: add login"),
				createMockItem("git", "[repo1] fix: typo in README"),
				createMockItem("git", "[repo1] docs: update changelog"),
				createMockItem("git", "[repo1] refactor: cleanup code"),
			];
			const summary = summarizeSourceItems("git", items);
			expect(summary).toContain("4 commits");
			expect(summary).toContain("docs 1, feat 1, fix 1");
		});

		test("multiple repos", () => {
			const items = [
				createMockItem("git", "[repo1] feat: add login", undefined, { repo: "repo1" }),
				createMockItem("git", "[repo2] fix: bug", undefined, { repo: "repo2" }),
			];
			const summary = summarizeSourceItems("git", items);
			expect(summary).toContain("2 commits");
			expect(summary).toContain("across 2 repos");
		});

		test("non-conventional commits", () => {
			const items = [
				createMockItem("git", "[repo1] Add new feature"),
				createMockItem("git", "[repo1] Fix bug"),
			];
			expect(summarizeSourceItems("git", items)).toBe("2 commits");
		});
	});

	describe("github", () => {
		test("single push", () => {
			const items = [
				createMockItem("github", "[repo1] Push: add new file", "1 commit", {
					type: "push",
					repo: "repo1",
					commitCount: 1,
				}),
			];
			expect(summarizeSourceItems("github", items)).toBe("1 event (push 1)");
		});

		test("mixed event types", () => {
			const items = [
				createMockItem("github", "[repo1] Push: updates", "3 commits", {
					type: "push",
					repo: "repo1",
				}),
				createMockItem("github", "[repo1] Reviewed PR #123", undefined, {
					type: "review",
					repo: "repo1",
				}),
				createMockItem("github", "[repo1] PR #456 opened: new feature", undefined, {
					type: "pr",
					repo: "repo1",
				}),
			];
			const summary = summarizeSourceItems("github", items);
			expect(summary).toContain("3 events");
			expect(summary).toContain("pr 1, push 1, review 1");
		});

		test("multiple repos", () => {
			const items = [
				createMockItem("github", "[repo1] Push", undefined, { type: "push", repo: "repo1" }),
				createMockItem("github", "[repo2] Push", undefined, { type: "push", repo: "repo2" }),
			];
			const summary = summarizeSourceItems("github", items);
			expect(summary).toContain("2 events");
			expect(summary).toContain("across 2 repos");
		});
	});

	describe("vscode", () => {
		test("single workspace open", () => {
			const items = [
				createMockItem("vscode", 'VS Code: Opened workspace "project1"', undefined, {
					workspaceId: "ws123",
				}),
			];
			expect(summarizeSourceItems("vscode", items)).toBe("1 workspace (project1)");
		});

		test("multiple workspaces", () => {
			const items = [
				createMockItem("vscode", 'VS Code: Opened workspace "project1"'),
				createMockItem("vscode", 'VS Code: Opened workspace "project2"'),
			];
			expect(summarizeSourceItems("vscode", items)).toBe("2 workspaces (project1, project2)");
		});

		test("extension updates", () => {
			const items = [
				createMockItem("vscode", "VS Code: Installed/updated 3 extensions", undefined, {
					extensions: ["prettier", "typescript", "eslint"],
				}),
			];
			expect(summarizeSourceItems("vscode", items)).toBe("3 extensions updated (eslint, prettier)");
		});

		test("workspaces and extensions", () => {
			const items = [
				createMockItem("vscode", 'VS Code: Opened workspace "project1"'),
				createMockItem("vscode", "VS Code: Installed/updated 2 extensions", undefined, {
					extensions: ["gitlens", "copilot"],
				}),
			];
			const summary = summarizeSourceItems("vscode", items);
			expect(summary).toContain("1 workspace");
			expect(summary).toContain("2 extensions updated");
		});

		test("only opens count", () => {
			const items = [
				createMockItem("vscode", "VS Code: Opened workspace"),
				createMockItem("vscode", "VS Code: Opened workspace"),
			];
			expect(summarizeSourceItems("vscode", items)).toBe("2 opens");
		});
	});

	describe("cursor", () => {
		test("single workspace", () => {
			const items = [
				createMockItem("cursor", 'Cursor: Opened workspace "project1"', undefined, {
					workspaceId: "ws123",
				}),
			];
			expect(summarizeSourceItems("cursor", items)).toBe("1 workspace (project1)");
		});

		test("multiple workspaces", () => {
			const items = [
				createMockItem("cursor", 'Cursor: Opened workspace "project1"'),
				createMockItem("cursor", 'Cursor: Opened workspace "project2"'),
			];
			expect(summarizeSourceItems("cursor", items)).toBe("2 workspaces (project1, project2)");
		});

		test("only opens count", () => {
			const items = [
				createMockItem("cursor", "Cursor: Opened workspace"),
				createMockItem("cursor", "Cursor: Opened workspace"),
			];
			expect(summarizeSourceItems("cursor", items)).toBe("2 opens");
		});
	});

	describe("terminal", () => {
		test("single summary item", () => {
			const items = [
				createMockItem(
					"terminal",
					"Terminal: 142 commands across 5 tools",
					"Top: git(41), bun(18), docker(9)",
				),
			];
			expect(summarizeSourceItems("terminal", items)).toBe(
				"142 commands across 5 tools (git(41), bun(18), docker(9))",
			);
		});

		test("multiple items fallback", () => {
			const items = [
				createMockItem("terminal", "Terminal: 10 commands", "Top: ls(5)"),
				createMockItem("terminal", "Terminal: 15 commands", "Top: cd(8)"),
			];
			expect(summarizeSourceItems("terminal", items)).toBe("2 items");
		});

		test("no items", () => {
			expect(summarizeSourceItems("terminal", [])).toBe("0 items");
		});
	});

	describe("filesystem", () => {
		test("single summary item", () => {
			const items = [
				createMockItem(
					"filesystem",
					"File System: Modified 37 files across 3 directories",
					"Types: ts(22), md(6), js(4)",
				),
			];
			expect(summarizeSourceItems("filesystem", items)).toBe(
				"Modified 37 files across 3 directories (ts(22), md(6), js(4))",
			);
		});

		test("multiple items fallback", () => {
			const items = [
				createMockItem("filesystem", "File System: Modified 10 files", "Types: py(5)"),
				createMockItem("filesystem", "File System: Modified 20 files", "Types: js(10)"),
			];
			expect(summarizeSourceItems("filesystem", items)).toBe("2 items");
		});
	});

	describe("AI session sources", () => {
		test("opencode", () => {
			const items = [
				createMockItem("opencode", "OpenCode session: implement auth", "3 interactions", {
					messageCount: 3,
				}),
			];
			expect(summarizeSourceItems("opencode", items)).toBe("1 session, 3 interactions");
		});

		test("claude with projects", () => {
			const items = [
				createMockItem("claude", "Claude Code [api]: add endpoint", "5 interactions", {
					messageCount: 5,
					project: "api",
				}),
				createMockItem("claude", "Claude Code [web]: fix layout", "3 interactions", {
					messageCount: 3,
					project: "web",
				}),
			];
			const summary = summarizeSourceItems("claude", items);
			expect(summary).toContain("2 sessions");
			expect(summary).toContain("8 interactions");
			expect(summary).toContain("across 2 projects");
		});

		test("factory", () => {
			const items = [
				createMockItem("factory", "Factory [mobile]: update UI", "4 interactions", {
					messageCount: 4,
					project: "mobile",
				}),
			];
			expect(summarizeSourceItems("factory", items)).toBe(
				"1 session, 4 interactions across 1 project (mobile 1)",
			);
		});

		test("codex", () => {
			const items = [
				createMockItem("codex", "Codex: implement sorting", "7 prompts", {
					promptCount: 7,
				}),
			];
			expect(summarizeSourceItems("codex", items)).toBe("1 session, 7 prompts");
		});
	});

	describe("fallback", () => {
		test("unknown source", () => {
			const items = [createMockItem("opencode" as any, "test")];
			expect(summarizeSourceItems("unknown" as any, items)).toBe("1 item");
		});

		test("empty items", () => {
			expect(summarizeSourceItems("git", [])).toBe("0 commits");
		});

		test("no metadata", () => {
			const items = [createMockItem("git", "[repo] commit message")];
			expect(summarizeSourceItems("git", items)).toBe("1 commit");
		});
	});

	describe("truncation", () => {
		test("long summaries are truncated", () => {
			const items = [createMockItem("terminal", "Terminal: " + "x".repeat(200), "desc")];
			const summary = summarizeSourceItems("terminal", items);
			expect(summary.length).toBeLessThanOrEqual(160);
			expect(summary.endsWith("...")).toBe(true);
		});

		test("short summaries are not truncated", () => {
			const items = [createMockItem("git", "[repo] feat: short")];
			const summary = summarizeSourceItems("git", items);
			expect(summary).toBe("1 commit (feat 1)");
			expect(summary.length).toBeLessThan(160);
		});
	});
});
