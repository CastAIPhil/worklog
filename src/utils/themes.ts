/**
 * Dashboard Theme System
 *
 * Extensible theme architecture for the worklog dashboard.
 * Add new themes by creating a DashboardTheme object and registering it in THEMES.
 */

export interface ThemeColors {
	bgPrimary: string;
	bgSecondary: string;
	bgTertiary: string;
	bgElevated: string;
	borderPrimary: string;
	borderSecondary: string;
	textPrimary: string;
	textSecondary: string;
	textMuted: string;
	accentBlue: string;
	accentGreen: string;
	accentCyan: string;
	accentAmber: string;
	accentOrange: string;
	accentPurple: string;
	accentPink: string;
	accentRed: string;
	chartColors: string[];
}

export interface DashboardTheme {
	id: string;
	name: string;
	description: string;
	colors: ThemeColors;
	fonts: {
		primary: string;
		mono: string;
	};
	/** Optional custom CSS to inject */
	customCSS?: string;
	/** Optional custom animations */
	animations?: string;
}

/**
 * Default theme - Clean command center aesthetic
 */
export const defaultTheme: DashboardTheme = {
	id: "default",
	name: "Command Center",
	description: "Clean, professional dark theme",
	colors: {
		bgPrimary: "#0d1117",
		bgSecondary: "#161b22",
		bgTertiary: "#21262d",
		bgElevated: "#1c2128",
		borderPrimary: "#30363d",
		borderSecondary: "#21262d",
		textPrimary: "#e6edf3",
		textSecondary: "#8b949e",
		textMuted: "#6e7681",
		accentBlue: "#58a6ff",
		accentGreen: "#3fb950",
		accentCyan: "#39d353",
		accentAmber: "#d29922",
		accentOrange: "#f0883e",
		accentPurple: "#a371f7",
		accentPink: "#db61a2",
		accentRed: "#f85149",
		chartColors: [
			"#58a6ff",
			"#3fb950",
			"#a371f7",
			"#f0883e",
			"#db61a2",
			"#39d353",
			"#d29922",
			"#f85149",
		],
	},
	fonts: {
		primary: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
		mono: "'JetBrains Mono', 'Consolas', monospace",
	},
};

/**
 * Chaos theme - Cyberpunk neon aesthetic with glitch effects
 */
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

        /* Scanline effect */
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

/**
 * Terminal Amber theme - Vintage phosphor terminal aesthetic
 */
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

        /* CRT scanline effect */
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

