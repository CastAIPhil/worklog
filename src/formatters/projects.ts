import { format, startOfWeek } from "date-fns";
import {
	extractTicketsFromCommits,
	getCommitSubjects,
	getGitHubDescriptions,
	getSessionDescriptions,
	type TicketInfo,
} from "../aggregator.ts";
import type { ContextCluster } from "../context/analyzer.ts";
import type { SmartSummaryResult } from "../llm.ts";
import type {
	DailyProjectActivity,
	ProjectActivity,
	ProjectWorkSummary,
	WorkItem,
} from "../types.ts";
import { cleanSubject } from "../utils/commits.ts";
import {
	formatDateRange,
	getMonthLabel,
	getPeriodType,
	getQuarterLabel,
	type PeriodType,
} from "../utils/dates.ts";
import { formatTrendSummary } from "../utils/trends.ts";

/** Check if a summary covers only a single day */
function isSingleDay(summary: ProjectWorkSummary): boolean {
	const start = summary.dateRange.start;
	const end = summary.dateRange.end;
	return (
		start.getFullYear() === end.getFullYear() &&
		start.getMonth() === end.getMonth() &&
		start.getDate() === end.getDate()
	);
}

/**
 * Format ticket references for display.
 * @param tickets - Array of ticket references
 * @param style - "compact" for IDs only, "markdown" for markdown links
 */
function formatTicketRefs(
	tickets: TicketInfo[],
	style: "compact" | "markdown" = "compact",
): string {
	if (tickets.length === 0) return "";

	if (style === "markdown") {
		return tickets.map((t) => (t.url ? `[${t.id}](${t.url})` : t.id)).join(", ");
	}

	return tickets.map((t) => t.id).join(", ");
}

function formatDailyProject(
	project: ProjectActivity,
	daily: DailyProjectActivity,
	verbose: boolean,
): string {
	const split = splitDailyProjectActivity(daily);
	const remainder: DailyProjectActivity = {
		...daily,
		commits: split.commits,
		githubActivity: split.githubActivity,
		otherActivity: split.otherActivity,
	};

	if (!verbose) {
		const lines: string[] = [];
		lines.push(`**${project.projectName}**:`);

		for (const pr of split.prsOpened) {
			lines.push(`- ${formatPrLine(pr)}`);
		}
		for (const pr of split.prsMerged) {
			lines.push(`- ${formatPrLine(pr)}`);
		}
		for (const branch of split.branchMerges) {
			lines.push(`- ${formatBranchMergeLine(branch, "→")}`);
		}

		let parts = daily.summary ? [daily.summary] : getEnhancedSummaryParts(remainder);
		if (
			parts.length === 1 &&
			parts[0] === "Development activity" &&
			split.prsOpened.length + split.prsMerged.length + split.branchMerges.length > 0
		) {
			parts = [];
		}

		for (const part of parts) {
			lines.push(`- ${part}`);
		}

		return lines.join("\n");
	}

	const lines: string[] = [];
	lines.push(`## ${project.projectName}`);

	const summary = daily.summary ?? generateNarrativeSummary(remainder);
	lines.push(`**Summary**: ${summary}`);
	lines.push("");

	if (split.prsOpened.length + split.prsMerged.length + split.branchMerges.length > 0) {
		for (const pr of split.prsOpened) {
			lines.push(`- ${formatPrLine(pr)}`);
		}
		for (const pr of split.prsMerged) {
			lines.push(`- ${formatPrLine(pr)}`);
		}
		for (const branch of split.branchMerges) {
			lines.push(`- ${formatBranchMergeLine(branch, "→")}`);
		}
		lines.push("");
	}

	if (remainder.commits.length > 0) {
		const subjects = getCommitSubjects(remainder.commits);
		const groups = groupCommitsByType(subjects);

		for (const group of groups) {
			lines.push(`**${group.label}** (${group.subjects.length}):`);
			for (const subject of group.subjects) {
				lines.push(`- ${subject}`);
			}
			lines.push("");
		}

		// Show related tickets if any
		const tickets = extractTicketsFromCommits(remainder.commits);
		if (tickets.length > 0) {
			lines.push(`**Related Tickets**: ${formatTicketRefs(tickets, "markdown")}`);
			lines.push("");
		}
	}

	if (remainder.sessions.length > 0) {
		lines.push(`**AI Sessions** (${remainder.sessions.length}):`);
		const descriptions = getSessionDescriptions(remainder.sessions);
		for (const desc of descriptions) {
			lines.push(`- ${desc}`);
		}
		lines.push("");
	}

	if (remainder.githubActivity.length > 0) {
		lines.push(`**GitHub** (${remainder.githubActivity.length}):`);
		const descriptions = getGitHubDescriptions(remainder.githubActivity);
		for (const desc of descriptions) {
			lines.push(`- ${desc}`);
		}
		lines.push("");
	}

	if (remainder.otherActivity && remainder.otherActivity.length > 0) {
		lines.push(`**Other Activity** (${remainder.otherActivity.length}):`);
		for (const item of remainder.otherActivity) {
			let title = item.title;
			const bracketMatch = /^\[([^\]]+)\]\s*/.exec(title);
			if (bracketMatch) {
				title = title.slice(bracketMatch[0].length);
			}
			lines.push(`- ${title}`);
		}
		lines.push("");
	}

	return lines.join("\n");
}

function getEnhancedSummaryParts(activity: DailyProjectActivity): string[] {
	const parts: string[] = [];

	if (activity.commits.length > 0) {
		const subjects = getCommitSubjects(activity.commits);
		if (subjects.length <= 3) {
			parts.push(...subjects.map((s) => cleanSubject(s)));
		} else {
			const first = subjects[0];
			if (first) {
				parts.push(cleanSubject(first));
			}
		}
	}

	if (parts.length === 0 && activity.sessions.length > 0) {
		const descriptions = getSessionDescriptions(activity.sessions);
		const first = descriptions[0];
		if (first) {
			parts.push(first);
		}
	}

	if (parts.length === 0 && activity.githubActivity.length > 0) {
		const descriptions = getGitHubDescriptions(activity.githubActivity);
		const first = descriptions[0];
		if (first) {
			parts.push(first);
		}
	}

	if (parts.length === 0 && activity.otherActivity && activity.otherActivity.length > 0) {
		const first = activity.otherActivity[0];
		if (first) {
			let title = first.title;
			const bracketMatch = /^\[([^\]]+)\]\s*/.exec(title);
			if (bracketMatch) {
				title = title.slice(bracketMatch[0].length);
			}
			parts.push(title);
		}
	}

	if (parts.length === 0) {
		parts.push("Development activity");
	}

	return parts;
}

