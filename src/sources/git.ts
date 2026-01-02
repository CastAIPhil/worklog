import { format } from "date-fns";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import {
	extractBranchMergeInfo,
	isMergeCommit,
	isPullRequestMergeSubject,
	matchesGitIdentity,
} from "./gitMerge.ts";

interface GitCommit {
	hash: string;
	author: string;
	authorEmail: string;
	committer: string;
	committerEmail: string;
	date: Date;
	subject: string;
	body: string;
	parents: string[];
}

async function runGit(
	repoPath: string,
	args: string[],
): Promise<{ exitCode: number; stdout: string }> {
	const proc = Bun.spawn(["git", ...args], {
		cwd: repoPath,
		stdout: "pipe",
		stderr: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;

	return { exitCode, stdout };
}

async function getCommits(repoPath: string, dateRange: DateRange): Promise<GitCommit[]> {
	const commits: GitCommit[] = [];

	try {
		const isToday = dateRange.start.toDateString() === new Date().toDateString();
		const formatStr = "%H|%an|%ae|%cn|%ce|%aI|%P|%s|%b%x00";

		let gitArgs: string[];
		if (isToday) {
			gitArgs = ["log", "--since=1 day ago", `--format=${formatStr}`];
		} else {
			const since = format(dateRange.start, "yyyy-MM-dd");
			const until = format(dateRange.end, "yyyy-MM-dd'T'23:59:59");
			gitArgs = ["log", `--since=${since}`, `--until=${until}`, `--format=${formatStr}`];
		}

		const { exitCode, stdout } = await runGit(repoPath, gitArgs);
		if (exitCode !== 0) {
			return [];
		}

		const entries = stdout.split("\0").filter((e) => e.trim());

		for (const entry of entries) {
			const parts = entry.split("|");
			if (parts.length < 8) continue;

			const [hash, author, authorEmail, committer, committerEmail, dateStr, parents, ...rest] =
				parts;
			const subjectAndBody = rest.join("|");
			const [subject, ...bodyParts] = subjectAndBody.split("\n");

			if (
				!hash ||
				!author ||
				!authorEmail ||
				!committer ||
				!committerEmail ||
				!dateStr ||
				!subject
			) {
				continue;
			}

			commits.push({
				hash: hash.trim(),
				author: author.trim(),
				authorEmail: authorEmail.trim(),
				committer: committer.trim(),
				committerEmail: committerEmail.trim(),
				date: new Date(dateStr.trim()),
				subject: subject.trim(),
				body: bodyParts.join("\n").trim(),
				parents: (parents ?? "").trim().split(" ").filter(Boolean),
			});
		}
	} catch {
		return [];
	}

	return commits;
}

async function getRepoLocalUserEmail(repoPath: string): Promise<string | null> {
	try {
		const { exitCode, stdout } = await runGit(repoPath, ["config", "--local", "user.email"]);
		if (exitCode === 0 && stdout.trim()) {
			return stdout.trim();
		}
		return null;
	} catch {
		return null;
	}
}

async function getIdentityEmails(repoPath: string, config: Config): Promise<string[]> {
	const configured = config.gitIdentityEmails.map((e) => e.trim()).filter(Boolean);
	if (configured.length > 0) {
		return configured;
	}

	const repoEmail = await getRepoLocalUserEmail(repoPath);
	return repoEmail ? [repoEmail] : [];
}

function repoDisplayName(repoPath: string): string {
	return repoPath.split("/").pop() || repoPath;
}

function formatBranchMergeTitle(
	repoName: string,
	sourceBranch: string,
	targetBranch?: string,
): string {
	if (targetBranch) {
		return `[${repoName}] Merged branch ${sourceBranch} → ${targetBranch}`;
	}
	return `[${repoName}] Merged branch ${sourceBranch}`;
}

export const gitReader: SourceReader = {
	name: "git",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const items: WorkItem[] = [];

		for (const repoPath of config.gitRepos) {
			const expandedPath = expandPath(repoPath);

			try {
				const [commits, identityEmails] = await Promise.all([
					getCommits(expandedPath, dateRange),
					getIdentityEmails(expandedPath, config),
				]);

				for (const commit of commits) {
					if (isMergeCommit(commit.parents) && !isPullRequestMergeSubject(commit.subject)) {
						const mergeInfo = extractBranchMergeInfo(commit.subject);
						if (mergeInfo && matchesGitIdentity(commit, identityEmails)) {
							items.push({
								source: "git",
								timestamp: commit.date,
								title: formatBranchMergeTitle(
									repoDisplayName(repoPath),
									mergeInfo.sourceBranch,
									mergeInfo.targetBranch,
								),
								description: commit.body || undefined,
								metadata: {
									type: "branch",
									action: "merged",
									repo: repoPath,
									sourceBranch: mergeInfo.sourceBranch,
									...(mergeInfo.targetBranch ? { targetBranch: mergeInfo.targetBranch } : {}),
								},
							});
						}
					}

					items.push({
						source: "git",
						timestamp: commit.date,
						title: `[${repoDisplayName(repoPath)}] ${commit.subject}`,
						description: commit.body || undefined,
						metadata: {
							repo: repoPath,
							hash: commit.hash,
							author: commit.author,
						},
					});
				}
			} catch {}
		}

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
