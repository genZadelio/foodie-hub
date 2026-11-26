import { menu, menuByCuisine, menuById } from './data/index.js';
import { offers } from './data/offers.js';
import {
  state,
  saveState,
  getDraftItems,
  getDraftCount,
  calculateBill,
  getOfferEligibility,
  addToDraft,
  updateDraftQuantity,
  removeFromDraft,
  applyOfferByCode,
  removeOffer,
  createOrder,
  advanceOrder,
  markPaid,
  resetDemoState,
  toggleFavorite,
  getFavorites,
  isFavorite,
  setTable,
  reorderOrder,
  apiFetchMenu,
  apiFetchOffers,
  apiPlaceOrder,
  apiFetchOrderStatus,
} from './state.js';
import { icon, hydrateIcons } from './icons.js';

const cuisineInfo = [
  {
    name: 'Chinese',
    short: 'CN',
    icon: '🥢',
    tagline: 'Wok-fired classics & comfort bowls',
    description: 'Aromatic wok recipes, silky noodles and comforting Chinese staples.',
    image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=900&q=85',
    accent: '#ef8354',
    pale: '#fff1e8',
  },
  {
    name: 'Japanese',
    short: 'JP',
    icon: '🍣',
    tagline: 'Precision, freshness & quiet beauty',
    description: 'Hand-pressed sushi, warm ramen and seasonal Japanese plates.',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=85',
    accent: '#7c83fd',
    pale: '#efefff',
  },
  {
    name: 'Indian',
    short: 'IN',
    icon: '🍛',
    tagline: 'Deeply spiced, richly layered',
    description: 'North Indian classics, fragrant biryanis and naturally fermented breads.',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=85',
    accent: '#d97706',
    pale: '#fff7df',
  },
  {
    name: 'South Indian',
    short: 'SI',
    icon: '🥞',
    tagline: 'Crisp dosas & bold South flavours',
    description: 'Golden dosas, classic sambar and Filter Coffee made the traditional way.',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85',
    accent: '#0f9f76',
    pale: '#e8faf3',
  },
  {
    name: 'Italian',
    short: 'IT',
    icon: '🍝',
    tagline: 'Slow food, handmade with heart',
    description: 'Wood-fired pizza, hand-made pasta and generous Italian comfort.',
    image: 'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85',
    accent: '#e14b4b',
    pale: '#fff0ef',
  },
  {
    name: 'Korean',
    short: 'KR',
    icon: '🌶️',
    tagline: 'Bold comfort, smoky and sweet',
    description: 'Crispy Korean fried chicken, sizzling BBQ and comforting stews.',
    image: 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=900&q=85',
    accent: '#c43d75',
    pale: '#fff0f6',
  },
];

const WALLET_BALANCE_PAISES = 240000;

const validViews = ['discover', 'drafts', 'orders', 'offers', 'manager', 'safety', 'sweet-corner'];

const ui = {
  view: 'discover',
  filter: 'all',
  category: 'all',
  sort: 'popular',
  search: '',
  visibleCount: 12,
  favoritesView: false,
  selectedPayment: 'card',
  paymentOrderId: null,
  carouselIndex: 0,
  loading: false,
  dishDetail: null,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cuisineInfoByName = Object.fromEntries(cuisineInfo.map((cuisine) => [cuisine.name, cuisine]));

function escapeHtml(value = '') {
  const amp = String.fromCharCode(38);
  return String(value)
    .replaceAll('&', `${amp}amp;`)
    .replaceAll('<', `${amp}lt;`)
    .replaceAll('>', `${amp}gt;`)
    .replaceAll('"', `${amp}quot;`)
    .replaceAll("'", `${amp}#039;`);
}

function formatPaise(paise = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(paise / 100) ? 0 : 2,
  }).format(paise / 100);
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(dateString).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function statusLabel(status) {
  return {
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready',
    served: 'Served',
    cancelled: 'Cancelled',
  }[status] || status;
}

function paymentLabel(method) {
  return {
    card: 'Credit / Debit card',
    debit: 'Debit card',
    upi: 'UPI',
    netbanking: 'Net banking',
    wallet: 'Foodie wallet',
    cod: 'Pay at table',
  }[method] || method;
}

function paymentStatusLabel(order) {
  if (order.paymentStatus === 'paid') return `Paid via ${paymentLabel(order.paymentMethod)}`;
  if (order.paymentStatus === 'pending') return 'Pay at table';
  return 'Payment due';
}

function orderById(orderId) {
  return state.orders.find((order) => order.id === orderId);
}

