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
│   ├── scoring.ts                   # Business logic: BGIS 10-pt placement + elimination points, Best-16 calculator
│   └── utils/
│       └── slotTime.ts              # Robust slot expiration helper & ISO date comparison logic
│   └── supabase/
│       ├── client.ts                # Browser-side Supabase client initialization
│       ├── server.ts                # Server-side Supabase client (RSC, API routes, Admin elevated client)
│       └── middleware.ts            # Auth session refresh & protected route middleware
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Full DB schema, RLS policies, triggers, & Best-16 leaderboard view
│       ├── 002_slot_booking_v2.sql  # Per-slot WhatsApp link, coupons, & capacity checks
│       └── 003_seed_9_to_11_pm_slots.sql # 9-11 PM daily slots for next 7 days & unique date-time constraint
│
├── components/
│   ├── Navbar.tsx                   # Responsive navigation header with dual logo & auth-aware actions
│   ├── Navbar.module.css
│   ├── Footer.tsx                   # Redesigned footer: border divider, trust badges (SSL/Razorpay), clean link grid
│   ├── Footer.module.css
│   ├── Marquee.tsx                  # Announcement banner track
│   └── CountdownTimer.tsx           # Live countdown timer for Grand Finals event
│
└── app/
    ├── layout.tsx                   # Root HTML layout with Viewport & SEO metadata
    ├── page.tsx                     # Landing page (Asymmetric Championship Hero, Skill Disclaimer, Scoring)
    │
    ├── login/                       # Sign In (Password & OTP)
    │   ├── page.tsx                 # Server wrapper (forces dynamic rendering)
    │   ├── LoginPage.tsx            # Clean card layout, pill header badge, dual auth tabs
    │   └── page.module.css
    │
    ├── register/                    # Team & Account Registration
    │   ├── page.tsx                 # Server wrapper
    │   ├── RegisterClient.tsx       # Account creation form (Team Name, Email, Password) + auto team setup
    │   └── page.module.css
    │
    ├── slots/                       # Slot Booking & Tournament Schedule
    │   ├── page.tsx                 # Server data fetcher (Auto-seeds 9-11 PM next 7 days & expires past slots)
    │   ├── SlotsClient.tsx          # Date-grouped slots, instant registration flow, WhatsApp links, Calendar, Receipt Modal
    │   └── page.module.css
    │
    ├── leaderboard/                 # Public Live Leaderboard & Slot Results
    │   ├── page.tsx                 # Server fetcher (Revalidates 60s)
    │   ├── LeaderboardClient.tsx    # Best-16 overall view + Per-slot results view + Eliminations stats
    │   └── page.module.css
    │
    ├── dashboard/                   # Player Dashboard
    │   ├── page.tsx                 # Server fetcher (User profile & active team bookings)
    │   ├── DashboardClient.tsx      # My Slots card + My Standing card (Wallet section cleanly removed)
    │   └── page.module.css
    │
    ├── admin/                       # Role-Gated Admin Panel
    │   ├── page.tsx                 # Server role verifier (`admin` & `admin_scores`)
    │   ├── AdminClient.tsx          # Score Entry (Eliminations + Placement), Slot Creator, Role Manager
    │   └── page.module.css
    │
    ├── fair-play/                   # Legal: Fair Play & Skill-Based Gaming Policy
    ├── privacy-policy/              # Legal: Privacy Policy
    ├── terms/                       # Legal: Terms & Conditions
    ├── refund-policy/               # Legal: Cancellation & Refund Policy
    ├── pricing/                     # Tournament Entry Fee & Rewards Breakdown
    ├── contact/                     # Support & Operator Contact Details
    │
    └── api/                         # Backend API Routes
        ├── auth/
        │   └── callback/route.ts    # Supabase Auth code exchange handler
        ├── booking/
        │   ├── create/route.ts      # Slot booking creation API with expiration guard
        │   └── confirm/route.ts     # Slot booking confirmation API
        ├── coupon/
        │   └── redeem/route.ts      # 3rd-place Next Slot Pass redemption API
        ├── register-team/route.ts   # Server-side Admin Client team creation API
        ├── setup-team/route.ts      # Server-side Admin Client squad onboarding API
        └── payment/
            ├── create-order/route.ts # Razorpay Order generation API
            ├── verify/route.ts       # Razorpay checkout HMAC SHA-256 signature verification
            └── webhook/route.ts      # Razorpay async webhook listener
