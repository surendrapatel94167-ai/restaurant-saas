# Restaurant SaaS — Backend (Full Phase 1 MVP)

Multi-tenant MERN backend. Single MongoDB, every tenant-scoped collection carries a
`tenantId` and goes through the `mongooseTenantPlugin` (`Model.forTenant(id)` /
`Model.findOneForTenant(id, filter)`) so a tenant can never see another tenant's data.

Written in ES6 modules (`import`/`export`, `"type": "module"` in package.json) throughout.

## Setup
```bash
cd backend
npm install
cp .env.example .env         # fill MONGO_URI (MongoDB Atlas) and JWT_SECRET
npm run seed                 # creates super_admin + demo tenant + demo hotel_admin
npm run dev                  # http://localhost:5000
```

### MongoDB Atlas
1. In Atlas, create a free cluster (or use an existing one).
2. **Database Access** → add a database user with a password.
3. **Network Access** → allow your current IP (or `0.0.0.0/0` for local dev).
4. **Database → Connect → Drivers** → copy the connection string, and paste it into
   `MONGO_URI` in `.env`, replacing `<username>`, `<password>`, and the database name.

Seeded logins:
- Super Admin: `superadmin@yourcompany.com` / `ChangeMe123!`
- Demo Hotel Admin: `admin@demohotel.com` / `ChangeMe123!`

## What's implemented
| Module | Routes | Notes |
|---|---|---|
| Auth | `/api/auth/*` | JWT login, `/me` |
| Menu | `/api/menu/*` | Admin CRUD + out-of-stock toggle (staff, JWT) |
| Customer (public, QR) | `/api/customer/:tenantSlug/*` | Menu, place order, payment, tracking, assistance — no login |
| Orders | `/api/orders/*` | Staff order list/detail, resolve assistance |
| KDS | `/api/kds/:id/status` | Status transitions with a validity guard, broadcasts via Socket.io |
| HR | `/api/hr/*` | Punch in/out, leave, attendance list, month-end salary calc |
| Finance | `/api/finance/*` | Sales dashboard, expenses, vendor khata, P&L |
| Super-Admin | `/api/super-admin/*` | Onboard tenant (+ admin + table QR codes), subscription mgmt, activate/deactivate |

Real-time: Socket.io rooms keyed by `tenant:<tenantId>` — `new_order`,
`order_status_update`, `assistance_request`, `menu_availability_change`.

## Stubbed for Phase 2 (clearly marked in code, safe to run without them)
- **Payments** (`services/payment.service.js`) — simulates a successful Razorpay payment.
  Swap in real Razorpay keys + webhook verification when ready.
- **WhatsApp invoicing** (`services/whatsapp.service.js`) — logs to console instead of
  calling the WhatsApp Cloud API. Needs a Meta Business account + access token.
- **Offline mode / sync** — not built yet; needs an `/api/customer/.../orders/sync-batch`
  endpoint plus the frontend IndexedDB queue (see architecture doc, Stage 5).

## Testing the flow end-to-end
1. `node src/utils/seed.js`
2. Log into the admin frontend as `admin@demohotel.com`, go to Menu, add a couple of items.
3. Log into Super-Admin (`superadmin@yourcompany.com`) → onboard a tenant, or just use
   `demo-hotel` — you'll still need at least one `Table` document; easiest is to onboard
   a fresh tenant so tables + QR codes get created automatically.
4. Open the customer frontend at `/menu/demo-hotel/<tableId>`, place an order.
5. Watch it appear instantly on the admin KDS page with a beep.
