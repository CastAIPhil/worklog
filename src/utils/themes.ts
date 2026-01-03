/**
 * Dashboard Theme System
 *
 * Extensible theme architecture for the worklog dashboard.
 * Add new themes by creating a DashboardTheme object and registering it in THEMES.
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

/**
 * Default theme - Clean command center aesthetic
 */
export const defaultTheme: DashboardTheme = {
	id: "default",
	name: "Command Center",
	description: "Clean, professional dark theme",
	colors: {
		bgPrimary: "#0d1117",
		bgSecondary: "#161b22",
		bgTertiary: "#21262d",
		bgElevated: "#1c2128",
		borderPrimary: "#30363d",
		borderSecondary: "#21262d",
		textPrimary: "#e6edf3",
		textSecondary: "#8b949e",
		textMuted: "#6e7681",
		accentBlue: "#58a6ff",
		accentGreen: "#3fb950",
		accentCyan: "#39d353",
		accentAmber: "#d29922",
		accentOrange: "#f0883e",
		accentPurple: "#a371f7",
		accentPink: "#db61a2",
		accentRed: "#f85149",
		chartColors: [
			"#58a6ff",
			"#3fb950",
			"#a371f7",
			"#f0883e",
			"#db61a2",
			"#39d353",
			"#d29922",
			"#f85149",
		],
	},
	fonts: {
		primary: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
		mono: "'JetBrains Mono', 'Consolas', monospace",
	},
};

/**
 * Chaos theme - Cyberpunk neon aesthetic with glitch effects
 */
export const chaosTheme: DashboardTheme = {
	id: "chaos",
	name: "CHAOS MODE",
	description: "Cyberpunk neon with glitch effects",
	colors: {
		bgPrimary: "#0a0a0f",
		bgSecondary: "#12121a",
		bgTertiary: "#1a1a25",
		bgElevated: "#15151f",
		borderPrimary: "#ff00ff40",
		borderSecondary: "#00ffff30",
		textPrimary: "#ffffff",
		textSecondary: "#00ffff",
		textMuted: "#ff00ff80",
		accentBlue: "#00ffff",
		accentGreen: "#00ff88",
		accentCyan: "#00ffff",
		accentAmber: "#ffff00",
		accentOrange: "#ff8800",
		accentPurple: "#ff00ff",
		accentPink: "#ff0088",
		accentRed: "#ff0044",
		chartColors: [
			"#00ffff",
			"#ff00ff",
			"#00ff88",
			"#ffff00",
			"#ff0088",
			"#00ffff",
			"#ff8800",
			"#ff0044",
		],
	},
	fonts: {
		primary: "'JetBrains Mono', 'Consolas', monospace",
		mono: "'JetBrains Mono', 'Consolas', monospace",
	},
	customCSS: `
        body {
            background: linear-gradient(135deg, #0a0a0f 0%, #1a0a1a 50%, #0a1a1a 100%);
        }

        .header-bar {
            background: linear-gradient(90deg, rgba(255,0,255,0.1), rgba(0,255,255,0.1));
            border-bottom: 2px solid;
            border-image: linear-gradient(90deg, #ff00ff, #00ffff) 1;
        }

        .logo-icon {
            background: linear-gradient(135deg, #ff00ff, #00ffff);
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.5);
            animation: logoGlow 2s ease-in-out infinite;
        }

        .metric-card {
            border: 1px solid transparent;
            background: linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                        linear-gradient(135deg, #ff00ff40, #00ffff40) border-box;
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.1), inset 0 0 20px rgba(0, 255, 255, 0.05);
        }

        .metric-card:hover {
            box-shadow: 0 0 30px rgba(255, 0, 255, 0.2), inset 0 0 30px rgba(0, 255, 255, 0.1);
            transform: translateY(-2px);
            transition: all 0.3s ease;
        }

        .metric-value {
            text-shadow: 0 0 10px currentColor;
        }

        .panel {
            border: 1px solid transparent;
            background: linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                        linear-gradient(135deg, #00ffff40, #ff00ff40) border-box;
        }

        .panel-header {
            background: linear-gradient(90deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1));
        }

        .panel-title::before {
            content: '>';
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff;
        }

        .status-dot {
            box-shadow: 0 0 10px currentColor;
        }

        .filter-chip {
            border: 1px solid #ff00ff40;
        }

        .filter-chip:hover {
            border-color: #00ffff;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }

        .filter-chip.active {
            background: rgba(0, 255, 255, 0.1);
            border-color: #00ffff;
            color: #00ffff;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }

        .source-bar {
            box-shadow: 0 0 10px currentColor;
        }

        .activity-item:hover {
            background: linear-gradient(90deg, rgba(255,0,255,0.1), transparent);
        }

        .footer-text {
            text-shadow: 0 0 5px #ff00ff;
        }

        ::selection {
            background: #ff00ff;
            color: #000;
        }

        /* Scanline effect */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 255, 0.03) 2px,
                rgba(0, 255, 255, 0.03) 4px
            );
            pointer-events: none;
            z-index: 9999;
        }
    `,
	animations: `
        @keyframes logoGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 255, 0.5); }
            50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.8); }
        }

        @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
        }

        @keyframes flicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
            52% { opacity: 1; }
            54% { opacity: 0.9; }
        }
    `,
};

/**
 * Registry of all available themes
 */
export const THEMES: Record<string, DashboardTheme> = {
	default: defaultTheme,
	chaos: chaosTheme,
};

/**
 * Get a theme by ID, falling back to default if not found
 */
export function getTheme(themeId: string): DashboardTheme {
	return THEMES[themeId] ?? defaultTheme;
}

/**
 * Get all available theme IDs
 */
export function getAvailableThemes(): string[] {
	return Object.keys(THEMES);
}

/**
 * Generate CSS variables from a theme
 */
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
