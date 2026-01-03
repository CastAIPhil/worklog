import type { DashboardTheme } from "./types.ts";

export const forestTheme: DashboardTheme = {
	id: "forest",
	name: "Forest",
	description: "Deep woods with organic warmth",
	colors: {
		bgPrimary: "#1A2F1A",
		bgSecondary: "#2D2418",
		bgTertiary: "#223322",
		bgElevated: "#1F2B1F",
		borderPrimary: "#4ADE8040",
		borderSecondary: "#22C55E30",
		textPrimary: "#ECFDF5",
		textSecondary: "#86EFAC",
		textMuted: "#4ADE80",
		accentBlue: "#22D3EE",
		accentGreen: "#4ADE80",
		accentCyan: "#6EE7B7",
		accentAmber: "#FEF3C7",
		accentOrange: "#FB923C",
		accentPurple: "#C4B5FD",
		accentPink: "#F9A8D4",
		accentRed: "#F87171",
		chartColors: [
			"#4ADE80",
			"#78716C",
			"#FEF3C7",
			"#22C55E",
			"#FB923C",
			"#6EE7B7",
			"#A78BFA",
			"#F87171",
		],
	},
	fonts: {
		primary: "'Literata', 'Georgia', serif",
		mono: "'JetBrains Mono', monospace",
	},
	customCSS: `
        [data-theme="forest"] body {
            background: linear-gradient(180deg, #1A2F1A 0%, #2D2418 100%);
            perspective: 1200px;
        }

        [data-theme="forest"] .header-bar {
            background: rgba(74, 222, 128, 0.05);
            border-bottom: 1px solid #4ADE8040;
        }

        [data-theme="forest"] .logo-icon {
            background: #4ADE80;
            color: #1A2F1A;
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
            animation: forestBreeze 4s ease-in-out infinite;
        }

        /* LAYERED DEPTH GRID */
        [data-theme="forest"] .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
            margin-bottom: 24px;
            position: relative;
            transform-style: preserve-3d;
        }

        [data-theme="forest"] .metric-card {
            background: linear-gradient(135deg, rgba(34, 51, 34, 0.6) 0%, rgba(45, 36, 24, 0.6) 100%);
            border: 1px solid #4ADE8040;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(74, 222, 128, 0.1);
            position: relative;
            overflow: visible;
            transform-style: preserve-3d;
            animation: forestLayer 0.6s ease-out backwards;
        }

        /* DEPTH LAYERING - Cards at different Z depths */
        [data-theme="forest"] .metric-card:nth-child(1) {
            transform: translateZ(0px) rotate(-1deg) scale(1.05);
            z-index: 10;
            margin-top: 20px;
            margin-left: 15px;
            box-shadow: 0 8px 30px rgba(74, 222, 128, 0.15);
            animation-delay: 0.1s;
        }

        [data-theme="forest"] .metric-card:nth-child(2) {
            transform: translateZ(-20px) rotate(1.5deg) scale(1.08);
            z-index: 8;
            margin-top: -10px;
            margin-right: 10px;
            box-shadow: 0 12px 35px rgba(74, 222, 128, 0.18);
            animation-delay: 0.15s;
        }

        [data-theme="forest"] .metric-card:nth-child(3) {
            transform: translateZ(-40px) rotate(-0.5deg) scale(1.12);
            z-index: 6;
            margin-top: 5px;
            margin-left: -20px;
            box-shadow: 0 16px 40px rgba(74, 222, 128, 0.2);
            animation-delay: 0.2s;
        }

        [data-theme="forest"] .metric-card:nth-child(4) {
            transform: translateZ(-10px) rotate(2deg) scale(1.03);
            z-index: 9;
            margin-top: -15px;
            margin-right: -10px;
            box-shadow: 0 10px 32px rgba(74, 222, 128, 0.16);
            animation-delay: 0.25s;
        }

        [data-theme="forest"] .metric-card:nth-child(5) {
            transform: translateZ(-30px) rotate(-1.5deg) scale(1.1);
            z-index: 7;
            margin-top: 10px;
            margin-left: 5px;
            box-shadow: 0 14px 38px rgba(74, 222, 128, 0.19);
            animation-delay: 0.3s;
        }

        [data-theme="forest"] .metric-card:nth-child(6) {
            transform: translateZ(-50px) rotate(0.5deg) scale(1.15);
            z-index: 5;
            margin-top: -5px;
            margin-right: -15px;
            box-shadow: 0 18px 45px rgba(74, 222, 128, 0.22);
            animation-delay: 0.35s;
        }

        [data-theme="forest"] .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.05"/></svg>');
            pointer-events: none;
        }

        [data-theme="forest"] .metric-card:hover {
            box-shadow: 0 8px 40px rgba(74, 222, 128, 0.3);
            transform: translateZ(20px) rotate(0deg) scale(1.08) !important;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            border-color: #4ADE8060;
            z-index: 100 !important;
        }

        [data-theme="forest"] .metric-value {
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
        }

        [data-theme="forest"] .metric-label {
            text-shadow: 0 0 4px rgba(34, 197, 94, 0.2);
        }

        /* LAYERED PANELS */
        [data-theme="forest"] .main-grid {
            display: block;
            position: relative;
            transform-style: preserve-3d;
        }

        [data-theme="forest"] .panel {
            background: linear-gradient(135deg, rgba(34, 51, 34, 0.6) 0%, rgba(45, 36, 24, 0.6) 100%);
            border: 1px solid #4ADE8040;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(74, 222, 128, 0.08);
            position: relative;
            overflow: visible;
            margin-bottom: 24px;
            transform-style: preserve-3d;
            animation: forestLayer 0.6s ease-out backwards;
        }

        [data-theme="forest"] .panel:nth-child(1) {
            transform: translateZ(-15px) rotate(0.5deg) scale(1.02);
            z-index: 4;
            margin-left: 30px;
            margin-right: -20px;
            box-shadow: 0 12px 35px rgba(74, 222, 128, 0.12);
            animation-delay: 0.4s;
        }

        [data-theme="forest"] .panel:nth-child(2) {
            transform: translateZ(-35px) rotate(-1deg) scale(1.05);
            z-index: 3;
            margin-left: -15px;
            margin-right: 25px;
            box-shadow: 0 16px 40px rgba(74, 222, 128, 0.15);
            animation-delay: 0.5s;
        }

        [data-theme="forest"] .panel:nth-child(3) {
            transform: translateZ(-25px) rotate(0.8deg) scale(1.03);
            z-index: 2;
            margin-left: 20px;
            margin-right: -10px;
            box-shadow: 0 14px 38px rgba(74, 222, 128, 0.13);
            animation-delay: 0.6s;
        }

        [data-theme="forest"] .panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.05"/></svg>');
            pointer-events: none;
        }

        [data-theme="forest"] .panel-header {
            background: linear-gradient(90deg, rgba(74, 222, 128, 0.08), rgba(34, 197, 94, 0.05));
            border-bottom: 1px solid #22C55E30;
            border-radius: 12px 12px 0 0;
        }

        [data-theme="forest"] .panel-title {
            text-shadow: 0 0 6px rgba(74, 222, 128, 0.2);
        }

        [data-theme="forest"] .panel-title::before {
            content: '🌲';
            margin-right: 0.5em;
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
        }

        [data-theme="forest"] .status-dot {
            box-shadow: 0 0 8px currentColor;
            animation: forestBreeze 4s ease-in-out infinite;
        }

        [data-theme="forest"] .filter-chip {
            border: 1px solid #4ADE8040;
            border-radius: 12px;
            background: rgba(74, 222, 128, 0.05);
        }

        [data-theme="forest"] .filter-chip:hover {
            border-color: #4ADE80;
            box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
            background: rgba(74, 222, 128, 0.1);
        }

        [data-theme="forest"] .filter-chip.active {
            background: rgba(74, 222, 128, 0.15);
            border-color: #4ADE80;
            color: #86EFAC;
            box-shadow: 0 0 15px rgba(74, 222, 128, 0.3);
        }

        [data-theme="forest"] .source-bar {
            box-shadow: 0 0 8px currentColor;
            border-radius: 12px;
        }

        [data-theme="forest"] .activity-item:hover {
            background: rgba(74, 222, 128, 0.05);
            border-radius: 8px;
            transform: translateX(4px);
        }

        [data-theme="forest"] .footer-text {
            text-shadow: 0 0 6px rgba(74, 222, 128, 0.2);
        }

        [data-theme="forest"] ::selection {
            background: #4ADE80;
            color: #1A2F1A;
        }

        /* Organic texture overlay */
        [data-theme="forest"] body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.03"/></svg>');
            pointer-events: none;
            z-index: 9999;
        }

        /* Parallax scroll container */
        [data-theme="forest"] .container {
            transform-style: preserve-3d;
        }
    `,
	animations: `
        @keyframes forestBreeze {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
                transform: scale(1);
            }
            50% { 
                box-shadow: 0 0 30px rgba(74, 222, 128, 0.5);
                transform: scale(1.02);
            }
        }

        @keyframes forestLayer {
            0% {
                opacity: 0;
                transform: translateZ(-100px) scale(0.8);
            }
            100% {
                opacity: 1;
            }
        }
    `,
};
