/* ================================================================
   BUSI 305 Accounting Toolkit — Custom 3-Layer Cursor
   Loaded by all pages for consistent interactive cursor effect.
   Reads --accent CSS variable for glow color. Falls back to emerald.
   ================================================================ */
(function() {
    // Skip on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    // Create DOM elements
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    dot.id = 'cursor-dot';

    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.id = 'cursor-ring';

    const glow = document.createElement('div');
    glow.className = 'cursor-glow';
    glow.id = 'cursor-glow';

    document.body.appendChild(dot);
    document.body.appendChild(ring);
    document.body.appendChild(glow);

    // Set glow color from page accent
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    if (accent) {
        // Parse hex to rgba for glow
        let r = 52, g = 211, b = 153; // fallback emerald
        if (accent.startsWith('#') && accent.length >= 7) {
            r = parseInt(accent.slice(1,3), 16);
            g = parseInt(accent.slice(3,5), 16);
            b = parseInt(accent.slice(5,7), 16);
        }
        document.documentElement.style.setProperty('--cursor-glow', `rgba(${r},${g},${b},0.05)`);
    }

    let mouseX = -100, mouseY = -100;
    let dotX = -100, dotY = -100;
    let ringX = -100, ringY = -100;
    let glowX = -100, glowY = -100;

    document.addEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animate() {
        // Dot — fast follow
        dotX += (mouseX - dotX) * 0.35;
        dotY += (mouseY - dotY) * 0.35;
        dot.style.left = (dotX - 4) + 'px';
        dot.style.top = (dotY - 4) + 'px';

        // Ring — moderate lag
        ringX += (mouseX - ringX) * 0.15;
        ringY += (mouseY - ringY) * 0.15;
        ring.style.left = (ringX - 20) + 'px';
        ring.style.top = (ringY - 20) + 'px';

        // Glow — slow follow
        glowX += (mouseX - glowX) * 0.06;
        glowY += (mouseY - glowY) * 0.06;
        glow.style.left = (glowX - 250) + 'px';
        glow.style.top = (glowY - 250) + 'px';

        requestAnimationFrame(animate);
    }
    animate();

    // Hover detection — expand ring on interactive elements
    document.addEventListener('mouseover', function(e) {
        const el = e.target.closest('a, button, [onclick], input, select, .card');
        if (el) ring.classList.add('hovering');
    });
    document.addEventListener('mouseout', function(e) {
        const el = e.target.closest('a, button, [onclick], input, select, .card');
        if (el) ring.classList.remove('hovering');
    });

    // Hide when mouse leaves viewport
    document.addEventListener('mouseleave', function() {
        dot.style.opacity = '0';
        ring.style.opacity = '0';
    });
    document.addEventListener('mouseenter', function() {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
    });
})();
