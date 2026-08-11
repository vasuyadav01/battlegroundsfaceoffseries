# BGFS — Battlegrounds Faceoff Series
## Comprehensive Platform Build Summary & Architecture Guide

---

## 📌 Executive Overview

**BGFS (Battlegrounds Faceoff Series)** is a full-stack, enterprise-grade BGMI (mobile) tournament management platform engineered with **Next.js 14 (App Router)**, **TypeScript**, **Supabase (PostgreSQL, RLS, Auth)**, and **Razorpay**. 

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
         │   (OTP Email)     │     │ (Postgres + Views)│     │(Order, Verify, Webhook)
         └───────────────────┘     └───────────────────┘     └───────────────────┘
```

---

## 🗂️ File Map & Directory Structure

```
BGFS/
├── .env.local                       # Environment variables template (Supabase & Razorpay keys)
├── netlify.toml                     # Netlify build & deployment configuration
├── next.config.ts                   # Next.js 14 configuration with static timeout
├── package.json                     # Node dependencies (Next 16, Supabase, Razorpay)
├── BuildSummary.md                  # Project architecture & status map (This file)
│
├── styles/
│   └── globals.css                  # Dark gaming design system tokens (Orbitron, Inter, Glassmorphism)
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
│   ├── Navbar.tsx                   # Responsive navigation header with auth-aware actions
│   ├── Navbar.module.css
│   ├── CountdownTimer.tsx           # Live countdown timer for Grand Finals event
│   └── CountdownTimer.module.css
│
└── app/
    ├── layout.tsx                   # Root HTML layout with SEO metadata & Google Fonts
    ├── page.tsx                     # Landing page (Hero countdown, How it works, Prizes, Scoring)
    ├── page.module.css
    │
    ├── login/                       # OTP Email Sign-in
    │   ├── page.tsx                 # Server wrapper (forces dynamic rendering)
    │   ├── LoginPage.tsx            # 2-Step OTP email login form
    │   └── page.module.css
    │
    ├── onboard/                     # Team & Squad Onboarding
    │   ├── page.tsx                 # Server wrapper
    │   ├── OnboardPage.tsx          # Create Team or Join via 8-char Invite Code
    │   └── page.module.css
    │
    ├── dashboard/                   # Captain & Player Dashboard
    │   ├── page.tsx                 # Server data fetcher (Protected)
    │   ├── DashboardClient.tsx      # Roster list, Invite link, Room IDs, Coupons, UPI ID
    │   └── page.module.css
    │
    ├── register/                    # Slot Booking & Razorpay Payment
    │   ├── page.tsx                 # Server data fetcher (Slots, Team, Coupons, Config)
    │   ├── RegisterClient.tsx       # Date-grouped slots, Razorpay modal checkout, WhatsApp link
    │   └── page.module.css
    │
    ├── leaderboard/                 # Public Live Leaderboard
    │   ├── page.tsx                 # Server fetcher (Revalidates 60s)
    │   ├── LeaderboardClient.tsx    # Desktop table + Mobile cards + Best-16 match breakdown
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

## 🔗 Connections & How Systems Interact

### 1. Authentication Flow
```
User Enters Email ──► Supabase OTP Sent ──► User Verifies 6-digit Code ──► Supabase Session Cookie
                                                                                   │
                                                      ┌────────────────────────────┴────────────────────────────┐
                                                      ▼                                                         ▼
                                       Has Team? ──► Go to /dashboard                        No Team? ──► Go to /onboard
```
- Handled by `app/login/LoginPage.tsx` and `lib/supabase/middleware.ts`.
- Supabase trigger `trigger_new_user` automatically creates a row in `users` table upon signup.

### 2. Team & Squad Onboarding Flow
- **Captain Creation:** User clicks "Create Team", inputs team name ──► DB creates `teams` row with a random 8-character `invite_code` ──► User's `role` becomes `captain`.
- **Player Joining:** Player inputs 8-character `invite_code` ──► DB matches code ──► Updates user's `team_id`.
- Handled in `app/onboard/OnboardPage.tsx`.

### 3. Slot Booking & Payment Flow (Razorpay)
```
User Selects Slot ──► Clicks "Pay ₹50 & Book"
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
- Handled by `app/register/RegisterClient.tsx`, `/api/payment/create-order`, `/api/payment/verify`, and `/api/payment/webhook`.

### 4. Scoring System & Leaderboard Logic
- **BGIS Scoring (`lib/scoring.ts`):**
  - **Placement Points:** 1st=10, 2nd=6, 3rd=5, 4th=4, 5th=3, 6th=2, 7th-8th=1, 9th-24th=0.
  - **Kill Points:** 1 point per kill.
- **Best-16 Rule:** Handled via PostgreSQL SQL View `leaderboard` in `supabase/migrations/001_initial_schema.sql`.
  ```sql
  -- Evaluates top 16 highest match scores for each team automatically
  SELECT SUM(pts) FROM (
    SELECT total_points AS pts FROM matches WHERE team_id = t.team_id ORDER BY total_points DESC LIMIT 16
  ) top16
  ```
- Handled by `app/leaderboard/LeaderboardClient.tsx`.

### 5. Role-Based Admin Panel Access
- Roles in `users` table: `player`, `captain`, `admin_scores`, `admin`.
- **Score Admin (`admin_scores`):** Access to **Score Entry** tab only.
- **Super Admin (`admin`):** Access to all tabs:
  1. 📊 **Score Entry:** Post match placement & kills (auto-calculates total points).
  2. 📅 **Slots:** Create slots, publish Room ID/PW, mark completed.
  3. 💸 **Payouts:** View 1st/2nd place cash prizes & mark UPI payouts as paid.
  4. 📋 **Bookings:** View all paid team bookings.
  5. 🎟️ **Coupons:** View 3rd-place free slot coupons.
  6. ⚙️ **Config:** Edit Grand Finals date, WhatsApp link, entry fee.
  7. 👥 **Admin Roles:** Delegate `admin_scores` or `admin` roles to team members.
- Handled by `app/admin/page.tsx` and `app/admin/AdminClient.tsx`.

---

## ⚡ Current Status & Next Steps

| Component | Status | Details |
| :--- | :---: | :--- |
| Next.js App Structure | ✅ COMPLETE | App Router, 9 dynamic routes |
| Design System | ✅ COMPLETE | Dark gaming aesthetic, custom CSS modules |
| Database Schema | ✅ COMPLETE | SQL migration ready with RLS & Best-16 view |
| OTP Auth | ✅ COMPLETE | Supabase Auth integrated |
| Onboarding | ✅ COMPLETE | Captain creation + invite code join |
| Razorpay Payments | ✅ COMPLETE | Order route, frontend checkout modal, verification route, webhook |
| Leaderboard | ✅ COMPLETE | Live table + mobile view + match breakdowns |
| Admin Panel | ✅ COMPLETE | Score entry, room credentials, UPI payout log, role manager |
| Netlify Config | ✅ COMPLETE | `netlify.toml` verified |

### 📋 To Launch Live:
1. Run `supabase/migrations/001_initial_schema.sql` in your Supabase project SQL Editor.
2. Enter your live Supabase and Razorpay API credentials into `.env.local` (or Netlify environment variables).
3. Connect repository to Netlify and deploy!
