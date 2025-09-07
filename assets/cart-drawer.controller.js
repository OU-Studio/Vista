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
    try {
      console.log('[cart] refresh() → GET cart.js');
      if (bodyEl) bodyEl.innerHTML = `<div class="cart-drawer__loading">Loading…</div>`;
      const res = await fetch(`${ROOT}cart.js`, { credentials:'same-origin', headers:{ 'Accept':'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cart = await res.json();
      console.log('[cart] cart:', cart);
      render(cart);
      updateBadge(cart.item_count || 0);
    } catch (err) {
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

  // Wire clicks
  function onOpenClick(e) {
    if (!isDrawerMode()) return; // in "page" mode, let it navigate
    e.preventDefault();
    open();
  }
  openEls.forEach(el => el.addEventListener('click', onOpenClick));
  closeEls.forEach(el => el.addEventListener('click', close));
  overlay?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  // Expose manual test
  window.cartDrawerDebugOpen = open;

  console.log('[cart] wired', { openers: openEls.length, hasBody: !!bodyEl });

  return {
    destroy() {
      openEls.forEach(el => el.removeEventListener('click', onOpenClick));
      closeEls.forEach(el => el.removeEventListener('click', close));
      overlay?.removeEventListener('click', close);
    }
  };
}
