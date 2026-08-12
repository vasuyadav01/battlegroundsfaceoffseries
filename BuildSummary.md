# BGFS — Battlegrounds Faceoff Series
## Comprehensive Platform Build Summary & Architecture Guide

---

## 📌 Executive Overview

**BGFS (Battlegrounds Faceoff Series)** is a full-stack, enterprise-grade BGMI (mobile) tournament management platform engineered with **Next.js 16 (App Router)**, **TypeScript**, **Supabase (PostgreSQL, RLS, Auth)**, and **Razorpay**. 

The platform powers a **2-week competitive tournament cycle**:
- **Week 1 & 2 (Mon–Fri):** Paid league stage matches (3 matches/slot).
- **Week 2 (Sat–Sun):** **Free Grand Finals** for the top 16 qualified teams (3 matches Saturday + 3 matches Sunday).

---

## 🏗️ Architecture & Component Connections

```
                             ┌──────────────────────────────────┐
                             │       NEXT.JS FRONTEND           │
                             │  (App Router, Vanilla CSS, RSC)  │
                             └────────────────┬─────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    ▼                         ▼                         ▼
         ┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
         │   SUPABASE AUTH   │     │ DATABASE & RLS    │     │  RAZORPAY GATEWAY │
         │ (Password & OTP)  │     │ (Postgres + Views)│     │(Order, Verify, Webhook)
         └───────────────────┘     └───────────────────┘     └───────────────────┘
```

---

## 🗂️ File Map & Directory Structure

```
BGFS/
├── .env.local                       # Environment variables (Supabase & Razorpay keys)
├── next.config.ts                   # Next.js configuration
├── package.json                     # Node dependencies (Next 16, Supabase, Lucide React, Razorpay)
├── BuildSummary.md                  # Comprehensive project build summary & status map (This file)
│
├── styles/
│   └── globals.css                  # Core CSS tokens, mobile touch utilities (44px min-height)
├── public/
│   └── images/                      # High-res branding assets (faceofflogo.png, bgmilogo.png)
│
├── lib/
│   ├── scoring.ts                   # Business logic: BGIS 10-pt placement + kill points, Best-16 calculator
│   └── supabase/
│       ├── client.ts                # Browser-side Supabase client initialization
│       ├── server.ts                # Server-side Supabase client (RSC, API routes, Admin elevated client)
│       └── middleware.ts            # Auth session refresh & protected route middleware
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Full DB schema, RLS policies, triggers, & Best-16 leaderboard view
│
├── components/
│   ├── Navbar.tsx                   # Responsive navigation header with dual logo & auth-aware actions
│   ├── Navbar.module.css
│   ├── CountdownTimer.tsx           # Live countdown timer for Grand Finals event
│   └── CountdownTimer.module.css
│
└── app/
    ├── layout.tsx                   # Root HTML layout with Viewport (themeColor #111111) & SEO metadata
    ├── page.tsx                     # Landing page (Hero countdown, Road to Grand Finals, Prizes, CTA)
    ├── page.module.css
    │
    ├── login/                       # Sign In (Password & OTP)
    │   ├── page.tsx                 # Server wrapper (forces dynamic rendering)
    │   ├── LoginPage.tsx            # Segmented tab toggle (Password/OTP), faceofflogo header, sign in form
    │   └── page.module.css
    │
    ├── register/                    # Team & Account Registration
    │   ├── page.tsx                 # Server wrapper
    │   ├── RegisterClient.tsx       # Account creation form (Team Name, Email, Password) + auto team setup
    │   └── page.module.css
    │
    ├── slots/                       # Slot Booking & Razorpay Payment
    │   ├── page.tsx                 # Server data fetcher (Slots, Team, Coupons, Config)
    │   ├── SlotsClient.tsx          # Date-grouped slots, Razorpay modal checkout, WhatsApp link
    │   └── page.module.css
    │
    ├── onboard/                     # Squad Onboarding (Join via Invite Code)
    │   ├── page.tsx                 # Server wrapper
    │   ├── OnboardPage.tsx          # Create Team or Join via 8-char Invite Code
    │   └── page.module.css
    │
    ├── dashboard/                   # 3-Card Player Hub & Tournament Portal
    │   ├── page.tsx                 # Protected Server Data Fetcher (Admin Client fallback)
    │   ├── DashboardClient.tsx      # My Slots card, My Standing card (Best-16 rank), Wallet card
    │   └── page.module.css
    │
    ├── leaderboard/                 # Public Live Leaderboard & Slot Results
    │   ├── page.tsx                 # Server fetcher (Revalidates 60s)
    │   ├── LeaderboardClient.tsx    # Best-16 overall view + Per-slot results view + CustomSlotDropdown
    │   └── page.module.css
    │
    ├── admin/                       # Role-Gated Admin Panel
    │   ├── page.tsx                 # Server role verifier (`admin` & `admin_scores`)
    │   ├── AdminClient.tsx          # Score Entry, Slot Creator, UPI Payout log, Role Manager
    │   └── page.module.css
    │
    └── api/                         # Backend API Routes
        ├── auth/
        │   └── callback/route.ts    # Supabase Auth code exchange handler
        ├── register-team/route.ts   # Server-side Admin Client team creation API
        ├── setup-team/route.ts      # Server-side Admin Client squad onboarding API
        └── payment/
            ├── create-order/route.ts # Razorpay Order generation API
            ├── verify/route.ts       # Razorpay client checkout HMAC SHA-256 signature verification
            └── webhook/route.ts      # Razorpay async webhook listener
```

