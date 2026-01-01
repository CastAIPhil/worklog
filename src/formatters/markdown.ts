import { format } from "date-fns";
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
		opencode: "🔧",
		claude: "🤖",
		codex: "💻",
		factory: "🏭",
		git: "📝",
		github: "🐙",
	};
	return emojis[source];
}

function sourceName(source: SourceType): string {
	const names: Record<SourceType, string> = {
		opencode: "OpenCode Sessions",
		claude: "Claude Code",
		codex: "Codex",
		factory: "Factory",
		git: "Git Commits",
		github: "GitHub Activity",
	};
	return names[source];
}

export function formatMarkdown(summary: WorkSummary): string {
	const lines: string[] = [];

	lines.push(`# Daily Standup - ${formatDateRange(summary.dateRange)}`);
	lines.push("");

	if (summary.llmSummary) {
		lines.push("## Summary");
		lines.push("");
		lines.push(summary.llmSummary);
		lines.push("");
	}

	if (summary.items.length === 0) {
		lines.push("*No activity recorded for this period.*");
		return lines.join("\n");
	}

	const grouped = groupBySource(summary.items);

	for (const [source, items] of grouped) {
		lines.push(`## ${sourceEmoji(source)} ${sourceName(source)}`);
		lines.push("");

		for (const item of items) {
			const time = format(item.timestamp, "HH:mm");
			lines.push(`- **${time}** ${item.title}`);
			if (item.description) {
				lines.push(`  - ${item.description}`);
			}
		}

		lines.push("");
	}

	lines.push("---");
	lines.push(`*Generated at ${format(summary.generatedAt, "yyyy-MM-dd HH:mm:ss")}*`);

	return lines.join("\n");
}
