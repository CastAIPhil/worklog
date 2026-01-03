import { describe, expect, test } from "bun:test";
import type { DateRange, WorkItem } from "../types.ts";
import { attributeWorkItem, MISC_PROJECT } from "../utils/attribution.ts";
import {
	type CursorAdapter,
	type CursorWorkspace,
	createCursorReader,
	findWorkspaceFiles,
	getWorkspaceName,
	parseFileUriToPath,
	parseWorkspaceFile,
} from "./cursor.ts";

class MockCursorAdapter implements CursorAdapter {
	constructor(
		private dirs: Map<string, Array<{ name: string; isDir: boolean }>> = new Map(),
		private files: Map<string, { content?: string; mtime: Date }> = new Map(),
	) {}

	async readdir(path: string): Promise<Array<{ name: string; isDirectory: () => boolean }>> {
		const entries = this.dirs.get(path);
		if (!entries) throw new Error(`Directory not found: ${path}`);
		return entries.map((e) => ({
			name: e.name,
			isDirectory: () => e.isDir,
		}));
	}

	async fileExists(path: string): Promise<boolean> {
		return this.files.has(path);
	}

	async readFile(path: string): Promise<string> {
		const file = this.files.get(path);
		if (!file) throw new Error(`File not found: ${path}`);
		return file.content ?? "";
	}

	async fileStat(path: string): Promise<{ mtime: Date }> {
		const file = this.files.get(path);
		if (!file) throw new Error(`File not found: ${path}`);
		return { mtime: file.mtime };
	}
}

describe("parseFileUriToPath", () => {
	describe("Unix/Linux paths", () => {
		test("parses simple Unix path", () => {
			expect(parseFileUriToPath("file:///home/user/code")).toBe("/home/user/code");
		});

		test("parses nested Unix path", () => {
			expect(parseFileUriToPath("file:///home/user/code/worklog/src")).toBe(
				"/home/user/code/worklog/src",
			);
		});

		test("parses root path", () => {
			expect(parseFileUriToPath("file:///")).toBe("/");
		});
	});

	describe("macOS paths", () => {
		test("parses macOS home directory path", () => {
			expect(parseFileUriToPath("file:///Users/justin/code")).toBe("/Users/justin/code");
		});

		test("parses macOS Applications path", () => {
			expect(parseFileUriToPath("file:///Applications/Cursor.app")).toBe(
				"/Applications/Cursor.app",
			);
		});
	});

	describe("Windows paths", () => {
		test("parses Windows C: drive path", () => {
			expect(parseFileUriToPath("file:///C:/Users/justin/code")).toBe("C:/Users/justin/code");
		});

		test("parses Windows D: drive path", () => {
			expect(parseFileUriToPath("file:///D:/Projects/worklog")).toBe("D:/Projects/worklog");
		});

		test("parses Windows path with lowercase drive", () => {
			expect(parseFileUriToPath("file:///c:/users/justin/code")).toBe("c:/users/justin/code");
		});

		test("parses Windows path with nested directories", () => {
			expect(parseFileUriToPath("file:///C:/Program%20Files/Cursor/bin")).toBe(
				"C:/Program Files/Cursor/bin",
			);
		});
	});

	describe("percent-encoding", () => {
		test("decodes spaces", () => {
			expect(parseFileUriToPath("file:///home/user/my%20code")).toBe("/home/user/my code");
		});

		test("decodes multiple spaces", () => {
			expect(parseFileUriToPath("file:///home/user/my%20project%20folder")).toBe(
				"/home/user/my project folder",
			);
		});

		test("decodes special characters", () => {
			expect(parseFileUriToPath("file:///home/user/code%2Fproject")).toBe(
				"/home/user/code/project",
			);
		});

		test("decodes Unicode characters", () => {
			expect(parseFileUriToPath("file:///home/user/%E6%96%87%E4%BB%B6")).toBe("/home/user/文件");
		});

		test("handles already-decoded paths", () => {
			expect(parseFileUriToPath("file:///home/user/my code")).toBe("/home/user/my code");
		});
	});

	describe("edge cases", () => {
		test("returns null for non-file URI", () => {
			expect(parseFileUriToPath("http://example.com")).toBe(null);
		});

		test("returns null for https URI", () => {
			expect(parseFileUriToPath("https://example.com/path")).toBe(null);
		});

		test("returns null for empty string", () => {
			expect(parseFileUriToPath("")).toBe(null);
		});

		test("returns null for null input", () => {
			expect(parseFileUriToPath(null as unknown as string)).toBe(null);
		});

		test("returns null for undefined input", () => {
			expect(parseFileUriToPath(undefined as unknown as string)).toBe(null);
		});

		test("returns empty string for file:// with no path", () => {
			expect(parseFileUriToPath("file://")).toBe("");
		});

		test("handles invalid percent-encoding gracefully", () => {
			expect(parseFileUriToPath("file:///home/user/%ZZ")).toBe(null);
		});
	});

	describe("trailing slashes", () => {
		test("preserves trailing slash", () => {
			expect(parseFileUriToPath("file:///home/user/code/")).toBe("/home/user/code/");
		});

		test("preserves no trailing slash", () => {
			expect(parseFileUriToPath("file:///home/user/code")).toBe("/home/user/code");
		});
	});
});

