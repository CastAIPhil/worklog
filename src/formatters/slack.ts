import type { SourceType, WorkItem, WorkSummary } from "../types.ts";
import { formatDateRange } from "../utils/dates.ts";

function groupBySource(items: WorkItem[]): Map<SourceType, WorkItem[]> {
	const groups = new Map<SourceType, WorkItem[]>();

	for (const item of items) {
		const existing = groups.get(item.source) ?? [];
		existing.push(item);
		groups.set(item.source, existing);
	}

	return groups;
}

function sourceEmoji(source: SourceType): string {
	const emojis: Record<SourceType, string> = {
		opencode: ":wrench:",
		claude: ":robot_face:",
		codex: ":computer:",
		factory: ":factory:",
		git: ":memo:",
		github: ":octocat:",
	};
	return emojis[source];
}

function sourceName(source: SourceType): string {
	const names: Record<SourceType, string> = {
		opencode: "OpenCode",
		claude: "Claude Code",
		codex: "Codex",
		factory: "Factory",
		git: "Git",
		github: "GitHub",
	};
	return names[source];
}

export function formatSlack(summary: WorkSummary): string {
	const lines: string[] = [];

	lines.push(`:calendar: *Daily Standup - ${formatDateRange(summary.dateRange)}*`);
	lines.push("");

	if (summary.llmSummary) {
		lines.push("*Summary*");
		lines.push(summary.llmSummary);
		lines.push("");
	}

	if (summary.items.length === 0) {
		lines.push("_No activity recorded for this period._");
		return lines.join("\n");
	}

	const grouped = groupBySource(summary.items);

	for (const [source, items] of grouped) {
		lines.push(`${sourceEmoji(source)} *${sourceName(source)}* (${items.length})`);

		for (const item of items.slice(0, 5)) {
			lines.push(`  • ${item.title}`);
		}

		if (items.length > 5) {
			lines.push(`  _...and ${items.length - 5} more_`);
		}

		lines.push("");
	}

	return lines.join("\n");
}
