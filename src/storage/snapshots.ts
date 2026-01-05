import { mkdir, readdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
	addDays,
	endOfDay,
	endOfMonth,
	endOfQuarter,
	format,
	getQuarter,
	isAfter,
	startOfDay,
	startOfMonth,
	startOfQuarter,
	startOfWeek,
} from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
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

export function getSnapshotKey(
	period: SnapshotPeriod,
	anchorDate: Date,
	timeZone?: string,
): string {
	switch (period) {
		case "daily":
		case "weekly":
			return timeZone
				? formatInTimeZone(anchorDate, timeZone, "yyyy-MM-dd")
				: format(anchorDate, "yyyy-MM-dd");
		case "monthly":
			return timeZone
				? formatInTimeZone(anchorDate, timeZone, "yyyy-MM")
				: format(anchorDate, "yyyy-MM");
		case "quarterly": {
			const zoned = timeZone ? toZonedTime(anchorDate, timeZone) : anchorDate;
			const year = zoned.getFullYear();
			const quarter = getQuarter(zoned);
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
	timeZone?: string,
): Promise<{ key: string; path: string }> {
	const anchorDate = summary.dateRange.start;
	const key = getSnapshotKey(period, anchorDate, timeZone);
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
	timeZone?: string,
): Promise<WorkSummary> {
	const startDayZoned = timeZone ? startOfDay(toZonedTime(start, timeZone)) : startOfDay(start);
	const endDayZoned = timeZone ? endOfDay(toZonedTime(end, timeZone)) : endOfDay(end);
	const rangeStart = timeZone ? fromZonedTime(startDayZoned, timeZone) : startDayZoned;
	const rangeEnd = timeZone ? fromZonedTime(endDayZoned, timeZone) : endDayZoned;
	if (isAfter(rangeStart, rangeEnd)) {
		throw new Error("Start date must be <= end date");
	}

	const items: WorkItem[] = [];
	const sources = new Set<SourceType>();

	for (
		let cursorZoned = startDayZoned;
		!isAfter(cursorZoned, endDayZoned);
		cursorZoned = addDays(cursorZoned, 1)
	) {
		const anchor = timeZone ? fromZonedTime(cursorZoned, timeZone) : cursorZoned;
		const key = getSnapshotKey("daily", anchor, timeZone);
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
		dateRange: { start: rangeStart, end: rangeEnd },
		items,
		sources: [...sources],
		generatedAt: new Date(),
	};
}

export function getSnapshotDateRange(
	period: SnapshotPeriod,
	key: string,
	timeZone?: string,
): DateRange {
	function asRange(startZoned: Date, endZoned: Date): DateRange {
		return {
			start: timeZone ? fromZonedTime(startZoned, timeZone) : startZoned,
			end: timeZone ? fromZonedTime(endZoned, timeZone) : endZoned,
		};
	}

	function parseYmd(value: string): { year: number; month: number; day: number } {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (!match) {
			throw new Error(`Invalid date key: ${value}`);
		}
		return {
			year: Number.parseInt(match[1] ?? "0", 10),
			month: Number.parseInt(match[2] ?? "0", 10),
			day: Number.parseInt(match[3] ?? "0", 10),
		};
	}

	function parseYm(value: string): { year: number; month: number } {
		const match = /^(\d{4})-(\d{2})$/.exec(value);
		if (!match) {
			throw new Error(`Invalid month key: ${value}`);
		}
		return {
			year: Number.parseInt(match[1] ?? "0", 10),
			month: Number.parseInt(match[2] ?? "0", 10),
		};
	}

	switch (period) {
		case "daily": {
			const { year, month, day } = parseYmd(key);
			const zoned = new Date(year, month - 1, day);
			return asRange(startOfDay(zoned), endOfDay(zoned));
		}
		case "weekly": {
			const { year, month, day } = parseYmd(key);
			const zoned = new Date(year, month - 1, day);
			return asRange(startOfDay(zoned), endOfDay(addDays(zoned, 6)));
		}
		case "monthly": {
			const { year, month } = parseYm(key);
			const zoned = new Date(year, month - 1, 1);
			return asRange(startOfMonth(zoned), endOfMonth(zoned));
		}
		case "quarterly": {
			const match = /^(\d{4})-Q([1-4])$/.exec(key);
			if (!match) {
				throw new Error(`Invalid quarterly key: ${key}`);
			}
			const year = Number.parseInt(match[1] ?? "0", 10);
			const quarter = Number.parseInt(match[2] ?? "1", 10);
			const startMonth = (quarter - 1) * 3;
			const zoned = new Date(year, startMonth, 1);
			const quarterStart = startOfQuarter(zoned);
			return asRange(quarterStart, endOfQuarter(quarterStart));
		}
	}
}

export interface RegenerateDailyFromWeeklyOptions {
	rootDir?: string;
	timeZone?: string;
	overwrite?: boolean;
	backup?: boolean;
	dryRun?: boolean;
	force?: boolean;
	now?: Date;
}

export type RegenerateDailyFromWeeklyResult =
	| {
			success: true;
			dailyKey: string;
			weeklyKey: string;
			path: string;
			backedUp: boolean;
			backupPath?: string;
			originalItems: number;
			newItems: number;
			itemsAdded: number;
			wrote: boolean;
	  }
	| {
			success: false;
			dailyKey: string;
			weeklyKey?: string;
			error: string;
	  };

function normalizeWorkItem(item: WorkItem): string {
	return JSON.stringify({
		timestamp: item.timestamp.toISOString(),
		source: item.source,
		title: item.title,
		description: item.description ?? null,
	});
}

function formatBackupSuffix(now: Date): string {
	return now.toISOString().replace(/[:.]/g, "-");
}

export async function regenerateDailyFromWeekly(
	dailyKey: string,
	options: RegenerateDailyFromWeeklyOptions = {},
): Promise<RegenerateDailyFromWeeklyResult> {
	const {
		rootDir = getDefaultSnapshotsRootDir(),
		timeZone,
		overwrite = false,
		backup = true,
		dryRun = false,
		force = false,
		now = new Date(),
	} = options;

	try {
		const dailyRange = getSnapshotDateRange("daily", dailyKey, timeZone);
		const dayStartZoned = timeZone ? toZonedTime(dailyRange.start, timeZone) : dailyRange.start;
		const weekStartZoned = startOfWeek(dayStartZoned, { weekStartsOn: 1 });
		const weekStartUtc = timeZone ? fromZonedTime(weekStartZoned, timeZone) : weekStartZoned;
		const weeklyKey = getSnapshotKey("weekly", weekStartUtc, timeZone);

		const weekly = await loadSnapshot("weekly", weeklyKey, rootDir);
		const expectedItems = weekly.items.filter(
			(item) => item.timestamp >= dailyRange.start && item.timestamp <= dailyRange.end,
		);
		expectedItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

		const expectedSources = [...new Set(expectedItems.map((item) => item.source))] as SourceType[];

		const dailyPath = getSnapshotPath("daily", dailyKey, rootDir);
		const dailyFile = Bun.file(dailyPath);
		const dailyExists = await dailyFile.exists();

		let originalItems = 0;
		if (dailyExists) {
			try {
				const existing = await loadSnapshot("daily", dailyKey, rootDir);
				originalItems = existing.items.length;
			} catch {
				originalItems = 0;
			}
		}

		const newItems = expectedItems.length;
		if (!force && dailyExists && newItems < originalItems) {
			return {
				success: false,
				dailyKey,
				weeklyKey,
				error: `Refusing to overwrite ${dailyKey}: weekly slice has fewer items (${newItems}) than existing daily (${originalItems}). Pass --force to allow shrinking.`,
			};
		}

		if (dailyExists && !overwrite) {
			return {
				success: false,
				dailyKey,
				weeklyKey,
				error: `Daily snapshot already exists: ${dailyPath}`,
			};
		}

		const summary: WorkSummary = {
			dateRange: dailyRange,
			items: expectedItems,
			sources: expectedSources,
			generatedAt: now,
		};

		if (dryRun) {
			return {
				success: true,
				dailyKey,
				weeklyKey,
				path: dailyPath,
				backedUp: false,
				originalItems,
				newItems,
				itemsAdded: Math.max(0, newItems - originalItems),
				wrote: false,
			};
		}

		let backedUp = false;
		let backupPath: string | undefined;
		if (dailyExists && backup) {
			backupPath = `${dailyPath}.bak-${formatBackupSuffix(now)}`;
			await rename(dailyPath, backupPath);
			backedUp = true;
		}

		const written = await writeSnapshot("daily", summary, rootDir, timeZone);

		return {
			success: true,
			dailyKey,
			weeklyKey,
			path: written.path,
			backedUp,
			backupPath,
			originalItems,
			newItems,
			itemsAdded: Math.max(0, newItems - originalItems),
			wrote: true,
		};
	} catch (error) {
		return {
			success: false,
			dailyKey,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export interface WeeklySnapshotVerificationIssue {
	type: "missing-daily" | "incomplete-daily";
	dailyKey?: string;
	message: string;
}

export interface WeeklySnapshotVerificationWeek {
	weeklyKey: string;
	issues: WeeklySnapshotVerificationIssue[];
}

export interface WeeklySnapshotVerificationResult {
	ok: boolean;
	weeksChecked: number;
	weeksWithIssues: number;
	weekly: WeeklySnapshotVerificationWeek[];
}

export async function verifyWeeklySnapshots(
	options: { rootDir?: string; timeZone?: string } = {},
): Promise<WeeklySnapshotVerificationResult> {
	const { rootDir = getDefaultSnapshotsRootDir(), timeZone } = options;

	const weeklyKeys = await listSnapshotKeys("weekly", rootDir);
	const weeklyResults: WeeklySnapshotVerificationWeek[] = [];

	for (const weeklyKey of weeklyKeys) {
		const issues: WeeklySnapshotVerificationIssue[] = [];

		let weekly: WorkSummary;
		try {
			weekly = await loadSnapshot("weekly", weeklyKey, rootDir);
		} catch (error) {
			issues.push({
				type: "incomplete-daily",
				message: `Failed to load weekly snapshot ${weeklyKey}: ${error instanceof Error ? error.message : String(error)}`,
			});
			weeklyResults.push({ weeklyKey, issues });
			continue;
		}

		const weeklyRange = getSnapshotDateRange("weekly", weeklyKey, timeZone);
		const weekStartZoned = timeZone ? toZonedTime(weeklyRange.start, timeZone) : weeklyRange.start;

		for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
			const dayZoned = addDays(weekStartZoned, dayIndex);
			const dayUtc = timeZone ? fromZonedTime(dayZoned, timeZone) : dayZoned;
			const dailyKey = getSnapshotKey("daily", dayUtc, timeZone);
			const dailyRange = getSnapshotDateRange("daily", dailyKey, timeZone);

			const expected = weekly.items.filter(
				(item) => item.timestamp >= dailyRange.start && item.timestamp <= dailyRange.end,
			);
			if (expected.length === 0) {
				continue;
			}

			const dailyPath = getSnapshotPath("daily", dailyKey, rootDir);
			if (!(await Bun.file(dailyPath).exists())) {
				issues.push({
					type: "missing-daily",
					dailyKey,
					message: `Missing daily snapshot ${dailyKey} (expected ${expected.length} items from weekly ${weeklyKey})`,
				});
				continue;
			}

			let daily: WorkSummary;
			try {
				daily = await loadSnapshot("daily", dailyKey, rootDir);
			} catch (error) {
				issues.push({
					type: "incomplete-daily",
					dailyKey,
					message: `Failed to load daily snapshot ${dailyKey}: ${error instanceof Error ? error.message : String(error)}`,
				});
				continue;
			}

			const expectedSet = new Set(expected.map(normalizeWorkItem));
			const dailySet = new Set(daily.items.map(normalizeWorkItem));
			let missing = 0;
			for (const expectedItem of expectedSet) {
				if (!dailySet.has(expectedItem)) {
					missing++;
				}
			}

			if (missing > 0) {
				issues.push({
					type: "incomplete-daily",
					dailyKey,
					message: `Daily snapshot ${dailyKey} is missing ${missing} items present in weekly ${weeklyKey} (daily ${daily.items.length}, expected ${expectedSet.size})`,
				});
			}
		}

		weeklyResults.push({ weeklyKey, issues });
	}

	const weeksChecked = weeklyResults.length;
	const weeksWithIssues = weeklyResults.filter((week) => week.issues.length > 0).length;

	return {
		ok: weeksWithIssues === 0,
		weeksChecked,
		weeksWithIssues,
		weekly: weeklyResults,
	};
}
