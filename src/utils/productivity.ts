import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { WorkItem, WorkSummary } from "../types.ts";

export interface HourlyActivity {
	hour: number;
	count: number;
	percentage: number;
}

export interface PeakHoursAnalysis {
	/** Top 3 most active hours */
	peakHours: HourlyActivity[];
	/** Distribution across all 24 hours */
	hourlyDistribution: HourlyActivity[];
	/** Morning (6-12), Afternoon (12-18), Evening (18-24), Night (0-6) */
	timeOfDayBreakdown: {
		morning: number;
		afternoon: number;
		evening: number;
		night: number;
	};
}

export interface FocusSession {
	start: Date;
	end: Date;
	durationMinutes: number;
	itemCount: number;
	sources: string[];
}

export interface FocusTimeAnalysis {
	/** Sessions with sustained activity (>30 min) */
	focusSessions: FocusSession[];
	/** Total focused time in minutes */
	totalFocusMinutes: number;
	/** Average session duration */
	averageSessionMinutes: number;
	/** Longest session */
	longestSession: FocusSession | null;
	/** Number of context switches (source changes) */
	contextSwitches: number;
}

export interface DayOfWeekActivity {
	day: string;
	dayIndex: number;
	count: number;
	percentage: number;
}

export interface DayPatternAnalysis {
	/** Activity by day of week */
	dayOfWeekDistribution: DayOfWeekActivity[];
	/** Most productive day */
	mostActiveDay: DayOfWeekActivity | null;
	/** Least productive day (with activity) */
	leastActiveDay: DayOfWeekActivity | null;
	/** Weekend vs weekday ratio */
	weekendVsWeekdayRatio: number | null;
}

export interface SourcePatternAnalysis {
	/** Activity count by source */
	sourceDistribution: { source: string; count: number; percentage: number }[];
	/** Primary work source */
	primarySource: string | null;
	/** Sources used together in same sessions */
	commonPairings: { sources: [string, string]; count: number }[];
}

export interface ProductivityPatterns {
	peakHours: PeakHoursAnalysis;
	focusTime: FocusTimeAnalysis;
	dayPatterns: DayPatternAnalysis;
	sourcePatterns: SourcePatternAnalysis;
	summary: ProductivitySummary;
}

export interface ProductivitySummary {
	totalItems: number;
	totalActiveDays: number;
	averageItemsPerDay: number;
	mostProductiveHour: string;
	mostProductiveDay: string;
	totalFocusHours: number;
	primaryWorkSource: string;
}

const FOCUS_GAP_THRESHOLD_MINUTES = 30;
const MIN_FOCUS_SESSION_MINUTES = 30;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function analyzeHourlyActivity(items: WorkItem[], timeZone?: string): PeakHoursAnalysis {
	const hourCounts = Array.from({ length: 24 }, () => 0);

	for (const item of items) {
		const zoned = timeZone ? toZonedTime(item.timestamp, timeZone) : item.timestamp;
		const hour = zoned.getHours();
		const current = hourCounts[hour];
		if (current !== undefined) {
			hourCounts[hour] = current + 1;
		}
	}

	const total = items.length;
	const hourlyDistribution: HourlyActivity[] = hourCounts.map((count, hour) => ({
		hour,
		count,
		percentage: total > 0 ? (count / total) * 100 : 0,
	}));

	const peakHours = [...hourlyDistribution].sort((a, b) => b.count - a.count).slice(0, 3);

	const timeOfDayBreakdown = {
		morning: hourCounts.slice(6, 12).reduce((a, b) => a + b, 0),
		afternoon: hourCounts.slice(12, 18).reduce((a, b) => a + b, 0),
		evening: hourCounts.slice(18, 24).reduce((a, b) => a + b, 0),
		night: hourCounts.slice(0, 6).reduce((a, b) => a + b, 0),
	};

	return {
		peakHours,
		hourlyDistribution,
		timeOfDayBreakdown,
	};
}

