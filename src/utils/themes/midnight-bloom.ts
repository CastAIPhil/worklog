import type { DashboardTheme } from "./types.ts";

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
        [data-theme="midnight-bloom"] body {
            background: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
        }

        [data-theme="midnight-bloom"] .header-bar {
            background: rgba(251, 113, 133, 0.05);
            border-bottom: 1px solid #FB718540;
        }

        [data-theme="midnight-bloom"] .logo-icon {
            background: #FB7185;
            color: #0F172A;
            border-radius: 14px;
            box-shadow: 0 0 20px rgba(251, 113, 133, 0.3);
            animation: bloomGlow 4s ease-in-out infinite;
        }

        /* MAGAZINE EDITORIAL LAYOUT - Asymmetric 70/30 */
        [data-theme="midnight-bloom"] .container {
            max-width: 1800px;
        }

        [data-theme="midnight-bloom"] .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 48px;
            margin-bottom: 48px;
        }

        /* FEATURED HERO METRICS - Left Column */
        [data-theme="midnight-bloom"] .metric-card:nth-child(1),
        [data-theme="midnight-bloom"] .metric-card:nth-child(2) {
            grid-column: 1;
            padding: 48px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.6) 100%);
            border: 1px solid #FB718540;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(251, 113, 133, 0.15);
            position: relative;
            overflow: hidden;
            animation: editorialFadeIn 0.8s ease-out backwards;
        }

        [data-theme="midnight-bloom"] .metric-card:nth-child(1) {
            animation-delay: 0.1s;
        }

        [data-theme="midnight-bloom"] .metric-card:nth-child(2) {
            animation-delay: 0.2s;
        }

        /* HERO METRICS - Large Typography */
        [data-theme="midnight-bloom"] .metric-card:nth-child(1) .metric-value,
        [data-theme="midnight-bloom"] .metric-card:nth-child(2) .metric-value {
            font-size: 72px;
            font-weight: 300;
            letter-spacing: -0.04em;
            margin: 24px 0;
        }

        [data-theme="midnight-bloom"] .metric-card:nth-child(1) .metric-label,
        [data-theme="midnight-bloom"] .metric-card:nth-child(2) .metric-label {
            font-size: 16px;
            font-family: var(--font-primary);
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        /* SIDEBAR METRICS - Right Column */
        [data-theme="midnight-bloom"] .metric-card:nth-child(3),
        [data-theme="midnight-bloom"] .metric-card:nth-child(4),
        [data-theme="midnight-bloom"] .metric-card:nth-child(5),
        [data-theme="midnight-bloom"] .metric-card:nth-child(6) {
            grid-column: 2;
            padding: 24px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.6) 100%);
            border: 1px solid #FB718540;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(251, 113, 133, 0.15);
            position: relative;
            overflow: hidden;
            animation: editorialSlideIn 0.6s ease-out backwards;
        }

        [data-theme="midnight-bloom"] .metric-card:nth-child(3) { animation-delay: 0.3s; }
        [data-theme="midnight-bloom"] .metric-card:nth-child(4) { animation-delay: 0.35s; }
        [data-theme="midnight-bloom"] .metric-card:nth-child(5) { animation-delay: 0.4s; }
        [data-theme="midnight-bloom"] .metric-card:nth-child(6) { animation-delay: 0.45s; }

        [data-theme="midnight-bloom"] .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.04"/></svg>');
            pointer-events: none;
        }

        [data-theme="midnight-bloom"] .metric-card:hover {
            box-shadow: 0 8px 35px rgba(251, 113, 133, 0.3);
            transform: translateY(-4px);
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            border-color: #FB718560;
        }

        [data-theme="midnight-bloom"] .metric-value {
            text-shadow: 0 0 8px rgba(251, 113, 133, 0.2);
            letter-spacing: -0.03em;
        }

        [data-theme="midnight-bloom"] .metric-label {
            text-shadow: 0 0 4px rgba(251, 113, 133, 0.15);
            letter-spacing: 0.02em;
        }

        [data-theme="midnight-bloom"] .main-grid {
            display: grid;
            grid-template-columns: 1fr 360px;
            gap: 48px;
        }

        [data-theme="midnight-bloom"] .panel:nth-child(1) {
            grid-column: 1;
            grid-row: span 2;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.6) 100%);
            border: 1px solid #FB718540;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(251, 113, 133, 0.12);
            position: relative;
            overflow: hidden;
            animation: editorialFadeIn 0.8s ease-out 0.5s backwards;
        }

        [data-theme="midnight-bloom"] .panel:nth-child(2),
        [data-theme="midnight-bloom"] .panel:nth-child(3) {
            grid-column: 2;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.6) 100%);
            border: 1px solid #FB718540;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(251, 113, 133, 0.12);
            position: relative;
            overflow: hidden;
            animation: editorialSlideIn 0.6s ease-out backwards;
        }

        [data-theme="midnight-bloom"] .panel:nth-child(2) { animation-delay: 0.55s; }
        [data-theme="midnight-bloom"] .panel:nth-child(3) { animation-delay: 0.6s; }

        [data-theme="midnight-bloom"] .panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100" height="100" filter="url(%23noise)" opacity="0.04"/></svg>');
            pointer-events: none;
        }

        [data-theme="midnight-bloom"] .panel-header {
            background: linear-gradient(90deg, rgba(251, 113, 133, 0.08), rgba(234, 88, 12, 0.05));
            border-bottom: 1px solid #FB718530;
            border-radius: 16px 16px 0 0;
        }

        [data-theme="midnight-bloom"] .panel-title {
            text-shadow: 0 0 6px rgba(251, 113, 133, 0.2);
            letter-spacing: 0.02em;
            font-weight: 500;
            font-family: var(--font-primary);
        }

        [data-theme="midnight-bloom"] .panel-title::before {
            content: '🌸';
            margin-right: 0.5em;
            text-shadow: 0 0 8px rgba(251, 113, 133, 0.4);
        }

        [data-theme="midnight-bloom"] .status-dot {
            box-shadow: 0 0 8px currentColor;
            animation: bloomGlow 4s ease-in-out infinite;
        }

        [data-theme="midnight-bloom"] .filter-chip {
            border: 1px solid #FB718540;
            border-radius: 14px;
            background: rgba(251, 113, 133, 0.05);
        }

        [data-theme="midnight-bloom"] .filter-chip:hover {
            border-color: #FB7185;
            box-shadow: 0 0 15px rgba(251, 113, 133, 0.25);
            background: rgba(251, 113, 133, 0.1);
        }

        [data-theme="midnight-bloom"] .filter-chip.active {
            background: rgba(251, 113, 133, 0.15);
            border-color: #FB7185;
            color: #FB7185;
            box-shadow: 0 0 15px rgba(251, 113, 133, 0.35);
        }

        [data-theme="midnight-bloom"] .source-bar {
            box-shadow: 0 0 8px currentColor;
            border-radius: 14px;
        }

        [data-theme="midnight-bloom"] .activity-item:hover {
            background: rgba(251, 113, 133, 0.05);
            border-radius: 10px;
        }

        [data-theme="midnight-bloom"] .footer-text {
            text-shadow: 0 0 6px rgba(251, 113, 133, 0.2);
            letter-spacing: 0.02em;
        }

        [data-theme="midnight-bloom"] ::selection {
            background: #FB7185;
            color: #0F172A;
        }

        [data-theme="midnight-bloom"] body::before {
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

        @keyframes editorialFadeIn {
            0% {
                opacity: 0;
                transform: translateY(30px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes editorialSlideIn {
            0% {
                opacity: 0;
                transform: translateX(30px);
            }
            100% {
                opacity: 1;
                transform: translateX(0);
            }
        }
    `,
};
