import { describe, expect, test } from "bun:test";
import { buildCronLine } from "./cron_fallback.ts";

describe("cron fallback", () => {
	test("buildCronLine schedules each period at 00:05", () => {
		const cmd = "worklog";
		expect(buildCronLine("daily", cmd)).toContain("5 0 * * *");
		expect(buildCronLine("weekly", cmd)).toContain("5 0 * * 1");
		expect(buildCronLine("monthly", cmd)).toContain("5 0 1 * *");
		expect(buildCronLine("quarterly", cmd)).toContain("5 0 1 1,4,7,10 *");
	});

	test("buildCronLine uses schedule run --period", () => {
		const cmd = "worklog";
		expect(buildCronLine("daily", cmd)).toContain("schedule run --period daily");
		expect(buildCronLine("weekly", cmd)).toContain("schedule run --period weekly");
	});

	test("buildCronLine includes distinct markers", () => {
		const cmd = "worklog";
		expect(buildCronLine("daily", cmd)).toContain("# worklog-daily-standup");
		expect(buildCronLine("weekly", cmd)).toContain("# worklog-weekly-standup");
		expect(buildCronLine("monthly", cmd)).toContain("# worklog-monthly-standup");
		expect(buildCronLine("quarterly", cmd)).toContain("# worklog-quarterly-standup");
	});
});
