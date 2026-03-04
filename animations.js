/* ================================================================
   BUSI 305 Accounting Toolkit — Shared Animations
   Scroll reveals, Chart.js enhancements, diagram animations,
   and cursor-proximity effects.

   Load order: after Chart.js CDN (if present), before page scripts.
   Chart.js plugin registers immediately; DOM effects wait for load.
   ================================================================ */

// ── Chart.js enhancements (register immediately) ──
if (typeof Chart !== 'undefined') {

    // Crosshair plugin — draws accent-colored guide lines at cursor
    Chart.register({
        id: 'luxuryCrosshair',
        afterEvent: function(chart, args) {
            var evt = args.event;
            if (evt.type === 'mousemove') {
                chart._crosshairX = evt.x;
                chart._crosshairY = evt.y;
                chart._crosshairActive = true;
            } else if (evt.type === 'mouseout') {
                chart._crosshairActive = false;
            }
        },
        afterDraw: function(chart) {
            if (!chart._crosshairActive) return;
            var ctx = chart.ctx;
            var area = chart.chartArea;
            if (!area) return;
            var x = chart._crosshairX;
            var y = chart._crosshairY;
            if (x < area.left || x > area.right || y < area.top || y > area.bottom) return;

            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.lineWidth = 0.8;
            var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#10b981';
            ctx.strokeStyle = accent + '60';

            // Vertical
            ctx.beginPath();
            ctx.moveTo(x, area.top);
            ctx.lineTo(x, area.bottom);
            ctx.stroke();
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(area.left, y);
            ctx.lineTo(area.right, y);
            ctx.stroke();
            ctx.restore();
        }
    });

    // Enhanced defaults
    Chart.defaults.animation = { duration: 800, easing: 'easeOutQuart' };
    Chart.defaults.elements.point.hoverRadius = 7;
    Chart.defaults.elements.point.hoverBorderWidth = 2;
    Chart.defaults.elements.bar.hoverBorderWidth = 1;
    Chart.defaults.elements.bar.hoverBorderColor = 'rgba(255,255,255,0.3)';
    Chart.defaults.interaction = { mode: 'index', intersect: false };

    // Tooltip styling
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(8,9,13,0.92)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { size: 11, weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont = { size: 12 };
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
}


// ── DOM-dependent animations (wait for content) ──
document.addEventListener('DOMContentLoaded', function() {

    // ── 1. Scroll-triggered entrance animations ──
    var revealObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    // Only reveal elements in the ACTIVE tab (or all if no tabs)
    function observeVisibleCards() {
        var activePanel = document.querySelector('.tab-panel.active, .tab-content:not(.hidden)');
        var scope = activePanel || document;
        scope.querySelectorAll(
            '[class*="bg-slate-800"][class*="rounded-xl"], ' +
            '[class*="bg-slate-800"][class*="rounded-lg"], ' +
            '.t-account, [class*="from-emerald-500"], .overflow-x-auto'
        ).forEach(function(el, i) {
            if (!el.classList.contains('revealed')) {
                el.classList.add('reveal-target');
                el.style.transitionDelay = Math.min(i * 0.05, 0.35) + 's';
                revealObserver.observe(el);
            }
        });
    }
    observeVisibleCards();


    // ── 2. Diagram animations ──

    // Statement connection arc — animate arrows on hover
    var arcContainer = document.querySelector('.stmt-arc-container');
    if (arcContainer) {
        arcContainer.addEventListener('mouseenter', function() {
            arcContainer.classList.add('arc-active');
        });
        arcContainer.addEventListener('mouseleave', function() {
            arcContainer.classList.remove('arc-active');
        });
    }

    // PV/FV timeline — light up dots sequentially on scroll-in
    document.querySelectorAll('.timeline').forEach(function(tl) {
        var wrapper = tl.closest('.bg-slate-900\\/60, [class*="bg-slate-900"]');
        if (!wrapper) wrapper = tl.parentElement;
        var dots = tl.querySelectorAll('.tl-dot');
        var triggered = false;

        function lightUp() {
            if (triggered) return;
            triggered = true;
            tl.classList.add('tl-animate');
            dots.forEach(function(dot, i) {
                setTimeout(function() {
                    dot.classList.add('tl-lit');
                }, i * 150);
            });
        }

        // Trigger on scroll into view
        var tlObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    lightUp();
                    tlObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        tlObserver.observe(wrapper || tl);

        // Also trigger on hover for re-play
        (wrapper || tl).addEventListener('mouseenter', function() {
            triggered = false;
            tl.classList.remove('tl-animate');
            dots.forEach(function(d) { d.classList.remove('tl-lit'); });
            requestAnimationFrame(function() {
                requestAnimationFrame(function() { lightUp(); });
            });
        });
    });

    // Timing diagram — traveling dot on hover
    document.querySelectorAll('.timing-bar').forEach(function(bar) {
        bar.addEventListener('mouseenter', function() {
            bar.classList.add('timing-active');
        });
        bar.addEventListener('mouseleave', function() {
            bar.classList.remove('timing-active');
        });
    });

    // Accounting cycle — sequential pulse on hover
    var cycleContainer = document.querySelector('.acct-cycle');
    if (cycleContainer) {
        var cycleSteps = cycleContainer.querySelectorAll('.cycle-step');
        var cycleArrows = cycleContainer.querySelectorAll('.cycle-arrow');
        var cycleTimer = null;

        cycleContainer.addEventListener('mouseenter', function() {
            var i = 0;
            function pulseNext() {
                // Reset previous
                cycleSteps.forEach(function(s) { s.classList.remove('cycle-highlight'); });
                cycleArrows.forEach(function(a) { a.classList.remove('cycle-arrow-active'); });

                if (i < cycleSteps.length) {
                    cycleSteps[i].classList.add('cycle-highlight');
                    if (i > 0 && cycleArrows[i - 1]) cycleArrows[i - 1].classList.add('cycle-arrow-active');
                    i++;
                    cycleTimer = setTimeout(pulseNext, 400);
                } else {
                    // Loop
                    i = 0;
                    cycleTimer = setTimeout(pulseNext, 600);
                }
            }
            pulseNext();
        });

        cycleContainer.addEventListener('mouseleave', function() {
            clearTimeout(cycleTimer);
            cycleSteps.forEach(function(s) { s.classList.remove('cycle-highlight'); });
            cycleArrows.forEach(function(a) { a.classList.remove('cycle-arrow-active'); });
        });
    }

    // Warehouse sold-layer animation on column hover
    document.querySelectorAll('.warehouse-col').forEach(function(col) {
        col.addEventListener('mouseenter', function() {
            col.classList.add('warehouse-active');
        });
        col.addEventListener('mouseleave', function() {
            col.classList.remove('warehouse-active');
        });
    });


    // ── 3. Interactive element hover effects ──

    // T-accounts: accent glow
    document.querySelectorAll('.t-account').forEach(function(el) {
        el.addEventListener('mouseenter', function() {
            var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#10b981';
            el.style.boxShadow = '0 0 20px ' + accent + '15, 0 0 40px ' + accent + '08';
        });
        el.addEventListener('mouseleave', function() {
            el.style.boxShadow = '';
        });
    });

    // Warehouse layers: scale + slide
    document.querySelectorAll('.warehouse-layer').forEach(function(el) {
        el.addEventListener('mouseenter', function() {
            el.style.transform = 'scale(1.04) translateX(4px)';
            el.style.zIndex = '10';
        });
        el.addEventListener('mouseleave', function() {
            el.style.transform = '';
            el.style.zIndex = '';
        });
    });

    // Formula text: glow on hover
    document.querySelectorAll('[class*="-500/10"][class*="text-center"] .font-mono').forEach(function(el) {
        el.addEventListener('mouseenter', function() {
            el.style.textShadow = '0 0 10px currentColor';
            el.style.transition = 'text-shadow 0.3s ease';
        });
        el.addEventListener('mouseleave', function() {
            el.style.textShadow = '';
        });
    });

    // Insight/callout boxes: lift
    document.querySelectorAll(
        '[class*="-500/10"][class*="border"][class*="rounded-lg"]:not([class*="text-center"])'
    ).forEach(function(el) {
        el.addEventListener('mouseenter', function() {
            el.style.transform = 'translateY(-2px)';
            el.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
        });
        el.addEventListener('mouseleave', function() {
            el.style.transform = '';
        });
    });


    // ── 4. Tab switch animation ──
    var origSwitchTab = window.switchTab;
    if (origSwitchTab) {
        window.switchTab = function() {
            var active = document.querySelector('.tab-panel.active, .tab-content:not(.hidden)');
            if (active) {
                active.style.opacity = '0';
                active.style.transform = 'translateY(8px)';
            }

            origSwitchTab.apply(this, arguments);

            var newActive = document.querySelector('.tab-panel.active, .tab-content:not(.hidden)');
            if (newActive) {
                newActive.style.opacity = '0';
                newActive.style.transform = 'translateY(8px)';
                newActive.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() {
                        newActive.style.opacity = '1';
                        newActive.style.transform = 'translateY(0)';
                    });
                });

                // Observe newly visible cards for scroll reveal
                newActive.querySelectorAll(
                    '[class*="bg-slate-800"][class*="rounded-xl"]:not(.revealed), ' +
                    '[class*="bg-slate-800"][class*="rounded-lg"]:not(.revealed), ' +
                    '.t-account:not(.revealed)'
                ).forEach(function(el, i) {
                    el.classList.add('reveal-target');
                    el.style.transitionDelay = Math.min(i * 0.05, 0.35) + 's';
                    revealObserver.observe(el);
                });
            }
        };
    }

});
