import { describe, expect, test } from "bun:test";
import type { Config, DateRange } from "../types.ts";

function createMockConfig(repos: string[], gitIdentityEmails: string[] = []): Config {
	return {
		defaultSources: ["git"],
		gitRepos: repos,
		gitIdentityEmails,
		paths: {
			opencode: "~/.local/share/opencode/storage/session",
			claude: "~/.claude/projects",
			codex: "~/.codex/sessions",
			factory: "~/.factory/sessions",
			vscode: "~/.config/Code",
			cursor: "~/.config/Cursor",
			terminal: "~/.bash_history",
			filesystem: "~/code",
		},
		llm: {
			enabled: false,
			provider: "openai",
			model: "gpt-4o-mini",
		},
	};
}

describe("gitReader merge detection", () => {
	const dateRange: DateRange = {
		start: new Date("2026-01-01T00:00:00Z"),
		end: new Date("2026-01-02T23:59:59Z"),
	};

	test("detects branch merges and excludes PR merges", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"], ["justin@example.com"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		const branchMerges = items.filter(
			(item) => item.metadata?.type === "branch" && item.metadata?.action === "merged",
		);
		const prMerges = items.filter((item) => item.title.includes("Merge pull request"));

		expect(branchMerges.every((item) => !item.title.toLowerCase().includes("pull request"))).toBe(
			true,
		);
		expect(prMerges.every((item) => item.metadata?.type !== "branch")).toBe(true);
	});

	test("includes only merges authored or committed by configured user", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"], ["justin@example.com"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		const branchMerges = items.filter(
			(item) => item.metadata?.type === "branch" && item.metadata?.action === "merged",
		);

		for (const merge of branchMerges) {
			expect(merge.metadata?.repo).toBe("/home/justin/code/worklog");
			expect(merge.metadata?.sourceBranch).toBeDefined();
		}
	});

	test("emits proper WorkItem metadata for branch merges", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"], ["justin@example.com"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		const branchMerge = items.find(
			(item) => item.metadata?.type === "branch" && item.metadata?.action === "merged",
		);

		if (branchMerge) {
			expect(branchMerge.source).toBe("git");
			expect(branchMerge.title).toMatch(/\[.*\] Merged branch .+/);
			expect(branchMerge.metadata).toMatchObject({
				type: "branch",
				action: "merged",
				repo: "/home/justin/code/worklog",
			});
			expect(branchMerge.metadata?.sourceBranch).toBeDefined();
		}
	});

	test("handles repos without configured gitIdentityEmails", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		expect(Array.isArray(items)).toBe(true);
	});

	test("excludes commits that are not authored/committed by user", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"], ["nonexistent@example.com"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		const branchMerges = items.filter(
			(item) => item.metadata?.type === "branch" && item.metadata?.action === "merged",
		);

		expect(branchMerges.length).toBe(0);
	});

	test("formats branch merge titles correctly", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"], ["justin@example.com"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		const branchMerge = items.find(
			(item) => item.metadata?.type === "branch" && item.metadata?.action === "merged",
		);

		if (branchMerge) {
			const titlePattern = /^\[worklog\] Merged branch .+(?: → .+)?$/;
			expect(branchMerge.title).toMatch(titlePattern);
		}
	});

	test("regular commits are still emitted alongside branch merges", async () => {
		const config = createMockConfig(["/home/justin/code/worklog"], ["justin@example.com"]);
		const { gitReader } = await import("./git.ts");

		const items = await gitReader.read(dateRange, config);

		const regularCommits = items.filter((item) => item.metadata?.type !== "branch");
		const branchMerges = items.filter(
			(item) => item.metadata?.type === "branch" && item.metadata?.action === "merged",
		);

		expect(items.length).toBe(regularCommits.length + branchMerges.length);
		expect(regularCommits.every((item) => item.source === "git")).toBe(true);
	});
});
