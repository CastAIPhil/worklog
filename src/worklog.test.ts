import { describe, expect, test } from "bun:test";
import { spawn } from "bun";

describe("worklog CLI e2e", () => {
	test("shows help output", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts", "--help"], {
			stdout: "pipe",
			stderr: "pipe",
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
		});

		const output = await new Response(proc.stdout).text();
		expect(output.trim()).toBe("2.0.0");
	});

	test("handles invalid date gracefully", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts", "--date", "invalid"], {
			stdout: "pipe",
			stderr: "pipe",
		});

		const exitCode = await proc.exited;
		expect(exitCode).toBe(1);

		const stderr = await new Response(proc.stderr).text();
		expect(stderr).toContain("Error");
	});

	test("runs with default options (may produce empty output)", async () => {
		const proc = spawn(["bun", "run", "bin/worklog.ts"], {
			stdout: "pipe",
			stderr: "pipe",
			env: {
				...process.env,
				WORKLOG_SOURCES: "git",
			},
		});

		const exitCode = await proc.exited;
		expect(exitCode).toBe(0);
	});
});
