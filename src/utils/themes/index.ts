export { blueprintTheme } from "./blueprint.ts";
export { chaosTheme } from "./chaos.ts";
export { defaultTheme } from "./default.ts";
export { forestTheme } from "./forest.ts";
export { infraredTheme } from "./infrared.ts";
export { midnightBloomTheme } from "./midnight-bloom.ts";
export { papercutTheme } from "./papercut.ts";
export { terminalAmberTheme } from "./terminal-amber.ts";
export type { DashboardTheme, ThemeColors } from "./types.ts";

import { blueprintTheme } from "./blueprint.ts";
import { chaosTheme } from "./chaos.ts";
import { defaultTheme } from "./default.ts";
import { forestTheme } from "./forest.ts";
import { infraredTheme } from "./infrared.ts";
import { midnightBloomTheme } from "./midnight-bloom.ts";
import { papercutTheme } from "./papercut.ts";
import { terminalAmberTheme } from "./terminal-amber.ts";
import type { DashboardTheme } from "./types.ts";

export const THEMES: Record<string, DashboardTheme> = {
	default: defaultTheme,
	chaos: chaosTheme,
	"terminal-amber": terminalAmberTheme,
	infrared: infraredTheme,
	forest: forestTheme,
	"midnight-bloom": midnightBloomTheme,
	blueprint: blueprintTheme,
	papercut: papercutTheme,
};

export function getTheme(themeId: string): DashboardTheme {
	return THEMES[themeId] ?? defaultTheme;
}

export function getAvailableThemes(): string[] {
	return Object.keys(THEMES);
}

export function generateThemeCSS(theme: DashboardTheme): string {
	const { colors, fonts } = theme;
	return `
        :root {
            --bg-primary: ${colors.bgPrimary};
            --bg-secondary: ${colors.bgSecondary};
            --bg-tertiary: ${colors.bgTertiary};
            --bg-elevated: ${colors.bgElevated};
            --border-primary: ${colors.borderPrimary};
            --border-secondary: ${colors.borderSecondary};
            --text-primary: ${colors.textPrimary};
            --text-secondary: ${colors.textSecondary};
            --text-muted: ${colors.textMuted};
            --accent-blue: ${colors.accentBlue};
            --accent-green: ${colors.accentGreen};
            --accent-cyan: ${colors.accentCyan};
            --accent-amber: ${colors.accentAmber};
            --accent-orange: ${colors.accentOrange};
            --accent-purple: ${colors.accentPurple};
            --accent-pink: ${colors.accentPink};
            --accent-red: ${colors.accentRed};
            --chart-1: ${colors.chartColors[0]};
            --chart-2: ${colors.chartColors[1]};
            --chart-3: ${colors.chartColors[2]};
            --chart-4: ${colors.chartColors[3]};
            --chart-5: ${colors.chartColors[4]};
            --chart-6: ${colors.chartColors[5]};
            --chart-7: ${colors.chartColors[6]};
            --chart-8: ${colors.chartColors[7]};
            --font-primary: ${fonts.primary};
            --font-mono: ${fonts.mono};
        }
    `;
}
