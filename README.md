# Foodie Hub

A polished, zero-dependency restaurant ordering and operations platform for **Foodie Hub**.

## What is included

- **1,300+ chef-made dishes** across six live cuisines (including expanded desserts & beverages):
  - Chinese — 200+
  - Japanese — 190+
  - Indian — 180+
  - South Indian — 170+
  - Italian — 300+
  - Korean — 180+
- **Sweet Corner** — a dedicated section for desserts and beverages from every kitchen
- **Favourites / wishlist** — heart-toggle dishes, persisted to localStorage, with a Favourites filter
- **Dish detail modal** — click any dish for full details, badges, price, and add-to-draft
- **Category sub-filters** — dishes grouped by category (Starters, Mains, Desserts, etc.)
- **Table switching** — choose your table (T-08, T-12, etc.) in the location dialog, persisted
- **Order reordering** — "Reorder" button on past orders restores items into your drafts
- Cuisine-specific **drafts** that group items by the kitchen preparing them.
- Search, cuisine filters, vegetarian/spicy/chef-special filters, sorting, and lazy menu loading.
- Transparent bill review with item subtotal, capped offers, delivery, **5% GST split into CGST + SGST**, and a final total.
- Explicit bill acceptance before an order is placed.
- Live partner-kitchen status and a manager fulfilment board.
- A separate secure billing/payment corner for credit card, debit card, UPI, net banking, wallet, and pay-at-table flows.
- Downloadable GST receipts, order tracking, local draft persistence, responsive layouts, keyboard navigation, reduced-motion support, and accessible dialogs.
- Demo-safe payment behavior: no real card data is stored or charged.
- **Separate CSS sheets** — `base.css`, `layout.css`, `components.css`, `features.css`, `sweet-corner.css` for maintainability
- Hero image carousel, pop-in animations, skeleton loading states
- Mock API layer ready to swap in a real backend

## Run locally

This project uses browser-native ES modules and does not require Node.js, npm, or a build step.

### Windows

Double-click `start-foodie-hub.bat`, or run:

```powershell
python -m http.server 8080
```

Then open <http://localhost:8080>.

### Any platform

```bash
python3 -m http.server 8080
```

> Do not open `index.html` directly with `file://`; serve it over HTTP so ES modules load correctly.

## Deploy

The project is ready for Netlify, GitHub Pages, Cloudflare Pages, Vercel static hosting, or any static web server. No environment variables or build commands are required.

### Netlify

Connect your repository to Netlify. Build command: (none). Publish directory: `/`. The included `netlify.toml` handles headers and SPA redirects.

## Product flow

1. Browse any cuisine and add dishes to its draft.
2. Visit the **Sweet Corner** for desserts & beverages from every kitchen.
3. **Favourite** dishes with the heart button; filter by **Favourites** or dish **category**.
4. Switch your **table** in the location dialog.
5. Review the automatically grouped multi-cuisine table order.
6. Apply an eligible offer and inspect all taxes and fees.
7. Explicitly accept the bill and place the order.
8. Track every partner kitchen in real time.
9. Pay from the separate checkout corner and download the GST receipt.
10. Use **Reorder** on past orders to rebuild a draft quickly.

## Demo codes

- `FIRSTBITE` — 15% off, capped at ₹150, on orders above ₹399.
- `PASSPORT` — ₹200 off, on orders above ₹899.
- `MIDWEEK` — 10% off, capped at ₹120, on orders above ₹699.
- `PARTNER100` — ₹100 off, on orders above ₹600.

## Notes

- The manager board includes a **Reset demo** action to clear local orders and drafts.
- Remote food photography is served by Unsplash and falls back to a branded local SVG if unavailable.
- For production, connect the payment UI to a PCI-compliant gateway and the order state to a trusted backend.
