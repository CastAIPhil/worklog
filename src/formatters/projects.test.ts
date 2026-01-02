import { describe, expect, test } from "bun:test";
import type {
	DailyProjectActivity,
	ProjectActivity,
	ProjectWorkSummary,
	WorkItem,
} from "../types.ts";
import type { TrendData } from "../utils/trends.ts";
import {
	formatProjectsJson,
	formatProjectsMarkdown,
	formatProjectsPlain,
	formatProjectsSlack,
} from "./projects.ts";

function createWorkItem(overrides: Partial<WorkItem>): WorkItem {
	return {
		source: "git",
		timestamp: new Date("2025-01-01T10:00:00Z"),
		title: "Test item",
		...overrides,
	};
}

function createDailyActivity(overrides: Partial<DailyProjectActivity> = {}): DailyProjectActivity {
	return {
		date: new Date("2025-01-01T00:00:00Z"),
		commits: [],
		sessions: [],
		githubActivity: [],
		otherActivity: [],
		...overrides,
	};
}

function createProject(overrides: Partial<ProjectActivity> = {}): ProjectActivity {
	return {
		projectName: "test-project",
		projectPath: "~/code/test-project",
		dailyActivity: [createDailyActivity()],
		...overrides,
	};
}

function createSummary(overrides: Partial<ProjectWorkSummary> = {}): ProjectWorkSummary {
	return {
		dateRange: {
			start: new Date("2025-01-01T00:00:00Z"),
			end: new Date("2025-01-01T23:59:59Z"),
		},
		projects: [createProject()],
		generatedAt: new Date("2025-01-01T12:00:00Z"),
		...overrides,
	};
}

describe("formatProjectsMarkdown", () => {
	test("includes Misc section when misc items exist", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "feat: add feature" })],
						}),
					],
				}),
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "fix: random fix" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("**worklog**:");
		expect(result).toContain("**Misc**:");
	});

	test("excludes Misc section when no misc items exist", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("**worklog**:");
		expect(result).not.toContain("**Misc**:");
	});

	test("renders Misc in verbose mode", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							commits: [
								createWorkItem({ title: "feat: feature 1" }),
								createWorkItem({ title: "fix: bug fix" }),
							],
							sessions: [
								createWorkItem({ source: "claude", title: "Claude session: Debug issue" }),
							],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, true);

		expect(result).toContain("## Misc");
		expect(result).toContain("**Features**");
		expect(result).toContain("**Bug Fixes**");
		expect(result).toContain("**AI Sessions**");
	});
});

describe("formatProjectsPlain", () => {
	test("includes Misc in plain output", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "feat: add feature" })],
						}),
					],
				}),
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "chore: cleanup" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsPlain(summary);

		expect(result).toContain("WORKLOG");
		expect(result).toContain("MISC");
	});
});

describe("formatProjectsSlack", () => {
	test("includes Misc in Slack format", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "feat: add feature" })],
						}),
					],
				}),
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							sessions: [createWorkItem({ source: "opencode", title: "OpenCode session: Debug" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsSlack(summary);

		expect(result).toContain(":file_folder: *worklog*:");
		expect(result).toContain(":file_folder: *Misc*:");
	});
});

describe("formatProjectsJson", () => {
	test("includes misc as project entry with empty path", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "feat: feature" })],
						}),
					],
				}),
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "fix: fix" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsJson(summary);
		const parsed = JSON.parse(result);

		expect(parsed.projects).toHaveLength(2);
		expect(parsed.projects[0].name).toBe("worklog");
		expect(parsed.projects[0].path).toBe("~/code/worklog");
		expect(parsed.projects[1].name).toBe("Misc");
		expect(parsed.projects[1].path).toBe(null);
	});

	test("JSON structure is valid when only Misc exists", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "feat: orphan commit" })],
							sessions: [createWorkItem({ source: "claude", title: "Random session" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsJson(summary);
		const parsed = JSON.parse(result);

		expect(parsed.projects).toHaveLength(1);
		expect(parsed.projects[0].name).toBe("Misc");
		expect(parsed.projects[0].activity).toHaveLength(1);
		expect(parsed.projects[0].activity[0].commitCount).toBe(1);
		expect(parsed.projects[0].activity[0].sessionCount).toBe(1);
	});
});

