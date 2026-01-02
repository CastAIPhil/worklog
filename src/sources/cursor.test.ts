import { describe, expect, test } from "bun:test";
import type { WorkItem } from "../types.ts";
import { attributeWorkItem, MISC_PROJECT } from "../utils/attribution.ts";
import { parseFileUriToPath } from "./cursor.ts";

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
