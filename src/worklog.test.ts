import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "bun";

const TEST_HOME = join(tmpdir(), `worklog-cli-test-${Date.now()}`);

describe("worklog CLI e2e", () => {
	beforeAll(async () => {
		await mkdir(TEST_HOME, { recursive: true });
	});

	afterAll(async () => {
		try {
			await rm(TEST_HOME, { recursive: true });
		} catch {}
	});

	function withTestHome(
		env?: Record<string, string | undefined>,
	): Record<string, string | undefined> {
		return {
			...process.env,
			HOME: TEST_HOME,
			...env,
		};
	}

	test("shows help output", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts", "--help"], {
			stdout: "pipe",
			stderr: "pipe",
			env: withTestHome(),
		});

		const output = await new Response(proc.stdout).text();
		expect(output).toContain("worklog");
		expect(output).toContain("--help");
		expect(output).toContain("--verbose");
	});

	test("shows version info", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts", "--version"], {
			stdout: "pipe",
			stderr: "pipe",
			env: withTestHome(),
		});

		const output = await new Response(proc.stdout).text();
		expect(output.trim()).toBe("2.0.0");
	});

	test("handles invalid date gracefully", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts", "--date", "invalid"], {
			stdout: "pipe",
			stderr: "pipe",
			env: withTestHome(),
		});

		const exitCode = await proc.exited;
		expect(exitCode).toBe(1);

		const stderr = await new Response(proc.stderr).text();
		expect(stderr).toContain("Error");
	});

	test("shows help when run with no args", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts"], {
			stdout: "pipe",
			stderr: "pipe",
			env: withTestHome({ WORKLOG_SOURCES: "git" }),
		});

		const exitCode = await proc.exited;
		expect(exitCode).toBe(0);

		const output = await new Response(proc.stdout).text();
		expect(output).toContain("Usage");
		expect(output).toContain("worklog");
	});

	test("parses comma-separated sources correctly", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts", "--sources", "opencode,claude,codex"], {
			stdout: "pipe",
			stderr: "pipe",
			env: withTestHome(),
		});

		const exitCode = await proc.exited;
		expect(exitCode).toBe(0);
	});

	test("parses comma-separated repos correctly", async () => {
		const proc = spawn(
			["bun", "run", "bin/worklog.ts", "--repos", "~/code/project1,~/code/project2"],
			{
				stdout: "pipe",
				stderr: "pipe",
				env: withTestHome({ WORKLOG_SOURCES: "git" }),
			},
		);

		const exitCode = await proc.exited;
		expect(exitCode).toBe(0);
	});

	test("handles sources and repos together", async () => {
		const proc = spawn(
			["bun", "run", "bin/worklog.ts", "--sources", "git,opencode", "--repos", "~/code/test"],
			{
				stdout: "pipe",
				stderr: "pipe",
				env: withTestHome({ WORKLOG_GIT_REPOS: "" }),
			},
		);

		const exitCode = await proc.exited;
		expect(exitCode).toBe(0);
	});
});
