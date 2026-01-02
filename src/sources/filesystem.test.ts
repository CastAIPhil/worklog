import { describe, expect, test } from "bun:test";
import type { Config, DateRange } from "../types.ts";
import { attributeWorkItem } from "../utils/attribution.ts";
import type { FilesystemAdapter } from "./filesystem.ts";
import { createFilesystemReader } from "./filesystem.ts";

interface MockFileEntry {
	name: string;
	isDirectory: () => boolean;
}

interface MockFileStat {
	mtime: Date;
	size: number;
}

class InMemoryFilesystemAdapter implements FilesystemAdapter {
	constructor(
		private files: Map<
			string,
			Array<{ name: string; isDir: boolean; mtime?: Date; size?: number }>
		>,
	) {}

	async readdir(path: string): Promise<MockFileEntry[]> {
		const entries = this.files.get(path);
		if (!entries) {
			throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
		}

		return entries.map((entry) => ({
			name: entry.name,
			isDirectory: () => entry.isDir,
		}));
	}

	async stat(path: string): Promise<MockFileStat> {
		const pathParts = path.split("/");
		const fileName = pathParts[pathParts.length - 1];
		const dirPath = pathParts.slice(0, -1).join("/");

		const entries = this.files.get(dirPath);
		if (!entries) {
			throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
		}

		const entry = entries.find((e) => e.name === fileName);
		if (!entry) {
			throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
		}

		if (entry.mtime && entry.size !== undefined) {
			return { mtime: entry.mtime, size: entry.size };
		}

		throw new Error(`No stat info for ${path}`);
	}
}

function createMockConfig(repos: string[]): Config {
	return {
		defaultSources: ["filesystem"],
		gitRepos: repos,
		gitIdentityEmails: [],
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

describe("filesystemReader", () => {
	const today = new Date("2026-01-02T12:00:00Z");
	const lastWeek = new Date("2025-12-25T12:00:00Z");

	const dateRange: DateRange = {
		start: new Date("2026-01-01T00:00:00Z"),
		end: new Date("2026-01-02T23:59:59Z"),
	};

	test("returns empty array when no repos configured", async () => {
		const config = createMockConfig([]);
		const adapter = new InMemoryFilesystemAdapter(new Map());
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toEqual([]);
	});

	test("scans each configured repo separately", async () => {
		const files = new Map([
			[
				"/home/user/worklog",
				[
					{ name: "src", isDir: true, mtime: today, size: 0 },
					{ name: "README.md", isDir: false, mtime: today, size: 1024 },
				],
			],
			["/home/user/worklog/src", [{ name: "index.ts", isDir: false, mtime: today, size: 2048 }]],
			["/home/user/api-server", [{ name: "server.ts", isDir: false, mtime: today, size: 3072 }]],
		]);

		const config = createMockConfig(["/home/user/worklog", "/home/user/api-server"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(2);
		expect(items[0]?.metadata?.repo).toBe("/home/user/worklog");
		expect(items[1]?.metadata?.repo).toBe("/home/user/api-server");
	});

	test("sets metadata.repo and metadata.project for each item", async () => {
		const files = new Map([
			["/home/user/worklog", [{ name: "index.ts", isDir: false, mtime: today, size: 1024 }]],
		]);

		const config = createMockConfig(["/home/user/worklog"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		expect(items[0]?.metadata?.repo).toBe("/home/user/worklog");
		expect(items[0]?.metadata?.project).toBe("worklog");
		expect(items[0]?.metadata?.basePath).toBe("/home/user/worklog");
	});

	test("excludes repos with no activity in date range", async () => {
		const files = new Map([
			["/home/user/worklog", [{ name: "index.ts", isDir: false, mtime: today, size: 1024 }]],
			["/home/user/api-server", [{ name: "server.ts", isDir: false, mtime: lastWeek, size: 2048 }]],
		]);

		const config = createMockConfig(["/home/user/worklog", "/home/user/api-server"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		expect(items[0]?.metadata?.repo).toBe("/home/user/worklog");
	});

	test("skips configured directories", async () => {
		const files = new Map([
			[
				"/home/user/worklog",
				[
					{ name: "src", isDir: true, mtime: today, size: 0 },
					{ name: "node_modules", isDir: true, mtime: today, size: 0 },
					{ name: ".git", isDir: true, mtime: today, size: 0 },
					{ name: "index.ts", isDir: false, mtime: today, size: 1024 },
				],
			],
			["/home/user/worklog/src", [{ name: "app.ts", isDir: false, mtime: today, size: 2048 }]],
		]);

		const config = createMockConfig(["/home/user/worklog"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		expect(items[0]?.metadata?.totalFiles).toBe(2);
	});

	test("aggregates file statistics per repo", async () => {
		const files = new Map([
			[
				"/home/user/worklog",
				[
					{ name: "index.ts", isDir: false, mtime: today, size: 1024 },
					{ name: "test.ts", isDir: false, mtime: today, size: 2048 },
					{ name: "README.md", isDir: false, mtime: today, size: 512 },
				],
			],
		]);

		const config = createMockConfig(["/home/user/worklog"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		expect(items[0]?.title).toBe("File System: Modified 3 files");
		expect(items[0]?.metadata?.totalFiles).toBe(3);
		expect(items[0]?.metadata?.topExtensions).toBeDefined();
	});

	test("handles repos that cannot be scanned gracefully", async () => {
		const files = new Map([
			["/home/user/worklog", [{ name: "index.ts", isDir: false, mtime: today, size: 1024 }]],
		]);

		const config = createMockConfig(["/home/user/worklog", "/home/user/non-existent"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		expect(items[0]?.metadata?.repo).toBe("/home/user/worklog");
	});

	test("attribution works correctly with repo metadata", async () => {
		const files = new Map([
			["/home/user/worklog", [{ name: "index.ts", isDir: false, mtime: today, size: 1024 }]],
		]);

		const config = createMockConfig(["/home/user/worklog"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		const item = items[0];
		if (!item) throw new Error("Expected item to exist");
		const attributed = attributeWorkItem(item, ["/home/user/worklog"]);
		expect(attributed).toBe("/home/user/worklog");
	});

	test("expands tilde paths correctly", async () => {
		const files = new Map([
			[
				`${process.env.HOME}/worklog`,
				[{ name: "index.ts", isDir: false, mtime: today, size: 1024 }],
			],
		]);

		const config = createMockConfig(["~/worklog"]);
		const adapter = new InMemoryFilesystemAdapter(files);
		const reader = createFilesystemReader(adapter);

		const items = await reader.read(dateRange, config);

		expect(items).toHaveLength(1);
		expect(items[0]?.metadata?.repo).toBe("~/worklog");
		expect(items[0]?.metadata?.basePath).toBe(`${process.env.HOME}/worklog`);
	});
});
