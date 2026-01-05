import { type HistoryEntry, type HistoryWorkItem, loadHistory } from "../storage/history.ts";
import { isNoiseWorkItem } from "../utils/noise.ts";

export interface SearchOptions {
	query: string;
	regex?: boolean;
	fuzzy?: boolean;
	sources?: string[];
	projects?: string[];
	startDate?: Date;
	endDate?: Date;
	limit?: number;
}

export interface SearchResult {
	item: HistoryWorkItem;
	entry: HistoryEntry;
	score: number;
	matchType: "exact" | "fuzzy" | "regex";
}

function levenshteinDistance(a: string, b: string): number {
	const matrix: number[][] = Array.from({ length: b.length + 1 }, () =>
		Array.from({ length: a.length + 1 }, () => 0),
	);

	for (let i = 0; i <= b.length; i++) {
		const row = matrix[i];
		if (row) row[0] = i;
	}

	const firstRow = matrix[0];
	if (firstRow) {
		for (let j = 0; j <= a.length; j++) {
			firstRow[j] = j;
		}
	}

	for (let i = 1; i <= b.length; i++) {
		const row = matrix[i];
		if (!row) continue;
		for (let j = 1; j <= a.length; j++) {
			if (b.charAt(i - 1) === a.charAt(j - 1)) {
				row[j] = matrix[i - 1]?.[j - 1] ?? 0;
			} else {
				row[j] = Math.min(
					(matrix[i - 1]?.[j - 1] ?? 0) + 1,
					(row[j - 1] ?? 0) + 1,
					(matrix[i - 1]?.[j] ?? 0) + 1,
				);
			}
		}
	}

	return matrix[b.length]?.[a.length] ?? 0;
}

function fuzzyMatch(
	text: string,
	query: string,
	threshold = 0.6,
): { match: boolean; score: number } {
	const normalizedText = text.toLowerCase();
	const normalizedQuery = query.toLowerCase();

	if (normalizedText.includes(normalizedQuery)) {
		return { match: true, score: 1 };
	}

	const words = normalizedText.split(/\s+/);
	let bestScore = 0;

	for (const word of words) {
		const distance = levenshteinDistance(word, normalizedQuery);
		const maxLen = Math.max(word.length, normalizedQuery.length);
		const similarity = 1 - distance / maxLen;

		if (similarity > bestScore) {
			bestScore = similarity;
		}
	}

	return {
		match: bestScore >= threshold,
		score: bestScore,
	};
}

function matchesText(
	text: string,
	query: string,
	options: SearchOptions,
): { match: boolean; score: number; matchType: "exact" | "fuzzy" | "regex" } {
	const normalizedText = text.toLowerCase();
	const normalizedQuery = query.toLowerCase();

	if (options.regex) {
		try {
			const regex = new RegExp(query, "i");
			if (regex.test(text)) {
				return { match: true, score: 0.9, matchType: "regex" };
			}
		} catch {
			// Invalid regex, fall through to exact match
		}
	}

	if (normalizedText.includes(normalizedQuery)) {
		const lengthRatio = normalizedQuery.length / normalizedText.length;
		return { match: true, score: 0.5 + lengthRatio * 0.5, matchType: "exact" };
	}

	if (options.fuzzy) {
		const fuzzyResult = fuzzyMatch(text, query);
		if (fuzzyResult.match) {
			return { match: true, score: fuzzyResult.score * 0.8, matchType: "fuzzy" };
		}
	}

	return { match: false, score: 0, matchType: "exact" };
}

function matchesFilters(
	item: HistoryWorkItem,
	_entry: HistoryEntry,
	options: SearchOptions,
): boolean {
	if (options.sources && options.sources.length > 0) {
		if (!options.sources.includes(item.source)) {
			return false;
		}
	}

	if (options.projects && options.projects.length > 0) {
		if (
			!item.project ||
			!options.projects.some((p) => item.project?.toLowerCase().includes(p.toLowerCase()))
		) {
			return false;
		}
	}

	if (options.startDate) {
		if (item.timestamp < options.startDate) {
			return false;
		}
	}

	if (options.endDate) {
		if (item.timestamp > options.endDate) {
			return false;
		}
	}

	return true;
}

export async function search(options: SearchOptions): Promise<SearchResult[]> {
	const entries = await loadHistory();
	const results: SearchResult[] = [];

	for (const entry of entries) {
		for (const project of entry.projects) {
			for (const item of project.items) {
				if (isNoiseWorkItem(item)) {
					continue;
				}

				if (!matchesFilters(item, entry, options)) {
					continue;
				}

				const titleMatch = matchesText(item.title, options.query, options);
				const descMatch = item.description
					? matchesText(item.description, options.query, options)
					: { match: false, score: 0, matchType: "exact" as const };

				if (titleMatch.match || descMatch.match) {
					const score = Math.max(titleMatch.score, descMatch.score * 0.8);
					const matchType =
						titleMatch.score >= descMatch.score ? titleMatch.matchType : descMatch.matchType;

					results.push({
						item,
						entry,
						score,
						matchType,
					});
				}
			}
		}
	}

	results.sort((a, b) => {
		if (b.score !== a.score) {
			return b.score - a.score;
		}
		return b.item.timestamp.getTime() - a.item.timestamp.getTime();
	});

	if (options.limit && options.limit > 0) {
		return results.slice(0, options.limit);
	}

	return results;
}

export function formatSearchResults(
	results: SearchResult[],
	format: "timeline" | "grouped" | "json",
	options: { timeZone?: string } = {},
): string {
	const { timeZone } = options;

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		...(timeZone ? { timeZone } : {}),
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});

	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		...(timeZone ? { timeZone } : {}),
		hour: "2-digit",
		minute: "2-digit",
	});

	if (results.length === 0) {
		return "No results found.";
	}

	if (format === "json") {
		return JSON.stringify(
			results.map((r) => ({
				title: r.item.title,
				description: r.item.description,
				source: r.item.source,
				project: r.item.project,
				timestamp: r.item.timestamp.toISOString(),
				score: r.score,
				matchType: r.matchType,
			})),
			null,
			2,
		);
	}

	if (format === "grouped") {
		const byProject = new Map<string, SearchResult[]>();

		for (const result of results) {
			const project = result.item.project ?? "Unknown";
			if (!byProject.has(project)) {
				byProject.set(project, []);
			}
			byProject.get(project)?.push(result);
		}

		const lines: string[] = [];

		for (const [project, projectResults] of byProject) {
			lines.push(`\n## ${project}`);

			for (const result of projectResults) {
				const date = dateFormatter.format(result.item.timestamp);
				const source = result.item.source;
				lines.push(`  [${date}] (${source}) ${result.item.title}`);
			}
		}

		return lines.join("\n");
	}

	const lines: string[] = [];
	lines.push(`Found ${results.length} result${results.length === 1 ? "" : "s"}:\n`);

	for (const result of results) {
		const date = result.item.timestamp.toLocaleDateString();
		const time = timeFormatter.format(result.item.timestamp);
		const project = result.item.project ? `[${result.item.project}]` : "";
		const source = `(${result.item.source})`;

		lines.push(`${date} ${time} ${project} ${source}`);
		lines.push(`  ${result.item.title}`);

		if (result.item.description) {
			const desc =
				result.item.description.length > 100
					? `${result.item.description.slice(0, 100)}...`
					: result.item.description;
			lines.push(`  ${desc}`);
		}

		lines.push("");
	}

	return lines.join("\n");
}
