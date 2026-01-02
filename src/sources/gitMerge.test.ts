import { describe, expect, test } from "bun:test";
import {
	extractBranchMergeInfo,
	isMergeCommit,
	isPullRequestMergeSubject,
	matchesGitIdentity,
} from "./gitMerge.ts";

describe("gitMerge helpers", () => {
	test("detects PR merge subjects", () => {
		expect(isPullRequestMergeSubject("Merge pull request #123 from org/feature/foo")).toBe(true);
		expect(isPullRequestMergeSubject("Merge branch 'feature/foo' into main")).toBe(false);
	});

	test("extracts source and target from merge branch subject", () => {
		expect(extractBranchMergeInfo("Merge branch 'feature/foo' into main")).toEqual({
			sourceBranch: "feature/foo",
			targetBranch: "main",
		});
	});

	test("extracts remote-tracking merges", () => {
		expect(
			extractBranchMergeInfo("Merge remote-tracking branch 'origin/feature/foo' into main"),
		).toEqual({
			sourceBranch: "origin/feature/foo",
			targetBranch: "main",
		});
	});

	test("allows targetBranch to be omitted", () => {
		expect(extractBranchMergeInfo("Merge branch 'feature/foo'")).toEqual({
			sourceBranch: "feature/foo",
		});
	});

	test("merge commits have >=2 parents", () => {
		expect(isMergeCommit([])).toBe(false);
		expect(isMergeCommit(["a"])).toBe(false);
		expect(isMergeCommit(["a", "b"])).toBe(true);
	});

	test("matches identities against author or committer email", () => {
		const commit = { authorEmail: "me@example.com", committerEmail: "other@example.com" };

		expect(matchesGitIdentity(commit, ["ME@EXAMPLE.COM"])).toBe(true);
		expect(matchesGitIdentity(commit, ["other@example.com"])).toBe(true);
		expect(matchesGitIdentity(commit, ["nope@example.com"])).toBe(false);
	});
});
