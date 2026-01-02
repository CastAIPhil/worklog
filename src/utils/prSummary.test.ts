import { describe, expect, test } from "bun:test";
import { extractPrSummary } from "./prSummary.ts";

describe("extractPrSummary", () => {
	test("prefers content under Summary-like headings", () => {
		const body = `
## Summary

This adds rate limiting middleware. It prevents API abuse by limiting requests to 100 per minute. It also updates docs.

## Details
More info.
		`;

		expect(extractPrSummary(body)).toBe(
			"This adds rate limiting middleware. It prevents API abuse by limiting requests to 100 per minute.",
		);
	});

	test("falls back to the first meaningful paragraph near the top", () => {
		const body = `
<!-- PR template -->

- [ ] Checkbox one
- [x] Checkbox two

---

This PR fixes a crash when the config file is empty. It adds a regression test.

More details later.
		`;

		expect(extractPrSummary(body)).toBe(
			"This PR fixes a crash when the config file is empty. It adds a regression test.",
		);
	});

	test("skips template noise (comments, separators, checklists)", () => {
		const body = `
<!-- fill this in -->

## Summary

TBD

## Overview

Introduces lenient markdown parsing for PR bodies. Skips template noise and common placeholders.

- [ ] Checklist item
		`;

		expect(extractPrSummary(body)).toBe(
			"Introduces lenient markdown parsing for PR bodies. Skips template noise and common placeholders.",
		);
	});

	test("skips N/A placeholder content", () => {
		const body = `
Summary: N/A

Context:
Implements search with fuzzy matching.
		`;

		expect(extractPrSummary(body)).toBe("Implements search with fuzzy matching.");
	});

	test("skips TBD placeholder content", () => {
		const body = `
## Summary

TBD

## Context

Refactors the sync worker to batch API calls.
		`;

		expect(extractPrSummary(body)).toBe("Refactors the sync worker to batch API calls.");
	});

	test("returns null when nothing meaningful exists", () => {
		const body = `
<!-- template only -->

## Summary

TBD

- [ ] A
- [ ] B

---
		`;

		expect(extractPrSummary(body)).toBeNull();
	});
});