/**
 * INFRARED theme - Tactical night vision heat-map
 */
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
        body {
            background: linear-gradient(180deg, #000000 0%, #1A0000 100%);
        }

        .header-bar {
            background: rgba(239, 68, 68, 0.05);
            border-bottom: 1px solid #EF444440;
        }

        .logo-icon {
            background: #EF4444;
            color: #000000;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
            animation: heatPulse 2s ease-in-out infinite;
        }

        .metric-card {
            background: linear-gradient(180deg, #1A0000 0%, #220000 100%);
            border: 1px solid #EF444440;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.15);
            letter-spacing: -0.02em;
        }

        .metric-card:hover {
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);
            transform: translateY(-2px);
            transition: all 0.3s ease;
            border-color: #EF444460;
        }

        .metric-value {
            text-shadow: 0 0 4px currentColor;
            letter-spacing: -0.05em;
        }

        .metric-label {
            text-shadow: 0 0 3px currentColor;
            letter-spacing: -0.02em;
        }

        .panel {
            background: linear-gradient(180deg, #1A0000 0%, #220000 100%);
            border: 1px solid #EF444440;
            border-radius: 2px;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.1);
        }

        .panel-header {
            background: rgba(239, 68, 68, 0.05);
            border-bottom: 1px solid #7F1D1D40;
        }

        .panel-title {
            text-shadow: 0 0 3px currentColor;
            letter-spacing: -0.02em;
        }

        .panel-title::before {
            content: '▶';
            color: #EF4444;
            text-shadow: 0 0 4px #EF4444;
        }

        .status-dot {
            box-shadow: 0 0 4px currentColor;
            animation: heatPulse 2s ease-in-out infinite;
        }

        .filter-chip {
            border: 1px solid #EF444440;
            border-radius: 2px;
            background: rgba(239, 68, 68, 0.05);
            letter-spacing: -0.02em;
        }

        .filter-chip:hover {
            border-color: #EF4444;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
            background: rgba(239, 68, 68, 0.1);
        }

        .filter-chip.active {
            background: rgba(239, 68, 68, 0.15);
            border-color: #EF4444;
            color: #F87171;
            box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
        }

        .source-bar {
            box-shadow: 0 0 4px currentColor;
        }

        .activity-item:hover {
            background: rgba(239, 68, 68, 0.05);
        }

        .footer-text {
            text-shadow: 0 0 3px #EF4444;
        }

        ::selection {
            background: #EF4444;
            color: #000;
        }

        /* Tactical scanline effect */
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
                rgba(239, 68, 68, 0.03) 2px,
                rgba(239, 68, 68, 0.03) 4px
            );
            pointer-events: none;
            z-index: 9999;
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
    `,
};

/**
 * FOREST theme - Deep nature-inspired aesthetic with organic warmth
 */
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

/**
 * MIDNIGHT BLOOM theme - Editorial warmth meets midnight elegance
 */
export const midnightBloomTheme: DashboardTheme = {
	id: "midnight-bloom",
	name: "Midnight Bloom",
	description: "Editorial warmth meets midnight elegance",
	colors: {
		bgPrimary: "#0F172A",
		bgSecondary: "#1E293B",
		bgTertiary: "#334155",
		bgElevated: "#1E293B",
		borderPrimary: "#FB718540",
		borderSecondary: "#FB718530",
		textPrimary: "#F8FAFC",
		textSecondary: "#94A3B8",
		textMuted: "#64748B",
		accentBlue: "#38BDF8",
		accentGreen: "#4ADE80",
		accentCyan: "#22D3EE",
		accentAmber: "#FEF3C7",
		accentOrange: "#EA580C",
		accentPurple: "#C4B5FD",
		accentPink: "#FB7185",
		accentRed: "#F43F5E",
		chartColors: [
			"#FB7185",
			"#EA580C",
			"#C4B5FD",
			"#38BDF8",
			"#FEF3C7",
			"#4ADE80",
			"#22D3EE",
			"#F43F5E",
		],
	},
	fonts: {
		primary: "'Fraunces', 'Georgia', serif",
		mono: "'JetBrains Mono', monospace",
	},
	customCSS: `
        body {
            background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
        }

        .header-bar {
            background: rgba(251, 113, 133, 0.05);
            border-bottom: 1px solid #FB718540;
        }

        .logo-icon {
            background: #FB7185;
            color: #0F172A;
            border-radius: 14px;
            box-shadow: 0 0 20px rgba(251, 113, 133, 0.3);
            animation: bloomGlow 4s ease-in-out infinite;
        }

        .metric-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.6) 100%);
            border: 1px solid #FB718540;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(251, 113, 133, 0.15);
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
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.04"/></svg>');
            pointer-events: none;
        }

        .metric-card:hover {
            box-shadow: 0 6px 30px rgba(251, 113, 133, 0.25);
            transform: translateY(-2px);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            border-color: #FB718560;
        }

        .metric-value {
            text-shadow: 0 0 8px rgba(251, 113, 133, 0.2);
            letter-spacing: -0.03em;
        }

        .metric-label {
            text-shadow: 0 0 4px rgba(251, 113, 133, 0.15);
            letter-spacing: 0.02em;
        }

        .panel {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.6) 100%);
            border: 1px solid #FB718540;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(251, 113, 133, 0.12);
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
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.04"/></svg>');
            pointer-events: none;
        }

        .panel-header {
            background: linear-gradient(90deg, rgba(251, 113, 133, 0.08), rgba(234, 88, 12, 0.05));
            border-bottom: 1px solid #FB718530;
            border-radius: 16px 16px 0 0;
        }

        .panel-title {
            text-shadow: 0 0 6px rgba(251, 113, 133, 0.2);
            letter-spacing: 0.02em;
            font-weight: 500;
        }

        .panel-title::before {
            content: '🌸';
            margin-right: 0.5em;
            text-shadow: 0 0 8px rgba(251, 113, 133, 0.4);
        }

        .status-dot {
            box-shadow: 0 0 8px currentColor;
            animation: bloomGlow 4s ease-in-out infinite;
        }

        .filter-chip {
            border: 1px solid #FB718540;
            border-radius: 14px;
            background: rgba(251, 113, 133, 0.05);
        }

        .filter-chip:hover {
            border-color: #FB7185;
            box-shadow: 0 0 15px rgba(251, 113, 133, 0.25);
            background: rgba(251, 113, 133, 0.1);
        }

        .filter-chip.active {
            background: rgba(251, 113, 133, 0.15);
            border-color: #FB7185;
            color: #FB7185;
            box-shadow: 0 0 15px rgba(251, 113, 133, 0.35);
        }

        .source-bar {
            box-shadow: 0 0 8px currentColor;
            border-radius: 14px;
        }

        .activity-item:hover {
            background: rgba(251, 113, 133, 0.05);
            border-radius: 10px;
        }

        .footer-text {
            text-shadow: 0 0 6px rgba(251, 113, 133, 0.2);
            letter-spacing: 0.02em;
        }

        ::selection {
            background: #FB7185;
            color: #0F172A;
        }

        /* Soft texture overlay */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.03"/></svg>');
            pointer-events: none;
            z-index: 9999;
        }
    `,
	animations: `
        @keyframes bloomGlow {
            0%, 100% { 
                box-shadow: 0 0 20px rgba(251, 113, 133, 0.3);
                transform: scale(1);
            }
            50% { 
                box-shadow: 0 0 30px rgba(251, 113, 133, 0.5);
                transform: scale(1.015);
            }
        }
    `,
};

/**
 * BLUEPRINT theme - Technical drawing precision with blueprint blue
 */
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

/**
 * PAPERCUT theme - Brutalist light mode aesthetic with stark contrast
 */
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
        body {
            background: #FFFFFF;
        }

        .header-bar {
            background: #FFFFFF;
            border-bottom: 2px solid #000000;
        }

        .logo-icon {
            background: #E53935;
            color: #FFFFFF;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
        }

        .metric-card {
            background: #F5F5F5;
            border: 2px solid #000000;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
        }

        .metric-card:hover {
            box-shadow: 6px 6px 0 rgba(0, 0, 0, 0.3);
            transform: translate(-2px, -2px);
            transition: all 0.1s ease;
        }

        .metric-value {
            color: #000000;
            letter-spacing: -0.05em;
            text-transform: uppercase;
        }

        .metric-label {
            color: #333333;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        .panel {
            background: #F5F5F5;
            border: 2px solid #000000;
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
        }

        .panel-header {
            background: #E5E5E5;
            border-bottom: 2px solid #000000;
            border-radius: 0;
        }

        .panel-title {
            color: #000000;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            font-weight: 900;
        }

        .panel-title::before {
            content: '■';
            margin-right: 0.5em;
            color: #E53935;
        }

        .status-dot {
            border-radius: 0;
        }

        .filter-chip {
            border: 2px solid #000000;
            border-radius: 0;
            background: #FFFFFF;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .filter-chip:hover {
            border-color: #E53935;
            box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
            background: #FAFAFA;
        }

        .filter-chip.active {
            background: #E53935;
            border-color: #000000;
            color: #FFFFFF;
            box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
        }

        .source-bar {
            box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
            border-radius: 0;
        }

        .activity-item:hover {
            background: #F5F5F5;
            border-radius: 0;
            border-left: 4px solid #E53935;
        }

        .footer-text {
            color: #333333;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }

        ::selection {
            background: #E53935;
            color: #FFFFFF;
        }

        /* Exposed grid structure */
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
};

/**
 * Registry of all available themes
 */
export const THEMES: Record<string, DashboardTheme> = {
	default: defaultTheme,
	chaos: chaosTheme,
	"terminal-amber": terminalAmberTheme,
	infrared: infraredTheme,
	forest: forestTheme,
	"midnight-bloom": midnightBloomTheme,
	blueprint: blueprintTheme,
	papercut: papercutTheme,
};

/**
 * Get a theme by ID, falling back to default if not found
 */
export function getTheme(themeId: string): DashboardTheme {
	return THEMES[themeId] ?? defaultTheme;
}

/**
 * Get all available theme IDs
 */
export function getAvailableThemes(): string[] {
	return Object.keys(THEMES);
}

/**
 * Generate CSS variables from a theme
 */
export function generateThemeCSS(theme: DashboardTheme): string {
	const { colors, fonts } = theme;
	return `
        :root {
            --bg-primary: ${colors.bgPrimary};
            --bg-secondary: ${colors.bgSecondary};
            --bg-tertiary: ${colors.bgTertiary};
            --bg-elevated: ${colors.bgElevated};
            --border-primary: ${colors.borderPrimary};
            --border-secondary: ${colors.borderSecondary};
            --text-primary: ${colors.textPrimary};
            --text-secondary: ${colors.textSecondary};
            --text-muted: ${colors.textMuted};
            --accent-blue: ${colors.accentBlue};
            --accent-green: ${colors.accentGreen};
            --accent-cyan: ${colors.accentCyan};
            --accent-amber: ${colors.accentAmber};
            --accent-orange: ${colors.accentOrange};
            --accent-purple: ${colors.accentPurple};
            --accent-pink: ${colors.accentPink};
            --accent-red: ${colors.accentRed};
            --chart-1: ${colors.chartColors[0]};
            --chart-2: ${colors.chartColors[1]};
            --chart-3: ${colors.chartColors[2]};
            --chart-4: ${colors.chartColors[3]};
            --chart-5: ${colors.chartColors[4]};
            --chart-6: ${colors.chartColors[5]};
            --chart-7: ${colors.chartColors[6]};
            --chart-8: ${colors.chartColors[7]};
            --font-primary: ${fonts.primary};
            --font-mono: ${fonts.mono};
        }
    `;
}
