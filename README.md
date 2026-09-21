# Digital Heroes

A production-oriented full-stack web platform that combines golf performance tracking, charitable giving, subscription management, and monthly prize draws.

## Overview

Digital Heroes is designed around a simple idea: users track their golf performance, choose a charity and contribution percentage, participate through an active subscription, and become eligible for monthly prize draws.

The platform provides separate experiences for subscribers and administrators, with the core business logic handled through a React frontend, Node.js/Express backend, Firebase services, Razorpay subscriptions, and Cloudinary for secure winner-proof storage.

## Live Application

**Live Website:**  
https://digital-heroes-502dxqlit-alone-5a85.vercel.app/

## Source Code

**GitHub Repository:**  
https://github.com/ranjanaayush48-netizen/Digital-Heroes

---

## Key Features

### Subscriber

- Email/password authentication
- Subscriber onboarding
- Monthly and yearly subscription options
- Subscription status tracking
- Golf score entry and editing
- Stableford score validation from 1–45
- One score per date
- Automatic rolling five-score history
- Charity selection
- Configurable charity contribution percentage
- Monthly draw participation
- Winner status and prize information
- Winner proof upload
- Proof review status
- Payment status tracking

### Monthly Prize Draw

- Monthly draw configuration
- Random draw generation
- Score-frequency-weighted draw option
- Prize pool calculation based on active subscriptions
- Three matching tiers:
  - 5-number match
  - 4-number match
  - 3-number match
- Prize distribution:
  - 40% for 5-number matches
  - 35% for 4-number matches
  - 25% for 3-number matches
- Equal prize splitting between multiple winners
- 5-number jackpot rollover when unclaimed
- Admin simulation before publishing
- Published draw records are protected from duplicate publication

### Winner Verification

- Winner proof upload
- Secure Cloudinary storage
- Admin proof review
- Approve/reject workflow
- Payment status workflow:
  - Pending
  - Paid
- Rejected proofs can be resubmitted by the subscriber
- Secure signed URLs for proof viewing

### Admin Dashboard

- User management
- Subscription overview
- Score management
- Charity management
- Draw configuration
- Draw simulation
- Draw publishing
- Winner verification
- Payout management
- Analytics

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion

### Backend

- Node.js
- Express.js
- TypeScript

### Authentication & Database

- Firebase Authentication
- Firebase Firestore

### Payments

- Razorpay
- Recurring monthly/yearly subscriptions
- Webhook-based subscription lifecycle synchronization

### File Storage

- Cloudinary
- Secure winner-proof uploads
- Signed proof-view URLs

### Deployment

- Vercel
- GitHub

---

## Architecture

```text
                         ┌──────────────────────┐
                         │       Vercel         │
                         │  React + Vite App    │
                         └──────────┬───────────┘
                                    │
                         API Requests / Auth
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Node.js + Express    │
                         │      Backend         │
                         └───────┬──────┬───────┘
                                 │      │
              ┌──────────────────┘      └──────────────────┐
              ▼                                             ▼
     ┌─────────────────┐                           ┌─────────────────┐
     │ Firebase Admin  │                           │   Cloudinary    │
     │ Auth + Firestore│                           │ Winner Proofs   │
     └─────────────────┘                           └─────────────────┘
              ▲
              │
              │
     ┌────────┴────────┐
     │    Firebase     │
     │ Authentication  │
     └─────────────────┘

                         ┌──────────────────────┐
                         │      Razorpay        │
                         │ Subscription + Webhook│
                         └──────────────────────┘
```

---

## Project Structure

```text
Digital-Heroes/
├── components/
├── services/
├── server/
│   ├── routes/
│   ├── services/
│   └── ...
├── public/
├── App.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

> The exact folder structure may evolve as the project is maintained.

---

## Core Business Rules

### Golf Scores

- Valid Stableford score range: **1–45**
- A user can have only one score for a particular date.
- Editing a score for an existing date updates that score.
- Only the latest five scores are retained.
- When a sixth score is added, the oldest score is automatically removed.
- Scores are displayed in reverse chronological order.

### Charity

- Users select a charity during onboarding.
- The contribution percentage starts at a minimum of 10%.
- Users can voluntarily increase their contribution.
- Charity contribution is maintained independently from gameplay results.

### Prize Distribution

The prize pool is distributed across the matching tiers:

| Match | Prize Pool Allocation |
|---|---:|
| 5 numbers | 40% |
| 4 numbers | 35% |
| 3 numbers | 25% |

If multiple users win the same tier, the prize allocated to that tier is divided equally among the winners.

An unclaimed 5-number jackpot rolls over to the following draw.

---

## Subscription Flow

```text
User
  │
  ▼
