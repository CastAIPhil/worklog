import { describe, expect, test } from "bun:test";
import { buildCronEnvLine, buildCronLine } from "./cron.ts";

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