function analyzeFocusSessions(items: WorkItem[]): FocusTimeAnalysis {
	if (items.length === 0) {
		return {
			focusSessions: [],
			totalFocusMinutes: 0,
			averageSessionMinutes: 0,
			longestSession: null,
			contextSwitches: 0,
		};
	}

	const sortedItems = [...items].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

	const focusSessions: FocusSession[] = [];
	const firstItem = sortedItems[0];
	if (!firstItem) {
		return {
			focusSessions: [],
			totalFocusMinutes: 0,
			averageSessionMinutes: 0,
			longestSession: null,
			contextSwitches: 0,
		};
	}

	let sessionStart = firstItem.timestamp;
	let sessionEnd = firstItem.timestamp;
	let sessionItems = 1;
	const sessionSources = new Set<string>([firstItem.source]);

	let contextSwitches = 0;
	let previousSource = firstItem.source;

	for (let i = 1; i < sortedItems.length; i++) {
		const current = sortedItems[i];
		if (!current) continue;

		const gapMinutes = (current.timestamp.getTime() - sessionEnd.getTime()) / (1000 * 60);

		if (current.source !== previousSource) {
			contextSwitches++;
			previousSource = current.source;
		}

		if (gapMinutes > FOCUS_GAP_THRESHOLD_MINUTES) {
			const durationMinutes = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);

			if (durationMinutes >= MIN_FOCUS_SESSION_MINUTES) {
				focusSessions.push({
					start: sessionStart,
					end: sessionEnd,
					durationMinutes,
					itemCount: sessionItems,
					sources: [...sessionSources],
				});
			}

			sessionStart = current.timestamp;
			sessionItems = 1;
			sessionSources.clear();
			sessionSources.add(current.source);
		} else {
			sessionItems++;
			sessionSources.add(current.source);
		}
		sessionEnd = current.timestamp;
	}

	const finalDuration = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 60);
	if (finalDuration >= MIN_FOCUS_SESSION_MINUTES) {
		focusSessions.push({
			start: sessionStart,
			end: sessionEnd,
			durationMinutes: finalDuration,
			itemCount: sessionItems,
			sources: [...sessionSources],
		});
	}

	const totalFocusMinutes = focusSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
	const averageSessionMinutes =
		focusSessions.length > 0 ? totalFocusMinutes / focusSessions.length : 0;
	const longestSession =
		focusSessions.length > 0
			? focusSessions.reduce((max, s) => (s.durationMinutes > max.durationMinutes ? s : max))
			: null;

	return {
		focusSessions,
		totalFocusMinutes,
		averageSessionMinutes,
		longestSession,
		contextSwitches,
	};
}

function analyzeDayPatterns(items: WorkItem[], timeZone?: string): DayPatternAnalysis {
	const dayCounts = Array.from({ length: 7 }, () => 0);

	for (const item of items) {
		const zoned = timeZone ? toZonedTime(item.timestamp, timeZone) : item.timestamp;
		const dayIndex = zoned.getDay();
		const current = dayCounts[dayIndex];
		if (current !== undefined) {
			dayCounts[dayIndex] = current + 1;
		}
	}

	const total = items.length;
	const dayOfWeekDistribution: DayOfWeekActivity[] = dayCounts.map((count, dayIndex) => ({
		day: DAY_NAMES[dayIndex] ?? "Unknown",
		dayIndex,
		count,
		percentage: total > 0 ? (count / total) * 100 : 0,
	}));

	const activeDaysWithData = dayOfWeekDistribution.filter((d) => d.count > 0);
	const mostActiveDay =
		activeDaysWithData.length > 0
			? activeDaysWithData.reduce((max, d) => (d.count > max.count ? d : max))
			: null;
	const leastActiveDay =
		activeDaysWithData.length > 0
			? activeDaysWithData.reduce((min, d) => (d.count < min.count ? d : min))
			: null;

	const weekdayCount = dayCounts.slice(1, 6).reduce((a, b) => a + b, 0);
	const sunday = dayCounts[0] ?? 0;
	const saturday = dayCounts[6] ?? 0;
	const weekendCount = sunday + saturday;
	const weekendVsWeekdayRatio = weekdayCount > 0 ? weekendCount / weekdayCount : null;

	return {
		dayOfWeekDistribution,
		mostActiveDay,
		leastActiveDay,
		weekendVsWeekdayRatio,
	};
}

function analyzeSourcePatterns(items: WorkItem[], timeZone?: string): SourcePatternAnalysis {
	const sourceCounts = new Map<string, number>();
	const hourlySourceMap = new Map<string, Set<string>>();

	for (const item of items) {
		sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);

		const zoned = timeZone ? toZonedTime(item.timestamp, timeZone) : item.timestamp;
		const hourKey = format(zoned, "yyyy-MM-dd-HH");
		if (!hourlySourceMap.has(hourKey)) {
			hourlySourceMap.set(hourKey, new Set());
		}
		hourlySourceMap.get(hourKey)?.add(item.source);
	}

	const total = items.length;
	const sourceDistribution = [...sourceCounts.entries()]
		.map(([source, count]) => ({
			source,
			count,
			percentage: total > 0 ? (count / total) * 100 : 0,
		}))
		.sort((a, b) => b.count - a.count);

	const firstSource = sourceDistribution[0];
	const primarySource = firstSource ? firstSource.source : null;

	const pairingCounts = new Map<string, number>();
	for (const sources of hourlySourceMap.values()) {
		const sourceList = [...sources].sort();
		for (let i = 0; i < sourceList.length; i++) {
			for (let j = i + 1; j < sourceList.length; j++) {
				const key = `${sourceList[i]}|${sourceList[j]}`;
				pairingCounts.set(key, (pairingCounts.get(key) ?? 0) + 1);
			}
		}
	}

	const commonPairings = [...pairingCounts.entries()]
		.map(([key, count]) => {
			const [a, b] = key.split("|") as [string, string];
			return { sources: [a, b] as [string, string], count };
		})
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	return {
		sourceDistribution,
		primarySource,
		commonPairings,
	};
}

