import type { DashboardTheme } from "./types.ts";

export const blueprintTheme: DashboardTheme = {
	id: "blueprint",
	name: "Blueprint",
	description: "Technical drawing precision",
	colors: {
		bgPrimary: "#1E3A5F",
		bgSecondary: "#152238",
		bgTertiary: "#2A4A6F",
		bgElevated: "#1A2F4A",
		borderPrimary: "#7DD3FC80",
		borderSecondary: "#3B6EA560",
		textPrimary: "#F8FAFC",
		textSecondary: "#7DD3FC",
		textMuted: "#3B6EA5",
		accentBlue: "#7DD3FC",
		accentGreen: "#34D399",
		accentCyan: "#22D3EE",
		accentAmber: "#FDE68A",
		accentOrange: "#FDBA74",
		accentPurple: "#C4B5FD",
		accentPink: "#F9A8D4",
		accentRed: "#FCA5A5",
		chartColors: [
			"#7DD3FC",
			"#34D399",
			"#FDE68A",
			"#22D3EE",
			"#FDBA74",
			"#C4B5FD",
			"#F9A8D4",
			"#FCA5A5",
		],
	},
	fonts: {
		primary: "'IBM Plex Sans', sans-serif",
		mono: "'IBM Plex Mono', monospace",
	},
	customCSS: `
        body {
            background: linear-gradient(180deg, #1E3A5F 0%, #152238 100%);
        }

        .header-bar {
            background: rgba(125, 211, 252, 0.05);
            border-bottom: 2px dashed #7DD3FC80;
        }

        .logo-icon {
            background: #7DD3FC;
            color: #1E3A5F;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(125, 211, 252, 0.4);
            animation: blueprintScan 3s ease-in-out infinite;
        }

        .metric-card {
            background: #152238;
            border: 2px dashed #7DD3FC80;
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(125, 211, 252, 0.2);
            position: relative;
            z-index: 1;
        }

        .metric-card:hover {
            box-shadow: 0 0 15px rgba(125, 211, 252, 0.3);
            transform: translateY(-1px);
            transition: all 0.3s ease;
            border-color: #7DD3FCA0;
        }

        .metric-value {
            text-shadow: 0 0 4px rgba(125, 211, 252, 0.3);
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .metric-label {
            text-shadow: 0 0 2px rgba(125, 211, 252, 0.2);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .panel {
            background: #152238;
            border: 2px dashed #7DD3FC80;
            border-radius: 2px;
            box-shadow: 0 0 10px rgba(125, 211, 252, 0.15);
            position: relative;
            z-index: 1;
        }

        .panel-header {
            background: #152238;
            border-bottom: 2px dashed #3B6EA560;
            border-radius: 2px 2px 0 0;
        }

        .panel-title {
            text-shadow: 0 0 4px rgba(125, 211, 252, 0.3);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 600;
        }

        .panel-title::before {
            content: '┼';
            margin-right: 0.5em;
            color: #7DD3FC;
            text-shadow: 0 0 6px rgba(125, 211, 252, 0.5);
        }

        .status-dot {
            box-shadow: 0 0 6px currentColor;
            animation: blueprintScan 3s ease-in-out infinite;
            border-radius: 1px;
        }

        .filter-chip {
            border: 2px dashed #7DD3FC80;
            border-radius: 2px;
            background: rgba(125, 211, 252, 0.05);
            letter-spacing: 0.05em;
        }

        .filter-chip:hover {
            border-color: #7DD3FC;
            box-shadow: 0 0 10px rgba(125, 211, 252, 0.3);
            background: rgba(125, 211, 252, 0.1);
        }

        .filter-chip.active {
            background: rgba(125, 211, 252, 0.15);
            border-color: #7DD3FC;
            color: #7DD3FC;
            box-shadow: 0 0 12px rgba(125, 211, 252, 0.4);
        }

        .source-bar {
            box-shadow: 0 0 6px currentColor;
            border-radius: 2px;
        }

        .activity-item:hover {
            background: rgba(125, 211, 252, 0.05);
            border-radius: 2px;
        }

        .footer-text {
            text-shadow: 0 0 4px rgba(125, 211, 252, 0.3);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        ::selection {
            background: #7DD3FC;
            color: #1E3A5F;
        }

        /* Fine blueprint grid overlay */
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
                    rgba(125, 211, 252, 0.15) 19px,
                    rgba(125, 211, 252, 0.15) 20px
                ),
                repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 19px,
                    rgba(125, 211, 252, 0.15) 19px,
                    rgba(125, 211, 252, 0.15) 20px
                );
            pointer-events: none;
            z-index: 0;
        }
    `,
	animations: `
        @keyframes blueprintScan {
            0%, 100% { 
                box-shadow: 0 0 8px rgba(125, 211, 252, 0.4);
                transform: translateX(0);
            }
            50% { 
                box-shadow: 0 0 12px rgba(125, 211, 252, 0.6);
                transform: translateX(1px);
            }
        }
    `,
};
