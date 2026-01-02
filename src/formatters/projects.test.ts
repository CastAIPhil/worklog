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
		expect(result).toContain("**worklog**:");
		expect(result).toContain("**Misc**:");
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