function getFilteredMenu() {
  let items = [...menu];
  const query = ui.search.trim().toLowerCase();

  if (query) {
    items = items.filter((item) =>
      [item.name, item.description, item.cuisine, item.category, ...(item.tags || [])]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }

  if (ui.filter.startsWith('cuisine:')) {
    const cuisine = ui.filter.split(':')[1];
    items = items.filter((item) => item.cuisine === cuisine);
  } else if (ui.filter === 'veg') {
    items = items.filter((item) => item.isVeg);
  } else if (ui.filter === 'nonveg') {
    items = items.filter((item) => !item.isVeg);
  } else if (ui.filter === 'spicy') {
    items = items.filter((item) => item.spiceLevel >= 2);
  } else if (ui.filter === 'special') {
    items = items.filter((item) => item.isChefSpecial);
  } else if (ui.filter === 'under300') {
    items = items.filter((item) => item.price < 300);
  } else if (ui.filter === 'favorites') {
    const favIds = new Set(state.favorites);
    items = items.filter((item) => favIds.has(item.id));
  }

  if (ui.sort === 'rating') items.sort((a, b) => b.rating - a.rating);
  if (ui.sort === 'price-low') items.sort((a, b) => a.price - b.price);
  if (ui.sort === 'price-high') items.sort((a, b) => b.price - a.price);
  if (ui.sort === 'fast') {
    const minutes = (item) => Number.parseInt(item.prepTime, 10) || 30;
    items.sort((a, b) => minutes(a) - minutes(b));
  }
  if (ui.sort === 'popular') {
    items.sort((a, b) => (b.rating * 10 + (b.isChefSpecial ? 5 : 0)) - (a.rating * 10 + (a.isChefSpecial ? 5 : 0)));
  }

  return items;
}

function getCategories(items) {
  const seen = new Set();
  const cats = [];
  for (const item of items) {
    if (item.category && !seen.has(item.category)) {
      seen.add(item.category);
      cats.push(item.category);
    }
  }
  return cats.sort();
}

function renderCategoryChips(items) {
  const row = $('#category-row');
  if (!row) return;
  const categories = getCategories(items);
  const chips = [
    { id: 'all', label: 'All categories', icon: 'grid' },
    ...categories.map((cat) => ({ id: `cat:${cat}`, label: cat, icon: 'slash' })),
  ];
  row.innerHTML = chips.map((filter) => {
    const active = ui.filter === filter.id || ui.category === filter.id;
    const iconHtml = filter.icon.length <= 3 ? filter.icon : icon(filter.icon);
    return `<button class="filter-chip ${active ? 'active' : ''}" data-filter="${filter.id}" aria-pressed="${active}">
      <span class="chip-icon">${iconHtml}</span>${filter.label}
    </button>`;
  }).join('');
}

function formatCategoryLabel(cat) {
  return String(cat)
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function renderDishDetail(item) {
  if (!item) return;
  const fav = isFavorite(item.id);
  const tags = (item.tags || []).map((t) => `<span class="tag-pill">${escapeHtml(t)}</span>`).join('');
  const content = `
    <div class="dish-detail">
      <div class="dish-detail-media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="eager" />
        <div class="dish-detail-badges">
          ${item.isVeg ? '<span class="diet-mark veg" role="img" aria-label="Vegetarian"></span>' : '<span class="diet-mark nonveg" role="img" aria-label="Non-vegetarian"></span>'}
          ${item.isChefSpecial ? '<span class="chef-special-badge">Chef pick</span>' : ''}
          ${item.spiceLevel ? `<span class="spicy-tag">${'🌶️'.repeat(item.spiceLevel)}</span>` : ''}
        </div>
        <button class="icon-button heart-toggle" data-favorite="${item.id}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from favourites' : 'Add to favourites'}">
          ${icon(fav ? 'heart-fill' : 'heart')}
        </button>
      </div>
      <div class="dish-detail-copy">
        <div class="dish-detail-meta"><span>${escapeHtml(item.cuisine)}</span><span>${icon('star')} ${item.rating.toFixed(1)}</span><span>${icon('timer')} ${escapeHtml(item.prepTime)}</span></div>
        <h2 id="dish-title">${escapeHtml(item.name)}</h2>
        <p class="dish-detail-desc">${escapeHtml(item.description)}</p>
        <div class="dish-detail-tags">${tags}</div>
        <div class="dish-detail-price"><strong>${formatPaise(item.price * 100)}</strong><small>per serving</small></div>
        <div class="dish-detail-actions">
          <button class="button button-primary button-full" data-add="${item.id}">${icon('plus')} Add to draft</button>
          <button class="button button-soft button-full" data-favorite="${item.id}" aria-pressed="${fav}">${fav ? `${icon('heart-fill')} Favourited` : `${icon('heart')} Favourite`}</button>
        </div>
        <p class="dish-detail-note">${icon('info')} Added quantities are grouped by the ${escapeHtml(item.cuisine)} kitchen in your table order.</p>
      </div>
    </div>`;
  $('#dish-dialog-content').innerHTML = content;
}

function openDishDetail(itemId) {
  const item = menuById.get(itemId);
  if (!item) return;
  ui.dishDetail = itemId;
  renderDishDetail(item);
  showDialog('#dish-dialog');
}

function startCarousel() {
  if (window.__foodieCarousel) return;
  window.__foodieCarousel = true;
  const heroImages = [
    'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=85',
    'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=1200&q=85',
  ];
  setInterval(() => {
    if (ui.view !== 'discover') return;
    ui.carouselIndex = (ui.carouselIndex + 1) % heroImages.length;
    const img = $('.hero-image-main');
    if (img) {
      img.style.opacity = '0';
      window.setTimeout(() => {
        img.src = heroImages[ui.carouselIndex];
        img.style.opacity = '1';
      }, 300);
    }
  }, 5000);
}

function renderCuisineGrid() {
  const grid = $('#cuisine-grid');
  if (!grid) return;
  grid.innerHTML = cuisineInfo.map((cuisine) => {
    const draftCount = (state.drafts[cuisine.name] || []).reduce((sum, line) => sum + line.qty, 0);
    const count = menuByCuisine[cuisine.name]?.length || 0;
    return `
      <article class="cuisine-card" style="--cuisine-accent:${cuisine.accent};--cuisine-pale:${cuisine.pale}">
        <button class="cuisine-card-button" data-cuisine="${cuisine.name}" aria-label="Browse ${cuisine.name} menu">
          <span class="cuisine-image-wrap">
            <img src="${cuisine.image}" alt="${cuisine.name} cuisine" loading="lazy" />
            <span class="cuisine-icon">${cuisine.icon}</span>
            ${draftCount ? `<span class="cuisine-draft-count">${draftCount} in draft</span>` : ''}
          </span>
          <span class="cuisine-card-body">
            <span class="cuisine-title-row"><strong>${cuisine.name}</strong><span>${count} dishes</span></span>
            <small>${cuisine.tagline}</small>
            <span class="cuisine-link">Open kitchen ${icon('arrow-right')}</span>
          </span>
        </button>
      </article>`;
  }).join('');
}

function renderFilterChips() {
  const row = $('#filter-row');
  if (!row) return;
  const filters = [
    { id: 'all', label: 'All dishes', icon: 'grid' },
    ...cuisineInfo.map((cuisine) => ({ id: `cuisine:${cuisine.name}`, label: cuisine.name, icon: cuisine.icon })),
    { id: 'veg', label: 'Vegetarian', icon: 'leaf' },
    { id: 'nonveg', label: 'Non-vegetarian', icon: 'flame' },
    { id: 'spicy', label: 'Spicy', icon: 'flame' },
    { id: 'special', label: 'Chef specials', icon: 'chef' },
    { id: 'under300', label: 'Under ₹300', icon: 'wallet' },
    { id: 'favorites', label: 'Favourites', icon: 'heart-fill' },
  ];
  row.innerHTML = filters.map((filter) => `
    <button class="filter-chip ${ui.filter === filter.id ? 'active' : ''}" data-filter="${filter.id}" aria-pressed="${ui.filter === filter.id}">
      <span class="chip-icon">${filter.icon.length <= 3 ? filter.icon : icon(filter.icon)}</span>${filter.label}
    </button>`).join('');
}

function menuCard(item) {
  const quantity = (state.drafts[item.cuisine] || []).find((line) => line.itemId === item.id)?.qty || 0;
  const tags = (item.tags || []).slice(0, 2);
  return `
    <article class="menu-card" data-detail="${item.id}">
      <div class="menu-card-media">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
        <span class="diet-mark ${item.isVeg ? 'veg' : 'nonveg'}" role="img" aria-label="${item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}" title="${item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}"></span>
        ${item.isChefSpecial ? '<span class="chef-special-badge">Chef pick</span>' : ''}
        <button class="card-heart icon-button" aria-label="Save ${escapeHtml(item.name)}" aria-pressed="${isFavorite(item.id)}" data-favorite="${item.id}" class="heart-toggle">${isFavorite(item.id) ? icon('heart-fill') : icon('heart')}</button>
      </div>
      <div class="menu-card-hint"><span>${icon('arrow-right')}</span><span>View details</span></div>
      <div class="menu-card-body">
        <div class="menu-card-meta"><span>${escapeHtml(item.cuisine)}</span><span>${icon('star')} ${item.rating.toFixed(1)}</span></div>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}${item.spiceLevel ? `<span class="spicy-tag">${'🌶️'.repeat(item.spiceLevel)}</span>` : ''}</div>
        <div class="menu-card-footer">
          <div><strong>${formatPaise(item.price * 100)}</strong><small>${icon('timer')} ${escapeHtml(item.prepTime)}</small></div>
          <button class="add-button ${quantity ? 'added' : ''}" data-add="${item.id}" aria-label="Add ${escapeHtml(item.name)} to ${escapeHtml(item.cuisine)} draft">
            ${quantity ? `${icon('check')} ${quantity}` : `${icon('plus')} Add`}
          </button>
        </div>
      </div>
    </article>`;
}

function renderMenu() {
  const grid = $('#menu-grid');
  if (!grid) return;
  const filtered = getFilteredMenu();
  const visible = filtered.slice(0, ui.visibleCount);
  grid.innerHTML = visible.length
    ? visible.map(menuCard).join('')
    : `<div class="empty-search"><span>${icon('search')}</span><h3>No dishes found</h3><p>Try another ingredient or clear your filters.</p><button class="button button-soft" data-action="clear-filters">Clear filters</button></div>`;
  $('#load-more').hidden = visible.length >= filtered.length;
  $('#load-more').textContent = `Show more choices (${Math.max(0, filtered.length - visible.length)} remaining)`;
  $('#menu-result-count').textContent = `Showing ${visible.length} of ${formatNumber(filtered.length)} dishes · prices include kitchen care, no hidden fees`;
}

function renderDraftSummary() {
  const container = $('#draft-summary');
  if (!container) return;
  const bill = calculateBill();
  const activeCuisines = cuisineInfo.filter((cuisine) => (state.drafts[cuisine.name] || []).length);

  if (!activeCuisines.length) {
    container.innerHTML = `
      <div class="empty-dock">
        <span class="empty-dock-icon">${icon('bookmark')}</span>
        <strong>Your table is waiting</strong>
        <p>Add dishes from any kitchen. We’ll group them into separate cuisine drafts.</p>
      </div>`;
  } else {
    container.innerHTML = activeCuisines.map((cuisine) => {
      const lines = state.drafts[cuisine.name];
      const count = lines.reduce((sum, line) => sum + line.qty, 0);
      const subtotal = lines.reduce((sum, line) => sum + line.qty * ((menu.find((item) => item.id === line.itemId)?.price || 0) * 100), 0);
      return `
        <button class="draft-group" data-cuisine="${cuisine.name}">
          <span class="draft-group-icon" style="background:${cuisine.pale}">${cuisine.icon}</span>
          <span><strong>${cuisine.name}</strong><small>${count} ${count === 1 ? 'item' : 'items'} · ${escapeHtml(cuisine.short)} kitchen</small></span>
          <strong>${formatPaise(subtotal)}</strong>
        </button>`;
    }).join('');
  }

  $('#dock-total').textContent = formatPaise(bill.totalPaise);
  $('#draft-nav-count').textContent = bill.itemCount;
  $('#payment-fab-total').textContent = formatPaise(bill.totalPaise);
  $('#payment-fab').classList.toggle('has-balance', bill.totalPaise > 0);
}

function renderDiscover() {
  renderCuisineGrid();
  renderFilterChips();
  renderCategoryChips(getFilteredMenu());
  renderMenu();
  renderDraftSummary();
}

function renderDraftsView() {
  const view = $('#view-drafts');
  const bill = calculateBill();
  const lines = getDraftItems();
  const groups = cuisineInfo.map((cuisine) => ({ cuisine, lines: lines.filter((line) => line.cuisine === cuisine.name) })).filter((group) => group.lines.length);

  view.innerHTML = `
    <div class="view-header">
      <div><p class="eyebrow"><span class="pulse-dot"></span> Auto-saved just now</p><h1 id="drafts-title">Your cuisine drafts</h1><p class="page-subtitle">One thoughtful order, coordinated across every kitchen.</p></div>
      <button class="button button-primary" data-action="review-order" ${bill.itemCount ? '' : 'disabled'}>Review & place order ${icon('arrow-right')}</button>
    </div>
    <div class="stats-grid">
      ${statCard('Items in draft', bill.itemCount, 'bookmark', 'Across all cuisines')}
      ${statCard('Kitchens', bill.cuisineCount, 'users', 'Working as one team')}
      ${statCard('Subtotal', formatPaise(bill.subtotalPaise), 'wallet', 'Before GST and delivery')}
      ${statCard('You save', formatPaise(bill.savingsPaise), 'sparkles', bill.eligibleOffer?.title || 'Apply an offer')}
    </div>
    ${groups.length ? `
      <div class="draft-board">
        ${groups.map(({ cuisine, lines: groupLines }) => `
          <article class="draft-board-card">
            <div class="draft-board-head" style="--cuisine-accent:${cuisine.accent};--cuisine-pale:${cuisine.pale}">
              <div class="draft-cuisine-icon">${cuisine.icon}</div>
              <div><span>${escapeHtml(cuisine.short)} kitchen</span><h2>${cuisine.name}</h2><p>${escapeHtml(cuisine.tagline)}</p></div>
              <button class="button button-soft" data-cuisine="${cuisine.name}">Add more</button>
            </div>
            <div class="draft-lines">
              ${groupLines.map((line) => `
                <div class="draft-line">
                  <img src="${escapeHtml(line.item.image)}" alt="" />
                  <div class="draft-line-copy"><strong>${escapeHtml(line.item.name)}</strong><span>${escapeHtml(line.item.category)} · ${escapeHtml(line.item.prepTime)}</span></div>
                  <strong>${formatPaise(line.item.price * 100 * line.qty)}</strong>
                  <div class="quantity-control" aria-label="Quantity for ${escapeHtml(line.item.name)}">
                    <button data-qty="-1" data-cuisine="${cuisine.name}" data-item="${line.itemId}" aria-label="Decrease quantity">${icon('minus')}</button>
                    <span>${line.qty}</span>
                    <button data-qty="1" data-cuisine="${cuisine.name}" data-item="${line.itemId}" aria-label="Increase quantity">${icon('plus')}</button>
                  </div>
                  <button class="icon-button danger-hover" data-remove-item="${line.itemId}" data-cuisine="${cuisine.name}" aria-label="Remove ${escapeHtml(line.item.name)}">${icon('trash')}</button>
                </div>`).join('')}
            </div>
          </article>`).join('')}
      </div>` : `
      <div class="empty-page-card">
        <span class="empty-page-icon">${icon('bookmark')}</span><h2>No drafts yet</h2><p>Explore any kitchen and add a few dishes. They’ll appear here grouped by cuisine.</p><button class="button button-primary" data-nav="discover">Explore dishes</button>
      </div>`}`;
}

function statCard(label, value, iconName, detail) {
  return `<article class="stat-card"><span class="stat-icon">${icon(iconName)}</span><div><span>${label}</span><strong>${value}</strong><small>${detail}</small></div></article>`;
}

function renderOrdersView() {
  const view = $('#view-orders');
  const dueOrder = state.orders.find((order) => order.paymentStatus === 'due');
  view.innerHTML = `
    <div class="view-header">
      <div><p class="eyebrow">From our kitchen to your table</p><h1 id="orders-title">Your orders</h1><p class="page-subtitle">Live kitchen status, transparent bills and secure payment.</p></div>
      <button class="button button-soft" data-nav="discover">Order something new</button>
    </div>
    ${state.orders.length ? `<div class="orders-list">${state.orders.map(orderCard).join('')}</div>` : `
      <div class="empty-page-card"><span class="empty-page-icon">${icon('receipt')}</span><h2>Your first feast starts here</h2><p>Choose dishes across any of our six kitchens. We’ll coordinate a single table-ready order.</p><button class="button button-primary" data-nav="discover">Explore the menu</button></div>`}
    ${dueOrder ? `<button class="payment-banner" data-action="open-payment" data-order-id="${dueOrder.id}"><span class="payment-banner-icon">${icon('wallet')}</span><span><small>Payment due for ${dueOrder.id}</small><strong>${formatPaise(dueOrder.bill.totalPaise)}</strong></span><span>Pay securely ${icon('arrow-right')}</span></button>` : ''}`;
}

function orderCard(order) {
  const itemSummary = order.items.map((item) => `${item.qty}× ${item.name}`).join(' · ');
  return `
    <article class="order-card">
      <div class="order-card-head">
        <div class="order-id-mark">${icon('receipt')}</div>
        <div><span>${timeAgo(order.createdAt)}</span><strong>${order.id}</strong></div>
        <span class="status-pill ${order.status}">${statusLabel(order.status)}</span>
        <span class="payment-pill ${order.paymentStatus}">${order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'pending' ? 'Pay at table' : 'Payment due'}</span>
        <strong class="order-total">${formatPaise(order.bill.totalPaise)}</strong>
      </div>
      <div class="order-card-body">
        <p>${escapeHtml(itemSummary)}</p>
        <div class="order-meta"><span>${icon('users')} ${order.partnerStations.length} partner kitchens</span><span>${icon('pin')} Table ${order.customer.table}</span><span>${icon('clock')} ETA ${Math.max(...order.partnerStations.map((station) => station.prepMinutes))} min</span></div>
      </div>
      <div class="order-card-actions">
        <button class="button button-soft" data-track-order="${order.id}">Track order</button>
        <button class="button button-soft" data-reorder="${order.id}">${icon('bookmark')} Reorder</button>
        ${order.paymentStatus === 'due' ? `<button class="button button-primary" data-action="open-payment" data-order-id="${order.id}">View bill & pay</button>` : order.paymentStatus === 'paid' ? `<button class="button button-soft" data-receipt="${order.id}">${icon('download')} Receipt</button>` : ''}
      </div>
    </article>`;
}

function renderOffersView() {
  const view = $('#view-offers');
  const bill = calculateBill();
  view.innerHTML = `
    <div class="view-header">
      <div><p class="eyebrow">Small treats, bigger cravings</p><h1 id="offers-title">Offers made for good taste</h1><p class="page-subtitle">Savings are applied clearly before you accept your bill.</p></div>
    </div>
    <div class="offer-hero">
      <div><span class="hero-kicker">Taste passport</span><h2>Order across kitchens.<br /><em>Pay less, smile more.</em></h2><p>Combine dishes from three or more cuisines and unlock flat savings with one simple code.</p></div>
      <div class="offer-passport"><span>FOODIE</span><strong>PASS</strong><small>6 cuisines · 1 table</small></div>
    </div>
    <div class="offer-grid">
      ${offers.map((offer) => {
        const active = bill.eligibleOffer?.id === offer.id;
        const eligibility = getOfferEligibility(offer, bill);
        const unavailableLabel = eligibility.count
          ? `Add ${eligibility.count} more ${eligibility.count === 1 ? 'cuisine' : 'cuisines'}`
          : `Add ₹${eligibility.amount || 0} more`;
        return `<article class="offer-card ${active ? 'active' : ''} ${offer.accent}">
          <div class="offer-card-top"><span class="offer-icon">${icon(offer.icon)}</span><span class="offer-type">${offer.type === 'percent' ? `${offer.value}% OFF` : `₹${offer.value} OFF`}</span></div>
          <h3>${offer.title}</h3><p>${offer.subtitle}</p>
          <div class="offer-terms"><span>Min. order ₹${offer.minOrder}</span>${offer.minCuisines ? `<span>${offer.minCuisines}+ cuisines</span>` : ''}<span>Max savings ₹${offer.maxDiscount}</span><span>Expires ${offer.expires}</span></div>
          <div class="coupon-code"><span>${offer.code}</span><button data-copy-code="${offer.code}" aria-label="Copy offer code ${offer.code}">${icon('copy')}</button></div>
          ${active ? `<button class="button button-soft button-full" data-remove-offer>Offer applied ✓</button>` : `<button class="button ${eligibility.eligible ? 'button-primary' : 'button-soft'} button-full" data-apply-code="${offer.code}" ${eligibility.eligible ? '' : 'disabled'} aria-label="${eligibility.eligible ? `Apply ${offer.title}` : eligibility.reason}">${eligibility.eligible ? 'Apply offer' : unavailableLabel}</button>`}
        </article>`;
      }).join('')}
    </div>`;
}

function renderManagerView() {
  const view = $('#view-manager');
  const activeOrders = state.orders.filter((order) => !['served', 'cancelled'].includes(order.status));
  const revenue = state.orders.reduce((sum, order) => sum + order.bill.totalPaise, 0);
  const popular = [...menu].sort((a, b) => (b.rating + (b.isChefSpecial ? 1 : 0)) - (a.rating + (a.isChefSpecial ? 1 : 0))).slice(0, 5);
  const stationRows = cuisineInfo.map((cuisine) => {
    const station = state.orders.flatMap((order) => order.partnerStations).find((entry) => entry.cuisine === cuisine.name);
    return { cuisine, station };
  });
  view.innerHTML = `
    <div class="view-header manager-header">
      <div><p class="eyebrow"><span class="pulse-dot"></span> Live operations</p><h1 id="manager-title">Manager command board</h1><p class="page-subtitle">One calm view across every cuisine, order and partner station.</p></div>
      <div class="manager-actions"><button class="button button-soft" data-action="reset-demo">Reset demo</button><button class="button button-primary" data-action="print-ops">${icon('printer')} Print shift</button></div>
    </div>
    <div class="stats-grid manager-stats">
      ${statCard('Orders today', state.orders.length, 'receipt', `${activeOrders.length} still active`)}
      ${statCard('Gross sales', formatPaise(revenue), 'wallet', 'Includes GST')}
      ${statCard('Live kitchens', 6, 'chef', 'All accepting orders')}
      ${statCard('Avg. fulfilment', '24 min', 'timer', '4 min faster this week')}
    </div>
    <div class="manager-grid">
      <section class="manager-panel order-ops-panel">
        <div class="panel-heading"><div><span class="section-kicker">Fulfilment flow</span><h2>Active order tickets</h2></div><span class="live-badge"><i></i> Live</span></div>
        ${state.orders.length ? `<div class="ops-table-wrap"><table class="ops-table"><thead><tr><th>Order</th><th>Items</th><th>Kitchens</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>${state.orders.map((order) => `<tr><td><strong>${order.id}</strong><small>${timeAgo(order.createdAt)}</small></td><td>${order.items.reduce((sum, item) => sum + item.qty, 0)} items</td><td>${order.partnerStations.length}</td><td><span class="status-pill ${order.status}">${statusLabel(order.status)}</span></td><td><strong>${formatPaise(order.bill.totalPaise)}</strong></td><td><button class="table-action" data-advance-order="${order.id}" ${['served', 'cancelled'].includes(order.status) ? 'disabled' : ''}>${['served', 'cancelled'].includes(order.status) ? 'Done' : 'Advance'}</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="compact-empty">${icon('receipt')}<strong>No active tickets</strong><p>Place a customer order to preview the fulfilment flow.</p></div>`}
      </section>
      <section class="manager-panel station-panel">
        <div class="panel-heading"><div><span class="section-kicker">Partner network</span><h2>Kitchen stations</h2></div><button class="text-button" data-action="partner-health">Health details</button></div>
        <div class="station-list">${stationRows.map(({ cuisine, station }) => `<div class="station-row"><span class="station-avatar" style="background:${cuisine.pale}">${cuisine.icon}</span><div><strong>${cuisine.name} kitchen</strong><small>${station ? station.chef : 'Chef available'} · ${station ? `${station.prepMinutes} min ETA` : '18 min avg.'}</small></div><span class="station-status ${station?.status || 'online'}"><i></i>${station ? statusLabel(station.status) : 'Online'}</span></div>`).join('')}</div>
      </section>
      <section class="manager-panel popular-panel">
        <div class="panel-heading"><div><span class="section-kicker">Menu intelligence</span><h2>Customer favourites</h2></div><span class="panel-note">By rating + demand</span></div>
        <div class="popular-list">${popular.map((item, index) => `<div><span class="rank">${index + 1}</span><img src="${item.image}" alt="" /><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.cuisine)} · ${item.price} · ${item.rating} ★</small></span><span class="demand">${88 - index * 7}%</span></div>`).join('')}</div>
      </section>
      <section class="manager-panel service-panel">
        <div class="panel-heading"><div><span class="section-kicker">Service health</span><h2>Quality controls</h2></div></div>
        <div class="health-metrics"><div><span>Order accuracy</span><strong>98.6%</strong><i style="--value:98%"></i></div><div><span>Hygiene score</span><strong>4.9 / 5</strong><i style="--value:96%"></i></div><div><span>On-time prep</span><strong>94%</strong><i style="--value:94%"></i></div></div>
        <div class="policy-note">${icon('shield-check')}<span><strong>Safety standard active</strong><small>Temperature checks and partner certification verified today.</small></span></div>
      </section>
    </div>`;
}

function renderSafetyView() {
  const view = $('#view-safety');
  view.innerHTML = `
    <div class="view-header"><div><p class="eyebrow">Trust is part of the recipe</p><h1 id="safety-title">Safety & fair-pricing policy</h1><p class="page-subtitle">Clear standards for every order, partner and rupee.</p></div><span class="policy-verified">${icon('shield-check')} Standards verified</span></div>
    <div class="policy-grid">
      <article class="policy-card hero-policy"><span>${icon('shield')}</span><h2>Food safety first</h2><p>Partner kitchens maintain FSSAI-compliant hygiene, allergen protocols and daily temperature logs. Only verified kitchens join Foodie Hub.</p><ul><li>${icon('check')} Daily kitchen hygiene audit</li><li>${icon('check')} Allergen-aware preparation notes</li><li>${icon('check')} 30-minute temperature traceability</li></ul></article>
      <article class="policy-card"><span>${icon('wallet')}</span><h2>Fair, visible pricing</h2><p>Every bill shows the item subtotal, eligible discount, delivery, CGST and SGST before acceptance. No surprise service charge.</p><ul><li>${icon('check')} Affordable kitchen-set menu prices</li><li>${icon('check')} Government-standard 5% GST split</li><li>${icon('check')} Discounts capped transparently</li></ul></article>
      <article class="policy-card"><span>${icon('users')}</span><h2>Partner promise</h2><p>Our chefs receive fair rates, predictable fulfilment windows and direct support. Efficient service begins with a respected kitchen team.</p><ul><li>${icon('check')} 48-hour payment cycle</li><li>${icon('check')} No hidden platform deductions</li><li>${icon('check')} Real-time order ownership</li></ul></article>
      <article class="policy-card"><span>${icon('lock')}</span><h2>Secure payments</h2><p>Payment details are never stored by this demo. Card, UPI, wallet and net banking options use clearly labeled secure-provider handoff in production.</p><ul><li>${icon('check')} PCI-compliant payment gateway</li><li>${icon('check')} UPI mandate with consent</li><li>${icon('check')} Downloadable GST receipt</li></ul></article>
    </div>
    <div class="policy-footer"><div><span class="section-kicker">Need help?</span><h2>Our care team is on call.</h2><p>Speak to a Foodie Hub concierge for allergy guidance, billing questions or order changes.</p></div><button class="button button-dark" data-action="contact-support">${icon('message')} Chat with concierge</button></div>`;
}

function renderSweetCorner() {
  const view = $('#view-sweet-corner');
  const sweets = menu.filter((item) => {
    const cat = item.category;
    return cat === 'desserts' || cat === 'dessert' || cat === 'beverages' || cat === 'beverage';
  });
  const byCuisine = cuisineInfo.map((cuisine) => ({
    cuisine,
    items: sweets.filter((item) => item.cuisine === cuisine.name),
  })).filter((group) => group.items.length);

  view.innerHTML = `
    <div class="view-header">
      <div><p class="eyebrow"><span class="pulse-dot"></span> Sweet endings & refreshing sips</p><h1 id="sweet-corner-title">Sweet Corner</h1><p class="page-subtitle">Desserts and beverages from every kitchen — perfect to round off your feast.</p></div>
      <button class="button button-primary" data-nav="discover">Back to menu ${icon('arrow-right')}</button>
    </div>
    <div class="sweet-grid" id="sweet-grid"></div>`;

  const grid = $('#sweet-grid');
  grid.innerHTML = byCuisine.map(({ cuisine, items }) => `
    <section class="sweet-cuisine">
      <div class="sweet-cuisine-head" style="--cuisine-accent:${cuisine.accent};--cuisine-pale:${cuisine.pale}">
        <span class="sweet-cuisine-icon">${cuisine.icon}</span>
        <div><strong>${cuisine.name} kitchen</strong><span>${items.length} sweets & sips</span></div>
      </div>
      <div class="sweet-grid-inner">
        ${items.map(item => `
          <article class="sweet-card" data-detail="${item.id}">
            <div class="sweet-card-media">
              <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" />
              <span class="diet-mark ${item.isVeg ? 'veg' : 'nonveg'}" role="img" aria-label="${item.isVeg ? 'Vegetarian' : 'Non-vegetarian'}"></span>
              ${item.isChefSpecial ? '<span class="chef-special-badge">Chef pick</span>' : ''}
              <button class="card-heart icon-button" aria-label="Save ${escapeHtml(item.name)}" aria-pressed="${isFavorite(item.id)}" data-favorite="${item.id}">${isFavorite(item.id) ? icon('heart-fill') : icon('heart')}</button>
            </div>
            <div class="sweet-card-body">
              <div class="sweet-card-meta"><span>${escapeHtml(item.category)}</span><span>${icon('star')} ${item.rating.toFixed(1)}</span><span>${icon('timer')} ${escapeHtml(item.prepTime)}</span></div>
              <h3>${escapeHtml(item.name)}</h3>
              <p>${escapeHtml(item.description)}</p>
              <div class="sweet-card-footer">
                <div><strong>${formatPaise(item.price * 100)}</strong></div>
                <button class="add-button" data-add="${item.id}" aria-label="Add ${escapeHtml(item.name)} to ${escapeHtml(item.cuisine)} draft">${icon('plus')} Add</button>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `).join('');
}

function renderView(viewName) {
  if (!validViews.includes(viewName)) {
    viewName = 'discover';
    if (window.location.hash !== '#discover') history.replaceState(null, '', '#discover');
  }
  ui.view = viewName;
  $$('.app-view').forEach((view) => view.classList.toggle('active', view.dataset.view === viewName));
  $$('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === viewName));
  document.body.dataset.view = viewName;
  $('#main-content').scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'discover') renderDiscover();
  if (viewName === 'drafts') renderDraftsView();
  if (viewName === 'orders') renderOrdersView();
  if (viewName === 'offers') renderOffersView();
  if (viewName === 'manager') renderManagerView();
  if (viewName === 'safety') renderSafetyView();
  if (viewName === 'sweet-corner') renderSweetCorner();

  const titles = {
    discover: 'Discover', drafts: 'My drafts', orders: 'Orders', offers: 'Offers', manager: 'Manager board', safety: 'Safety & policy', 'sweet-corner': 'Sweet Corner',
  };
  document.title = `${titles[viewName]} — Foodie Hub`;
}

function renderBillDialog() {
  const bill = calculateBill();
  const container = $('#bill-dialog-content');
  if (!bill.itemCount) {
    container.innerHTML = `<div class="dialog-empty"><span>${icon('bookmark')}</span><h2 id="bill-title">Your table is empty</h2><p>Add at least one dish before reviewing the bill.</p><button class="button button-primary" data-action="close-dialog" data-then-discover>Browse dishes</button></div>`;
    return;
  }

  const grouped = cuisineInfo.map((cuisine) => ({
    cuisine,
    lines: bill.lines.filter((line) => line.cuisine === cuisine.name),
  })).filter((group) => group.lines.length);

  container.innerHTML = `
    <div class="bill-head">
      <div><span class="section-kicker">Table ${state.orders.length ? 'T-12' : 'T-12'} · Dine in</span><h2 id="bill-title">Review your bill</h2><p>One order, coordinated across ${bill.cuisineCount} ${bill.cuisineCount === 1 ? 'kitchen' : 'kitchens'}.</p></div>
      <div class="bill-secure">${icon('shield-check')}<span><strong>Prices confirmed</strong><small>No hidden fees</small></span></div>
    </div>
    <div class="bill-layout">
      <div class="bill-items-column">
        <div class="bill-kitchens">${grouped.map(({ cuisine, lines }) => `
          <section class="bill-kitchen">
            <div class="bill-kitchen-head"><span style="background:${cuisine.pale}">${cuisine.icon}</span><div><strong>${cuisine.name} kitchen</strong><small>${lines.reduce((sum, line) => sum + line.qty, 0)} items · ${cuisine.tagline}</small></div><span class="bill-kitchen-ready">${icon('check')} Confirmed</span></div>
            ${lines.map((line) => `<div class="bill-line"><div><strong>${escapeHtml(line.item.name)}</strong><span>${escapeHtml(line.item.category)} · qty ${line.qty}</span></div><strong>${formatPaise(line.item.price * 100 * line.qty)}</strong></div>`).join('')}
          </section>`).join('')}</div>
        <div class="promo-box">
          <label for="promo-input">Have a delight code?</label>
          <div><input id="promo-input" type="text" placeholder="Enter promo code" value="${bill.eligibleOffer?.code || ''}" ${bill.eligibleOffer ? 'disabled' : ''}/><button class="button button-soft" data-action="apply-promo" ${bill.eligibleOffer ? 'disabled' : ''}>${bill.eligibleOffer ? 'Applied ✓' : 'Apply'}</button></div>
          ${bill.eligibleOffer ? `<p class="promo-success">${icon('sparkles')} <span>${bill.eligibleOffer.title} is applied. You save ${formatPaise(bill.discountPaise)}.</span><button class="text-button" data-remove-offer>Remove</button></p>` : `<p>Try <button class="inline-code" data-apply-code="FIRSTBITE">FIRSTBITE</button> for 15% off your first order.</p>`}
        </div>
      </div>
      <aside class="bill-summary">
        <span class="section-kicker">Bill summary</span>
        <h3>Payment breakdown</h3>
        <dl class="price-list">
          <div><dt>Item subtotal <small>${bill.itemCount} items</small></dt><dd>${formatPaise(bill.subtotalPaise)}</dd></div>
          <div class="discount-row"><dt>Delight discount ${bill.eligibleOffer ? `<small>${bill.eligibleOffer.code}</small>` : ''}</dt><dd>− ${formatPaise(bill.discountPaise)}</dd></div>
          <div><dt>Delivery & service <small>${bill.deliveryPaise ? 'Flat partner delivery' : 'Free above ₹499 after discount'}</small></dt><dd>${bill.deliveryPaise ? formatPaise(bill.deliveryPaise) : 'FREE'}</dd></div>
          <div><dt>CGST <small>2.5% of taxable value</small></dt><dd>${formatPaise(bill.cgstPaise)}</dd></div>
          <div><dt>SGST <small>2.5% of taxable value</small></dt><dd>${formatPaise(bill.sgstPaise)}</dd></div>
        </dl>
        <div class="bill-grand-total"><span>Total payable <small>GST invoice</small></span><strong>${formatPaise(bill.totalPaise)}</strong></div>
        ${bill.savingsPaise ? `<div class="savings-callout">${icon('sparkles')} You save ${formatPaise(bill.savingsPaise)} on this order</div>` : ''}
        <label class="accept-bill-check"><input type="checkbox" id="accept-bill"/><span><strong>I’ve reviewed the bill and item quantities</strong><small>By continuing, I accept the prices, taxes and estimated preparation time.</small></span></label>
        <button class="button button-primary button-full" id="place-order-button" data-action="place-order" disabled>Accept bill & place order ${icon('arrow-right')}</button>
        <p class="bill-security">${icon('lock')} Secure order · GST receipt included · No charge until payment</p>
      </aside>
    </div>`;
}

function showDialog(id) {
  $$('dialog[open]').forEach((dialog) => dialog.close());
  const dialog = $(id);
  if (dialog && !dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
}

function closeDialogs() {
  $$('dialog[open]').forEach((dialog) => dialog.close());
  document.body.classList.remove('modal-open');
}

function placeOrder() {
  const checkbox = $('#accept-bill');
  if (!checkbox?.checked) {
    toast('Please review and accept the bill first.', 'info');
    return;
  }
  const bill = calculateBill();
  const order = createOrder(bill);
  closeDialogs();
  renderAll();
  showDialog('#order-dialog');
  renderOrderDialog(order.id);
  toast('Order accepted — all partner kitchens have been notified.', 'success');
}

function renderOrderDialog(orderId) {
  const order = orderById(orderId);
  const container = $('#order-dialog-content');
  if (!order) return;
  const timelineSteps = ['Order accepted', 'Kitchens notified', 'Cooking in progress', 'Ready for your table'];
  container.innerHTML = `
    <div class="order-confirm-head"><span class="success-orbit">${icon('check')}</span><span class="section-kicker">Order confirmed</span><h2 id="order-title">${order.id}</h2><p>Great choice, ${order.customer.name.split(' ')[0]}. Your multi-kitchen feast is underway.</p></div>
    <div class="live-eta"><span>${icon('timer')}</span><div><small>Estimated table time</small><strong>${Math.max(...order.partnerStations.map((station) => station.prepMinutes))}–${Math.max(...order.partnerStations.map((station) => station.prepMinutes)) + 8} minutes</strong></div><span class="live-badge"><i></i> Live</span></div>
    <div class="tracking-timeline">${timelineSteps.map((step, index) => {
      const complete = order.timeline[index]?.complete;
      return `<div class="${complete ? 'complete' : ''} ${index === order.timeline.findIndex((entry) => !entry.complete) ? 'current' : ''}"><span>${complete ? icon('check') : index + 1}</span><strong>${step}</strong><small>${complete ? 'Completed' : 'Up next'}</small></div>`;
    }).join('')}</div>
    <div class="partner-chips">${order.partnerStations.map((station) => `<div><span class="station-avatar">${cuisineInfoByName[station.cuisine]?.icon || '👨‍🍳'}</span><span><strong>${station.cuisine}</strong><small>${station.chef}</small></span><em class="station-status ${station.status}"><i></i>${statusLabel(station.status)}</em></div>`).join('')}</div>
    <div class="order-modal-total"><span><small>Total bill</small><strong>${formatPaise(order.bill.totalPaise)}</strong></span><span class="payment-pill ${order.paymentStatus}">${paymentStatusLabel(order)}</span></div>
    <div class="modal-actions"><button class="button button-soft" data-action="close-dialog" data-then-orders>Back to orders</button>${order.paymentStatus === 'due' ? `<button class="button button-primary" data-action="open-payment" data-order-id="${order.id}">Open secure payment ${icon('arrow-right')}</button>` : order.paymentStatus === 'paid' ? `<button class="button button-primary" data-receipt="${order.id}">${icon('download')} Download receipt</button>` : `<button class="button button-primary" data-action="close-dialog">Done for now</button>`}</div>`;
}

function renderPaymentDialog(orderId = ui.paymentOrderId) {
  const container = $('#payment-dialog-content');
  const dueOrder = orderId ? orderById(orderId) : state.orders.find((order) => order.paymentStatus === 'due');
  if (!dueOrder) {
    container.innerHTML = `<div class="dialog-empty"><span>${icon('wallet')}</span><h2 id="payment-title">Nothing to pay yet</h2><p>Your bill appears here after an order is accepted.</p><button class="button button-primary" data-action="close-dialog">Continue</button></div>`;
    return;
  }
  ui.paymentOrderId = dueOrder.id;
  const walletSufficient = dueOrder.bill.totalPaise <= WALLET_BALANCE_PAISES;
  const methods = [
    { id: 'card', label: 'Credit card', detail: 'Visa, Mastercard, RuPay', icon: 'credit' },
    { id: 'debit', label: 'Debit card', detail: 'All major Indian banks', icon: 'credit' },
    { id: 'upi', label: 'UPI', detail: 'GPay, PhonePe, Paytm', icon: 'upi' },
    { id: 'netbanking', label: 'Net banking', detail: '58+ banks supported', icon: 'bank' },
    { id: 'wallet', label: 'Foodie wallet', detail: `${formatPaise(WALLET_BALANCE_PAISES)} balance available`, icon: 'wallet' },
    { id: 'cod', label: 'Pay at table', detail: 'Cash or card with partner', icon: 'cash' },
  ];
  container.innerHTML = `
    <div class="payment-head"><div><span class="section-kicker">Secure billing corner</span><h2 id="payment-title">Pay your Foodie Hub bill</h2><p>Choose a payment method. Your card details are never stored by this prototype.</p></div><div class="payment-total"><small>Amount due</small><strong>${formatPaise(dueOrder.bill.totalPaise)}</strong><span>${dueOrder.id}</span></div></div>
    <div class="payment-layout">
      <div class="payment-methods-column">
        <span class="section-kicker">1. Choose a method</span>
        <div class="payment-method-grid">${methods.map((method) => `<button type="button" class="payment-method ${ui.selectedPayment === method.id ? 'active' : ''}" data-payment-method="${method.id}" aria-pressed="${ui.selectedPayment === method.id}"><span>${icon(method.icon)}</span><span><strong>${method.label}</strong><small>${method.detail}</small></span>${ui.selectedPayment === method.id ? icon('check-circle') : ''}</button>`).join('')}</div>
        <span class="section-kicker method-form-title">2. Enter details</span>
        <form id="payment-form" class="payment-form">
          ${ui.selectedPayment === 'card' || ui.selectedPayment === 'debit' ? `
            <label class="field full"><span>Card number</span><div class="input-with-icon">${icon('credit')}<input name="cardNumber" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" autocomplete="off" required/></div></label>
            <label class="field"><span>Expiry</span><input name="expiry" maxlength="5" placeholder="MM/YY" inputmode="numeric" autocomplete="off" required/></label>
            <label class="field"><span>CVV</span><div class="input-with-icon">${icon('lock')}<input name="cvv" type="password" inputmode="numeric" maxlength="4" placeholder="•••" autocomplete="off" required/></div></label>
            <label class="field full"><span>Name on card</span><input name="cardName" placeholder="Arjun Sharma" autocomplete="off" required/></label>` : ''}
          ${ui.selectedPayment === 'upi' ? `<label class="field full"><span>UPI ID</span><div class="input-with-icon">${icon('upi')}<input name="upiId" placeholder="yourname@upi" autocomplete="off" required/></div></label><p class="form-helper">${icon('shield-check')} You’ll receive a secure payment request in your UPI app.</p>` : ''}
          ${ui.selectedPayment === 'netbanking' ? `<label class="field full"><span>Choose your bank</span><select name="bank" required><option value="">Select a bank</option><option>State Bank of India</option><option>HDFC Bank</option><option>ICICI Bank</option><option>Axis Bank</option><option>Kotak Mahindra Bank</option></select></label>` : ''}
          ${ui.selectedPayment === 'wallet' ? `<div class="wallet-balance ${walletSufficient ? '' : 'insufficient'}"><span>${icon('wallet')}</span><div><small>Available Foodie Wallet balance</small><strong>${formatPaise(WALLET_BALANCE_PAISES)}</strong></div><em>${walletSufficient ? `Use ${formatPaise(dueOrder.bill.totalPaise)}` : `Short by ${formatPaise(dueOrder.bill.totalPaise - WALLET_BALANCE_PAISES)}`}</em></div>${walletSufficient ? '' : `<p class="form-helper error-helper">${icon('info')} This demo wallet cannot cover the full bill. Choose another payment method.</p>`}` : ''}
          ${ui.selectedPayment === 'cod' ? `<div class="wallet-balance cod-note"><span>${icon('cash')}</span><div><small>Pay after your order is served</small><strong>Cash or card at Table ${dueOrder.customer.table}</strong></div></div>` : ''}
          <p class="payment-terms">By paying, you accept Foodie Hub’s payment and refund policy. This is a safe demonstration checkout; no real money is charged.</p>
          <button class="button button-primary button-full" type="submit" id="payment-submit" ${ui.selectedPayment === 'wallet' && !walletSufficient ? 'disabled' : ''}>${ui.selectedPayment === 'cod' ? 'Confirm pay at table' : `Pay ${formatPaise(dueOrder.bill.totalPaise)}`} ${icon('arrow-right')}</button>
        </form>
      </div>
      <aside class="payment-receipt">
        <span class="section-kicker">Bill summary</span><h3>${dueOrder.id}</h3>
        ${dueOrder.items.map((item) => `<div class="receipt-line"><span>${item.qty}× ${escapeHtml(item.name)}</span><strong>${formatPaise(item.pricePaise * item.qty)}</strong></div>`).join('')}
        <dl><div><dt>Subtotal</dt><dd>${formatPaise(dueOrder.bill.subtotalPaise)}</dd></div><div><dt>Discount</dt><dd>− ${formatPaise(dueOrder.bill.discountPaise)}</dd></div><div><dt>Delivery</dt><dd>${dueOrder.bill.deliveryPaise ? formatPaise(dueOrder.bill.deliveryPaise) : 'FREE'}</dd></div><div><dt>GST (5%)</dt><dd>${formatPaise(dueOrder.bill.gstPaise)}</dd></div></dl>
        <div class="receipt-total"><span>Total</span><strong>${formatPaise(dueOrder.bill.totalPaise)}</strong></div>
        <div class="receipt-trust">${icon('lock')}<span><strong>Encrypted checkout</strong><small>PCI-ready provider handoff</small></span></div>
      </aside>
    </div>`;
}

function openPayment(orderId) {
  ui.paymentOrderId = orderId || state.orders.find((order) => order.paymentStatus === 'due')?.id || null;
  renderPaymentDialog(ui.paymentOrderId);
  showDialog('#payment-dialog');
}

function isValidExpiry(value) {
  const match = String(value || '').match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const expiryBoundary = new Date(year, month, 1);
  return expiryBoundary > new Date();
}

function handlePaymentSubmit(form) {
  const method = ui.selectedPayment;
  const order = orderById(ui.paymentOrderId);
  if (!order) return;
  const formData = new FormData(form);

  if ((method === 'card' || method === 'debit')) {
    const number = String(formData.get('cardNumber') || '').replace(/\D/g, '');
    const expiry = String(formData.get('expiry') || '');
    const cvv = String(formData.get('cvv') || '');
    const cardName = String(formData.get('cardName') || '').trim();
    if (number.length < 15 || number.length > 19 || !isValidExpiry(expiry) || cvv.length < 3 || cvv.length > 4 || cardName.length < 2) {
      toast('Check the card number, expiry, CVV and cardholder name.', 'error');
      return;
    }
  }
  if (method === 'upi' && !/^[\w.-]{2,}@[\w.-]{2,}$/.test(String(formData.get('upiId') || ''))) {
    toast('Enter a valid UPI ID, such as name@upi.', 'error');
    return;
  }
  if (method === 'wallet' && order.bill.totalPaise > WALLET_BALANCE_PAISES) {
    toast('Your demo wallet balance is too low for this bill.', 'error');
    return;
  }

  const submit = $('#payment-submit');
  submit.disabled = true;
  submit.innerHTML = `${icon('timer')} Verifying payment…`;
  window.setTimeout(() => {
    const transactionId = method === 'cod' ? `TABLE-${Date.now().toString().slice(-6)}` : `TXN${Date.now().toString().slice(-10)}`;
    markPaid(order.id, method, transactionId);
    closeDialogs();
    renderAll();
    toast(method === 'cod' ? 'Pay-at-table confirmed. Enjoy your meal!' : 'Payment successful — receipt ready.', 'success');
    showDialog('#order-dialog');
    renderOrderDialog(order.id);
  }, 1400);
}

function quickDialog(content) {
  $('#quick-dialog-content').innerHTML = content;
  showDialog('#quick-dialog');
}

function toast(message, type = 'info') {
  const region = $('#toast-region');
  const element = document.createElement('div');
  element.className = `toast ${type}`;
  element.innerHTML = `<span>${icon(type === 'success' ? 'check-circle' : type === 'error' ? 'info' : 'bellring')}</span><p>${escapeHtml(message)}</p><button aria-label="Dismiss notification">${icon('x')}</button>`;
  region.appendChild(element);
  element.querySelector('button').addEventListener('click', () => element.remove());
  window.setTimeout(() => {
    element.classList.add('leaving');
    window.setTimeout(() => element.remove(), 250);
  }, 3600);
}

function downloadReceipt(orderId) {
  const order = orderById(orderId);
  if (!order) return;
  const receipt = [
    'FOODIE HUB — GST INVOICE',
    `Order: ${order.id}`,
    `Date: ${new Date(order.createdAt).toLocaleString('en-IN')}`,
    `Customer: ${order.customer.name} · Table ${order.customer.table}`,
    '',
    ...order.items.map((item) => `${item.qty} x ${item.name} — ${formatPaise(item.pricePaise * item.qty)}`),
    '',
    `Subtotal: ${formatPaise(order.bill.subtotalPaise)}`,
    `Discount: -${formatPaise(order.bill.discountPaise)}`,
    `Delivery: ${formatPaise(order.bill.deliveryPaise)}`,
    `CGST: ${formatPaise(order.bill.cgstPaise)}`,
    `SGST: ${formatPaise(order.bill.sgstPaise)}`,
    `Total: ${formatPaise(order.bill.totalPaise)}`,
    `Payment: ${paymentLabel(order.paymentMethod)} · ${order.transactionId}`,
    '',
    'Thank you for dining with Foodie Hub.',
  ].join('\n');
  const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${order.id}-receipt.txt`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Receipt downloaded.', 'success');
}

function navigate(view) {
  if (window.location.hash !== `#${view}`) window.location.hash = view;
  else renderView(view);
}

function handleAction(action, target) {
  switch (action) {
    case 'toggle-sidebar':
      document.body.classList.toggle('sidebar-open');
      break;
    case 'close-sidebar':
      document.body.classList.remove('sidebar-open');
      break;
    case 'explore-menu':
      $('#menu-section').scrollIntoView({ behavior: 'smooth' });
      break;
    case 'show-all-cuisines':
      $('#menu-section').scrollIntoView({ behavior: 'smooth' });
      break;
    case 'clear-filters':
      ui.filter = 'all';
      ui.search = '';
      $('#global-search').value = '';
      ui.visibleCount = 12;
      renderFilterChips();
      renderMenu();
      break;
    case 'review-order':
      renderBillDialog();
      showDialog('#bill-dialog');
      break;
    case 'close-dialog':
      if (target.dataset.thenDiscover) navigate('discover');
      if (target.dataset.thenOrders) navigate('orders');
      closeDialogs();
      break;
    case 'place-order':
      placeOrder();
      break;
    case 'open-payment':
      openPayment(target.dataset.orderId);
      break;
    case 'apply-promo': {
      const input = $('#promo-input');
      const result = applyOfferByCode(input?.value || '');
      toast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) {
        renderBillDialog();
        renderDraftSummary();
      }
      break;
    }
    case 'location': {
      const tables = ['T-12', 'T-08', 'T-04', 'T-21', 'T-33', 'T-40'];
      const tableButtons = tables.map((t) => `<button class="table-option ${t === state.currentTable ? 'active' : ''}" data-table="${t}">${t}</button>`).join('');
      quickDialog(`<div class="quick-head"><span>${icon('pin')}</span><div><span class="section-kicker">Delivery area</span><h2 id="quick-title">Where are you dining?</h2></div></div><p class="quick-copy">Choose your zone and table. Pricing and partner availability update by zone.</p><div class="location-options"><button class="location-option active"><span>${icon('pin')}</span><span><strong>Koramangala</strong><small>Table ${state.currentTable} · 3.2 km</small></span>${icon('check-circle')}</button><button class="location-option"><span>${icon('pin')}</span><span><strong>Indiranagar</strong><small>Table I-08 · 5.8 km</small></span></button><button class="location-option"><span>${icon('pin')}</span><span><strong>HSR Layout</strong><small>Table H-04 · 7.1 km</small></span></button></div><div class="table-picker"><span class="section-kicker">Table</span><div class="table-options">${tableButtons}</div></div><button class="button button-primary button-full" data-action="close-dialog">Save location</button>`);
      break;
    }
    case 'notifications':
      quickDialog(`<div class="quick-head"><span>${icon('bell')}</span><div><span class="section-kicker">Updates</span><h2 id="quick-title">You’re all caught up</h2></div></div><div class="notification-list"><div><span>${icon('chef')}</span><p><strong>Chef’s seasonal pick</strong><small>Try our new Himalayan cold noodles.</small></p></div><div><span>${icon('sparkles')}</span><p><strong>15% welcome delight</strong><small>Use FIRSTBITE on your first order.</small></p></div></div><button class="button button-soft button-full" data-action="close-dialog">Got it</button>`);
      break;
    case 'profile-menu':
      quickDialog(`<div class="quick-head"><span>${icon('users')}</span><div><span class="section-kicker">Your profile</span><h2 id="quick-title">Arjun Sharma</h2></div></div><p class="quick-copy">Table T-12 · Foodie Circle member since 2025</p><div class="profile-actions"><button>${icon('receipt')} Saved orders</button><button>${icon('wallet')} Payment methods</button><button>${icon('settings')} Preferences</button><button data-action="reset-demo">${icon('log-out')} Reset demo data</button></div>`);
      break;
    case 'contact-support':
      toast('A concierge will join you in chat shortly.', 'success');
      closeDialogs();
      break;
    case 'partner-health':
      toast('All six partner kitchens meet today’s quality threshold.', 'success');
      break;
    case 'reset-demo':
      resetDemoState();
      closeDialogs();
      renderAll();
      navigate('discover');
      toast('Demo data reset. Welcome fresh.', 'success');
      break;
    case 'print-ops':
      window.print();
      break;
    default:
      break;
  }
}

function bindEvents() {
  document.addEventListener('click', (event) => {
    const navTarget = event.target.closest('[data-nav]');
    if (navTarget) {
      event.preventDefault();
      document.body.classList.remove('sidebar-open');
      navigate(navTarget.dataset.nav);
      return;
    }

    const actionTarget = event.target.closest('[data-action]');
    if (actionTarget) {
      handleAction(actionTarget.dataset.action, actionTarget);
      return;
    }

    const addTarget = event.target.closest('[data-add]');
    if (addTarget) {
      const item = addToDraft(addTarget.dataset.add);
      if (item) {
        renderAll();
        toast(`${item.name} added to your ${item.cuisine} draft.`, 'success');
      }
      return;
    }

    const qtyTarget = event.target.closest('[data-qty]');
    if (qtyTarget) {
      updateDraftQuantity(qtyTarget.dataset.cuisine, qtyTarget.dataset.item, Number(qtyTarget.dataset.qty));
      renderAll();
      return;
    }

    const removeTarget = event.target.closest('[data-remove-item]');
    if (removeTarget) {
      removeFromDraft(removeTarget.dataset.cuisine, removeTarget.dataset.removeItem);
      renderAll();
      toast('Dish removed from your draft.', 'info');
      return;
    }

    const cuisineTarget = event.target.closest('[data-cuisine]');
    if (cuisineTarget) {
      ui.filter = `cuisine:${cuisineTarget.dataset.cuisine}`;
      ui.visibleCount = 12;
      renderFilterChips();
      renderMenu();
      navigate('discover');
      window.setTimeout(() => $('#menu-section').scrollIntoView({ behavior: 'smooth' }), 100);
      return;
    }

    const filterTarget = event.target.closest('[data-filter]');
    if (filterTarget) {
      ui.filter = filterTarget.dataset.filter;
      ui.visibleCount = 12;
      renderFilterChips();
      renderMenu();
      return;
    }

    const applyCode = event.target.closest('[data-apply-code]');
    if (applyCode) {
      const result = applyOfferByCode(applyCode.dataset.applyCode);
      toast(result.message, result.ok ? 'success' : 'error');
      renderAll();
      if (ui.view === 'offers') renderOffersView();
      if ($('#bill-dialog').open) renderBillDialog();
      return;
    }

    const removeOfferTarget = event.target.closest('[data-remove-offer]');
    if (removeOfferTarget) {
      removeOffer();
      renderAll();
      if ($('#bill-dialog').open) renderBillDialog();
      toast('Offer removed.', 'info');
      return;
    }

    const copyCode = event.target.closest('[data-copy-code]');
    if (copyCode) {
      const code = copyCode.dataset.copyCode;
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code)
          .then(() => toast(`Code ${code} copied.`, 'success'))
          .catch(() => toast(`Copy code ${code} manually.`, 'info'));
      } else {
        toast(`Copy code ${code} manually.`, 'info');
      }
      return;
    }

    const paymentMethod = event.target.closest('[data-payment-method]');
    if (paymentMethod) {
      ui.selectedPayment = paymentMethod.dataset.paymentMethod;
      renderPaymentDialog(ui.paymentOrderId);
      return;
    }

    const trackOrder = event.target.closest('[data-track-order]');
    if (trackOrder) {
      renderOrderDialog(trackOrder.dataset.trackOrder);
      showDialog('#order-dialog');
      return;
    }

    const advance = event.target.closest('[data-advance-order]');
    if (advance) {
      advanceOrder(advance.dataset.advanceOrder);
      renderAll();
      toast('Kitchen fulfilment status updated.', 'success');
      return;
    }

    const receipt = event.target.closest('[data-receipt]');
    if (receipt) {
      downloadReceipt(receipt.dataset.receipt);
      return;
    }

    const reorderTarget = event.target.closest('[data-reorder]');
    if (reorderTarget) {
      const order = reorderOrder(reorderTarget.dataset.reorder);
      if (order) {
        renderAll();
        renderDraftsView();
        toast(`Reordered ${order.items.length} line items into your drafts.`, 'success');
      }
      return;
    }

    const favoriteTarget = event.target.closest('[data-favorite]');
    if (favoriteTarget) {
      const itemId = favoriteTarget.dataset.favorite;
      const result = toggleFavorite(itemId);
      if (result) {
        favoriteTarget.classList.toggle('saved', result.favorited);
        favoriteTarget.setAttribute('aria-pressed', String(result.favorited));
        favoriteTarget.innerHTML = result.favorited ? icon('heart-fill') : icon('heart');
        toast(result.favorited ? 'Added to favourites.' : 'Removed from favourites.', 'info');
        if (ui.view === 'drafts') renderDraftsView();
        if ($('#dish-dialog').open && ui.dishDetail === itemId) renderDishDetail(menuById.get(itemId));
      }
      return;
    }

    const detailTarget = event.target.closest('[data-detail]');
    if (detailTarget && !detailTarget.closest('button, [data-add], [data-favorite]')) {
      openDishDetail(detailTarget.dataset.detail);
      return;
    }

    const tableTarget = event.target.closest('[data-table]');
    if (tableTarget) {
      setTable(tableTarget.dataset.table);
      handleAction('location', { dataset: {} });
      return;
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'accept-bill') {
      const button = $('#place-order-button');
      if (button) button.disabled = !event.target.checked;
    }
    if (event.target.id === 'sort-menu') {
      ui.sort = event.target.value;
      ui.visibleCount = 12;
      renderMenu();
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'global-search') {
      ui.search = event.target.value;
      ui.visibleCount = 12;
      renderMenu();
    }
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id === 'payment-form') {
      event.preventDefault();
      handlePaymentSubmit(event.target);
    }
  });

  $('#load-more').addEventListener('click', () => {
    ui.visibleCount += 12;
    renderMenu();
  });

  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'discover';
    renderView(view);
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      $('#global-search').focus();
    }
    if (event.key === 'Escape') closeDialogs();
  });

  document.addEventListener('error', (event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"%3E%3Crect width="600" height="400" fill="%23f5efe8"/%3E%3Ccircle cx="300" cy="175" r="72" fill="%23ff5a2a" opacity=".12"/%3E%3Ctext x="300" y="190" font-size="58" text-anchor="middle" fill="%23ff5a2a"%3E%E2%9D%A4%EF%B8%8F%3C/text%3E%3C/svg%3E';
    }
  }, true);

  $$('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialogs();
    });
    dialog.addEventListener('close', () => {
      if (!$$('dialog[open]').length) document.body.classList.remove('modal-open');
    });
  });
}

function renderAll() {
  renderDiscover();
  if (ui.view === 'drafts') renderDraftsView();
  if (ui.view === 'orders') renderOrdersView();
  if (ui.view === 'offers') renderOffersView();
  if (ui.view === 'manager') renderManagerView();
  $('#order-nav-count').textContent = state.orders.filter((order) => !['served', 'cancelled'].includes(order.status)).length;
}

function init() {
  hydrateIcons();
  bindEvents();
  renderAll();
  const initialView = window.location.hash.replace('#', '') || 'discover';
  renderView(cuisineInfo.some((cuisine) => cuisine.name === initialView) ? 'discover' : initialView);
  startCarousel();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
}

init();
