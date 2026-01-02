import { format } from "date-fns";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import {
	buildGitHubPrWorkItem,
	dedupeGitHubPrWorkItems,
	type GitHubPullRequestSearchResult,
} from "./githubPrs.ts";

interface GitHubEvent {
	type: string;
	created_at: string;
	repo: { name: string };
	payload: {
		action?: string;
		commits?: Array<{ message: string }>;
		pull_request?: { title: string; number: number; merged?: boolean };
		issue?: { title: string; number: number };
		review?: { state: string };
	};
}

interface GitHubUser {
	login: string;
}

interface GitHubPullRequestApiResponse {
	number: number;
	title: string;
	html_url: string;
	body?: string | null;
}

async function runGh(args: string[]): Promise<{ exitCode: number; stdout: string }> {
	const proc = Bun.spawn(["gh", ...args], {
		stdout: "pipe",
		stderr: "pipe",
	});

	const stdout = await new Response(proc.stdout).text();
	const exitCode = await proc.exited;

	return { exitCode, stdout };
}

async function getAuthenticatedGitHubLogin(): Promise<string | null> {
	try {
		const { exitCode, stdout } = await runGh(["api", "user"]);
		if (exitCode !== 0) {
			return null;
		}

		const user = JSON.parse(stdout) as GitHubUser;
		if (!user.login || typeof user.login !== "string") {
			return null;
		}

		return user.login;
	} catch {
		return null;
	}
}

async function fetchGitHubEventsPage(
	user: string,
	page: number,
	perPage: number,
): Promise<GitHubEvent[]> {
	try {
		const { exitCode, stdout } = await runGh([
			"api",
			`/users/${user}/events?per_page=${perPage}&page=${page}`,
		]);

		if (exitCode !== 0) {
			return [];
		}

		const events = JSON.parse(stdout) as GitHubEvent[];
		if (!Array.isArray(events)) {
			return [];
		}

		return events;
	} catch {
		return [];
	}
}

async function getGitHubEvents(user: string, dateRange: DateRange): Promise<GitHubEvent[]> {
	try {
		const perPage = 100;
		const maxPages = 3;
		const results: GitHubEvent[] = [];

		for (let page = 1; page <= maxPages; page++) {
			if (process.env.WORKLOG_PROGRESS === "1" && process.stderr.isTTY) {
				console.error(`github: events page ${page}/${maxPages}`);
			}

			const events = await fetchGitHubEventsPage(user, page, perPage);
			if (events.length === 0) {
				break;
			}

			for (const event of events) {
				const eventDate = new Date(event.created_at);
				if (eventDate >= dateRange.start && eventDate <= dateRange.end) {
					results.push(event);
				}
			}

			const oldestEvent = events[events.length - 1];
			if (oldestEvent) {
				const oldestDate = new Date(oldestEvent.created_at);
				if (oldestDate < dateRange.start) {
					break;
				}
			}
		}

		return results;
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
			return null;
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

const PR_JSON_FIELDS_WITH_BODY = "number,title,url,repository,body,closedAt,createdAt";
const PR_JSON_FIELDS_NO_BODY = "number,title,url,repository,closedAt,createdAt";

async function ghSearchPrsRaw(
	args: string[],
	jsonFields: string,
): Promise<{ ok: boolean; prs: GitHubPullRequestSearchResult[] }> {
	try {
		const { exitCode, stdout } = await runGh([
			"search",
			"prs",
			...args,
			"--json",
			jsonFields,
			"--limit",
			"1000",
		]);

		if (exitCode !== 0) {
			return { ok: false, prs: [] };
		}

		const prs = JSON.parse(stdout) as GitHubPullRequestSearchResult[];
		if (!Array.isArray(prs)) {
			return { ok: false, prs: [] };
		}

		return { ok: true, prs };
	} catch {
		return { ok: false, prs: [] };
	}
}

async function fetchPullRequestDetails(
	repo: string,
	number: number,
): Promise<Pick<GitHubPullRequestSearchResult, "body" | "title" | "url"> | null> {
	try {
		const { exitCode, stdout } = await runGh(["api", `repos/${repo}/pulls/${number}`]);
		if (exitCode !== 0) {
			return null;
		}

		const pr = JSON.parse(stdout) as GitHubPullRequestApiResponse;
		if (typeof pr.title !== "string" || typeof pr.html_url !== "string") {
			return null;
		}

		return {
			title: pr.title,
			url: pr.html_url,
			body: pr.body ?? "",
		};
	} catch {
		return null;
	}
}

async function ghSearchPrsWithBodyFallback(
	args: string[],
): Promise<GitHubPullRequestSearchResult[]> {
	const withBody = await ghSearchPrsRaw(args, PR_JSON_FIELDS_WITH_BODY);
	if (withBody.ok) return withBody.prs;

	const withoutBody = await ghSearchPrsRaw(args, PR_JSON_FIELDS_NO_BODY);
	if (!withoutBody.ok) return [];

	const prs = withoutBody.prs;
	const enriched: GitHubPullRequestSearchResult[] = [];

	for (const pr of prs) {
		const repo = pr.repository?.nameWithOwner;
		if (typeof repo !== "string" || !repo.trim()) {
			continue;
		}

		if (typeof pr.body === "string") {
			enriched.push(pr);
			continue;
		}

		const details = await fetchPullRequestDetails(repo, pr.number);
		if (details) {
			enriched.push({ ...pr, ...details });
		} else {
			enriched.push(pr);
		}
	}

	return enriched;
}

function isWithinRange(timestamp: Date, dateRange: DateRange): boolean {
	return timestamp >= dateRange.start && timestamp <= dateRange.end;
}

async function getPullRequestItems(user: string, dateRange: DateRange): Promise<WorkItem[]> {
	try {
		const since = format(dateRange.start, "yyyy-MM-dd");
		const until = format(dateRange.end, "yyyy-MM-dd");
		const createdRange = `${since}..${until}`;
		const mergedAtRange = `${since}..${until}`;

		const [openedPRs, mergedAuthored, mergedBy] = await Promise.all([
			ghSearchPrsWithBodyFallback(["--author", user, "--created", createdRange]),
			ghSearchPrsWithBodyFallback(["--author", user, "--merged", "--merged-at", mergedAtRange]),
			ghSearchPrsWithBodyFallback([`merged-by:${user}`, "--merged", "--merged-at", mergedAtRange]),
		]);

		const openedItems = openedPRs
			.map((pr) => buildGitHubPrWorkItem(pr, "opened"))
			.filter((item): item is WorkItem => item !== null)
			.filter((item) => isWithinRange(item.timestamp, dateRange));

		const mergedItems = [...mergedAuthored, ...mergedBy]
			.map((pr) => buildGitHubPrWorkItem(pr, "merged"))
			.filter((item): item is WorkItem => item !== null)
			.filter((item) => isWithinRange(item.timestamp, dateRange));

		return dedupeGitHubPrWorkItems([...openedItems, ...mergedItems]);
	} catch {
		return [];
	}
}

export const githubReader: SourceReader = {
	name: "github",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const configuredUser = config.githubUser;
		const login = configuredUser ?? (await getAuthenticatedGitHubLogin());

		const [events, pullRequests] = await Promise.all([
			login ? getGitHubEvents(login, dateRange) : Promise.resolve([]),
			login ? getPullRequestItems(login, dateRange) : Promise.resolve([]),
		]);

		const items: WorkItem[] = [];

		for (const event of events) {
			const item = eventToWorkItem(event);
			if (item) {
				items.push(item);
			}
		}

		items.push(...pullRequests);

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
