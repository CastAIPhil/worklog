import { format, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type {
	Config,
	DailyProjectActivity,
	DateRange,
	ProjectActivity,
	ProjectWorkSummary,
	WorkItem,
} from "./types.ts";

const MISC_PROJECT_NAME = "Misc";
const MISC_PROJECT_KEY = "__misc__";

function getProjectNameFromPath(repoPath: string): string {
	const normalized = repoPath.replace(/\/$/, "");
	const parts = normalized.split("/");
	return parts[parts.length - 1] ?? normalized;
}

function normalizeProjectName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getProjectFromWorkItem(item: WorkItem): string | undefined {
	const repo = item.metadata?.repo;
	if (typeof repo === "string") {
		return getProjectNameFromPath(repo);
	}

	const project = item.metadata?.project;
	if (typeof project === "string") {
		return project;
	}

	return undefined;
}

function matchProjectName(itemProject: string, repoProject: string): boolean {
	const normalizedItem = normalizeProjectName(itemProject);
	const normalizedRepo = normalizeProjectName(repoProject);

	if (normalizedItem === normalizedRepo) return true;

	if (normalizedItem.includes(normalizedRepo) || normalizedRepo.includes(normalizedItem)) {
		return true;
	}

	return false;
}

function getDateKey(date: Date, timeZone?: string): string {
	return timeZone ? formatInTimeZone(date, timeZone, "yyyy-MM-dd") : format(date, "yyyy-MM-dd");
}

function isSessionSource(source: string): boolean {
	return ["opencode", "claude", "codex", "factory"].includes(source);
}

function isGitHubSource(source: string): boolean {
	return source === "github";
}

function isGitSource(source: string): boolean {
	return source === "git";
}

export function aggregateByProject(
	items: WorkItem[],
	config: Config,
	dateRange: DateRange,
): ProjectWorkSummary {
	const projectMap = new Map<string, ProjectActivity>();
	const timeZone = config.timezone;

	for (const repoPath of config.gitRepos) {
		const projectName = getProjectNameFromPath(repoPath);
		projectMap.set(normalizeProjectName(projectName), {
			projectName,
			projectPath: repoPath,
			dailyActivity: [],
		});
	}

	projectMap.set(MISC_PROJECT_KEY, {
		projectName: MISC_PROJECT_NAME,
		projectPath: "(unattributed)",
		dailyActivity: [],
	});

	const dailyMap = new Map<string, Map<string, DailyProjectActivity>>();

	for (const normalizedName of projectMap.keys()) {
		dailyMap.set(normalizedName, new Map());
	}

	for (const item of items) {
		const itemProject = getProjectFromWorkItem(item);

		let matchedProjectKey: string | undefined;

		if (itemProject) {
			for (const [normalizedName, project] of projectMap) {
				if (normalizedName === MISC_PROJECT_KEY) continue;

				if (matchProjectName(itemProject, project.projectName)) {
					matchedProjectKey = normalizedName;
					break;
				}
			}
		}

		if (!matchedProjectKey) {
			matchedProjectKey = MISC_PROJECT_KEY;
		}

		const dateKey = getDateKey(item.timestamp, timeZone);
		const projectDailyMap = dailyMap.get(matchedProjectKey);
		if (!projectDailyMap) continue;

		let dailyActivity = projectDailyMap.get(dateKey);
		if (!dailyActivity) {
			dailyActivity = {
				date: timeZone
					? fromZonedTime(startOfDay(toZonedTime(item.timestamp, timeZone)), timeZone)
					: startOfDay(item.timestamp),
				commits: [],
				sessions: [],
				githubActivity: [],
				otherActivity: [],
			};
			projectDailyMap.set(dateKey, dailyActivity);
		}

		if (isGitSource(item.source)) {
			dailyActivity.commits.push(item);
		} else if (isSessionSource(item.source)) {
			dailyActivity.sessions.push(item);
		} else if (isGitHubSource(item.source)) {
			dailyActivity.githubActivity.push(item);
		} else {
			dailyActivity.otherActivity.push(item);
		}
	}

	const projects: ProjectActivity[] = [];

	for (const [normalizedName, project] of projectMap) {
		const projectDailyMap = dailyMap.get(normalizedName);
		if (!projectDailyMap || projectDailyMap.size === 0) continue;

		const dailyActivities = Array.from(projectDailyMap.values()).sort(
			(a, b) => a.date.getTime() - b.date.getTime(),
		);

		projects.push({
			...project,
			dailyActivity: dailyActivities,
		});
	}

	projects.sort((a, b) => {
		if (a.projectName === MISC_PROJECT_NAME) return 1;
		if (b.projectName === MISC_PROJECT_NAME) return -1;
		return a.projectName.localeCompare(b.projectName);
	});

	return {
		dateRange,
		projects,
		generatedAt: new Date(),
		timezone: timeZone,
	};
}

export function getCommitSubjects(commits: WorkItem[]): string[] {
	return commits.map((commit) => {
		let title = commit.title;
		const bracketMatch = /^\[([^\]]+)\]\s*/.exec(title);
		if (bracketMatch) {
			title = title.slice(bracketMatch[0].length);
		}
		return title;
	});
}

export function getSessionDescriptions(sessions: WorkItem[]): string[] {
	return sessions.map((session) => {
		let title = session.title;
		const prefixMatch = /^(OpenCode session|Claude Code \[[^\]]+\]):\s*/i.exec(title);
		if (prefixMatch) {
			title = title.slice(prefixMatch[0].length);
		}
		return title;
	});
}

export function getGitHubDescriptions(activity: WorkItem[]): string[] {
	return activity.map((item) => {
		let title = item.title;
		const bracketMatch = /^\[([^\]]+)\]\s*/.exec(title);
		if (bracketMatch) {
			title = title.slice(bracketMatch[0].length);
		}
		return title;
	});
}

/**
 * Ticket reference extracted from a commit.
 */
export interface TicketInfo {
	id: string;
	type: string;
	project?: string;
	number?: number;
	url?: string;
}

/**
 * Extract all unique tickets from a list of commits.
 */
export function extractTicketsFromCommits(commits: WorkItem[]): TicketInfo[] {
	const seenIds = new Set<string>();
	const tickets: TicketInfo[] = [];

	for (const commit of commits) {
		const commitTickets = commit.metadata?.tickets;
		if (!Array.isArray(commitTickets)) continue;

		for (const ticket of commitTickets) {
			if (typeof ticket !== "object" || ticket === null) continue;

			const id = (ticket as { id?: unknown }).id;
			if (typeof id !== "string") continue;

			const normalizedId = id.toUpperCase();
			if (seenIds.has(normalizedId)) continue;
			seenIds.add(normalizedId);

			tickets.push({
				id,
				type: String((ticket as { type?: unknown }).type ?? "unknown"),
				project:
					typeof (ticket as { project?: unknown }).project === "string"
						? (ticket as { project: string }).project
						: undefined,
				number:
					typeof (ticket as { number?: unknown }).number === "number"
						? (ticket as { number: number }).number
						: undefined,
				url:
					typeof (ticket as { url?: unknown }).url === "string"
						? (ticket as { url: string }).url
						: undefined,
			});
		}
	}

	return tickets;
}
