import type { DashboardTheme } from "./types.ts";

export const terminalAmberTheme: DashboardTheme = {
	id: "terminal-amber",
	name: "Terminal Amber",
	description: "Vintage phosphor terminal aesthetic",
	colors: {
		bgPrimary: "#000000",
		bgSecondary: "#0A0A00",
		bgTertiary: "#121200",
		bgElevated: "#080800",
		borderPrimary: "#FFB00040",
		borderSecondary: "#FFB00020",
		textPrimary: "#FFB000",
		textSecondary: "#CC8800",
		textMuted: "#996600",
		accentBlue: "#FFB000",
		accentGreen: "#FFCC44",
		accentCyan: "#FF9900",
		accentAmber: "#CC8800",
		accentOrange: "#FFDD66",
		accentPurple: "#DD8800",
		accentPink: "#FFAA22",
		accentRed: "#BB7700",
		chartColors: [
			"#FFB000",
			"#FFCC44",
			"#FF9900",
			"#CC8800",
			"#FFDD66",
			"#DD8800",
			"#FFAA22",
			"#BB7700",
		],
	},
	fonts: {
		primary: "'IBM Plex Mono', 'Consolas', monospace",
		mono: "'IBM Plex Mono', 'Consolas', monospace",
	},
	customCSS: `
        body {
            background: #000000;
        }

        .header-bar {
            background: rgba(255, 176, 0, 0.05);
            border-bottom: 1px solid #FFB00040;
        }

        .logo-icon {
            background: #FFB000;
            color: #000000;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.5);
            animation: phosphorGlow 3s ease-in-out infinite;
        }

        .metric-card {
            background: #0A0A00;
            border: 1px solid #FFB00040;
            border-radius: 4px;
            box-shadow: 0 0 8px rgba(255, 176, 0, 0.1);
        }

        .metric-card:hover {
            box-shadow: 0 0 12px rgba(255, 176, 0, 0.2);
            transform: translateY(-1px);
            transition: all 0.3s ease;
        }

        .metric-value {
            text-shadow: 0 0 8px currentColor;
        }

        .metric-label {
            text-shadow: 0 0 4px currentColor;
        }

        .panel {
            background: #0A0A00;
            border: 1px solid #FFB00040;
            border-radius: 4px;
            box-shadow: 0 0 8px rgba(255, 176, 0, 0.05);
        }

        .panel-header {
            background: rgba(255, 176, 0, 0.05);
            border-bottom: 1px solid #FFB00020;
        }

        .panel-title {
            text-shadow: 0 0 4px currentColor;
        }

        .panel-title::before {
            content: '█';
            color: #FFB000;
            text-shadow: 0 0 8px #FFB000;
        }

        .status-dot {
            box-shadow: 0 0 6px currentColor;
        }

        .filter-chip {
            border: 1px solid #FFB00040;
            border-radius: 4px;
            background: rgba(255, 176, 0, 0.05);
        }

        .filter-chip:hover {
            border-color: #FFB000;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.2);
            background: rgba(255, 176, 0, 0.1);
        }

        .filter-chip.active {
            background: rgba(255, 176, 0, 0.15);
            border-color: #FFB000;
            color: #FFB000;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.3);
        }

        .source-bar {
            box-shadow: 0 0 6px currentColor;
        }

        .activity-item:hover {
            background: rgba(255, 176, 0, 0.05);
        }

        .footer-text {
            text-shadow: 0 0 4px #FFB000;
        }

        ::selection {
            background: #FFB000;
            color: #000;
        }

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
                rgba(255, 176, 0, 0.02) 2px,
                rgba(255, 176, 0, 0.02) 4px
            );
            pointer-events: none;
            z-index: 9999;
        }
    `,
	animations: `
        @keyframes phosphorGlow {
            0%, 100% { 
                box-shadow: 0 0 10px rgba(255, 176, 0, 0.5);
                text-shadow: 0 0 8px rgba(255, 176, 0, 0.8);
            }
            50% { 
                box-shadow: 0 0 15px rgba(255, 176, 0, 0.7);
                text-shadow: 0 0 12px rgba(255, 176, 0, 1);
            }
        }

        @keyframes textGlow {
            0%, 100% { text-shadow: 0 0 8px currentColor; }
            50% { text-shadow: 0 0 12px currentColor; }
        }
    `,
};
