import type { WorkItem } from "../types.ts";
import { extractPrSummary } from "../utils/prSummary.ts";

export type GitHubPrAction = "opened" | "merged";

export interface GitHubPullRequestSearchResult {
	number: number;
	title: string;
	url: string;
	body?: string | null;
	createdAt?: string | null;
	closedAt?: string | null;
	repository?: {
		nameWithOwner?: string | null;
	} | null;
}

function isValidDate(date: Date): boolean {
	return !Number.isNaN(date.getTime());
}

function getRepoNameWithOwner(pr: GitHubPullRequestSearchResult): string | null {
	const repo = pr.repository?.nameWithOwner;
	return typeof repo === "string" && repo.trim() ? repo.trim() : null;
}

export function buildGitHubPrWorkItem(
	pr: GitHubPullRequestSearchResult,
	action: GitHubPrAction,
): WorkItem | null {
	const repo = getRepoNameWithOwner(pr);
	if (!repo) return null;

	if (typeof pr.number !== "number" || !Number.isFinite(pr.number)) return null;
	if (typeof pr.title !== "string" || !pr.title.trim()) return null;
	if (typeof pr.url !== "string" || !pr.url.trim()) return null;

	const timestampStr = action === "opened" ? pr.createdAt : pr.closedAt;
	if (typeof timestampStr !== "string" || !timestampStr.trim()) return null;

	const timestamp = new Date(timestampStr);
	if (!isValidDate(timestamp)) return null;

	const body = typeof pr.body === "string" ? pr.body : "";
	const summary = extractPrSummary(body) ?? pr.title;

	const readableAction = action === "opened" ? "opened" : "merged";

	return {
		source: "github",
		timestamp,
		title: `[${repo}] PR #${pr.number} ${readableAction}: ${pr.title}`,
		metadata: {
			type: "pr",
			action,
			repo,
			number: pr.number,
			url: pr.url,
			title: pr.title,
			summary,
		},
	};
}

function prDedupeKey(item: WorkItem): string | null {
	const metadata = item.metadata;
	if (!metadata || typeof metadata !== "object") return null;

	const type = (metadata as Record<string, unknown>).type;
	if (type !== "pr") return null;

	const repo = (metadata as Record<string, unknown>).repo;
	const number = (metadata as Record<string, unknown>).number;
	const action = (metadata as Record<string, unknown>).action;

	if (typeof repo !== "string" || !repo) return null;
	if (typeof number !== "number" || !Number.isFinite(number)) return null;
	if (action !== "opened" && action !== "merged") return null;

	return `${repo}#${number}#${action}`;
}

export function dedupeGitHubPrWorkItems(items: WorkItem[]): WorkItem[] {
	const out: WorkItem[] = [];
	const seen = new Set<string>();

	for (const item of items) {
		const key = prDedupeKey(item);
		if (!key) {
			out.push(item);
			continue;
		}

		if (seen.has(key)) continue;
		seen.add(key);
		out.push(item);
	}

	return out;
}
