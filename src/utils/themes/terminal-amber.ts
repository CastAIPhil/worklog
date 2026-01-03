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
        [data-theme="terminal-amber"] body {
            background: #000000;
        }

        [data-theme="terminal-amber"] .header-bar {
            background: #000000;
            border-bottom: 0;
            border-top: 2px solid #FFB000;
            border-bottom: 2px solid #FFB000;
            padding: 8px 24px;
        }

        [data-theme="terminal-amber"] .logo::before {
            content: '> ';
            color: #FFB000;
        }

        [data-theme="terminal-amber"] .logo-icon {
            background: #FFB000;
            color: #000000;
            border-radius: 0;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.5);
            animation: phosphorGlow 3s ease-in-out infinite;
        }

        /* VERTICAL TERMINAL STACK */
        [data-theme="terminal-amber"] .metrics-grid {
            display: flex;
            flex-direction: column;
            gap: 2px;
            margin-bottom: 2px;
        }

        [data-theme="terminal-amber"] .metric-card {
            background: #0A0A00;
            border: 0;
            border-top: 1px solid #FFB00040;
            border-bottom: 1px solid #FFB00040;
            border-radius: 0;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: none;
            animation: terminalTypeLine 0.3s ease-out backwards;
        }

        [data-theme="terminal-amber"] .metric-card:nth-child(1) { animation-delay: 0.05s; }
        [data-theme="terminal-amber"] .metric-card:nth-child(2) { animation-delay: 0.1s; }
        [data-theme="terminal-amber"] .metric-card:nth-child(3) { animation-delay: 0.15s; }
        [data-theme="terminal-amber"] .metric-card:nth-child(4) { animation-delay: 0.2s; }
        [data-theme="terminal-amber"] .metric-card:nth-child(5) { animation-delay: 0.25s; }
        [data-theme="terminal-amber"] .metric-card:nth-child(6) { animation-delay: 0.3s; }

        [data-theme="terminal-amber"] .metric-card::before {
            content: '█ ';
            color: #FFB000;
            text-shadow: 0 0 8px #FFB000;
            animation: cursorBlink 1.5s step-end infinite;
        }

        [data-theme="terminal-amber"] .metric-card:hover {
            background: rgba(255, 176, 0, 0.08);
            box-shadow: inset 0 0 20px rgba(255, 176, 0, 0.1);
            transition: all 0.15s ease;
        }

        [data-theme="terminal-amber"] .metric-header {
            flex: 1;
            margin-bottom: 0;
        }

        [data-theme="terminal-amber"] .metric-label {
            text-shadow: 0 0 4px currentColor;
            font-size: 13px;
        }

        [data-theme="terminal-amber"] .metric-label::before {
            content: '[';
            color: #996600;
        }

        [data-theme="terminal-amber"] .metric-label::after {
            content: ']';
            color: #996600;
        }

        [data-theme="terminal-amber"] .metric-value {
            text-shadow: 0 0 8px currentColor;
            font-size: 24px;
            margin: 0;
        }

        [data-theme="terminal-amber"] .metric-detail {
            display: none;
        }

        /* VERTICAL PANEL STACK */
        [data-theme="terminal-amber"] .main-grid {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        [data-theme="terminal-amber"] .panel {
            background: #0A0A00;
            border: 0;
            border-top: 1px solid #FFB00040;
            border-bottom: 1px solid #FFB00040;
            border-radius: 0;
            box-shadow: none;
            animation: terminalTypeLine 0.3s ease-out backwards;
        }

        [data-theme="terminal-amber"] .panel:nth-child(1) { animation-delay: 0.35s; }
        [data-theme="terminal-amber"] .panel:nth-child(2) { animation-delay: 0.4s; }
        [data-theme="terminal-amber"] .panel:nth-child(3) { animation-delay: 0.45s; }

        [data-theme="terminal-amber"] .panel-header {
            background: #000000;
            border-bottom: 1px solid #FFB00020;
            border-radius: 0;
        }

        [data-theme="terminal-amber"] .panel-title {
            text-shadow: 0 0 4px currentColor;
        }

        [data-theme="terminal-amber"] .panel-title::before {
            content: '> ';
            color: #FFB000;
            text-shadow: 0 0 8px #FFB000;
        }

        [data-theme="terminal-amber"] .status-dot {
            box-shadow: 0 0 6px currentColor;
            border-radius: 0;
            width: 8px;
            height: 8px;
        }

        /* TERMINAL OUTPUT ACTIVITY LOG */
        [data-theme="terminal-amber"] .activity-item {
            border-bottom: 0;
            padding: 8px 24px;
            font-family: var(--font-mono);
            animation: terminalTypeLine 0.2s ease-out backwards;
        }

        [data-theme="terminal-amber"] .activity-item::before {
            content: '> ';
            color: #996600;
            margin-right: 8px;
        }

        [data-theme="terminal-amber"] .activity-time::after {
            content: ' >';
            color: #996600;
        }

        [data-theme="terminal-amber"] .activity-item:hover {
            background: rgba(255, 176, 0, 0.08);
        }

        [data-theme="terminal-amber"] .filter-chip {
            border: 1px solid #FFB00040;
            border-radius: 0;
            background: rgba(255, 176, 0, 0.05);
        }

        [data-theme="terminal-amber"] .filter-chip::before {
            content: '[';
            margin-right: 4px;
        }

        [data-theme="terminal-amber"] .filter-chip::after {
            content: ']';
            margin-left: 4px;
        }

        [data-theme="terminal-amber"] .filter-chip:hover {
            border-color: #FFB000;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.2);
            background: rgba(255, 176, 0, 0.1);
        }

        [data-theme="terminal-amber"] .filter-chip.active {
            background: rgba(255, 176, 0, 0.15);
            border-color: #FFB000;
            color: #FFB000;
            box-shadow: 0 0 10px rgba(255, 176, 0, 0.3);
        }

        [data-theme="terminal-amber"] .source-bar {
            box-shadow: 0 0 6px currentColor;
            border-radius: 0;
        }

        [data-theme="terminal-amber"] .footer-text {
            text-shadow: 0 0 4px #FFB000;
        }

        [data-theme="terminal-amber"] .footer-text::before {
            content: '█ ';
            animation: cursorBlink 1.5s step-end infinite;
        }

        [data-theme="terminal-amber"] ::selection {
            background: #FFB000;
            color: #000;
        }

        /* CRT SCANLINES */
        [data-theme="terminal-amber"] body::before {
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
                rgba(255, 176, 0, 0.03) 2px,
                rgba(255, 176, 0, 0.03) 4px
            );
            pointer-events: none;
            z-index: 9999;
            animation: scanlineFlicker 0.15s linear infinite;
        }

        /* CRT VIGNETTE */
        [data-theme="terminal-amber"] body::after {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle, transparent 60%, rgba(0,0,0,0.6) 100%);
            pointer-events: none;
            z-index: 9998;
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

        @keyframes terminalTypeLine {
            0% {
                opacity: 0;
                transform: translateX(-20px);
            }
            100% {
                opacity: 1;
                transform: translateX(0);
            }
        }

        @keyframes cursorBlink {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0; }
        }

        @keyframes scanlineFlicker {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.97; }
        }
    `,
};
