import { format } from "date-fns";
import { getCommitSubjects, getGitHubDescriptions, getSessionDescriptions } from "./aggregator.ts";
import {
	buildSmartSummary,
	type ContextCluster,
	extractKeyTerms,
	type SmartSummary,
} from "./context/analyzer.ts";
import type {
	Config,
	DailyProjectActivity,
	ProjectActivity,
	ProjectWorkSummary,
	WorkItem,
} from "./types.ts";
import { cleanSubject } from "./utils/commits.ts";

interface OpenAIMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

interface OpenAIResponse {
	choices: Array<{
		message: {
			content: string;
		};
	}>;
}

interface AnthropicResponse {
	content: Array<{
		type: string;
		text: string;
	}>;
}

function buildPrompt(project: string, date: Date, activity: DailyProjectActivity): string {
	const parts: string[] = [];

	parts.push(
		`Summarize what was accomplished on "${project}" on ${format(date, "MMMM d, yyyy")} in a single sentence.`,
	);
	parts.push("");

	if (activity.commits.length > 0) {
		parts.push("Git commits:");
		for (const subject of getCommitSubjects(activity.commits).slice(0, 10)) {
			parts.push(`- ${subject}`);
		}
		parts.push("");
	}

	if (activity.sessions.length > 0) {
		parts.push("AI coding session activity:");
		for (const desc of getSessionDescriptions(activity.sessions).slice(0, 5)) {
			parts.push(`- ${desc}`);
		}
		parts.push("");
	}

	if (activity.githubActivity.length > 0) {
		parts.push("GitHub activity:");
		for (const desc of getGitHubDescriptions(activity.githubActivity).slice(0, 5)) {
			parts.push(`- ${desc}`);
		}
		parts.push("");
	}

	parts.push(
		"Respond with ONLY a single sentence summary. Do not include bullet points, formatting, or preamble.",
	);

	return parts.join("\n");
}

async function callOpenAI(prompt: string, model: string): Promise<string> {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY environment variable is required for LLM summarization");
	}

	const messages: OpenAIMessage[] = [
		{
			role: "system",
			content:
				"You are a concise technical writer who summarizes development work into single sentences.",
		},
		{
			role: "user",
			content: prompt,
		},
	];

	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages,
			max_tokens: 150,
			temperature: 0.3,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`OpenAI API error: ${response.status} ${error}`);
	}

	const data = (await response.json()) as OpenAIResponse;
	const content = data.choices[0]?.message?.content?.trim();

	if (!content) {
		throw new Error("Empty response from OpenAI");
	}

	return content;
}

