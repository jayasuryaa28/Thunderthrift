/* =============================================
   THRIFTHUNDER v2 — script.js
   Pure HTML/CSS/JS · localStorage + Base64
   ============================================= */

// ═══════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════
const ADMIN_PASSWORD = 'thrifthunder2025';
const LS_PRODUCTS    = 'tt_products';
const LS_CART        = 'tt_cart';
const LS_WISHLIST    = 'tt_wishlist';
const LS_NEXT_ID     = 'tt_next_id';
const WA_NUMBER      = '919042489937';

const PLACEHOLDER    = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='533' viewBox='0 0 400 533'%3E%3Crect width='400' height='533' fill='%23f0ede7'/%3E%3Ctext x='200' y='270' text-anchor='middle' font-family='serif' font-size='48' fill='%23c9a96e' opacity='.4'%3E⚡%3C/text%3E%3C/svg%3E";

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let products         = [];
let cart             = [];
let wishlist         = [];
let nextId           = 1;
let currentProduct   = null;
let selectedSize     = null;
let cartOpen         = false;
let menuOpen         = false;
let isAdmin          = false;
let pendingDeleteId  = null;
let currentFilter    = 'all';
let currentSort      = 'newest';
let currentGalleryIdx = 0;
let pageHistory      = ['home'];
let pendingImages    = []; // {id, dataUrl}
let imgIdCounter     = 0;

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initNavbar();
  initDragDrop();
  renderBrandFilters();
  renderFeatured();
  renderAllProducts();
  updateStatCount();
  updateCartBadge();
  updateWishlistBadge();
  updateAdminDate();
  showPage('home');
});

// ═══════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════
function loadFromStorage() {
  try {
    products  = JSON.parse(localStorage.getItem(LS_PRODUCTS))  || [];
    cart      = JSON.parse(localStorage.getItem(LS_CART))      || [];
    wishlist  = JSON.parse(localStorage.getItem(LS_WISHLIST))  || [];
    nextId    = parseInt(localStorage.getItem(LS_NEXT_ID))     || 1;
  } catch(e) {
    products = []; cart = []; wishlist = []; nextId = 1;
  }
}

function saveProducts()  { localStorage.setItem(LS_PRODUCTS, JSON.stringify(products)); localStorage.setItem(LS_NEXT_ID, nextId); }
function saveCart()      { localStorage.setItem(LS_CART, JSON.stringify(cart)); }
function saveWishlist()  { localStorage.setItem(LS_WISHLIST, JSON.stringify(wishlist)); }

// ═══════════════════════════════════════════════
// NAVBAR
// ═══════════════════════════════════════════════
function initNavbar() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
  });
}

// ═══════════════════════════════════════════════
// PAGE NAVIGATION
// ═══════════════════════════════════════════════
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (!el) return;
  el.classList.add('active');
  if (pageHistory[pageHistory.length - 1] !== page) pageHistory.push(page);

  // Page-specific renders
  if (page === 'home') {
    renderFeatured();
    renderAllProducts();
    updateStatCount();
  }
  if (page === 'wishlist') renderWishlistPage();
  if (page === 'admin') {
    renderAdminStats();
    renderAdminList();
    renderRecentProducts();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  closeMenu();
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.remove('visible');
}

function goBack() {
  pageHistory.pop();
  const prev = pageHistory[pageHistory.length - 1] || 'home';
  pageHistory.pop();
  showPage(prev);
}

function scrollToSection(id) {
  if (document.getElementById('page-home').classList.contains('active')) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    showPage('home');
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }
  closeMenu();
}

// ═══════════════════════════════════════════════
// MENU / MOBILE
// ═══════════════════════════════════════════════
function toggleMenu() {
  menuOpen = !menuOpen;
  document.getElementById('mobile-menu').classList.toggle('open', menuOpen);
  document.getElementById('hamburger').classList.toggle('open', menuOpen);
}
function closeMenu() {
  menuOpen = false;
  document.getElementById('mobile-menu').classList.remove('open');
  document.getElementById('hamburger').classList.remove('open');
}

