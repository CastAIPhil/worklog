import { format, startOfDay } from "date-fns";
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

function getDateKey(date: Date): string {
	return format(date, "yyyy-MM-dd");
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

		const dateKey = getDateKey(item.timestamp);
		const projectDailyMap = dailyMap.get(matchedProjectKey);
		if (!projectDailyMap) continue;

		let dailyActivity = projectDailyMap.get(dateKey);
		if (!dailyActivity) {
			dailyActivity = {
				date: startOfDay(item.timestamp),
				commits: [],
				sessions: [],
				githubActivity: [],
			};
			projectDailyMap.set(dateKey, dailyActivity);
		}

		if (isGitSource(item.source)) {
			dailyActivity.commits.push(item);
		} else if (isSessionSource(item.source)) {
			dailyActivity.sessions.push(item);
		} else if (isGitHubSource(item.source)) {
			dailyActivity.githubActivity.push(item);
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