async function callAnthropic(prompt: string, model: string): Promise<string> {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("ANTHROPIC_API_KEY environment variable is required for LLM summarization");
	}

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
		body: JSON.stringify({
			model,
			max_tokens: 150,
			system:
				"You are a concise technical writer who summarizes development work into single sentences.",
			messages: [
				{
					role: "user",
					content: prompt,
				},
			],
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Anthropic API error: ${response.status} ${error}`);
	}

	const data = (await response.json()) as AnthropicResponse;
	const textBlock = data.content.find((block) => block.type === "text");
	const content = textBlock?.text?.trim();

	if (!content) {
		throw new Error("Empty response from Anthropic");
	}

	return content;
}

async function generateSummary(prompt: string, config: Config): Promise<string> {
	const { provider, model } = config.llm;

	if (provider === "openai") {
		return callOpenAI(prompt, model);
	}

	if (provider === "anthropic") {
		return callAnthropic(prompt, model);
	}

	throw new Error(`Unknown LLM provider: ${provider}`);
}

function generateFallbackSummary(activity: DailyProjectActivity): string {
	const parts: string[] = [];

	if (activity.commits.length > 0) {
		const subjects = getCommitSubjects(activity.commits);
		if (subjects.length <= 3) {
			parts.push(...subjects.map((s) => cleanSubject(s)));
		} else {
			const first = subjects[0];
			if (first) {
				parts.push(cleanSubject(first));
			}
		}
	}

	if (parts.length === 0 && activity.sessions.length > 0) {
		const descriptions = getSessionDescriptions(activity.sessions);
		const first = descriptions[0];
		if (first) {
			parts.push(first);
		}
	}

	if (parts.length === 0) {
		return "Development activity";
	}

	return parts.join("; ");
}

export async function summarizeProjectActivity(
	projectSummary: ProjectWorkSummary,
	config: Config,
): Promise<ProjectWorkSummary> {
	if (!config.llm.enabled) {
		for (const project of projectSummary.projects) {
			for (const daily of project.dailyActivity) {
				daily.summary = generateFallbackSummary(daily);
			}
		}
		return projectSummary;
	}

	const summaryPromises: Array<{
		project: ProjectActivity;
		daily: DailyProjectActivity;
		promise: Promise<string>;
	}> = [];

	for (const project of projectSummary.projects) {
		for (const daily of project.dailyActivity) {
			const prompt = buildPrompt(project.projectName, daily.date, daily);
			summaryPromises.push({
				project,
				daily,
				promise: generateSummary(prompt, config).catch((error) => {
					console.error(`Failed to generate summary for ${project.projectName}: ${error}`);
					return generateFallbackSummary(daily);
				}),
			});
		}
	}

	const results = await Promise.all(summaryPromises.map((p) => p.promise));

	for (let i = 0; i < summaryPromises.length; i++) {
		const item = summaryPromises[i];
		const result = results[i];
		if (item && result) {
			item.daily.summary = result;
		}
	}

	return projectSummary;
}

function buildSmartPrompt(clusters: ContextCluster[], keyTerms: string[]): string {
	const parts: string[] = [];

	parts.push("Summarize this development work into a cohesive narrative.");
	parts.push("");
	parts.push(`Key themes: ${keyTerms.join(", ")}`);
	parts.push("");

	for (const cluster of clusters) {
		parts.push(`## ${cluster.theme}`);
		for (const item of cluster.items.slice(0, 5)) {
			const desc = item.description ? ` - ${item.description}` : "";
			parts.push(`- [${item.source}] ${item.title}${desc}`);
		}
		if (cluster.items.length > 5) {
			parts.push(`  ... and ${cluster.items.length - 5} more items`);
		}
		parts.push("");
	}

	parts.push("Write 2-3 sentences that:");
	parts.push("1. Highlight the main accomplishments");
	parts.push("2. Show how different work areas connect");
	parts.push("3. Focus on outcomes, not just activities");
	parts.push("");
	parts.push("Respond with ONLY the summary. No formatting, headers, or preamble.");

	return parts.join("\n");
}

function generateFallbackSmartSummary(smartSummary: SmartSummary): string {
	if (smartSummary.clusters.length === 0) {
		return "No development activity to summarize.";
	}

	const clusterSummaries = smartSummary.clusters.map((cluster) => {
		const count = cluster.items.length;
		const itemWord = count === 1 ? "item" : "items";
		return `${cluster.theme} (${count} ${itemWord})`;
	});

	if (clusterSummaries.length === 1) {
		return `Work focused on ${clusterSummaries[0]}.`;
	}

	return `Work spanned ${clusterSummaries.length} areas: ${clusterSummaries.join(", ")}.`;
}

export interface SmartSummaryResult {
	summary: SmartSummary;
	llmNarrative?: string;
}

export async function generateSmartSummary(
	items: WorkItem[],
	config: Config,
): Promise<SmartSummaryResult> {
	const summary = buildSmartSummary(items);
	const keyTerms = extractKeyTerms(items, 8);

	if (!config.llm.enabled) {
		return {
			summary,
			llmNarrative: generateFallbackSmartSummary(summary),
		};
	}

	try {
		const prompt = buildSmartPrompt(summary.clusters, keyTerms);
		const llmNarrative = await generateSummary(prompt, config);

		return {
			summary,
			llmNarrative,
		};
	} catch (error) {
		console.error(`Failed to generate smart summary: ${error}`);
		return {
			summary,
			llmNarrative: generateFallbackSmartSummary(summary),
		};
	}
}

export function collectAllItems(projectSummary: ProjectWorkSummary): WorkItem[] {
	const items: WorkItem[] = [];

	for (const project of projectSummary.projects) {
		for (const daily of project.dailyActivity) {
			items.push(...daily.commits);
			items.push(...daily.sessions);
			items.push(...daily.githubActivity);
			items.push(...daily.otherActivity);
		}
	}

	return items;
}
