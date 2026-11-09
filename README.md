# JH Soaps / JH Hebals

Handmade herbal soap storefront built with React + Vite and an Express 5 API backed by MongoDB Atlas through Mongoose.

## Features

- Product catalog, cart, and guest checkout
- "Any 3 soaps for ₹285" pricing calculated on the server
- Customer accounts with email/password, HTTP-only session cookies, and optional phone OTP
- Customer profile and order history
- Password reset with one-time hashed tokens
- Admin APIs for orders, customers, products, coupons, inventory, and dashboard metrics
- Optional Razorpay order creation, signature verification, and webhook handling
- Product and inventory stock kept in sync with transactional compensation on failures

## Stack

- Frontend: React 19, React Router, Vite
- Backend: Node.js, Express 5
- Database: MongoDB Atlas with Mongoose
- Auth: `jose` HS256 JWT in an HTTP-only cookie, bcrypt password hashes
- Validation: custom server-side validators

## Project structure

```text
src/                    React storefront
  api/                  fetch wrappers (cookie credentials enabled)
  context/              auth, cart, language providers
  components/           checkout, auth, navigation, catalog UI
  pages/                storefront and account pages
server/                 Express API
  config/               environment and Mongo connection
  models/               Admin, Customer, Product, Order, Coupon, Inventory
  lib/                  auth, cookies, validation, serialization, errors
  middleware/           authentication and admin authorization
  routes/               public, customer, admin, and payment endpoints
  services/             pricing, inventory, order, email, SMS, Razorpay
  scripts/              health check, catalog seed, admin seed
  tests/                Node test runner unit tests
scripts/dev.js          runs API and Vite together
```

## Requirements

- Node.js 20.19+ (Node 24 recommended)
- A MongoDB Atlas cluster or another MongoDB deployment
- Optional: Resend API key for password-reset email
- Optional: Twilio credentials for phone OTP
- Optional: Stripe secret key and webhook secret for online payments (cards/UPI where enabled in the Stripe Dashboard)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   Required backend values:

   - `MONGODB_URI`: Atlas connection string
   - `JWT_SECRET`: at least 32 random characters
   - `DB_NAME`: defaults to `jh_soaps`

   Generate a JWT secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

3. Verify the database and create indexes:

   ```bash
   npm run db:check
   ```

4. Seed the real catalog. New products default to zero stock unless `SEED_STOCK` is set:

   ```bash
   npm run db:seed
   ```

   Existing products are never overwritten, including their price and stock.

5. Optional: create the first administrator. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (12+ characters) in `.env`, then run:

   ```bash
   npm run db:seed:admin
   ```

6. Start development:

   ```bash
   npm run dev
   ```

   - Storefront: http://localhost:5174
   - Admin login: http://localhost:5174/admin/login
   - Admin dashboard: http://localhost:5174/admin/dashboard
   - API: http://localhost:4000

   Vite proxies `/api` to the API in development.

## Production

```bash
npm run build
npm start
```

The API serves `dist/` when present. Set `CORS_ORIGIN` to the deployed storefront origin, set `COOKIE_SECURE=true`, and use HTTPS so secure cookies work.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | `mongodb://` or `mongodb+srv://` connection string |
| `DB_NAME` | No | Database name, default `jh_soaps` |
| `JWT_SECRET` | Yes | Session signing secret, minimum 32 characters |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `CORS_ORIGIN` | No | Comma-separated allowed origins or `*` |
| `PUBLIC_APP_URL` | No | Frontend URL used in password-reset links |
| `COOKIE_SECURE` | No | Force secure cookies; defaults to true in production |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed only | Bootstrap a super admin |
| `RESEND_API_KEY` / `AUTH_FROM_EMAIL` | No | Password-reset email delivery |
| `TWILIO_*` | No | Phone OTP delivery |
| `RAZORPAY_*` | No | Legacy Razorpay endpoints and webhook verification |
| `STRIPE_SECRET_KEY` | No | Stripe Checkout session creation (server-side only) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signature verification |
| `STRIPE_ENABLE_UPI` | No | Fallback hint when Stripe's payment-method configuration cannot be read |
| `STRIPE_PAYMENT_METHODS` | No | Fallback method list, e.g. `card,upi` |
| `STRIPE_CURRENCY` | No | Checkout currency, default `inr` |
| `VITE_API_URL` | No | Frontend API base; defaults to `/api` |

Stripe Checkout uses the payment methods enabled in your Stripe Dashboard. The `STRIPE_ENABLE_UPI` and `STRIPE_PAYMENT_METHODS` values are only fallback hints when that configuration cannot be read.

Never expose server secrets through `VITE_*` variables. Those values are bundled into the browser.

## API overview

Public and customer routes:

- `POST /api/auth/register`, `/login`, `/logout`
- `GET /api/auth/session`
- `POST /api/auth/otp/request`, `/otp/verify`
- `POST /api/auth/password/forgot`, `/reset`, `/update`
- `GET /api/products`, `/api/products/:slugOrId`
- `GET /api/coupons/validate`
- `POST /api/orders`, `GET /api/orders/:orderNumberOrId`
- `GET/PATCH /api/me`, `GET /api/me/orders`, `GET /api/me/orders/:id`
- `GET /api/payments/stripe/config`
- `POST /api/payments/stripe/checkout`, `/verify`, `/retry`
- `POST /api/payments/stripe/webhook` (raw-body signature verification)
- `POST /api/payments/razorpay/order`, `/verify`
- `POST /api/payments/razorpay/webhook` (raw-body signature verification)
- `GET /api/health`, `/api/health/database`

Admin routes require an administrator session under `/api/admin`:

- `/orders`, `/customers`, `/coupons`, `/inventory`, `/products`
- `GET /dashboard`
- Product create/update/deactivate is also available at `/api/products` for administrators

## Order and inventory rules

- The browser sends only product slugs/IDs and quantities.
- Prices, stock, offer discounts, and totals are calculated from MongoDB.
- Complete groups of three units are discounted so the group costs ₹285.
- A coupon is evaluated after the soap offer and rejected if inactive, expired, over its usage limit, or below its minimum order value.
- Stock is decremented atomically for each product and the inventory ledger.
- If any later step fails, already-decremented stock is restored.
- Orders accept an `Idempotency-Key` header or `idempotencyKey` body field so a retried checkout returns the original order.
- Cancelling or deleting an order restores stock once.

## Tests and checks

```bash
npm test
npm run lint
npm run build
npm run db:check
```

Unit tests cover pricing, validation, and serialization. Integration checks require a working `MONGODB_URI`.

## Current limitations

- Checkout uses Stripe-hosted Checkout. Configure `STRIPE_SECRET_KEY` and the webhook endpoint; without them the UI shows a clear configuration error instead of starting a payment.
- Phone OTP and password-reset email require Twilio and Resend configuration respectively. Without them the related endpoints fail clearly instead of pretending to send.
- Legacy hosted-database data could not be exported because the old project hostname no longer resolves. This repository contains no legacy provider code or migrations.