function generateEnhancedSummary(activity: DailyProjectActivity): string {
	const parts = getEnhancedSummaryParts(activity);
	return parts.join("; ");
}

function generateNarrativeSummary(activity: DailyProjectActivity): string {
	const parts: string[] = [];

	const commitCount = activity.commits.length;
	const sessionCount = activity.sessions.length;
	const githubCount = activity.githubActivity.length;
	const otherCount = activity.otherActivity ? activity.otherActivity.length : 0;

	if (commitCount > 0) {
		const subjects = getCommitSubjects(activity.commits);
		const types = analyzeCommitTypes(subjects);

		if (types.length > 0) {
			parts.push(types.join(", "));
		} else {
			parts.push(`${commitCount} commit${commitCount > 1 ? "s" : ""}`);
		}
	}

	if (sessionCount > 0) {
		parts.push(`${sessionCount} AI session${sessionCount > 1 ? "s" : ""}`);
	}

	if (githubCount > 0) {
		parts.push(`${githubCount} GitHub event${githubCount > 1 ? "s" : ""}`);
	}

	if (otherCount > 0 && activity.otherActivity) {
		const sources = new Set(activity.otherActivity.map((item) => item.source));
		const sourceNames = Array.from(sources).join("/");
		parts.push(`${sourceNames} activity`);
	}

	if (parts.length === 0) {
		return "Development activity";
	}

	return parts.join(" with ");
}

function analyzeCommitTypes(subjects: string[]): string[] {
	const types: Record<string, number> = {};

	for (const subject of subjects) {
		const match = /^(feat|fix|docs|refactor|test|chore|style|perf|ci|build)/i.exec(subject);
		if (match) {
			const type = match[1]?.toLowerCase();
			if (type) {
				types[type] = (types[type] ?? 0) + 1;
			}
		}
	}

	const result: string[] = [];
	const typeLabels: Record<string, string> = {
		feat: "feature",
		fix: "bug fix",
		docs: "documentation",
		refactor: "refactoring",
		test: "testing",
		chore: "maintenance",
		style: "styling",
		perf: "performance",
		ci: "CI/CD",
		build: "build",
	};

	for (const [type, count] of Object.entries(types)) {
		const label = typeLabels[type] ?? type;
		if (count === 1) {
			result.push(label);
		} else {
			result.push(`${count} ${label}${type === "fix" ? "es" : "s"}`);
		}
	}

	return result;
}

interface GroupedCommits {
	type: string;
	label: string;
	subjects: string[];
}

function groupCommitsByType(subjects: string[]): GroupedCommits[] {
	const typeMap: Record<string, string[]> = {};
	const typeLabels: Record<string, string> = {
		feat: "Features",
		fix: "Bug Fixes",
		docs: "Documentation",
		refactor: "Refactoring",
		test: "Testing",
		chore: "Maintenance",
		style: "Styling",
		perf: "Performance",
		ci: "CI/CD",
		build: "Build",
	};

	const typeOrder = [
		"feat",
		"fix",
		"docs",
		"refactor",
		"test",
		"perf",
		"style",
		"build",
		"ci",
		"chore",
	];

	for (const subject of subjects) {
		const match = /^(feat|fix|docs|refactor|test|chore|style|perf|ci|build)/i.exec(subject);
		const type = match?.[1]?.toLowerCase() ?? "other";
		const cleaned = cleanSubject(subject);

		if (!typeMap[type]) {
			typeMap[type] = [];
		}
		typeMap[type]?.push(cleaned);
	}

	const groups: GroupedCommits[] = [];

	for (const type of typeOrder) {
		const subjects = typeMap[type];
		if (subjects && subjects.length > 0) {
			groups.push({
				type,
				label: typeLabels[type] ?? type,
				subjects,
			});
		}
	}

	const otherSubjects = typeMap.other;
	if (otherSubjects && otherSubjects.length > 0) {
		groups.push({
			type: "other",
			label: "Other",
			subjects: otherSubjects,
		});
	}

	return groups;
}

type PrAction = "opened" | "merged";

interface PrLine {
	number: number;
	summary: string;
	url: string;
	action: PrAction;
	repo?: string;
}

interface BranchMergeLine {
	sourceBranch: string;
	targetBranch?: string;
}

interface WeeklyProjectActivity {
	prsOpened: PrLine[];
	prsMerged: PrLine[];
	branchesMerged: BranchMergeLine[];
	commits: WorkItem[];
	sessions: WorkItem[];
	githubActivity: WorkItem[];
	otherActivity: WorkItem[];
}

interface WeekBucket {
	weekStart: Date;
	weekLabel: string;
	activity: WeeklyProjectActivity;
}

interface ProjectWeeklySummary {
	projectName: string;
	projectPath: string;
	weeks: WeekBucket[];
	totalPrsOpened: number;
	totalPrsMerged: number;
	totalBranchesMerged: number;
	totalCommits: number;
	totalSessions: number;
}

