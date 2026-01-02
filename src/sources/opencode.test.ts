import { describe, expect, test } from "bun:test";
import type { WorkItem } from "../types.ts";
import { attributeWorkItem, MISC_PROJECT } from "../utils/attribution.ts";
import { extractFilePaths, findRepoFromMessages } from "./opencode.ts";

describe("extractFilePaths", () => {
	test("extracts absolute paths", () => {
		const content = "Working on /home/justin/code/worklog/src/main.ts";
		const paths = extractFilePaths(content);
		expect(paths).toContain("/home/justin/code/worklog/src/main.ts");
	});

	test("extracts home directory paths", () => {
		const content = "Editing ~/code/worklog/src/utils/config.ts";
		const paths = extractFilePaths(content);
		expect(paths).toContain("~/code/worklog/src/utils/config.ts");
	});

	test("extracts common relative patterns (src/)", () => {
		const content = "Modified src/aggregator.ts and src/types.ts";
		const paths = extractFilePaths(content);
		expect(paths).toContain("src/aggregator.ts");
		expect(paths).toContain("src/types.ts");
	});

	test("extracts lib/ patterns", () => {
		const content = "Updated lib/parser.ts";
		const paths = extractFilePaths(content);
		expect(paths).toContain("lib/parser.ts");
	});

	test("extracts test/ patterns", () => {
		const content = "Added test/unit/parser.test.ts";
		const paths = extractFilePaths(content);
		expect(paths).toContain("test/unit/parser.test.ts");
	});

	test("extracts multiple paths from single line", () => {
		const content = "Modified /home/user/code/api/src/main.ts and ~/code/worklog/src/types.ts";
		const paths = extractFilePaths(content);
		expect(paths.length).toBeGreaterThanOrEqual(2);
		expect(paths).toContain("/home/user/code/api/src/main.ts");
		expect(paths).toContain("~/code/worklog/src/types.ts");
	});

	test("extracts paths with various file extensions", () => {
		const content = "Files: src/main.ts, src/utils.js, src/data.json, src/style.css";
		const paths = extractFilePaths(content);
		expect(paths).toContain("src/main.ts");
		expect(paths).toContain("src/utils.js");
		expect(paths).toContain("src/data.json");
		expect(paths).toContain("src/style.css");
	});

	test("handles paths in quotes", () => {
		const content = 'Read file "~/code/worklog/README.md"';
		const paths = extractFilePaths(content);
		expect(paths).toContain("~/code/worklog/README.md");
	});

	test("handles paths in backticks", () => {
		const content = "Run `cat /home/user/code/worklog/package.json`";
		const paths = extractFilePaths(content);
		expect(paths).toContain("/home/user/code/worklog/package.json");
	});

	test("returns empty array when no paths found", () => {
		const content = "Just some plain text with no file paths";
		const paths = extractFilePaths(content);
		expect(paths).toEqual([]);
	});

	test("handles multiline content", () => {
		const content = `Modified files:
- src/aggregator.ts
- src/types.ts
- /home/user/code/worklog/README.md`;
		const paths = extractFilePaths(content);
		expect(paths).toContain("src/aggregator.ts");
		expect(paths).toContain("src/types.ts");
		expect(paths).toContain("/home/user/code/worklog/README.md");
	});
});

describe("findRepoFromMessages", () => {
	const gitRepos = ["/home/justin/code/worklog", "/home/justin/code/api-server"];

	test("returns repo when message contains matching absolute path", () => {
		const messages = [
			{
				role: "user",
				content: "Edit /home/justin/code/worklog/src/main.ts",
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBe("/home/justin/code/worklog");
	});

	test("returns repo when message contains nested path", () => {
		const messages = [
			{
				role: "assistant",
				content: "I've updated /home/justin/code/worklog/src/utils/config.ts",
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBe("/home/justin/code/worklog");
	});

	test("returns repo from any message in the conversation", () => {
		const messages = [
			{
				role: "user",
				content: "Hello, I need help",
			},
			{
				role: "assistant",
				content: "Sure, what do you need?",
			},
			{
				role: "user",
				content: "Check src/aggregator.ts in /home/justin/code/api-server/",
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBe("/home/justin/code/api-server");
	});

	test("returns first matching repo when multiple repos mentioned", () => {
		const messages = [
			{
				role: "user",
				content:
					"Compare /home/justin/code/worklog/src/main.ts and /home/justin/code/api-server/src/server.ts",
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBeDefined();
		if (repo) {
			expect(gitRepos).toContain(repo);
		}
	});

	test("returns undefined when no paths match configured repos", () => {
		const messages = [
			{
				role: "user",
				content: "Edit /home/justin/other/project/src/main.ts",
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBeUndefined();
	});

	test("returns undefined when messages contain no paths", () => {
		const messages = [
			{
				role: "user",
				content: "Hello, how are you?",
			},
			{
				role: "assistant",
				content: "I'm doing well, thanks!",
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBeUndefined();
	});

	test("returns undefined when messages array is empty", () => {
		const repo = findRepoFromMessages([], gitRepos);
		expect(repo).toBeUndefined();
	});

	test("handles messages without content", () => {
		const messages = [
			{
				role: "user",
			},
			{
				role: "assistant",
				content: undefined,
			},
		];

		const repo = findRepoFromMessages(messages, gitRepos);
		expect(repo).toBeUndefined();
	});

	test("works with tilde paths when configured repos use tilde", () => {
		const repos = ["~/code/worklog", "~/code/api-server"];
		const messages = [
			{
				role: "user",
				content: "Edit ~/code/worklog/src/main.ts",
			},
		];

		const repo = findRepoFromMessages(messages, repos);
		expect(repo).toBe("~/code/worklog");
	});
});

describe("OpenCode attribution integration", () => {
	const gitRepos = ["/home/justin/code/worklog", "/home/justin/code/api-server"];

	test("attributed WorkItem goes to correct repo", () => {
		const item: WorkItem = {
			source: "opencode",
			timestamp: new Date(),
			title: "OpenCode session: Fix bug in parser",
			metadata: {
				sessionFile: "session-123.jsonl",
				messageCount: 5,
				repo: "/home/justin/code/worklog",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe("/home/justin/code/worklog");
	});

	test("WorkItem without repo metadata goes to misc", () => {
		const item: WorkItem = {
			source: "opencode",
			timestamp: new Date(),
			title: "OpenCode session: General chat",
			metadata: {
				sessionFile: "session-456.jsonl",
				messageCount: 3,
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});

	test("WorkItem with non-matching repo goes to misc", () => {
		const item: WorkItem = {
			source: "opencode",
			timestamp: new Date(),
			title: "OpenCode session: Other project work",
			metadata: {
				sessionFile: "session-789.jsonl",
				messageCount: 2,
				repo: "/home/justin/other/project",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});
});
