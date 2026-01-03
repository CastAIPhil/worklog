import { describe, expect, test } from "bun:test";
import type { DateRange, WorkItem } from "../types.ts";
import { attributeWorkItem, MISC_PROJECT } from "../utils/attribution.ts";
import {
	type CodexAdapter,
	createCodexReader,
	extractFilePaths,
	findRepoFromMessages,
	findSessionDirs,
	parseSessionDir,
} from "./codex.ts";

class MockCodexAdapter implements CodexAdapter {
	constructor(
		private dirs: Map<string, string[]> = new Map(),
		private files: Map<string, string> = new Map(),
	) {}

	async readdir(path: string): Promise<string[]> {
		const entries = this.dirs.get(path);
		if (!entries) throw new Error(`Directory not found: ${path}`);
		return entries;
	}

	async readFile(path: string): Promise<string> {
		const content = this.files.get(path);
		if (content === undefined) throw new Error(`File not found: ${path}`);
		return content;
	}
}

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

describe("Codex attribution integration", () => {
	const gitRepos = ["/home/justin/code/worklog", "/home/justin/code/api-server"];

	test("attributed WorkItem goes to correct repo", () => {
		const item: WorkItem = {
			source: "codex",
			timestamp: new Date(),
			title: "Codex: Fix bug in parser",
			metadata: {
				sessionFile: "session-123.jsonl",
				promptCount: 5,
				repo: "/home/justin/code/worklog",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe("/home/justin/code/worklog");
	});

	test("WorkItem without repo metadata goes to misc", () => {
		const item: WorkItem = {
			source: "codex",
			timestamp: new Date(),
			title: "Codex: General chat",
			metadata: {
				sessionFile: "session-456.jsonl",
				promptCount: 3,
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});

	test("WorkItem with non-matching repo goes to misc", () => {
		const item: WorkItem = {
			source: "codex",
			timestamp: new Date(),
			title: "Codex: Other project work",
			metadata: {
				sessionFile: "session-789.jsonl",
				promptCount: 2,
				repo: "/home/justin/other/project",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});
});

describe("findSessionDirs", () => {
	const dateRange: DateRange = {
		start: new Date("2026-01-01"),
		end: new Date("2026-01-03"),
	};

	test("finds session directories within date range", async () => {
		const dirs = new Map([
			["/base", ["2026"]],
			["/base/2026", ["01"]],
			["/base/2026/01", ["01", "02", "03", "04"]],
		]);
		const adapter = new MockCodexAdapter(dirs, new Map());

		const result = await findSessionDirs("/base", dateRange, adapter);
		// Date range is 01-01 to 01-03, so 01, 02, and 03 are included (before end)
		expect(result).toEqual(["/base/2026/01/01", "/base/2026/01/02", "/base/2026/01/03"]);
	});

	test("skips non-date directories", async () => {
		const dirs = new Map([
			["/base", ["2026", "cache", "temp"]],
			["/base/2026", ["01", "logs"]],
			["/base/2026/01", ["01", "readme"]],
		]);
		const adapter = new MockCodexAdapter(dirs, new Map());

		const result = await findSessionDirs("/base", dateRange, adapter);
		expect(result).toEqual(["/base/2026/01/01"]);
	});

	test("returns empty when no matching dates", async () => {
		const dirs = new Map([
			["/base", ["2025"]],
			["/base/2025", ["06"]],
			["/base/2025/06", ["15"]],
		]);
		const adapter = new MockCodexAdapter(dirs, new Map());

		const result = await findSessionDirs("/base", dateRange, adapter);
		expect(result).toEqual([]);
	});

	test("returns empty when directory doesn't exist", async () => {
		const adapter = new MockCodexAdapter();
		const result = await findSessionDirs("/nonexistent", dateRange, adapter);
		expect(result).toEqual([]);
	});
});

describe("parseSessionDir", () => {
	const gitRepos = ["/home/user/project"];

	test("parses JSONL session file with user prompts", async () => {
		const sessionContent = [
			{ role: "user", content: "Help me fix the bug", timestamp: "2026-01-02T10:00:00Z" },
			{ role: "assistant", content: "I'll help you", timestamp: "2026-01-02T10:00:01Z" },
			{ role: "user", content: "Thanks!", timestamp: "2026-01-02T10:01:00Z" },
		]
			.map((m) => JSON.stringify(m))
			.join("\n");

		const dirs = new Map([["/session/2026/01/02", ["session-abc.jsonl"]]]);
		const files = new Map([["/session/2026/01/02/session-abc.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session/2026/01/02", gitRepos, adapter);
		expect(result).toHaveLength(1);
		expect(result[0]!.source).toBe("codex");
		expect(result[0]!.title).toBe("Codex: Help me fix the bug");
		expect(result[0]!.metadata?.promptCount).toBe(2);
		expect(result[0]!.description).toBe("2 prompts");
	});

	test("uses first message timestamp as session start", async () => {
		const sessionContent = [
			{ role: "user", content: "First message", timestamp: "2026-01-02T09:00:00Z" },
			{ role: "assistant", content: "Response", timestamp: "2026-01-02T09:01:00Z" },
		]
			.map((m) => JSON.stringify(m))
			.join("\n");

		const dirs = new Map([["/session", ["s.jsonl"]]]);
		const files = new Map([["/session/s.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session", gitRepos, adapter);
		expect(result[0]!.timestamp.toISOString()).toBe("2026-01-02T09:00:00.000Z");
	});

	test("extracts repo from message content", async () => {
		const sessionContent = [
			{
				role: "user",
				content: "Edit /home/user/project/src/main.ts",
				timestamp: "2026-01-02T10:00:00Z",
			},
		]
			.map((m) => JSON.stringify(m))
			.join("\n");

		const dirs = new Map([["/session", ["s.jsonl"]]]);
		const files = new Map([["/session/s.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session", gitRepos, adapter);
		expect(result[0]!.metadata?.repo).toBe("/home/user/project");
	});

	test("ignores non-JSONL files", async () => {
		const sessionContent = JSON.stringify({
			role: "user",
			content: "Test",
			timestamp: "2026-01-02T10:00:00Z",
		});

		const dirs = new Map([["/session", ["session.jsonl", "notes.txt", "config.json"]]]);
		const files = new Map([["/session/session.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session", gitRepos, adapter);
		expect(result).toHaveLength(1);
	});

	test("skips sessions without user prompts", async () => {
		const sessionContent = [
			{ role: "system", content: "You are helpful", timestamp: "2026-01-02T10:00:00Z" },
			{ role: "assistant", content: "Hello!", timestamp: "2026-01-02T10:00:01Z" },
		]
			.map((m) => JSON.stringify(m))
			.join("\n");

		const dirs = new Map([["/session", ["s.jsonl"]]]);
		const files = new Map([["/session/s.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session", gitRepos, adapter);
		expect(result).toHaveLength(0);
	});

	test("handles malformed JSON lines gracefully", async () => {
		const sessionContent = [
			JSON.stringify({
				role: "user",
				content: "Valid message",
				timestamp: "2026-01-02T10:00:00Z",
			}),
			"not valid json",
			JSON.stringify({
				role: "user",
				content: "Another valid",
				timestamp: "2026-01-02T10:01:00Z",
			}),
		].join("\n");

		const dirs = new Map([["/session", ["s.jsonl"]]]);
		const files = new Map([["/session/s.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session", gitRepos, adapter);
		expect(result).toHaveLength(1);
		expect(result[0]!.metadata?.promptCount).toBe(2);
	});

	test("returns empty when directory doesn't exist", async () => {
		const adapter = new MockCodexAdapter();
		const result = await parseSessionDir("/nonexistent", gitRepos, adapter);
		expect(result).toEqual([]);
	});

	test("handles single prompt without description", async () => {
		const sessionContent = JSON.stringify({
			role: "user",
			content: "Single prompt",
			timestamp: "2026-01-02T10:00:00Z",
		});

		const dirs = new Map([["/session", ["s.jsonl"]]]);
		const files = new Map([["/session/s.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const result = await parseSessionDir("/session", gitRepos, adapter);
		expect(result[0]!.description).toBeUndefined();
		expect(result[0]!.metadata?.promptCount).toBe(1);
	});
});

describe("createCodexReader", () => {
	test("creates reader with custom adapter", async () => {
		const sessionContent = JSON.stringify({
			role: "user",
			content: "Hello",
			timestamp: "2026-01-02T10:00:00Z",
		});

		const dirs = new Map([
			["/codex", ["2026"]],
			["/codex/2026", ["01"]],
			["/codex/2026/01", ["02"]],
			["/codex/2026/01/02", ["session.jsonl"]],
		]);
		const files = new Map([["/codex/2026/01/02/session.jsonl", sessionContent]]);
		const adapter = new MockCodexAdapter(dirs, files);

		const reader = createCodexReader(adapter);
		expect(reader.name).toBe("codex");

		const dateRange: DateRange = {
			start: new Date("2026-01-01"),
			end: new Date("2026-01-03"),
		};
		const config = {
			defaultSources: [],
			gitRepos: [],
			gitIdentityEmails: [],
			llm: { enabled: false, provider: "openai" as const, model: "gpt-4" },
			paths: {
				opencode: "",
				claude: "",
				codex: "/codex",
				factory: "",
				vscode: "",
				cursor: "",
				terminal: "",
				filesystem: "",
			},
		};

		const result = await reader.read(dateRange, config);
		expect(result).toHaveLength(1);
		expect(result[0]!.source).toBe("codex");
		expect(result[0]!.title).toBe("Codex: Hello");
	});
});
