/* ============================================
   AYUSH PORTFOLIO — Premium Animation Engine
   GSAP Timeline + Lenis Smooth Scroll
   Framer-quality letter-by-letter reveal
   ============================================ */

// ─── Disable Right Click & Dev Tools Shortcuts ───
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
    }
});

// ─── Register Plugins ───
gsap.registerPlugin(ScrollTrigger);

// ─── Mouse Trail Effect (Canvas) ───
(function initMouseTrail() {
    const canvas = document.getElementById('mouseTrail');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Configuration
    const TRAIL_COLOR = { r: 0, g: 0, b: 0 };  // #000000ff blue
    const TRAIL_LENGTH = 30;
    const LINE_WIDTH = 3;
    const SMOOTHING = 0.3;
    const FADE_DURATION = 0.8; // seconds

    const points = [];
    let lastTime = performance.now();

    // Resize canvas to match window (DPR-aware)
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // Track mouse
    document.addEventListener('pointermove', (e) => {
        const last = points[points.length - 1];
        const s = Math.max(0.001, 1 - SMOOTHING);
        const sx = last ? last.x + (e.clientX - last.x) * s : e.clientX;
        const sy = last ? last.y + (e.clientY - last.y) * s : e.clientY;

        points.push({ x: sx, y: sy, life: 1 });

        if (points.length > TRAIL_LENGTH) {
            points.splice(0, points.length - TRAIL_LENGTH);
        }
    }, { passive: true });

    // Render loop
    function animate() {
        const now = performance.now();
        let dt = (now - lastTime) / 1000;
        dt = Math.max(0, Math.min(dt, 0.05));
        lastTime = now;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Age points
        const decay = dt / Math.max(0.001, FADE_DURATION);
        for (let i = points.length - 1; i >= 0; i--) {
            points[i].life -= decay;
            if (points[i].life <= 0) points.splice(i, 1);
        }

        if (points.length < 2) {
            requestAnimationFrame(animate);
            return;
        }

        // Draw fading trail
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            const t = i / (points.length - 1);
            // Quadratic ease for fade along path
            const pathAlpha = 1 - (1 - t) * (1 - t);
            const a = pathAlpha * p2.life;
            const w = LINE_WIDTH * (0.3 + 0.7 * a);

            ctx.strokeStyle = `rgba(${TRAIL_COLOR.r},${TRAIL_COLOR.g},${TRAIL_COLOR.b},${Math.max(0, a)})`;
            ctx.lineWidth = Math.max(0.5, w);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
})();

// ─── Interactive Dot Grid with Gravity Pull ───
(function initDotGrid() {
    const canvas = document.getElementById('dotGrid');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const DOT_SPACING = 32;
    const DOT_RADIUS = 2;
    const DOT_COLOR = '#c8c8c8';
    const PULL_RADIUS = 150;   // how far the gravity reaches
    const PULL_STRENGTH = 25;  // max pixel displacement toward cursor

    // Smoothed mouse position (lerped via GSAP ticker)
    let mouse = { x: -9999, y: -9999 };
    let target = { x: -9999, y: -9999 };

    // Resize canvas to device pixel ratio for crisp dots
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();

    // Track raw mouse position
    document.addEventListener('mousemove', (e) => {
        target.x = e.clientX;
        target.y = e.clientY;
    });

    document.addEventListener('mouseleave', () => {
        target.x = -9999;
        target.y = -9999;
    });

    // Render loop — tied to GSAP ticker for sync with other animations
    gsap.ticker.add(() => {
        // Smooth lerp mouse position (feels organic, not snappy)
        mouse.x += (target.x - mouse.x) * 0.15;
        mouse.y += (target.y - mouse.y) * 0.15;

        draw();
    });

    function draw() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        ctx.clearRect(0, 0, w, h);

        // Calculate visible dot range
        const cols = Math.ceil(w / DOT_SPACING) + 1;
        const rows = Math.ceil(h / DOT_SPACING) + 1;

        // Offset so dots are centered + scroll with page
        const offsetX = (w % DOT_SPACING) / 2;
        const scrollY = window.scrollY || 0;
        const offsetY = ((h % DOT_SPACING) / 2) - (scrollY % DOT_SPACING);

        ctx.fillStyle = DOT_COLOR;

        for (let row = -1; row < rows + 1; row++) {
            for (let col = 0; col < cols; col++) {
                let baseX = offsetX + col * DOT_SPACING;
                let baseY = offsetY + row * DOT_SPACING;

                // Calculate distance from this dot to the (smoothed) mouse
                let dx = mouse.x - baseX;
                let dy = mouse.y - baseY;
                let dist = Math.sqrt(dx * dx + dy * dy);

                let drawX = baseX;
                let drawY = baseY;

                // If within pull radius, displace dot TOWARD cursor
                if (dist < PULL_RADIUS && dist > 0) {
                    // Easing: stronger pull closer to cursor (quadratic falloff)
                    let force = (1 - dist / PULL_RADIUS);
                    force = force * force; // quadratic ease-in for smooth falloff
                    let pullX = (dx / dist) * force * PULL_STRENGTH;
                    let pullY = (dy / dist) * force * PULL_STRENGTH;
                    drawX += pullX;
                    drawY += pullY;
                }

                ctx.beginPath();
                ctx.arc(drawX, drawY, DOT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
})();

// ─── Lenis Smooth Scroll Setup ───
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    infinite: false,
});

// Sync Lenis with GSAP ScrollTrigger
lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

// ─── Utility: Split text into per-character spans ───
// Uses Array.from() to correctly handle multi-byte emoji (surrogate pairs)
function splitTextToChars(element) {
    const text = element.textContent;
    element.innerHTML = '';
    element.setAttribute('aria-label', text);

    const chars = [];
    const graphemes = Array.from(text); // properly splits emoji

    graphemes.forEach((char) => {
        if (char === ' ') {
            const space = document.createElement('span');
            space.className = 'whitespace';
            space.innerHTML = '&nbsp;';
            element.appendChild(space);
        } else {
            const wrap = document.createElement('span');
            wrap.className = 'char-wrap';

            const inner = document.createElement('span');
            inner.className = 'char';
            inner.textContent = char;

            wrap.appendChild(inner);
            element.appendChild(wrap);
            chars.push(inner);
        }
    });

    return chars;
}

// ─── Utility: Split description into per-word spans ───
function splitTextToWords(element) {
    const text = element.textContent;
    element.innerHTML = '';
    element.setAttribute('aria-label', text);

    const words = text.split(' ');
    const wordEls = [];

    words.forEach((word, i) => {
        const wrap = document.createElement('span');
        wrap.className = 'char-wrap';
        wrap.style.marginRight = '0.3em';

        const inner = document.createElement('span');
        inner.className = 'char';
        inner.textContent = word;

        wrap.appendChild(inner);
        element.appendChild(wrap);
        wordEls.push(inner);
    });

    return wordEls;
}

// ─── DOM Ready ───
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('is-loading');
    lenis.stop(); // pause scroll during loading

    const pageLoader = document.getElementById('pageLoader');
    const pageWrapper = document.getElementById('pageWrapper');

    // ─── Prepare Split Text Elements ───
    const greetingEl = document.querySelector('.hero-greeting');
    const taglineEl = document.querySelector('.hero-tagline');

    // Split greeting into characters
    const greetingChars = splitTextToChars(greetingEl);

    // Split tagline into words (for smoother readability)
    const taglineWords = splitTextToWords(taglineEl);

    // Set initial states (prevents FOUC)
    gsap.set(greetingChars, { y: 40, opacity: 0, filter: 'blur(4px)' });
    gsap.set(taglineWords, { y: 40, opacity: 0, filter: 'blur(10px)' });
    gsap.set('.anim-hero-image', { scale: 0.8, opacity: 0 });
    gsap.set('.anim-btn-pop', { scale: 0.8, opacity: 0 });
    gsap.set('.anim-nav', { y: -20, opacity: 0 });

    // ─── Master Timeline ───
    function playMasterTimeline() {
        const master = gsap.timeline({
            defaults: {
                ease: 'power4.out',
            },
            onComplete: () => {
                // Start wave emoji
                const emoji = document.querySelector('.wave-emoji');
                if (emoji) emoji.classList.add('waving');
                // Resume Lenis smooth scroll
                lenis.start();
                // Init scroll animations after hero is done
                initScrollAnimations();
            }
        });

        // ── Phase 1: Page Fade-In ──
        master.fromTo(pageWrapper,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' },
            0
        );

        // ── Dot Grid Fade In ──
        const dotGrid = document.getElementById('dotGrid');
        if (dotGrid) {
            master.to(dotGrid, { opacity: 0.5, duration: 1.2, ease: 'power2.out' }, 0.3);
        }

        // ── Phase 2: Hero Image — smooth scale-up + fade-in ──
        master.to('.anim-hero-image', {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            onComplete: () => {
                // Start the floating/rocking idle animation
                const card = document.querySelector('.hero-image-card');
                if (card) card.classList.add('floating');
            }
        }, 0.3);

        // ── Phase 3: Letter-by-letter Heading Reveal ──
        master.to(greetingChars, {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 0.7,
            ease: 'power4.out',
            stagger: {
                each: 0.06,
                from: 'start',
            },
        }, 0.7);

        // ── Phase 4: Description Word-by-word Reveal (blur → clear) ──
        // Slower stagger (0.08s/word) + longer duration to match reference
        master.to(taglineWords, {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 1.8,
            ease: 'power4.out',
            stagger: {
                each: 0.08,
                from: 'start',
            },
        }, 1.1);

        // ── Phase 5: Button / Tag Pop Animation ──
        master.to('.anim-btn-pop', {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            ease: 'back.out(2)',
            stagger: 0.12,
        }, 1.9);

        // ── Phase 6: Navbar Fade In ──
        master.to('.anim-nav', {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power3.out',
            stagger: 0.06,
        }, 2.0);
    }

    // ─── Page Load Trigger ───
    window.addEventListener('load', () => {
        setTimeout(() => {
            // Fade out loader
            gsap.to(pageLoader, {
                opacity: 0,
                duration: 0.4,
                ease: 'power2.inOut',
                onComplete: () => {
                    pageLoader.style.display = 'none';
                    document.body.classList.remove('is-loading');
                    document.body.classList.add('loaded');
                    playMasterTimeline();
                }
            });
        }, 1500);
    });

    // Fallback if load already fired
    if (document.readyState === 'complete') {
        setTimeout(() => {
            gsap.to(pageLoader, {
                opacity: 0,
                duration: 0.4,
                ease: 'power2.inOut',
                onComplete: () => {
                    pageLoader.style.display = 'none';
                    document.body.classList.remove('is-loading');
                    document.body.classList.add('loaded');
                    playMasterTimeline();
                }
            });
        }, 800);
    }

    // ─── Scroll-Triggered Animations ───
    function initScrollAnimations() {
        // General scroll-reveal elements (fade + slide up)
        gsap.utils.toArray('.anim-scroll-reveal').forEach((el) => {
            gsap.fromTo(el,
                { y: 60, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 1,
                    ease: 'power4.out',
                    scrollTrigger: {
                        trigger: el,
                        start: 'top 85%',
                        end: 'top 55%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        });

        // Personal project cards — stagger within the grid
        const staggerCards = gsap.utils.toArray('.anim-scroll-stagger');
        if (staggerCards.length > 0) {
            gsap.fromTo(staggerCards,
                { y: 50, opacity: 0, scale: 0.95 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.8,
                    ease: 'power4.out',
                    stagger: {
                        each: 0.12,
                        from: 'start',
                    },
                    scrollTrigger: {
                        trigger: '.personal-grid',
                        start: 'top 80%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        }

        // About marquee — fade in on scroll
        const aboutMarquee = document.querySelector('.about-marquee');
        if (aboutMarquee) {
            gsap.fromTo(aboutMarquee,
                { opacity: 0, x: 40 },
                {
                    opacity: 1,
                    x: 0,
                    duration: 1,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: aboutMarquee,
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        }

        // CTA images — staggered
        const ctaImgs = gsap.utils.toArray('.cta-image-grid img');
        if (ctaImgs.length > 0) {
            gsap.fromTo(ctaImgs,
                { y: 20, opacity: 0, scale: 0.9 },
                {
                    y: 0,
                    opacity: 1,
                    scale: 1,
                    duration: 0.5,
                    ease: 'power3.out',
                    stagger: 0.06,
                    scrollTrigger: {
                        trigger: '.cta-image-grid',
                        start: 'top 85%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        }

        // Footer heading reveal
        gsap.fromTo('.footer-heading',
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                duration: 0.9,
                ease: 'power4.out',
                scrollTrigger: {
                    trigger: '.footer-heading',
                    start: 'top 85%',
                    toggleActions: 'play none none none',
                }
            }
        );

        // Footer email button pop
        const footerBtn = document.querySelector('.footer-section .anim-btn-pop');
        if (footerBtn) {
            gsap.fromTo(footerBtn,
                { scale: 0.8, opacity: 0 },
                {
                    scale: 1,
                    opacity: 1,
                    duration: 0.6,
                    ease: 'back.out(1.7)',
                    scrollTrigger: {
                        trigger: footerBtn,
                        start: 'top 90%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        }

        // About content paragraphs stagger
        const aboutParas = gsap.utils.toArray('.about-content p');
        if (aboutParas.length > 0) {
            gsap.fromTo(aboutParas,
                { y: 25, opacity: 0 },
                {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.12,
                    scrollTrigger: {
                        trigger: '.about-content',
                        start: 'top 80%',
                        toggleActions: 'play none none none',
                    },
                }
            );
        }
    }

    // ─── Navbar Scroll Effect ───
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });

    // ─── Mobile Menu ───
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenuBtn.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuBtn.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
    }

    // ─── Smooth Scroll for Anchor Links (via Lenis) ───
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                lenis.scrollTo(target, {
                    offset: -80,
                    duration: 1.2,
                });
                // Close mobile menu
                if (mobileMenuBtn && mobileMenu) {
                    mobileMenuBtn.classList.remove('active');
                    mobileMenu.classList.remove('active');
                }
            }
        });
    });

    // ─── Hero Image: floating animation is handled by CSS keyframes ───
    // (The .floating class is added after the GSAP entrance animation completes)

    // ─── Project Card Hover — Scale + Shadow + Tilt ───
    gsap.utils.toArray('.project-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                y: -8,
                scale: 1.02,
                boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
                duration: 0.4,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                y: 0,
                scale: 1,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                duration: 0.5,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });
    });

    // ─── Personal Card Hover — Scale + Lift ───
    gsap.utils.toArray('.personal-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, { y: -6, scale: 1.03, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
        });
        card.addEventListener('mouseleave', () => {
            gsap.to(card, { y: 0, scale: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        });
    });

    // ─── CTA Image Hover Tilt ───
    gsap.utils.toArray('.cta-image-grid img').forEach(img => {
        img.addEventListener('mouseenter', () => {
            gsap.to(img, { scale: 1.08, rotation: 1.5, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        });
        img.addEventListener('mouseleave', () => {
            gsap.to(img, { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out', overwrite: 'auto' });
        });
    });

    // ─── Cursor Parallax on Hero Image ───
    const heroImage = document.querySelector('.hero-image-card');
    if (heroImage) {
        document.addEventListener('mousemove', (e) => {
            const xPercent = (e.clientX / window.innerWidth - 0.5) * 2;
            const yPercent = (e.clientY / window.innerHeight - 0.5) * 2;
            gsap.to(heroImage, {
                x: xPercent * 15,
                y: yPercent * 10,
                rotateY: xPercent * 5,
                rotateX: -yPercent * 5,
                duration: 0.8,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });
    }

    // ─── Magnetic Button Effect ───
    const magneticBtns = document.querySelectorAll('.nav-btn, .btn, .footer-email-btn, .footer-social-icon');
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            gsap.to(btn, {
                x: x * 0.3,
                y: y * 0.3,
                duration: 0.3,
                ease: 'power2.out',
                overwrite: 'auto'
            });
        });
        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, {
                x: 0,
                y: 0,
                duration: 0.5,
                ease: 'elastic.out(1, 0.4)',
                overwrite: 'auto'
            });
        });
    });

    // ─── Copyright Year ───
    const yearEl = document.querySelector('.footer-bottom p');
    if (yearEl) {
        yearEl.innerHTML = `&copy; Ayush, ${new Date().getFullYear()}. Built with ♥`;
    }
});
