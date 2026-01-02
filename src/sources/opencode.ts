import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { attributeWorkItem } from "../utils/attribution.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

interface OpenCodeMessage {
	role: string;
	content?: string;
	timestamp?: string;
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
	messages: OpenCodeMessage[],
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
			source: "opencode",
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

async function parseSessionFile(
	filePath: string,
	dateRange: DateRange,
	gitRepos: string[],
): Promise<WorkItem[]> {
	const items: WorkItem[] = [];

	try {
		const file = Bun.file(filePath);
		const content = await file.text();
		const lines = content.split("\n").filter((line) => line.trim());

		let sessionStart: Date | null = null;
		const userMessages: string[] = [];
		const allMessages: OpenCodeMessage[] = [];

		for (const line of lines) {
			try {
				const msg = JSON.parse(line) as OpenCodeMessage;

				if (msg.timestamp) {
					const timestamp = new Date(msg.timestamp);
					if (!sessionStart) {
						sessionStart = timestamp;
					}

					if (msg.role === "user" && msg.content && isWithinRange(timestamp, dateRange)) {
						const firstLine = msg.content.split("\n")[0]?.slice(0, 200) ?? "";
						userMessages.push(firstLine);
					}

					allMessages.push(msg);
				}
			} catch {}
		}

		if (sessionStart && isWithinRange(sessionStart, dateRange) && userMessages.length > 0) {
			const repo = findRepoFromMessages(allMessages, gitRepos);

			items.push({
				source: "opencode",
				timestamp: sessionStart,
				title: `OpenCode session: ${userMessages[0]}`,
				description: userMessages.length > 1 ? `${userMessages.length} interactions` : undefined,
				metadata: {
					sessionFile: basename(filePath),
					messageCount: userMessages.length,
					...(repo && { repo }),
				},
			});
		}
	} catch {
		return [];
	}

	return items;
}

export const opencodeReader: SourceReader = {
	name: "opencode",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const basePath = expandPath(config.paths.opencode);
		const items: WorkItem[] = [];

		try {
			const files = await readdir(basePath);
			const jsonlFiles = files.filter((f) => f.endsWith(".jsonl"));

			for (const file of jsonlFiles) {
				const sessionItems = await parseSessionFile(
					join(basePath, file),
					dateRange,
					config.gitRepos,
				);
				items.push(...sessionItems);
			}
		} catch {
			return [];
		}

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
