import type { OutputFormat } from "./formatters/index.ts";
import { type SnapshotPeriod, writeSnapshot } from "./storage/snapshots.ts";
import type { DateRange, SourceType, WorkItem, WorkSummary } from "./types.ts";
import { parseDateRange } from "./utils/dates.ts";
import { filterNoiseWorkItems } from "./utils/noise.ts";

export type SchedulePeriod = SnapshotPeriod;

export type Fetcher = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;

export type SlackPostResult = { ok: true } | { ok: false; status: number; statusText: string };

export interface ScheduleRunOptions {
	period: SchedulePeriod;
	slackWebhook?: string;
	rootDir?: string;
	now?: Date;
}

export interface ScheduleRunDependencies<TConfig extends { timezone?: string }, TProjectSummary> {
	config: TConfig;
	readers: Array<{
		name: string;
		read(dateRange: DateRange, config: TConfig): Promise<WorkItem[]>;
	}>;
	aggregator: (items: WorkItem[], config: TConfig, dateRange: DateRange) => TProjectSummary;
	formatter: (summary: TProjectSummary, format: OutputFormat, verbose: boolean) => string;
	slackPoster: (webhook: string, text: string, fetchImpl?: Fetcher) => Promise<SlackPostResult>;
	fetchImpl?: Fetcher;
}

export function computePreviousPeriodDateRange(
	period: SchedulePeriod,
	referenceNow = new Date(),
	timeZone?: string,
): DateRange {
	const baseOptions = {
		yesterday: false,
		week: false,
		month: false,
		quarter: false,
		last: false,
		json: false,
		plain: false,
		slack: false,
		llm: false,
		smart: false,
		trends: false,
		dashboard: false,
		productivity: false,
		verbose: false,
	} as const;

	switch (period) {
		case "daily":
			return parseDateRange({ ...baseOptions, yesterday: true }, referenceNow, timeZone);
		case "weekly":
			return parseDateRange({ ...baseOptions, week: true, last: true }, referenceNow, timeZone);
		case "monthly":
			return parseDateRange({ ...baseOptions, month: true, last: true }, referenceNow, timeZone);
		case "quarterly":
			return parseDateRange({ ...baseOptions, quarter: true, last: true }, referenceNow, timeZone);
	}
}

export interface ScheduleRunResult {
	snapshot: { key: string; path: string };
	slack?: SlackPostResult;
	slackText?: string;
	itemsCount: number;
	skippedSources: number;
}

export async function scheduleRun<TConfig extends { timezone?: string }, TProjectSummary>(
	options: ScheduleRunOptions,
	deps: ScheduleRunDependencies<TConfig, TProjectSummary>,
): Promise<ScheduleRunResult> {
	const now = options.now ?? new Date();
	const timeZone = deps.config.timezone;
	const dateRange = computePreviousPeriodDateRange(options.period, now, timeZone);

	let skippedSources = 0;
	const allItems: WorkItem[] = [];
	for (const reader of deps.readers) {
		try {
			const items = await reader.read(dateRange, deps.config);
			allItems.push(...items);
		} catch {
			skippedSources++;
		}
	}

	const filteredItems = filterNoiseWorkItems(allItems);
	filteredItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	const sources = [...new Set(filteredItems.map((item) => item.source))] as SourceType[];
	const summary: WorkSummary = {
		dateRange,
		items: filteredItems,
		sources,
		generatedAt: now,
	};

	const snapshot = await writeSnapshot(options.period, summary, options.rootDir, timeZone);

	let slackResult: SlackPostResult | undefined;
	let slackText: string | undefined;
	if (options.slackWebhook) {
		const projectSummary = deps.aggregator(filteredItems, deps.config, dateRange);
		slackText = deps.formatter(projectSummary, "slack", false);
		slackResult = await deps.slackPoster(options.slackWebhook, slackText, deps.fetchImpl);
	}

	return {
		snapshot,
		slack: slackResult,
		slackText,
		itemsCount: filteredItems.length,
		skippedSources,
	};
}
