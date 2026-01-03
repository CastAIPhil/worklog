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
        [data-theme="infrared"] body {
            background: linear-gradient(180deg, #000000 0%, #1A0000 100%);
        }

        [data-theme="infrared"] .header-bar {
            background: transparent;
            border: 0;
            border-top: 2px solid rgba(239, 68, 68, 0.3);
            border-bottom: 2px solid rgba(239, 68, 68, 0.3);
            position: relative;
        }

        [data-theme="infrared"] .header-bar::before {
            content: '< ';
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #EF4444;
            font-family: var(--font-mono);
        }

        [data-theme="infrared"] .header-bar::after {
            content: ' >';
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            color: #EF4444;
            font-family: var(--font-mono);
        }

        [data-theme="infrared"] .logo-icon {
            background: transparent;
            border: 2px solid #EF4444;
            color: #EF4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.3), inset 0 0 8px rgba(239, 68, 68, 0.2);
            animation: heatPulse 2s ease-in-out infinite;
        }

        /* HUD CORNER-ANCHORED LAYOUT */
        [data-theme="infrared"] .container {
            position: relative;
            min-height: calc(100vh - 100px);
        }

        [data-theme="infrared"] .metrics-grid {
            display: block;
            position: relative;
            height: auto;
            margin: 0;
        }

        [data-theme="infrared"] .metric-card {
            position: fixed;
            width: 200px;
            background: rgba(26, 0, 0, 0.85);
            border: 2px solid #EF444440;
            border-radius: 0;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
            letter-spacing: -0.02em;
            backdrop-filter: blur(4px);
            z-index: 50;
            animation: hudSlideIn 0.4s ease-out backwards;
        }

        /* TOP LEFT CORNER */
        [data-theme="infrared"] .metric-card:nth-child(1) {
            top: 80px;
            left: 24px;
            animation-delay: 0.1s;
        }

        [data-theme="infrared"] .metric-card:nth-child(1)::before {
            content: '┌';
            position: absolute;
            top: -2px;
            left: -2px;
            color: #EF4444;
            font-size: 20px;
        }

        [data-theme="infrared"] .metric-card:nth-child(2) {
            top: 200px;
            left: 24px;
            animation-delay: 0.15s;
        }

        /* TOP RIGHT CORNER */
        [data-theme="infrared"] .metric-card:nth-child(3) {
            top: 80px;
            right: 24px;
            animation-delay: 0.2s;
        }

        [data-theme="infrared"] .metric-card:nth-child(3)::before {
            content: '┐';
            position: absolute;
            top: -2px;
            right: -2px;
            color: #EF4444;
            font-size: 20px;
        }

        [data-theme="infrared"] .metric-card:nth-child(4) {
            top: 200px;
            right: 24px;
            animation-delay: 0.25s;
        }

        /* BOTTOM CORNERS */
        [data-theme="infrared"] .metric-card:nth-child(5) {
            bottom: 100px;
            left: 24px;
            animation-delay: 0.3s;
        }

        [data-theme="infrared"] .metric-card:nth-child(5)::before {
            content: '└';
            position: absolute;
            bottom: -2px;
            left: -2px;
            color: #EF4444;
            font-size: 20px;
        }

        [data-theme="infrared"] .metric-card:nth-child(6) {
            bottom: 100px;
            right: 24px;
            animation-delay: 0.35s;
        }

        [data-theme="infrared"] .metric-card:nth-child(6)::before {
            content: '┘';
            position: absolute;
            bottom: -2px;
            right: -2px;
            color: #EF4444;
            font-size: 20px;
        }

        [data-theme="infrared"] .metric-card::after {
            content: '< >';
            position: absolute;
            top: 4px;
            right: 4px;
            font-size: 10px;
            color: #991B1B;
            font-family: var(--font-mono);
        }

        [data-theme="infrared"] .metric-card:hover {
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.4);
            border-color: #EF444460;
            transform: scale(1.02);
            transition: all 0.3s ease;
        }

        [data-theme="infrared"] .metric-value {
            text-shadow: 0 0 4px currentColor;
            letter-spacing: -0.05em;
        }

        [data-theme="infrared"] .metric-label {
            text-shadow: 0 0 3px currentColor;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        /* CENTERED MAIN PANELS */
        [data-theme="infrared"] .main-grid {
            display: flex;
            flex-direction: column;
            gap: 24px;
            max-width: 900px;
            margin: 320px auto 120px;
            padding: 0 260px;
        }

        [data-theme="infrared"] .panel {
            background: rgba(26, 0, 0, 0.7);
            border: 2px solid #EF444440;
            border-radius: 0;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.15);
            backdrop-filter: blur(4px);
            position: relative;
            animation: hudFadeIn 0.5s ease-out backwards;
        }

        [data-theme="infrared"] .panel::before {
            content: '< ';
            position: absolute;
            left: 8px;
            top: 16px;
            color: #7F1D1D;
            font-family: var(--font-mono);
        }

        [data-theme="infrared"] .panel::after {
            content: ' >';
            position: absolute;
            right: 8px;
            top: 16px;
            color: #7F1D1D;
            font-family: var(--font-mono);
        }

        [data-theme="infrared"] .panel:nth-child(1) { animation-delay: 0.4s; }
        [data-theme="infrared"] .panel:nth-child(2) { animation-delay: 0.5s; }
        [data-theme="infrared"] .panel:nth-child(3) { animation-delay: 0.6s; }

        [data-theme="infrared"] .panel-header {
            background: rgba(239, 68, 68, 0.08);
            border-bottom: 1px solid #7F1D1D40;
        }

        [data-theme="infrared"] .panel-title {
            text-shadow: 0 0 3px currentColor;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        [data-theme="infrared"] .panel-title::before {
            content: '▶ ';
            color: #EF4444;
            text-shadow: 0 0 4px #EF4444;
        }

        [data-theme="infrared"] .status-dot {
            box-shadow: 0 0 6px currentColor;
            animation: heatPulse 2s ease-in-out infinite;
            border-radius: 0;
            clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
        }

        [data-theme="infrared"] .filter-chip {
            border: 1px solid #EF444440;
            border-radius: 0;
            background: rgba(239, 68, 68, 0.05);
            letter-spacing: -0.02em;
            clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
        }

        [data-theme="infrared"] .filter-chip::before {
            content: '< ';
        }

        [data-theme="infrared"] .filter-chip::after {
            content: ' >';
        }

        [data-theme="infrared"] .filter-chip:hover {
            border-color: #EF4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
            background: rgba(239, 68, 68, 0.1);
        }

        [data-theme="infrared"] .filter-chip.active {
            background: rgba(239, 68, 68, 0.15);
            border-color: #EF4444;
            color: #F87171;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
        }

        [data-theme="infrared"] .source-bar {
            box-shadow: 0 0 4px currentColor;
            border-radius: 0;
        }

        [data-theme="infrared"] .activity-item:hover {
            background: rgba(239, 68, 68, 0.05);
        }

        [data-theme="infrared"] .footer-text {
            text-shadow: 0 0 3px #EF4444;
        }

        [data-theme="infrared"] ::selection {
            background: #EF4444;
            color: #000;
        }

        /* CROSSHAIR OVERLAY */
        [data-theme="infrared"] .container::before {
            content: '';
            position: fixed;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, #EF444430 40%, #EF444430 60%, transparent);
            pointer-events: none;
            z-index: 40;
        }

        [data-theme="infrared"] .container::after {
            content: '';
            position: fixed;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 1px;
            background: linear-gradient(180deg, transparent, #EF444430 40%, #EF444430 60%, transparent);
            pointer-events: none;
            z-index: 40;
        }

        /* Tactical scanline effect */
        [data-theme="infrared"] body::before {
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
            animation: scanSweep 8s linear infinite;
        }

        /* CORNER FRAME DECORATION */
        [data-theme="infrared"] body::after {
            content: '';
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 1px solid rgba(239, 68, 68, 0.2);
            pointer-events: none;
            z-index: 30;
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

        @keyframes hudSlideIn {
            0% {
                opacity: 0;
                transform: translateY(-20px) scale(0.9);
            }
            100% {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes hudFadeIn {
            0% {
                opacity: 0;
                transform: scale(0.95);
            }
            100% {
                opacity: 1;
                transform: scale(1);
            }
        }

        @keyframes scanSweep {
            0% {
                transform: translateY(0);
            }
            100% {
                transform: translateY(40px);
            }
        }
    `,
};