// ═══════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════
function toggleCart() {
  cartOpen = !cartOpen;
  document.getElementById('cart-sidebar').classList.toggle('open', cartOpen);
  document.getElementById('cart-overlay').classList.toggle('open', cartOpen);
  if (cartOpen) renderCartItems();
}

function addToCart(productId, size, silent = false) {
  const p = products.find(x => x.id === productId);
  if (!p || p.status === 'soldout') return;
  const useSize = size || (p.sizes?.length === 1 ? p.sizes[0] : null);
  if (p.sizes?.length > 1 && !useSize) {
    openProductDetail(productId);
    if (!silent) toast('Select a size first', 'info');
    return;
  }
  const key = `${productId}-${useSize || 'OS'}`;
  const existing = cart.find(i => i.key === key);
  if (existing) { existing.qty += 1; }
  else { cart.push({ key, productId, size: useSize || 'One Size', qty: 1 }); }
  saveCart();
  updateCartBadge();
  if (!silent) toast(`Added — ${p.name}`, 'success');
  renderCartItems();
}

function removeFromCart(key) {
  cart = cart.filter(i => i.key !== key);
  saveCart();
  updateCartBadge();
  renderCartItems();
}

function changeQty(key, delta) {
  const item = cart.find(i => i.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(key);
  else { saveCart(); updateCartBadge(); renderCartItems(); }
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartBadge();
  renderCartItems();
  toast('Bag cleared');
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cart-count');
  badge.textContent = total;
  badge.classList.toggle('show', total > 0);
}

function renderCartItems() {
  const wrap = document.getElementById('cart-items');
  const footer = document.getElementById('cart-footer');
  const label = document.getElementById('cart-item-count-label');
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  label.textContent = `${totalItems} item${totalItems !== 1 ? 's' : ''}`;

  if (!cart.length) {
    wrap.innerHTML = `<div class="cart-empty"><i class="fa fa-shopping-bag"></i><p>Your bag is empty.<br/>Start exploring.</p></div>`;
    footer.style.display = 'none';
    return;
  }
  footer.style.display = '';
  let subtotal = 0;
  wrap.innerHTML = cart.map(item => {
    const p = products.find(pr => pr.id === item.productId);
    if (!p) return '';
    const lineTotal = p.price * item.qty;
    subtotal += lineTotal;
    const img = (p.images && p.images[0]) || PLACEHOLDER;
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${img}" alt="${p.name}" onerror="this.src='${PLACEHOLDER}'" />
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-brand">${p.brand}</div>
          <div class="cart-item-size">Size: ${item.size}</div>
          <div class="cart-item-price">₹${lineTotal.toLocaleString('en-IN')}</div>
        </div>
        <div class="cart-item-right">
          <div class="qty-controls">
            <button class="qty-btn" onclick="changeQty('${item.key}',-1)">−</button>
            <span class="qty-val">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.key}',1)">+</button>
          </div>
          <button class="remove-btn" onclick="removeFromCart('${item.key}')">Remove</button>
        </div>
      </div>`;
  }).join('');
  document.getElementById('cart-subtotal').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
  document.getElementById('cart-total-price').textContent = `₹${subtotal.toLocaleString('en-IN')}`;
}

function checkoutWhatsApp() {
  if (!cart.length) { toast('Your bag is empty!'); return; }
  let msg = `Hi THRIFTHUNDER! 🛒\n\nI want to order:\n\n`;
  let total = 0;
  cart.forEach(item => {
    const p = products.find(pr => pr.id === item.productId);
    if (!p) return;
    const line = p.price * item.qty;
    msg += `• ${p.name} (${p.brand})\n  Size: ${item.size} × ${item.qty} = ₹${line.toLocaleString('en-IN')}\n\n`;
    total += line;
  });
  msg += `Total: ₹${total.toLocaleString('en-IN')}\n\nPlease confirm availability. Thank you! 🙏`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ═══════════════════════════════════════════════
// WISHLIST
// ═══════════════════════════════════════════════
function toggleWishlist(productId) {
  const idx = wishlist.indexOf(productId);
  if (idx === -1) { wishlist.push(productId); toast('Added to wishlist ❤️'); }
  else { wishlist.splice(idx, 1); toast('Removed from wishlist'); }
  saveWishlist();
  updateWishlistBadge();
  refreshWishlistUI(productId);
}

function toggleWishlistDetail() {
  if (!currentProduct) return;
  toggleWishlist(currentProduct.id);
  updateDetailWishlistBtn();
}

function updateDetailWishlistBtn() {
  const btn = document.getElementById('detail-wishlist-btn');
  if (!btn || !currentProduct) return;
  btn.classList.toggle('active', wishlist.includes(currentProduct.id));
}

function refreshWishlistUI(productId) {
  document.querySelectorAll(`[data-wishlist="${productId}"]`).forEach(btn => {
    btn.classList.toggle('active', wishlist.includes(productId));
  });
  updateDetailWishlistBtn();
  if (document.getElementById('page-wishlist').classList.contains('active')) renderWishlistPage();
}

function updateWishlistBadge() {
  const badge = document.getElementById('wishlist-count');
  badge.textContent = wishlist.length;
  badge.classList.toggle('show', wishlist.length > 0);
}

function renderWishlistPage() {
  const grid = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');
  const items = products.filter(p => wishlist.includes(p.id));
  if (!items.length) {
    grid.innerHTML = '';
    empty.style.display = '';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = items.map(createProductCard).join('');
    observeReveal();
  }
}

// ═══════════════════════════════════════════════
// PRODUCT CARDS
// ═══════════════════════════════════════════════
function createProductCard(p) {
  const img   = (p.images && p.images[0]) || PLACEHOLDER;
  const inWL  = wishlist.includes(p.id);
  const sold  = p.status === 'soldout';
  const price = `₹${p.price.toLocaleString('en-IN')}`;
  const sizes = (p.sizes || []).slice(0, 4).map(s => `<span class="card-size-tag">${s}</span>`).join('');

  let badges = '';
  if (p.featured) badges += `<span class="card-badge badge-new">New</span>`;
  if (sold)       badges += `<span class="card-badge badge-sold">Sold Out</span>`;
  else if (p.condition === 'New' || p.condition === 'New with Tags') badges += `<span class="card-badge badge-new-tag">New with Tags</span>`;
  else            badges += `<span class="card-badge badge-thrifted">${p.condition || 'Thrifted'}</span>`;

  return `
    <div class="product-card reveal" onclick="openProductDetail(${p.id})">
      <div class="card-img-wrap">
        <img src="${img}" alt="${p.name}" loading="lazy" onerror="this.src='${PLACEHOLDER}'" />
        <div class="card-badges">${badges}</div>
        <button class="card-wishlist-btn ${inWL ? 'active' : ''}" data-wishlist="${p.id}"
          onclick="event.stopPropagation();toggleWishlist(${p.id})" title="Wishlist">
          <i class="fa fa-heart"></i>
        </button>
        <div class="card-actions-overlay">
          <button class="card-quick-view" onclick="event.stopPropagation();openProductDetail(${p.id})">
            <i class="fa fa-eye"></i> Quick View
          </button>
        </div>
        ${sold ? `<div class="soldout-overlay"><span class="soldout-label">Sold Out</span></div>` : ''}
      </div>
      <div class="card-body">
        <div class="card-brand">${p.brand}</div>
        <div class="card-name">${p.name}</div>
        ${sizes ? `<div class="card-sizes">${sizes}</div>` : ''}
        <div class="card-footer">
          <span class="card-price">${price}</span>
          ${!sold ? `<button class="card-add-btn" title="Add to bag"
            onclick="event.stopPropagation();quickAddToCart(${p.id}, this)">
            <i class="fa fa-shopping-bag"></i>
          </button>` : ''}
        </div>
      </div>
    </div>`;
}

function quickAddToCart(productId, btn) {
  const p = products.find(x => x.id === productId);
  if (!p) return;
  if (p.sizes && p.sizes.length > 1) {
    openProductDetail(productId);
    toast('Choose a size to add to bag');
    return;
  }
  addToCart(productId, p.sizes?.[0] || null, false);
  btn.classList.add('added');
  btn.innerHTML = '<i class="fa fa-check"></i>';
  setTimeout(() => {
    btn.classList.remove('added');
    btn.innerHTML = '<i class="fa fa-shopping-bag"></i>';
  }, 1800);
}

// ═══════════════════════════════════════════════
// RENDER HOME
// ═══════════════════════════════════════════════
function renderFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const featured = products.filter(p => p.featured).slice(0, 6);
  if (!featured.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = featured.map(createProductCard).join('');
  observeReveal();
}

function renderAllProducts() {
  const grid  = document.getElementById('all-products-grid');
  const empty = document.getElementById('no-products-home');
  if (!grid) return;

  let list = [...products];

  // Category filter
  if (currentFilter !== 'all') list = list.filter(p => p.category === currentFilter);

  // Brand filter
  const activeBrand = document.querySelector('.filter-btn.active')?.dataset.brand;
  if (activeBrand && activeBrand !== 'all') list = list.filter(p => p.brand === activeBrand);

  // Sort
  if (currentSort === 'price-asc')  list.sort((a,b) => a.price - b.price);
  if (currentSort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (currentSort === 'name')       list.sort((a,b) => a.name.localeCompare(b.name));
  if (currentSort === 'newest')     list.sort((a,b) => b.id - a.id);

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = products.length ? '' : '';
    if (!products.length) empty.style.display = '';
  } else {
    empty.style.display = 'none';
    grid.innerHTML = list.map(createProductCard).join('');
    observeReveal();
  }
}

function updateStatCount() {
  const el = document.getElementById('stat-products');
  if (el) el.textContent = products.length;
}

function renderBrandFilters() {
  const bar = document.getElementById('brand-filter-bar');
  if (!bar) return;
  const brands = [...new Set(products.map(p => p.brand))].sort();
  const allBtn = `<button class="filter-btn active" data-brand="all" onclick="filterProducts('all', this)">All</button>`;
  const btns = brands.map(b =>
    `<button class="filter-btn" data-brand="${b}" onclick="filterProducts('${b}', this)">${b}</button>`
  ).join('');
  bar.innerHTML = allBtn + btns;
}

function filterProducts(brand, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAllProducts();
}

function filterByCategory(cat, btn) {
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = cat;
  renderAllProducts();
  scrollToSection('products');
}

function handleSort(val) {
  currentSort = val;
  renderAllProducts();
}

// ═══════════════════════════════════════════════
// PRODUCT DETAIL
// ═══════════════════════════════════════════════
function openProductDetail(id) {
  const p = products.find(pr => pr.id === id);
  if (!p) return;
  currentProduct = p;
  selectedSize = p.sizes?.length === 1 ? p.sizes[0] : null;
  currentGalleryIdx = 0;

  // Badges
  const badgesEl = document.getElementById('detail-badges');
  let bHTML = '';
  if (p.featured)  bHTML += `<span class="card-badge badge-new">New Arrival</span>`;
  if (p.status === 'soldout') bHTML += `<span class="card-badge badge-sold">Sold Out</span>`;
  bHTML += `<span class="card-badge badge-thrifted">${p.condition || 'Thrifted'}</span>`;
  badgesEl.innerHTML = bHTML;

  document.getElementById('detail-brand').textContent = p.brand;
  document.getElementById('detail-name').textContent  = p.name;
  document.getElementById('detail-price').textContent = `₹${p.price.toLocaleString('en-IN')}`;
  document.getElementById('detail-desc').textContent  = p.description || '';

  // Meta grid
  const meta = document.getElementById('detail-meta-grid');
  meta.innerHTML = `
    <div class="detail-meta-item"><label>Brand</label><span>${p.brand}</span></div>
    <div class="detail-meta-item"><label>Category</label><span>${p.category || '—'}</span></div>
    <div class="detail-meta-item"><label>Condition</label><span>${p.condition || '—'}</span></div>
    <div class="detail-meta-item"><label>Status</label><span>${p.status === 'soldout' ? '❌ Sold Out' : '✅ Available'}</span></div>`;

  // Gallery
  const imgs = (p.images && p.images.length) ? p.images : [PLACEHOLDER];
  document.getElementById('detail-main-img').src = imgs[0];
  const thumbsEl = document.getElementById('detail-thumbs');
  thumbsEl.innerHTML = imgs.map((img, i) =>
    `<img class="thumb-img ${i===0?'active':''}" src="${img}" loading="lazy"
      onerror="this.src='${PLACEHOLDER}'"
      onclick="setMainImage(this,'${img}',${i})" />`
  ).join('');

  // Sizes
  const sizeSection = document.getElementById('size-section');
  if (!p.sizes || !p.sizes.length) {
    sizeSection.style.display = 'none';
  } else {
    sizeSection.style.display = '';
    document.getElementById('detail-sizes').innerHTML = p.sizes.map(s =>
      `<button class="size-opt ${selectedSize===s?'selected':''}" onclick="selectSize('${s}',this)">${s}</button>`
    ).join('');
  }

  // Cart button state
  const cartBtn = document.querySelector('.detail-cart-btn');
  if (cartBtn) {
    if (p.status === 'soldout') {
      cartBtn.disabled = true;
      cartBtn.innerHTML = '<i class="fa fa-times"></i> Sold Out';
    } else {
      cartBtn.disabled = false;
      cartBtn.innerHTML = '<i class="fa fa-shopping-bag"></i> Add to Bag';
    }
  }

  // Wishlist btn
  updateDetailWishlistBtn();

  // Related
  const related = products.filter(pr => pr.id !== id && (pr.brand === p.brand || pr.category === p.category)).slice(0, 4);
  document.getElementById('related-grid').innerHTML = related.length ? related.map(createProductCard).join('') : '<p style="color:var(--text-3);font-family:var(--font-ui);font-size:.875rem">No related pieces found.</p>';

  showPage('product');
  observeReveal();
}

function setMainImage(thumb, src, idx) {
  document.getElementById('detail-main-img').src = src;
  document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
  currentGalleryIdx = idx;
}

function galleryNav(dir) {
  if (!currentProduct) return;
  const imgs = (currentProduct.images && currentProduct.images.length) ? currentProduct.images : [PLACEHOLDER];
  currentGalleryIdx = (currentGalleryIdx + dir + imgs.length) % imgs.length;
  const thumbs = document.querySelectorAll('.thumb-img');
  document.getElementById('detail-main-img').src = imgs[currentGalleryIdx];
  thumbs.forEach((t, i) => t.classList.toggle('active', i === currentGalleryIdx));
}

function selectSize(size, el) {
  selectedSize = size;
  document.querySelectorAll('.size-opt').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

function addToCartFromDetail() {
  if (!currentProduct || currentProduct.status === 'soldout') return;
  if (currentProduct.sizes?.length > 1 && !selectedSize) { toast('Please select a size!'); return; }
  addToCart(currentProduct.id, selectedSize);
  toggleCart();
}

function buyNowFromDetail() {
  if (!currentProduct) return;
  if (currentProduct.sizes?.length > 1 && !selectedSize) { toast('Please select a size!'); return; }
  const p = currentProduct;
  const msg = `Hi THRIFTHUNDER, I want to buy this! ⚡\n\nProduct: ${p.name}\nBrand: ${p.brand}\nSize: ${selectedSize || 'One Size'}\nCondition: ${p.condition}\nPrice: ₹${p.price.toLocaleString('en-IN')}\n\nPlease confirm availability. Thank you!`;
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ═══════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════
let searchTimer;
function handleSearch(q) {
  const clearBtn = document.getElementById('search-clear');
  clearBtn.classList.toggle('visible', q.trim().length > 0);
  clearTimeout(searchTimer);
  if (!q.trim()) { showPage('home'); return; }
  searchTimer = setTimeout(() => runSearch(q), 300);
}

function runSearch(q) {
  const ql = q.toLowerCase();
  const results = products.filter(p =>
    p.name.toLowerCase().includes(ql) ||
    p.brand.toLowerCase().includes(ql) ||
    (p.description || '').toLowerCase().includes(ql) ||
    (p.category || '').toLowerCase().includes(ql)
  );
  document.getElementById('search-query-title').textContent = `"${q}"`;
  document.getElementById('search-result-count').textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
  const grid = document.getElementById('search-results-grid');
  const empty = document.getElementById('search-empty');
  if (!results.length) {
    grid.innerHTML = '';
    empty.style.display = '';
    document.getElementById('search-empty-msg').textContent = `No products match "${q}". Try a brand or style name.`;
  } else {
    empty.style.display = 'none';
    grid.innerHTML = results.map(createProductCard).join('');
    observeReveal();
  }
  showPage('search');
}

function clearSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.remove('visible');
  showPage('home');
}

// ═══════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════
function observeReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
}

// ═══════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════
function toast(msg, type = 'info', duration = 3200) {
  const icons = { success: '✓', info: 'ℹ', error: '✕' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, duration);
}

// ═══════════════════════════════════════════════
// ADMIN — AUTH
// ═══════════════════════════════════════════════
function openAdmin() {
  if (isAdmin) { showPage('admin'); return; }
  showPage('admin-login');
}

function adminLogin() {
  const pass = document.getElementById('admin-pass').value;
  if (pass === ADMIN_PASSWORD) {
    isAdmin = true;
    document.getElementById('admin-pass').value = '';
    showPage('admin');
    toast('Welcome, Admin! ⚡', 'success');
  } else {
    toast('Incorrect password. Try again.', 'error');
    document.getElementById('admin-pass').value = '';
  }
}

function togglePassVisibility() {
  const inp = document.getElementById('admin-pass');
  const eye = document.getElementById('pass-eye');
  if (inp.type === 'password') { inp.type = 'text'; eye.className = 'fa fa-eye-slash'; }
  else { inp.type = 'password'; eye.className = 'fa fa-eye'; }
}

// ═══════════════════════════════════════════════
// ADMIN — TABS
// ═══════════════════════════════════════════════
function switchAdminTab(tab, btn) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  btn?.classList.add('active');

  if (tab === 'dashboard') { renderAdminStats(); renderRecentProducts(); }
  if (tab === 'products')  { renderAdminList(); }
}

function updateAdminDate() {
  const el = document.getElementById('admin-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ═══════════════════════════════════════════════
// ADMIN — STATS
// ═══════════════════════════════════════════════
function renderAdminStats() {
  const total    = products.length;
  const available = products.filter(p => p.status !== 'soldout').length;
  const sold     = products.filter(p => p.status === 'soldout').length;
  const featured = products.filter(p => p.featured).length;
  document.getElementById('dash-total').textContent    = total;
  document.getElementById('dash-available').textContent = available;
  document.getElementById('dash-sold').textContent     = sold;
  document.getElementById('dash-featured').textContent  = featured;
  document.getElementById('admin-product-count').textContent = total;
}

function renderRecentProducts() {
  const el = document.getElementById('recent-products-list');
  if (!el) return;
  const recent = [...products].reverse().slice(0, 6);
  if (!recent.length) { el.innerHTML = '<p style="color:var(--text-3);font-size:.875rem;padding:.5rem 0">No products yet.</p>'; return; }
  el.innerHTML = recent.map(p => {
    const img = (p.images && p.images[0]) || PLACEHOLDER;
    return `<div class="recent-item">
      <img src="${img}" alt="${p.name}" onerror="this.src='${PLACEHOLDER}'" />
      <div class="recent-item-info">
        <strong>${p.name}</strong>
        <small>${p.brand} · ${p.category || ''} · ${p.status === 'soldout' ? '❌ Sold Out' : '✅ Available'}</small>
      </div>
      <span class="recent-item-price">₹${p.price.toLocaleString('en-IN')}</span>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════
// ADMIN — PRODUCT LIST
// ═══════════════════════════════════════════════
function renderAdminList(filter = '') {
  const el    = document.getElementById('admin-product-list');
  const empty = document.getElementById('admin-empty');
  let list = [...products].reverse();
  if (filter) {
    const q = filter.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }
  document.getElementById('admin-product-count').textContent = products.length;
  if (!list.length) { el.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  el.innerHTML = list.map(p => {
    const img = (p.images && p.images[0]) || PLACEHOLDER;
    const sPill = p.status === 'soldout'
      ? `<span class="status-pill status-soldout">Sold Out</span>`
      : `<span class="status-pill status-available">Available</span>`;
    return `
      <div class="admin-product-item">
        <img class="admin-product-img" src="${img}" alt="${p.name}" onerror="this.src='${PLACEHOLDER}'" />
        <div class="admin-product-details">
          <div class="admin-product-name">${p.name} ${sPill}</div>
          <div class="admin-product-meta">${p.brand} · ${p.category || '—'} · ${p.condition || '—'} · Sizes: ${(p.sizes||[]).join(', ')||'—'}</div>
        </div>
        <span class="admin-product-price">₹${p.price.toLocaleString('en-IN')}</span>
        <div class="admin-item-btns">
          <button class="admin-btn admin-btn-edit" onclick="editProduct(${p.id})"><i class="fa fa-pen"></i> Edit</button>
          <button class="admin-btn admin-btn-del" onclick="confirmDelete(${p.id})"><i class="fa fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

function filterAdminList(val) { renderAdminList(val); }

// ═══════════════════════════════════════════════
// ADMIN — IMAGE UPLOAD (Base64)
// ═══════════════════════════════════════════════
function initDragDrop() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files);
  });
  zone.addEventListener('click', e => {
    if (e.target.closest('.upload-choose-btn') || e.target.closest('#img-file-input')) return;
    document.getElementById('img-file-input').click();
  });
}

function handleFileSelect(files) {
  if (!files || !files.length) return;
  const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!fileArr.length) { toast('Please select image files only', 'error'); return; }

  showUploadProgress(0, `Processing ${fileArr.length} image${fileArr.length>1?'s':''}…`);

  let processed = 0;
  fileArr.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      // Compress/resize via canvas
      compressImage(e.target.result, 800, (dataUrl) => {
        const imgId = ++imgIdCounter;
        pendingImages.push({ id: imgId, dataUrl });
        processed++;
        const pct = Math.round((processed / fileArr.length) * 100);
        showUploadProgress(pct, `Processed ${processed}/${fileArr.length}…`);
        renderImagePreviews();
        if (processed === fileArr.length) {
          hideUploadProgress();
          toast(`${processed} image${processed>1?'s':''} ready!`, 'success');
        }
      });
    };
    reader.readAsDataURL(file);
  });
}

function compressImage(dataUrl, maxSize, cb) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    let { width, height } = img;
    if (width > height) {
      if (width > maxSize) { height = height * maxSize / width; width = maxSize; }
    } else {
      if (height > maxSize) { width = width * maxSize / height; height = maxSize; }
    }
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    cb(canvas.toDataURL('image/jpeg', 0.82));
  };
  img.src = dataUrl;
}

function showUploadProgress(pct, label) {
  const wrap = document.getElementById('upload-progress-wrap');
  const bar  = document.getElementById('upload-progress-bar');
  const lbl  = document.getElementById('upload-progress-label');
  wrap.style.display = '';
  bar.style.setProperty('--progress', pct + '%');
  lbl.textContent = label;
}

function hideUploadProgress() {
  setTimeout(() => {
    document.getElementById('upload-progress-wrap').style.display = 'none';
  }, 800);
}

function renderImagePreviews() {
  const grid = document.getElementById('image-preview-grid');
  grid.innerHTML = pendingImages.map((img, i) => `
    <div class="preview-item" draggable="true" data-img-id="${img.id}">
      <img src="${img.dataUrl}" alt="Preview ${i+1}" />
      <button class="preview-remove" onclick="removePreviewImage(${img.id})" title="Remove">
        <i class="fa fa-times"></i>
      </button>
    </div>`).join('');
}

function removePreviewImage(imgId) {
  pendingImages = pendingImages.filter(i => i.id !== imgId);
  renderImagePreviews();
}

// ═══════════════════════════════════════════════
// ADMIN — SAVE / EDIT / DELETE
// ═══════════════════════════════════════════════
function saveProduct() {
  const editId   = document.getElementById('edit-product-id').value;
  const name     = document.getElementById('p-name').value.trim();
  const brand    = document.getElementById('p-brand').value.trim();
  const price    = parseInt(document.getElementById('p-price').value);
  const desc     = document.getElementById('p-desc').value.trim();
  const condition = document.getElementById('p-condition').value;
  const status   = document.getElementById('p-status').value;
  const category = document.getElementById('p-category').value;
  const sizesRaw = document.getElementById('p-sizes').value.trim();
  const featured = document.getElementById('p-featured').checked;

  if (!name)  { toast('Product Name is required', 'error'); return; }
  if (!brand) { toast('Brand is required', 'error'); return; }
  if (!price || price <= 0) { toast('Enter a valid price', 'error'); return; }

  const sizes  = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  const images = pendingImages.map(i => i.dataUrl);

  if (editId) {
    const idx = products.findIndex(p => p.id === parseInt(editId));
    if (idx !== -1) {
      // Keep existing images if no new ones uploaded
      const existingImages = images.length > 0 ? images : products[idx].images;
      products[idx] = { ...products[idx], name, brand, price, description: desc, condition, status, category, sizes, featured, images: existingImages };
      toast(`"${name}" updated!`, 'success');
    }
  } else {
    if (!images.length) { toast('Upload at least one image', 'error'); return; }
    products.push({ id: nextId++, name, brand, price, description: desc, condition, status, category, sizes, featured, images });
    toast(`"${name}" added!`, 'success');
  }

  saveProducts();
  resetProductForm();
  renderAdminStats();
  renderAdminList();
  renderRecentProducts();
  renderFeatured();
  renderAllProducts();
  renderBrandFilters();
  updateStatCount();
  switchAdminTab('products', document.querySelectorAll('.admin-nav-btn')[2]);
}

function editProduct(id) {
  const p = products.find(pr => pr.id === id);
  if (!p) return;

  document.getElementById('edit-product-id').value = p.id;
  document.getElementById('p-name').value      = p.name;
  document.getElementById('p-brand').value     = p.brand;
  document.getElementById('p-price').value     = p.price;
  document.getElementById('p-desc').value      = p.description || '';
  document.getElementById('p-condition').value = p.condition || 'Thrifted';
  document.getElementById('p-status').value    = p.status || 'available';
  document.getElementById('p-category').value  = p.category || 'Tops';
  document.getElementById('p-sizes').value     = (p.sizes || []).join(', ');
  document.getElementById('p-featured').checked = !!p.featured;
  document.getElementById('form-mode-title').textContent = `Edit: ${p.name}`;

  // Load existing images into pendingImages
  pendingImages = (p.images || []).map(dataUrl => ({ id: ++imgIdCounter, dataUrl }));
  renderImagePreviews();

  switchAdminTab('add', document.querySelectorAll('.admin-nav-btn')[1]);
}

function resetProductForm() {
  document.getElementById('edit-product-id').value = '';
  document.getElementById('p-name').value      = '';
  document.getElementById('p-brand').value     = '';
  document.getElementById('p-price').value     = '';
  document.getElementById('p-desc').value      = '';
  document.getElementById('p-condition').value = 'Thrifted';
  document.getElementById('p-status').value    = 'available';
  document.getElementById('p-category').value  = 'Tops';
  document.getElementById('p-sizes').value     = '';
  document.getElementById('p-featured').checked = false;
  document.getElementById('form-mode-title').textContent = 'Add New Product';
  pendingImages = [];
  renderImagePreviews();
  document.getElementById('img-file-input').value = '';
  hideUploadProgress();
}

// ── DELETE CONFIRM MODAL ──
function confirmDelete(id) {
  const p = products.find(pr => pr.id === id);
  if (!p) return;
  pendingDeleteId = id;
  document.getElementById('modal-msg').textContent = `Delete "${p.name}"? This cannot be undone.`;
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-confirm-btn').onclick = executeDelete;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  pendingDeleteId = null;
}

function executeDelete() {
  if (!pendingDeleteId) return;
  const p = products.find(pr => pr.id === pendingDeleteId);
  products = products.filter(pr => pr.id !== pendingDeleteId);
  cart     = cart.filter(i => i.productId !== pendingDeleteId);
  wishlist = wishlist.filter(id => id !== pendingDeleteId);
  saveProducts(); saveCart(); saveWishlist();
  updateCartBadge(); updateWishlistBadge();
  renderAdminStats(); renderAdminList(); renderRecentProducts();
  renderFeatured(); renderAllProducts(); renderBrandFilters(); updateStatCount();
  closeModal();
  toast(`"${p?.name || 'Product'}" deleted.`);
}