```

---

## 🔗 Key Features & Recent Upgrades

### 1. Razorpay Production Payment Gateway Integration
- **Secure Server Signature Verification**: `/api/payment/verify` uses HMAC SHA-256 cryptographic verification of `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` using `RAZORPAY_KEY_SECRET`.
- **Async Webhook Listener**: `/api/payment/webhook` processes payment events (`payment.captured`, `order.paid`).
- **Environment Architecture**: `NEXT_PUBLIC_RAZORPAY_KEY_ID` used on client SDK; `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` kept strictly server-side.

### 2. Registered Slot Card Redesign (`/slots`)
- **Compact 1-Column Layout**: Fits standard 1-column card slot in grid matching surrounding cards without breaking layout rhythm.
- **Squad Tag Pill**: Gold squad tag pill displayed in top right corner (e.g. `Godlike`).
- **Match Schedule Chips**: Displays 3 micro match time chips (`M1 9:00 PM`, `M2 9:42 PM`, `M3 10:18 PM`).
- **Expectation Setting Note**: Compact 1-line guidance line: `"Room ID/Pass posted in WhatsApp 10m before matches."`
- **Primary & Secondary Actions**: WhatsApp green Join button + side-by-side **Add to Calendar** (Google Calendar sync) and **View Receipt** modal triggers.
- **Receipt Modal**: Displays reference ID, team name, time window, match count, amount paid, and verified payment status.

### 3. Filter Tabs & Footer UI Refinements
- **Clean Filter Tabs**: Emojis removed from filter buttons (`OPEN / UPCOMING SLOTS`, `PAST SLOTS`, `ALL SLOTS`).
- **Footer Redesign**: Top border divider added, trust badges (SSL Secured, Razorpay) placed near Legal column, operator block replaced with clean logo & tagline anchor, and bottom bar copyright/legal links aligned on a single row.

### 4. Terminology & Legal Copy Standardization ("Eliminations")
- **Eliminations Standardization**: Replaced all instances of "kills" / "kill points" / "finishes" across every page with **"eliminations"** / **"elims"** / **"Elimination Points"**.
- **Removal of AI-Generated Em-Dashes (`—`)**: Cleaned up page metadata titles, section headers, hero descriptions, marquee banners, and legal disclosures.
- **Skill-Based Gaming Disclosures**: Ensured all legal pages (`/fair-play`, `/terms`, `/privacy-policy`, `/refund-policy`) explicitly highlight Article 19(1)(g) Game of Skill jurisprudence under Indian law.

---

## ⚡ Current System Status

| Component | Status | Details |
| :--- | :---: | :--- |
| Next.js App Structure | ✅ COMPLETE | App Router, Next.js 16, 17 static & dynamic routes |
| Design System & UI | ✅ COMPLETE | Dark gaming aesthetic (`#111111`, `#fbbf24`), lucide-react vector icons |
| Terminology Standardization | ✅ COMPLETE | "Eliminations" used across all pages; em-dashes (`—`) eliminated |
| Mobile Responsiveness | ✅ COMPLETE | Touch targets 44px+, responsive card grid |
| Database Schema | ✅ COMPLETE | SQL migrations 001, 002, 003 ready with RLS & Best-16 view |
| Password & OTP Auth | ✅ COMPLETE | Dual auth mode support in `LoginPage.tsx` |
| Account & Team Registration | ✅ COMPLETE | Redesigned `/register` & `/login` pages + `/api/register-team` Admin API |
| 9-11 PM Slots & Expiration | ✅ COMPLETE | Auto-maintained 7-day 9-11 PM slots + DB expiration lock |
| Razorpay Payment Gateway | ✅ COMPLETE | HMAC SHA-256 signature verification + Webhook route |
| Registered Slot Card & Modal | ✅ COMPLETE | Compact 1-column card + match schedule pills + receipt modal |
| Dashboard Streamline | ✅ COMPLETE | My Slots + My Standing 2-card grid (Wallet removed) |
| Leaderboard & Best-16 | ✅ COMPLETE | Best-16 view + per-slot filter + Eliminations breakdowns |
| Admin Panel | ✅ COMPLETE | Score entry (Elims + Placement), room credentials, role management |
| Legal & Compliance Pages | ✅ COMPLETE | Terms, Privacy Policy, Refund Policy, Fair Play Policy |
| Production Build Verification | ✅ COMPLETE | `npm run build` compiles clean with 0 warnings or errors |

---

## 📋 Quick Setup Checklist for Live Deployment:
1. Execute `supabase/migrations/001_initial_schema.sql`, `002_slot_booking_v2.sql`, and `003_seed_9_to_11_pm_slots.sql` in your Supabase SQL Editor.
2. In Vercel Project Settings > **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
3. In Supabase > Authentication > **URL Configuration**, add your domain (`https://battlegroundsfaceoffseries.com`) to **Redirect URLs**.