export function analyzeProductivity(
	summary: WorkSummary,
	options: { timeZone?: string } = {},
): ProductivityPatterns {
	const { items } = summary;
	const { timeZone } = options;

	const peakHours = analyzeHourlyActivity(items, timeZone);
	const focusTime = analyzeFocusSessions(items);
	const dayPatterns = analyzeDayPatterns(items, timeZone);
	const sourcePatterns = analyzeSourcePatterns(items, timeZone);

	const activeDays = new Set(
		items.map((item) => {
			const zoned = timeZone ? toZonedTime(item.timestamp, timeZone) : item.timestamp;
			return format(zoned, "yyyy-MM-dd");
		}),
	);
	const totalActiveDays = activeDays.size;
	const averageItemsPerDay = totalActiveDays > 0 ? items.length / totalActiveDays : 0;

	const topPeakHour = peakHours.peakHours[0];
	const mostProductiveHour = topPeakHour ? `${topPeakHour.hour}:00` : "N/A";
	const mostProductiveDay = dayPatterns.mostActiveDay?.day ?? "N/A";

	const productivitySummary: ProductivitySummary = {
		totalItems: items.length,
		totalActiveDays,
		averageItemsPerDay,
		mostProductiveHour,
		mostProductiveDay,
		totalFocusHours: Math.round((focusTime.totalFocusMinutes / 60) * 10) / 10,
		primaryWorkSource: sourcePatterns.primarySource ?? "N/A",
	};

	return {
		peakHours,
		focusTime,
		dayPatterns,
		sourcePatterns,
		summary: productivitySummary,
	};
}

function formatHour(hour: number): string {
	const ampm = hour >= 12 ? "PM" : "AM";
	const h = hour % 12 || 12;
	return `${h}${ampm}`;
}

