# Restaurant SaaS — Customer Frontend (QR-based digital menu)

## Setup
```bash
cd frontend-customer
npm install
cp .env.example .env    # point VITE_API_URL / VITE_SOCKET_URL at your backend
npm run dev             # runs on http://localhost:5175
```

## Try it
After running the backend seed script, visit:
```
http://localhost:5175/menu/demo-hotel/<any-table-id>
```
(Table IDs are generated for real when Super-Admin onboards a tenant — the QR code
encodes exactly this URL shape: `/menu/:tenantSlug/:tableId`.)

## Flow
Scan QR → browse menu → add to cart with special instructions → checkout (UPI/Card/Cash)
→ real-time order status tracking → Call Waiter / Clear Table buttons.
