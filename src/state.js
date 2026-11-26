import { menuById } from './data/index.js';
import { defaultState, offers } from './data/offers.js';

const STORAGE_KEY = 'foodie-hub-state-v2';
const API_DELAY_MS = 600; // simulated network round-trip

const cloneDefaults = () => JSON.parse(JSON.stringify(defaultState));

function sanitizeDrafts(savedDrafts = {}) {
  const clean = cloneDefaults().drafts;
  Object.entries(clean).forEach(([cuisine, emptyLines]) => {
    const savedLines = Array.isArray(savedDrafts[cuisine]) ? savedDrafts[cuisine] : [];
    const seen = new Set();
    clean[cuisine] = savedLines.reduce((lines, line) => {
      const item = line && menuById.get(line.itemId);
      const qty = Number(line?.qty);
      if (!item || item.cuisine !== cuisine || !Number.isFinite(qty) || seen.has(line.itemId)) return lines;
      seen.add(line.itemId);
      lines.push({
        itemId: line.itemId,
        qty: Math.min(99, Math.max(1, Math.trunc(qty))),
        pricePaise: item.price * 100,
        note: typeof line.note === 'string' ? line.note.slice(0, 120) : '',
        spice: item.spiceLevel,
      });
      return lines;
    }, emptyLines);
  });
  return clean;
}

function hydrate() {
  const fresh = cloneDefaults();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return fresh;
    const appliedOffer = offers.some((offer) => offer.id === saved.appliedOffer) ? saved.appliedOffer : null;
    const validIds = new Set(menuById.keys());
    const favorites = Array.isArray(saved.favorites)
      ? saved.favorites.filter((id) => validIds.has(id)).slice(0, 200)
      : [];
    return {
      ...fresh,
      ...saved,
      appliedOffer,
      drafts: sanitizeDrafts(saved.drafts),
      favorites,
      orders: Array.isArray(saved.orders) ? saved.orders : [],
      currentTable: typeof saved.currentTable === 'string' ? saved.currentTable : fresh.currentTable,
    };
  } catch {
    return fresh;
  }
}

export const state = hydrate();

export function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getDraftItems() {
  return Object.entries(state.drafts).flatMap(([cuisine, lines]) =>
    lines
      .map((line) => ({ ...line, cuisine, item: menuById.get(line.itemId) }))
      .filter((line) => line.item),
  );
}

export function getDraftCount() {
  return getDraftItems().reduce((sum, line) => sum + line.qty, 0);
}

function offerMeetsRequirements(offer, subtotalPaise, cuisineCount) {
  if (!offer) return false;
  if (subtotalPaise < offer.minOrder * 100) return false;
  if (offer.minCuisines && cuisineCount < offer.minCuisines) return false;
  return true;
}

export function getOfferEligibility(offer, bill = calculateBill()) {
  if (!offer) return { eligible: false, reason: 'Offer not found.' };
  if (bill.subtotalPaise < offer.minOrder * 100) {
    const amount = offer.minOrder - Math.floor(bill.subtotalPaise / 100);
    return { eligible: false, reason: `Add ₹${amount} more to unlock this offer.`, amount };
  }
  if (offer.minCuisines && bill.cuisineCount < offer.minCuisines) {
    const count = offer.minCuisines - bill.cuisineCount;
    return { eligible: false, reason: `Order from ${count} more ${count === 1 ? 'cuisine' : 'cuisines'} to unlock this offer.`, count };
  }
  return { eligible: true, reason: '' };
}

