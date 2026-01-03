import type { WorkItem } from "../types.ts";

export interface ContextCluster {
	id: string;
	theme: string;
	items: WorkItem[];
	keywords: string[];
	coherenceScore: number;
}

export interface SmartSummary {
	clusters: ContextCluster[];
	narrative: string;
	crossClusterConnections: Array<{
		from: string;
		to: string;
		relationship: string;
	}>;
}

interface TermFrequency {
	[term: string]: number;
}

interface DocumentVector {
	terms: TermFrequency;
	magnitude: number;
}

const STOP_WORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"by",
	"for",
	"from",
	"has",
	"he",
	"in",
	"is",
	"it",
	"its",
	"of",
	"on",
	"that",
	"the",
	"to",
	"was",
	"were",
	"will",
	"with",
	"this",
	"but",
	"they",
	"have",
	"had",
	"what",
	"when",
	"where",
	"who",
	"which",
	"why",
	"how",
	"all",
	"each",
	"every",
	"both",
	"few",
	"more",
	"most",
	"other",
	"some",
	"such",
	"no",
	"nor",
	"not",
	"only",
	"own",
	"same",
	"so",
	"than",
	"too",
	"very",
	"just",
	"can",
	"should",
	"now",
	"into",
	"also",
	"been",
	"being",
	"do",
	"does",
	"did",
	"doing",
	"would",
	"could",
	"might",
	"must",
	"shall",
	"may",
	"add",
	"added",
	"adding",
	"fix",
	"fixed",
	"fixing",
	"update",
	"updated",
	"updating",
	"implement",
	"implemented",
	"implementing",
	"create",
	"created",
	"creating",
	"remove",
	"removed",
	"removing",
	"change",
	"changed",
	"changing",
]);

function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, " ")
		.split(/\s+/)
		.filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function computeTermFrequency(tokens: string[]): TermFrequency {
	const tf: TermFrequency = {};
	for (const token of tokens) {
		tf[token] = (tf[token] ?? 0) + 1;
	}
	const maxFreq = Math.max(...Object.values(tf), 1);
	for (const term in tf) {
		tf[term] = tf[term]! / maxFreq;
	}
	return tf;
}

function computeIDF(documents: string[][]): Map<string, number> {
	const docCount = documents.length;
	const termDocCount = new Map<string, number>();

	for (const doc of documents) {
		const uniqueTerms = new Set(doc);
		for (const term of uniqueTerms) {
			termDocCount.set(term, (termDocCount.get(term) ?? 0) + 1);
		}
	}

	const idf = new Map<string, number>();
	for (const [term, count] of termDocCount) {
		idf.set(term, Math.log(docCount / count) + 1);
	}

	return idf;
}

function computeTFIDF(tf: TermFrequency, idf: Map<string, number>): DocumentVector {
	const terms: TermFrequency = {};
	let sumSquares = 0;

	for (const [term, freq] of Object.entries(tf)) {
		const tfidf = freq * (idf.get(term) ?? 1);
		terms[term] = tfidf;
		sumSquares += tfidf * tfidf;
	}

	return {
		terms,
		magnitude: Math.sqrt(sumSquares),
	};
}

function cosineSimilarity(a: DocumentVector, b: DocumentVector): number {
	if (a.magnitude === 0 || b.magnitude === 0) return 0;

	let dotProduct = 0;
	for (const [term, weight] of Object.entries(a.terms)) {
		if (term in b.terms) {
			dotProduct += weight * b.terms[term]!;
		}
	}

	return dotProduct / (a.magnitude * b.magnitude);
}

export function computeSimilarityMatrix(items: WorkItem[]): number[][] {
	const documents = items.map((item) => {
		const text = `${item.title} ${item.description ?? ""}`;
		return tokenize(text);
	});

	const idf = computeIDF(documents);

	const vectors = documents.map((doc) => {
		const tf = computeTermFrequency(doc);
		return computeTFIDF(tf, idf);
	});

	const matrix: number[][] = Array.from({ length: items.length }, () =>
		Array.from({ length: items.length }, () => 0),
	);

	for (let i = 0; i < items.length; i++) {
		for (let j = 0; j < items.length; j++) {
			if (i === j) {
				matrix[i]![j] = 1;
			} else if (j < i) {
				matrix[i]![j] = matrix[j]?.[i] ?? 0;
			} else {
				matrix[i]![j] = cosineSimilarity(vectors[i]!, vectors[j]!);
			}
		}
	}

	return matrix;
}