function extractPrLines(items: WorkItem[]): {
	opened: PrLine[];
	merged: PrLine[];
	other: WorkItem[];
} {
	const opened: PrLine[] = [];
	const merged: PrLine[] = [];
	const other: WorkItem[] = [];
	const seen = new Set<string>();

	for (const item of items) {
		const metadata = item.metadata;
		if (!metadata || typeof metadata !== "object") {
			other.push(item);
			continue;
		}

		if (metadata.type !== "pr") {
			other.push(item);
			continue;
		}

		const action = metadata.action;
		const number = metadata.number;
		const url = metadata.url;
		const repo = metadata.repo;
		const summaryValue = metadata.summary;
		const titleValue = metadata.title;

		if (action !== "opened" && action !== "merged") {
			other.push(item);
			continue;
		}

		if (typeof number !== "number") {
			other.push(item);
			continue;
		}

		if (typeof url !== "string" || !url) {
			other.push(item);
			continue;
		}

		const summary =
			typeof summaryValue === "string" && summaryValue.trim()
				? summaryValue.trim()
				: typeof titleValue === "string" && titleValue.trim()
					? titleValue.trim()
					: item.title;
		const repoStr = typeof repo === "string" && repo.trim() ? repo.trim() : undefined;
		const key = `${repoStr ?? ""}#${number}#${action}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const line: PrLine = {
			number,
			summary,
			url,
			action,
			repo: repoStr,
		};

		if (action === "opened") {
			opened.push(line);
		} else {
			merged.push(line);
		}
	}

	return { opened, merged, other };
}

function extractBranchMergeLines(commits: WorkItem[]): {
	merges: BranchMergeLine[];
	otherCommits: WorkItem[];
} {
	const merges: BranchMergeLine[] = [];
	const otherCommits: WorkItem[] = [];

	for (const item of commits) {
		const metadata = item.metadata;
		if (!metadata || typeof metadata !== "object") {
			otherCommits.push(item);
			continue;
		}

		if (metadata.type !== "branch" || metadata.action !== "merged") {
			otherCommits.push(item);
			continue;
		}

		const sourceBranch = metadata.sourceBranch;
		const targetBranch = metadata.targetBranch;
		if (typeof sourceBranch !== "string" || !sourceBranch.trim()) {
			otherCommits.push(item);
			continue;
		}

		const source = sourceBranch.trim();
		const target =
			typeof targetBranch === "string" && targetBranch.trim() ? targetBranch.trim() : undefined;

		merges.push({ sourceBranch: source, ...(target ? { targetBranch: target } : {}) });
	}

	return { merges, otherCommits };
}

function splitDailyProjectActivity(daily: DailyProjectActivity): {
	prsOpened: PrLine[];
	prsMerged: PrLine[];
	branchMerges: BranchMergeLine[];
	commits: WorkItem[];
	githubActivity: WorkItem[];
	sessions: WorkItem[];
	otherActivity: WorkItem[];
} {
	const prSplit = extractPrLines(daily.githubActivity);
	const branchSplit = extractBranchMergeLines(daily.commits);

	return {
		prsOpened: prSplit.opened,
		prsMerged: prSplit.merged,
		branchMerges: branchSplit.merges,
		commits: branchSplit.otherCommits,
		githubActivity: prSplit.other,
		sessions: daily.sessions,
		otherActivity: daily.otherActivity ?? [],
	};
}

function formatPrLine(pr: PrLine): string {
	return `${pr.action === "opened" ? "Opened" : "Merged"} PR #${pr.number}: ${pr.summary} (${pr.url})`;
}

function formatBranchMergeLine(branch: BranchMergeLine, arrow: string): string {
	if (branch.targetBranch) {
		return `Merged branch ${branch.sourceBranch} ${arrow} ${branch.targetBranch}`;
	}
	return `Merged branch ${branch.sourceBranch}`;
}

function aggregateWeeklyActivity(project: ProjectActivity): WeeklyProjectActivity {
	const githubItems: WorkItem[] = [];
	const commitItems: WorkItem[] = [];
	const sessions: WorkItem[] = [];
	const otherActivity: WorkItem[] = [];

	for (const daily of project.dailyActivity) {
		githubItems.push(...daily.githubActivity);
		commitItems.push(...daily.commits);
		sessions.push(...daily.sessions);
		if (daily.otherActivity) {
			otherActivity.push(...daily.otherActivity);
		}
	}

	const prSplit = extractPrLines(githubItems);
	const branchSplit = extractBranchMergeLines(commitItems);

	return {
		prsOpened: prSplit.opened,
		prsMerged: prSplit.merged,
		branchesMerged: branchSplit.merges,
		commits: branchSplit.otherCommits,
		sessions,
		githubActivity: prSplit.other,
		otherActivity,
	};
}

function groupActivityByWeek(project: ProjectActivity): ProjectWeeklySummary {
	const weekMap = new Map<string, WeekBucket>();

	for (const daily of project.dailyActivity) {
		const weekStart = startOfWeek(daily.date, { weekStartsOn: 1 });
		const weekKey = format(weekStart, "yyyy-MM-dd");
		const weekLabel = format(weekStart, "MMM d");

		if (!weekMap.has(weekKey)) {
			weekMap.set(weekKey, {
				weekStart,
				weekLabel,
				activity: {
					prsOpened: [],
					prsMerged: [],
					branchesMerged: [],
					commits: [],
					sessions: [],
					githubActivity: [],
					otherActivity: [],
				},
			});
		}

		const bucket = weekMap.get(weekKey);
		if (!bucket) continue;

		const split = splitDailyProjectActivity(daily);
		bucket.activity.prsOpened.push(...split.prsOpened);
		bucket.activity.prsMerged.push(...split.prsMerged);
		bucket.activity.branchesMerged.push(...split.branchMerges);
		bucket.activity.commits.push(...split.commits);
		bucket.activity.sessions.push(...daily.sessions);
		bucket.activity.githubActivity.push(...split.githubActivity);
		bucket.activity.otherActivity.push(...split.otherActivity);
	}

	const weeks = Array.from(weekMap.values()).sort(
		(a, b) => a.weekStart.getTime() - b.weekStart.getTime(),
	);

	let totalPrsOpened = 0;
	let totalPrsMerged = 0;
	let totalBranchesMerged = 0;
	let totalCommits = 0;
	let totalSessions = 0;

	for (const week of weeks) {
		totalPrsOpened += week.activity.prsOpened.length;
		totalPrsMerged += week.activity.prsMerged.length;
		totalBranchesMerged += week.activity.branchesMerged.length;
		totalCommits += week.activity.commits.length;
		totalSessions += week.activity.sessions.length;
	}

	return {
		projectName: project.projectName,
		projectPath: project.projectPath,
		weeks,
		totalPrsOpened,
		totalPrsMerged,
		totalBranchesMerged,
		totalCommits,
		totalSessions,
	};
}

function formatLongPeriodProject(project: ProjectActivity, verbose: boolean): string {
	const summary = groupActivityByWeek(project);
	const lines: string[] = [];

	lines.push(`## ${project.projectName}`);
	lines.push("");

	// Big picture summary line
	const summaryParts: string[] = [];
	if (summary.totalPrsMerged > 0) {
		summaryParts.push(
			`${summary.totalPrsMerged} PR${summary.totalPrsMerged !== 1 ? "s" : ""} merged`,
		);
	}
	if (summary.totalPrsOpened > 0) {
		summaryParts.push(
			`${summary.totalPrsOpened} PR${summary.totalPrsOpened !== 1 ? "s" : ""} opened`,
		);
	}
	if (summary.totalBranchesMerged > 0) {
		summaryParts.push(
			`${summary.totalBranchesMerged} branch${summary.totalBranchesMerged !== 1 ? "es" : ""} merged`,
		);
	}
	if (summary.totalCommits > 0) {
		summaryParts.push(`${summary.totalCommits} commit${summary.totalCommits !== 1 ? "s" : ""}`);
	}
	if (summary.totalSessions > 0) {
		summaryParts.push(
			`${summary.totalSessions} AI session${summary.totalSessions !== 1 ? "s" : ""}`,
		);
	}

	if (summaryParts.length > 0) {
		lines.push(`**Summary**: ${summaryParts.join(", ")}`);
		lines.push("");
	}

	// Weekly breakdown
	for (const week of summary.weeks) {
		const weekHasActivity =
			week.activity.prsOpened.length > 0 ||
			week.activity.prsMerged.length > 0 ||
			week.activity.branchesMerged.length > 0 ||
			week.activity.commits.length > 0 ||
			week.activity.sessions.length > 0;

		if (!weekHasActivity) continue;

		lines.push(`### Week of ${week.weekLabel}`);

		for (const pr of week.activity.prsOpened) {
			lines.push(`- ${formatPrLine(pr)}`);
		}
		for (const pr of week.activity.prsMerged) {
			lines.push(`- ${formatPrLine(pr)}`);
		}
		for (const branch of week.activity.branchesMerged) {
			lines.push(`- ${formatBranchMergeLine(branch, "→")}`);
		}

		if (verbose) {
			if (week.activity.commits.length > 0) {
				const subjects = getCommitSubjects(week.activity.commits);
				const groups = groupCommitsByType(subjects);
				for (const group of groups) {
					lines.push(`**${group.label}** (${group.subjects.length}):`);
					for (const subject of group.subjects) {
						lines.push(`- ${subject}`);
					}
				}
			}
			if (week.activity.sessions.length > 0) {
				lines.push(`**AI Sessions** (${week.activity.sessions.length}):`);
				const descriptions = getSessionDescriptions(week.activity.sessions);
				for (const desc of descriptions) {
					lines.push(`- ${desc}`);
				}
			}
		} else {
			// Concise mode: show commit/session summary
			const activityParts: string[] = [];
			if (week.activity.commits.length > 0) {
				const subjects = getCommitSubjects(week.activity.commits);
				if (subjects.length <= 2) {
					activityParts.push(...subjects.map((s) => cleanSubject(s)));
				} else {
					activityParts.push(`${subjects.length} commits`);
				}
			}
			if (week.activity.sessions.length > 0) {
				activityParts.push(`${week.activity.sessions.length} AI sessions`);
			}
			if (
				activityParts.length > 0 &&
				week.activity.prsOpened.length === 0 &&
				week.activity.prsMerged.length === 0 &&
				week.activity.branchesMerged.length === 0
			) {
				lines.push(`- ${activityParts.join(", ")}`);
			}
		}

		lines.push("");
	}

	return lines.join("\n");
}

function formatWeeklyProject(project: ProjectActivity, verbose: boolean): string {
	const lines: string[] = [];
	lines.push(`## ${project.projectName}`);
	lines.push("");

	const weekly = aggregateWeeklyActivity(project);

	for (const pr of weekly.prsOpened) {
		lines.push(formatPrLine(pr));
	}

	for (const pr of weekly.prsMerged) {
		lines.push(formatPrLine(pr));
	}

	for (const branch of weekly.branchesMerged) {
		lines.push(formatBranchMergeLine(branch, "→"));
	}

	// Other activity (commits, sessions, etc.)
	if (
		weekly.commits.length > 0 ||
		weekly.sessions.length > 0 ||
		weekly.githubActivity.length > 0 ||
		weekly.otherActivity.length > 0
	) {
		if (
			weekly.prsOpened.length > 0 ||
			weekly.prsMerged.length > 0 ||
			weekly.branchesMerged.length > 0
		) {
			lines.push("");
		}

		if (verbose) {
			// Verbose mode: detailed breakdown
			if (weekly.commits.length > 0) {
				const subjects = getCommitSubjects(weekly.commits);
				const groups = groupCommitsByType(subjects);

				for (const group of groups) {
					lines.push(`**${group.label}** (${group.subjects.length}):`);
					for (const subject of group.subjects) {
						lines.push(`- ${subject}`);
					}
					lines.push("");
				}

				// Show related tickets if any
				const tickets = extractTicketsFromCommits(weekly.commits);
				if (tickets.length > 0) {
					lines.push(`**Related Tickets**: ${formatTicketRefs(tickets, "markdown")}`);
					lines.push("");
				}
			}

			if (weekly.sessions.length > 0) {
				lines.push(`**AI Sessions** (${weekly.sessions.length}):`);
				const descriptions = getSessionDescriptions(weekly.sessions);
				for (const desc of descriptions) {
					lines.push(`- ${desc}`);
				}
				lines.push("");
			}

			if (weekly.githubActivity.length > 0) {
				lines.push(`**GitHub** (${weekly.githubActivity.length}):`);
				const descriptions = getGitHubDescriptions(weekly.githubActivity);
				for (const desc of descriptions) {
					lines.push(`- ${desc}`);
				}
				lines.push("");
			}

			if (weekly.otherActivity.length > 0) {
				lines.push(`**Other Activity** (${weekly.otherActivity.length}):`);
				for (const item of weekly.otherActivity) {
					let title = item.title;
					const bracketMatch = /^\[([^\]]+)\]\s*/.exec(title);
					if (bracketMatch) {
						title = title.slice(bracketMatch[0].length);
					}
					lines.push(`- ${title}`);
				}
				lines.push("");
			}
		} else {
			// Concise mode: summary line
			const parts: string[] = [];

			if (weekly.commits.length > 0) {
				const subjects = getCommitSubjects(weekly.commits);
				if (subjects.length <= 3) {
					parts.push(...subjects.map((s) => cleanSubject(s)));
				} else {
					const first = subjects[0];
					if (first) {
						parts.push(cleanSubject(first));
					}
					const summary = generateNarrativeSummary({
						date: new Date(),
						commits: weekly.commits,
						sessions: weekly.sessions,
						githubActivity: weekly.githubActivity,
						otherActivity: weekly.otherActivity,
					});
					if (summary && summary !== "Development activity") {
						parts.push(summary);
					}
				}
			}

			if (parts.length === 0 && weekly.sessions.length > 0) {
				const descriptions = getSessionDescriptions(weekly.sessions);
				parts.push(...descriptions);
			}

			if (parts.length === 0 && weekly.githubActivity.length > 0) {
				const descriptions = getGitHubDescriptions(weekly.githubActivity);
				const first = descriptions[0];
				if (first) {
					parts.push(first);
				}
			}

			if (parts.length === 0 && weekly.otherActivity.length > 0) {
				const first = weekly.otherActivity[0];
				if (first) {
					let title = first.title;
					const bracketMatch = /^\[([^\]]+)\]\s*/.exec(title);
					if (bracketMatch) {
						title = title.slice(bracketMatch[0].length);
					}
					parts.push(title);
				}
			}

			for (const part of parts) {
				lines.push(part);
			}
		}
	}

	return lines.join("\n");
}

