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
        [data-theme="papercut"] body {
            background: #FFFFFF;
        }

        [data-theme="papercut"] .header-bar {
            background: #FFFFFF;
            border-bottom: 4px solid #000000;
            border-top: 4px solid #000000;
        }

        [data-theme="papercut"] .logo-icon {
            background: #E53935;
            color: #FFFFFF;
            border-radius: 0;
            box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
        }

        [data-theme="papercut"] .metrics-grid {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            grid-template-rows: repeat(3, auto);
            gap: 24px;
            margin-bottom: 24px;
        }

        [data-theme="papercut"] .metric-card {
            background: #F5F5F5;
            border: 3px solid #000000;
            border-radius: 0;
            box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.4);
            position: relative;
            animation: brutalistDrop 0.3s ease-out backwards;
        }

        [data-theme="papercut"] .metric-card:nth-child(1) {
            grid-column: span 3;
            grid-row: span 2;
            padding: 64px 48px;
            animation-delay: 0.05s;
        }

        [data-theme="papercut"] .metric-card:nth-child(1) .metric-value {
            font-size: 96px;
        }

        [data-theme="papercut"] .metric-card:nth-child(2) {
            grid-column: span 2;
            grid-row: span 1;
            animation-delay: 0.1s;
        }

        [data-theme="papercut"] .metric-card:nth-child(3) {
            grid-column: span 1;
            grid-row: span 1;
            padding: 12px;
            animation-delay: 0.15s;
        }

        [data-theme="papercut"] .metric-card:nth-child(3) .metric-value {
            font-size: 20px;
        }

        [data-theme="papercut"] .metric-card:nth-child(3) .metric-label {
            font-size: 8px;
        }

        [data-theme="papercut"] .metric-card:nth-child(4) {
            grid-column: span 2;
            grid-row: span 1;
            animation-delay: 0.2s;
        }

        [data-theme="papercut"] .metric-card:nth-child(5) {
            grid-column: span 1;
            grid-row: span 1;
            padding: 12px;
            animation-delay: 0.25s;
        }

        [data-theme="papercut"] .metric-card:nth-child(5) .metric-value {
            font-size: 20px;
        }

        [data-theme="papercut"] .metric-card:nth-child(5) .metric-label {
            font-size: 8px;
        }

        [data-theme="papercut"] .metric-card:nth-child(6) {
            grid-column: span 3;
            grid-row: span 1;
            animation-delay: 0.3s;
        }

        [data-theme="papercut"] .metric-card:hover {
            box-shadow: 12px 12px 0 rgba(0, 0, 0, 0.4);
            transform: translate(-4px, -4px);
            transition: all 0.1s ease;
        }

        [data-theme="papercut"] .metric-value {
            color: #000000;
            letter-spacing: -0.05em;
            text-transform: uppercase;
            font-weight: 900;
        }

        [data-theme="papercut"] .metric-label {
            color: #333333;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 700;
        }

        [data-theme="papercut"] .metric-label::before {
            content: '■ ';
            color: #E53935;
        }

        [data-theme="papercut"] .main-grid {
            display: grid;
            grid-template-columns: 2fr 1fr;
            grid-template-rows: auto auto;
            gap: 24px;
        }

        [data-theme="papercut"] .panel:nth-child(1) {
            grid-column: 1;
            grid-row: span 2;
            background: #F5F5F5;
            border: 4px solid #000000;
            border-radius: 0;
            box-shadow: 12px 12px 0 rgba(0, 0, 0, 0.4);
            animation: brutalistDrop 0.3s ease-out 0.35s backwards;
        }

        [data-theme="papercut"] .panel:nth-child(2) {
            grid-column: 2;
            grid-row: 1;
            background: #E5E5E5;
            border: 4px solid #000000;
            border-radius: 0;
            box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.4);
            animation: brutalistDrop 0.3s ease-out 0.4s backwards;
        }

        [data-theme="papercut"] .panel:nth-child(3) {
            grid-column: 2;
            grid-row: 2;
            background: #FAFAFA;
            border: 4px solid #000000;
            border-radius: 0;
            box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.4);
            animation: brutalistDrop 0.3s ease-out 0.45s backwards;
        }

        [data-theme="papercut"] .panel-header {
            background: #E5E5E5;
            border-bottom: 3px solid #000000;
            border-radius: 0;
        }

        [data-theme="papercut"] .panel-title {
            color: #000000;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 900;
        }

        [data-theme="papercut"] .panel-title::before {
            content: '■ ';
            color: #E53935;
        }

        [data-theme="papercut"] .status-dot {
            border-radius: 0;
            width: 12px;
            height: 12px;
            border: 2px solid #000000;
        }

        [data-theme="papercut"] .filter-chip {
            border: 3px solid #000000;
            border-radius: 0;
            background: #FFFFFF;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            font-weight: 700;
        }

        [data-theme="papercut"] .filter-chip:hover {
            border-color: #E53935;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
            background: #FAFAFA;
            transform: translate(-2px, -2px);
        }

        [data-theme="papercut"] .filter-chip.active {
            background: #E53935;
            border-color: #000000;
            color: #FFFFFF;
            box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.4);
        }

        [data-theme="papercut"] .source-bar {
            box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
            border-radius: 0;
            border: 2px solid #000000;
        }

        [data-theme="papercut"] .activity-item:hover {
            background: #F5F5F5;
            border-radius: 0;
            border-left: 6px solid #E53935;
            transform: translateX(4px);
        }

        [data-theme="papercut"] .footer-text {
            color: #333333;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 700;
        }

        [data-theme="papercut"] ::selection {
            background: #E53935;
            color: #FFFFFF;
        }

        [data-theme="papercut"] body::before {
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
	animations: `
        @keyframes brutalistDrop {
            0% {
                opacity: 0;
                transform: translateY(-20px);
                box-shadow: 0 0 0 rgba(0, 0, 0, 0);
            }
            100% {
                opacity: 1;
            }
        }
    `,
};
