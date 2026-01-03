import type { DashboardTheme } from "./types.ts";

export const forestTheme: DashboardTheme = {
	id: "forest",
	name: "Forest",
	description: "Descend into a misty grove",
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
            background: #1A2F1A;
            overflow-x: hidden;
        }

        [data-theme="forest"] .forest-parallax-bg {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 0;
            will-change: transform;
        }

        [data-theme="forest"] .forest-mist {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 100vh;
            background: linear-gradient(
                180deg,
                rgba(26, 47, 26, 0.95) 0%,
                rgba(26, 47, 26, 0.7) 20%,
                rgba(26, 47, 26, 0.3) 50%,
                transparent 80%
            );
            opacity: var(--mist-opacity, 1);
            transition: opacity 0.1s ease-out;
        }

        [data-theme="forest"] .forest-trees-left,
        [data-theme="forest"] .forest-trees-right {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 120px;
            pointer-events: none;
        }

        [data-theme="forest"] .forest-trees-left {
            left: 0;
        }

        [data-theme="forest"] .forest-trees-right {
            right: 0;
        }

        [data-theme="forest"] .forest-tree {
            position: absolute;
            width: 60px;
            opacity: 0.15;
            fill: #4ADE80;
        }

        [data-theme="forest"] .forest-tree.far {
            opacity: 0.08;
            transform: scale(0.7);
        }

        [data-theme="forest"] .forest-tree.mid {
            opacity: 0.12;
            transform: scale(0.85);
        }

        [data-theme="forest"] .forest-tree.near {
            opacity: 0.18;
        }

        [data-theme="forest"] .header-bar {
            background: rgba(26, 47, 26, 0.9);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid #4ADE8030;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        [data-theme="forest"] .logo-icon {
            background: #4ADE80;
            color: #1A2F1A;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
        }

        [data-theme="forest"] .container {
            position: relative;
            z-index: 1;
        }

        [data-theme="forest"] .metrics-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        [data-theme="forest"] .metric-card {
            background: linear-gradient(
                180deg,
                rgba(34, 51, 34, 0.8) 0%,
                rgba(45, 36, 24, 0.6) 100%
            );
            border: 1px solid #4ADE8030;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            position: relative;
            overflow: hidden;
            transform: scale(var(--depth-scale, 0.92)) translateY(var(--depth-y, 20px));
            opacity: var(--depth-opacity, 0.4);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        box-shadow 0.3s ease;
        }

        [data-theme="forest"] .metric-card.revealed {
            --depth-scale: 1;
            --depth-y: 0px;
            --depth-opacity: 1;
        }

        [data-theme="forest"] .metric-card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(
                180deg,
                rgba(74, 222, 128, 0.05) 0%,
                transparent 50%
            );
            pointer-events: none;
        }

        [data-theme="forest"] .metric-card::after {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(26, 47, 26, var(--mist-overlay, 0.3));
            pointer-events: none;
            transition: background 0.4s ease;
        }

        [data-theme="forest"] .metric-card.revealed::after {
            --mist-overlay: 0;
        }

        [data-theme="forest"] .metric-card:hover {
            box-shadow: 0 8px 30px rgba(74, 222, 128, 0.2);
            border-color: #4ADE8050;
        }

        [data-theme="forest"] .metric-value {
            text-shadow: 0 0 12px rgba(74, 222, 128, 0.4);
        }

        [data-theme="forest"] .secondary-metrics {
            background: linear-gradient(
                90deg,
                rgba(34, 51, 34, 0.7) 0%,
                rgba(45, 36, 24, 0.5) 100%
            );
            border: 1px solid #4ADE8030;
            border-radius: 12px;
            transform: scale(var(--depth-scale, 0.92)) translateY(var(--depth-y, 20px));
            opacity: var(--depth-opacity, 0.4);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-theme="forest"] .secondary-metrics.revealed {
            --depth-scale: 1;
            --depth-y: 0px;
            --depth-opacity: 1;
        }

        [data-theme="forest"] .filters-section {
            transform: scale(var(--depth-scale, 0.92)) translateY(var(--depth-y, 20px));
            opacity: var(--depth-opacity, 0.4);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-theme="forest"] .filters-section.revealed {
            --depth-scale: 1;
            --depth-y: 0px;
            --depth-opacity: 1;
        }

        [data-theme="forest"] .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 380px;
            gap: 24px;
        }

        [data-theme="forest"] .panel {
            background: linear-gradient(
                180deg,
                rgba(34, 51, 34, 0.85) 0%,
                rgba(45, 36, 24, 0.7) 100%
            );
            border: 1px solid #4ADE8030;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            position: relative;
            overflow: hidden;
            transform: scale(var(--depth-scale, 0.88)) translateY(var(--depth-y, 40px));
            opacity: var(--depth-opacity, 0.3);
            transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        box-shadow 0.3s ease;
        }

        [data-theme="forest"] .panel.revealed {
            --depth-scale: 1;
            --depth-y: 0px;
            --depth-opacity: 1;
        }

        [data-theme="forest"] .panel::before {
            content: '';
            position: absolute;
            inset: 0;
            background: rgba(26, 47, 26, var(--mist-overlay, 0.4));
            pointer-events: none;
            transition: background 0.5s ease;
        }

        [data-theme="forest"] .panel.revealed::before {
            --mist-overlay: 0;
        }

        [data-theme="forest"] .panel:hover {
            box-shadow: 0 12px 40px rgba(74, 222, 128, 0.15);
        }

        [data-theme="forest"] .panel-header {
            background: linear-gradient(
                90deg,
                rgba(74, 222, 128, 0.08) 0%,
                transparent 100%
            );
            border-bottom: 1px solid #22C55E20;
            position: relative;
            z-index: 1;
        }

        [data-theme="forest"] .panel-title {
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
        }

        [data-theme="forest"] .panel-title::before {
            content: '🌲';
            margin-right: 0.5em;
        }

        [data-theme="forest"] .panel-body {
            position: relative;
            z-index: 1;
        }

        [data-theme="forest"] .filter-chip {
            border: 1px solid #4ADE8030;
            border-radius: 8px;
            background: rgba(34, 51, 34, 0.5);
            transition: all 0.2s ease;
        }

        [data-theme="forest"] .filter-chip:hover {
            border-color: #4ADE80;
            background: rgba(74, 222, 128, 0.1);
            box-shadow: 0 0 12px rgba(74, 222, 128, 0.2);
        }

        [data-theme="forest"] .filter-chip.active {
            background: rgba(74, 222, 128, 0.15);
            border-color: #4ADE80;
            color: #86EFAC;
        }

        [data-theme="forest"] .source-bar {
            border-radius: 6px;
            box-shadow: 0 0 8px currentColor;
        }

        [data-theme="forest"] .activity-item {
            transition: all 0.2s ease;
            border-radius: 6px;
        }

        [data-theme="forest"] .activity-item:hover {
            background: rgba(74, 222, 128, 0.05);
            transform: translateX(4px);
        }

        [data-theme="forest"] .footer {
            position: relative;
            z-index: 1;
        }

        [data-theme="forest"] .footer-text {
            text-shadow: 0 0 8px rgba(74, 222, 128, 0.2);
        }

        [data-theme="forest"] ::selection {
            background: #4ADE80;
            color: #1A2F1A;
        }

        [data-theme="forest"] ::-webkit-scrollbar {
            width: 8px;
        }

        [data-theme="forest"] ::-webkit-scrollbar-track {
            background: #1A2F1A;
        }

        [data-theme="forest"] ::-webkit-scrollbar-thumb {
            background: #4ADE8040;
            border-radius: 4px;
        }

        [data-theme="forest"] ::-webkit-scrollbar-thumb:hover {
            background: #4ADE8060;
        }

        @media (max-width: 1200px) {
            [data-theme="forest"] .metrics-grid {
                grid-template-columns: repeat(3, 1fr);
            }
        }

        @media (max-width: 768px) {
            [data-theme="forest"] .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            [data-theme="forest"] .forest-trees-left,
            [data-theme="forest"] .forest-trees-right {
                width: 60px;
            }
        }
    `,
	animations: `
        @keyframes mistDrift {
            0%, 100% {
                transform: translateX(0) translateY(0);
            }
            50% {
                transform: translateX(10px) translateY(-5px);
            }
        }
    `,
	customJS: `
        (function() {
            const bg = document.createElement('div');
            bg.className = 'forest-parallax-bg';
            bg.innerHTML = \`
                <div class="forest-mist"></div>
                <div class="forest-trees-left">
                    <svg class="forest-tree far" style="top: 5%; left: 20px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                    <svg class="forest-tree mid" style="top: 25%; left: 40px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                    <svg class="forest-tree near" style="top: 50%; left: 15px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                    <svg class="forest-tree far" style="top: 75%; left: 50px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                </div>
                <div class="forest-trees-right">
                    <svg class="forest-tree mid" style="top: 10%; right: 30px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                    <svg class="forest-tree near" style="top: 35%; right: 10px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                    <svg class="forest-tree far" style="top: 60%; right: 45px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                    <svg class="forest-tree mid" style="top: 85%; right: 20px" viewBox="0 0 60 120">
                        <path d="M30 0 L5 50 L15 50 L0 90 L20 90 L20 120 L40 120 L40 90 L60 90 L45 50 L55 50 Z"/>
                    </svg>
                </div>
            \`;
            document.body.insertBefore(bg, document.body.firstChild);

            const mist = bg.querySelector('.forest-mist');
            const treesLeft = bg.querySelector('.forest-trees-left');
            const treesRight = bg.querySelector('.forest-trees-right');

            const depthElements = document.querySelectorAll(
                '.metric-card, .secondary-metrics, .filters-section, .panel'
            );

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            });

            depthElements.forEach(el => observer.observe(el));

            let ticking = false;
            const handleScroll = () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        const scrollY = window.scrollY;
                        const maxScroll = document.body.scrollHeight - window.innerHeight;
                        const scrollProgress = Math.min(scrollY / Math.max(maxScroll, 1), 1);

                        const mistOpacity = Math.max(0, 1 - scrollProgress * 2.5);
                        mist.style.setProperty('--mist-opacity', mistOpacity);

                        const parallaxOffset = scrollY * 0.3;
                        treesLeft.style.transform = 'translateY(' + (-parallaxOffset) + 'px)';
                        treesRight.style.transform = 'translateY(' + (-parallaxOffset) + 'px)';

                        ticking = false;
                    });
                    ticking = true;
                }
            };

            window.addEventListener('scroll', handleScroll, { passive: true });
            handleScroll();
        })();
    `,
};
