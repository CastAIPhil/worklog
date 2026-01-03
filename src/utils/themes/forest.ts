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
            background: linear-gradient(180deg, #0F1F0F 0%, #1A2F1A 50%, #152815 100%);
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
            overflow: hidden;
        }

        [data-theme="forest"] .forest-layer {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            will-change: transform;
        }

        [data-theme="forest"] .forest-mountains {
            opacity: 0.08;
            fill: #0A150A;
        }

        [data-theme="forest"] .forest-far-trees {
            opacity: 0.12;
            fill: #1A3A1A;
        }

        [data-theme="forest"] .forest-mid-trees {
            opacity: 0.18;
            fill: #2D5A2D;
        }

        [data-theme="forest"] .forest-near-foliage {
            opacity: 0.25;
            fill: #3D7A3D;
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

        [data-theme="forest"] .mist-wisp {
            position: absolute;
            width: 200px;
            height: 100px;
            background: radial-gradient(
                ellipse at center,
                rgba(74, 222, 128, 0.08) 0%,
                transparent 70%
            );
            border-radius: 50%;
            filter: blur(20px);
            animation: mistDrift 25s ease-in-out infinite;
        }

        [data-theme="forest"] .mist-wisp:nth-child(1) {
            top: 10%;
            left: -10%;
            animation-delay: 0s;
            animation-duration: 30s;
        }

        [data-theme="forest"] .mist-wisp:nth-child(2) {
            top: 30%;
            right: -10%;
            animation-delay: 5s;
            animation-duration: 35s;
            animation-direction: reverse;
        }

        [data-theme="forest"] .mist-wisp:nth-child(3) {
            top: 50%;
            left: -15%;
            animation-delay: 10s;
            animation-duration: 40s;
        }

        [data-theme="forest"] .mist-wisp:nth-child(4) {
            top: 70%;
            right: -12%;
            animation-delay: 15s;
            animation-duration: 38s;
            animation-direction: reverse;
        }

        [data-theme="forest"] .light-rays {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 60vh;
            background: linear-gradient(
                165deg,
                transparent 0%,
                rgba(74, 222, 128, 0.02) 20%,
                transparent 40%,
                rgba(110, 231, 183, 0.015) 60%,
                transparent 80%
            );
            opacity: 0.4;
            animation: lightShift 20s ease-in-out infinite;
        }

        [data-theme="forest"] .particles {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }

        [data-theme="forest"] .particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: #4ADE8040;
            border-radius: 50%;
            animation: particleFloat linear infinite;
        }

        [data-theme="forest"] .header-bar {
            background: rgba(26, 47, 26, 0.9);
            backdrop-filter: blur(12px);
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
            [data-theme="forest"] .mist-wisp {
                display: none;
            }
        }
    `,
	animations: `
        @keyframes mistDrift {
            0% {
                transform: translateX(0) translateY(0) scale(1);
                opacity: 0.3;
            }
            25% {
                opacity: 0.6;
            }
            50% {
                transform: translateX(120vw) translateY(-30px) scale(1.3);
                opacity: 0.4;
            }
            75% {
                opacity: 0.5;
            }
            100% {
                transform: translateX(0) translateY(0) scale(1);
                opacity: 0.3;
            }
        }

        @keyframes lightShift {
            0%, 100% {
                opacity: 0.3;
                transform: translateX(0);
            }
            50% {
                opacity: 0.5;
                transform: translateX(20px);
            }
        }

        @keyframes particleFloat {
            0% {
                transform: translateY(100vh) translateX(0) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 0.6;
            }
            90% {
                opacity: 0.3;
            }
            100% {
                transform: translateY(-100px) translateX(50px) rotate(360deg);
                opacity: 0;
            }
        }

        @keyframes treeSway {
            0%, 100% {
                transform: rotate(0deg);
            }
            50% {
                transform: rotate(0.5deg);
            }
        }
    `,
	customJS: `
        (function() {
            const bg = document.createElement('div');
            bg.className = 'forest-parallax-bg';
            bg.innerHTML = \`
                <div class="forest-layer" data-speed="0.1">
                    <svg class="forest-mountains" viewBox="0 0 1200 400" preserveAspectRatio="none" style="position: absolute; bottom: 0; width: 100%; height: 40vh;">
                        <path d="M0,400 L0,200 Q100,150 200,180 T400,160 T600,140 T800,170 T1000,150 L1200,180 L1200,400 Z"/>
                        <path d="M0,400 L0,250 Q150,200 300,220 T600,200 T900,210 L1200,230 L1200,400 Z" opacity="0.6"/>
                    </svg>
                </div>
                <div class="forest-layer" data-speed="0.2">
                    <svg class="forest-far-trees" style="position: absolute; left: 0; top: 20%; width: 150px; height: 200px;" viewBox="0 0 100 150">
                        <ellipse cx="50" cy="120" rx="25" ry="35" opacity="0.8"/>
                        <polygon points="50,0 20,80 80,80" opacity="0.6"/>
                        <rect x="45" y="80" width="10" height="70" opacity="0.7"/>
                    </svg>
                    <svg class="forest-far-trees" style="position: absolute; right: 5%; top: 35%; width: 180px; height: 220px;" viewBox="0 0 100 150">
                        <polygon points="50,20 10,100 30,100 0,140 40,140 40,150 60,150 60,140 100,140 70,100 90,100"/>
                    </svg>
                    <svg class="forest-far-trees" style="position: absolute; left: 8%; top: 55%; width: 130px; height: 180px;" viewBox="0 0 100 150">
                        <ellipse cx="50" cy="100" rx="30" ry="40"/>
                        <ellipse cx="35" cy="80" rx="20" ry="30" opacity="0.8"/>
                        <ellipse cx="65" cy="85" rx="22" ry="32" opacity="0.8"/>
                    </svg>
                </div>
                <div class="forest-layer" data-speed="0.35">
                    <svg class="forest-mid-trees" style="position: absolute; left: 5%; top: 10%; width: 100px; height: 160px;" viewBox="0 0 60 120">
                        <path d="M30,0 L10,40 L20,40 L5,70 L25,70 L25,120 L35,120 L35,70 L55,70 L40,40 L50,40 Z"/>
                    </svg>
                    <svg class="forest-mid-trees" style="position: absolute; right: 10%; top: 25%; width: 120px; height: 180px;" viewBox="0 0 80 140">
                        <ellipse cx="40" cy="100" rx="35" ry="45"/>
                        <rect x="35" y="100" width="10" height="40"/>
                        <ellipse cx="40" cy="70" rx="30" ry="38" opacity="0.9"/>
                    </svg>
                    <svg class="forest-mid-trees" style="position: absolute; left: 12%; top: 45%; width: 90px; height: 150px;" viewBox="0 0 60 120">
                        <polygon points="30,10 5,50 15,50 0,85 20,85 20,120 40,120 40,85 60,85 45,50 55,50"/>
                        <polygon points="30,0 15,30 45,30" opacity="0.7"/>
                    </svg>
                    <svg class="forest-mid-trees" style="position: absolute; right: 8%; top: 60%; width: 110px; height: 170px;" viewBox="0 0 70 130">
                        <ellipse cx="35" cy="90" rx="28" ry="38"/>
                        <ellipse cx="35" cy="65" rx="25" ry="30" opacity="0.85"/>
                        <rect x="30" y="90" width="10" height="40"/>
                    </svg>
                </div>
                <div class="forest-layer" data-speed="0.5">
                    <svg class="forest-near-foliage" style="position: absolute; left: 0; top: 15%; width: 150px; height: 120px;" viewBox="0 0 100 80">
                        <path d="M0,80 Q10,60 20,65 T40,70 T60,60 T80,68 L100,70 L100,80 Z" opacity="0.7"/>
                        <ellipse cx="25" cy="50" rx="15" ry="20" opacity="0.5"/>
                        <ellipse cx="45" cy="55" rx="12" ry="18" opacity="0.6"/>
                    </svg>
                    <svg class="forest-near-foliage" style="position: absolute; right: 0; top: 40%; width: 180px; height: 140px;" viewBox="0 0 120 100">
                        <path d="M120,100 Q110,70 100,75 T80,80 T60,72 T40,78 L0,75 L0,100 Z" opacity="0.6"/>
                        <path d="M100,60 Q95,50 90,55 L85,60 Q80,55 75,58 L70,62" fill="none" stroke="currentColor" stroke-width="2" opacity="0.4"/>
                    </svg>
                    <svg class="forest-near-foliage" style="position: absolute; left: 3%; top: 70%; width: 140px; height: 100px;" viewBox="0 0 100 70">
                        <ellipse cx="30" cy="40" rx="25" ry="30" opacity="0.5"/>
                        <ellipse cx="60" cy="45" rx="20" ry="25" opacity="0.6"/>
                        <path d="M20,50 L25,30 L22,28 M30,55 L35,35 L32,33 M40,52 L45,32 L42,30" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
                    </svg>
                </div>
                <div class="forest-mist"></div>
                <div class="mist-wisp"></div>
                <div class="mist-wisp"></div>
                <div class="mist-wisp"></div>
                <div class="mist-wisp"></div>
                <div class="light-rays"></div>
                <div class="particles" id="particles"></div>
            \`;
            document.body.insertBefore(bg, document.body.firstChild);

            const mist = bg.querySelector('.forest-mist');
            const layers = bg.querySelectorAll('[data-speed]');
            const particlesContainer = bg.querySelector('#particles');

            for (let i = 0; i < 15; i++) {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.animationDuration = (15 + Math.random() * 20) + 's';
                particle.style.animationDelay = (Math.random() * 10) + 's';
                particle.style.opacity = 0.2 + Math.random() * 0.3;
                particlesContainer.appendChild(particle);
            }

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

                        layers.forEach(layer => {
                            const speed = parseFloat(layer.getAttribute('data-speed')) || 0.3;
                            const offset = scrollY * speed;
                            layer.style.transform = 'translateY(' + (-offset) + 'px)';
                        });

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
