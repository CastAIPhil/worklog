import { describe, expect, test } from "bun:test";
import { buildBackfillPlan } from "./backfill.ts";

describe("buildBackfillPlan", () => {
	test("default builds 4w daily+weekly and 1m monthly", () => {
		const now = new Date(2026, 0, 4, 12, 0, 0);
		const plan = buildBackfillPlan({
			now,
			weeks: 4,
			months: 1,
			daily: true,
			weekly: true,
			monthly: true,
			quarterly: false,
		});

		const daily = plan.filter((p) => p.period === "daily");
		const weekly = plan.filter((p) => p.period === "weekly");
		const monthly = plan.filter((p) => p.period === "monthly");

		expect(daily).toHaveLength(28);
		expect(weekly).toHaveLength(4);
		expect(monthly).toHaveLength(1);

		expect(daily[0]?.expectedKey).toBe("2025-12-07");
		expect(daily[27]?.expectedKey).toBe("2026-01-03");

		expect(weekly.map((w) => w.expectedKey)).toEqual([
			"2025-12-01",
			"2025-12-08",
			"2025-12-15",
			"2025-12-22",
		]);

		expect(monthly[0]?.expectedKey).toBe("2025-12");
	});

	test("range mode only includes completed weekly/monthly periods", () => {
		const now = new Date(2026, 0, 4, 12, 0, 0);
		const since = new Date("2025-12-29T00:00:00Z");
		const until = new Date("2026-01-03T00:00:00Z");

		const plan = buildBackfillPlan({
			now,
			weeks: 4,
			months: 1,
			daily: true,
			weekly: true,
			monthly: true,
			quarterly: false,
			since,
			until,
		});

		const daily = plan.filter((p) => p.period === "daily");
		const weekly = plan.filter((p) => p.period === "weekly");
		const monthly = plan.filter((p) => p.period === "monthly");

		expect(daily).toHaveLength(6);
		expect(daily.map((d) => d.expectedKey)).toEqual([
			"2025-12-29",
			"2025-12-30",
			"2025-12-31",
			"2026-01-01",
			"2026-01-02",
			"2026-01-03",
		]);

		expect(weekly).toHaveLength(0);
		expect(monthly.map((m) => m.expectedKey)).toEqual(["2025-12"]);
	});
});
