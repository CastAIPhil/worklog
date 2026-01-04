import { mkdir, readdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { addDays, endOfDay, format, getQuarter, isAfter, startOfDay } from "date-fns";
import type { DateRange, SourceType, WorkItem, WorkSummary } from "../types.ts";

export type SnapshotPeriod = "daily" | "weekly" | "monthly" | "quarterly";

export interface SnapshotWorkItem {
	source: SourceType;
	timestamp: string;
	title: string;
	description?: string;
}

export interface WorklogSnapshotV1 {
	schemaVersion: 1;
	period: SnapshotPeriod;
	dateRange: { start: string; end: string };
	generatedAt: string;
	sources: SourceType[];
	items: SnapshotWorkItem[];
}

export function getDefaultSnapshotsRootDir(): string {
	return join(homedir(), ".local", "share", "worklog");
}

export function getSnapshotsDir(
	period: SnapshotPeriod,
	rootDir = getDefaultSnapshotsRootDir(),
): string {
	return join(rootDir, period);
}

export function getSnapshotKey(period: SnapshotPeriod, anchorDate: Date): string {
	switch (period) {
		case "daily":
		case "weekly":
			return format(anchorDate, "yyyy-MM-dd");
		case "monthly":
			return format(anchorDate, "yyyy-MM");
		case "quarterly": {
			const year = anchorDate.getFullYear();
			const quarter = getQuarter(anchorDate);
			return `${year}-Q${quarter}`;
		}
	}
}

export function getSnapshotFilename(period: SnapshotPeriod, key: string): string {
	switch (period) {
		case "daily":
			return `standup-${key}.json`;
		case "weekly":
			return `standup-week-${key}.json`;
		case "monthly":
			return `standup-month-${key}.json`;
		case "quarterly":
			return `standup-quarter-${key}.json`;
	}
}

export function getSnapshotPath(
	period: SnapshotPeriod,
	key: string,
	rootDir = getDefaultSnapshotsRootDir(),
): string {
	return join(getSnapshotsDir(period, rootDir), getSnapshotFilename(period, key));
}

function snapshotFromSummary(period: SnapshotPeriod, summary: WorkSummary): WorklogSnapshotV1 {
	return {
		schemaVersion: 1,
		period,
		dateRange: {
			start: summary.dateRange.start.toISOString(),
			end: summary.dateRange.end.toISOString(),
		},
		generatedAt: summary.generatedAt.toISOString(),
		sources: summary.sources,
		items: summary.items.map((item) => ({
			source: item.source,
			timestamp: item.timestamp.toISOString(),
			title: item.title,
			description: item.description,
		})),
	};
}

function summaryFromSnapshot(snapshot: WorklogSnapshotV1): WorkSummary {
	const items: WorkItem[] = snapshot.items.map((item) => ({
		source: item.source,
		timestamp: new Date(item.timestamp),
		title: item.title,
		description: item.description,
	}));

	return {
		dateRange: {
			start: new Date(snapshot.dateRange.start),
			end: new Date(snapshot.dateRange.end),
		},
		items,
		sources: snapshot.sources,
		generatedAt: new Date(snapshot.generatedAt),
	};
}

function parseSnapshotKeyFromFilename(period: SnapshotPeriod, filename: string): string | null {
	switch (period) {
		case "daily": {
			const match = /^standup-(\d{4}-\d{2}-\d{2})\.json$/.exec(filename);
			return match?.[1] ?? null;
		}
		case "weekly": {
			const match = /^standup-week-(\d{4}-\d{2}-\d{2})\.json$/.exec(filename);
			return match?.[1] ?? null;
		}
		case "monthly": {
			const match = /^standup-month-(\d{4}-\d{2})\.json$/.exec(filename);
			return match?.[1] ?? null;
		}
		case "quarterly": {
			const match = /^standup-quarter-(\d{4}-Q[1-4])\.json$/.exec(filename);
			return match?.[1] ?? null;
		}
	}
}

export async function listSnapshotKeys(
	period: SnapshotPeriod,
	rootDir = getDefaultSnapshotsRootDir(),
): Promise<string[]> {
	const dir = getSnapshotsDir(period, rootDir);
	let entries: string[];

	try {
		entries = await readdir(dir);
	} catch {
		return [];
	}

	const keys = entries
		.map((name) => parseSnapshotKeyFromFilename(period, name))
		.filter((key): key is string => Boolean(key))
		.sort();

	keys.reverse();
	return keys;
}

export async function loadSnapshot(
	period: SnapshotPeriod,
	key: string,
	rootDir = getDefaultSnapshotsRootDir(),
): Promise<WorkSummary> {
	const path = getSnapshotPath(period, key, rootDir);
	const file = Bun.file(path);

	if (!(await file.exists())) {
		throw new Error(`Snapshot not found: ${path}`);
	}

	const raw = await file.text();
	const parsed: unknown = JSON.parse(raw);
	if (!parsed || typeof parsed !== "object") {
		throw new Error(`Invalid snapshot JSON: ${path}`);
	}

	const snapshot = parsed as WorklogSnapshotV1;
	if (snapshot.schemaVersion !== 1) {
		throw new Error(
			`Unsupported snapshot schemaVersion: ${(snapshot as { schemaVersion?: unknown }).schemaVersion}`,
		);
	}

	return summaryFromSnapshot(snapshot);
}

export async function writeSnapshot(
	period: SnapshotPeriod,
	summary: WorkSummary,
	rootDir = getDefaultSnapshotsRootDir(),
): Promise<{ key: string; path: string }> {
	const anchorDate = summary.dateRange.start;
	const key = getSnapshotKey(period, anchorDate);
	const dir = getSnapshotsDir(period, rootDir);
	const path = getSnapshotPath(period, key, rootDir);

	await mkdir(dir, { recursive: true });

	const snapshot = snapshotFromSummary(period, summary);
	const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
	const tmpPath = join(dir, `.tmp-${getSnapshotFilename(period, key)}-${Date.now()}`);

	await Bun.write(tmpPath, payload);
	await rename(tmpPath, path);

	return { key, path };
}

export async function aggregateDailySnapshots(
	start: Date,
	end: Date,
	rootDir = getDefaultSnapshotsRootDir(),
): Promise<WorkSummary> {
	const startDay = startOfDay(start);
	const endDay = endOfDay(end);
	if (isAfter(startDay, endDay)) {
		throw new Error("Start date must be <= end date");
	}

	const items: WorkItem[] = [];
	const sources = new Set<SourceType>();

	for (let cursor = startDay; !isAfter(cursor, endDay); cursor = addDays(cursor, 1)) {
		const key = getSnapshotKey("daily", cursor);
		const path = getSnapshotPath("daily", key, rootDir);
		const file = Bun.file(path);
		if (!(await file.exists())) {
			continue;
		}

		const summary = await loadSnapshot("daily", key, rootDir);
		items.push(...summary.items);
		for (const source of summary.sources) {
			sources.add(source);
		}
	}

	items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	return {
		dateRange: { start: startDay, end: endDay },
		items,
		sources: [...sources],
		generatedAt: new Date(),
	};
}

export function getSnapshotDateRange(period: SnapshotPeriod, key: string): DateRange {
	switch (period) {
		case "daily": {
			const date = new Date(`${key}T00:00:00`);
			return { start: startOfDay(date), end: endOfDay(date) };
		}
		case "weekly": {
			const date = new Date(`${key}T00:00:00`);
			return { start: startOfDay(date), end: endOfDay(addDays(date, 6)) };
		}
		case "monthly": {
			const date = new Date(`${key}-01T00:00:00`);
			const nextMonth = new Date(date);
			nextMonth.setMonth(nextMonth.getMonth() + 1);
			nextMonth.setDate(0);
			return { start: startOfDay(date), end: endOfDay(nextMonth) };
		}
		case "quarterly": {
			const match = /^(\d{4})-Q([1-4])$/.exec(key);
			if (!match) {
				throw new Error(`Invalid quarterly key: ${key}`);
			}
			const year = Number.parseInt(match[1] ?? "0", 10);
			const quarter = Number.parseInt(match[2] ?? "1", 10);
			const startMonth = (quarter - 1) * 3;
			const startDate = new Date(year, startMonth, 1);
			const endDate = new Date(year, startMonth + 3, 0);
			return { start: startOfDay(startDate), end: endOfDay(endDate) };
		}
	}
}
