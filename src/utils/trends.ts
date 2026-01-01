import type { DateRange, WorkItem, WorkSummary } from "../types.ts";

export interface TrendData {
	currentPeriod: {
		totalItems: number;
		itemsBySource: Record<string, number>;
		dateRange: DateRange;
	};
	previousPeriod: {
		totalItems: number;
		itemsBySource: Record<string, number>;
		dateRange: DateRange;
	};
	trends: {
		totalChange: number;
		totalChangePercent: number | null;
		sourceChanges: Record<string, { change: number; changePercent: number | null }>;
	};
}

function countItemsBySource(items: WorkItem[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const item of items) {
		counts[item.source] = (counts[item.source] ?? 0) + 1;
	}
	return counts;
}

function percentChange(current: number, previous: number): number | null {
	if (previous === 0) return null;
	return ((current - previous) / previous) * 100;
}

export function getPreviousDateRange(currentRange: DateRange): DateRange {
	const durationMs = currentRange.end.getTime() - currentRange.start.getTime();
	const previousEnd = new Date(currentRange.start.getTime() - 1);
	const previousStart = new Date(previousEnd.getTime() - durationMs);
	return { start: previousStart, end: previousEnd };
}

export function calculateTrends(
	currentSummary: WorkSummary,
	previousSummary: WorkSummary,
): TrendData {
	const currentBySource = countItemsBySource(currentSummary.items);
	const previousBySource = countItemsBySource(previousSummary.items);

	const totalCurrent = currentSummary.items.length;
	const totalPrevious = previousSummary.items.length;

	const allSources = new Set([...Object.keys(currentBySource), ...Object.keys(previousBySource)]);
	const sourceChanges: Record<string, { change: number; changePercent: number | null }> = {};

	for (const source of allSources) {
		const current = currentBySource[source] ?? 0;
		const previous = previousBySource[source] ?? 0;
		sourceChanges[source] = {
			change: current - previous,
			changePercent: percentChange(current, previous),
		};
	}

	return {
		currentPeriod: {
			totalItems: totalCurrent,
			itemsBySource: currentBySource,
			dateRange: currentSummary.dateRange,
		},
		previousPeriod: {
			totalItems: totalPrevious,
			itemsBySource: previousBySource,
			dateRange: previousSummary.dateRange,
		},
		trends: {
			totalChange: totalCurrent - totalPrevious,
			totalChangePercent: percentChange(totalCurrent, totalPrevious),
			sourceChanges,
		},
	};
}

function formatPercent(value: number | null): string {
	if (value === null) return "n/a";
	return `${Math.abs(value).toFixed(1)}%`;
}

export function formatTrendSummary(trendData: TrendData): string {
	const { currentPeriod, previousPeriod, trends } = trendData;

	const lines: string[] = [];
	lines.push("## Activity Trends");
	lines.push("");

	const overallDirection =
		trends.totalChange === 0 ? "stable" : trends.totalChange > 0 ? "up" : "down";
	lines.push(
		`Overall: ${formatPercent(trends.totalChangePercent)} ${overallDirection} (${currentPeriod.totalItems} vs ${previousPeriod.totalItems})`,
	);
	lines.push("");
	lines.push("By Source:");

	const sourceEntries = Object.entries(trends.sourceChanges)
		.filter(([, change]) => change.change !== 0)
		.sort((a, b) => Math.abs(b[1].change) - Math.abs(a[1].change));

	for (const [source, change] of sourceEntries) {
		const direction = change.change > 0 ? "up" : "down";
		const current = currentPeriod.itemsBySource[source] ?? 0;
		const previous = previousPeriod.itemsBySource[source] ?? 0;
		lines.push(
			`${source}: ${formatPercent(change.changePercent)} ${direction} (${current} vs ${previous})`,
		);
	}

	if (sourceEntries.length === 0) {
		lines.push("No source-level changes detected.");
	}

	return lines.join("\n");
}
