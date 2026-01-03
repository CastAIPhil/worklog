import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

export interface CursorWorkspace {
	folderUri?: string;
	workspace?: {
		id: string;
		configPath: string;
	};
	label?: string;
}

export interface CursorAdapter {
	readdir(path: string): Promise<Array<{ name: string; isDirectory: () => boolean }>>;
	fileExists(path: string): Promise<boolean>;
	readFile(path: string): Promise<string>;
	fileStat(path: string): Promise<{ mtime: Date }>;
}

class BunCursorAdapter implements CursorAdapter {
	async readdir(path: string): Promise<Array<{ name: string; isDirectory: () => boolean }>> {
		return readdir(path, { withFileTypes: true });
	}

	async fileExists(path: string): Promise<boolean> {
		return Bun.file(path).exists();
	}

	async readFile(path: string): Promise<string> {
		return Bun.file(path).text();
	}

	async fileStat(path: string): Promise<{ mtime: Date }> {
		const stat = await Bun.file(path).stat();
		return { mtime: new Date(stat.mtime) };
	}
}

/**
 * Parse a file:// URI to a local file path.
 * Handles percent-decoding and Windows drive paths.
 * @param uri - The file URI (e.g., "file:///home/user/code" or "file:///C:/Users/...")
 * @returns The decoded file path, or null if parsing fails
 */
export function parseFileUriToPath(uri: string): string | null {
	if (!uri?.startsWith("file://")) {
		return null;
	}

	try {
		let path = uri.slice(7);
		path = decodeURIComponent(path);

		if (path.match(/^\/[A-Za-z]:\//)) {
			path = path.slice(1);
		}

		return path;
	} catch {
		return null;
	}
}

export async function findWorkspaceFiles(
	dirPath: string,
	adapter: CursorAdapter = new BunCursorAdapter(),
): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await adapter.readdir(dirPath);

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const workspacePath = join(dirPath, entry.name, "workspace.json");
			if (await adapter.fileExists(workspacePath)) {
				results.push(workspacePath);
			}
		}
	} catch {
		return results;
	}

	return results;
}

export function getWorkspaceName(workspace: CursorWorkspace): string {
	if (workspace.label) return workspace.label;

	const folderUri = workspace.folderUri;
	if (folderUri?.startsWith("file://")) {
		const parts = folderUri.split("/").filter(Boolean);
		return parts[parts.length - 1] ?? "Unknown";
	}

	return "Unknown Workspace";
}

export async function parseWorkspaceFile(
	filePath: string,
	dateRange: DateRange,
	adapter: CursorAdapter = new BunCursorAdapter(),
): Promise<WorkItem[]> {
	try {
		if (!(await adapter.fileExists(filePath))) return [];

		const content = await adapter.readFile(filePath);
		const workspace = JSON.parse(content) as CursorWorkspace;

		const workspaceDir = dirname(filePath);
		const stateDbPath = join(workspaceDir, "state.vscdb");

		let lastOpened: Date | null = null;
		try {
			if (await adapter.fileExists(stateDbPath)) {
				const stat = await adapter.fileStat(stateDbPath);
				lastOpened = stat.mtime;
			}
		} catch {}

		if (!lastOpened) {
			const stat = await adapter.fileStat(filePath);
			lastOpened = stat.mtime;
		}

		if (!isWithinRange(lastOpened, dateRange)) return [];

		const workspaceName = getWorkspaceName(workspace);
		const repoPath = workspace.folderUri ? parseFileUriToPath(workspace.folderUri) : null;

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
					repo: repoPath ?? undefined,
				},
			},
		];
	} catch {
		return [];
	}
}

export function createCursorReader(adapter: CursorAdapter = new BunCursorAdapter()): SourceReader {
	return {
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
			const seenCandidates = new Set<string>();
			const seenWorkspaceFiles = new Set<string>();

			for (const candidate of candidates) {
				if (seenCandidates.has(candidate)) continue;
				seenCandidates.add(candidate);

				const files = await findWorkspaceFiles(candidate, adapter);
				for (const file of files) {
					if (seenWorkspaceFiles.has(file)) continue;
					seenWorkspaceFiles.add(file);
					workspaceFiles.push(file);
				}
			}

			const items: WorkItem[] = [];
			for (const file of workspaceFiles) {
				const parsed = await parseWorkspaceFile(file, dateRange, adapter);
				items.push(...parsed);
			}

			return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		},
	};
}

export const cursorReader: SourceReader = createCursorReader();
