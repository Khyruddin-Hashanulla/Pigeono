# Pigeono — Multivendor Pigeon Marketplace (MERN)

A full-stack multivendor marketplace for buying and selling racing, high-flying and fancy pigeons with admin-verified pedigrees.

## Monorepo layout

```
/client   React (Vite) + React Router + Tailwind CSS v4
/server   Node.js + Express + Mongoose (REST API, /api/v1)
```

## Quick start

```bash
pnpm install
pnpm dev        # runs server (:5000) + client (:3000) concurrently
```

- If `MONGO_URI` is not set, the server boots an **in-memory MongoDB** and auto-seeds demo data (dev/preview only, data is lost on restart). Set `MONGO_URI` (MongoDB Atlas) for persistence.
- Copy `server/.env.example` to `server/.env` and fill in real values for production.

## Seed accounts

| Role   | Email                      | Password        |
| ------ | -------------------------- | --------------- |
| Admin  | admin1@pigeono.com         | AdminPass123!   |
| Admin  | admin2@pigeono.com         | AdminPass123!   |
| Buyer  | buyer@pigeono.com          | BuyerPass123!   |
| Vendor | arjun@demo.pigeono.com     | VendorPass123!  |
| Vendor | salman@demo.pigeono.com    | VendorPass123!  |
| Vendor | rohan@demo.pigeono.com     | VendorPass123!  |
| Vendor | raj@demo.pigeono.com       | VendorPass123!  |
| Vendor | meera@demo.pigeono.com     | VendorPass123!  |

Seed data: 4 categories, 5 approved vendor stores, 20 listings (18 active, 2 pending approval), 10 reviews.

## Implemented

- **Auth**: Email/password, Phone OTP, Google OAuth. Email OTP verification on registration. JWT access + refresh tokens in httpOnly cookies. RBAC (buyer/vendor/admin). Password reset via tokenized email link (30 min expiry).
- **Subscriptions**: 3-tier (Basic ₹599 / Pro ₹999 / Elite ₹1,999 per month). Razorpay checkout (real + simulated dev mode). Listing limit enforcement. Auto-renewal with reminders. Proration on plan changes. Razorpay webhooks with HMAC signature verification. Admin overrides.
- **Payments**: Direct vendor-to-buyer model (no escrow). Buyer pays the vendor via UPI/bank/cash; vendor confirms receipt. The platform only collects subscription fees.
- **Public**: Homepage (hero, categories, trending), search & filters (breed, category, price, sex, verified-pedigree-only, sort, pagination), pigeon detail (gallery, pedigree, racing records, seller card, reviews), vendor storefront (`/store/:storeSlug`), blog.
- **Vendor**: Store settings, listing CRUD (approval queue; pedigree edits reset verification), sales manager (confirm payment, complete sale), subscription management, analytics, wallet.
- **Admin**: Vendor approval, listing approval with pedigree verification, subscription oversight, dispute resolution, content management, stats dashboard.
- **Chat**: Real-time messaging via Socket.io with conversation rooms, typing indicators, unread counts, and a slow polling fallback when the socket is down.
- **Email**: Nodemailer with branded HTML templates (OTP, welcome, receipts, order notices, renewal reminders, password reset). Console dev mode when SMTP is unset.
- **Uploads**: Multer with Cloudinary storage in production (`CLOUDINARY_*` env vars) and local disk fallback for dev.
- **SEO**: react-helmet-async meta/OG tags with schema.org JSON-LD, server-generated `sitemap.xml` and `robots.txt`.
- **PWA**: Installable on mobile homescreens, offline asset caching via Workbox (vite-plugin-pwa).
- **Testing**: Auth, subscription, and order lifecycle flows using the Node test runner + supertest (`pnpm --dir server test`).
- **Security**: Helmet, explicit CORS, rate-limited auth routes, express-validator on all routes, NoSQL injection protection, bcrypt hashing, socket authentication with room-level participant checks, React error boundaries.

## Environment variables (`server/.env.example`)

See `server/.env.example` for the full list (`MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_ORIGIN`, `PORT`, plus Stripe/Cloudinary placeholders for later milestones).

## Deployment notes

- Backend: Render/Railway (long-running Node process). Frontend: Vercel/Netlify (static Vite build). DB: MongoDB Atlas.
- The Express API is **not** deployable on Vercel serverless as-is; keep it on a persistent host per the architecture spec.