function getPeriodHeader(periodType: PeriodType, summary: ProjectWorkSummary): string {
	switch (periodType) {
		case "daily":
			return `Daily Standup - ${formatDateRange(summary.dateRange, summary.timezone)}`;
		case "weekly":
			return `Weekly Standup - ${formatDateRange(summary.dateRange, summary.timezone)}`;
		case "monthly":
			return `Monthly Summary - ${getMonthLabel(summary.dateRange.start, summary.timezone)}`;
		case "quarterly":
			return `Quarterly Summary - ${getQuarterLabel(summary.dateRange.start, summary.timezone)}`;
	}
}

export function formatProjectsMarkdown(summary: ProjectWorkSummary, verbose = false): string {
	const lines: string[] = [];
	const periodType = getPeriodType(summary.dateRange);

	lines.push(`# ${getPeriodHeader(periodType, summary)}`);
	lines.push("");

	if (summary.projects.length === 0) {
		lines.push("*No project activity recorded for this period.*");
		lines.push("");
		lines.push("---");
		lines.push(`*Generated at ${format(summary.generatedAt, "yyyy-MM-dd HH:mm:ss")}*`);
		return lines.join("\n");
	}

	if (periodType === "daily") {
		for (const project of summary.projects) {
			for (const daily of project.dailyActivity) {
				lines.push(formatDailyProject(project, daily, verbose));
			}
		}
	} else if (periodType === "weekly") {
		for (const project of summary.projects) {
			lines.push(formatWeeklyProject(project, verbose));
			lines.push("");
		}
	} else {
		// Monthly or Quarterly - use weekly rollup format
		for (const project of summary.projects) {
			lines.push(formatLongPeriodProject(project, verbose));
			lines.push("");
		}
	}

	if (summary.trendData) {
		lines.push("");
		lines.push(formatTrendSummary(summary.trendData));
	}

	lines.push("---");
	lines.push(`*Generated at ${format(summary.generatedAt, "yyyy-MM-dd HH:mm:ss")}*`);

	return lines.join("\n");
}

