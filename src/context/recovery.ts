import { format, subDays, subWeeks } from "date-fns";
import {
	analyzeFeatures,
	type FeatureAnalysis,
	type FeatureCluster,
} from "../analysis/features.ts";
import { type GitRepoStatus, getAllRepoStatuses } from "../sources/gitStatus.ts";
import type { Config, DateRange, SourceReader, WorkItem } from "../types.ts";

export interface RecoveryOptions {
	week?: boolean;
	project?: string;
	verbose?: boolean;
}

export interface RecoveryReport {
	generatedAt: Date;
	dateRange: DateRange;
	featureAnalysis: FeatureAnalysis;
	repoStatuses: GitRepoStatus[];
	inProgressWork: FeatureCluster[];
	uncommittedWarnings: UncommittedWarning[];
	branchRecommendations: BranchRecommendation[];
	quickResumeCommands: string[];
}

export interface UncommittedWarning {
	repoName: string;
	repoPath: string;
	changesCount: number;
	stagedCount: number;
	unstagedCount: number;
	untrackedCount: number;
}

export interface BranchRecommendation {
	repoName: string;
	repoPath: string;
	currentBranch: string;
	recommendation: string;
	reason: string;
}

function getRecoveryDateRange(options: RecoveryOptions): DateRange {
	const now = new Date();

	if (options.week) {
		return {
			start: subWeeks(now, 1),
			end: now,
		};
	}

	// Default: last 3 days (recent session context)
	return {
		start: subDays(now, 3),
		end: now,
	};
}

function generateUncommittedWarnings(repoStatuses: GitRepoStatus[]): UncommittedWarning[] {
	const warnings: UncommittedWarning[] = [];

	for (const status of repoStatuses) {
		if (!status.hasUncommittedChanges) continue;

		const stagedCount = status.changes.filter((c) => c.staged).length;
		const unstagedCount = status.changes.filter(
			(c) => !c.staged && c.status !== "untracked",
		).length;
		const untrackedCount = status.changes.filter((c) => c.status === "untracked").length;

		warnings.push({
			repoName: status.repoName,
			repoPath: status.repoPath,
			changesCount: status.changes.length,
			stagedCount,
			unstagedCount,
			untrackedCount,
		});
	}

	return warnings;
}

function generateBranchRecommendations(repoStatuses: GitRepoStatus[]): BranchRecommendation[] {
	const recommendations: BranchRecommendation[] = [];

	for (const status of repoStatuses) {
		// Unpushed commits warning
		if (status.hasUnpushedCommits) {
			recommendations.push({
				repoName: status.repoName,
				repoPath: status.repoPath,
				currentBranch: status.branch.name,
				recommendation: `Push ${status.branch.ahead} unpushed commit(s)`,
				reason: `Branch is ${status.branch.ahead} commit(s) ahead of ${status.branch.trackingBranch || "remote"}`,
			});
		}

		// Behind remote warning
		if (status.branch.behind > 0) {
			recommendations.push({
				repoName: status.repoName,
				repoPath: status.repoPath,
				currentBranch: status.branch.name,
				recommendation: "Pull latest changes from remote",
				reason: `Branch is ${status.branch.behind} commit(s) behind ${status.branch.trackingBranch || "remote"}`,
			});
		}

		// Detached HEAD warning
		if (status.branch.isDetached) {
			recommendations.push({
				repoName: status.repoName,
				repoPath: status.repoPath,
				currentBranch: status.branch.name,
				recommendation: "Create a branch or checkout an existing one",
				reason: "HEAD is detached - changes may be lost",
			});
		}
	}

	return recommendations;
}

