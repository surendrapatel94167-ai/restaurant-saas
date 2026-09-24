# Restaurant SaaS — Admin Frontend (Menu / KDS / HR / Finance / Super-Admin)

## Setup
```bash
cd frontend-admin
npm install
cp .env.example .env    # point VITE_API_URL / VITE_SOCKET_URL at your backend
npm run dev             # runs on http://localhost:5174
```

## Login
Use the seeded demo admin: `admin@demohotel.com` / `ChangeMe123!`
(create it by running `node src/utils/seed.js` in the backend first).

Super-Admin login: `superadmin@yourcompany.com` / `ChangeMe123!`

## What's built
- Login (JWT) with role-based nav (super_admin / hotel_admin / manager / chef / waiter / cashier)
- Menu management — add items, toggle out-of-stock
- KDS — live incoming orders via Socket.io, beep alert on new order + assistance requests, one-click status advance
- HR — punch in/out, attendance list, month-end salary calculator
- Finance — sales dashboard, expense log, vendor khata, P&L
- Super-Admin — onboard new hotel (creates tenant + admin + table QR codes), activate/deactivate tenants

## Not yet wired (intentionally, for Phase 2)
- Offline mode / IndexedDB sync queue for POS
- Real Razorpay keys (payment is simulated server-side, see backend `payment.service.js`)
- Real WhatsApp Cloud API call (currently logs to console, see backend `whatsapp.service.js`)