---

## 🔗 Key Features & Recent Upgrades

### 1. Minimal 3-Card Player Dashboard (`/dashboard`)
- **My Slots Card:** Displays upcoming booked slots (date, time, slot name, status badge) or empty state with `"BOOK A SLOT"` button.
- **My Standing Card:** Single snapshot with overall rank, Best-16 score, total matches played, qualification status badge (`"QUALIFIED ✓"` gold badge if top 16, or `"NOT YET QUALIFIED"` gray badge), and link to `/leaderboard`.
- **Wallet Card:** Entry fees paid total (₹) and prize money earned (₹, with pending/paid status tags).
- **User Identity:** Displays logged-in player's email directly in dashboard header.

### 2. Server-Side Registration & Admin Client Resilience
- **API Routes (`/api/register-team` & `/api/setup-team`):** Built using Supabase Service Role Admin Client (`createAdminClient`) to reliably bypass RLS and auto-provision team profiles for new registrants.
- **Redirect Loop Prevention:** Automatically creates default squad profile if missing, ensuring clean access after `/login` or `/onboard`.

### 3. Mobile Responsiveness Optimization (All Smartphones & Viewports)
- **Viewport Config:** Added Next.js `Viewport` settings (`width: device-width`, `themeColor: #111111`) for seamless iOS Safari and Android Chrome status bar styling.
- **Touch Target Standard:** Enforced `44px+` minimum touch target height across all buttons, tab switches, and form inputs (prevents iOS auto-zoom).
- **Responsive Layouts:**
  - Dashboard 3-card grid transforms into a single-column stack on mobile displays.
  - Navbar logo dynamically scales (`height: 36px` on `< 480px`) to prevent header squeezing.
  - Leaderboard tab switcher (`OVERALL STANDINGS` vs `SLOT RESULTS`) uses flexible, full-width touch buttons.
  - Slot selection day blocks and time slots (`.slotBtnInner`) stack vertically on small phones.
  - Auth page card padding (`1.75rem 1.25rem`) and logo height (`130px`) tuned for phone screens.

### 4. Home Screen CTA Polish
- **"CLAIM YOUR SLOT" Section:** Button label updated to **`BOOK YOUR SLOT`** (removed `50Rs` text label).

### 5. Production Build & Vercel Deployment Readiness
- **TypeScript Zero-Warning Build:** Resolved `b.slots` array vs object type mismatch in `DashboardClient.tsx`. `npm run build` compiles **10/10 routes** with zero errors.
- **Git Push Automation:** Committed and pushed all updates to `vasuyadav01/battlegroundsfaceoffseries` (`main` branch).
- **Custom Domain & Vercel Setup:** Documented GoDaddy nameserver setup (`ns1.vercel-dns.com` / `ns2.vercel-dns.com`), ICANN Registrar Hold resolution, and Vercel Environment Variables configuration.

---

## ⚡ Current System Status

| Component | Status | Details |
| :--- | :---: | :--- |
| Next.js App Structure | ✅ COMPLETE | App Router, Next.js 16, 10 dynamic routes |
| Design System & UI | ✅ COMPLETE | Dark gaming aesthetic (`#111111`, `#facc15`), lucide-react icons |
| Mobile Responsiveness | ✅ COMPLETE | Optimized for iOS & Android, touch targets 44px+ |
| Database Schema | ✅ COMPLETE | SQL migration ready with RLS & Best-16 view |
| Password & OTP Auth | ✅ COMPLETE | Dual auth mode support in `LoginPage.tsx` |
| Account & Team Registration | ✅ COMPLETE | Dedicated `/register` page + `/api/register-team` Admin API |
| 3-Card Player Dashboard | ✅ COMPLETE | My Slots, My Standing, & Wallet cards + user email |
| Slot Booking & Razorpay | ✅ COMPLETE | Dedicated `/slots` page with Razorpay order, verify, & webhooks |
| Leaderboard & Best-16 | ✅ COMPLETE | Best-16 view + per-slot filter + custom dropdown |
| Admin Panel | ✅ COMPLETE | Score entry, room credentials, UPI payout log, role manager |
| GitHub Repository Sync | ✅ COMPLETE | Pushed to `vasuyadav01/battlegroundsfaceoffseries` (`main`) |

---

## 📋 Quick Setup Checklist for Live Deployment:
1. Execute `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.
2. In Vercel Project Settings > **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. In Supabase > Authentication > **URL Configuration**, add your Vercel/GoDaddy domain to **Redirect URLs**.