export function calculateBill() {
  const lines = getDraftItems();
  const subtotalPaise = lines.reduce((sum, line) => {
    const price = line.item?.price ?? line.pricePaise / 100;
    return sum + Math.round(price * 100) * line.qty;
  }, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const cuisineCount = new Set(lines.map((line) => line.cuisine)).size;

  const appliedOffer = offers.find((offer) => offer.id === state.appliedOffer);
  const eligibleOffer = offerMeetsRequirements(appliedOffer, subtotalPaise, cuisineCount) ? appliedOffer : null;
  let discountPaise = 0;
  if (eligibleOffer) {
    const rawDiscount = eligibleOffer.type === 'percent'
      ? Math.round((subtotalPaise * eligibleOffer.value) / 100)
      : eligibleOffer.value * 100;
    discountPaise = Math.min(rawDiscount, eligibleOffer.maxDiscount * 100, subtotalPaise);
  }

  const taxablePaise = Math.max(0, subtotalPaise - discountPaise);
  const deliveryPaise = subtotalPaise === 0 || taxablePaise >= 49900 ? 0 : 2900;
  const gstPaise = Math.round(taxablePaise * 0.05);
  const cgstPaise = Math.floor(gstPaise / 2);
  const sgstPaise = gstPaise - cgstPaise;
  const totalPaise = taxablePaise + deliveryPaise + gstPaise;

  return {
    lines,
    itemCount,
    cuisineCount,
    subtotalPaise,
    discountPaise,
    eligibleOffer,
    requestedOffer: appliedOffer,
    deliveryPaise,
    gstPaise,
    cgstPaise,
    sgstPaise,
    totalPaise,
    savingsPaise: discountPaise,
  };
}

export function addToDraft(itemId) {
  const item = menuById.get(itemId);
  if (!item) return null;
  const lines = state.drafts[item.cuisine] ?? [];
  const existing = lines.find((line) => line.itemId === itemId);
  if (existing) {
    existing.qty = Math.min(99, existing.qty + 1);
  } else {
    lines.push({
      itemId,
      qty: 1,
      pricePaise: item.price * 100,
      note: '',
      spice: item.spiceLevel,
    });
  }
  state.drafts[item.cuisine] = lines;
  saveState();
  return item;
}

export function updateDraftQuantity(cuisine, itemId, delta) {
  const lines = state.drafts[cuisine] || [];
  const line = lines.find((entry) => entry.itemId === itemId);
  if (!line) return;
  line.qty = Math.min(99, line.qty + delta);
  if (line.qty <= 0) {
    state.drafts[cuisine] = lines.filter((entry) => entry.itemId !== itemId);
  }
  saveState();
}

export function removeFromDraft(cuisine, itemId) {
  state.drafts[cuisine] = (state.drafts[cuisine] || []).filter((line) => line.itemId !== itemId);
  saveState();
}

export function applyOfferByCode(code) {
  const normalized = code.trim().toUpperCase();
  const offer = offers.find((entry) => entry.code === normalized);
  if (!offer) return { ok: false, message: 'That code is not recognised. Try FIRSTBITE.' };
  const eligibility = getOfferEligibility(offer);
  if (!eligibility.eligible) return { ok: false, message: `${eligibility.reason} Use code ${offer.code}.` };
  state.appliedOffer = offer.id;
  saveState();
  const updatedBill = calculateBill();
  return {
    ok: true,
    message: `${offer.title} applied. You save ₹${(updatedBill.discountPaise / 100).toLocaleString('en-IN')}.`,
  };
}

export function removeOffer() {
  state.appliedOffer = null;
  saveState();
}

export function createOrder(bill) {
  const now = new Date();
  const existingIds = new Set(state.orders.map((order) => order.id));
  let sequence = 1042 + state.orders.length;
  while (existingIds.has(`FH-${now.getFullYear()}-${sequence}`)) sequence += 1;
  const order = {
    id: `FH-${now.getFullYear()}-${sequence}`,
    createdAt: now.toISOString(),
    status: 'accepted',
    paymentStatus: 'due',
    paymentMethod: null,
    transactionId: null,
    customer: { name: 'Arjun Sharma', table: 'T-12', area: 'Koramangala' },
    items: bill.lines.map((line) => ({
      itemId: line.itemId,
      name: line.item.name,
      cuisine: line.cuisine,
      qty: line.qty,
      pricePaise: line.item.price * 100,
      note: line.note,
      spice: line.spice,
      status: 'queued',
    })),
    bill: {
      subtotalPaise: bill.subtotalPaise,
      discountPaise: bill.discountPaise,
      offerCode: bill.eligibleOffer?.code || null,
      deliveryPaise: bill.deliveryPaise,
      cgstPaise: bill.cgstPaise,
      sgstPaise: bill.sgstPaise,
      gstPaise: bill.gstPaise,
      totalPaise: bill.totalPaise,
    },
    partnerStations: [...bill.lines.reduce((stations, line) => {
      const current = stations.get(line.cuisine) || { cuisine: line.cuisine, quantity: 0 };
      current.quantity += line.qty;
      stations.set(line.cuisine, current);
      return stations;
    }, new Map()).values()].map((station) => ({
      cuisine: station.cuisine,
      status: 'queued',
      prepMinutes: Math.min(42, 12 + station.quantity * 3),
      chef: chefFor(station.cuisine),
    })),
    timeline: [
      { label: 'Order accepted', at: now.toISOString(), complete: true },
      { label: 'Kitchens notified', at: null, complete: false },
      { label: 'Cooking in progress', at: null, complete: false },
      { label: 'Ready for your table', at: null, complete: false },
    ],
  };

  state.orders.unshift(order);
  state.activeOrderId = order.id;
  state.drafts = cloneDefaults().drafts;
  state.appliedOffer = null;
  saveState();
  return order;
}

export function advanceOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order || order.status === 'cancelled' || order.status === 'served') return;
  const stages = ['accepted', 'preparing', 'ready', 'served'];
  const current = stages.indexOf(order.status);
  if (current >= stages.length - 1) return;
  const next = stages[current + 1];
  order.status = next;
  const timelineIndex = current + 1;
  if (order.timeline[timelineIndex]) {
    order.timeline[timelineIndex].at = new Date().toISOString();
    order.timeline[timelineIndex].complete = true;
  }
  order.items.forEach((item) => {
    item.status = next === 'ready' || next === 'served' ? 'ready' : next === 'preparing' ? 'preparing' : 'queued';
  });
  order.partnerStations.forEach((station) => {
    station.status = next === 'accepted' ? 'accepted' : next === 'preparing' ? 'preparing' : 'ready';
  });
  saveState();
}

