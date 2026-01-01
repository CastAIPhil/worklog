import type { WorkSummary } from "../types.ts";

export function formatJson(summary: WorkSummary): string {
	const output = {
		dateRange: {
			start: summary.dateRange.start.toISOString(),
			end: summary.dateRange.end.toISOString(),
		},
		generatedAt: summary.generatedAt.toISOString(),
		sources: summary.sources,
		itemCount: summary.items.length,
		llmSummary: summary.llmSummary ?? null,
		items: summary.items.map((item) => ({
			source: item.source,
			timestamp: item.timestamp.toISOString(),
			title: item.title,
			description: item.description ?? null,
			metadata: item.metadata ?? null,
		})),
	};

	return JSON.stringify(output, null, 2);
}
