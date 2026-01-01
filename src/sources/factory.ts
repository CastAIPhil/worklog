import { readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

async function findJsonlFiles(dir: string): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(dir, entry.name);

			if (entry.isDirectory()) {
				const nested = await findJsonlFiles(fullPath);
				results.push(...nested);
			} else if (entry.name.endsWith(".jsonl")) {
				results.push(fullPath);
			}
		}
	} catch {
		return results;
	}

	return results;
}

async function parseSessionFile(filePath: string, dateRange: DateRange): Promise<WorkItem[]> {
	const items: WorkItem[] = [];

	try {
		const file = Bun.file(filePath);
		const content = await file.text();
		const lines = content.split("\n").filter((line) => line.trim());

		let sessionStart: Date | null = null;
		const userMessages: string[] = [];

		for (const line of lines) {
			try {
				const msg = JSON.parse(line);

				if (msg.timestamp) {
					const timestamp = new Date(msg.timestamp);
					if (!sessionStart) {
						sessionStart = timestamp;
					}

					if (msg.role === "user" && msg.content && isWithinRange(timestamp, dateRange)) {
						const contentStr =
							typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
						const firstLine = contentStr.split("\n")[0]?.slice(0, 200) ?? "";
						userMessages.push(firstLine);
					}
				}
			} catch {}
		}

		if (sessionStart && isWithinRange(sessionStart, dateRange) && userMessages.length > 0) {
			const projectDir = dirname(filePath);
			const projectName = basename(projectDir);

			items.push({
				source: "factory",
				timestamp: sessionStart,
				title: `Factory [${projectName}]: ${userMessages[0]}`,
				description: userMessages.length > 1 ? `${userMessages.length} interactions` : undefined,
				metadata: {
					project: projectName,
					sessionFile: basename(filePath),
					messageCount: userMessages.length,
				},
			});
		}
	} catch {
		return [];
	}

	return items;
}

export const factoryReader: SourceReader = {
	name: "factory",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const basePath = expandPath(config.paths.factory);
		const items: WorkItem[] = [];

		try {
			const jsonlFiles = await findJsonlFiles(basePath);

			for (const file of jsonlFiles) {
				const sessionItems = await parseSessionFile(file, dateRange);
				items.push(...sessionItems);
			}
		} catch {
			return [];
		}

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
