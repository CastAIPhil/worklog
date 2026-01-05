import { describe, expect, test } from "bun:test";
import { buildServiceUnit, buildTimerUnit } from "./systemd.ts";

describe("systemd unit generation", () => {
	test("buildServiceUnit includes ExecStart and EnvironmentFile", () => {
		const unit = buildServiceUnit("daily", '"/home/user/.local/bin/worklog"');
		expect(unit.name).toBe("worklog-daily.service");
		expect(unit.content).toContain("EnvironmentFile=%h/.config/worklog/worklog.env");
		expect(unit.content).toContain(
			'ExecStart="/home/user/.local/bin/worklog" schedule run --period daily',
		);
	});

	test("buildTimerUnit includes correct OnCalendar", () => {
		expect(buildTimerUnit("daily").content).toContain("OnCalendar=*-*-* 00:05:00");
		expect(buildTimerUnit("weekly").content).toContain("OnCalendar=Mon *-*-* 00:05:00");
		expect(buildTimerUnit("monthly").content).toContain("OnCalendar=*-*-01 00:05:00");
		const quarterly = buildTimerUnit("quarterly").content;
		expect(quarterly).toContain("OnCalendar=*-01-01 00:05:00");
		expect(quarterly).toContain("OnCalendar=*-04-01 00:05:00");
		expect(quarterly).toContain("OnCalendar=*-07-01 00:05:00");
		expect(quarterly).toContain("OnCalendar=*-10-01 00:05:00");
	});
});