Select Monthly / Yearly Plan
  │
  ▼
Razorpay Checkout
  │
  ▼
Payment / Subscription
  │
  ▼
Razorpay Webhook
  │
  ▼
Backend Verification
  │
  ▼
Firestore Subscription Status
  │
  ▼
Subscriber Access
```

Subscription lifecycle events are handled through the backend, including activation, successful charges, cancellation, halting, and expiration.

---

## Draw Flow

```text
Configure Draw
      │
      ▼
Generate / Simulate Draw
      │
      ▼
Calculate Matching Winners
      │
      ▼
Calculate Prize Distribution
      │
      ▼
Admin Reviews Simulation
      │
      ▼
Publish Official Draw
      │
      ▼
Create Winner Records
      │
      ▼
Winner Verification
      │
      ▼
Payout Status
```

Published draws use deterministic identifiers and transactional protection to prevent duplicate publication.

---

## Winner Proof Security

Winner proof files are not exposed as permanent public file URLs.

The application:

1. Authenticates the requesting user.
2. Verifies the Firebase ID token on the backend.
3. Checks whether the user is authorized to access the proof.
4. Generates a temporary signed Cloudinary URL.
5. Returns the secure URL to the authorized client.

This prevents unrestricted access to uploaded winner documents.

---

## Environment Variables

Environment variables are required for Firebase, Razorpay, and Cloudinary integration.

Example structure:

```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Razorpay
VITE_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

**Never commit real credentials, private keys, API secrets, or webhook secrets to GitHub.**

A `.env` file should remain local and be included in `.gitignore`.

---

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/ranjanaayush48-netizen/Digital-Heroes.git
cd Digital-Heroes
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create the required environment variables using your local `.env` configuration.

### 4. Start the development server

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

### 6. Type-check the project

```bash
npx tsc --noEmit
```

---

## Testing & Verification

The application was tested across the main subscriber and administrator workflows.

### Authentication

- User registration/login
- Subscriber access
- Administrator access
- Authentication-protected routes and API requests

### Scores

- Valid score submission
- Invalid score rejection
- Duplicate-date update
- Five-score rolling limit
- Reverse chronological ordering

### Subscriptions

- Monthly subscription
- Yearly subscription
- Razorpay checkout
- Subscription status synchronization
- Cancellation lifecycle

### Draw System

- Draw simulation
- Random draw generation
- Score-frequency-weighted draw
- Prize pool calculation
- Winner generation
- Official draw publishing
- Duplicate publication protection
- Jackpot rollover

### Winner Workflow

- Proof upload
- Admin proof review
- Proof approval
- Proof rejection
- Proof resubmission
- Payment status update

### Build Verification

The project was type-checked and production-built during development to verify the application compiles successfully.

---

## Security Considerations

- Firebase Authentication is used for user identity.
- Backend APIs verify Firebase ID tokens.
- Admin functionality is role-restricted.
- Sensitive payment operations are handled server-side.
- Razorpay webhook signatures are verified.
- Cloudinary proof files are accessed through signed URLs.
- Secrets are stored in environment variables rather than source code.
- Firestore access is protected through application authorization and security rules.
- Draw publication uses transactional protection to prevent duplicate official results.

---

## Design Approach

The interface follows an editorial, modern visual direction built around:

- Warm off-white surfaces
- Deep green accents
- Charcoal typography
- Clean cards and spacing
- Subtle motion
- Responsive layouts

The design intentionally avoids traditional golf clichés such as heavy golf-course imagery, plaid patterns, and club-focused visuals. The emphasis is placed on community, charity, participation, and performance.

---

## Deployment

The frontend and production application are deployed through Vercel.

The project is connected to GitHub for source control and deployment workflow.

Before sharing the production URL, verify that the Vercel deployment is publicly accessible and does not require Vercel account authentication.

---

## Project Purpose

Digital Heroes was developed as a full-stack implementation of the provided Digital Heroes product requirements, with emphasis on:

- Requirements interpretation
- Data modelling
- Subscription management
- Secure API design
- Draw and prize calculation
- Charity contribution management
- Winner verification
- Admin workflows
- Production deployment

---

## Author

**Ayush Ranjan**

B.Tech — Cloud Computing & Automation

GitHub:  
https://github.com/ranjanaayush48-netizen

Portfolio:  
https://ayush-ranjan-portfolio-1.ai.studio/

