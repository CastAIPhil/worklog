import { format } from "date-fns";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";

interface GitCommit {
	hash: string;
	author: string;
	date: Date;
	subject: string;
	body: string;
}

async function getCommits(repoPath: string, dateRange: DateRange): Promise<GitCommit[]> {
	const commits: GitCommit[] = [];

	try {
		// For today, use a simpler approach that works reliably
		const isToday = dateRange.start.toDateString() === new Date().toDateString();

		let gitArgs: string[];
		if (isToday) {
			gitArgs = ["git", "log", `--since="1 day ago"`, "--format=%H|%an|%aI|%s|%b%x00"];
		} else {
			const since = format(dateRange.start, "yyyy-MM-dd");
			const until = format(dateRange.end, "yyyy-MM-dd'T'23:59:59");
			gitArgs = [
				"git",
				"log",
				`--since=${since}`,
				`--until=${until}`,
				"--format=%H|%an|%aI|%s|%b%x00",
			];
		}

		const proc = Bun.spawn(gitArgs, {
			cwd: repoPath,
			stdout: "pipe",
			stderr: "pipe",
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		if (exitCode !== 0) {
			return [];
		}

		const entries = output.split("\0").filter((e) => e.trim());

		for (const entry of entries) {
			const parts = entry.split("|");
			if (parts.length >= 4) {
				const [hash, author, dateStr, ...rest] = parts;
				const subjectAndBody = rest.join("|");
				const [subject, ...bodyParts] = subjectAndBody.split("\n");

				if (hash && author && dateStr && subject) {
					commits.push({
						hash: hash.trim(),
						author: author.trim(),
						date: new Date(dateStr.trim()),
						subject: subject.trim(),
						body: bodyParts.join("\n").trim(),
					});
				}
			}
		}
	} catch {
		return [];
	}

	return commits;
}

export const gitReader: SourceReader = {
	name: "git",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const items: WorkItem[] = [];

		for (const repoPath of config.gitRepos) {
			const expandedPath = expandPath(repoPath);

			try {
				const commits = await getCommits(expandedPath, dateRange);

				for (const commit of commits) {
					items.push({
						source: "git",
						timestamp: commit.date,
						title: `[${repoPath.split("/").pop()}] ${commit.subject}`,
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
