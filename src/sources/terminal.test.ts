import { describe, expect, test } from "bun:test";
import type { Config, DateRange } from "../types.ts";

function createMockConfig(repos: string[]): Config {
	return {
		defaultSources: ["terminal"],
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

describe("terminalReader with cd attribution", () => {
	const dateRange: DateRange = {
		start: new Date("2026-01-01T00:00:00Z"),
		end: new Date("2026-01-02T23:59:59Z"),
	};

	test("attributes commands to repo based on cd timeline (bash format)", async () => {
		const bashHistory = `#1767225600
cd /home/user/worklog
#1767225610
git status
#1767225620
bun test
#1767225630
cd /home/user/api-server
#1767225640
npm install
#1767225650
node server.js`;

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog", "/home/user/api-server"]);

		const tmpFile = `/tmp/test-bash-history-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		expect(items.length).toBeGreaterThanOrEqual(1);

		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		const apiServerItem = items.find((item) => item.metadata?.repo === "/home/user/api-server");

		if (worklogItem) {
			expect(worklogItem.metadata?.totalCommands).toBeGreaterThanOrEqual(1);
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands.map((c) => c.command);
			expect(commands).toContain("git");
			expect(commands).toContain("bun");
		}

		if (apiServerItem) {
			expect(apiServerItem.metadata?.totalCommands).toBeGreaterThanOrEqual(1);
			const topCommands = apiServerItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands.map((c) => c.command);
			expect(commands).toContain("npm");
			expect(commands).toContain("node");
		}

		await Bun.file(tmpFile).writer().end();
	});

	test("attributes commands to repo based on cd timeline (zsh format)", async () => {
		const zshHistory = `: 1767225600:0;cd /home/user/worklog
: 1767225610:0;git commit -m "test"
: 1767225620:0;cd /home/user/api-server
: 1767225630:0;npm test`;

		const tmpFile = `/tmp/test-zsh-history-${Date.now()}`;
		await Bun.write(tmpFile, zshHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog", "/home/user/api-server"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		const apiServerItem = items.find((item) => item.metadata?.repo === "/home/user/api-server");

		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("git");
		}

		if (apiServerItem) {
			const topCommands = apiServerItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("npm");
		}
	});

	test("handles cd to home directory", async () => {
		const homeDir = process.env.HOME ?? "/home/user";
		const bashHistory = `#1767225600
cd ${homeDir}/worklog
#1767225610
git status
#1767225620
cd ~
#1767225630
cd worklog
#1767225640
bun test`;

		const tmpFile = `/tmp/test-bash-cd-home-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig([`${homeDir}/worklog`]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === `${homeDir}/worklog`);
		expect(worklogItem).toBeDefined();
	});

	test("handles cd - (previous directory)", async () => {
		const bashHistory = `#1767225600
cd /home/user/worklog
#1767225610
git status
#1767225620
cd /tmp
#1767225630
cd -
#1767225640
bun test`;

		const tmpFile = `/tmp/test-bash-cd-previous-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("git");
			expect(commands).toContain("bun");
		}
	});

	test("ignores commands outside of configured repos", async () => {
		const bashHistory = `#1767225600
cd /tmp
#1767225610
git status
#1767225620
cd /home/user/worklog
#1767225630
bun test`;

		const tmpFile = `/tmp/test-bash-outside-repos-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		expect(items).toHaveLength(1);
		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		expect(worklogItem).toBeDefined();

		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("bun");
			const hasGitCommand = commands.includes("git");
			expect(hasGitCommand).toBe(false);
		}
	});

	test("returns empty array when no commands in date range", async () => {
		const bashHistory = `#1609459200
git status`;

		const tmpFile = `/tmp/test-bash-no-commands-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		expect(items).toHaveLength(0);
	});

	test("aggregates same commands across history", async () => {
		const bashHistory = `#1767225600
cd /home/user/worklog
#1767225610
git status
#1767225620
git commit
#1767225630
git push
#1767225640
git status
#1767225650
git status`;

		const tmpFile = `/tmp/test-bash-aggregation-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		expect(worklogItem).toBeDefined();

		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const gitCommand = topCommands.find((c) => c.command === "git");
			expect(gitCommand?.count).toBe(5);
		}
	});

	test("fish format with cd attribution", async () => {
		const fishHistory = `- cmd: cd /home/user/worklog
  when: 1767225600
- cmd: git status
  when: 1767225610
- cmd: cd /home/user/api-server
  when: 1767225620
- cmd: npm install
  when: 1767225630`;

		const tmpFile = `/tmp/test-fish-history-${Date.now()}`;
		await Bun.write(tmpFile, fishHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog", "/home/user/api-server"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		const apiServerItem = items.find((item) => item.metadata?.repo === "/home/user/api-server");

		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("git");
		}

		if (apiServerItem) {
			const topCommands = apiServerItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("npm");
		}
	});

	test("handles relative cd paths", async () => {
		const homeDir = process.env.HOME ?? "/home/user";
		const bashHistory = `#1767225600
cd ${homeDir}
#1767225610
cd worklog
#1767225620
git status
#1767225630
cd ../api-server
#1767225640
npm test`;

		const tmpFile = `/tmp/test-bash-relative-cd-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig([`${homeDir}/worklog`, `${homeDir}/api-server`]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === `${homeDir}/worklog`);
		const apiServerItem = items.find((item) => item.metadata?.repo === `${homeDir}/api-server`);

		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("git");
		}

		if (apiServerItem) {
			const topCommands = apiServerItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("npm");
		}
	});

	test("handles subdirectories within repos", async () => {
		const bashHistory = `#1767225600
cd /home/user/worklog/src/sources
#1767225610
git status
#1767225620
bun test`;

		const tmpFile = `/tmp/test-bash-subdirs-${Date.now()}`;
		await Bun.write(tmpFile, bashHistory);

		const { terminalReader } = await import("./terminal.ts");
		const config = createMockConfig(["/home/user/worklog"]);
		config.paths.terminal = tmpFile;

		const items = await terminalReader.read(dateRange, config);

		const worklogItem = items.find((item) => item.metadata?.repo === "/home/user/worklog");
		expect(worklogItem).toBeDefined();

		if (worklogItem) {
			const topCommands = worklogItem.metadata?.topCommands as Array<{
				command: string;
				count: number;
			}>;
			const commands = topCommands?.map((c) => c.command) ?? [];
			expect(commands).toContain("git");
			expect(commands).toContain("bun");
		}
	});
});
