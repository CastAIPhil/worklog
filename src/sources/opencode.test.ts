import { describe, expect, test } from "bun:test";
import type { DateRange, WorkItem } from "../types.ts";
import { attributeWorkItem, MISC_PROJECT } from "../utils/attribution.ts";
import {
	createOpenCodeReader,
	extractFilePaths,
	findJsonFilesRecursively,
	findRepoFromMessages,
	type OpenCodeAdapter,
	type OpenCodeSession,
	parseSessionFile,
} from "./opencode.ts";

class MockOpenCodeAdapter implements OpenCodeAdapter {
	constructor(
		private dirs: Map<string, string[]> = new Map(),
		private fileStats: Map<string, { isDir: boolean }> = new Map(),
		private files: Map<string, string> = new Map(),
	) {}

	async readdir(path: string): Promise<string[]> {
		const entries = this.dirs.get(path);
		if (!entries) throw new Error(`Directory not found: ${path}`);
		return entries;
	}

	async stat(path: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
		const s = this.fileStats.get(path);
		if (!s) throw new Error(`File not found: ${path}`);
		return {
			isDirectory: () => s.isDir,
			isFile: () => !s.isDir,
		};
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

describe("findJsonFilesRecursively", () => {
	test("finds json files in directory", async () => {
		const dirs = new Map([
			["/base", ["file1.json", "file2.txt", "subdir"]],
			["/base/subdir", ["file3.json"]],
		]);
		const fileStats = new Map([
			["/base/file1.json", { isDir: false }],
			["/base/file2.txt", { isDir: false }],
			["/base/subdir", { isDir: true }],
			["/base/subdir/file3.json", { isDir: false }],
		]);
		const adapter = new MockOpenCodeAdapter(dirs, fileStats);

		const result = await findJsonFilesRecursively("/base", adapter);
		expect(result).toContain("/base/file1.json");
		expect(result).toContain("/base/subdir/file3.json");
		expect(result).not.toContain("/base/file2.txt");
	});

	test("returns empty array for nonexistent directory", async () => {
		const adapter = new MockOpenCodeAdapter();
		const result = await findJsonFilesRecursively("/nonexistent", adapter);
		expect(result).toEqual([]);
	});

	test("handles empty directory", async () => {
		const dirs = new Map([["/empty", []]]);
		const adapter = new MockOpenCodeAdapter(dirs);

		const result = await findJsonFilesRecursively("/empty", adapter);
		expect(result).toEqual([]);
	});

	test("skips unreadable subdirectories", async () => {
		const dirs = new Map([["/base", ["file.json", "baddir"]]]);
		const fileStats = new Map([
			["/base/file.json", { isDir: false }],
			["/base/baddir", { isDir: true }],
			// /base/baddir entries will throw
		]);
		const adapter = new MockOpenCodeAdapter(dirs, fileStats);

		const result = await findJsonFilesRecursively("/base", adapter);
		expect(result).toContain("/base/file.json");
	});
});

describe("parseSessionFile", () => {
	const dateRange: DateRange = {
		start: new Date("2026-01-01"),
		end: new Date("2026-01-03"),
	};
	const gitRepos = ["/home/justin/code/worklog"];

	test("parses valid session file", async () => {
		const session: OpenCodeSession = {
			id: "session-123",
			title: "Fix the parser bug",
			time: {
				created: new Date("2026-01-02").getTime(),
				updated: new Date("2026-01-02").getTime(),
			},
			projectID: "project-1",
			directory: "/home/justin/code/worklog",
		};
		const files = new Map([["/sessions/test.json", JSON.stringify(session)]]);
		const adapter = new MockOpenCodeAdapter(new Map(), new Map(), files);

		const result = await parseSessionFile("/sessions/test.json", dateRange, gitRepos, adapter);
		expect(result).toHaveLength(1);
		expect(result[0]?.source).toBe("opencode");
		expect(result[0]?.title).toContain("Fix the parser bug");
		expect(result[0]?.metadata?.repo).toBe("/home/justin/code/worklog");
	});

	test("returns empty for file outside date range", async () => {
		const session: OpenCodeSession = {
			id: "session-456",
			title: "Old session",
			time: {
				created: new Date("2025-12-01").getTime(),
				updated: new Date("2025-12-01").getTime(),
			},
			projectID: "project-1",
			directory: "/home/justin/code/worklog",
		};
		const files = new Map([["/sessions/old.json", JSON.stringify(session)]]);
		const adapter = new MockOpenCodeAdapter(new Map(), new Map(), files);

		const result = await parseSessionFile("/sessions/old.json", dateRange, gitRepos, adapter);
		expect(result).toEqual([]);
	});

	test("returns empty for nonexistent file", async () => {
		const adapter = new MockOpenCodeAdapter();
		const result = await parseSessionFile("/nonexistent.json", dateRange, gitRepos, adapter);
		expect(result).toEqual([]);
	});

	test("returns empty for invalid JSON", async () => {
		const files = new Map([["/sessions/bad.json", "not valid json"]]);
		const adapter = new MockOpenCodeAdapter(new Map(), new Map(), files);

		const result = await parseSessionFile("/sessions/bad.json", dateRange, gitRepos, adapter);
		expect(result).toEqual([]);
	});

	test("includes projectID in description", async () => {
		const session: OpenCodeSession = {
			id: "session-789",
			title: "Test session",
			time: {
				created: new Date("2026-01-02").getTime(),
				updated: new Date("2026-01-02").getTime(),
			},
			projectID: "my-project",
			directory: "/other/path",
		};
		const files = new Map([["/sessions/test.json", JSON.stringify(session)]]);
		const adapter = new MockOpenCodeAdapter(new Map(), new Map(), files);

		const result = await parseSessionFile("/sessions/test.json", dateRange, [], adapter);
		expect(result[0]?.description).toContain("my-project");
	});
});

describe("createOpenCodeReader", () => {
	test("creates reader with custom adapter", async () => {
		const session: OpenCodeSession = {
			id: "session-1",
			title: "Test session",
			time: {
				created: new Date("2026-01-02").getTime(),
				updated: new Date("2026-01-02").getTime(),
			},
			projectID: "project-1",
			directory: "/home/user/project",
		};
		const dirs = new Map([["/test", ["session.json"]]]);
		const fileStats = new Map([["/test/session.json", { isDir: false }]]);
		const files = new Map([["/test/session.json", JSON.stringify(session)]]);
		const adapter = new MockOpenCodeAdapter(dirs, fileStats, files);

		const reader = createOpenCodeReader(adapter);
		expect(reader.name).toBe("opencode");

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
				opencode: "/test",
				claude: "",
				codex: "",
				factory: "",
				vscode: "",
				cursor: "",
				terminal: "",
				filesystem: "",
				slack: "",
			},
			calendar: {
				excludePatterns: [],
				includePatterns: [],
			},
		};

		const result = await reader.read(dateRange, config);
		expect(result).toHaveLength(1);
		expect(result[0]?.source).toBe("opencode");
	});

	test("returns empty array for error during read", async () => {
		const adapter = new MockOpenCodeAdapter();

		const reader = createOpenCodeReader(adapter);
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
				opencode: "/nonexistent",
				claude: "",
				codex: "",
				factory: "",
				vscode: "",
				cursor: "",
				terminal: "",
				filesystem: "",
				slack: "",
			},
			calendar: {
				excludePatterns: [],
				includePatterns: [],
			},
		};

		const result = await reader.read(dateRange, config);
		expect(result).toEqual([]);
	});
});
