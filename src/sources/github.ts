import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";

interface GitHubEvent {
	type: string;
	created_at: string;
	repo: { name: string };
	payload: {
		action?: string;
		commits?: Array<{ message: string }>;
		pull_request?: { title: string; number: number };
		issue?: { title: string; number: number };
		review?: { state: string };
	};
}

async function getGitHubEvents(user: string, dateRange: DateRange): Promise<GitHubEvent[]> {
	try {
		const proc = Bun.spawn(["gh", "api", `/users/${user}/events`, "--paginate"], {
			stdout: "pipe",
			stderr: "pipe",
		});

		const output = await new Response(proc.stdout).text();
		const exitCode = await proc.exited;

		if (exitCode !== 0) {
			return [];
		}

		const events = JSON.parse(output) as GitHubEvent[];

		return events.filter((event) => {
			const eventDate = new Date(event.created_at);
			return eventDate >= dateRange.start && eventDate <= dateRange.end;
		});
	} catch {
		return [];
	}
}

function eventToWorkItem(event: GitHubEvent): WorkItem | null {
	const timestamp = new Date(event.created_at);
	const repo = event.repo.name;

	switch (event.type) {
		case "PushEvent": {
			const commits = event.payload.commits ?? [];
			if (commits.length === 0) return null;
			const firstCommit = commits[0]?.message?.split("\n")[0] ?? "Push";
			return {
				source: "github",
				timestamp,
				title: `[${repo}] Push: ${firstCommit}`,
				description: commits.length > 1 ? `${commits.length} commits` : undefined,
				metadata: { type: "push", repo, commitCount: commits.length },
			};
		}

		case "PullRequestEvent": {
			const pr = event.payload.pull_request;
			if (!pr) return null;
			const action = event.payload.action ?? "updated";
			return {
				source: "github",
				timestamp,
				title: `[${repo}] PR #${pr.number} ${action}: ${pr.title}`,
				metadata: { type: "pr", repo, number: pr.number, action },
			};
		}

		case "IssuesEvent": {
			const issue = event.payload.issue;
			if (!issue) return null;
			const action = event.payload.action ?? "updated";
			return {
				source: "github",
				timestamp,
				title: `[${repo}] Issue #${issue.number} ${action}: ${issue.title}`,
				metadata: { type: "issue", repo, number: issue.number, action },
			};
		}

		case "PullRequestReviewEvent": {
			const pr = event.payload.pull_request;
			const review = event.payload.review;
			if (!pr || !review) return null;
			return {
				source: "github",
				timestamp,
				title: `[${repo}] Reviewed PR #${pr.number}: ${pr.title}`,
				description: `Review: ${review.state}`,
				metadata: { type: "review", repo, number: pr.number, state: review.state },
			};
		}

		case "IssueCommentEvent": {
			const issue = event.payload.issue;
			if (!issue) return null;
			return {
				source: "github",
				timestamp,
				title: `[${repo}] Commented on #${issue.number}: ${issue.title}`,
				metadata: { type: "comment", repo, number: issue.number },
			};
		}

		default:
			return null;
	}
}

export const githubReader: SourceReader = {
	name: "github",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const user = config.githubUser;
		if (!user) {
			return [];
		}

		const events = await getGitHubEvents(user, dateRange);
		const items: WorkItem[] = [];

		for (const event of events) {
			const item = eventToWorkItem(event);
			if (item) {
				items.push(item);
			}
		}

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
