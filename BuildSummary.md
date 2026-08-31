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
│   ├── scoring.ts                   # Business logic: BGIS 10-pt placement + elimination points, Best 5 Slots (15 matches) calculator
│   └── utils/
│       └── slotTime.ts              # Robust slot expiration helper & ISO date comparison logic
│   └── supabase/
│       ├── client.ts                # Browser-side Supabase client initialization
│       ├── server.ts                # Server-side Supabase client (RSC, API routes, Admin elevated client)
│       └── middleware.ts            # Auth session refresh & protected route middleware
│
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql   # Full DB schema, RLS policies, triggers, & leaderboard view
│       ├── 002_slot_booking_v2.sql  # Per-slot WhatsApp link, coupons, & capacity checks
│       ├── 003_best_5_slots_leaderboard.sql # Best 5 Slots (15 matches) aggregate leaderboard view
│       ├── 004_admin_test_mode.sql  # Test account & test mode schema flags
│       └── 004_room_slot_number.sql # Custom room slot number assignment (starts at Slot 5) & view update
│
├── components/
│   ├── Navbar.tsx                   # Desktop left logos, center navigation, right user actions
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
    │   ├── RegisterClient.tsx       # Account creation form + automatic team setup
    │   └── page.module.css
    │
    ├── reset-password/              # Password Reset Flow
    │   └── page.tsx                 # Reset password form
    │
    ├── slots/                       # Slot Booking & Tournament Schedule
    │   ├── page.tsx                 # Server data fetcher (Auto-seeds 9-11 PM next 7 days & expires past slots)
    │   ├── SlotsClient.tsx          # Date-grouped slots, instant test mode registration, WhatsApp links, Receipt Modal
    │   └── page.module.css
    │
    ├── leaderboard/                 # Public Live Leaderboard & Slot Results
    │   ├── page.tsx                 # Server fetcher
    │   ├── LeaderboardClient.tsx    # Overall standings + Slot Results (3 Matches) view with Room Slot tags
    │   └── page.module.css
    │
    ├── dashboard/                   # Player Dashboard
    │   ├── page.tsx                 # Server fetcher (User profile & active team bookings)
    │   ├── DashboardClient.tsx      # My Slots (with Room Slot #) + My Standing + In-Dashboard Password Change
    │   └── page.module.css
    │
    ├── admin/                       # Role-Gated Admin Panel
    │   ├── page.tsx                 # Server role verifier (`admin` & `admin_scores`)
    │   ├── AdminClient.tsx          # Score Entry with Room Slot dropdown helpers, Slot Creator, Role Manager
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
        │   ├── create/route.ts      # Slot booking creation API with Test Mode auto-confirm & Room Slot calculation
        │   └── confirm/route.ts     # Slot booking confirmation API
        ├── coupon/
        │   └── redeem/route.ts      # 3rd-place Next Slot Pass redemption API
        ├── register-team/route.ts   # Server-side Admin Client team creation API
        ├── setup-team/route.ts      # Server-side Admin Client squad onboarding API
        ├── team/
        │   └── rename/route.ts      # 1-time team rename API
        ├── user/
        │   └── toggle-test-mode/route.ts # Test mode toggle API
        └── payment/
            ├── create-order/route.ts # Razorpay Order generation API
            ├── verify/route.ts       # Razorpay checkout HMAC SHA-256 signature verification
            └── webhook/route.ts      # Razorpay async webhook listener
