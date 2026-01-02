import type { CliOptions, ProjectWorkSummary } from "../types.ts";
import {
	formatProjectsJson,
	formatProjectsMarkdown,
	formatProjectsPlain,
	formatProjectsSlack,
} from "./projects.ts";

export type OutputFormat = "markdown" | "json" | "plain" | "slack";

export function getFormat(options: CliOptions): OutputFormat {
	if (options.json) return "json";
	if (options.plain) return "plain";
	if (options.slack) return "slack";
	return "markdown";
}

export function formatProjectOutput(
	summary: ProjectWorkSummary,
	format: OutputFormat,
	verbose = false,
): string {
	switch (format) {
		case "json":
			return formatProjectsJson(summary, verbose);
		case "plain":
			return formatProjectsPlain(summary, verbose);
		case "slack":
			return formatProjectsSlack(summary, verbose);
		default:
			return formatProjectsMarkdown(summary, verbose);
	}
}
