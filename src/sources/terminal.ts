import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

interface CommandPattern {
	command: string;
	count: number;
	lastUsed: Date;
}

function normalizeBaseCommand(commandLine: string): string {
	const tokens = commandLine.trim().split(/\s+/).filter(Boolean);
	let index = 0;

	while (index < tokens.length) {
		const token = tokens[index];
		if (!token) break;
		if (!token.includes("=") || token.startsWith("-")) break;
		index++;
	}

	let base = tokens[index] ?? "";
	if ((base === "sudo" || base === "env") && tokens.length > index + 1) {
		base = tokens[index + 1] ?? base;
	}

	return base;
}

function recordCommand(
	patterns: Map<string, CommandPattern>,
	commandLine: string,
	timestamp: Date,
	dateRange: DateRange,
) {
	if (!isWithinRange(timestamp, dateRange)) return;

	const baseCommand = normalizeBaseCommand(commandLine);
	if (!baseCommand) return;

	const ignore = new Set(["cd", "ls", "pwd", "clear", "history", "exit"]);
	if (ignore.has(baseCommand)) return;

	const existing = patterns.get(baseCommand);
	if (existing) {
		existing.count++;
		if (timestamp > existing.lastUsed) {
			existing.lastUsed = timestamp;
		}
		return;
	}

	patterns.set(baseCommand, {
		command: baseCommand,
		count: 1,
		lastUsed: timestamp,
	});
}

async function parseHistoryFile(filePath: string, dateRange: DateRange): Promise<CommandPattern[]> {
	const patterns = new Map<string, CommandPattern>();

	try {
		const content = await readFile(filePath, "utf-8");
		const lines = content.split("\n");

		let pendingBashTimestamp: Date | null = null;
		let pendingFishCmd: string | null = null;

		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (!line) continue;

			const bashTimestampMatch = /^#\s*(\d{9,})$/.exec(line);
			if (bashTimestampMatch) {
				const epoch = Number(bashTimestampMatch[1]);
				if (!Number.isNaN(epoch)) {
					pendingBashTimestamp = new Date(epoch * 1000);
				}
				continue;
			}

			if (pendingBashTimestamp) {
				recordCommand(patterns, line, pendingBashTimestamp, dateRange);
				pendingBashTimestamp = null;
				continue;
			}

			const zshMatch = /^: (\d+):\d+;(.*)$/.exec(line);
			if (zshMatch) {
				const epoch = Number(zshMatch[1]);
				const cmd = (zshMatch[2] ?? "").trim();
				if (!Number.isNaN(epoch) && cmd) {
					recordCommand(patterns, cmd, new Date(epoch * 1000), dateRange);
				}
				continue;
			}

			if (line.startsWith("- cmd:")) {
				pendingFishCmd = line.slice(6).trim();
				continue;
			}

			if (pendingFishCmd && line.startsWith("when:")) {
				const epoch = Number(line.slice(5).trim());
				if (!Number.isNaN(epoch)) {
					recordCommand(patterns, pendingFishCmd, new Date(epoch * 1000), dateRange);
				}
				pendingFishCmd = null;
			}
		}
	} catch {
		return [];
	}

	return Array.from(patterns.values()).sort((a, b) => b.count - a.count);
}

export const terminalReader: SourceReader = {
	name: "terminal",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const configured = expandPath(config.paths.terminal);

		const candidates = [
			configured,
			join(homedir(), ".bash_history"),
			join(homedir(), ".zsh_history"),
			join(homedir(), ".local", "share", "fish", "fish_history"),
		];

		const aggregated = new Map<string, CommandPattern>();
		const seenFiles = new Set<string>();

		for (const filePath of candidates) {
			if (seenFiles.has(filePath)) continue;
			seenFiles.add(filePath);

			const patterns = await parseHistoryFile(filePath, dateRange);
			for (const pattern of patterns) {
				const existing = aggregated.get(pattern.command);
				if (existing) {
					existing.count += pattern.count;
					if (pattern.lastUsed > existing.lastUsed) {
						existing.lastUsed = pattern.lastUsed;
					}
				} else {
					aggregated.set(pattern.command, { ...pattern });
				}
			}
		}

		if (aggregated.size === 0) return [];

		const allPatterns = Array.from(aggregated.values()).sort((a, b) => b.count - a.count);
		const totalCommands = allPatterns.reduce((sum, p) => sum + p.count, 0);
		const topPatterns = allPatterns.slice(0, 10);

		const description = topPatterns
			.slice(0, 3)
			.map((p) => `${p.command}(${p.count})`)
			.join(", ");

		return [
			{
				source: "terminal",
				timestamp: new Date(),
				title: `Terminal: ${totalCommands} commands across ${aggregated.size} tools`,
				description: description ? `Top: ${description}` : undefined,
				metadata: {
					totalCommands,
					uniqueCommands: aggregated.size,
					topCommands: topPatterns,
				},
			},
		];
	},
};
