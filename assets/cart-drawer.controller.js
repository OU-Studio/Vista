// cart-drawer.controller.js
const ROOT = (window.Shopify?.routes?.root) || '/';

function money(cents, currency = (window.Shopify?.currency?.active || 'GBP')) {
  const v = (cents || 0) / 100;
  try { return new Intl.NumberFormat(document.documentElement.lang || 'en', { style:'currency', currency }).format(v); }
  catch { return `£${v.toFixed(2)}`; }
}

export function init(root) {
  console.log('[cart] init');

  const drawer   = root;
  const overlay  = drawer.querySelector('.cart-drawer__overlay');
  const panel    = drawer.querySelector('.cart-drawer__panel');
  const bodyEl   = drawer.querySelector('#CartDrawerBody');
  const openEls  = document.querySelectorAll('[data-cart-open]');
  const closeEls = drawer.querySelectorAll('[data-cart-close]');

  if (!bodyEl) { console.error('[cart] #CartDrawerBody not found'); }

  const isDrawerMode = () => (document.body.dataset.cartType || 'drawer') === 'drawer';

  async function open() {
    console.log('[cart] open()');
    drawer.hidden = false;
    document.body.classList.add('drawer-open');
    drawer.classList.add('is-open');
    panel?.focus();
    await refresh();
  }

  function close() {
    console.log('[cart] close()');
    drawer.classList.remove('is-open');
    document.body.classList.remove('drawer-open');
    setTimeout(() => { drawer.hidden = true; }, 220);
  }

async function refresh() {
  const url = `${ROOT}cart.js?ts=${Date.now()}`;
  console.log('[cart] refresh() about to fetch:', url);

  const ac = new AbortController();
  const timeout = setTimeout(() => {
    ac.abort();
    console.warn('[cart] fetch timed out (aborted)');
  }, 7000);

  try {
    if (bodyEl) bodyEl.innerHTML = `<div class="cart-drawer__loading">Loading…</div>`;

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Accept': 'application/json' },
      signal: ac.signal
    });
    clearTimeout(timeout);

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    console.log('[cart] fetch status:', res.status, res.ok, 'content-type:', ct, 'url:', res.url);

    const raw = await res.text();
    // Try JSON first even if content-type is wrong
    let cart = null;
    try {
      // fast check: JSON usually starts with { or [
      const firstChar = raw.trim()[0];
      if (firstChar === '{' || firstChar === '[') {
        cart = JSON.parse(raw);
      } else {
        throw new Error('not-json-leading-char');
      }
    } catch (e) {
      console.warn('[cart] payload is not plain JSON. First 400 chars:\n', raw.slice(0, 400));
      throw new Error('Expected JSON from /cart.js');
    }

    console.log('[cart] cart payload:', cart);
    render(cart);
    updateBadge(cart.item_count || 0);
  } catch (err) {
    clearTimeout(timeout);
    console.error('[cart] refresh error:', err);
    if (bodyEl) bodyEl.innerHTML = `<div class="cart-drawer__loading">Couldn’t load cart</div>`;
  }
}



  function updateBadge(count) {
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = count);
  }

  function render(cart) {
    if (!bodyEl) return;
    if (!cart.items?.length) {
      bodyEl.innerHTML = `<div class="cart-drawer__empty">Your cart is empty.</div>`;
      return;
    }
    const items = cart.items.map((item, i) => `
      <div class="cart-item" data-line="${i+1}">
        <div class="cart-item__media">
          ${item.image ? `<img src="${item.image}&width=160" alt="">` : ''}
        </div>
        <div class="cart-item__main">
          <p class="cart-item__title">${escapeHtml(item.product_title || item.title || '')}</p>
          ${item.variant_title ? `<p class="cart-item__meta">${escapeHtml(item.variant_title)}</p>` : ''}
        </div>
        <div class="cart-item__price">${money(item.final_line_price ?? item.line_price, cart.currency)}</div>
      </div>
    `).join('');

    const subtotal = money(cart.items_subtotal_price, cart.currency);

    bodyEl.innerHTML = `
      <div class="cart-list">${items}</div>
      <div class="cart-summary" style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
        <span>Subtotal</span>
        <strong>${subtotal}</strong>
      </div>
    `;
  }

  function escapeHtml(s=''){return s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&gt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

  // --- WIRING (robust) -------------------------------------------------

// 1) Log the environment
console.log('[cart] wired', {
  openers: openEls.length,
  hasBody: !!bodyEl,
  cartType: document.body.dataset.cartType || 'drawer'
});

// 2) Force drawer mode for debugging (comment this out later if needed)
// const isDrawerMode = () => true; // <— uncomment to hard-force drawer during debug

// 3) Direct listeners for existing buttons
function onOpenClick(e) {
  if (!isDrawerMode()) return; // in "page" mode, let it navigate
  e.preventDefault();
  console.log('[cart] opener clicked (direct listener)');
  open();
}
openEls.forEach(el => el.addEventListener('click', onOpenClick));

// 4) Delegated listener for dynamically-added buttons
function onDelegatedClick(e) {
  const btn = e.target?.closest?.('[data-cart-open]');
  if (!btn) return;
  if (!isDrawerMode()) return;
  e.preventDefault();
  console.log('[cart] opener clicked (delegated)');
  open();
}
document.addEventListener('click', onDelegatedClick);

// 5) Listen for programmatic opens from anywhere: window.dispatchEvent(new Event('cart:open'))
function onProgrammaticOpen() {
  console.log('[cart] programmatic open event');
  open();
}
window.addEventListener('cart:open', onProgrammaticOpen);

// 6) Observer: if open buttons are injected later, attach direct listeners too (optional)
const mo = new MutationObserver(() => {
  document.querySelectorAll('[data-cart-open]').forEach(el => {
    if (!el.__cartOpenBound) {
      el.addEventListener('click', onOpenClick);
      el.__cartOpenBound = true;
    }
  });
});
mo.observe(document.documentElement, { childList: true, subtree: true });

// 7) Close wiring
closeEls.forEach(el => el.addEventListener('click', close));
overlay?.addEventListener('click', close);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

// 8) Expose manual test
window.cartDrawerDebugOpen = open;

return {
  destroy() {
    openEls.forEach(el => el.removeEventListener('click', onOpenClick));
    document.removeEventListener('click', onDelegatedClick);
    window.removeEventListener('cart:open', onProgrammaticOpen);
    overlay?.removeEventListener('click', close);
    mo.disconnect();
  }
};

}