function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${Math.round(minutes)}m`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = Math.round(minutes % 60);
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatProductivityMarkdown(patterns: ProductivityPatterns): string {
	const lines: string[] = [];
	const { peakHours, focusTime, dayPatterns, sourcePatterns, summary } = patterns;

	lines.push("## Productivity Patterns");
	lines.push("");

	lines.push("### Summary");
	lines.push(`- **Total Activities:** ${summary.totalItems}`);
	lines.push(`- **Active Days:** ${summary.totalActiveDays}`);
	lines.push(`- **Avg Activities/Day:** ${summary.averageItemsPerDay.toFixed(1)}`);
	lines.push(`- **Total Focus Time:** ${summary.totalFocusHours}h`);
	lines.push(`- **Peak Hour:** ${summary.mostProductiveHour}`);
	lines.push(`- **Most Active Day:** ${summary.mostProductiveDay}`);
	lines.push(`- **Primary Source:** ${summary.primaryWorkSource}`);
	lines.push("");

	lines.push("### Peak Hours");
	if (peakHours.peakHours.length > 0) {
		for (const hour of peakHours.peakHours) {
			lines.push(
				`- ${formatHour(hour.hour)}: ${hour.count} activities (${hour.percentage.toFixed(1)}%)`,
			);
		}
	} else {
		lines.push("No activity data available.");
	}
	lines.push("");

	lines.push("### Time of Day");
	const { timeOfDayBreakdown } = peakHours;
	const todTotal =
		timeOfDayBreakdown.morning +
		timeOfDayBreakdown.afternoon +
		timeOfDayBreakdown.evening +
		timeOfDayBreakdown.night;
	if (todTotal > 0) {
		lines.push(
			`- Morning (6AM-12PM): ${timeOfDayBreakdown.morning} (${((timeOfDayBreakdown.morning / todTotal) * 100).toFixed(0)}%)`,
		);
		lines.push(
			`- Afternoon (12PM-6PM): ${timeOfDayBreakdown.afternoon} (${((timeOfDayBreakdown.afternoon / todTotal) * 100).toFixed(0)}%)`,
		);
		lines.push(
			`- Evening (6PM-12AM): ${timeOfDayBreakdown.evening} (${((timeOfDayBreakdown.evening / todTotal) * 100).toFixed(0)}%)`,
		);
		lines.push(
			`- Night (12AM-6AM): ${timeOfDayBreakdown.night} (${((timeOfDayBreakdown.night / todTotal) * 100).toFixed(0)}%)`,
		);
	}
	lines.push("");

	lines.push("### Focus Sessions");
	if (focusTime.focusSessions.length > 0) {
		lines.push(`- **Sessions (>30min):** ${focusTime.focusSessions.length}`);
		lines.push(`- **Total Focus Time:** ${formatDuration(focusTime.totalFocusMinutes)}`);
		lines.push(`- **Avg Session:** ${formatDuration(focusTime.averageSessionMinutes)}`);
		if (focusTime.longestSession) {
			lines.push(
				`- **Longest Session:** ${formatDuration(focusTime.longestSession.durationMinutes)}`,
			);
		}
		lines.push(`- **Context Switches:** ${focusTime.contextSwitches}`);
	} else {
		lines.push("No sustained focus sessions detected.");
	}
	lines.push("");

	lines.push("### Day of Week");
	const activeWeekdays = dayPatterns.dayOfWeekDistribution.filter((d) => d.count > 0);
	if (activeWeekdays.length > 0) {
		for (const day of dayPatterns.dayOfWeekDistribution) {
			if (day.count > 0) {
				lines.push(`- ${day.day}: ${day.count} (${day.percentage.toFixed(1)}%)`);
			}
		}
		if (dayPatterns.weekendVsWeekdayRatio !== null) {
			const ratio = dayPatterns.weekendVsWeekdayRatio;
			const description = ratio > 0.3 ? "high" : ratio > 0.1 ? "moderate" : "low";
			lines.push(`- Weekend activity: ${description} (${(ratio * 100).toFixed(0)}% of weekday)`);
		}
	}
	lines.push("");

	lines.push("### Source Distribution");
	for (const source of sourcePatterns.sourceDistribution.slice(0, 5)) {
		lines.push(`- ${source.source}: ${source.count} (${source.percentage.toFixed(1)}%)`);
	}
	if (sourcePatterns.commonPairings.length > 0) {
		lines.push("");
		lines.push("**Common Pairings:**");
		for (const pair of sourcePatterns.commonPairings.slice(0, 3)) {
			lines.push(`- ${pair.sources[0]} + ${pair.sources[1]}: ${pair.count} hours`);
		}
	}

	return lines.join("\n");
}

export function formatProductivityJson(patterns: ProductivityPatterns): string {
	return JSON.stringify(patterns, null, 2);
}

export function formatProductivityPlain(patterns: ProductivityPatterns): string {
	const lines: string[] = [];
	const { summary, peakHours, focusTime, dayPatterns, sourcePatterns } = patterns;

	lines.push("PRODUCTIVITY PATTERNS");
	lines.push("=====================");
	lines.push("");
	lines.push(`Total Activities: ${summary.totalItems}`);
	lines.push(`Active Days: ${summary.totalActiveDays}`);
	lines.push(`Avg Activities/Day: ${summary.averageItemsPerDay.toFixed(1)}`);
	lines.push(`Total Focus Time: ${summary.totalFocusHours}h`);
	lines.push(`Peak Hour: ${summary.mostProductiveHour}`);
	lines.push(`Most Active Day: ${summary.mostProductiveDay}`);
	lines.push(`Primary Source: ${summary.primaryWorkSource}`);
	lines.push("");

	lines.push("PEAK HOURS");
	lines.push("----------");
	for (const hour of peakHours.peakHours) {
		lines.push(`${formatHour(hour.hour)}: ${hour.count} activities`);
	}
	lines.push("");

	lines.push("FOCUS SESSIONS");
	lines.push("--------------");
	lines.push(`Sessions: ${focusTime.focusSessions.length}`);
	lines.push(`Total: ${formatDuration(focusTime.totalFocusMinutes)}`);
	lines.push(`Context Switches: ${focusTime.contextSwitches}`);
	lines.push("");

	lines.push("DAY PATTERNS");
	lines.push("------------");
	for (const day of dayPatterns.dayOfWeekDistribution.filter((d) => d.count > 0)) {
		lines.push(`${day.day}: ${day.count}`);
	}
	lines.push("");

	lines.push("SOURCES");
	lines.push("-------");
	for (const source of sourcePatterns.sourceDistribution.slice(0, 5)) {
		lines.push(`${source.source}: ${source.count}`);
	}

	return lines.join("\n");
}
