# BGFS — Battlegrounds Faceoff Series
## Comprehensive Platform Build Summary & Architecture Guide

---

## 📌 Executive Overview

**BGFS (Battlegrounds Faceoff Series)** is a full-stack, enterprise-grade BGMI (mobile) tournament management platform engineered with **Next.js 14/16 (App Router)**, **TypeScript**, **Supabase (PostgreSQL, RLS, Auth)**, and **Razorpay**. 

The platform powers a **2-week competitive tournament cycle**:
- **Week 1 & 2 (Mon–Fri):** Paid league stage matches (3 matches/slot, ₹50 entry fee).
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
├── .env.local                       # Environment variables template (Supabase & Razorpay keys)
├── netlify.toml                     # Netlify build & deployment configuration
├── next.config.ts                   # Next.js configuration with static timeout
├── package.json                     # Node dependencies (Next 16, Supabase, Lucide React, Razorpay)
├── BuildSummary.md                  # Project architecture & status map (This file)
│
├── styles/
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
    ├── layout.tsx                   # Root HTML layout with SEO metadata & Google Fonts
    ├── page.tsx                     # Landing page (Hero countdown, How it works, Road to Grand Finals, Prizes)
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
    ├── dashboard/                   # Captain & Player Dashboard
    │   ├── page.tsx                 # Server data fetcher (Protected)
    │   ├── DashboardClient.tsx      # Roster list, Invite link, Room IDs, Coupons, UPI ID
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
        └── payment/
            ├── create-order/route.ts # Razorpay Order generation API
            ├── verify/route.ts       # Razorpay client checkout HMAC SHA-256 signature verification
            └── webhook/route.ts      # Razorpay async webhook listener
```

---

## 🔗 Key Architectural Flows & Recent Upgrades

### 1. Account Creation vs. Slot Booking Separation
- **Account Registration (`/register`):**
  - Prompt: Asks for **Team Name**, **Email Address**, and **Password**.
  - Logic: Registers Supabase Auth User, inserts Team into `teams` table as Captain, initializes profile in `users` table, signs the user in, and auto-redirects to `/slots`.
- **Slot Booking (`/slots`):**
  - Handles slot calendar browsing, entry fee calculations, coupon redemptions, and Razorpay payment checkout.

### 2. Sign In Page (`/login`) UX Refactoring
- **Logo Presentation:** Displays centered high-res `faceofflogo.png` image (2x size: 140px height, `object-fit: contain`).
- **Segmented Control Switcher:** Features custom styled pill tabs for **`PASSWORD`** and **`OTP CODE`** sign-in (gold `#facc15` active state).
- **Clean Footer Hierarchy:** Formatted with 24px top margins and distinct 16-20px vertical spacing separating registration callouts, tournament rules disclaimers, and a horizontal divider before `"← BACK TO HOME"`.

### 3. Leaderboard & Best-16 Scoring Engine
- **Best-16 Rule:** Evaluates each team's top 16 match performances across all played slots using PostgreSQL subquery view (`leaderboard`).
- **Dual View Switching:**
  - `OVERALL`: Shows Best-16 leaderboard with expandable match breakdown.
  - `SLOT RESULTS`: Filters leaderboard per slot with custom-built `CustomSlotDropdown` (dark surface, gold hover border, backdrop dismiss, rotating chevron).
- **Iconography:** Standardized on `lucide-react` icons (Users, Calendar, Crosshair, Trophy, Medals) with 0 emoji dependencies.

### 4. Razorpay Payment Integration
```
User Selects Slot ──► Clicks "Pay & Book Slot"
                            │
                            ▼
           POST /api/payment/create-order
                            │ (Generates Razorpay Order ID)
                            ▼
           Razorpay Modal Opens on Client
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        Payment Success             Payment Failed
              │                           │
  POST /api/payment/verify           Show Error
  (HMAC SHA-256 Check)
              │
   Updates DB Booking to 'paid'
              │
  DB Trigger Increments Slot Count
              │
  Displays WhatsApp Link & Success Screen
```

---

## ⚡ Current Status Summary

| Component | Status | Details |
| :--- | :---: | :--- |
| Next.js App Structure | ✅ COMPLETE | App Router, 10 dynamic routes |
| Design System & UI | ✅ COMPLETE | Dark gaming aesthetic (`#111111`, `#facc15`), lucide-react icons |
| Database Schema | ✅ COMPLETE | SQL migration ready with RLS & Best-16 view |
| Password & OTP Auth | ✅ COMPLETE | Dual auth mode support in `LoginPage.tsx` |
| Account & Team Registration | ✅ COMPLETE | Dedicated `/register` page asking Team Name, Email, Password |
| Slot Booking & Razorpay | ✅ COMPLETE | Dedicated `/slots` page with Razorpay order, verify, & webhooks |
| Leaderboard & Best-16 | ✅ COMPLETE | Best-16 view + per-slot filter + custom dropdown |
| Admin Panel | ✅ COMPLETE | Score entry, room credentials, UPI payout log, role manager |
| GitHub Repository Sync | ✅ COMPLETE | Pushed to `vasuyadav01/battlegroundsfaceoffseries` (`main`) |

---

### 📋 To Launch Live:
1. Execute `supabase/migrations/001_initial_schema.sql` in your Supabase SQL Editor.
2. Enter live credentials in `.env.local` or host environment variables (Supabase URL/Key, Razorpay Key/Secret).
3. Deploy to Netlify / Vercel!