function quoteShellArg(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

function generateQuickResumeCommands(report: Partial<RecoveryReport>): string[] {
	const commands: string[] = [];

	// Commands for uncommitted work
	for (const warning of report.uncommittedWarnings || []) {
		if (warning.stagedCount > 0 && warning.unstagedCount === 0) {
			commands.push(`cd ${quoteShellArg(warning.repoPath)} && git commit -m "WIP: continue work"`);
		} else if (warning.changesCount > 0) {
			commands.push(`cd ${quoteShellArg(warning.repoPath)} && git status`);
		}
	}

	// Commands for unpushed commits
	for (const rec of report.branchRecommendations || []) {
		if (rec.recommendation.includes("Push")) {
			commands.push(`cd ${quoteShellArg(rec.repoPath)} && git push`);
		}
	}

	return commands.slice(0, 5);
}

export async function generateRecoveryReport(
	config: Config,
	readers: SourceReader[],
	options: RecoveryOptions = {},
): Promise<RecoveryReport> {
	const dateRange = getRecoveryDateRange(options);

	// Gather work items from all sources
	const allItems: WorkItem[] = [];

	for (const reader of readers) {
		try {
			const items = await reader.read(dateRange, config);

			// Filter by project if specified
			const projectFilter = options.project;
			if (projectFilter) {
				const projectLower = projectFilter.toLowerCase();
				const filtered = items.filter((item) => {
					const repo = item.metadata?.repo as string | undefined;
					if (repo) {
						return repo.toLowerCase().includes(projectLower);
					}
					return item.title.toLowerCase().includes(projectLower);
				});
				allItems.push(...filtered);
			} else {
				allItems.push(...items);
			}
		} catch {
			// Continue on reader errors
		}
	}

	// Get repo statuses
	let repoStatuses = await getAllRepoStatuses(config);

	// Filter repos by project if specified
	const projectRepoFilter = options.project;
	if (projectRepoFilter) {
		const projectLower = projectRepoFilter.toLowerCase();
		repoStatuses = repoStatuses.filter((r) => r.repoPath.toLowerCase().includes(projectLower));
	}

	// Analyze features
	const featureAnalysis = analyzeFeatures(allItems, repoStatuses);

	// Get in-progress work (not completed/nearly-done)
	const inProgressWork = featureAnalysis.features.filter(
		(f) => f.status === "started" || f.status === "in-progress",
	);

	// Generate warnings and recommendations
	const uncommittedWarnings = generateUncommittedWarnings(repoStatuses);
	const branchRecommendations = generateBranchRecommendations(repoStatuses);

	const partialReport: Partial<RecoveryReport> = {
		uncommittedWarnings,
		branchRecommendations,
		repoStatuses,
	};

	const quickResumeCommands = generateQuickResumeCommands(partialReport);

	return {
		generatedAt: new Date(),
		dateRange,
		featureAnalysis,
		repoStatuses,
		inProgressWork,
		uncommittedWarnings,
		branchRecommendations,
		quickResumeCommands,
	};
}

export function formatRecoveryReport(
	report: RecoveryReport,
	outputFormat: "markdown" | "plain" | "json" = "markdown",
	verbose = false,
): string {
	if (outputFormat === "json") {
		return JSON.stringify(report, null, 2);
	}

	const lines: string[] = [];
	const isMarkdown = outputFormat === "markdown";

	// Header
	if (isMarkdown) {
		lines.push("# Session Recovery Report");
		lines.push("");
		lines.push(
			`*Generated: ${format(report.generatedAt, "yyyy-MM-dd HH:mm")} | Period: ${format(report.dateRange.start, "MMM d")} - ${format(report.dateRange.end, "MMM d")}*`,
		);
	} else {
		lines.push("SESSION RECOVERY REPORT");
		lines.push("=".repeat(40));
		lines.push(
			`Generated: ${format(report.generatedAt, "yyyy-MM-dd HH:mm")} | Period: ${format(report.dateRange.start, "MMM d")} - ${format(report.dateRange.end, "MMM d")}`,
		);
	}
	lines.push("");

	// Uncommitted changes warnings
	if (report.uncommittedWarnings.length > 0) {
		if (isMarkdown) {
			lines.push("## Uncommitted Changes");
		} else {
			lines.push("UNCOMMITTED CHANGES");
			lines.push("-".repeat(20));
		}
		lines.push("");

		for (const warning of report.uncommittedWarnings) {
			const parts = [];
			if (warning.stagedCount > 0) parts.push(`${warning.stagedCount} staged`);
			if (warning.unstagedCount > 0) parts.push(`${warning.unstagedCount} modified`);
			if (warning.untrackedCount > 0) parts.push(`${warning.untrackedCount} untracked`);

			if (isMarkdown) {
				lines.push(`- **${warning.repoName}**: ${parts.join(", ")}`);
			} else {
				lines.push(`  [!] ${warning.repoName}: ${parts.join(", ")}`);
			}
		}
		lines.push("");
	}

	// In-progress work
	if (report.inProgressWork.length > 0) {
		if (isMarkdown) {
			lines.push("## In-Progress Work");
		} else {
			lines.push("IN-PROGRESS WORK");
			lines.push("-".repeat(20));
		}
		lines.push("");

		for (const feature of report.inProgressWork) {
			const statusIcon =
				feature.status === "started" ? "🟡" : feature.status === "in-progress" ? "🔵" : "🟢";
			const progressBar = `[${"█".repeat(Math.floor(feature.completionEstimate / 10))}${"░".repeat(10 - Math.floor(feature.completionEstimate / 10))}]`;

			if (isMarkdown) {
				lines.push(`### ${statusIcon} ${feature.name}`);
				lines.push(`*${feature.status}* ${progressBar} ~${feature.completionEstimate}%`);
				lines.push("");

				if (feature.suggestedNextSteps.length > 0) {
					lines.push("**Next steps:**");
					for (const step of feature.suggestedNextSteps) {
						lines.push(`- ${step}`);
					}
				}

				if (verbose && feature.items.length > 0) {
					lines.push("");
					lines.push("**Recent activity:**");
					for (const item of feature.items.slice(0, 5)) {
						lines.push(`- ${item.title}`);
					}
				}
			} else {
				lines.push(`  ${statusIcon} ${feature.name}`);
				lines.push(`     ${feature.status} ${progressBar} ~${feature.completionEstimate}%`);

				if (feature.suggestedNextSteps.length > 0) {
					lines.push("     Next steps:");
					for (const step of feature.suggestedNextSteps) {
						lines.push(`       → ${step}`);
					}
				}
			}
			lines.push("");
		}
	}

	// Completed/nearly-done features summary
	const completedFeatures = report.featureAnalysis.features.filter(
		(f) => f.status === "nearly-done" || f.status === "completed",
	);
	if (completedFeatures.length > 0) {
		if (isMarkdown) {
			lines.push("## Nearly Complete");
		} else {
			lines.push("NEARLY COMPLETE");
			lines.push("-".repeat(20));
		}
		lines.push("");

		for (const feature of completedFeatures) {
			if (isMarkdown) {
				lines.push(`- 🟢 ${feature.name} (~${feature.completionEstimate}%)`);
			} else {
				lines.push(`  🟢 ${feature.name} (~${feature.completionEstimate}%)`);
			}
		}
		lines.push("");
	}

	// Branch recommendations
	if (report.branchRecommendations.length > 0) {
		if (isMarkdown) {
			lines.push("## Branch Recommendations");
		} else {
			lines.push("BRANCH RECOMMENDATIONS");
			lines.push("-".repeat(20));
		}
		lines.push("");

		for (const rec of report.branchRecommendations) {
			if (isMarkdown) {
				lines.push(`- **${rec.repoName}** (${rec.currentBranch}): ${rec.recommendation}`);
				lines.push(`  - *${rec.reason}*`);
			} else {
				lines.push(`  ${rec.repoName} (${rec.currentBranch}): ${rec.recommendation}`);
				lines.push(`    Reason: ${rec.reason}`);
			}
		}
		lines.push("");
	}

	// Quick resume commands
	if (report.quickResumeCommands.length > 0) {
		if (isMarkdown) {
			lines.push("## Quick Resume Commands");
			lines.push("```bash");
			for (const cmd of report.quickResumeCommands) {
				lines.push(cmd);
			}
			lines.push("```");
		} else {
			lines.push("QUICK RESUME COMMANDS");
			lines.push("-".repeat(20));
			for (const cmd of report.quickResumeCommands) {
				lines.push(`  $ ${cmd}`);
			}
		}
		lines.push("");
	}

	// Summary
	if (isMarkdown) {
		lines.push("---");
		lines.push(
			`*${report.featureAnalysis.activeFeatureCount} active features, ${report.featureAnalysis.completedFeatureCount} nearly complete*`,
		);
	} else {
		lines.push("-".repeat(40));
		lines.push(
			`${report.featureAnalysis.activeFeatureCount} active features, ${report.featureAnalysis.completedFeatureCount} nearly complete`,
		);
	}

	return lines.join("\n");
}
