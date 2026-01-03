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
        body {
            background: linear-gradient(180deg, #1A2F1A 0%, #2D2418 100%);
        }

        .header-bar {
            background: rgba(74, 222, 128, 0.05);
            border-bottom: 1px solid #4ADE8040;
        }

        .logo-icon {
            background: #4ADE80;
            color: #1A2F1A;
            border-radius: 12px;
            box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
            animation: forestBreeze 4s ease-in-out infinite;
        }

        .metric-card {
            background: linear-gradient(135deg, rgba(34, 51, 34, 0.6) 0%, rgba(45, 36, 24, 0.6) 100%);
            border: 1px solid #4ADE8040;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(74, 222, 128, 0.1);
            position: relative;
            overflow: hidden;
        }

        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.05"/></svg>');
            pointer-events: none;
        }

        .metric-card:hover {
            box-shadow: 0 6px 30px rgba(74, 222, 128, 0.2);
            transform: translateY(-2px);
            transition: all 0.4s ease;
            border-color: #4ADE8060;
        }

        .metric-value {
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
        }

        .metric-label {
            text-shadow: 0 0 4px rgba(34, 197, 94, 0.2);
        }

        .panel {
            background: linear-gradient(135deg, rgba(34, 51, 34, 0.6) 0%, rgba(45, 36, 24, 0.6) 100%);
            border: 1px solid #4ADE8040;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(74, 222, 128, 0.08);
            position: relative;
            overflow: hidden;
        }

        .panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.05"/></svg>');
            pointer-events: none;
        }

        .panel-header {
            background: linear-gradient(90deg, rgba(74, 222, 128, 0.08), rgba(34, 197, 94, 0.05));
            border-bottom: 1px solid #22C55E30;
            border-radius: 12px 12px 0 0;
        }

        .panel-title {
            text-shadow: 0 0 6px rgba(74, 222, 128, 0.2);
        }

        .panel-title::before {
            content: '🌲';
            margin-right: 0.5em;
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
        }

        .status-dot {
            box-shadow: 0 0 8px currentColor;
            animation: forestBreeze 4s ease-in-out infinite;
        }

        .filter-chip {
            border: 1px solid #4ADE8040;
            border-radius: 12px;
            background: rgba(74, 222, 128, 0.05);
        }

        .filter-chip:hover {
            border-color: #4ADE80;
            box-shadow: 0 0 15px rgba(74, 222, 128, 0.2);
            background: rgba(74, 222, 128, 0.1);
        }

        .filter-chip.active {
            background: rgba(74, 222, 128, 0.15);
            border-color: #4ADE80;
            color: #86EFAC;
            box-shadow: 0 0 15px rgba(74, 222, 128, 0.3);
        }

        .source-bar {
            box-shadow: 0 0 8px currentColor;
            border-radius: 12px;
        }

        .activity-item:hover {
            background: rgba(74, 222, 128, 0.05);
            border-radius: 8px;
        }

        .footer-text {
            text-shadow: 0 0 6px rgba(74, 222, 128, 0.2);
        }

        ::selection {
            background: #4ADE80;
            color: #1A2F1A;
        }

        /* Organic texture overlay */
        body::before {
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
    `,
};
