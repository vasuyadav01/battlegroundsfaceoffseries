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
│   ├── Footer.tsx                   # Full site footer with legal disclosures & operator details
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
    │   ├── SlotsClient.tsx          # Date-grouped slots, instant registration flow, WhatsApp links
    │   └── page.module.css
    │
    ├── leaderboard/                 # Public Live Leaderboard & Slot Results
    │   ├── page.tsx                 # Server fetcher (Revalidates 60s)
    │   ├── LeaderboardClient.tsx    # Best-16 overall view + Per-slot results view + Eliminations stats
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

### 1. Terminology & Legal Copy Standardization ("Eliminations" & Punctuation Audit)
- **Eliminations Standardization**: Replaced all instances of "kills" / "kill points" / "finishes" across every frontend page (Hero, Disclaimer, Scoring Rules, About Us, Fair Play Policy, Privacy Policy, Leaderboard, Mobile stats, and Admin portal) with **"eliminations"** / **"elims"** / **"Elimination Points"**.
- **Removal of AI-Generated Em-Dashes (`—`)**: Audited all page metadata titles, section headers, hero descriptions, marquee banners, and legal disclosures—replacing em-dashes with clean colons (`:`), bullet points (`•`), pipes (`|`), or natural phrasing.
- **Skill-Based Gaming Disclosures**: Ensured all legal pages (`/fair-play`, `/terms`, `/privacy-policy`, `/refund-policy`) explicitly highlight Article 19(1)(g) Game of Skill jurisprudence under Indian law.

### 2. Season 1 Championship & Skill Disclaimer Redesign
- **Crisp Asymmetric Hero Section**: Removed drop-shadow glow/blur effects from ₹20,000 prize amount and trophy icon. Replaced symmetrical card grid with a dominant hero element and inline sub-items list. Removed uniform circular badge icons.
- **Prominent Skill-Based Disclaimer Banner**: Moved the skill-based disclaimer banner near the top of the homepage (right after "How It Works"). Wrapped it in a bordered full-width container card with breathing room, larger shield icon, and a distinct button CTA to the Fair Play policy.

### 3. Auth UI Redesign (`/login` & `/register`)
- **Flat Premium Container Card**: Removed radial background glow/vignette. Placed forms inside a subtle 1px bordered card with a 16px radius.
- **Header Pill Tag**: Replaced large graphic logos with a tight `BGMI FACE-OFF SERIES` header tag pill.
- **Clean Rhythm & Uppercase Muted Labels**: Fixed field spacing, removed stray input dropdown icons, and applied muted uppercase labels with gold accent submit buttons.

### 4. Dynamic 9-11 PM Slots & Expiration Engine (`/slots`)
- **7-Day Rolling 9-11 PM Slots**: Added automated server logic in `app/slots/page.tsx` and SQL migration `003_seed_9_to_11_pm_slots.sql` to maintain open **9:00 PM – 11:00 PM** match slots for the next 7 consecutive days starting today.
- **Automated Slot Expiration**: Server automatically updates any open slot prior to the current date (e.g. August 16) to `status: 'completed'` in Supabase database upon page load.
- **Strict Registration Locks & API Guard**: Past slots are filtered out of the "Upcoming Slots" tab and display a disabled **`SLOT ENDED`** button under "Past Slots". The booking API (`/api/booking/create`) returns HTTP 400 for any expired slot.

### 5. Player Dashboard (`/dashboard`)
- **My Slots Card:** Displays upcoming booked slots (date, time, slot name, status badge) with direct WhatsApp group link for confirmed slots.
- **My Standing Card:** Single snapshot with overall rank, Best-16 score, total matches played, qualification status badge (`"QUALIFIED ✓"` gold badge if top 16, or `"NOT YET QUALIFIED"` gray badge), and link to `/leaderboard`.
- **2-Column Layout:** Clean, focused 2-card grid displaying booked slots and championship leaderboard standing side-by-side.

---

## ⚡ Current System Status

| Component | Status | Details |
| :--- | :---: | :--- |
| Next.js App Structure | ✅ COMPLETE | App Router, Next.js 16, 17 static & dynamic routes |
| Design System & UI | ✅ COMPLETE | Dark gaming aesthetic (`#111111`, `#fbbf24`), lucide-react icons |
| Terminology Standardization | ✅ COMPLETE | "Eliminations" used across all pages; em-dashes (`—`) eliminated |
| Mobile Responsiveness | ✅ COMPLETE | Optimized for iOS & Android, touch targets 44px+ |
| Database Schema | ✅ COMPLETE | SQL migrations 001, 002, 003 ready with RLS & Best-16 view |
| Password & OTP Auth | ✅ COMPLETE | Dual auth mode support in `LoginPage.tsx` |
| Account & Team Registration | ✅ COMPLETE | Redesigned `/register` & `/login` pages + `/api/register-team` Admin API |
| 9-11 PM Slots & Expiration | ✅ COMPLETE | Auto-maintained 7-day 9-11 PM slots + DB expiration lock |
| 3-Card Player Dashboard | ✅ COMPLETE | My Slots, My Standing, & Wallet cards + user email |
| Leaderboard & Best-16 | ✅ COMPLETE | Best-16 view + per-slot filter + Eliminations breakdowns |
| Admin Panel | ✅ COMPLETE | Score entry (Elims + Placement), room credentials, UPI payout log |
| Legal & Compliance Pages | ✅ COMPLETE | Terms, Privacy Policy, Refund Policy, Fair Play Policy |
| Production Build Verification | ✅ COMPLETE | `npm run build` compiles clean with 0 warnings or errors |

---

## 📋 Quick Setup Checklist for Live Deployment:
1. Execute `supabase/migrations/001_initial_schema.sql`, `002_slot_booking_v2.sql`, and `003_seed_9_to_11_pm_slots.sql` in your Supabase SQL Editor.
2. In Vercel Project Settings > **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RAZORPAY_KEY_ID` (When live)
   - `RAZORPAY_KEY_SECRET` (When live)
3. In Supabase > Authentication > **URL Configuration**, add your domain (`https://battlegroundsfaceoffseries.com`) to **Redirect URLs**.
