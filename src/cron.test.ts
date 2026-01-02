import { describe, expect, test } from "bun:test";
import { buildCronEnvLine, buildCronLine, cronRun, type Fetcher, postToSlack } from "./cron.ts";

describe("buildCronLine", () => {
	const baseConfig = {
		hour: 9,
		minute: 0,
		outputDir: "/home/user/.local/share/worklog/daily",
	};

	test("generates cron line for file output", () => {
		const cronLine = buildCronLine(baseConfig);

		expect(cronLine).toContain("0 9 * * *");
		expect(cronLine).toContain("cron run");
		expect(cronLine).toContain('--output "');
		expect(cronLine).toContain("/standup-$(date +%Y-%m-%d).md");
		expect(cronLine).toContain("# worklog-daily-standup");
		expect(cronLine).not.toContain("--slack");
		expect(cronLine).not.toContain("curl");
		expect(cronLine).not.toContain("WORKLOG_SLACK_WEBHOOK");
	});

	test("generates cron line for Slack webhook (webhook set via env var, not inline)", () => {
		const config = {
			...baseConfig,
			slackWebhook: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
		};
		const cronLine = buildCronLine(config);

		expect(cronLine).toContain("0 9 * * *");
		expect(cronLine).toContain("cron run");
		expect(cronLine).toContain("--slack");
		expect(cronLine).toContain("# worklog-daily-standup");
		expect(cronLine).not.toContain("--output");
		expect(cronLine).not.toContain("curl");
		expect(cronLine).not.toContain("cat");
		expect(cronLine).not.toContain("https://");
	});

	test("handles custom time schedule", () => {
		const config = {
			...baseConfig,
			hour: 14,
			minute: 30,
		};
		const cronLine = buildCronLine(config);

		expect(cronLine).toContain("30 14 * * *");
		expect(cronLine).toContain("cron run");
	});

	test("properly quotes file paths", () => {
		const config = {
			...baseConfig,
			outputDir: "/path/with spaces/worklog",
		};
		const cronLine = buildCronLine(config);

		expect(cronLine).toContain('--output "/path/with spaces/worklog/standup-$(date +%Y-%m-%d).md"');
	});
});

describe("buildCronEnvLine", () => {
	test("generates environment variable line for simple webhook", () => {
		const envLine = buildCronEnvLine("https://hooks.slack.com/services/XXX/YYY/ZZZ");

		expect(envLine).toBe("WORKLOG_SLACK_WEBHOOK=https://hooks.slack.com/services/XXX/YYY/ZZZ");
	});

	test("handles webhook with query parameters", () => {
		const envLine = buildCronEnvLine("https://hooks.slack.com/services/T00/B00/xxx?token=yyy");

		expect(envLine).toBe(
			"WORKLOG_SLACK_WEBHOOK=https://hooks.slack.com/services/T00/B00/xxx?token=yyy",
		);
	});

	test("handles webhook with special characters (no quoting in crontab env vars)", () => {
		const envLine = buildCronEnvLine("https://example.com/webhook?token=abc&key=123");

		expect(envLine).toBe("WORKLOG_SLACK_WEBHOOK=https://example.com/webhook?token=abc&key=123");
	});
});

describe("postToSlack", () => {
	test("posts JSON payload and returns ok on success", async () => {
		const webhook = "https://example.com/webhook";
		const text = "hello";
		let called = false;

		const fetchImpl: Fetcher = async (input, init) => {
			called = true;
			expect(input).toBe(webhook);
			expect(init?.method).toBe("POST");
			expect(init?.headers).toEqual({ "Content-Type": "application/json" });
			expect(JSON.parse(String(init?.body))).toEqual({ text });
			return new Response("", { status: 200 });
		};

		const result = await postToSlack(webhook, text, fetchImpl);
		expect(called).toBe(true);
		expect(result).toEqual({ ok: true });
	});

	test("returns status and statusText when Slack responds with error", async () => {
		const fetchImpl: Fetcher = async () => {
			return new Response("", { status: 500, statusText: "Server Error" });
		};

		const result = await postToSlack("https://example.com/webhook", "hello", fetchImpl);
		expect(result).toEqual({ ok: false, status: 500, statusText: "Server Error" });
	});
});

