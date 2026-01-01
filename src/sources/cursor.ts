import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

interface CursorWorkspace {
	folderUri?: string;
	workspace?: {
		id: string;
		configPath: string;
	};
	label?: string;
}

async function findWorkspaceFiles(dirPath: string): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const workspacePath = join(dirPath, entry.name, "workspace.json");
			if (await Bun.file(workspacePath).exists()) {
				results.push(workspacePath);
			}
		}
	} catch {
		return results;
	}

	return results;
}

function getWorkspaceName(workspace: CursorWorkspace): string {
	if (workspace.label) return workspace.label;

	const folderUri = workspace.folderUri;
	if (folderUri?.startsWith("file://")) {
		const parts = folderUri.split("/").filter(Boolean);
		return parts[parts.length - 1] ?? "Unknown";
	}

	return "Unknown Workspace";
}

async function parseWorkspaceFile(filePath: string, dateRange: DateRange): Promise<WorkItem[]> {
	try {
		const file = Bun.file(filePath);
		if (!(await file.exists())) return [];

		const content = await file.text();
		const workspace = JSON.parse(content) as CursorWorkspace;

		const workspaceDir = filePath.replace("/workspace.json", "");
		const stateDbPath = join(workspaceDir, "state.vscdb");

		let lastOpened: Date | null = null;
		try {
			const stateFile = Bun.file(stateDbPath);
			if (await stateFile.exists()) {
				const stat = await stateFile.stat();
				lastOpened = new Date(stat.mtime);
			}
		} catch {}

		if (!lastOpened) {
			const stat = await file.stat();
			lastOpened = new Date(stat.mtime);
		}

		if (!isWithinRange(lastOpened, dateRange)) return [];

		const workspaceName = getWorkspaceName(workspace);

		return [
			{
				source: "cursor",
				timestamp: lastOpened,
				title: `Cursor: Opened workspace "${workspaceName}"`,
				description: workspace.workspace?.id
					? `Workspace ID: ${workspace.workspace.id}`
					: undefined,
				metadata: {
					workspaceId: workspace.workspace?.id,
					folderUri: workspace.folderUri,
					configPath: workspace.workspace?.configPath,
				},
			},
		];
	} catch {
		return [];
	}
}

export const cursorReader: SourceReader = {
	name: "cursor",
	async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
		const configuredBase = expandPath(config.paths.cursor);

		const candidates = [
			join(configuredBase, "User", "workspaceStorage"),
			join(configuredBase, "workspaceStorage"),
			configuredBase,
			join(homedir(), ".config", "Cursor", "User", "workspaceStorage"),
			join(homedir(), "Library", "Application Support", "Cursor", "User", "workspaceStorage"),
			join(homedir(), "AppData", "Roaming", "Cursor", "User", "workspaceStorage"),
			join(homedir(), ".cursor-server", "data", "User", "workspaceStorage"),
		];

		const workspaceFiles: string[] = [];
		const seen = new Set<string>();

		for (const candidate of candidates) {
			if (seen.has(candidate)) continue;
			seen.add(candidate);

			const files = await findWorkspaceFiles(candidate);
			workspaceFiles.push(...files);
		}

		const items: WorkItem[] = [];
		for (const file of workspaceFiles) {
			const parsed = await parseWorkspaceFile(file, dateRange);
			items.push(...parsed);
		}

		return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	},
};
