import type { CliOptions, WorkSummary } from "../types.ts";
import { formatJson } from "./json.ts";
import { formatMarkdown } from "./markdown.ts";
import { formatPlain } from "./plain.ts";
import { formatSlack } from "./slack.ts";

export type OutputFormat = "markdown" | "json" | "plain" | "slack";

export function getFormat(options: CliOptions): OutputFormat {
	if (options.json) return "json";
	if (options.plain) return "plain";
	if (options.slack) return "slack";
	return "markdown";
}

export function formatOutput(summary: WorkSummary, format: OutputFormat): string {
	switch (format) {
		case "json":
			return formatJson(summary);
		case "plain":
			return formatPlain(summary);
		case "slack":
			return formatSlack(summary);
		default:
			return formatMarkdown(summary);
	}
}
