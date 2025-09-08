// assets/cart-drawer.controller.js
const ROOT = (window.Shopify?.routes?.root) || '/';

function money(cents, currency = (window.Shopify?.currency?.active || 'GBP')) {
  const v = (cents || 0) / 100;
  try { return new Intl.NumberFormat(document.documentElement.lang || 'en', { style:'currency', currency }).format(v); }
  catch { return `£${v.toFixed(2)}`; }
}

export function init(root) {
  console.log('[cart] init');

  // --- DOM refs
  const drawer   = root;
  const overlay  = drawer.querySelector('.cart-drawer__overlay');
  const panel    = drawer.querySelector('.cart-drawer__panel');
  const bodyEl   = drawer.querySelector('#CartDrawerBody');
  const openEls  = document.querySelectorAll('[data-cart-open]');
  const closeEls = drawer.querySelectorAll('[data-cart-close]');

  if (!panel)  { console.error('[cart] .cart-drawer__panel not found'); return; }
  if (!bodyEl) { console.error('[cart] #CartDrawerBody not found'); }

  const isDrawerMode = () => (document.body.dataset.cartType || 'drawer') === 'drawer';
  const NO_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = NO_MOTION ? 0.01 : 0.42;

  

  // --- measure helper (works even when drawer is hidden)
  function panelWidth() {
    const wasHidden = drawer.hidden;
    const prevVis = drawer.style.visibility;

    if (wasHidden) {
      drawer.style.visibility = 'hidden';
      drawer.hidden = false;
    }

    // force layout, then measure
    const w = panel.getBoundingClientRect().width || parseFloat(getComputedStyle(panel).width) || 420;

    if (wasHidden) {
      drawer.hidden = true;
      drawer.style.visibility = prevVis || '';
    }
    return w;
  }

  // --- open / close (GSAP if present, CSS fallback)
  let isOpening = false;
  async function open(e) {
    if (!isDrawerMode()) return; // let it navigate in "page" mode
    if (isOpening) return;
    isOpening = true;

    try {
      const GSAP = globalThis.gsap;
      const off = panelWidth();

      // prep visible state
      drawer.hidden = false;
      drawer.classList.add('is-open');
      document.body.classList.add('drawer-open');
      if (overlay) overlay.style.pointerEvents = 'auto';

      // clear any existing transform so we own it
      panel.style.transform = '';

      if (GSAP) {
        GSAP.killTweensOf([panel, overlay]);
        GSAP.set(panel,   { x: off });
        GSAP.set(overlay, { opacity: 0 });
        GSAP.to(panel,   { x: 0, duration: SPEED, ease: 'power3.out' });
        GSAP.to(overlay, { opacity: 1, duration: SPEED * 0.6 }, 0);
      } else {
        panel.style.transition = `transform ${SPEED}s ease`;
        if (overlay) overlay.style.transition = `opacity ${SPEED * 0.6}s ease`;
        panel.style.transform = `translateX(${off}px)`;
        if (overlay) overlay.style.opacity = 0;
        requestAnimationFrame(() => {
          panel.style.transform = 'translateX(0px)';
          if (overlay) overlay.style.opacity = 1;
        });
      }

      panel?.focus();
      await refresh(); // load cart, then animate any injected content below

      queueMicrotask(() => {
        globalThis.VistaAnim?.refresh(drawer);
        const ST = globalThis.ScrollTrigger;
        if (ST && typeof ST.refresh === 'function') requestAnimationFrame(() => ST.refresh());
      });
    } finally {
      isOpening = false;
    }
  }

  function close() {
  console.log('[cart] close()');
  const GSAP = globalThis.gsap;
  const off = (function panelWidth() {
    const wasHidden = drawer.hidden;
    const prevVis = drawer.style.visibility;
    if (wasHidden) { drawer.style.visibility = 'hidden'; drawer.hidden = false; }
    const w = panel.getBoundingClientRect().width || parseFloat(getComputedStyle(panel).width) || 420;
    if (wasHidden) { drawer.hidden = true; drawer.style.visibility = prevVis || ''; }
    return w;
  })();

  const finalize = () => {
    if (overlay) overlay.style.pointerEvents = 'none';
    drawer.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    drawer.hidden = true;
    console.log('[cart] close → finalized');
  };

  if (GSAP) {
    // Kill any in-flight tweens so our onComplete will always run
    GSAP.killTweensOf([panel, overlay]);

    const tl = GSAP.timeline();
    tl.add('out', 0);
    if (overlay) tl.to(overlay, { opacity: 0, duration: Math.max(0.18, 0.6 * (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.42)) }, 'out');
    tl.to(panel, { x: off, duration: Math.max(.32, 0.85 * (matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.01 : 0.42)), ease: 'power3.in' }, 'out');

    // Ensure finalize always runs
    tl.eventCallback('onComplete', finalize);
    tl.eventCallback('onInterrupt', finalize);
  } else {
    // CSS fallback
    panel.style.transition = 'transform .4s ease';
    if (overlay) overlay.style.transition = 'opacity .3s ease';
    requestAnimationFrame(() => {
      panel.style.transform = `translateX(${off}px)`;
      if (overlay) overlay.style.opacity = 0;
      setTimeout(finalize, 420); // matches .4s ease above
    });
  }
}


  // --- data helpers
  function updateBadge(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => (el.textContent = count));
  }

  function clampQty(v) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function escapeHtml(s=''){return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&gt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

  // --- network
  async function refresh() {
    const url = `${ROOT}cart.js?ts=${Date.now()}`;
    console.log('[cart] refresh() →', url);

    try {
      if (bodyEl) bodyEl.innerHTML = `<div class="cart-drawer__loading">Loading…</div>`;

      const res = await fetch(url, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' }
      });

      const raw = await res.text();
      let cart;
      try {
        const first = raw.trim()[0];
        if (first === '{' || first === '[') cart = JSON.parse(raw);
        else throw new Error('not-json');
      } catch {
        console.warn('[cart] non-JSON payload sample:', raw.slice(0, 240));
        throw new Error('Expected JSON from /cart.js');
      }

      render(cart);
      updateBadge(cart.item_count || 0);
    } catch (err) {
      console.error('[cart] refresh error:', err);
      if (bodyEl) bodyEl.innerHTML = `<div class="cart-drawer__loading">Couldn’t load cart</div>`;
    }
  }

  // --- quantity / remove
  async function changeLine(line, quantity) {
    try {
      drawer.classList.add('is-busy');
      const res = await fetch(`${ROOT}cart/change.js`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ line, quantity })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cart = await res.json();
      render(cart);
      updateBadge(cart.item_count || 0);
    } catch (err) {
      console.error('[cart] changeLine error:', err);
    } finally {
      drawer.classList.remove('is-busy');
    }
  }

  // --- render
  function render(cart) {
    if (!bodyEl) return;

    if (!cart.items?.length) {
      bodyEl.innerHTML = `<div class="cart-drawer__empty">Your cart is empty.</div>
      <div class="cart-actions" style="margin-top:1rem;">
        <a class="button button--secondary w-full" href="/collections/all">Continue shopping</a>
      </div>`;
      queueMicrotask(() => {
        globalThis.VistaAnim?.refresh(bodyEl);
        const ST = globalThis.ScrollTrigger;
        if (ST && typeof ST.refresh === 'function') requestAnimationFrame(() => ST.refresh());
      });
      return;
    }

    const items = cart.items.map((item, i) => {
      const line = i + 1;
      return `
        <div class="cart-item" data-line="${line}">
          <div class="cart-item__media">
            ${item.image ? `<img src="${item.image}&width=160" alt="">` : ''}
          </div>
          <div class="cart-item__main">
            <p class="cart-item__title">${escapeHtml(item.product_title || item.title || '')}</p>
            ${item.variant_title ? `<p class="cart-item__meta">${escapeHtml(item.variant_title)}</p>` : ''}

            <div class="cart-item__controls">
              <div class="cart-item__qty" aria-label="Quantity">
                <button type="button" class="qty-btn" data-qty-dec data-line="${line}" aria-label="Decrease quantity">−</button>
                <input type="number" min="0" value="${item.quantity}" inputmode="numeric"
                       class="qty-input" data-qty-input data-line="${line}">
                <button type="button" class="qty-btn" data-qty-inc data-line="${line}" aria-label="Increase quantity">+</button>
              </div>

              <button type="button" class="cart-item__remove" data-remove data-line="${line}" aria-label="Remove item">Remove</button>
            </div>
          </div>
          <div class="cart-item__price">
            ${money(item.final_line_price ?? item.line_price, cart.currency)}
          </div>
        </div>
      `;
    }).join('');

    const subtotal = money(cart.items_subtotal_price, cart.currency);

    bodyEl.innerHTML = `
      <div class="cart-list">${items}</div>

      <div class="cart-summary" style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
        <span>Subtotal</span>
        <strong>${subtotal}</strong>
      </div>

      <div class="cart-actions">
        <a class="button button--primary w-full" data-anim="fade-up" data-anim-once="true" data-anim-start="top 100%" href="/cart">View cart</a>
        <a class="button button--secondary w-full" data-anim="fade-up" data-anim-once="true" data-anim-start="top 100%" href="/checkout">Checkout</a>
      </div>
    `;

    queueMicrotask(() => {
      globalThis.VistaAnim?.refresh(bodyEl);
      const gs = globalThis.gsap;
      if (gs) {
        const actions = bodyEl.querySelectorAll('.cart-actions .button');
        if (actions.length) gs.from(actions, { y: 14, autoAlpha: 0, duration: 0.35, ease: 'power2.out', stagger: 0.05 });
      }
      const ST = globalThis.ScrollTrigger;
      if (ST && typeof ST.refresh === 'function') requestAnimationFrame(() => ST.refresh());
    });
  }

  // --- wiring (capture-phase to bypass blockers)
  function onOpenClick(e) { e.preventDefault(); open(e); }
  openEls.forEach(el => el.addEventListener('click', onOpenClick, { capture: true }));

  // Also delegate globally for any future buttons
  function onDelegatedClick(e) {
    const btn = e.target?.closest?.('[data-cart-open]');
    if (!btn) return;
    e.preventDefault();
    open({ currentTarget: btn });
  }
  document.addEventListener('click', onDelegatedClick, { capture: true });

  // Close on explicit buttons and overlay
  function onCloseClick(e) {
    const btn = e.target?.closest?.('[data-cart-close]');
    if (btn) { e.preventDefault(); close(); return; }
    if (e.target === overlay) { e.preventDefault(); close(); }
  }
  drawer.addEventListener('click', onCloseClick, { capture: true });
  closeEls.forEach(el => el.addEventListener('click', (e) => { e.preventDefault(); close(); }, { capture: true }));

  // Esc to close
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Bind newly added openers
  const mo = new MutationObserver(() => {
    document.querySelectorAll('[data-cart-open]').forEach(el => {
      if (!el.__cartOpenBound) {
        el.addEventListener('click', onOpenClick, { capture: true });
        el.__cartOpenBound = true;
      }
    });
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Qty & remove (delegated on drawer)
  drawer.addEventListener('click', (e) => {
    const dec = e.target.closest?.('[data-qty-dec]');
    const inc = e.target.closest?.('[data-qty-inc]');
    const rem = e.target.closest?.('[data-remove]');
    if (dec) {
      const line = Number(dec.dataset.line);
      const input = drawer.querySelector(`.qty-input[data-line="${line}"]`);
      const next = Math.max(0, clampQty((input?.value || 1)) - 1);
      changeLine(line, next);
    } else if (inc) {
      const line = Number(inc.dataset.line);
      const input = drawer.querySelector(`.qty-input[data-line="${line}"]`);
      const next = clampQty((input?.value || 0)) + 1;
      changeLine(line, next);
    } else if (rem) {
      const line = Number(rem.dataset.line);
      changeLine(line, 0);
    }
  });

  drawer.addEventListener('change', (e) => {
    const input = e.target.closest?.('.qty-input[data-line]');
    if (!input) return;
    const line = Number(input.dataset.line);
    changeLine(line, clampQty(input.value));
  });

  drawer.addEventListener('keydown', (e) => {
    const input = e.target.closest?.('.qty-input[data-line]');
    if (!input) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      const line = Number(input.dataset.line);
      changeLine(line, clampQty(input.value));
    }
  });

  // Manual debug hook
  window.cartDrawerDebugOpen = () => open();

  console.log('[cart] wired', {
    openers: openEls.length,
    hasBody: !!bodyEl,
    cartType: document.body.dataset.cartType || 'drawer'
  });

  return {
    destroy() {
      openEls.forEach(el => el.removeEventListener('click', onOpenClick, { capture: true }));
      document.removeEventListener('click', onDelegatedClick, { capture: true });
      drawer.removeEventListener('click', onCloseClick, { capture: true });
      closeEls.forEach(el => el.removeEventListener('click', close, { capture: true }));
      mo.disconnect();
    }
  };
}
