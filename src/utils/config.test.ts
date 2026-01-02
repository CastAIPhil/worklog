import { describe, expect, test } from "bun:test";
import { expandPath } from "../utils/config.ts";

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