describe("Cursor workspace attribution", () => {
	const gitRepos = ["/home/justin/code/worklog", "/home/justin/code/api-server"];

	test("attributes workspace to configured repo when folderUri matches", () => {
		const item: WorkItem = {
			source: "cursor",
			timestamp: new Date(),
			title: 'Cursor: Opened workspace "worklog"',
			metadata: {
				folderUri: "file:///home/justin/code/worklog",
				repo: "/home/justin/code/worklog",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe("/home/justin/code/worklog");
	});

	test("attributes workspace to repo when folderUri points to nested path", () => {
		const item: WorkItem = {
			source: "cursor",
			timestamp: new Date(),
			title: 'Cursor: Opened workspace "src"',
			metadata: {
				folderUri: "file:///home/justin/code/worklog/src",
				repo: "/home/justin/code/worklog/src",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe("/home/justin/code/worklog");
	});

	test("returns misc when folderUri does not match any configured repo", () => {
		const item: WorkItem = {
			source: "cursor",
			timestamp: new Date(),
			title: 'Cursor: Opened workspace "other"',
			metadata: {
				folderUri: "file:///home/justin/other/project",
				repo: "/home/justin/other/project",
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});

	test("handles workspace with spaces in path", () => {
		const repos = ["/home/justin/code/my project"];
		const item: WorkItem = {
			source: "cursor",
			timestamp: new Date(),
			title: 'Cursor: Opened workspace "my project"',
			metadata: {
				folderUri: "file:///home/justin/code/my%20project",
				repo: "/home/justin/code/my project",
			},
		};

		expect(attributeWorkItem(item, repos)).toBe("/home/justin/code/my project");
	});

	test("returns misc when folderUri cannot be parsed", () => {
		const item: WorkItem = {
			source: "cursor",
			timestamp: new Date(),
			title: 'Cursor: Opened workspace "Unknown"',
			metadata: {
				folderUri: "http://example.com/not-a-file-uri",
				repo: undefined,
			},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});

	test("returns misc when folderUri is missing", () => {
		const item: WorkItem = {
			source: "cursor",
			timestamp: new Date(),
			title: 'Cursor: Opened workspace "Unknown"',
			metadata: {},
		};

		expect(attributeWorkItem(item, gitRepos)).toBe(MISC_PROJECT);
	});
});

describe("getWorkspaceName", () => {
	test("returns label if present", () => {
		const workspace: CursorWorkspace = {
			label: "My Workspace",
			folderUri: "file:///home/user/code",
		};
		expect(getWorkspaceName(workspace)).toBe("My Workspace");
	});

	test("extracts name from folderUri", () => {
		const workspace: CursorWorkspace = {
			folderUri: "file:///home/user/my-project",
		};
		expect(getWorkspaceName(workspace)).toBe("my-project");
	});

	test("returns Unknown Workspace when no label or folderUri", () => {
		const workspace: CursorWorkspace = {};
		expect(getWorkspaceName(workspace)).toBe("Unknown Workspace");
	});
});

describe("findWorkspaceFiles", () => {
	test("finds workspace.json files in subdirectories", async () => {
		const dirs = new Map([
			[
				"/storage",
				[
					{ name: "ws1", isDir: true },
					{ name: "ws2", isDir: true },
				],
			],
		]);
		const files = new Map([
			["/storage/ws1/workspace.json", { content: "{}", mtime: new Date() }],
			["/storage/ws2/workspace.json", { content: "{}", mtime: new Date() }],
		]);
		const adapter = new MockCursorAdapter(dirs, files);

		const result = await findWorkspaceFiles("/storage", adapter);
		expect(result).toEqual(["/storage/ws1/workspace.json", "/storage/ws2/workspace.json"]);
	});

	test("skips non-directory entries", async () => {
		const dirs = new Map([
			[
				"/storage",
				[
					{ name: "ws1", isDir: true },
					{ name: "file.txt", isDir: false },
				],
			],
		]);
		const files = new Map([["/storage/ws1/workspace.json", { content: "{}", mtime: new Date() }]]);
		const adapter = new MockCursorAdapter(dirs, files);

		const result = await findWorkspaceFiles("/storage", adapter);
		expect(result).toEqual(["/storage/ws1/workspace.json"]);
	});

	test("returns empty array when directory doesn't exist", async () => {
		const adapter = new MockCursorAdapter();
		const result = await findWorkspaceFiles("/nonexistent", adapter);
		expect(result).toEqual([]);
	});
});

describe("parseWorkspaceFile", () => {
	const dateRange: DateRange = {
		start: new Date("2026-01-01"),
		end: new Date("2026-01-03"),
	};

	test("parses workspace file with folderUri", async () => {
		const workspace: CursorWorkspace = {
			folderUri: "file:///home/user/project",
		};
		const files = new Map([
			[
				"/storage/ws1/workspace.json",
				{ content: JSON.stringify(workspace), mtime: new Date("2026-01-02") },
			],
		]);
		const adapter = new MockCursorAdapter(new Map(), files);

		const result = await parseWorkspaceFile("/storage/ws1/workspace.json", dateRange, adapter);
		expect(result).toHaveLength(1);
		expect(result[0]!.source).toBe("cursor");
		expect(result[0]!.title).toContain("project");
		expect(result[0]!.metadata?.repo).toBe("/home/user/project");
	});

	test("uses state.vscdb mtime if available", async () => {
		const workspace: CursorWorkspace = { folderUri: "file:///home/user/project" };
		const stateTime = new Date("2026-01-02T12:00:00Z");
		const files = new Map([
			[
				"/storage/ws1/workspace.json",
				{ content: JSON.stringify(workspace), mtime: new Date("2026-01-01") },
			],
			["/storage/ws1/state.vscdb", { content: "", mtime: stateTime }],
		]);
		const adapter = new MockCursorAdapter(new Map(), files);

		const result = await parseWorkspaceFile("/storage/ws1/workspace.json", dateRange, adapter);
		expect(result).toHaveLength(1);
		expect(result[0]!.timestamp.getTime()).toBe(stateTime.getTime());
	});

	test("includes workspace ID in description", async () => {
		const workspace: CursorWorkspace = {
			folderUri: "file:///home/user/project",
			workspace: { id: "abc123", configPath: "/config" },
		};
		const files = new Map([
			[
				"/storage/ws1/workspace.json",
				{ content: JSON.stringify(workspace), mtime: new Date("2026-01-02") },
			],
		]);
		const adapter = new MockCursorAdapter(new Map(), files);

		const result = await parseWorkspaceFile("/storage/ws1/workspace.json", dateRange, adapter);
		expect(result[0]!.description).toContain("abc123");
	});

	test("returns empty when file doesn't exist", async () => {
		const adapter = new MockCursorAdapter();
		const result = await parseWorkspaceFile("/nonexistent.json", dateRange, adapter);
		expect(result).toEqual([]);
	});

	test("returns empty when timestamp outside date range", async () => {
		const workspace: CursorWorkspace = { folderUri: "file:///home/user/project" };
		const files = new Map([
			[
				"/storage/ws1/workspace.json",
				{ content: JSON.stringify(workspace), mtime: new Date("2025-12-01") },
			],
		]);
		const adapter = new MockCursorAdapter(new Map(), files);

		const result = await parseWorkspaceFile("/storage/ws1/workspace.json", dateRange, adapter);
		expect(result).toEqual([]);
	});

	test("returns empty on invalid JSON", async () => {
		const files = new Map([
			["/storage/ws1/workspace.json", { content: "not json", mtime: new Date("2026-01-02") }],
		]);
		const adapter = new MockCursorAdapter(new Map(), files);

		const result = await parseWorkspaceFile("/storage/ws1/workspace.json", dateRange, adapter);
		expect(result).toEqual([]);
	});
});

describe("createCursorReader", () => {
	test("creates reader with custom adapter", async () => {
		const workspace: CursorWorkspace = {
			folderUri: "file:///home/user/project",
		};
		const dirs = new Map([["/test/User/workspaceStorage", [{ name: "ws1", isDir: true }]]]);
		const files = new Map([
			[
				"/test/User/workspaceStorage/ws1/workspace.json",
				{ content: JSON.stringify(workspace), mtime: new Date("2026-01-02") },
			],
		]);
		const adapter = new MockCursorAdapter(dirs, files);

		const reader = createCursorReader(adapter);
		expect(reader.name).toBe("cursor");

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
				codex: "",
				factory: "",
				vscode: "",
				cursor: "/test",
				terminal: "",
				filesystem: "",
			},
		};

		const result = await reader.read(dateRange, config);
		expect(result.length).toBeGreaterThanOrEqual(1);
		expect(result[0]!.source).toBe("cursor");
	});
});
