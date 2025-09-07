// main.js
console.log('[main] mounting controllers…');

// Map controller names to asset filenames (flat /assets)
const registry = {
  'cart-drawer': './cart-drawer.controller.js',
  // 'header': './header.controller.js',
  // 'search': './predictive-search.controller.js',
};

async function loader(path) {
  // Resolve relative to this file (handles CDN cache-busting paths)
  const url = new URL(path, import.meta.url).toString();
  console.log('[main] import', url);
  return import(url);
}

async function mountControllers(root = document) {
  const nodes = root.querySelectorAll('[data-controller]');
  console.log('[main] found controllers:', [...nodes].map(n => n.getAttribute('data-controller')));
  for (const el of nodes) {
    const name = el.getAttribute('data-controller');
    if (!name || el.__controllerMounted) continue;

    const path = registry[name];
    if (!path) {
      console.warn(`[main] No registry entry for "${name}"`);
      continue;
    }

    try {
      const mod = await loader(path);
      if (!mod || typeof mod.init !== 'function') {
        console.error(`[main] Module for "${name}" has no init() export`, mod);
        continue;
      }
      el.__controllerMounted = true;
      el.__controller = await mod.init(el);
      console.log(`[main] mounted "${name}"`);
    } catch (err) {
      console.error(`[main] Failed to load "${name}" from ${path}`, err);
    }
  }
}

function unmountControllers(root = document) {
  const nodes = root.querySelectorAll('[data-controller]');
  for (const el of nodes) {
    if (el.__controller && typeof el.__controller.destroy === 'function') {
      try { el.__controller.destroy(); } catch (e) { console.error(e); }
    }
    el.__controllerMounted = false;
    el.__controller = null;
  }
}

document.addEventListener('DOMContentLoaded', () => mountControllers());

// Shopify Theme Editor hooks
document.addEventListener('shopify:section:load',   (e) => mountControllers(e.target));
document.addEventListener('shopify:section:unload', (e) => unmountControllers(e.target));
document.addEventListener('shopify:block:select',   (e) => mountControllers(e.target));
document.addEventListener('shopify:block:deselect', (e) => unmountControllers(e.target));
