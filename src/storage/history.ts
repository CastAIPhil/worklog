import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { DateRange, ProjectWorkSummary } from "../types.ts";
import { filterNoiseWorkItems } from "../utils/noise.ts";

export interface HistoryEntry {
	id: string;
	timestamp: Date;
	dateRange: DateRange;
	projects: ProjectEntry[];
	sources: string[];
}

export interface ProjectEntry {
	name: string;
	path: string;
	items: HistoryWorkItem[];
}

export interface HistoryWorkItem {
	source: string;
	timestamp: Date;
	title: string;
	description?: string;
	project?: string;
}

interface StoredHistoryEntry {
	id: string;
	timestamp: string;
	dateRange: { start: string; end: string };
	projects: StoredProjectEntry[];
	sources: string[];
}

interface StoredProjectEntry {
	name: string;
	path: string;
	items: StoredHistoryWorkItem[];
}

interface StoredHistoryWorkItem {
	source: string;
	timestamp: string;
	title: string;
	description?: string;
	project?: string;
}

const HISTORY_DIR = join(homedir(), ".local", "share", "worklog");
const HISTORY_FILE = join(HISTORY_DIR, "history.jsonl");

function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function serializeEntry(entry: HistoryEntry): string {
	const stored: StoredHistoryEntry = {
		id: entry.id,
		timestamp: entry.timestamp.toISOString(),
		dateRange: {
			start: entry.dateRange.start.toISOString(),
			end: entry.dateRange.end.toISOString(),
		},
		projects: entry.projects.map((p) => ({
			name: p.name,
			path: p.path,
			items: p.items.map((item) => ({
				source: item.source,
				timestamp: item.timestamp.toISOString(),
				title: item.title,
				description: item.description,
				project: item.project,
			})),
		})),
		sources: entry.sources,
	};
	return JSON.stringify(stored);
}

function deserializeEntry(line: string): HistoryEntry | null {
	try {
		const stored: StoredHistoryEntry = JSON.parse(line);
		return {
			id: stored.id,
			timestamp: new Date(stored.timestamp),
			dateRange: {
				start: new Date(stored.dateRange.start),
				end: new Date(stored.dateRange.end),
			},
			projects: stored.projects.map((p) => ({
				name: p.name,
				path: p.path,
				items: p.items.map((item) => ({
					source: item.source,
					timestamp: new Date(item.timestamp),
					title: item.title,
					description: item.description,
					project: item.project,
				})),
			})),
			sources: stored.sources,
		};
	} catch {
		return null;
	}
}

export async function ensureHistoryDir(): Promise<void> {
	await mkdir(HISTORY_DIR, { recursive: true });
}

export async function saveToHistory(summary: ProjectWorkSummary): Promise<HistoryEntry> {
	await ensureHistoryDir();

	const projects: ProjectEntry[] = summary.projects.map((project) => {
		const items: HistoryWorkItem[] = [];

		for (const daily of project.dailyActivity) {
			for (const commit of daily.commits) {
				items.push({
					source: commit.source,
					timestamp: commit.timestamp,
					title: commit.title,
					description: commit.description,
					project: project.projectName,
				});
			}
			for (const session of daily.sessions) {
				items.push({
					source: session.source,
					timestamp: session.timestamp,
					title: session.title,
					description: session.description,
					project: project.projectName,
				});
			}
			for (const activity of daily.githubActivity) {
				items.push({
					source: activity.source,
					timestamp: activity.timestamp,
					title: activity.title,
					description: activity.description,
					project: project.projectName,
				});
			}
			for (const other of daily.otherActivity) {
				items.push({
					source: other.source,
					timestamp: other.timestamp,
					title: other.title,
					description: other.description,
					project: project.projectName,
				});
			}
		}

		const filteredItems = filterNoiseWorkItems(items);

		return {
			name: project.projectName,
			path: project.projectPath,
			items: filteredItems,
		};
	});

	const sources = [
		...new Set(projects.flatMap((project) => project.items.map((item) => item.source))),
	];

	const entry: HistoryEntry = {
		id: generateId(),
		timestamp: new Date(),
		dateRange: summary.dateRange,
		projects,
		sources,
	};

	const line = serializeEntry(entry);
	const file = Bun.file(HISTORY_FILE);

	let existingContent = "";
	if (await file.exists()) {
		existingContent = await file.text();
		if (existingContent && !existingContent.endsWith("\n")) {
			existingContent += "\n";
		}
	}

	await Bun.write(HISTORY_FILE, `${existingContent}${line}\n`);

	return entry;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
	const file = Bun.file(HISTORY_FILE);

	if (!(await file.exists())) {
		return [];
	}

	const content = await file.text();
	const lines = content.split("\n").filter((line) => line.trim());

	const entries: HistoryEntry[] = [];
	for (const line of lines) {
		const entry = deserializeEntry(line);
		if (entry) {
			entries.push(entry);
		}
	}

	return entries;
}

export async function getAllHistoryItems(): Promise<HistoryWorkItem[]> {
	const entries = await loadHistory();
	const items: HistoryWorkItem[] = [];

	for (const entry of entries) {
		for (const project of entry.projects) {
			items.push(...project.items);
		}
	}

	return items;
}

export function getHistoryPath(): string {
	return HISTORY_FILE;
}
