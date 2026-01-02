const SUMMARY_HEADING_SCORES: Array<{ score: number; pattern: RegExp }> = [
	{ score: 0, pattern: /^summary$/i },
	{ score: 1, pattern: /^overview$/i },
	{ score: 2, pattern: /^what(\s+has)?\s+changed\??$/i },
	{ score: 3, pattern: /^context$/i },
	{ score: 4, pattern: /^details?$/i },
	{ score: 5, pattern: /^description$/i },
];

function stripHtmlComments(input: string): string {
	return input.replace(/<!--([\s\S]*?)-->/g, "");
}

function stripFencedCodeBlocks(input: string): string {
	const lines = input.split("\n");
	const out: string[] = [];
	let inFence = false;

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith("```")) {
			inFence = !inFence;
			continue;
		}
		if (!inFence) {
			out.push(line);
		}
	}

	return out.join("\n");
}

function normalizeHeadingText(raw: string): string {
	return raw
		.trim()
		.replace(/\s+#+\s*$/, "")
		.replace(/\s+/g, " ");
}

function getHeadingScore(title: string): number | null {
	const normalized = normalizeHeadingText(title).toLowerCase();

	let best: number | null = null;
	for (const { score, pattern } of SUMMARY_HEADING_SCORES) {
		if (pattern.test(normalized)) {
			best = best === null ? score : Math.min(best, score);
		}
	}

	return best;
}

function isHorizontalRule(line: string): boolean {
	return /^\s*([-*_])\1\1+\s*$/.test(line);
}

function isAtxHeadingLine(line: string): boolean {
	return /^\s*#{1,6}\s+\S/.test(line);
}

function isChecklistItemLine(line: string): boolean {
	return /^\s*[-*+]\s+\[[ xX]\]\s*/.test(line);
}

function isPlaceholderText(text: string): boolean {
	const normalized = text
		.trim()
		.toLowerCase()
		.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
		.replace(/\s+/g, " ");

	if (!normalized) return true;

	const compact = normalized.replace(/[^a-z0-9]/g, "");
	return ["na", "tbd", "todo", "none", "nil"].includes(compact);
}

function looksLikeTemplateBoilerplate(text: string): boolean {
	const normalized = text.toLowerCase();
	return (
		normalized.includes("describe") && (normalized.includes("here") || normalized.includes("below"))
	);
}

function stripInlineMarkdown(text: string): string {
	let out = text;

	out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
	out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
	out = out.replace(/`([^`]+)`/g, "$1");
	out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
	out = out.replace(/__([^_]+)__/g, "$1");
	out = out.replace(/\*([^*]+)\*/g, "$1");
	out = out.replace(/_([^_]+)_/g, "$1");

	return out;
}

function stripBlockPrefixes(line: string): string {
	let out = line.trim();
	out = out.replace(/^>+\s*/, "");

	out = out.replace(/^\s*[-*+]\s+/, "");
	out = out.replace(/^\s*\d+\.\s+/, "");
	return out.trim();
}

function isLabelHeadingLine(line: string): { title: string; inline: string } | null {
	const trimmed = line.trim();
	const match = trimmed.match(
		/^(\*\*|__)?\s*(summary|overview|what\s+(?:has\s+)?changed|context|details?|description)\s*(\*\*|__)?\s*:\s*(.*)$/i,
	);
	if (!match) return null;

	const title = normalizeHeadingText(match[2] ?? "");
	const inline = (match[4] ?? "").trim();
	return { title, inline };
}

function splitParagraphBlocks(lines: string[]): string[] {
	const blocks: string[] = [];
	let current: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const trimmed = line.trim();

		if (!trimmed) {
			if (current.length > 0) {
				blocks.push(current.join("\n"));
				current = [];
			}
			continue;
		}

		const next = lines[i + 1];
		const nextTrimmed = next?.trim();
		const isSetextHeading =
			!!nextTrimmed && trimmed.length > 0 && (/^=+$/.test(nextTrimmed) || /^-+$/.test(nextTrimmed));

		if (
			isHorizontalRule(trimmed) ||
			isChecklistItemLine(trimmed) ||
			isAtxHeadingLine(trimmed) ||
			isSetextHeading ||
			isLabelHeadingLine(trimmed)
		) {
			if (current.length > 0) {
				blocks.push(current.join("\n"));
				current = [];
			}

			if (isSetextHeading) {
				i++;
			}
			continue;
		}

		current.push(line);
	}

	if (current.length > 0) {
		blocks.push(current.join("\n"));
	}

	return blocks;
}

function blockToCandidate(block: string): string | null {
	const rawLines = block
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);

	if (rawLines.length === 0) return null;

	const listLikeLines = rawLines.filter((l) => /^([-*+]\s+|\d+\.\s+)/.test(l));
	const isPureList = listLikeLines.length === rawLines.length;

	let joined: string;
	if (isPureList) {
		const items = rawLines
			.map((l) => stripInlineMarkdown(stripBlockPrefixes(l)))
			.map((l) => l.trim())
			.filter(Boolean);
		joined = items.join(". ");
	} else {
		joined = rawLines.map((l) => stripInlineMarkdown(stripBlockPrefixes(l))).join(" ");
	}

	const cleaned = joined.replace(/\s+/g, " ").trim();
	if (!cleaned) return null;
	if (isPlaceholderText(cleaned)) return null;
	if (looksLikeTemplateBoilerplate(cleaned)) return null;

	const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
	if (wordCount < 2 && cleaned.length < 12) return null;

	return cleaned;
}

function limitToTwoSentences(text: string): string {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) return normalized;

	const sentences: string[] = [];
	const punctuated = normalized.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [];

	let consumed = 0;
	for (const part of punctuated) {
		const trimmed = part.trim();
		if (trimmed) sentences.push(trimmed);
		consumed += part.length;
		if (sentences.length >= 2) {
			return sentences.slice(0, 2).join(" ");
		}
	}

	const rest = normalized.slice(consumed).trim();
	if (rest) sentences.push(rest);

	return sentences.slice(0, 2).join(" ");
}

type HeadingSpan = {
	score: number;
	contentStart: number;
	headingLine: number;
};

function parseHeadings(lines: string[]): HeadingSpan[] {
	const headings: HeadingSpan[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const trimmed = line.trim();

		const label = isLabelHeadingLine(trimmed);
		if (label) {
			const score = getHeadingScore(label.title);
			if (score !== null) {
				headings.push({ score, contentStart: i + 1, headingLine: i });
			}
			continue;
		}

		const atxMatch = trimmed.match(/^#{1,6}\s+(.+)$/);
		if (atxMatch) {
			const title = normalizeHeadingText(atxMatch[1] ?? "");
			const score = getHeadingScore(title);
			if (score !== null) {
				headings.push({ score, contentStart: i + 1, headingLine: i });
			}
			continue;
		}

		const next = lines[i + 1];
		if (next) {
			const underline = next.trim();
			const isSetext = trimmed.length > 0 && (/^=+$/.test(underline) || /^-+$/.test(underline));
			if (isSetext) {
				const title = normalizeHeadingText(trimmed);
				const score = getHeadingScore(title);
				if (score !== null) {
					headings.push({ score, contentStart: i + 2, headingLine: i });
				}
				i++;
			}
		}
	}

	return headings;
}

function isAnyHeadingStart(line: string, nextLine: string | undefined): boolean {
	if (isAtxHeadingLine(line)) return true;
	if (isLabelHeadingLine(line)) return true;

	const trimmed = line.trim();
	const underline = nextLine?.trim();
	if (!trimmed || !underline) return false;
	return /^=+$/.test(underline) || /^-+$/.test(underline);
}

function extractFromLines(lines: string[]): string | null {
	const blocks = splitParagraphBlocks(lines);
	for (const block of blocks) {
		const candidate = blockToCandidate(block);
		if (candidate) return candidate;
	}
	return null;
}

export function extractPrSummary(body: string): string | null {
	const trimmed = body.trim();
	if (!trimmed) return null;

	let text = trimmed.replace(/\r\n?/g, "\n");
	text = stripHtmlComments(text);
	text = stripFencedCodeBlocks(text);

	const lines = text.split("\n");

	for (let i = 0; i < lines.length; i++) {
		const label = isLabelHeadingLine(lines[i] ?? "");
		if (!label || !label.inline) continue;

		const score = getHeadingScore(label.title);
		if (score === null) continue;

		const inlineCandidate = blockToCandidate(label.inline);
		if (inlineCandidate) {
			const limited = limitToTwoSentences(inlineCandidate);
			return limited && !isPlaceholderText(limited) ? limited : null;
		}
	}

	const headings = parseHeadings(lines);
	const orderedHeadings = headings
		.slice()
		.sort((a, b) => (a.score !== b.score ? a.score - b.score : a.headingLine - b.headingLine));

	for (const heading of orderedHeadings) {
		let end = lines.length;
		for (let i = heading.contentStart; i < lines.length; i++) {
			if (isAnyHeadingStart(lines[i] ?? "", lines[i + 1])) {
				end = i;
				break;
			}
		}

		const candidate = extractFromLines(lines.slice(heading.contentStart, end));
		if (candidate) {
			const limited = limitToTwoSentences(candidate);
			return limited && !isPlaceholderText(limited) ? limited : null;
		}
	}

	const fallback = extractFromLines(lines.slice(0, 80));
	if (!fallback) return null;

	const limited = limitToTwoSentences(fallback);
	return limited && !isPlaceholderText(limited) ? limited : null;
}
