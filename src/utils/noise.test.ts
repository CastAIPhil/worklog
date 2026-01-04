import { describe, expect, test } from "bun:test";
import { isNoiseWorkItem } from "./noise.ts";

describe("isNoiseWorkItem", () => {
	test("matches title case-insensitively", () => {
		expect(
			isNoiseWorkItem({
				title: "REQUEST INTERRUPTED BY USER",
			}),
		).toBe(true);
	});

	test("matches bracketed variants", () => {
		expect(
			isNoiseWorkItem({
				title: "[Request interrupted by user]",
			}),
		).toBe(true);
	});

	test("matches 'for tool use' variants", () => {
		expect(
			isNoiseWorkItem({
				title: "request interrupted by user for tool use",
			}),
		).toBe(true);
	});

	test("matches description even when title is unrelated", () => {
		expect(
			isNoiseWorkItem({
				title: "Some other title",
				description: "... request interrupted by user ...",
			}),
		).toBe(true);
	});

	test("does not match similar but different phrasing", () => {
		expect(
			isNoiseWorkItem({
				title: "request interrupted by a user",
			}),
		).toBe(false);
	});
});
