import type { DashboardTheme } from "./types.ts";

export const infraredTheme: DashboardTheme = {
	id: "infrared",
	name: "INFRARED",
	description: "Tactical night vision heat-map",
	colors: {
		bgPrimary: "#000000",
		bgSecondary: "#1A0000",
		bgTertiary: "#220000",
		bgElevated: "#150000",
		borderPrimary: "#EF444440",
		borderSecondary: "#7F1D1D40",
		textPrimary: "#F87171",
		textSecondary: "#EF4444",
		textMuted: "#991B1B",
		accentBlue: "#F87171",
		accentGreen: "#EF4444",
		accentCyan: "#DC2626",
		accentAmber: "#B91C1C",
		accentOrange: "#991B1B",
		accentPurple: "#7F1D1D",
		accentPink: "#FCA5A5",
		accentRed: "#FEE2E2",
		chartColors: [
			"#F87171",
			"#EF4444",
			"#DC2626",
			"#B91C1C",
			"#991B1B",
			"#7F1D1D",
			"#FCA5A5",
			"#FEE2E2",
		],
	},
	fonts: {
		primary: "'Share Tech Mono', 'Roboto Mono', monospace",
		mono: "'Share Tech Mono', 'Roboto Mono', monospace",
	},
	customCSS: `
        body {
            background: linear-gradient(180deg, #000000 0%, #1A0000 100%);
        }

        .header-bar {
            background: rgba(239, 68, 68, 0.05);
            border-bottom: 1px solid #EF444440;
        }

        .logo-icon {
            background: #EF4444;
            color: #000000;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
            animation: heatPulse 2s ease-in-out infinite;
        }

        .metric-card {
            background: linear-gradient(180deg, #1A0000 0%, #220000 100%);
            border: 1px solid #EF444440;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
            letter-spacing: -0.02em;
        }

        .metric-card:hover {
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);
            transform: translateY(-2px);
            transition: all 0.3s ease;
            border-color: #EF444460;
        }

        .metric-value {
            text-shadow: 0 0 4px currentColor;
            letter-spacing: -0.05em;
        }

        .metric-label {
            text-shadow: 0 0 3px currentColor;
            letter-spacing: -0.02em;
        }

        .panel {
            background: linear-gradient(180deg, #1A0000 0%, #220000 100%);
            border: 1px solid #EF444440;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.1);
        }

        .panel-header {
            background: rgba(239, 68, 68, 0.05);
            border-bottom: 1px solid #7F1D1D40;
        }

        .panel-title {
            text-shadow: 0 0 3px currentColor;
            letter-spacing: -0.02em;
        }

        .panel-title::before {
            content: '▶';
            color: #EF4444;
            text-shadow: 0 0 4px #EF4444;
        }

        .status-dot {
            box-shadow: 0 0 4px currentColor;
            animation: heatPulse 2s ease-in-out infinite;
        }

        .filter-chip {
            border: 1px solid #EF444440;
            border-radius: 2px;
            background: rgba(239, 68, 68, 0.05);
            letter-spacing: -0.02em;
        }

        .filter-chip:hover {
            border-color: #EF4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
            background: rgba(239, 68, 68, 0.1);
        }

        .filter-chip.active {
            background: rgba(239, 68, 68, 0.15);
            border-color: #EF4444;
            color: #F87171;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
        }

        .source-bar {
            box-shadow: 0 0 4px currentColor;
        }

        .activity-item:hover {
            background: rgba(239, 68, 68, 0.05);
        }

        .footer-text {
            text-shadow: 0 0 3px #EF4444;
        }

        ::selection {
            background: #EF4444;
            color: #000;
        }

        /* Tactical scanline effect */
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
                rgba(239, 68, 68, 0.03) 2px,
                rgba(239, 68, 68, 0.03) 4px
            );
            pointer-events: none;
            z-index: 9999;
        }
    `,
	animations: `
        @keyframes heatPulse {
            0%, 100% { 
                box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
                text-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
            }
            50% { 
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.5);
                text-shadow: 0 0 6px rgba(239, 68, 68, 0.7);
            }
        }
    `,
};
