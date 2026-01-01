import { format } from "date-fns";
import type { WorkSummary } from "../types.ts";
import { formatDateRange } from "../utils/dates.ts";

export function formatPlain(summary: WorkSummary): string {
	const lines: string[] = [];

	lines.push(`Worklog: ${formatDateRange(summary.dateRange)}`);
	lines.push("=".repeat(50));
	lines.push("");

	if (summary.llmSummary) {
		lines.push("Summary:");
		lines.push(summary.llmSummary);
		lines.push("");
	}

	if (summary.items.length === 0) {
		lines.push("No activity recorded for this period.");
		return lines.join("\n");
	}

	for (const item of summary.items) {
		const time = format(item.timestamp, "HH:mm");
		const source = item.source.toUpperCase().padEnd(8);
		lines.push(`[${time}] ${source} ${item.title}`);
		if (item.description) {
			lines.push(`         ${" ".repeat(8)} ${item.description}`);
		}
	}

	return lines.join("\n");
}