```

---

## 🔗 Key Features & Recent Upgrades

### 1. In-Game Custom Room Slot Assignment (FCFS Starting at Slot 5)
- **First-Come, First-Served Logic**: Each paid booking for a slot automatically receives an assigned custom room slot starting from **Slot 5** (1st team = Slot 5, 2nd team = Slot 6, 3rd team = Slot 7, etc.).
- **Immediate Visibility**: Booked teams appear on the **Slot Results (3 Matches)** view instantly upon booking.
- **Slot Results Display**: Before match scores are submitted, team names feature **`Team Name [Slot 5]`** and a gold **`ROOM SLOT: SLOT 5`** sub-label. After match score entry, standard match scores, placements, and points are cleanly rendered.
- **Admin Score Entry Helper**: Admin team selection dropdown lists `Team Name [Slot 5]` to simplify score entry from BGMI custom room result screenshots.
- **Player Dashboard**: Player slot tickets display **`ROOM SLOT: SLOT 5`** under date and time labels.

### 2. Scoring System Refactor (Best 5 Slots / 15 Matches)
- **Aggregate Scoring**: Leaderboard tracks a team's top 5 highest-scoring slots (3 matches per slot = 15 matches aggregate total points).
- **Postgres View**: `003_best_5_slots_leaderboard.sql` and `004_room_slot_number.sql` compute top 5 slot totals dynamically.

### 3. Authentication & Password Security Enhancements
- **OTP & Password Sign In**: Supported via `LoginPage.tsx`.
- **In-Dashboard Password Change**: Logged-in captains can change password directly inside the dashboard.
- **Password Reset Flow**: `/reset-password` route handles recovery links seamlessly.

### 4. Layout & Desktop Header Refactor
- **Header Alignment**: Desktop header features brand logos on the far left, navigation links centered, and user account actions on the far right.

### 5. Razorpay Production Payment Gateway & Test Mode
- **Production Payment Verification**: HMAC SHA-256 signature verification in `/api/payment/verify`.
- **Test Mode Auto-Confirmation**: Built-in test mode branch in `/api/booking/create` allowing instant auto-confirmed slot bookings when Razorpay keys are omitted or when test mode is enabled.

---

## ⚡ Current System Status

| Component | Status | Details |
| :--- | :---: | :--- |
| Next.js App Structure | ✅ COMPLETE | App Router, Next.js 16, 18 static & dynamic routes |
| Design System & UI | ✅ COMPLETE | Dark gaming aesthetic (`#111111`, `#fbbf24`), lucide-react vector icons |
| Custom Room Slot Assignment | ✅ COMPLETE | FCFS starting at Slot 5; instant leaderboard & dashboard display |
| Leaderboard & Best 5 Slots | ✅ COMPLETE | Top 5 slot (15 matches) calculator + per-slot filter with room slot numbers |
| Terminology Standardization | ✅ COMPLETE | "Eliminations" used across all pages; em-dashes (`—`) eliminated |
| Mobile Responsiveness | ✅ COMPLETE | Touch targets 44px+, responsive card grid |
| Database Schema | ✅ COMPLETE | SQL migrations 001, 002, 003, 004 ready with RLS & leaderboard view |
| Password & OTP Auth | ✅ COMPLETE | Dual auth mode, reset password route, and in-dashboard password change |
| Account & Team Registration | ✅ COMPLETE | Redesigned `/register` & `/login` pages + auto team setup |
| 9-11 PM Slots & Expiration | ✅ COMPLETE | Auto-maintained 7-day 9-11 PM slots + DB expiration lock |
| Razorpay & Test Mode | ✅ COMPLETE | Production HMAC SHA-256 verification + instant test mode branch |
| Admin Panel | ✅ COMPLETE | Score entry with room slot dropdown helpers, slot creator, role management |
| Production Build Verification | ✅ COMPLETE | `npm run build` compiles clean with 0 warnings or errors |

---

## 📋 Quick Setup Checklist for Live Deployment:
1. Execute `supabase/migrations/001_initial_schema.sql`, `002_slot_booking_v2.sql`, `003_best_5_slots_leaderboard.sql`, `004_admin_test_mode.sql`, and `004_room_slot_number.sql` in your Supabase SQL Editor.
2. In Vercel Project Settings > **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
3. In Supabase > Authentication > **URL Configuration**, add your domain (`https://battlegroundsfaceoffseries.com`) to **Redirect URLs**.
