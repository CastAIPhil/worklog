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
        [data-theme="blueprint"] body {
            background: linear-gradient(180deg, #1E3A5F 0%, #152238 100%);
            perspective: 1400px;
            perspective-origin: 50% 30%;
        }

        [data-theme="blueprint"] .header-bar {
            background: rgba(125, 211, 252, 0.05);
            border-bottom: 2px dashed #7DD3FC80;
        }

        [data-theme="blueprint"] .logo-icon {
            background: #7DD3FC;
            color: #1E3A5F;
            border-radius: 0;
            box-shadow: 0 0 8px rgba(125, 211, 252, 0.4);
            animation: blueprintScan 3s ease-in-out infinite;
        }

        [data-theme="blueprint"] .container {
            transform-style: preserve-3d;
        }

        [data-theme="blueprint"] .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 48px;
            margin-bottom: 48px;
            transform-style: preserve-3d;
            transform: rotateX(20deg) rotateZ(-2deg);
            margin-top: 80px;
        }

        [data-theme="blueprint"] .metric-card {
            background: #152238;
            border: 2px dashed #7DD3FC80;
            border-radius: 0;
            box-shadow: 0 0 10px rgba(125, 211, 252, 0.2);
            position: relative;
            transform-style: preserve-3d;
            animation: blueprintConstruct 0.8s ease-out backwards;
        }

        [data-theme="blueprint"] .metric-card:nth-child(1) {
            transform: rotateY(-5deg) translateZ(20px);
            animation-delay: 0.1s;
        }

        [data-theme="blueprint"] .metric-card:nth-child(2) {
            transform: rotateY(0deg) translateZ(40px);
            animation-delay: 0.15s;
        }

        [data-theme="blueprint"] .metric-card:nth-child(3) {
            transform: rotateY(5deg) translateZ(20px);
            animation-delay: 0.2s;
        }

        [data-theme="blueprint"] .metric-card:nth-child(4) {
            transform: rotateY(-3deg) translateZ(10px);
            animation-delay: 0.25s;
        }

        [data-theme="blueprint"] .metric-card:nth-child(5) {
            transform: rotateY(2deg) translateZ(30px);
            animation-delay: 0.3s;
        }

        [data-theme="blueprint"] .metric-card:nth-child(6) {
            transform: rotateY(4deg) translateZ(15px);
            animation-delay: 0.35s;
        }

        [data-theme="blueprint"] .metric-card::after {
            content: '';
            position: absolute;
            bottom: -20px;
            left: 10%;
            right: 10%;
            height: 2px;
            background: repeating-linear-gradient(90deg, #7DD3FC40 0, #7DD3FC40 4px, transparent 4px, transparent 8px);
            pointer-events: none;
        }

        [data-theme="blueprint"] .metric-card::before {
            content: attr(data-dimension);
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #3B6EA5;
            font-family: var(--font-mono);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        [data-theme="blueprint"] .metric-card:hover {
            box-shadow: 0 0 20px rgba(125, 211, 252, 0.4);
            transform: rotateY(var(--rotate-y, 0deg)) translateZ(50px) scale(1.05);
            transition: all 0.4s ease;
            border-color: #7DD3FCA0;
            z-index: 100;
        }

        [data-theme="blueprint"] .metric-value {
            text-shadow: 0 0 4px rgba(125, 211, 252, 0.3);
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        [data-theme="blueprint"] .metric-label {
            text-shadow: 0 0 2px rgba(125, 211, 252, 0.2);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-size: 10px;
        }

        [data-theme="blueprint"] .metric-label::before {
            content: '┌ ';
            color: #3B6EA5;
        }

        [data-theme="blueprint"] .metric-label::after {
            content: ' ┐';
            color: #3B6EA5;
        }

        [data-theme="blueprint"] .main-grid {
            display: block;
            transform-style: preserve-3d;
            transform: rotateX(15deg) rotateZ(-1deg);
        }

        [data-theme="blueprint"] .panel {
            background: #152238;
            border: 2px dashed #7DD3FC80;
            border-radius: 0;
            box-shadow: 0 0 10px rgba(125, 211, 252, 0.15);
            position: relative;
            margin-bottom: 48px;
            transform-style: preserve-3d;
            animation: blueprintConstruct 0.8s ease-out backwards;
        }

        [data-theme="blueprint"] .panel:nth-child(1) {
            transform: rotateY(-2deg) translateZ(25px);
            animation-delay: 0.4s;
        }

        [data-theme="blueprint"] .panel:nth-child(2) {
            transform: rotateY(1deg) translateZ(35px);
            animation-delay: 0.5s;
        }

        [data-theme="blueprint"] .panel:nth-child(3) {
            transform: rotateY(3deg) translateZ(20px);
            animation-delay: 0.6s;
        }

        [data-theme="blueprint"] .panel::after {
            content: '';
            position: absolute;
            top: 10px;
            bottom: 10px;
            right: -30px;
            width: 2px;
            background: repeating-linear-gradient(0deg, #7DD3FC40 0, #7DD3FC40 4px, transparent 4px, transparent 8px);
            pointer-events: none;
        }

        [data-theme="blueprint"] .panel-header {
            background: #152238;
            border-bottom: 2px dashed #3B6EA560;
            border-radius: 0;
        }

        [data-theme="blueprint"] .panel-title {
            text-shadow: 0 0 4px rgba(125, 211, 252, 0.3);
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 600;
        }

        [data-theme="blueprint"] .panel-title::before {
            content: '┼ ';
            color: #7DD3FC;
            text-shadow: 0 0 6px rgba(125, 211, 252, 0.5);
        }

        [data-theme="blueprint"] .status-dot {
            box-shadow: 0 0 6px currentColor;
            animation: blueprintScan 3s ease-in-out infinite;
            border-radius: 0;
            clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }

        [data-theme="blueprint"] .filter-chip {
            border: 2px dashed #7DD3FC80;
            border-radius: 0;
            background: rgba(125, 211, 252, 0.05);
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        [data-theme="blueprint"] .filter-chip:hover {
            border-color: #7DD3FC;
            box-shadow: 0 0 10px rgba(125, 211, 252, 0.3);
            background: rgba(125, 211, 252, 0.1);
        }

        [data-theme="blueprint"] .filter-chip.active {
            background: rgba(125, 211, 252, 0.15);
            border-color: #7DD3FC;
            color: #7DD3FC;
            box-shadow: 0 0 12px rgba(125, 211, 252, 0.4);
        }

        [data-theme="blueprint"] .source-bar {
            box-shadow: 0 0 6px currentColor;
            border-radius: 0;
        }

        [data-theme="blueprint"] .activity-item:hover {
            background: rgba(125, 211, 252, 0.05);
            border-radius: 0;
        }

        [data-theme="blueprint"] .footer-text {
            text-shadow: 0 0 4px rgba(125, 211, 252, 0.3);
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        [data-theme="blueprint"] ::selection {
            background: #7DD3FC;
            color: #1E3A5F;
        }

        [data-theme="blueprint"] body::before {
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

        @keyframes blueprintConstruct {
            0% {
                opacity: 0;
                transform: rotateY(var(--rotate-y, 0deg)) translateZ(-100px) scale(0.8);
            }
            100% {
                opacity: 1;
            }
        }
    `,
};