function getPlainPeriodHeader(periodType: PeriodType, summary: ProjectWorkSummary): string {
	switch (periodType) {
		case "daily":
			return `Worklog: ${formatDateRange(summary.dateRange, summary.timezone)}`;
		case "weekly":
			return `Weekly Worklog: ${formatDateRange(summary.dateRange, summary.timezone)}`;
		case "monthly":
			return `Monthly Summary: ${getMonthLabel(summary.dateRange.start, summary.timezone)}`;
		case "quarterly":
			return `Quarterly Summary: ${getQuarterLabel(summary.dateRange.start, summary.timezone)}`;
	}
}

function formatLongPeriodProjectPlain(project: ProjectActivity): string[] {
	const summary = groupActivityByWeek(project);
	const lines: string[] = [];

	lines.push(project.projectName.toUpperCase());
	lines.push("-".repeat(30));

	// Big picture summary
	const summaryParts: string[] = [];
	if (summary.totalPrsMerged > 0) {
		summaryParts.push(`${summary.totalPrsMerged} PRs merged`);
	}
	if (summary.totalPrsOpened > 0) {
		summaryParts.push(`${summary.totalPrsOpened} PRs opened`);
	}
	if (summary.totalCommits > 0) {
		summaryParts.push(`${summary.totalCommits} commits`);
	}
	if (summary.totalSessions > 0) {
		summaryParts.push(`${summary.totalSessions} AI sessions`);
	}

	if (summaryParts.length > 0) {
		lines.push(`  Summary: ${summaryParts.join(", ")}`);
		lines.push("");
	}

	// Weekly breakdown
	for (const week of summary.weeks) {
		const weekHasActivity =
			week.activity.prsOpened.length > 0 ||
			week.activity.prsMerged.length > 0 ||
			week.activity.branchesMerged.length > 0 ||
			week.activity.commits.length > 0;

		if (!weekHasActivity) continue;

		lines.push(`  Week of ${week.weekLabel}:`);
		for (const pr of week.activity.prsOpened) {
			lines.push(`    ${formatPrLine(pr)}`);
		}
		for (const pr of week.activity.prsMerged) {
			lines.push(`    ${formatPrLine(pr)}`);
		}
		for (const branch of week.activity.branchesMerged) {
			lines.push(`    ${formatBranchMergeLine(branch, "->")}`);
		}
		if (week.activity.commits.length > 0) {
			lines.push(`    ${week.activity.commits.length} commits`);
		}
	}

	lines.push("");
	return lines;
}

