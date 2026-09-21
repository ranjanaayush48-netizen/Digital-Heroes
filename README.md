# Digital Heroes · Production Web Platform

**Author:** Ayush Ranjan  
**Edition:** 2026 PRD Level 1 Implementation  
**Domain:** digitalheroes.co.in

---

## 1. Product Overview

**Digital Heroes** is a subscription-driven golf performance, charity, and monthly prize-draw platform. Public visitors can understand the platform, explore verified charity partners, inspect draw mechanics, and subscribe. Registered subscribers manage their profile, subscriptions, 5-score rolling Stableford golf scores, chosen charity allocations, draw participation, and winnings. Administrators control users, subscriptions, scores, charities, draws, winners, payouts, and analytics.

The visual direction strictly follows the PRD mandate: **"Feel, not fairway."** It rejects dated golf clichés (plaid, excessive clubs, fairways) in favor of a warm, modern architectural palette (warm off-white, charcoal, deep green, restrained neutral tones) centered on charitable impact, community excitement, and verified results.

---

## 2. Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Motion, Lucide Icons, Canvas-Confetti
- **Backend & Persistence:** Node.js + Express + TypeScript, Cloud Firestore, Firebase Authentication, Firebase Storage
- **Payments:** Stripe test mode subscription & checkout workflow
- **Deployment:** Vercel compatible architecture (`vercel.json` and client SPA static routing)

---

## 3. Core Architecture & Modules

### 1. Score Management Engine (PRD § 05)
- Stableford scores strictly bounded between **1 and 45**.
- Date is required; only **one score is permitted per date** (duplicates on the same date are rejected with an edit or delete prompt).
- **Maximum 5 scores retained at any time**. When a 6th score is added, the oldest stored score is automatically pruned using an atomic batch.
- Displayed in **reverse chronological order** (most recent first).

### 2. Charity Allocation Engine (PRD § 08)
- Every subscriber designates a charity partner during signup or from their dashboard.
- **Mandatory 10% minimum contribution** automatically calculated from subscription dues.
- Voluntary slider allowing subscribers to increase contribution up to **50%**.
- **Independent donation option** allowing one-off philanthropic gifts not tied to gameplay.
- Admin CRUD surface for charities, media banners, and upcoming golf day events.

### 3. Draw & Prize Engine (PRD § 06 & § 07)
- Monthly draws with deterministic server-side calculations.
- Configurable subscription allocation (default $10 per active subscriber).
- Prize pool distribution:
  - **5-Number match (Jackpot):** 40% of pool (+ full rollover if unclaimed)
  - **4-Number match:** 35% of pool
  - **3-Number match:** 25% of pool
- Each tier is split equally among multiple winners.
- Unclaimed 5-number jackpot **rolls over indefinitely**.
- Selection methods:
  - **Random:** Standard lottery pseudo-random generator with uniform distribution (1–45).
  - **Algorithmic:** Weighted selection based on member score frequency with Laplace smoothing.
- **Simulation before publishing:** Administrators inspect simulated winners, payouts, and rollover amounts before officially publishing.

### 4. Winner Verification & Payout Pipeline (PRD § 09)
- Winners can upload scorecard screenshots or club handicap verification.
- Stored securely in Firebase Storage with data URI fallback.
- Administrators review submissions (`pending_review` → `approved` / `rejected`).
- Payout state lifecycle: `Pending` → `Paid`.

---

## 4. Firestore Data Model

```
├── users/{userId}
│   ├── uid, email, displayName, role ('subscriber' | 'admin')
│   ├── subscriptionStatus ('active' | 'inactive' | 'cancelled' | 'lapsed')
│   ├── subscriptionPlan ('monthly' | 'yearly')
│   ├── subscriptionRenewalDate
│   ├── selectedCharityId
│   ├── charityContributionPercent (>= 10)
│   └── scores/{scoreId}
│       ├── score (1-45), date (YYYY-MM-DD, unique per date), courseName, notes
│
├── charities/{charityId}
│   ├── name, category, tagline, description, mission, imageUrl, featured
│   ├── totalRaised, supporterCount, upcomingEvents[]
│
├── draws/{drawId}
│   ├── month (YYYY-MM), title, drawDate, status ('simulated' | 'published')
│   ├── drawMethod ('random' | 'algorithmic')
│   ├── winningNumbers (5 numbers, 1-45)
│   ├── activeSubscribersCount, totalPrizePool
│   ├── jackpotRolloverIn, jackpotRolloverOut
│   └── tiers (fiveMatch, fourMatch, threeMatch)
│
├── winners/{winnerId}
│   ├── userId, userName, userEmail, matchType, matchedNumbers
│   ├── prizeShareAmount, proofStatus, proofUrl, proofNotes, paymentStatus
│
└── donations/{donationId}
    ├── charityId, charityName, amount, donorName, donorEmail, message
```

---

## 5. Security & Authorization

1. **Role-Based Access Control (RBAC):** Admin operations (running draws, modifying charities, approving payouts) are strictly guarded both in client UI state and inside `firestore.rules`.
2. **Server-Side Determinism:** Winning number generation, pool calculations, and rollover transfers are audited and calculated server-side.
3. **Sensitive Key Safety:** Firebase API keys and Stripe keys are managed through `.env` and runtime configs without client exposure of admin secrets.

---

## 6. Evaluation & Test Credentials

For easy evaluator testing, the application includes one-click quick-fill buttons in the sign-in modal and navigation bar:

- **Administrator Demo Account:**
  - Email: `admin@digitalheroes.co.in`
  - Password: `HeroAdmin2026!`
  - Access: Full admin portal, draw simulator, charity CRUD, payout overrides.
- **Subscriber Demo Account:**
  - Email: `subscriber@digitalheroes.co.in`
  - Password: `HeroSubscriber2026!`
  - Access: Subscriber dashboard, Stableford score logging, charity selector.

---

## 7. Known Assumptions & PRD Clarifications

- **Configurable Subscription Allocation:** PRD § 06 states *"Do not invent an undocumented prize-pool percentage; make the unspecified fixed subscription allocation configurable"*. We implemented an explicit configurable variable `allocationPerSub` (default $10/subscriber/month) in the draw simulation engine.
- **Storage Resilience:** Direct upload to Firebase Storage is implemented with an inline data URI fallback so evaluation environments without provisioned remote storage buckets remain completely functional.
- **Jackpot Rollover:** Unclaimed 5-match jackpot pool rolls over to the next month's total available 5-match pool, matching PRD § 06 and § 07 specifications.

---

**Built with pride by Ayush Ranjan.**
