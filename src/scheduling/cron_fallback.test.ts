import { describe, expect, test } from "bun:test";
import { buildCronLine } from "./cron_fallback.ts";

describe("cron fallback", () => {
	test("buildCronLine schedules each period at 09:00", () => {
		const cmd = "worklog";
		expect(buildCronLine("daily", cmd)).toContain("0 9 * * *");
		expect(buildCronLine("weekly", cmd)).toContain("0 9 * * 1");
		expect(buildCronLine("monthly", cmd)).toContain("0 9 1 * *");
		expect(buildCronLine("quarterly", cmd)).toContain("0 9 1 1,4,7,10 *");
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
