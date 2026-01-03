import type { DashboardTheme } from "./types.ts";

export const papercutTheme: DashboardTheme = {
	id: "papercut",
	name: "PAPERCUT",
	description: "Brutalist light mode - raw and unapologetic",
	colors: {
		bgPrimary: "#FFFFFF",
		bgSecondary: "#F5F5F5",
		bgTertiary: "#E5E5E5",
		bgElevated: "#FAFAFA",
		borderPrimary: "#000000",
		borderSecondary: "#333333",
		textPrimary: "#000000",
		textSecondary: "#333333",
		textMuted: "#666666",
		accentBlue: "#666666",
		accentGreen: "#666666",
		accentCyan: "#666666",
		accentAmber: "#666666",
		accentOrange: "#666666",
		accentPurple: "#666666",
		accentPink: "#E53935",
		accentRed: "#E53935",
		chartColors: [
			"#E53935",
			"#000000",
			"#666666",
			"#999999",
			"#CCCCCC",
			"#333333",
			"#E53935",
			"#444444",
		],
	},
	fonts: {
		primary: "'Archivo Black', 'Arial Black', sans-serif",
		mono: "'SF Mono', 'Consolas', monospace",
	},
	customCSS: `
        body {
            background: #FFFFFF;
        }

        .header-bar {
            background: #FFFFFF;
            border-bottom: 2px solid #000000;
        }

        .logo-icon {
            background: #E53935;
            color: #FFFFFF;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
        }

        .metric-card {
            background: #F5F5F5;
            border: 2px solid #000000;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
        }

        .metric-card:hover {
            box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.3);
            transform: translate(-2px, -2px);
            transition: all 0.1s ease;
        }

        .metric-value {
            color: #000000;
            letter-spacing: -0.05em;
            text-transform: uppercase;
        }

        .metric-label {
            color: #333333;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .panel {
            background: #F5F5F5;
            border: 2px solid #000000;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
        }

        .panel-header {
            background: #E5E5E5;
            border-bottom: 2px solid #000000;
            border-radius: 0;
        }

        .panel-title {
            color: #000000;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 900;
        }

        .panel-title::before {
            content: '■';
            margin-right: 0.5em;
            color: #E53935;
        }

        .status-dot {
            border-radius: 0;
        }

        .filter-chip {
            border: 2px solid #000000;
            border-radius: 0;
            background: #FFFFFF;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .filter-chip:hover {
            border-color: #E53935;
            box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
            background: #FAFAFA;
        }

        .filter-chip.active {
            background: #E53935;
            border-color: #000000;
            color: #FFFFFF;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
        }

        .source-bar {
            box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
            border-radius: 0;
        }

        .activity-item:hover {
            background: #F5F5F5;
            border-radius: 0;
            border-left: 4px solid #E53935;
        }

        .footer-text {
            color: #333333;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        ::selection {
            background: #E53935;
            color: #FFFFFF;
        }

        /* Exposed grid structure */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 19px,
                    rgba(0, 0, 0, 0.15) 19px,
                    rgba(0, 0, 0, 0.15) 20px
                ),
                repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 19px,
                    rgba(0, 0, 0, 0.15) 19px,
                    rgba(0, 0, 0, 0.15) 20px
                );
            pointer-events: none;
            z-index: 0;
        }
    `,
};
