import { homedir } from "node:os";
import { join } from "node:path";
import { type Config, ConfigSchema } from "../types.ts";

const CONFIG_PATH = join(homedir(), ".config", "worklog", "config.json");

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
			fileConfig = await file.json();
		}
	} catch {
		fileConfig = {};
	}

	const envOverrides: Record<string, unknown> = {};

	if (process.env.WORKLOG_SOURCES) {
		envOverrides.defaultSources = process.env.WORKLOG_SOURCES.split(",").map((s) => s.trim());
	}

	if (process.env.WORKLOG_GIT_REPOS) {
		envOverrides.gitRepos = process.env.WORKLOG_GIT_REPOS.split(",").map((s) => s.trim());
	}

	if (process.env.WORKLOG_GITHUB_USER) {
		envOverrides.githubUser = process.env.WORKLOG_GITHUB_USER;
	}

	if (process.env.WORKLOG_LLM_ENABLED) {
		envOverrides.llm = {
			...(fileConfig.llm as Record<string, unknown> | undefined),
			enabled: process.env.WORKLOG_LLM_ENABLED !== "false",
		};
	}

	if (process.env.WORKLOG_LLM_MODEL) {
		envOverrides.llm = {
			...(fileConfig.llm as Record<string, unknown> | undefined),
			...(envOverrides.llm as Record<string, unknown> | undefined),
			model: process.env.WORKLOG_LLM_MODEL,
		};
	}

	const merged = {
		...fileConfig,
		...envOverrides,
	};

	return ConfigSchema.parse(merged);
}

export function getConfigPath(): string {
	return CONFIG_PATH;
}