export function formatProjectsPlain(summary: ProjectWorkSummary, verbose = false): string {
	const lines: string[] = [];
	const periodType = getPeriodType(summary.dateRange);

	lines.push(getPlainPeriodHeader(periodType, summary));
	lines.push("=".repeat(50));
	lines.push("");

	if (summary.projects.length === 0) {
		lines.push("No project activity recorded for this period.");
		return lines.join("\n");
	}

	if (periodType === "daily") {
		for (const project of summary.projects) {
			for (const daily of project.dailyActivity) {
				const split = splitDailyProjectActivity(daily);
				const remainder: DailyProjectActivity = {
					...daily,
					commits: split.commits,
					githubActivity: split.githubActivity,
					otherActivity: split.otherActivity,
				};
				const summary_text = daily.summary ?? generateEnhancedSummary(remainder);
				const hasPriorityLines =
					split.prsOpened.length + split.prsMerged.length + split.branchMerges.length > 0;

				if (!hasPriorityLines) {
					lines.push(`${project.projectName.toUpperCase().padEnd(15)} ${summary_text}`);
					continue;
				}

				lines.push(project.projectName.toUpperCase());
				for (const pr of split.prsOpened) {
					lines.push(`  ${formatPrLine(pr)}`);
				}
				for (const pr of split.prsMerged) {
					lines.push(`  ${formatPrLine(pr)}`);
				}
				for (const branch of split.branchMerges) {
					lines.push(`  ${formatBranchMergeLine(branch, "->")}`);
				}
				if (summary_text && summary_text !== "Development activity") {
					lines.push(`  ${summary_text}`);
				}
				lines.push("");
			}
		}
	} else if (periodType === "weekly") {
		for (const project of summary.projects) {
			lines.push(project.projectName.toUpperCase());
			lines.push("-".repeat(30));

			const weekly = aggregateWeeklyActivity(project);

			for (const pr of weekly.prsOpened) {
				lines.push(`  ${formatPrLine(pr)}`);
			}

			for (const pr of weekly.prsMerged) {
				lines.push(`  ${formatPrLine(pr)}`);
			}

			for (const branch of weekly.branchesMerged) {
				lines.push(`  ${formatBranchMergeLine(branch, "->")}`);
			}

			if (
				weekly.commits.length > 0 ||
				weekly.sessions.length > 0 ||
				weekly.githubActivity.length > 0 ||
				weekly.otherActivity.length > 0
			) {
				const summary_text = generateEnhancedSummary({
					date: new Date(),
					commits: weekly.commits,
					sessions: weekly.sessions,
					githubActivity: weekly.githubActivity,
					otherActivity: weekly.otherActivity,
				});
				if (
					weekly.prsOpened.length > 0 ||
					weekly.prsMerged.length > 0 ||
					weekly.branchesMerged.length > 0
				) {
					lines.push("");
				}
				lines.push(`  ${summary_text}`);
			}

			lines.push("");
		}
	} else {
		// Monthly or Quarterly
		for (const project of summary.projects) {
			lines.push(...formatLongPeriodProjectPlain(project));
		}
	}

	if (summary.trendData && verbose) {
		lines.push("");
		lines.push("=".repeat(50));
		lines.push(formatTrendSummary(summary.trendData).replace(/^## /gm, "").replace(/\*\*/g, ""));
	}

	return lines.join("\n");
}

function getSlackPeriodHeader(periodType: PeriodType, summary: ProjectWorkSummary): string {
	switch (periodType) {
		case "daily":
			return `:clipboard: *Daily Standup - ${formatDateRange(summary.dateRange, summary.timezone)}*`;
		case "weekly":
			return `:clipboard: *Weekly Standup - ${formatDateRange(summary.dateRange, summary.timezone)}*`;
		case "monthly":
			return `:calendar: *Monthly Summary - ${getMonthLabel(summary.dateRange.start, summary.timezone)}*`;
		case "quarterly":
			return `:bar_chart: *Quarterly Summary - ${getQuarterLabel(summary.dateRange.start, summary.timezone)}*`;
	}
}

function formatLongPeriodProjectSlack(project: ProjectActivity): string[] {
	const summary = groupActivityByWeek(project);
	const lines: string[] = [];

	lines.push(`:file_folder: *${project.projectName}*`);

	// Big picture summary
	const summaryParts: string[] = [];
	if (summary.totalPrsMerged > 0) {
		summaryParts.push(`${summary.totalPrsMerged} PRs merged`);
	}
	if (summary.totalPrsOpened > 0) {
		summaryParts.push(`${summary.totalPrsOpened} PRs opened`);
	}
	if (summary.totalCommits > 0) {
		summaryParts.push(`${summary.totalCommits} commits`);
	}
	if (summary.totalSessions > 0) {
		summaryParts.push(`${summary.totalSessions} AI sessions`);
	}

	if (summaryParts.length > 0) {
		lines.push(`_${summaryParts.join(", ")}_`);
	}

	// Weekly highlights
	for (const week of summary.weeks) {
		const prActivity =
			week.activity.prsOpened.length +
			week.activity.prsMerged.length +
			week.activity.branchesMerged.length;
		if (prActivity === 0) continue;

		lines.push(`*Week of ${week.weekLabel}:*`);
		for (const pr of week.activity.prsOpened) {
			lines.push(`  ${formatPrLine(pr)}`);
		}
		for (const pr of week.activity.prsMerged) {
			lines.push(`  ${formatPrLine(pr)}`);
		}
		for (const branch of week.activity.branchesMerged) {
			lines.push(`  ${formatBranchMergeLine(branch, "->")}`);
		}
	}

	lines.push("");
	return lines;
}

export function formatProjectsSlack(summary: ProjectWorkSummary, verbose = false): string {
	const lines: string[] = [];
	const periodType = getPeriodType(summary.dateRange);

	lines.push(getSlackPeriodHeader(periodType, summary));
	lines.push("");

	if (summary.projects.length === 0) {
		lines.push("_No project activity recorded for this period._");
		return lines.join("\n");
	}

	if (periodType === "daily") {
		for (const project of summary.projects) {
			for (const daily of project.dailyActivity) {
				const split = splitDailyProjectActivity(daily);
				const remainder: DailyProjectActivity = {
					...daily,
					commits: split.commits,
					githubActivity: split.githubActivity,
					otherActivity: split.otherActivity,
				};
				const summary_text = daily.summary ?? generateEnhancedSummary(remainder);
				const hasPriorityLines =
					split.prsOpened.length + split.prsMerged.length + split.branchMerges.length > 0;

				if (!hasPriorityLines) {
					lines.push(`:file_folder: *${project.projectName}*: ${summary_text}`);
					continue;
				}

				lines.push(`:file_folder: *${project.projectName}*`);
				for (const pr of split.prsOpened) {
					lines.push(formatPrLine(pr));
				}
				for (const pr of split.prsMerged) {
					lines.push(formatPrLine(pr));
				}
				for (const branch of split.branchMerges) {
					lines.push(formatBranchMergeLine(branch, "->"));
				}
				if (summary_text && summary_text !== "Development activity") {
					lines.push(summary_text);
				}
				lines.push("");
			}
		}
	} else if (periodType === "weekly") {
		for (const project of summary.projects) {
			lines.push(`:file_folder: *${project.projectName}*`);

			const weekly = aggregateWeeklyActivity(project);

			for (const pr of weekly.prsOpened) {
				lines.push(formatPrLine(pr));
			}

			for (const pr of weekly.prsMerged) {
				lines.push(formatPrLine(pr));
			}

			for (const branch of weekly.branchesMerged) {
				lines.push(formatBranchMergeLine(branch, "->"));
			}

			if (
				weekly.commits.length > 0 ||
				weekly.sessions.length > 0 ||
				weekly.githubActivity.length > 0 ||
				weekly.otherActivity.length > 0
			) {
				const summary_text = generateEnhancedSummary({
					date: new Date(),
					commits: weekly.commits,
					sessions: weekly.sessions,
					githubActivity: weekly.githubActivity,
					otherActivity: weekly.otherActivity,
				});
				if (
					weekly.prsOpened.length > 0 ||
					weekly.prsMerged.length > 0 ||
					weekly.branchesMerged.length > 0
				) {
					lines.push("");
				}
				lines.push(summary_text);
			}

			lines.push("");
		}
	} else {
		// Monthly or Quarterly
		for (const project of summary.projects) {
			lines.push(...formatLongPeriodProjectSlack(project));
		}
	}

	if (summary.trendData && verbose) {
		lines.push("");
		const trendText = formatTrendSummary(summary.trendData)
			.replace(/^## /gm, "*")
			.replace(/\*\*/g, "*")
			.replace(/Overall: /g, ":chart_with_upwards_trend: ");
		lines.push(trendText);
	}

	return lines.join("\n");
}

export function formatProjectsJson(summary: ProjectWorkSummary, _verbose = false): string {
	const periodType = getPeriodType(summary.dateRange);
	const output = {
		periodType,
		dateRange: {
			start: summary.dateRange.start.toISOString(),
			end: summary.dateRange.end.toISOString(),
		},
		projects: summary.projects.map((project) => {
			// Collect all tickets from all daily commits for this project
			const allCommits = project.dailyActivity.flatMap((d) => d.commits);
			const projectTickets = extractTicketsFromCommits(allCommits);

			return {
				name: project.projectName,
				path: project.projectPath === "(unattributed)" ? null : project.projectPath,
				tickets: projectTickets.length > 0 ? projectTickets : null,
				activity: project.dailyActivity.map((daily) => {
					const dailyTickets = extractTicketsFromCommits(daily.commits);
					return {
						date: format(daily.date, "yyyy-MM-dd"),
						summary: daily.summary ?? null,
						commitCount: daily.commits.length,
						sessionCount: daily.sessions.length,
						githubActivityCount: daily.githubActivity.length,
						tickets: dailyTickets.length > 0 ? dailyTickets : null,
					};
				}),
			};
		}),
		trends: summary.trendData
			? {
					current: {
						totalItems: summary.trendData.currentPeriod.totalItems,
						itemsBySource: summary.trendData.currentPeriod.itemsBySource,
						dateRange: {
							start: summary.trendData.currentPeriod.dateRange.start.toISOString(),
							end: summary.trendData.currentPeriod.dateRange.end.toISOString(),
						},
					},
					previous: {
						totalItems: summary.trendData.previousPeriod.totalItems,
						itemsBySource: summary.trendData.previousPeriod.itemsBySource,
						dateRange: {
							start: summary.trendData.previousPeriod.dateRange.start.toISOString(),
							end: summary.trendData.previousPeriod.dateRange.end.toISOString(),
						},
					},
					changes: {
						totalChange: summary.trendData.trends.totalChange,
						totalChangePercent: summary.trendData.trends.totalChangePercent,
						sourceChanges: summary.trendData.trends.sourceChanges,
					},
				}
			: null,
		generatedAt: summary.generatedAt.toISOString(),
	};

	return JSON.stringify(output, null, 2);
}

function formatCluster(cluster: ContextCluster, verbose: boolean): string[] {
	const lines: string[] = [];

	lines.push(`### ${cluster.theme}`);
	lines.push(
		`*Keywords: ${cluster.keywords.join(", ")}* (coherence: ${(cluster.coherenceScore * 100).toFixed(0)}%)`,
	);
	lines.push("");

	const itemsToShow = verbose ? cluster.items : cluster.items.slice(0, 5);

	for (const item of itemsToShow) {
		const time = format(item.timestamp, "HH:mm");
		lines.push(`- [${time}] (${item.source}) ${item.title}`);
	}

	if (!verbose && cluster.items.length > 5) {
		lines.push(`  *... and ${cluster.items.length - 5} more items*`);
	}

	return lines;
}

export function formatSmartSummaryMarkdown(
	summary: ProjectWorkSummary,
	smartResult: SmartSummaryResult,
	verbose = false,
): string {
	const lines: string[] = [];

	if (isSingleDay(summary)) {
		lines.push(`# Smart Summary - ${formatDateRange(summary.dateRange, summary.timezone)}`);
	} else {
		lines.push(`# Smart Weekly Summary - ${formatDateRange(summary.dateRange, summary.timezone)}`);
	}
	lines.push("");

	if (smartResult.llmNarrative) {
		lines.push("## Overview");
		lines.push(smartResult.llmNarrative);
		lines.push("");
	}

	const { clusters, crossClusterConnections } = smartResult.summary;

	if (clusters.length === 0) {
		lines.push("*No work items to cluster.*");
	} else {
		lines.push(`## Work Clusters (${clusters.length})`);
		lines.push("");

		for (const cluster of clusters) {
			lines.push(...formatCluster(cluster, verbose));
			lines.push("");
		}
	}

	if (crossClusterConnections.length > 0) {
		lines.push("## Connections");
		for (const conn of crossClusterConnections) {
			lines.push(`- ${conn.from} <-> ${conn.to}: ${conn.relationship}`);
		}
		lines.push("");
	}

	if (summary.trendData) {
		lines.push(formatTrendSummary(summary.trendData));
	}

	lines.push("---");
	lines.push(`*Generated at ${format(summary.generatedAt, "yyyy-MM-dd HH:mm:ss")} (smart mode)*`);

	return lines.join("\n");
}

export function formatSmartSummaryPlain(
	summary: ProjectWorkSummary,
	smartResult: SmartSummaryResult,
	_verbose = false,
): string {
	const lines: string[] = [];

	if (isSingleDay(summary)) {
		lines.push(`Smart Summary: ${formatDateRange(summary.dateRange, summary.timezone)}`);
	} else {
		lines.push(`Smart Weekly Summary: ${formatDateRange(summary.dateRange, summary.timezone)}`);
	}
	lines.push("=".repeat(50));
	lines.push("");

	if (smartResult.llmNarrative) {
		lines.push("OVERVIEW");
		lines.push("-".repeat(20));
		lines.push(smartResult.llmNarrative);
		lines.push("");
	}

	const { clusters } = smartResult.summary;

	if (clusters.length === 0) {
		lines.push("No work items to cluster.");
	} else {
		lines.push(`WORK CLUSTERS (${clusters.length})`);
		lines.push("-".repeat(20));
		lines.push("");

		for (const cluster of clusters) {
			lines.push(`[${cluster.theme}] (${cluster.items.length} items)`);
			lines.push(`  Keywords: ${cluster.keywords.join(", ")}`);

			for (const item of cluster.items.slice(0, 3)) {
				lines.push(`  - ${item.title}`);
			}

			if (cluster.items.length > 3) {
				lines.push(`  ... and ${cluster.items.length - 3} more`);
			}

			lines.push("");
		}
	}

	return lines.join("\n");
}

export function formatSmartSummarySlack(
	summary: ProjectWorkSummary,
	smartResult: SmartSummaryResult,
	_verbose = false,
): string {
	const lines: string[] = [];

	if (isSingleDay(summary)) {
		lines.push(`:brain: *Smart Summary - ${formatDateRange(summary.dateRange, summary.timezone)}*`);
	} else {
		lines.push(
			`:brain: *Smart Weekly Summary - ${formatDateRange(summary.dateRange, summary.timezone)}*`,
		);
	}
	lines.push("");

	if (smartResult.llmNarrative) {
		lines.push(smartResult.llmNarrative);
		lines.push("");
	}

	const { clusters } = smartResult.summary;

	if (clusters.length > 0) {
		lines.push(`:mag: *Work Clusters (${clusters.length})*`);
		lines.push("");

		for (const cluster of clusters) {
			lines.push(`:label: *${cluster.theme}* (${cluster.items.length} items)`);

			for (const item of cluster.items.slice(0, 3)) {
				lines.push(`  - ${item.title}`);
			}

			if (cluster.items.length > 3) {
				lines.push(`  _... and ${cluster.items.length - 3} more_`);
			}

			lines.push("");
		}
	}

	return lines.join("\n");
}

export function formatSmartSummaryJson(
	summary: ProjectWorkSummary,
	smartResult: SmartSummaryResult,
	_verbose = false,
): string {
	const output = {
		dateRange: {
			start: summary.dateRange.start.toISOString(),
			end: summary.dateRange.end.toISOString(),
		},
		narrative: smartResult.llmNarrative ?? null,
		clusters: smartResult.summary.clusters.map((cluster) => ({
			id: cluster.id,
			theme: cluster.theme,
			keywords: cluster.keywords,
			coherenceScore: cluster.coherenceScore,
			itemCount: cluster.items.length,
			items: cluster.items.map((item) => ({
				source: item.source,
				timestamp: item.timestamp.toISOString(),
				title: item.title,
				description: item.description ?? null,
			})),
		})),
		connections: smartResult.summary.crossClusterConnections,
		generatedAt: summary.generatedAt.toISOString(),
	};

	return JSON.stringify(output, null, 2);
}
