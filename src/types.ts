import { z } from "zod/v4";

// Re-export context analysis types
export type { ContextCluster, SmartSummary } from "./context/analyzer.ts";

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

export interface DailyProjectActivity {
	date: Date;
	commits: WorkItem[];
	sessions: WorkItem[];
	githubActivity: WorkItem[];
	otherActivity: WorkItem[];
	summary?: string;
}

export interface ProjectActivity {
	projectName: string;
	projectPath: string;
	dailyActivity: DailyProjectActivity[];
}

export interface ProjectWorkSummary {
	dateRange: DateRange;
	projects: ProjectActivity[];
	generatedAt: Date;
	trendData?: import("./utils/trends.ts").TrendData;
}

export type SourceType =
	| "opencode"
	| "claude"
	| "codex"
	| "factory"
	| "git"
	| "github"
	| "vscode"
	| "cursor"
	| "terminal"
	| "filesystem";

export interface CliOptions {
	date?: string;
	yesterday: boolean;
	week: boolean;
	month: boolean;
	quarter: boolean;
	last: boolean;
	json: boolean;
	plain: boolean;
	slack: boolean;
	sources?: string[];
	llm: boolean;
	trends: boolean;
	dashboard: boolean;
	theme?: string;
	verbose: boolean;
	progress?: boolean;
	repos?: string[];
	smart: boolean;
}

const LlmConfigSchema = z.object({
	enabled: z.boolean().default(false),
	provider: z.enum(["openai", "anthropic"]).default("openai"),
	model: z.string().default("gpt-4o-mini"),
});

function defaultVSCodePath(): string {
	if (process.platform === "darwin") return "~/Library/Application Support/Code";
	if (process.platform === "win32") return "~/AppData/Roaming/Code";
	return "~/.config/Code";
}

function defaultCursorPath(): string {
	if (process.platform === "darwin") return "~/Library/Application Support/Cursor";
	if (process.platform === "win32") return "~/AppData/Roaming/Cursor";
	return "~/.config/Cursor";
}

function defaultTerminalHistoryPath(): string {
	if (process.platform === "win32") {
		return "~/AppData/Roaming/Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt";
	}
	return "~/.bash_history";
}

const PathsConfigSchema = z.object({
	opencode: z.string().default("~/.local/share/opencode/storage/session"),
	claude: z.string().default("~/.claude/projects"),
	codex: z.string().default("~/.codex/sessions"),
	factory: z.string().default("~/.factory/sessions"),
	vscode: z.string().default(defaultVSCodePath()),
	cursor: z.string().default(defaultCursorPath()),
	terminal: z.string().default(defaultTerminalHistoryPath()),
	filesystem: z.string().default("~/code"),
});

export const ConfigSchema = z.object({
	defaultSources: z
		.array(z.string())
		.default([
			"opencode",
			"claude",
			"codex",
			"factory",
			"git",
			"github",
			"vscode",
			"cursor",
			"terminal",
			"filesystem",
		]),
	gitRepos: z.array(z.string()).default([]),
	gitIdentityEmails: z.array(z.string()).default([]),
	githubUser: z.string().optional(),
	llm: LlmConfigSchema.default({
		enabled: false,
		provider: "openai",
		model: "gpt-4o-mini",
	}),
	paths: PathsConfigSchema.default({
		opencode: "~/.local/share/opencode/storage/session",
		claude: "~/.claude/projects",
		codex: "~/.codex/sessions",
		factory: "~/.factory/sessions",
		vscode: defaultVSCodePath(),
		cursor: defaultCursorPath(),
		terminal: defaultTerminalHistoryPath(),
		filesystem: "~/code",
	}),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface SourceReader {
	name: SourceType;
	read(dateRange: DateRange, config: Config): Promise<WorkItem[]>;
}
