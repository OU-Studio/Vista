/*!
 * Vista Animations — viewport + late-DOM safe
 */
(function () {
  const RDM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RDM && window.VISTA_ALLOW_MOTION !== true) return;
  if (!window.gsap) return;

  const hasST = !!window.ScrollTrigger;
  if (hasST) try { gsap.registerPlugin(ScrollTrigger); } catch(e){}

  const supportsIO = 'IntersectionObserver' in window;

  // ---------- utils
  const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  const bool = (v, d) => (v === 'true' ? true : v === 'false' ? false : !!d);

  function presetFrom(el) {
    const p = (el.getAttribute('data-anim') || 'fade').trim();
    const dist = num(el.getAttribute('data-anim-dist'), 24);
    const from = { autoAlpha: 0 };
    if (p === 'fade-up') from.y = dist;
    else if (p === 'fade-down') from.y = -dist;
    else if (p === 'fade-left') from.x = -dist;
    else if (p === 'fade-right') from.x = dist;
    else if (p === 'scale-in') from.scale = 0.92;
    return from;
  }

  function whenInView(el, tween, from, once, start, end) {
    if (hasST) {
      gsap.from(el, {
        ...from, ...tween,
        scrollTrigger: {
          trigger: el,
          start: start || 'top 85%',
          end: end || 'bottom 10%',
          toggleActions: once ? 'play none none none' : 'play none none reverse',
          once: !!once
        }
      });
      return;
    }
    if (supportsIO) {
      const io = new IntersectionObserver((entries, obs) => {
        for (const ent of entries) {
          if (ent.isIntersecting) {
            gsap.from(el, { ...from, ...tween });
            if (once) obs.unobserve(el);
          }
        }
      }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });
      io.observe(el);
      return;
    }
    gsap.from(el, { ...from, ...tween }); // last resort
  }

  function animateEl(el) {
    if (el.__vistaAnim) return;
    el.__vistaAnim = true;

    const dur   = num(el.getAttribute('data-anim-dur'), 0.7);
    const delay = num(el.getAttribute('data-anim-delay'), 0);
    const ease  = el.getAttribute('data-anim-ease') || 'power2.out';
    const once  = bool(el.getAttribute('data-anim-once'), false);
    const start = el.getAttribute('data-anim-start') || 'top 95%';
    const end   = el.getAttribute('data-anim-end') || 'bottom 5%';
    const from  = presetFrom(el);
    const tween = { duration: dur, ease, delay };

    const staggerAmt = num(el.getAttribute('data-anim-stagger'), NaN);
    if (!Number.isNaN(staggerAmt)) {
      const sel = el.getAttribute('data-anim-target') || '> *';
      const items = el.querySelectorAll(sel);
      if (!items.length) return;

      if (hasST) {
        gsap.from(items, {
          ...from, ...tween, stagger: staggerAmt,
          scrollTrigger: {
            trigger: el, start, end,
            toggleActions: once ? 'play none none none' : 'play none none reverse',
            once
          }
        });
      } else if (supportsIO) {
        items.forEach((it, i) =>
          whenInView(it, { ...tween, delay: delay + i * staggerAmt }, from, once, start, end)
        );
      } else {
        gsap.from(items, { ...from, ...tween, stagger: staggerAmt });
      }
      return;
    }

    whenInView(el, tween, from, once, start, end);
  }

  function hydrate(scope) {
    (scope || document).querySelectorAll('[data-anim]').forEach(animateEl);
    if (hasST) ScrollTrigger.refresh();
  }

  // ---- boot now + on DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    hydrate(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => hydrate(document), { once: true });
  }

  // ---- Shopify section lifecycle
  document.addEventListener('shopify:section:load', (e) => hydrate(e.target));
  document.addEventListener('shopify:block:select', (e) => hydrate(e.target));

  // ---- Late DOM additions: observe & batch
  let rafId = null, pendingRoot = null;
  const scheduleHydrate = (root) => {
    pendingRoot = root || document;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      hydrate(pendingRoot);
      rafId = null; pendingRoot = null;
    });
  };

  const mo = new MutationObserver((mut) => {
    for (const m of mut) {
      if (m.addedNodes && m.addedNodes.length) {
        for (const n of m.addedNodes) {
          if (n.nodeType === 1 && (n.hasAttribute?.('data-anim') || n.querySelector?.('[data-anim]'))) {
            scheduleHydrate(n);
            return;
          }
        }
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // public API
  window.VistaAnim = { refresh: hydrate };
})();
