import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

interface OpenCodeMessage {
	role: string;
	content?: string;
	timestamp?: string;
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
				}
			} catch {}
		}

		if (sessionStart && isWithinRange(sessionStart, dateRange) && userMessages.length > 0) {
			items.push({
				source: "opencode",
				timestamp: sessionStart,
				title: `OpenCode session: ${userMessages[0]}`,
				description: userMessages.length > 1 ? `${userMessages.length} interactions` : undefined,
				metadata: { sessionFile: basename(filePath), messageCount: userMessages.length },
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
				const sessionItems = await parseSessionFile(join(basePath, file), dateRange);
				items.push(...sessionItems);
			}
		} catch {
			return [];
		}

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
