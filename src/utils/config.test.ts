import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expandPath, loadConfig } from "../utils/config.ts";

describe("expandPath", () => {
	const home = process.env.HOME || "/tmp";

	test("expands tilde alone to home directory", () => {
		expect(expandPath("~")).toBe(home);
	});

	test("expands tilde followed by forward slash", () => {
		expect(expandPath("~/test")).toBe(`${home}/test`);
		expect(expandPath("~/path/to/file")).toBe(`${home}/path/to/file`);
	});

	test("expands tilde followed by backslash", () => {
		const result = expandPath("~\\test");
		expect(result).toStartWith(home);
		expect(result).toContain("test");
	});

	test("does NOT expand tilde followed by username", () => {
		expect(expandPath("~user")).toBe("~user");
		expect(expandPath("~alice/path")).toBe("~alice/path");
		expect(expandPath("~root")).toBe("~root");
	});

	test("leaves absolute paths unchanged", () => {
		expect(expandPath("/absolute/path")).toBe("/absolute/path");
	});

	test("leaves relative paths unchanged", () => {
		expect(expandPath("relative/path")).toBe("relative/path");
	});
});

describe("loadConfig timezone", () => {
	const originalHome = process.env.HOME;

	afterEach(async () => {
		process.env.HOME = originalHome;
		delete process.env.WORKLOG_TIMEZONE;
	});

	async function withTempHome(fn: (home: string) => Promise<void>) {
		const home = join(tmpdir(), `worklog-config-test-${Date.now()}`);
		await mkdir(home, { recursive: true });
		process.env.HOME = home;
		try {
			await fn(home);
		} finally {
			try {
				await rm(home, { recursive: true });
			} catch {}
		}
	}

	test("defaults timezone to system timezone", async () => {
		await withTempHome(async () => {
			const config = await loadConfig();
			expect(config.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
		});
	});

	test("accepts timezone from config.json", async () => {
		await withTempHome(async (home) => {
			const configDir = join(home, ".config", "worklog");
			await mkdir(configDir, { recursive: true });
			await Bun.write(
				join(configDir, "config.json"),
				JSON.stringify({ timezone: "America/New_York" }),
			);

			const config = await loadConfig();
			expect(config.timezone).toBe("America/New_York");
		});
	});

	test("rejects invalid timezone", async () => {
		await withTempHome(async (home) => {
			const configDir = join(home, ".config", "worklog");
			await mkdir(configDir, { recursive: true });
			await Bun.write(
				join(configDir, "config.json"),
				JSON.stringify({ timezone: "Not/A_Timezone" }),
			);

			await expect(loadConfig()).rejects.toThrow("timezone");
		});
	});

	test("allows WORKLOG_TIMEZONE env override", async () => {
		await withTempHome(async () => {
			process.env.WORKLOG_TIMEZONE = "UTC";
			const config = await loadConfig();
			expect(config.timezone).toBe("UTC");
		});
	});
});
