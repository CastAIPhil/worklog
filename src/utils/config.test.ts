import { describe, expect, test } from "bun:test";
import { expandPath } from "../utils/config.ts";

describe("expandPath", () => {
	test("expands tilde to home directory", () => {
		const home = process.env.HOME || "/tmp";
		expect(expandPath("~/test")).toBe(`${home}/test`);
		expect(expandPath("~")).toBe(home);
	});

	test("leaves absolute paths unchanged", () => {
		expect(expandPath("/absolute/path")).toBe("/absolute/path");
	});

	test("leaves relative paths unchanged", () => {
		expect(expandPath("relative/path")).toBe("relative/path");
	});
});
