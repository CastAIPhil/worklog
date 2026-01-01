import type { SourceReader, SourceType } from "../types.ts";
import { claudeReader } from "./claude.ts";
import { codexReader } from "./codex.ts";
import { factoryReader } from "./factory.ts";
import { gitReader } from "./git.ts";
import { githubReader } from "./github.ts";
import { opencodeReader } from "./opencode.ts";

const readers: Record<SourceType, SourceReader> = {
	opencode: opencodeReader,
	claude: claudeReader,
	codex: codexReader,
	factory: factoryReader,
	git: gitReader,
	github: githubReader,
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

export const allSourceTypes: SourceType[] = [
	"opencode",
	"claude",
	"codex",
	"factory",
	"git",
	"github",
];