describe("cronRun", () => {
	const mockConfig = {
		defaultSources: ["git", "github"],
		gitRepos: ["/test/repo"],
	};

	const mockDateRange = {
		start: new Date("2026-01-01"),
		end: new Date("2026-01-02"),
	};

	const createMockReader = (name: string, items: unknown[] = [], shouldFail = false) => ({
		name,
		read: async () => {
			if (shouldFail) throw new Error("Reader failed");
			return items;
		},
	});

	const mockAggregator = (items: unknown[]) => ({
		projects: [],
		items,
		dateRange: mockDateRange,
	});

	const mockFormatter = (_summary: unknown, format: unknown) => {
		return format === "slack" ? "Slack formatted output" : "Plain text output";
	};

	test("outputs to stdout when no options provided", async () => {
		const mockItems = [{ timestamp: new Date("2026-01-01T10:00:00Z"), title: "Test commit" }];

		const result = await cronRun(
			{},
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [createMockReader("git", mockItems)],
				aggregator: mockAggregator,
				formatter: mockFormatter,
			},
		);

		expect(result.success).toBe(true);
		expect(result.destination).toBe("stdout");
		expect(result.output).toBe("Plain text output");
		expect(result.error).toBeUndefined();
	});

	test("outputs to file when outputFile is specified", async () => {
		const mockItems = [{ timestamp: new Date("2026-01-01T10:00:00Z"), title: "Test commit" }];

		const result = await cronRun(
			{ outputFile: "/tmp/standup.md" },
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [createMockReader("git", mockItems)],
				aggregator: mockAggregator,
				formatter: mockFormatter,
			},
		);

		expect(result.success).toBe(true);
		expect(result.destination).toBe("file");
		expect(result.output).toBe("Plain text output");
	});

	test("posts to Slack when webhook is provided and uses Slack format", async () => {
		const mockItems = [{ timestamp: new Date("2026-01-01T10:00:00Z"), title: "Test commit" }];

		const mockSlackPoster = async (webhook: string, text: string) => {
			expect(webhook).toBe("https://hooks.slack.com/test");
			expect(text).toBe("Slack formatted output");
			return { ok: true as const };
		};

		const result = await cronRun(
			{ slackWebhook: "https://hooks.slack.com/test" },
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [createMockReader("git", mockItems)],
				aggregator: mockAggregator,
				formatter: mockFormatter,
				slackPoster: mockSlackPoster,
			},
		);

		expect(result.success).toBe(true);
		expect(result.destination).toBe("slack");
		expect(result.output).toBe("Slack formatted output");
		expect(result.error).toBeUndefined();
	});

	test("returns error when Slack posting fails", async () => {
		const mockItems = [{ timestamp: new Date("2026-01-01T10:00:00Z"), title: "Test commit" }];

		const mockSlackPoster = async () => {
			return { ok: false as const, status: 500, statusText: "Internal Server Error" };
		};

		const result = await cronRun(
			{ slackWebhook: "https://hooks.slack.com/test" },
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [createMockReader("git", mockItems)],
				aggregator: mockAggregator,
				formatter: mockFormatter,
				slackPoster: mockSlackPoster,
			},
		);

		expect(result.success).toBe(false);
		expect(result.destination).toBe("slack");
		expect(result.error).toBe("Internal Server Error");
	});

	test("silently skips failing readers and continues", async () => {
		const successItems = [
			{ timestamp: new Date("2026-01-01T10:00:00Z"), title: "Successful read" },
		];

		const result = await cronRun(
			{},
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [
					createMockReader("git", successItems),
					createMockReader("github", [], true),
					createMockReader("opencode", successItems),
				],
				aggregator: mockAggregator,
				formatter: mockFormatter,
			},
		);

		expect(result.success).toBe(true);
		expect(result.output).toBe("Plain text output");
	});

	test("aggregates items from multiple readers", async () => {
		const gitItems = [{ timestamp: new Date("2026-01-01T10:00:00Z"), title: "Git commit" }];
		const githubItems = [{ timestamp: new Date("2026-01-01T11:00:00Z"), title: "GitHub PR" }];

		let capturedItems: unknown[] = [];
		const capturingAggregator = (items: unknown[]) => {
			capturedItems = items;
			return mockAggregator(items);
		};

		await cronRun(
			{},
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [createMockReader("git", gitItems), createMockReader("github", githubItems)],
				aggregator: capturingAggregator,
				formatter: mockFormatter,
			},
		);

		expect(capturedItems).toHaveLength(2);
		expect(capturedItems).toEqual([...gitItems, ...githubItems]);
	});

	test("handles empty results from all readers", async () => {
		const result = await cronRun(
			{},
			{
				config: mockConfig,
				dateRange: mockDateRange,
				readers: [createMockReader("git", []), createMockReader("github", [])],
				aggregator: mockAggregator,
				formatter: mockFormatter,
			},
		);

		expect(result.success).toBe(true);
		expect(result.output).toBe("Plain text output");
	});
});