export function markPaid(orderId, method, transactionId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return;
  order.paymentStatus = method === 'cod' ? 'pending' : 'paid';
  order.paymentMethod = method;
  order.transactionId = transactionId;
  order.paidAt = method === 'cod' ? null : new Date().toISOString();
  saveState();
}

export function chefFor(cuisine) {
  const chefs = {
    Chinese: 'Chef Arjun Kapoor',
    Japanese: 'Chef Ren Miyamoto',
    Indian: 'Chef Vikram Singh',
    'South Indian': 'Chef Meera Nair',
    Italian: 'Chef Luca Romano',
    Korean: 'Chef Sora Park',
  };
  return chefs[cuisine] || 'Chef Foodie Hub';
}

export function toggleFavorite(itemId) {
  const item = menuById.get(itemId);
  if (!item) return null;
  const idx = state.favorites.indexOf(itemId);
  if (idx === -1) {
    state.favorites.push(itemId);
  } else {
    state.favorites.splice(idx, 1);
  }
  saveState();
  return { itemId, favorited: idx === -1, item };
}

export function getFavorites() {
  return state.favorites
    .map((itemId) => ({ itemId, item: menuById.get(itemId) }))
    .filter((entry) => entry.item);
}

export function isFavorite(itemId) {
  return state.favorites.includes(itemId);
}

export function setTable(table) {
  state.currentTable = String(table);
  saveState();
  return state.currentTable;
}

export function reorderOrder(orderId) {
  const order = state.orders.find((entry) => entry.id === orderId);
  if (!order) return null;
  // Clear current drafts and re-add the past order's items grouped by cuisine.
  const freshDrafts = cloneDefaults().drafts;
  order.items.forEach((item) => {
    const lines = freshDrafts[item.cuisine] ?? [];
    const existing = lines.find((line) => line.itemId === item.itemId);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + item.qty);
    } else {
      lines.push({
        itemId: item.itemId,
        qty: Math.min(99, item.qty),
        pricePaise: item.pricePaise,
        note: item.note || '',
        spice: item.spice,
      });
    }
    freshDrafts[item.cuisine] = lines;
  });
  state.drafts = freshDrafts;
  state.appliedOffer = null;
  saveState();
  return order;
}

// -------------------- Mock API layer (simulates a real backend) --------------------

const api = {
  delay: (ms = API_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export async function apiFetchMenu() {
  await api.delay();
  return { ok: true, data: menu };
}

export async function apiFetchOffers() {
  await api.delay();
  return { ok: true, data: offers };
}

export async function apiPlaceOrder(orderPayload) {
  await api.delay(900);
  // Simulate occasional success; demo always succeeds.
  return { ok: true, data: { id: orderPayload.id, status: 'accepted' } };
}

export async function apiFetchOrderStatus(orderId) {
  await api.delay();
  const order = state.orders.find((entry) => entry.id === orderId);
  return { ok: !!order, data: order || null };
}

export function resetDemoState() {
  const fresh = cloneDefaults();
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, fresh);
  saveState();
}
