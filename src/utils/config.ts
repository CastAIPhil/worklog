import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod/v4";
import { type Config, ConfigSchema } from "../types.ts";

const CONFIG_PATH = join(homedir(), ".config", "worklog", "config.json");

const VALID_SOURCES = [
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
] as const;

const VALID_SOURCE_SET = new Set<string>(VALID_SOURCES);

const EnhancedConfigSchema = ConfigSchema.superRefine((config, ctx) => {
	const invalidSources = config.defaultSources.filter((source) => !VALID_SOURCE_SET.has(source));
	if (invalidSources.length > 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: `Invalid sources: ${invalidSources.join(", ")}. Valid sources: ${VALID_SOURCES.join(", ")}`,
			path: ["defaultSources"],
		});
	}

	if (config.llm.enabled) {
		const validProviders = ["openai", "anthropic"];
		if (!validProviders.includes(config.llm.provider)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid LLM provider: ${config.llm.provider}. Valid providers: ${validProviders.join(", ")}`,
				path: ["llm", "provider"],
			});
		}
	}
});

export function expandPath(path: string): string {
	if (path.startsWith("~")) {
		return join(homedir(), path.slice(1));
	}
	return path;
}

export async function loadConfig(): Promise<Config> {
	let fileConfig: Record<string, unknown> = {};

	try {
		const file = Bun.file(CONFIG_PATH);
		if (await file.exists()) {
			const content = await file.text();
			try {
				fileConfig = JSON.parse(content);
			} catch (parseError) {
				throw new Error(
					`Invalid JSON in config file: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
				);
			}
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes("Invalid JSON")) {
			throw error;
		}
		fileConfig = {};
	}

	const envOverrides: Record<string, unknown> = {};

	if (process.env.WORKLOG_SOURCES) {
		const sources = process.env.WORKLOG_SOURCES.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		if (sources.length > 0) {
			envOverrides.defaultSources = sources;
		}
	}

	if (process.env.WORKLOG_GIT_REPOS) {
		const repos = process.env.WORKLOG_GIT_REPOS.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		if (repos.length > 0) {
			envOverrides.gitRepos = repos;
		}
	}

	if (process.env.WORKLOG_GITHUB_USER) {
		const user = process.env.WORKLOG_GITHUB_USER.trim();
		if (user.length > 0) {
			envOverrides.githubUser = user;
		}
	}

	if (process.env.WORKLOG_LLM_ENABLED !== undefined) {
		const enabled = process.env.WORKLOG_LLM_ENABLED.toLowerCase();
		envOverrides.llm = {
			...(fileConfig.llm as Record<string, unknown> | undefined),
			enabled: enabled !== "false" && enabled !== "0" && enabled !== "no",
		};
	}

	if (process.env.WORKLOG_LLM_MODEL) {
		const model = process.env.WORKLOG_LLM_MODEL.trim();
		if (model.length > 0) {
			envOverrides.llm = {
				...(fileConfig.llm as Record<string, unknown> | undefined),
				...(envOverrides.llm as Record<string, unknown> | undefined),
				model,
			};
		}
	}

	const merged = {
		...fileConfig,
		...envOverrides,
	};

	try {
		return EnhancedConfigSchema.parse(merged);
	} catch (error) {
		if (error instanceof z.ZodError) {
			const issues = error.issues
				.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
				.join("\n");
			throw new Error(`Configuration validation failed:\n${issues}`);
		}
		throw error;
	}
}

export function getConfigPath(): string {
	return CONFIG_PATH;
}
