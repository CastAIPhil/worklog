import type { DashboardTheme } from "./types.ts";

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
