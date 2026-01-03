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
        [data-theme="chaos"] body {
            background: radial-gradient(circle at 50% 50%, #1a0a1a 0%, #0a0a0f 70%, #000000 100%);
            overflow-x: hidden;
        }

        [data-theme="chaos"] .header-bar {
            background: linear-gradient(90deg, rgba(255,0,255,0.1), rgba(0,255,255,0.1));
            border-bottom: 2px solid;
            border-image: linear-gradient(90deg, #ff00ff, #00ffff) 1;
        }

        [data-theme="chaos"] .logo-icon {
            background: linear-gradient(135deg, #ff00ff, #00ffff);
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.5);
            animation: logoGlow 2s ease-in-out infinite, chaosFloat 4s ease-in-out infinite;
        }

        /* RADIAL EXPLOSION LAYOUT */
        [data-theme="chaos"] .metrics-grid {
            position: relative;
            display: block;
            height: 500px;
            margin: 80px auto;
        }

        [data-theme="chaos"] .metric-card {
            position: absolute;
            left: 50%;
            top: 50%;
            width: 180px;
            border: 1px solid transparent;
            background: linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                        linear-gradient(135deg, #ff00ff40, #00ffff40) border-box;
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.1), inset 0 0 20px rgba(0, 255, 255, 0.05);
            animation: chaosExplode 0.6s ease-out backwards, chaosRotate 8s linear infinite;
        }

        [data-theme="chaos"] .metric-card:nth-child(1) {
            transform: translate(-50%, -50%) translate(0, -200px) rotate(3deg);
            animation-delay: 0.1s, 0s;
        }

        [data-theme="chaos"] .metric-card:nth-child(2) {
            transform: translate(-50%, -50%) translate(173px, -100px) rotate(-2deg);
            animation-delay: 0.15s, 1s;
        }

        [data-theme="chaos"] .metric-card:nth-child(3) {
            transform: translate(-50%, -50%) translate(173px, 100px) rotate(4deg);
            animation-delay: 0.2s, 2s;
        }

        [data-theme="chaos"] .metric-card:nth-child(4) {
            transform: translate(-50%, -50%) translate(0, 200px) rotate(-3deg);
            animation-delay: 0.25s, 3s;
        }

        [data-theme="chaos"] .metric-card:nth-child(5) {
            transform: translate(-50%, -50%) translate(-173px, 100px) rotate(2deg);
            animation-delay: 0.3s, 4s;
        }

        [data-theme="chaos"] .metric-card:nth-child(6) {
            transform: translate(-50%, -50%) translate(-173px, -100px) rotate(-4deg);
            animation-delay: 0.35s, 5s;
        }

        [data-theme="chaos"] .metric-card:hover {
            box-shadow: 0 0 40px rgba(255, 0, 255, 0.4), inset 0 0 30px rgba(0, 255, 255, 0.2);
            transform: translate(-50%, -50%) translate(var(--chaos-x, 0), var(--chaos-y, 0)) rotate(var(--chaos-rotate, 0deg)) scale(1.1) !important;
            transition: all 0.3s ease;
            animation-play-state: paused;
            z-index: 100;
        }

        [data-theme="chaos"] .metric-value {
            text-shadow: 0 0 10px currentColor;
        }

        /* DIAGONAL ACTIVITY LOG */
        [data-theme="chaos"] .main-grid {
            display: block;
            position: relative;
        }

        [data-theme="chaos"] .panel {
            border: 1px solid transparent;
            background: linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                        linear-gradient(135deg, #00ffff40, #ff00ff40) border-box;
            margin-bottom: 24px;
            transform: rotate(-0.5deg);
            animation: chaosPanel 0.5s ease-out backwards;
        }

        [data-theme="chaos"] .panel:nth-child(1) {
            animation-delay: 0.4s;
            transform: rotate(0.5deg);
        }

        [data-theme="chaos"] .panel:nth-child(2) {
            animation-delay: 0.5s;
            transform: rotate(-0.3deg);
        }

        [data-theme="chaos"] .panel:nth-child(3) {
            animation-delay: 0.6s;
            transform: rotate(0.2deg);
        }

        [data-theme="chaos"] .panel-header {
            background: linear-gradient(90deg, rgba(0,255,255,0.1), rgba(255,0,255,0.1));
        }

        [data-theme="chaos"] .panel-title::before {
            content: '>';
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff;
            animation: glitchText 3s linear infinite;
        }

        [data-theme="chaos"] .activity-item {
            animation: slideInDiagonal 0.3s ease-out backwards;
        }

        [data-theme="chaos"] .activity-item:nth-child(1) { animation-delay: 0.7s; }
        [data-theme="chaos"] .activity-item:nth-child(2) { animation-delay: 0.75s; }
        [data-theme="chaos"] .activity-item:nth-child(3) { animation-delay: 0.8s; }
        [data-theme="chaos"] .activity-item:nth-child(4) { animation-delay: 0.85s; }
        [data-theme="chaos"] .activity-item:nth-child(5) { animation-delay: 0.9s; }

        [data-theme="chaos"] .activity-item:hover {
            background: linear-gradient(90deg, rgba(255,0,255,0.1), transparent);
            transform: translateX(8px) rotate(0.5deg);
        }

        [data-theme="chaos"] .status-dot {
            box-shadow: 0 0 10px currentColor;
            animation: pulse 2s ease-in-out infinite, chaosGlitch 5s linear infinite;
        }

        [data-theme="chaos"] .filter-chip {
            border: 1px solid #ff00ff40;
            transform: rotate(-0.2deg);
        }

        [data-theme="chaos"] .filter-chip:hover {
            border-color: #00ffff;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
            transform: rotate(0deg) scale(1.05);
        }

        [data-theme="chaos"] .filter-chip.active {
            background: rgba(0, 255, 255, 0.1);
            border-color: #00ffff;
            color: #00ffff;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }

        [data-theme="chaos"] .source-bar {
            box-shadow: 0 0 10px currentColor;
        }

        [data-theme="chaos"] .footer-text {
            text-shadow: 0 0 5px #ff00ff;
        }

        [data-theme="chaos"] ::selection {
            background: #ff00ff;
            color: #000;
        }

        [data-theme="chaos"] body::before {
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
            animation: scanlineMove 10s linear infinite;
        }

        /* CENTER BURST EFFECT */
        [data-theme="chaos"] .container::before {
            content: '';
            position: absolute;
            top: 300px;
            left: 50%;
            width: 400px;
            height: 400px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(255,0,255,0.2) 0%, transparent 70%);
            pointer-events: none;
            animation: centerBurst 3s ease-in-out infinite;
        }
    `,
	animations: `
        @keyframes logoGlow {
            0%, 100% { box-shadow: 0 0 20px rgba(255, 0, 255, 0.5); }
            50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.8); }
        }

        @keyframes chaosFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-3px); }
        }

        @keyframes chaosExplode {
            0% { 
                transform: translate(-50%, -50%) scale(0.3) rotate(0deg);
                opacity: 0;
            }
            100% { 
                opacity: 1;
            }
        }

        @keyframes chaosRotate {
            0%, 100% { 
                filter: hue-rotate(0deg);
            }
            50% { 
                filter: hue-rotate(10deg);
            }
        }

        @keyframes chaosPanel {
            0% {
                transform: translateX(-100px) rotate(-5deg);
                opacity: 0;
            }
            100% {
                opacity: 1;
            }
        }

        @keyframes slideInDiagonal {
            0% {
                transform: translate(-30px, 10px);
                opacity: 0;
            }
            100% {
                transform: translate(0, 0);
                opacity: 1;
            }
        }

        @keyframes glitchText {
            0%, 90%, 100% { 
                transform: translate(0);
            }
            92% { 
                transform: translate(-2px, 1px);
            }
            94% { 
                transform: translate(2px, -1px);
            }
            96% { 
                transform: translate(-1px, -1px);
            }
        }

        @keyframes chaosGlitch {
            0%, 98%, 100% {
                transform: translate(0) scale(1);
            }
            98.5% {
                transform: translate(-1px, 1px) scale(1.1);
            }
            99.5% {
                transform: translate(1px, -1px) scale(0.9);
            }
        }

        @keyframes scanlineMove {
            0% { transform: translateY(0); }
            100% { transform: translateY(20px); }
        }

        @keyframes centerBurst {
            0%, 100% {
                opacity: 0.3;
                transform: translate(-50%, -50%) scale(1);
            }
            50% {
                opacity: 0.6;
                transform: translate(-50%, -50%) scale(1.1);
            }
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
