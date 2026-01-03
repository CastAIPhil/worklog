import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { isValid, parse } from "date-fns";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { attributeWorkItem } from "../utils/attribution.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

export interface CodexMessage {
	role: string;
	content?: string;
	timestamp?: string;
}

export interface CodexAdapter {
	readdir(path: string): Promise<string[]>;
	readFile(path: string): Promise<string>;
}

class BunCodexAdapter implements CodexAdapter {
	async readdir(path: string): Promise<string[]> {
		return readdir(path);
	}

	async readFile(path: string): Promise<string> {
		return Bun.file(path).text();
	}
}

export function extractFilePaths(content: string): string[] {
	const paths: string[] = [];
	const lines = content.split("\n");

	const pathPattern =
		/(?:^|[\s"'`(])((?:~|\/)[^\s"'`(),]+?\/[^\s"'`(),]*[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9]+)?)|(?:^|[\s"'`(])((?:src|lib|test|tests|pkg|cmd|internal|bin|scripts)\/[^\s"'`(),]+)/g;

	for (const line of lines) {
		const matches = Array.from(line.matchAll(pathPattern));
		for (const match of matches) {
			const path = match[1] || match[2];
			if (path) {
				paths.push(path);
			}
		}
	}

	return paths;
}

export function findRepoFromMessages(
	messages: CodexMessage[],
	gitRepos: string[],
): string | undefined {
	const allPaths: string[] = [];

	for (const msg of messages) {
		if (msg.content) {
			allPaths.push(...extractFilePaths(msg.content));
		}
	}

	if (allPaths.length === 0) {
		return undefined;
	}

	for (const path of allPaths) {
		const dummyItem: WorkItem = {
			source: "codex",
			timestamp: new Date(),
			title: "temp",
			metadata: { repo: path },
		};

		const attributed = attributeWorkItem(dummyItem, gitRepos);
		if (attributed !== "misc") {
			return attributed;
		}
	}

	return undefined;
}

export async function findSessionDirs(
	basePath: string,
	dateRange: DateRange,
	adapter: CodexAdapter = new BunCodexAdapter(),
): Promise<string[]> {
	const results: string[] = [];

	try {
		const years = await adapter.readdir(basePath);

		for (const year of years) {
			if (!/^\d{4}$/.test(year)) continue;

			const yearPath = join(basePath, year);
			const months = await adapter.readdir(yearPath);

			for (const month of months) {
				if (!/^\d{2}$/.test(month)) continue;

				const monthPath = join(yearPath, month);
				const days = await adapter.readdir(monthPath);

				for (const day of days) {
					if (!/^\d{2}$/.test(day)) continue;

					const dateStr = `${year}-${month}-${day}`;
					const parsed = parse(dateStr, "yyyy-MM-dd", new Date());

					if (isValid(parsed) && isWithinRange(parsed, dateRange)) {
						results.push(join(monthPath, day));
					}
				}
			}
		}
	} catch {
		return results;
	}

	return results;
}

export async function parseSessionDir(
	dirPath: string,
	gitRepos: string[],
	adapter: CodexAdapter = new BunCodexAdapter(),
): Promise<WorkItem[]> {
	const items: WorkItem[] = [];

	try {
		const files = await adapter.readdir(dirPath);
		const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

		for (const file of jsonlFiles) {
			const filePath = join(dirPath, file);
			const content = await adapter.readFile(filePath);
			const lines = content.split("\n").filter((l) => l.trim());

			let sessionStart: Date | null = null;
			const prompts: string[] = [];
			const allMessages: CodexMessage[] = [];

			for (const line of lines) {
				try {
					const msg = JSON.parse(line) as CodexMessage;

					if (msg.timestamp) {
						const timestamp = new Date(msg.timestamp);
						if (!sessionStart) {
							sessionStart = timestamp;
						}

						if (msg.role === "user" && msg.content) {
							const firstLine = String(msg.content).split("\n")[0]?.slice(0, 200) ?? "";
							prompts.push(firstLine);
						}

						allMessages.push(msg);
					}
				} catch {}
			}

			if (sessionStart && prompts.length > 0) {
				const repo = findRepoFromMessages(allMessages, gitRepos);

				items.push({
					source: "codex",
					timestamp: sessionStart,
					title: `Codex: ${prompts[0]}`,
					description: prompts.length > 1 ? `${prompts.length} prompts` : undefined,
					metadata: {
						sessionFile: basename(file),
						promptCount: prompts.length,
						...(repo && { repo }),
					},
				});
			}
		}
	} catch {
		return [];
	}

	return items;
}

export function createCodexReader(adapter: CodexAdapter = new BunCodexAdapter()): SourceReader {
	return {
		name: "codex",
		async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
			const basePath = expandPath(config.paths.codex);
			const items: WorkItem[] = [];

			try {
				const sessionDirs = await findSessionDirs(basePath, dateRange, adapter);

				for (const dir of sessionDirs) {
					const sessionItems = await parseSessionDir(dir, config.gitRepos, adapter);
					items.push(...sessionItems);
				}
			} catch {
				return [];
			}

			return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		},
	};
}

export const codexReader: SourceReader = createCodexReader();