describe("Misc bucket behavior", () => {
	test("Misc appears with regular projects in concise mode", () => {
		const summary = createSummary({
			projects: [
				createProject({
					projectName: "alpha",
					projectPath: "~/code/alpha",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "feat: alpha feature" })],
						}),
					],
				}),
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							commits: [createWorkItem({ title: "fix: misc fix" })],
						}),
					],
				}),
			],
		});

		const markdown = formatProjectsMarkdown(summary, false);
		const plain = formatProjectsPlain(summary);
		const slack = formatProjectsSlack(summary);

		expect(markdown).toContain("**alpha**:");
		expect(markdown).toContain("**Misc**:");

		expect(plain).toContain("ALPHA");
		expect(plain).toContain("MISC");

		expect(slack).toContain("*alpha*:");
		expect(slack).toContain("*Misc*:");
	});

	test("weekly reports include Misc for multi-day activity", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-03T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-01T00:00:00Z"),
							commits: [createWorkItem({ title: "feat: day 1" })],
						}),
					],
				}),
				createProject({
					projectName: "Misc",
					projectPath: "(unattributed)",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							commits: [createWorkItem({ title: "fix: day 2 misc" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("Weekly Standup");
		expect(result).toContain("## worklog");
		expect(result).toContain("## Misc");
		expect(result).not.toMatch(/##\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/);
	});
});

describe("weekly project rollup with PR/branch lines", () => {
	test("renders PR opened lines with URLs in weekly format", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							githubActivity: [
								createWorkItem({
									source: "github",
									title: "[worklog] PR #42 opened: Add new feature",
									metadata: {
										type: "pr",
										number: 42,
										action: "opened",
										url: "https://github.com/user/worklog/pull/42",
										title: "Add new feature",
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("## worklog");
		expect(result).toContain(
			"Opened PR #42: Add new feature (https://github.com/user/worklog/pull/42)",
		);
	});

	test("renders PR merged lines with URLs in weekly format", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-03T00:00:00Z"),
							githubActivity: [
								createWorkItem({
									source: "github",
									title: "[worklog] PR #42 merged: Add new feature",
									metadata: {
										type: "pr",
										number: 42,
										action: "merged",
										url: "https://github.com/user/worklog/pull/42",
										title: "Add new feature",
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("## worklog");
		expect(result).toContain(
			"Merged PR #42: Add new feature (https://github.com/user/worklog/pull/42)",
		);
	});

	test("renders merged branch lines in weekly format", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-04T00:00:00Z"),
							commits: [
								createWorkItem({
									source: "git",
									title: "[worklog] Merge feature/auth into main",
									metadata: {
										type: "branch",
										action: "merged",
										sourceBranch: "feature/auth",
										targetBranch: "main",
										isPrMerge: false,
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("## worklog");
		expect(result).toContain("Merged branch feature/auth → main");
	});

	test("renders PR lines before other activity in weekly format", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							commits: [createWorkItem({ title: "feat: add logging" })],
							githubActivity: [
								createWorkItem({
									source: "github",
									title: "[worklog] PR #10 opened",
									metadata: {
										type: "pr",
										number: 10,
										action: "opened",
										url: "https://github.com/user/worklog/pull/10",
										title: "Add feature",
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		const prIndex = result.indexOf("Opened PR #10");
		const commitIndex = result.indexOf("Add logging");

		expect(prIndex).toBeGreaterThan(-1);
		expect(commitIndex).toBeGreaterThan(-1);
		expect(prIndex).toBeLessThan(commitIndex);
	});

	test("weekly rollup aggregates activity from multiple days", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-01T00:00:00Z"),
							commits: [createWorkItem({ title: "feat: day 1" })],
						}),
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							githubActivity: [
								createWorkItem({
									source: "github",
									metadata: {
										type: "pr",
										number: 15,
										action: "opened",
										url: "https://github.com/user/worklog/pull/15",
										title: "Day 2 PR",
									},
								}),
							],
						}),
						createDailyActivity({
							date: new Date("2025-01-03T00:00:00Z"),
							commits: [createWorkItem({ title: "fix: day 3" })],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("## worklog");
		expect(result).toContain("Opened PR #15");
		expect(result).toContain("Day 1");
	});

	test("deduplicates PR lines with same number and action", () => {
		const summary = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-01T00:00:00Z"),
							githubActivity: [
								createWorkItem({
									source: "github",
									metadata: {
										type: "pr",
										number: 42,
										action: "opened",
										url: "https://github.com/user/worklog/pull/42",
										title: "Feature A",
									},
								}),
							],
						}),
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							githubActivity: [
								createWorkItem({
									source: "github",
									metadata: {
										type: "pr",
										number: 42,
										action: "opened",
										url: "https://github.com/user/worklog/pull/42",
										title: "Feature A",
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const result = formatProjectsMarkdown(summary, false);

		const matches = result.match(/Opened PR #42/g);
		expect(matches).toHaveLength(1);
	});
});

describe("end-to-end GitHub PR workflow", () => {
	test("full flow from GitHub PR WorkItems to ProjectWorkSummary formatter output", () => {
		const prOpenedWorkItem = createWorkItem({
			source: "github",
			timestamp: new Date("2025-01-02T10:00:00Z"),
			title: "[jvalentini/worklog] PR #42 opened: Add comprehensive test coverage",
			metadata: {
				type: "pr",
				action: "opened",
				repo: "jvalentini/worklog",
				number: 42,
				url: "https://github.com/jvalentini/worklog/pull/42",
				title: "Add comprehensive test coverage",
				summary: "Add comprehensive test coverage",
			},
		});

		const prMergedWorkItem = createWorkItem({
			source: "github",
			timestamp: new Date("2025-01-03T15:00:00Z"),
			title: "[jvalentini/worklog] PR #42 merged: Add comprehensive test coverage",
			metadata: {
				type: "pr",
				action: "merged",
				repo: "jvalentini/worklog",
				number: 42,
				url: "https://github.com/jvalentini/worklog/pull/42",
				title: "Add comprehensive test coverage",
				summary: "Add comprehensive test coverage",
			},
		});

		const commitWorkItem = createWorkItem({
			source: "git",
			timestamp: new Date("2025-01-02T12:00:00Z"),
			title: "feat: add end-to-end test for GitHub PR workflow",
			metadata: {
				repo: "~/code/worklog",
			},
		});

		const weeklyProjectSummaryWithGitHubActivity = createSummary({
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-07T23:59:59Z"),
			},
			projects: [
				createProject({
					projectName: "worklog",
					projectPath: "~/code/worklog",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							commits: [commitWorkItem],
							githubActivity: [prOpenedWorkItem],
						}),
						createDailyActivity({
							date: new Date("2025-01-03T00:00:00Z"),
							githubActivity: [prMergedWorkItem],
						}),
					],
				}),
			],
		});

		const markdownConcise = formatProjectsMarkdown(weeklyProjectSummaryWithGitHubActivity, false);
		expect(markdownConcise).toContain("Weekly Standup");
		expect(markdownConcise).toContain("## worklog");
		expect(markdownConcise).toContain(
			"Opened PR #42: Add comprehensive test coverage (https://github.com/jvalentini/worklog/pull/42)",
		);
		expect(markdownConcise).toContain(
			"Merged PR #42: Add comprehensive test coverage (https://github.com/jvalentini/worklog/pull/42)",
		);

		const markdownVerbose = formatProjectsMarkdown(weeklyProjectSummaryWithGitHubActivity, true);
		expect(markdownVerbose).toContain("## worklog");
		expect(markdownVerbose).toContain("**Features**");
		expect(markdownVerbose).toContain("Add end-to-end test for GitHub PR workflow");

		const plainFormat = formatProjectsPlain(weeklyProjectSummaryWithGitHubActivity, false);
		expect(plainFormat).toContain("WORKLOG");
		expect(plainFormat).toContain("Opened PR #42");
		expect(plainFormat).toContain("Merged PR #42");

		const slackFormat = formatProjectsSlack(weeklyProjectSummaryWithGitHubActivity, false);
		expect(slackFormat).toContain(":file_folder: *worklog*");
		expect(slackFormat).toContain("Opened PR #42");
		expect(slackFormat).toContain("Merged PR #42");

		const jsonFormat = formatProjectsJson(weeklyProjectSummaryWithGitHubActivity, false);
		const parsedJson = JSON.parse(jsonFormat);
		expect(parsedJson.projects).toHaveLength(1);
		expect(parsedJson.projects[0].name).toBe("worklog");
		expect(parsedJson.projects[0].activity).toHaveLength(2);
		expect(parsedJson.projects[0].activity[0].commitCount).toBe(1);
		expect(parsedJson.projects[0].activity[0].githubActivityCount).toBe(1);
		expect(parsedJson.projects[0].activity[1].githubActivityCount).toBe(1);
	});

	test("GitHub PR WorkItems with commits create proper daily summaries", () => {
		const dailySummaryWithPrAndCommits = createSummary({
			projects: [
				createProject({
					projectName: "api-server",
					projectPath: "~/code/api-server",
					dailyActivity: [
						createDailyActivity({
							date: new Date("2025-01-02T00:00:00Z"),
							commits: [
								createWorkItem({ title: "feat: add OAuth support" }),
								createWorkItem({ title: "fix: rate limiting bug" }),
							],
							githubActivity: [
								createWorkItem({
									source: "github",
									title: "[user/api-server] PR #10 opened: OAuth implementation",
									metadata: {
										type: "pr",
										action: "opened",
										repo: "user/api-server",
										number: 10,
										url: "https://github.com/user/api-server/pull/10",
										title: "OAuth implementation",
										summary: "Implement OAuth flow",
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const conciseOutput = formatProjectsMarkdown(dailySummaryWithPrAndCommits, false);
		expect(conciseOutput).toContain("**api-server**:");
		expect(conciseOutput).toContain(
			"Opened PR #10: Implement OAuth flow (https://github.com/user/api-server/pull/10)",
		);

		const prIndex = conciseOutput.indexOf("Opened PR #10:");
		const commitIndex = conciseOutput.indexOf("Add OAuth support");
		expect(prIndex).toBeGreaterThan(-1);
		expect(commitIndex).toBeGreaterThan(-1);
		expect(prIndex).toBeLessThan(commitIndex);

		expect(conciseOutput).toContain("Add OAuth support");
		expect(conciseOutput).toContain("Rate limiting bug");

		const verboseOutput = formatProjectsMarkdown(dailySummaryWithPrAndCommits, true);
		expect(verboseOutput).toContain("## api-server");
		expect(verboseOutput).toContain(
			"Opened PR #10: Implement OAuth flow (https://github.com/user/api-server/pull/10)",
		);
		expect(verboseOutput).toContain("**Features**");
		expect(verboseOutput).toContain("**Bug Fixes**");
		expect(verboseOutput).not.toContain("**GitHub**");
	});

	test("does not duplicate PRs under GitHub section in verbose mode", () => {
		const summaryWithPrAndIssue = createSummary({
			projects: [
				createProject({
					projectName: "api-server",
					dailyActivity: [
						createDailyActivity({
							githubActivity: [
								createWorkItem({
									source: "github",
									metadata: {
										type: "pr",
										action: "opened",
										repo: "user/api-server",
										number: 10,
										url: "https://github.com/user/api-server/pull/10",
										title: "OAuth implementation",
										summary: "Implement OAuth flow",
									},
								}),
								createWorkItem({
									source: "github",
									title: "[user/api-server] Issue #5 opened: Bug",
									metadata: {
										type: "issue",
										action: "opened",
										repo: "user/api-server",
										number: 5,
									},
								}),
							],
						}),
					],
				}),
			],
		});

		const verboseOutput = formatProjectsMarkdown(summaryWithPrAndIssue, true);
		expect(verboseOutput).toContain(
			"Opened PR #10: Implement OAuth flow (https://github.com/user/api-server/pull/10)",
		);
		expect(verboseOutput).toContain("Issue #5 opened: Bug");

		const matches = verboseOutput.match(/PR #10/g);
		expect(matches).toHaveLength(1);
	});
});

describe("trends functionality", () => {
	const trendData: TrendData = {
		currentPeriod: {
			totalItems: 10,
			itemsBySource: { git: 5, opencode: 3, github: 2 },
			dateRange: {
				start: new Date("2025-01-01T00:00:00Z"),
				end: new Date("2025-01-01T23:59:59Z"),
			},
		},
		previousPeriod: {
			totalItems: 8,
			itemsBySource: { git: 4, opencode: 2, github: 2 },
			dateRange: {
				start: new Date("2024-12-31T00:00:00Z"),
				end: new Date("2024-12-31T23:59:59Z"),
			},
		},
		trends: {
			totalChange: 2,
			totalChangePercent: 25,
			sourceChanges: {
				git: { change: 1, changePercent: 25 },
				opencode: { change: 1, changePercent: 50 },
				github: { change: 0, changePercent: 0 },
			},
		},
	};

	test("markdown includes trends when trendData is present", () => {
		const summary = createSummary({ trendData });

		const result = formatProjectsMarkdown(summary, false);

		expect(result).toContain("## Activity Trends");
		expect(result).toContain("Overall:");
		expect(result).toContain("up");
		expect(result).toContain("10 vs 8");
	});

	test("markdown excludes trends when trendData is not present", () => {
		const summary = createSummary();

		const result = formatProjectsMarkdown(summary, false);

		expect(result).not.toContain("## Activity Trends");
	});

	test("plain text includes trends when trendData is present and verbose", () => {
		const summary = createSummary({ trendData });

		const result = formatProjectsPlain(summary, true);

		expect(result).toContain("Activity Trends");
		expect(result).toContain("Overall:");
	});

	test("plain text excludes trends when not verbose", () => {
		const summary = createSummary({ trendData });

		const result = formatProjectsPlain(summary, false);

		expect(result).not.toContain("Activity Trends");
	});

	test("slack includes trends when trendData is present and verbose", () => {
		const summary = createSummary({ trendData });

		const result = formatProjectsSlack(summary, true);

		expect(result).toContain("Activity Trends");
		expect(result).toContain(":chart_with_upwards_trend:");
	});

	test("slack excludes trends when not verbose", () => {
		const summary = createSummary({ trendData });

		const result = formatProjectsSlack(summary, false);

		expect(result).not.toContain("Activity Trends");
	});

	test("JSON includes trends when trendData is present", () => {
		const summary = createSummary({ trendData });

		const result = formatProjectsJson(summary);
		const parsed = JSON.parse(result);

		expect(parsed.trends).toBeDefined();
		expect(parsed.trends.current.totalItems).toBe(10);
		expect(parsed.trends.previous.totalItems).toBe(8);
		expect(parsed.trends.changes.totalChange).toBe(2);
		expect(parsed.trends.changes.totalChangePercent).toBe(25);
	});

	test("JSON sets trends to null when trendData is not present", () => {
		const summary = createSummary();

		const result = formatProjectsJson(summary);
		const parsed = JSON.parse(result);

		expect(parsed.trends).toBeNull();
	});
});
