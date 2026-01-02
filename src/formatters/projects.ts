import { format, isSameDay } from "date-fns";
import { getCommitSubjects, getGitHubDescriptions, getSessionDescriptions } from "../aggregator.ts";
import type {
	DailyProjectActivity,
	ProjectActivity,
	ProjectWorkSummary,
	WorkItem,
} from "../types.ts";
import { cleanSubject } from "../utils/commits.ts";
import { formatDateRange } from "../utils/dates.ts";
import { formatTrendSummary } from "../utils/trends.ts";

function formatDailyProject(
	project: ProjectActivity,
	daily: DailyProjectActivity,
	verbose: boolean,
): string {
	if (!verbose) {
		const parts = daily.summary ? [daily.summary] : getEnhancedSummaryParts(daily);
		const lines: string[] = [];
		lines.push(`**${project.projectName}**:`);
		for (const part of parts) {
			lines.push(`- ${part}`);
		}
		return lines.join("\n");
	}

	const lines: string[] = [];
	lines.push(`## ${project.projectName}`);

	const summary = daily.summary ?? generateNarrativeSummary(daily);
	lines.push(`**Summary**: ${summary}`);
	lines.push("");

	if (daily.commits.length > 0) {
		const subjects = getCommitSubjects(daily.commits);
		const groups = groupCommitsByType(subjects);

		for (const group of groups) {
			lines.push(`**${group.label}** (${group.subjects.length}):`);
			for (const subject of group.subjects) {
				lines.push(`- ${subject}`);
			}
			lines.push("");
		}
	}

	if (daily.sessions.length > 0) {
		lines.push(`**AI Sessions** (${daily.sessions.length}):`);
		const descriptions = getSessionDescriptions(daily.sessions);
		for (const desc of descriptions) {
			lines.push(`- ${desc}`);
		}
		lines.push("");
	}

	if (daily.githubActivity.length > 0) {
		lines.push(`**GitHub** (${daily.githubActivity.length}):`);
		const descriptions = getGitHubDescriptions(daily.githubActivity);
		for (const desc of descriptions) {
			lines.push(`- ${desc}`);
		}
		lines.push("");
	}

	if (daily.otherActivity && daily.otherActivity.length > 0) {
		lines.push(`**Other Activity** (${daily.otherActivity.length}):`);
		for (const item of daily.otherActivity) {
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

function isSingleDay(summary: ProjectWorkSummary): boolean {
	const { start, end } = summary.dateRange;
	return isSameDay(start, end);
}

interface PRItem {
	number: number;
	title: string;
	url: string;
	action: "opened" | "merged";
}

interface BranchMergeItem {
	sourceBranch: string;
	targetBranch: string;
}

interface WeeklyProjectActivity {
	prsOpened: PRItem[];
	prsMerged: PRItem[];
	branchesMerged: BranchMergeItem[];
	commits: WorkItem[];
	sessions: WorkItem[];
	otherActivity: WorkItem[];
}

function extractPRsFromActivity(activity: DailyProjectActivity[]): {
	opened: PRItem[];
	merged: PRItem[];
} {
	const opened: PRItem[] = [];
	const merged: PRItem[] = [];
	const seen = new Set<string>();

	for (const daily of activity) {
		for (const item of daily.githubActivity) {
			const metadata = item.metadata;
			if (metadata?.type === "pr" && typeof metadata.number === "number") {
				const action = metadata.action as string;
				const number = metadata.number as number;
				const url = (metadata.url as string) || "";
				const summary = (metadata.summary as string) || (metadata.title as string) || item.title;

				const key = `${action}-${number}`;
				if (seen.has(key)) continue;
				seen.add(key);

				if (action === "opened") {
					opened.push({ number, title: summary, url, action: "opened" });
				} else if (action === "merged") {
					merged.push({ number, title: summary, url, action: "merged" });
				}
			}
		}
	}

	return { opened, merged };
}

function extractBranchMergesFromActivity(activity: DailyProjectActivity[]): BranchMergeItem[] {
	const branches: BranchMergeItem[] = [];
	const seen = new Set<string>();

	for (const daily of activity) {
		for (const item of daily.commits) {
			const metadata = item.metadata;
			if (metadata?.type === "branch" && metadata?.action === "merged") {
				const sourceBranch = metadata.sourceBranch as string;
				const targetBranch = metadata.targetBranch as string;

				const key = `${sourceBranch}->${targetBranch}`;
				if (seen.has(key)) continue;
				seen.add(key);

				branches.push({ sourceBranch, targetBranch });
			}
		}
	}

	return branches;
}

function aggregateWeeklyActivity(project: ProjectActivity): WeeklyProjectActivity {
	const { opened, merged } = extractPRsFromActivity(project.dailyActivity);
	const branchesMerged = extractBranchMergesFromActivity(project.dailyActivity);

	const commits: WorkItem[] = [];
	const sessions: WorkItem[] = [];
	const otherActivity: WorkItem[] = [];

	for (const daily of project.dailyActivity) {
		commits.push(...daily.commits);
		sessions.push(...daily.sessions);
		if (daily.otherActivity) {
			otherActivity.push(...daily.otherActivity);
		}
	}

	return {
		prsOpened: opened,
		prsMerged: merged,
		branchesMerged,
		commits,
		sessions,
		otherActivity,
	};
}

function formatWeeklyProject(project: ProjectActivity, verbose: boolean): string {
	const lines: string[] = [];
	lines.push(`## ${project.projectName}`);
	lines.push("");

	const weekly = aggregateWeeklyActivity(project);

	// PR opened lines
	for (const pr of weekly.prsOpened) {
		const urlPart = pr.url ? ` (${pr.url})` : "";
		lines.push(`Opened PR #${pr.number}: ${pr.title}${urlPart}`);
	}

	// PR merged lines
	for (const pr of weekly.prsMerged) {
		const urlPart = pr.url ? ` (${pr.url})` : "";
		lines.push(`Merged PR #${pr.number}: ${pr.title}${urlPart}`);
	}

	// Branch merge lines
	for (const branch of weekly.branchesMerged) {
		lines.push(`Merged branch ${branch.sourceBranch} → ${branch.targetBranch}`);
	}

	// Other activity (commits, sessions, etc.)
	if (weekly.commits.length > 0 || weekly.sessions.length > 0 || weekly.otherActivity.length > 0) {
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
			}

			if (weekly.sessions.length > 0) {
				lines.push(`**AI Sessions** (${weekly.sessions.length}):`);
				const descriptions = getSessionDescriptions(weekly.sessions);
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
						githubActivity: [],
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

			for (const part of parts) {
				lines.push(part);
			}
		}
	}

	return lines.join("\n");
}

export function formatProjectsMarkdown(summary: ProjectWorkSummary, verbose = false): string {
	const lines: string[] = [];

	if (isSingleDay(summary)) {
		lines.push(`# Daily Standup - ${formatDateRange(summary.dateRange)}`);
	} else {
		lines.push(`# Weekly Standup - ${formatDateRange(summary.dateRange)}`);
	}
	lines.push("");

	if (summary.projects.length === 0) {
		lines.push("*No project activity recorded for this period.*");
		lines.push("");
		lines.push("---");
		lines.push(`*Generated at ${format(summary.generatedAt, "yyyy-MM-dd HH:mm:ss")}*`);
		return lines.join("\n");
	}

	if (isSingleDay(summary)) {
		for (const project of summary.projects) {
			for (const daily of project.dailyActivity) {
				lines.push(formatDailyProject(project, daily, verbose));
			}
		}
	} else {
		for (const project of summary.projects) {
			lines.push(formatWeeklyProject(project, verbose));
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

export function formatProjectsPlain(summary: ProjectWorkSummary, verbose = false): string {
	const lines: string[] = [];

	if (isSingleDay(summary)) {
		lines.push(`Worklog: ${formatDateRange(summary.dateRange)}`);
	} else {
		lines.push(`Weekly Worklog: ${formatDateRange(summary.dateRange)}`);
	}
	lines.push("=".repeat(50));
	lines.push("");

	if (summary.projects.length === 0) {
		lines.push("No project activity recorded for this period.");
		return lines.join("\n");
	}

	if (isSingleDay(summary)) {
		for (const project of summary.projects) {
			for (const daily of project.dailyActivity) {
				const summary_text = daily.summary ?? generateEnhancedSummary(daily);
				lines.push(`${project.projectName.toUpperCase().padEnd(15)} ${summary_text}`);
			}
		}
	} else {
		for (const project of summary.projects) {
			lines.push(project.projectName.toUpperCase());
			lines.push("-".repeat(30));

			const weekly = aggregateWeeklyActivity(project);

			for (const pr of weekly.prsOpened) {
				const urlPart = pr.url ? ` (${pr.url})` : "";
				lines.push(`  Opened PR #${pr.number}: ${pr.title}${urlPart}`);
			}

			for (const pr of weekly.prsMerged) {
				const urlPart = pr.url ? ` (${pr.url})` : "";
				lines.push(`  Merged PR #${pr.number}: ${pr.title}${urlPart}`);
			}

			for (const branch of weekly.branchesMerged) {
				lines.push(`  Merged branch ${branch.sourceBranch} -> ${branch.targetBranch}`);
			}

			if (
				weekly.commits.length > 0 ||
				weekly.sessions.length > 0 ||
				weekly.otherActivity.length > 0
			) {
				const summary_text = generateEnhancedSummary({
					date: new Date(),
					commits: weekly.commits,
					sessions: weekly.sessions,
					githubActivity: [],
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
	}

	if (summary.trendData && verbose) {
		lines.push("");
		lines.push("=".repeat(50));
		lines.push(formatTrendSummary(summary.trendData).replace(/^## /gm, "").replace(/\*\*/g, ""));
	}

	return lines.join("\n");
}

export function formatProjectsSlack(summary: ProjectWorkSummary, verbose = false): string {
	const lines: string[] = [];

	if (isSingleDay(summary)) {
		lines.push(`:clipboard: *Daily Standup - ${formatDateRange(summary.dateRange)}*`);
	} else {
		lines.push(`:clipboard: *Weekly Standup - ${formatDateRange(summary.dateRange)}*`);
	}
	lines.push("");

	if (summary.projects.length === 0) {
		lines.push("_No project activity recorded for this period._");
		return lines.join("\n");
	}

	if (isSingleDay(summary)) {
		for (const project of summary.projects) {
			for (const daily of project.dailyActivity) {
				const summary_text = daily.summary ?? generateEnhancedSummary(daily);
				lines.push(`:file_folder: *${project.projectName}*: ${summary_text}`);
			}
		}
	} else {
		for (const project of summary.projects) {
			lines.push(`:file_folder: *${project.projectName}*`);

			const weekly = aggregateWeeklyActivity(project);

			for (const pr of weekly.prsOpened) {
				const urlPart = pr.url ? ` (${pr.url})` : "";
				lines.push(`Opened PR #${pr.number}: ${pr.title}${urlPart}`);
			}

			for (const pr of weekly.prsMerged) {
				const urlPart = pr.url ? ` (${pr.url})` : "";
				lines.push(`Merged PR #${pr.number}: ${pr.title}${urlPart}`);
			}

			for (const branch of weekly.branchesMerged) {
				lines.push(`Merged branch ${branch.sourceBranch} -> ${branch.targetBranch}`);
			}

			if (
				weekly.commits.length > 0 ||
				weekly.sessions.length > 0 ||
				weekly.otherActivity.length > 0
			) {
				const summary_text = generateEnhancedSummary({
					date: new Date(),
					commits: weekly.commits,
					sessions: weekly.sessions,
					githubActivity: [],
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
	const output = {
		dateRange: {
			start: summary.dateRange.start.toISOString(),
			end: summary.dateRange.end.toISOString(),
		},
		projects: summary.projects.map((project) => ({
			name: project.projectName,
			path: project.projectPath === "(unattributed)" ? null : project.projectPath,
			activity: project.dailyActivity.map((daily) => ({
				date: format(daily.date, "yyyy-MM-dd"),
				summary: daily.summary ?? null,
				commitCount: daily.commits.length,
				sessionCount: daily.sessions.length,
				githubActivityCount: daily.githubActivity.length,
			})),
		})),
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
