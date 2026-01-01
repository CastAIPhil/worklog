import type { SourceReader, SourceType } from "../types.ts";
import { claudeReader } from "./claude.ts";
import { codexReader } from "./codex.ts";
import { cursorReader } from "./cursor.ts";
import { factoryReader } from "./factory.ts";
import { filesystemReader } from "./filesystem.ts";
import { gitReader } from "./git.ts";
import { githubReader } from "./github.ts";
import { opencodeReader } from "./opencode.ts";
import { terminalReader } from "./terminal.ts";
import { vscodeReader } from "./vscode.ts";

const readers: Record<SourceType, SourceReader> = {
	opencode: opencodeReader,
	claude: claudeReader,
	codex: codexReader,
	factory: factoryReader,
	git: gitReader,
	github: githubReader,
	vscode: vscodeReader,
	cursor: cursorReader,
	terminal: terminalReader,
	filesystem: filesystemReader,
};

export function getReader(source: SourceType): SourceReader | undefined {
	return readers[source];
}

export function getAllReaders(): SourceReader[] {
	return Object.values(readers);
}

export function getReadersByNames(names: string[]): SourceReader[] {
	return names.filter((name): name is SourceType => name in readers).map((name) => readers[name]);
}

export const allSourceTypes: readonly SourceType[] = [
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