export function clusterItems(items: WorkItem[], threshold = 0.3): ContextCluster[] {
	if (items.length === 0) return [];
	if (items.length === 1) {
		return [createCluster([items[0]!], 0)];
	}

	const matrix = computeSimilarityMatrix(items);
	const assigned = new Set<number>();
	const clusters: ContextCluster[] = [];

	for (let i = 0; i < items.length; i++) {
		if (assigned.has(i)) continue;

		const clusterIndices = [i];
		assigned.add(i);

		for (let j = i + 1; j < items.length; j++) {
			if (assigned.has(j)) continue;

			const avgSimilarity =
				clusterIndices.reduce((sum, idx) => sum + (matrix[idx]?.[j] ?? 0), 0) /
				clusterIndices.length;

			if (avgSimilarity >= threshold) {
				clusterIndices.push(j);
				assigned.add(j);
			}
		}

		const clusterItems = clusterIndices.map((idx) => items[idx]!);
		clusters.push(createCluster(clusterItems, clusters.length));
	}

	return clusters;
}

function createCluster(items: WorkItem[], index: number): ContextCluster {
	const allText = items.map((i) => `${i.title} ${i.description ?? ""}`).join(" ");
	const tokens = tokenize(allText);

	const termCounts = new Map<string, number>();
	for (const token of tokens) {
		termCounts.set(token, (termCounts.get(token) ?? 0) + 1);
	}

	const sortedTerms = [...termCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

	const keywords = sortedTerms.map(([term]) => term);

	const coherenceScore = items.length > 1 ? computeClusterCoherence(items) : 1;

	return {
		id: `cluster-${index}`,
		theme: generateThemeLabel(keywords, items),
		items,
		keywords,
		coherenceScore,
	};
}

function computeClusterCoherence(items: WorkItem[]): number {
	if (items.length < 2) return 1;

	const matrix = computeSimilarityMatrix(items);
	let totalSimilarity = 0;
	let pairCount = 0;

	for (let i = 0; i < items.length; i++) {
		for (let j = i + 1; j < items.length; j++) {
			totalSimilarity += matrix[i]?.[j] ?? 0;
			pairCount++;
		}
	}

	return pairCount > 0 ? totalSimilarity / pairCount : 0;
}

function generateThemeLabel(keywords: string[], items: WorkItem[]): string {
	if (keywords.length === 0) {
		const sources = [...new Set(items.map((i) => i.source))];
		return sources.length === 1 ? `${sources[0]} activity` : "Mixed activity";
	}

	const primary = keywords[0]!;
	const secondary = keywords[1];

	if (secondary) {
		return `${capitalize(primary)} & ${capitalize(secondary)}`;
	}

	return capitalize(primary);
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function findCrossClusterConnections(
	clusters: ContextCluster[],
): Array<{ from: string; to: string; relationship: string }> {
	const connections: Array<{ from: string; to: string; relationship: string }> = [];

	for (let i = 0; i < clusters.length; i++) {
		for (let j = i + 1; j < clusters.length; j++) {
			const a = clusters[i]!;
			const b = clusters[j]!;

			const sharedKeywords = a.keywords.filter((k) => b.keywords.includes(k));

			if (sharedKeywords.length > 0) {
				connections.push({
					from: a.id,
					to: b.id,
					relationship: `Shared focus: ${sharedKeywords.join(", ")}`,
				});
			}
		}
	}

	return connections;
}

export function buildSmartSummary(items: WorkItem[], threshold = 0.3): SmartSummary {
	const clusters = clusterItems(items, threshold);
	const connections = findCrossClusterConnections(clusters);

	const narrativeParts: string[] = [];

	for (const cluster of clusters) {
		const itemCount = cluster.items.length;
		const itemWord = itemCount === 1 ? "item" : "items";
		narrativeParts.push(`${cluster.theme} (${itemCount} ${itemWord})`);
	}

	const narrative =
		clusters.length === 0
			? "No work items to summarize."
			: clusters.length === 1
				? `Work focused on: ${narrativeParts[0]}`
				: `Work spanned ${clusters.length} areas: ${narrativeParts.join(", ")}`;

	return {
		clusters,
		narrative,
		crossClusterConnections: connections,
	};
}

export function extractKeyTerms(items: WorkItem[], topN = 10): string[] {
	const documents = items.map((item) => {
		const text = `${item.title} ${item.description ?? ""}`;
		return tokenize(text);
	});

	const idf = computeIDF(documents);

	const globalTermScores = new Map<string, number>();

	for (const doc of documents) {
		const tf = computeTermFrequency(doc);
		for (const [term, freq] of Object.entries(tf)) {
			const tfidf = freq * (idf.get(term) ?? 1);
			globalTermScores.set(term, (globalTermScores.get(term) ?? 0) + tfidf);
		}
	}

	return [...globalTermScores.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, topN)
		.map(([term]) => term);
}
