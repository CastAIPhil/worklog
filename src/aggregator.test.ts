import { describe, expect, test } from "bun:test";
import {
	aggregateByProject,
	getCommitSubjects,
	getGitHubDescriptions,
	getSessionDescriptions,
} from "./aggregator.ts";
import type { Config, WorkItem } from "./types.ts";

function createConfig(gitRepos: string[]): Config {
	return {
		defaultSources: ["git", "claude", "github"],
		gitRepos,
		gitIdentityEmails: [],
		llm: {
			enabled: false,
			provider: "openai",
			model: "gpt-4o-mini",
		},
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
	};
}

function createWorkItem(overrides: Partial<WorkItem>): WorkItem {
	return {
		source: "git",
		timestamp: new Date("2025-01-01T10:00:00Z"),
		title: "Test item",
		...overrides,
	};
}

describe("aggregateByProject", () => {
	test("groups git commits by repo", () => {
		const config = createConfig(["~/code/worklog", "~/code/api"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				title: "[worklog] feat: add feature",
				metadata: { repo: "~/code/worklog" },
			}),
			createWorkItem({
				source: "git",
				title: "[api] fix: bug fix",
				metadata: { repo: "~/code/api" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(2);
		expect(result.projects[0]?.projectName).toBe("api");
		expect(result.projects[1]?.projectName).toBe("worklog");
	});

	test("matches claude sessions to projects", () => {
		const config = createConfig(["~/code/worklog"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				title: "[worklog] feat: add feature",
				metadata: { repo: "~/code/worklog" },
			}),
			createWorkItem({
				source: "claude",
				title: "Claude Code [worklog]: Implement feature",
				metadata: { project: "worklog" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]?.dailyActivity[0]?.commits).toHaveLength(1);
		expect(result.projects[0]?.dailyActivity[0]?.sessions).toHaveLength(1);
	});

	test("matches github activity by repo name", () => {
		const config = createConfig(["~/code/worklog"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "github",
				title: "[owner/worklog] PR #1: Feature",
				metadata: { repo: "owner/worklog", type: "pr" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]?.dailyActivity[0]?.githubActivity).toHaveLength(1);
	});

	test("groups by date for multi-day ranges", () => {
		const config = createConfig(["~/code/worklog"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				timestamp: new Date("2025-01-01T10:00:00Z"),
				title: "[worklog] feat: day 1",
				metadata: { repo: "~/code/worklog" },
			}),
			createWorkItem({
				source: "git",
				timestamp: new Date("2025-01-02T10:00:00Z"),
				title: "[worklog] feat: day 2",
				metadata: { repo: "~/code/worklog" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-02"),
		});

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]?.dailyActivity).toHaveLength(2);
	});

	test("routes unmatched items to Misc bucket", () => {
		const config = createConfig(["~/code/worklog"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				title: "[other-project] feat: unrelated",
				metadata: { repo: "~/code/other-project" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]?.projectName).toBe("Misc");
		expect(result.projects[0]?.projectPath).toBe("(unattributed)");
		expect(result.projects[0]?.dailyActivity[0]?.commits).toHaveLength(1);
	});

	test("routes all items to Misc when no git repos configured", () => {
		const config = createConfig([]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				title: "[worklog] feat: feature",
				metadata: { repo: "~/code/worklog" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]?.projectName).toBe("Misc");
		expect(result.projects[0]?.dailyActivity[0]?.commits).toHaveLength(1);
	});

	test("handles mixed matched and unmatched items", () => {
		const config = createConfig(["~/code/worklog"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				title: "[worklog] feat: matched",
				metadata: { repo: "~/code/worklog" },
			}),
			createWorkItem({
				source: "git",
				title: "[other] feat: unmatched",
				metadata: { repo: "~/code/other" },
			}),
			createWorkItem({
				source: "claude",
				title: "Session without metadata",
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(2);
		expect(result.projects[0]?.projectName).toBe("worklog");
		expect(result.projects[1]?.projectName).toBe("Misc");
		expect(result.projects[0]?.dailyActivity[0]?.commits).toHaveLength(1);
		expect(result.projects[1]?.dailyActivity[0]?.commits).toHaveLength(1);
		expect(result.projects[1]?.dailyActivity[0]?.sessions).toHaveLength(1);
	});

	test("Misc project appears last in sorted order", () => {
		const config = createConfig(["~/code/zebra", "~/code/alpha"]);
		const items: WorkItem[] = [
			createWorkItem({
				source: "git",
				title: "[zebra] feat: z",
				metadata: { repo: "~/code/zebra" },
			}),
			createWorkItem({
				source: "git",
				title: "[alpha] feat: a",
				metadata: { repo: "~/code/alpha" },
			}),
			createWorkItem({
				source: "git",
				title: "[misc] feat: misc",
				metadata: { repo: "~/code/misc" },
			}),
		];

		const result = aggregateByProject(items, config, {
			start: new Date("2025-01-01"),
			end: new Date("2025-01-01"),
		});

		expect(result.projects).toHaveLength(3);
		expect(result.projects[0]?.projectName).toBe("alpha");
		expect(result.projects[1]?.projectName).toBe("zebra");
		expect(result.projects[2]?.projectName).toBe("Misc");
	});
});

describe("getCommitSubjects", () => {
	test("strips repo prefix from titles", () => {
		const items: WorkItem[] = [
			createWorkItem({ title: "[worklog] feat: add feature" }),
			createWorkItem({ title: "[api] fix: bug fix" }),
		];

		const subjects = getCommitSubjects(items);

		expect(subjects).toEqual(["feat: add feature", "fix: bug fix"]);
	});

	test("handles titles without prefix", () => {
		const items: WorkItem[] = [createWorkItem({ title: "feat: add feature" })];

		const subjects = getCommitSubjects(items);

		expect(subjects).toEqual(["feat: add feature"]);
	});
});

describe("getSessionDescriptions", () => {
	test("strips opencode prefix", () => {
		const items: WorkItem[] = [
			createWorkItem({
				source: "opencode",
				title: "OpenCode session: Implement feature",
			}),
		];

		const descriptions = getSessionDescriptions(items);

		expect(descriptions).toEqual(["Implement feature"]);
	});

	test("strips claude code prefix", () => {
		const items: WorkItem[] = [
			createWorkItem({
				source: "claude",
				title: "Claude Code [worklog]: Fix bug",
			}),
		];

		const descriptions = getSessionDescriptions(items);

		expect(descriptions).toEqual(["Fix bug"]);
	});
});

describe("getGitHubDescriptions", () => {
	test("strips repo prefix from github activity", () => {
		const items: WorkItem[] = [
			createWorkItem({
				source: "github",
				title: "[owner/repo] PR #1: Feature",
			}),
		];

		const descriptions = getGitHubDescriptions(items);

		expect(descriptions).toEqual(["PR #1: Feature"]);
	});
});
