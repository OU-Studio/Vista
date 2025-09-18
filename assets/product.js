(function(){
  const $ = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

  const wrap = $('.prd');
  if(!wrap) return;

  // --- Product JSON
  const handle = $('.prd__summary')?.dataset.productHandle;
  let productData = null;

  // --- Money formatting (Shopify-compatible)
function formatWithDelimiters(number, precision = 2, thousands = ',', decimal = '.') {
  if (isNaN(number) || number == null) return '0';
  const parts = (Number(number) / Math.pow(10, precision)).toFixed(precision).split('.');
  const dollars = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
  const cents = parts[1] ? decimal + parts[1] : '';
  return dollars + cents;
}

function formatMoney(cents, format) {
  if (typeof cents === 'string') cents = cents.replace('.', '');
  const placeholder = /\{\{\s*(\w+)\s*\}\}/;
  const fmt = format || '{{amount}}';

  let value;
  switch ((fmt.match(placeholder) || [])[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2, ',', '.'); break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0, ',', '.'); break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ','); break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ','); break;
    case 'amount_with_apostrophe_separator':
      value = formatWithDelimiters(cents, 2, "'", '.'); break;
    default:
      value = formatWithDelimiters(cents, 2, ',', '.'); break;
  }
  return fmt.replace(placeholder, value);
}


  function getVariantByOptions(options){
    return productData.variants.find(v => options.every((val, i)=> v[`option${i+1}`] === val));
  }

 function updateVariant(variant){
  const moneyFormat = document.querySelector('.prd__summary')?.dataset.moneyFormat || '£{{amount}} GBP';

   // Keep the buy form in sync
  const hidden = document.querySelector('.prd [data-variant-id]');
  if (hidden) hidden.value = variant.id;

  // Price
  const price = document.querySelector('.price');
  if (price) {
    const current = formatMoney(variant.price, moneyFormat);
    if (variant.compare_at_price > variant.price) {
      const was = formatMoney(variant.compare_at_price, moneyFormat);
      price.innerHTML = `<span class="price__current">${current}</span><s class="price__was">${was}</s>`;
    } else {
      price.innerHTML = `<span class="price__current">${current}</span>`;
    }
  }

    // url
    const url = new URL(location.href);
    url.searchParams.set('variant', variant.id);
    history.replaceState({}, '', url.toString());
}

  function bindVariantForm(){
    const form = $('.variant-form', wrap);
    if (!form) return;

    const canonical = form.querySelector('select[name="id"]');
    const isDropdown = !!$('.opt__select', form);

    function computeOptions(){
      if (isDropdown){
        const selects = $$('.opt__select', form);
        return selects.map(s => s.value);
      } else {
        const groups = $$('.opt', form);
        return groups.map(g => $('.opt__btn.is-selected', g)?.dataset.value);
      }
    }

    function applyOptions(){
      const options = computeOptions();
      const v = getVariantByOptions(options) || productData.variants[0];
      canonical.value = v.id;
      updateVariant(v);
    }

    if (isDropdown){
      $$('.opt__select', form).forEach(sel => sel.addEventListener('change', applyOptions));
    } else {
      $$('.opt', form).forEach(group => {
        group.addEventListener('click', (e)=>{
          const btn = e.target.closest('.opt__btn');
          if (!btn) return;
          $$('.opt__btn', group).forEach(b=>b.classList.remove('is-selected'));
          btn.classList.add('is-selected');
          applyOptions();
        });
      });
    }
  }

  function bindATC(){
  const form = document.querySelector('.prd [data-product-form]');
  if (!form) return;

  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);

    // Force the variant ID from the canonical select in the variant form
    const canonical = document.querySelector('.prd .variant-form select[name="id"]');
    if (canonical) fd.set('id', canonical.value);

    // Quantity
    const qty = parseInt(document.querySelector('.prd .qty-input')?.value || '1', 10) || 1;
    fd.set('quantity', String(qty));

    try {
      const res = await fetch('/cart/add.js', { method:'POST', headers:{ 'Accept':'application/json' }, body: fd });
      if (!res.ok) throw new Error('ATC failed');

      const payload = await res.json();
      const detailQty = qty;
      document.dispatchEvent(new CustomEvent('cart:add', { detail: { payload, quantity: detailQty } }));

      const btn = document.querySelector('.prd [data-atc]');
flashATCSuccess(btn);
flyToCart(btn);

      // your success UX (toast/button/flight) here
    } catch (err) {
      console.error(err);
      alert('Unable to add to cart.');
    }
  });
}

  function bindSlideshow(){
  const wrapper = $('.media-slides', wrap);
  if(!wrapper) return;
  const track = $('[data-slides-track]', wrapper);
  const slides = $$('.media-item', track);
  const prev = $('.slides-nav.prev', wrapper);
  const next = $('.slides-nav.next', wrapper);
  let i = 0;
  const show = (idx)=>{
    i = (idx + slides.length) % slides.length;
    track.scrollTo({ left: track.clientWidth * i, behavior:'smooth' });
  };
  prev.addEventListener('click', ()=>show(i-1));
  next.addEventListener('click', ()=>show(i+1));
  window.addEventListener('resize', ()=>show(i)); // keep alignment on resize
}

function flashATCSuccess(button){
  if(!button) return;
  const orig = button.querySelector('[data-atc-text]')?.textContent || 'Add to cart';
  button.dataset.state = 'success';
  const label = button.querySelector('[data-atc-text]');
  if(label) label.textContent = 'Added ✓';
  setTimeout(()=>{
    button.dataset.state = '';
    if(label) label.textContent = orig;
  }, 1500);
}

function flyToCart(fromEl){
  const cart = document.querySelector('[data-cart-count]'); if(!cart || !fromEl) return;
  const start = fromEl.getBoundingClientRect();
  const end = cart.getBoundingClientRect();
  const dot = document.createElement('span');
  dot.className = 'fly-dot';
  dot.style.left = (start.left + start.width/2) + 'px';
  dot.style.top  = (start.top + start.height/2) + 'px';
  document.body.appendChild(dot);

  const dx = end.left + end.width/2;
  const dy = end.top + end.height/2;
  dot.animate([
    { transform: `translate(-50%, -50%) scale(1)`, left: dot.style.left, top: dot.style.top, opacity: 1 },
    { offset: .6, transform: `translate(-50%, -50%) scale(.7)`, opacity: .9 },
    { transform: `translate(-50%, -50%) scale(.4)`, left: dx+'px', top: dy+'px', opacity: 0 }
  ], { duration: 600, easing: 'cubic-bezier(.22,.61,.36,1)' }).onfinish = () => dot.remove();
}




  async function init(){
    if(!handle) return;
    const res = await fetch(`/products/${handle}.js`);
    productData = await res.json();
    bindVariantForm();
    bindATC();
    bindSlideshow();
  }
  init();
})();
