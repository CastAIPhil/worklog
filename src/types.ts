import { z } from "zod/v4";

export interface DateRange {
	start: Date;
	end: Date;
}

export interface WorkItem {
	source: SourceType;
	timestamp: Date;
	title: string;
	description?: string;
	metadata?: Record<string, unknown>;
}

export interface WorkSummary {
	dateRange: DateRange;
	items: WorkItem[];
	sources: SourceType[];
	generatedAt: Date;
	llmSummary?: string;
}

export type SourceType = "opencode" | "claude" | "codex" | "factory" | "git" | "github";

export interface CliOptions {
	date?: string;
	yesterday: boolean;
	week: boolean;
	month: boolean;
	json: boolean;
	plain: boolean;
	slack: boolean;
	sources?: string[];
	noLlm: boolean;
	verbose: boolean;
	repos?: string[];
}

const LlmConfigSchema = z.object({
	enabled: z.boolean().default(true),
	provider: z.enum(["openai", "anthropic"]).default("openai"),
	model: z.string().default("gpt-4o-mini"),
});

const PathsConfigSchema = z.object({
	opencode: z.string().default("~/.local/share/opencode/storage/session"),
	claude: z.string().default("~/.claude/projects"),
	codex: z.string().default("~/.codex/sessions"),
	factory: z.string().default("~/.factory/sessions"),
});

export const ConfigSchema = z.object({
	defaultSources: z
		.array(z.string())
		.default(["opencode", "claude", "codex", "factory", "git", "github"]),
	gitRepos: z.array(z.string()).default([]),
	githubUser: z.string().optional(),
	llm: LlmConfigSchema.default({
		enabled: true,
		provider: "openai",
		model: "gpt-4o-mini",
	}),
	paths: PathsConfigSchema.default({
		opencode: "~/.local/share/opencode/storage/session",
		claude: "~/.claude/projects",
		codex: "~/.codex/sessions",
		factory: "~/.factory/sessions",
	}),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface SourceReader {
	name: SourceType;
	read(dateRange: DateRange, config: Config): Promise<WorkItem[]>;
}
