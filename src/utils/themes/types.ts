/**
 * Dashboard Theme System - Type Definitions
 *
 * Extensible theme architecture for the worklog dashboard.
 */

export interface ThemeColors {
	bgPrimary: string;
	bgSecondary: string;
	bgTertiary: string;
	bgElevated: string;
	borderPrimary: string;
	borderSecondary: string;
	textPrimary: string;
	textSecondary: string;
	textMuted: string;
	accentBlue: string;
	accentGreen: string;
	accentCyan: string;
	accentAmber: string;
	accentOrange: string;
	accentPurple: string;
	accentPink: string;
	accentRed: string;
	chartColors: string[];
}

export interface DashboardTheme {
	id: string;
	name: string;
	description: string;
	colors: ThemeColors;
	fonts: {
		primary: string;
		mono: string;
	};
	/** Optional custom CSS to inject */
	customCSS?: string;
	/** Optional custom animations */
	animations?: string;
}
