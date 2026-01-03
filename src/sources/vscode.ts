import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";
import { expandPath } from "../utils/config.ts";
import { isWithinRange } from "../utils/dates.ts";

export interface VSCodeWorkspace {
	folderUri?: string;
	workspace?: {
		id: string;
		configPath: string;
	};
	label?: string;
}

export interface VSCodeAdapter {
	readdir(path: string): Promise<Array<{ name: string; isDirectory: () => boolean }>>;
	fileExists(path: string): Promise<boolean>;
	readFile(path: string): Promise<string>;
	fileStat(path: string): Promise<{ mtime: Date }>;
}

class BunVSCodeAdapter implements VSCodeAdapter {
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
	workspaceStoragePath: string,
	adapter: VSCodeAdapter = new BunVSCodeAdapter(),
): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await adapter.readdir(workspaceStoragePath);

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const workspacePath = join(workspaceStoragePath, entry.name, "workspace.json");
			if (await adapter.fileExists(workspacePath)) {
				results.push(workspacePath);
			}
		}
	} catch {
		return results;
	}

	return results;
}

export function getWorkspaceName(workspace: VSCodeWorkspace): string {
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
	adapter: VSCodeAdapter = new BunVSCodeAdapter(),
): Promise<WorkItem[]> {
	try {
		if (!(await adapter.fileExists(filePath))) return [];

		const content = await adapter.readFile(filePath);
		const workspace = JSON.parse(content) as VSCodeWorkspace;

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
				source: "vscode",
				timestamp: lastOpened,
				title: `VS Code: Opened workspace "${workspaceName}"`,
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

export async function findRecentExtensions(
	extensionsPath: string,
	dateRange: DateRange,
	adapter: VSCodeAdapter = new BunVSCodeAdapter(),
): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await adapter.readdir(extensionsPath);
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const extPath = join(extensionsPath, entry.name);
			const stat = await adapter.fileStat(extPath);
			const modified = stat.mtime;
			if (!isWithinRange(modified, dateRange)) continue;
			const extName = entry.name.split("-")[0] || entry.name;
			results.push(extName);
		}
	} catch {
		return results;
	}

	return results;
}

export function createVSCodeReader(adapter: VSCodeAdapter = new BunVSCodeAdapter()): SourceReader {
	return {
		name: "vscode",
		async read(dateRange: DateRange, config: Config): Promise<WorkItem[]> {
			const configuredBase = expandPath(config.paths.vscode);

			const workspaceStorageCandidates = [
				join(configuredBase, "User", "workspaceStorage"),
				join(configuredBase, "workspaceStorage"),
				configuredBase,
				join(homedir(), ".config", "Code", "User", "workspaceStorage"),
				join(homedir(), ".config", "Code - Insiders", "User", "workspaceStorage"),
				join(homedir(), "Library", "Application Support", "Code", "User", "workspaceStorage"),
				join(
					homedir(),
					"Library",
					"Application Support",
					"Code - Insiders",
					"User",
					"workspaceStorage",
				),
				join(homedir(), "AppData", "Roaming", "Code", "User", "workspaceStorage"),
				join(homedir(), "AppData", "Roaming", "Code - Insiders", "User", "workspaceStorage"),
				join(homedir(), ".vscode-server", "data", "User", "workspaceStorage"),
				join(homedir(), ".vscode-server-insiders", "data", "User", "workspaceStorage"),
			];

			const workspaceFiles: string[] = [];
			const seenWorkspaceFiles = new Set<string>();

			for (const candidate of workspaceStorageCandidates) {
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

			const extensionCandidates = [
				join(configuredBase, "extensions"),
				join(homedir(), ".vscode", "extensions"),
				join(homedir(), ".vscode-insiders", "extensions"),
				join(homedir(), ".vscode-server", "extensions"),
				join(homedir(), ".vscode-server-insiders", "extensions"),
			];

			const recentExtensions: string[] = [];
			const seenExtensions = new Set<string>();

			for (const candidate of extensionCandidates) {
				const found = await findRecentExtensions(candidate, dateRange, adapter);
				for (const name of found) {
					if (seenExtensions.has(name)) continue;
					seenExtensions.add(name);
					recentExtensions.push(name);
				}
			}

			if (recentExtensions.length > 0) {
				items.push({
					source: "vscode",
					timestamp: new Date(),
					title: `VS Code: Installed/updated ${recentExtensions.length} extension${recentExtensions.length > 1 ? "s" : ""}`,
					description:
						recentExtensions.slice(0, 3).join(", ") + (recentExtensions.length > 3 ? "..." : ""),
					metadata: {
						extensions: recentExtensions,
					},
				});
			}

			return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		},
	};
}

export const vscodeReader: SourceReader = createVSCodeReader();
