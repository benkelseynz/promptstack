# PromptStack Codebase Summary

This document explains what every file does and which files to edit for common tasks. Use this as a reference when making changes or troubleshooting issues.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Reference: What to Edit](#quick-reference-what-to-edit)
3. [Backend Files Explained](#backend-files-explained)
4. [Frontend Files Explained](#frontend-files-explained)
5. [Data Files Explained](#data-files-explained)
6. [Common Tasks Guide](#common-tasks-guide)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Stripe Integration Guide](#stripe-integration-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js on Vercel)                 │
│                                                                 │
│  Pages (what users see)          Components (reusable UI)       │
│  ├── Landing page                ├── PromptModal                │
│  ├── Login/Signup                └── (shared UI pieces)         │
│  ├── Dashboard                                                  │
│  └── Settings/Upgrade            Contexts (shared state)        │
│                                  └── AuthContext (login state)  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ API Calls (fetch requests)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Express.js on Railway)               │
│                                                                 │
│  Routes (API endpoints)          Services (business logic)      │
│  ├── /api/auth/*                 ├── userStorage                │
│  ├── /api/library/*              ├── email (Gmail API)          │
│  ├── /api/user/*                 ├── searchIndex                │
│  ├── /api/questions/*            ├── verificationTokens         │
│  ├── /api/stripe/*               └── invoiceGenerator (PDFKit)  │
│  └── /api/config/*                                              │
│                                                                 │
│  Middleware (runs before routes) Schemas (validation)           │
│  ├── auth (check login)          └── validation (Zod rules)     │
│  ├── rateLimiter                                                │
│  └── errorHandler                                               │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    │                           │ Webhooks
                    ▼                           ▼
┌────────────────────────────────┐  ┌──────────────────────────────┐
│      JSON FILE STORAGE         │  │      STRIPE API              │
│                                │  │                              │
│  /data/users/*.json            │  │  Subscription Management     │
│  /data/industries/*.json       │  │  Payment Processing          │
│  /data/questions/*.json        │  │  Customer Portal             │
│  /data/general.json            │  │  Invoice Generation          │
│  /config/pricing.json          │  │  Webhook Events              │
└────────────────────────────────┘  └──────────────────────────────┘
```

---

## Quick Reference: What to Edit

| I want to change...                     | Edit these files                                           |
|-----------------------------------------|-----------------------------------------------------------|
| **Colours/styling**                     | `frontend/src/app/globals.css`, `frontend/tailwind.config.js` |
| **Landing page content**                | `frontend/src/app/page.tsx`                               |
| **Mountain parallax background**        | `frontend/src/components/MountainParallax.tsx`            |
| **Login/signup pages**                  | `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx` |
| **Dashboard layout/sidebar**            | `frontend/src/app/dashboard/layout.tsx`                   |
| **Prompt library page**                 | `frontend/src/app/dashboard/page.tsx`                     |
| **Questions library page**              | `frontend/src/app/dashboard/questions/page.tsx`           |
| **Prompt modal (view/copy prompts)**    | `frontend/src/components/PromptModal.tsx`                 |
| **Saved prompts page**                  | `frontend/src/app/dashboard/saved/page.tsx`               |
| **User profile system**                 | `frontend/src/lib/profileContext.ts`                      |
| **Upgrade/pricing page**                | `frontend/src/app/dashboard/upgrade/page.tsx`             |
| **Subscription success page**           | `frontend/src/app/dashboard/upgrade/success/page.tsx`     |
| **Pricing tiers/prices**                | `backend/config/pricing.json`                             |
| **Stripe integration**                  | `backend/src/routes/stripe.js`                            |
| **Invoice generation**                  | `backend/src/services/invoiceGenerator.js`                |
| **Subscription emails**                 | `backend/src/services/email.js` (subscription functions)  |
| **Cancel subscription modal**           | `frontend/src/components/CancelSubscriptionModal.tsx`     |
| **Add/edit prompts**                    | `backend/data/industries/*.json`, `backend/data/general.json` |
| **Email templates**                     | `backend/src/services/email.js`                           |
| **Authentication logic**                | `backend/src/routes/auth.js`, `backend/src/middleware/auth.js` |
| **Password requirements**               | `backend/src/schemas/validation.js`                       |
| **Rate limiting settings**              | `backend/src/middleware/rateLimiter.js`                   |
| **API endpoints**                       | `backend/src/routes/*.js`                                 |
| **How users are stored**                | `backend/src/services/userStorage.js`                     |
| **Search/filtering logic**              | `backend/src/services/searchIndex.js`                     |
| **Site title/SEO**                      | `frontend/src/app/layout.tsx`                             |

---

## Backend Files Explained

### Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Lists all dependencies (libraries) and defines npm scripts like `npm run dev` |
| `.env` | Your secret configuration (API keys, passwords). Never commit this! |
| `.env.example` | Template showing what environment variables are needed |
| `nodemon.json` | Tells nodemon which folders to watch/ignore during development |

### `/src/index.js` - Main Entry Point

**What it does:** Starts the Express server and connects all the pieces together.

**Key sections:**
- Lines 1-10: Imports all required modules
- Lines 12-20: Security middleware setup (helmet, CORS, rate limiting)
- Lines 22-27: Health check endpoint
- Lines 29-32: Connects all API routes
- Lines 34-40: Error handling
- Lines 42-55: Initialises search index and starts server

**When to edit:** Rarely. Only if adding new route files or changing server configuration.

---

### `/src/routes/` - API Endpoints

These files define what happens when the frontend calls the API.

#### `auth.js` - Authentication Routes

| Endpoint | What it does |
|----------|--------------|
| `POST /api/auth/signup` | Creates new user, sends verification email, returns JWT token |
| `POST /api/auth/login` | Checks password, returns JWT token |
| `POST /api/auth/logout` | Clears the auth cookie |
| `GET /api/auth/verify?token=...` | Verifies email using token from email link |
| `POST /api/auth/resend-verification` | Sends another verification email |
| `GET /api/auth/me` | Returns current logged-in user's info |

**When to edit:** If you want to change what happens during login/signup, add new auth features, or modify the JWT token settings.

#### `library.js` - Prompt Library Routes

| Endpoint | What it does |
|----------|--------------|
| `GET /api/library/industries` | Lists all available industries |
| `GET /api/library/filters` | Returns filter options (industries, roles, categories) |
| `GET /api/library/prompts` | Searches/lists prompts with filters and pagination |
| `GET /api/library/prompts/:id` | Gets a single prompt (gated for premium) |

**When to edit:** If you want to change how search works, add new filters, or modify how premium content is gated.

#### `user.js` - User Data Routes

| Endpoint | What it does |
|----------|--------------|
| `GET /api/user/prompts` | Lists user's custom prompts |
| `POST /api/user/prompts` | Creates a new custom prompt |
| `PUT /api/user/prompts/:id` | Updates a custom prompt |
| `DELETE /api/user/prompts/:id` | Deletes a custom prompt |
| `GET /api/user/saved` | Lists saved library prompts |
| `POST /api/user/saved/:id` | Saves a library prompt |
| `DELETE /api/user/saved/:id` | Removes a saved prompt |

**When to edit:** If you want to change how custom prompts work or add new user features.

#### `config.js` - Configuration Routes

| Endpoint | What it does |
|----------|--------------|
| `GET /api/config/pricing` | Returns pricing tiers from `pricing.json` |

**When to edit:** If you want to add new configuration endpoints.

#### `questions.js` - Questions Library Routes

| Endpoint | What it does |
|----------|--------------|
| `GET /api/questions` | Lists questions with optional category filter |
| `GET /api/questions/:id` | Gets a single question (gated for premium) |

**When to edit:** If you want to change how questions work, add new categories, or modify premium gating.

#### `stripe.js` - Stripe Subscription Routes

| Endpoint | What it does |
|----------|--------------|
| `POST /api/stripe/create-checkout-session` | Creates Stripe checkout session for subscription |
| `GET /api/stripe/subscription` | Gets current user's subscription status |
| `POST /api/stripe/create-portal-session` | Creates Stripe customer portal session |
| `POST /api/stripe/verify-session` | Verifies checkout session completion (fallback) |
| `POST /api/stripe/cancel-subscription` | Schedules subscription cancellation at period end |
| `POST /api/stripe/reactivate-subscription` | Reactivates a cancelled subscription before period ends |
| `POST /api/stripe/webhook` | Handles Stripe webhook events (subscription lifecycle) |

**When to edit:** If you want to change subscription behavior, add new pricing tiers, modify cancellation flow, or handle new Stripe events.

**Webhook Events Handled:**
- `checkout.session.completed` - Updates user tier, sends welcome email with invoice
- `customer.subscription.updated` - Updates tier, handles reactivation
- `customer.subscription.deleted` - Downgrades to free tier
- `invoice.payment_succeeded` - Sends monthly invoice emails
- `invoice.payment_failed` - Sends payment failure notifications

---

### `/src/middleware/` - Request Processing

Middleware runs BEFORE your route handlers. Think of them as security checkpoints.

#### `auth.js` - Authentication Middleware

| Function | What it does |
|----------|--------------|
| `authenticate` | Checks if user is logged in (required for protected routes) |
| `optionalAuth` | Checks login but doesn't fail if not logged in |
| `requireVerified` | Ensures user has verified their email |

**When to edit:** If you want to change how authentication works or add new auth checks.

#### `rateLimiter.js` - Rate Limiting

Prevents abuse by limiting how many requests someone can make.

| Limiter | Settings |
|---------|----------|
| `globalRateLimiter` | 100 requests per 15 minutes (all endpoints) |
| `authRateLimiter` | 5 attempts per 15 minutes (login/signup) |
| `signupRateLimiter` | 3 signups per hour |
| `resendRateLimiter` | 2 resend requests per 5 minutes |

**When to edit:** If you want to adjust rate limits (stricter or more lenient).

#### `errorHandler.js` - Error Handling

Catches all errors and returns user-friendly error messages.

**When to edit:** If you want to change error message format or add special error handling.

---

### `/src/services/` - Business Logic

These files contain the core application logic.

#### `email.js` - Email Sending (Gmail API)

| Function | What it does |
|----------|--------------|
| `createGmailClient()` | Sets up Gmail API with OAuth credentials |
| `createEmail()` | Formats email for Gmail API (supports attachments) |
| `sendEmail()` | Sends an email via Gmail API |
| `sendVerificationEmail()` | Sends the "verify your email" email |
| `sendWelcomeEmail()` | Sends the "welcome" email after verification |
| `sendSubscriptionWelcomeEmail()` | Sends subscription confirmation with PDF invoice |
| `sendMonthlyInvoiceEmail()` | Sends monthly invoice emails with PDF attachment |
| `sendCancellationEmail()` | Sends subscription cancellation confirmation |
| `sendPaymentFailedEmail()` | Sends payment failure notification |

**When to edit:** If you want to change email templates, add new email types, or modify email sending logic.

**Email Features:**
- Multi-part MIME (HTML + plain text)
- PDF invoice attachments
- Kiwi-themed messaging ("Kia ora", "Sweet as, mate")
- Professional HTML templates with inline styling

#### `gmail-setup.js` - Gmail OAuth Setup Script

Run this to get your Gmail refresh token. Not used during normal operation.

**When to edit:** Rarely. Only if Google changes their OAuth flow.

#### `invoiceGenerator.js` - PDF Invoice Generation

| Function | What it does |
|----------|--------------|
| `generateInvoiceNumber()` | Creates unique invoice numbers (INV-YYYYMM-XXXX format) |
| `formatCurrency()` | Formats numbers as NZD currency |
| `calculateGST()` | Calculates 15% GST for New Zealand |
| `generateInvoicePDF()` | Generates complete invoice PDF using PDFKit |

**When to edit:** If you want to change invoice layout, add company branding, modify GST calculation, or change invoice numbering.

**Invoice Features:**
- Professional layout with company branding
- Customer and company details sections
- Line items with descriptions and amounts
- GST calculation (15% for NZ)
- Subtotal and total with GST breakdown
- Invoice numbering system
- "PAID" status indicator
- PDF generation using PDFKit

#### `userStorage.js` - User Data Management

| Function | What it does |
|----------|--------------|
| `createUser()` | Creates new user and their JSON file |
| `getUserById()` / `getUserByEmail()` | Retrieves user data |
| `updateUser()` | Updates user profile |
| `verifyPassword()` | Checks if password is correct |
| `markEmailVerified()` | Sets emailVerified to true |
| `addCustomPrompt()` / `updateCustomPrompt()` / `deleteCustomPrompt()` | Manages custom prompts |
| `saveLibraryPrompt()` / `removeSavedPrompt()` | Manages saved prompts |
| `updateUserTier()` | Updates user's subscription tier |
| `updateStripeCustomer()` | Stores Stripe customer ID and subscription details |
| `cancelSubscription()` | Marks subscription as cancelled with end date |
| `reactivateSubscription()` | Removes cancellation flags |
| `getProfile()` / `updateProfile()` | Manages user profile sections |
| `getProfileStatus()` | Calculates profile completion status |

**When to edit:** If you want to add new user fields, change how users are stored, or modify user-related features.

#### `verificationTokens.js` - Email Verification

| Function | What it does |
|----------|--------------|
| `generateToken()` | Creates a random verification token |
| `hashToken()` | Hashes token for secure storage |
| `createVerificationToken()` | Creates and stores a new token |
| `verifyToken()` | Validates and consumes a token (one-time use) |
| `cleanupExpiredTokens()` | Removes old tokens |

**When to edit:** If you want to change token expiry time (currently 24 hours) or token format.

#### `searchIndex.js` - Prompt Library Search

| Function | What it does |
|----------|--------------|
| `extractPlaceholders()` | Finds `[Placeholder]` patterns in prompts |
| `generatePreview()` | Creates preview text for prompts |
| `loadIndustryFile()` | Loads an industry JSON file |
| `buildSearchIndex()` | Builds in-memory search index on startup |
| `initSearchIndex()` | Initialises the search index |
| `watchForChanges()` | Refreshes index periodically in dev mode |
| `searchPrompts()` | Searches prompts with filters |
| `getPromptById()` | Gets a single prompt |
| `applyPremiumGating()` | Hides premium content for free users |

**When to edit:** If you want to change search behavior, add new filters, or modify how premium gating works.

#### `fileStorage.js` - File System Utilities

| Function | What it does |
|----------|--------------|
| `ensureDirectories()` | Creates required folders if they don't exist |
| `isValidUserId()` | Validates UUID format |
| `getUserFilePath()` | Gets safe file path for user data |
| `atomicWrite()` | Writes files safely (prevents corruption) |
| `readJsonFile()` | Reads and parses JSON files |
| `fileExists()` | Checks if file exists |
| `listFiles()` | Lists files in a directory |

**When to edit:** Rarely. Only if changing how files are stored.

---

### `/src/schemas/validation.js` - Input Validation

Defines rules for validating user input using Zod.

| Schema | What it validates |
|--------|-------------------|
| `signupSchema` | Email, password (8+ chars, uppercase, lowercase, number), name |
| `loginSchema` | Email, password |
| `resendVerificationSchema` | Email |
| `createPromptSchema` | Title, content, keywords for custom prompts |
| `updatePromptSchema` | Same as create but all fields optional |
| `searchQuerySchema` | Search filters and pagination |

**When to edit:** If you want to change password requirements, add new form fields, or modify validation rules.

---

## Frontend Files Explained

### Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Dependencies and npm scripts |
| `.env.local` | Environment variables (API URL) |
| `next.config.js` | Next.js configuration |
| `tailwind.config.js` | Tailwind CSS customisation (colours, fonts) |
| `tsconfig.json` | TypeScript configuration |
| `postcss.config.js` | CSS processing configuration |

---

### `/src/app/` - Pages

Next.js uses file-based routing. Each folder = a URL path.

| File/Folder | URL | What it shows |
|-------------|-----|---------------|
| `page.tsx` | `/` | Landing page (marketing page) |
| `layout.tsx` | All pages | Root layout, meta tags, AuthProvider |
| `globals.css` | All pages | Global styles and Tailwind imports |
| `login/page.tsx` | `/login` | Login form |
| `signup/page.tsx` | `/signup` | Signup form |
| `verify/page.tsx` | `/verify?token=...` | Email verification page |
| `dashboard/layout.tsx` | `/dashboard/*` | Dashboard sidebar and layout |
| `dashboard/page.tsx` | `/dashboard` | Prompt library with search |
| `dashboard/questions/page.tsx` | `/dashboard/questions` | Curated questions library |
| `dashboard/saved/page.tsx` | `/dashboard/saved` | Saved and custom prompts |
| `dashboard/upgrade/page.tsx` | `/dashboard/upgrade` | Pricing/upgrade page with Stripe integration |
| `dashboard/upgrade/success/page.tsx` | `/dashboard/upgrade/success` | Subscription success confirmation |
| `dashboard/builder/page.tsx` | `/dashboard/builder` | Prompt builder (coming soon) |
| `dashboard/team/page.tsx` | `/dashboard/team` | Team features (coming soon) |

---

### `/src/app/globals.css` - Styles

**Design System:** Winter Ice / Alpine Minimal palette - premium, calm, high-contrast theme

**Key sections:**

```css
/* Lines 1-3: Tailwind imports */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Lines 5-6: Google Fonts import (Inter) */

/* Lines 8-19: CSS variables */
:root {
  --foreground-rgb: Dark gray for readability
  --background-start-rgb: Snow (#F9FBFD)
  --background-end-rgb: Ice-200 (#E0EEF7)
  --alpine-navy: Alpine-800 for headings
  --mountain-layer-1 to 5: Parallax background colors
}

/* Lines 30-76: Component classes */
.btn-primary, .btn-secondary, .btn-outline
.input-field, .card
.glass-card: Glassmorphism with blur and transparency
.glass-card-dark: Dark glassmorphism for quote sections
.sidebar-link, .sidebar-link-active

/* Lines 78-91: Scrollbar styling */

/* Lines 93-108: Scroll snap utilities */
```

**When to edit:** To change button styles, card styles, glassmorphism effects, or add new CSS classes.

---

### `/src/app/layout.tsx` - Root Layout

Sets up the HTML structure for all pages.

**Key parts:**
- `metadata`: Page title and SEO description
- `AuthProvider`: Wraps app to provide login state everywhere

**When to edit:** To change the site title, meta description, or add global providers.

---

### `/src/components/` - Reusable Components

#### `PromptModal.tsx` - Prompt View Modal

The popup that appears when you click on a prompt.

**Key features:**
- Shows prompt content (or preview if locked)
- Placeholder input fields for free prompts
- **Profile Context Injection**: Automatically appends user profile context when copying (if prompt has contextTags)
- Copy and "Copy Populated" buttons
- Save/unsave button
- "Personalised" indicator for prompts with profile context
- Upgrade CTA for locked prompts

**When to edit:** To change how prompts are displayed, modify copy functionality, change personalisation logic, or change the upgrade messaging.

#### `ProfileReminder.tsx` - Profile Completion Prompt

Encourages users to complete their profile for personalised prompts.

**Key features:**
- "Welcome" variant: Large card on dashboard
- "Banner" variant: Compact reminder on other pages
- Shows completion percentage
- Links to settings page

**When to edit:** To change profile completion messaging or styling.

#### `MountainParallax.tsx` - Landing Page Background

Alpine-themed parallax background with layered mountains.

**Key features:**
- Fixed position background spanning entire page
- 5 mountain layers with parallax scroll effect
- Uses CSS variables for colors (--mountain-layer-1 to 5)
- Subtle animation for depth

**When to edit:** To change mountain layer colors, parallax speed, or add/remove layers.

#### `CancelSubscriptionModal.tsx` - Subscription Cancellation

Modal for handling subscription cancellations.

**Key features:**
- Confirmation dialog for cancellation
- Shows when access will end (end of billing period)
- Integrates with Stripe cancellation API
- Handles cancellation feedback
- Provides option to keep subscription

**When to edit:** To change cancellation messaging, add retention offers, or modify cancellation flow.

---

### `/src/contexts/AuthContext.tsx` - Authentication State

Manages login state across the entire app.

**What it provides:**
- `user`: Current logged-in user (or null)
- `loading`: Whether auth check is in progress
- `login()`: Function to log in
- `signup()`: Function to sign up
- `logout()`: Function to log out
- `refreshUser()`: Function to reload user data

**When to edit:** To add new auth-related state or functions.

---

### `/src/lib/api.ts` - API Client

All API calls go through this file.

**Key sections:**
- Token management (storing/retrieving JWT)
- Generic `request()` method for API calls
- Auth methods: `signup()`, `login()`, `logout()`, `getMe()`, `verifyEmail()`, `resendVerification()`
- Library methods: `getIndustries()`, `getFilters()`, `searchPrompts()`, `getPrompt()`
- Questions methods: `getQuestions()`, `getQuestion()`
- User methods: `getUserPrompts()`, `createUserPrompt()`, `updateUserPrompt()`, `deleteUserPrompt()`, `getSavedPrompts()`, `savePrompt()`, `removeSavedPrompt()`
- Profile methods: `getProfile()`, `getProfileStatus()`, `updateProfile()`
- Stripe methods: `createCheckoutSession()`, `getSubscription()`, `createPortalSession()`, `verifySession()`, `cancelSubscription()`, `reactivateSubscription()`
- Config methods: `getPricing()`

**When to edit:** When adding new API endpoints or changing how API calls are made.

---

### `/src/types/index.ts` - TypeScript Types

Defines the shape of data used throughout the app.

**Types defined:**
- `User`: User profile data
- `Prompt`: Library prompt (now includes `contextTags` for personalisation)
- `CustomPrompt`: User-created prompt
- `Industry`: Industry metadata
- `PricingTier` / `PricingConfig`: Pricing data
- `FilterOptions`: Available filters
- `SearchQuery`: Search parameters
- `PaginatedResponse`: Paginated results
- `ApiError`: Error response format
- **Profile Types**: `UserProfile`, `ProfileRole`, `ProfileCommunication`, `ProfileWritingStyle`, `ProfileWorkingStyle`, `ProfileFormatting`, `ProfilePersonal`, `ProfileStatus`, `ProfileSection`
- **Questions Types**: `Question`, `QuestionCategory`

**When to edit:** When adding new data fields or changing data structures.

---

### `/public/` - Static Assets

| File | Purpose |
|------|---------|
| `logo.svg` | Site logo (placeholder) |

**When to edit:** Replace `logo.svg` with your actual logo.

---

## Data Files Explained

### `/backend/data/industries/*.json` - Industry Prompts

Each file represents one industry. Adding a new file automatically adds a new industry.

**Structure:**
```json
{
  "name": "Industry Display Name",
  "description": "Description shown in UI",
  "icon": "icon-name",
  "roles": ["Role 1", "Role 2"],
  "categories": ["Category 1", "Category 2"],
  "prompts": [
    {
      "id": "unique-id",
      "title": "Prompt Title",
      "content": "Full prompt with [Placeholders]",
      "access": "free",        // or "premium"
      "role": "Role 1",
      "category": "Category 1",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

**When to edit:** To add, modify, or remove prompts.

### `/backend/data/general.json` - General Prompts

Same structure as industry files but for prompts not specific to any industry.

### `/backend/data/users/*.json` - User Data

One file per user (named by UUID). Created automatically on signup.

**Structure:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "passwordHash": "hashed-password",
  "emailVerified": true,
  "tier": "free",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "customPrompts": [],
  "savedPrompts": [],
  "stripeCustomerId": "cus_xxx",
  "stripeSubscriptionId": "sub_xxx",
  "subscriptionStartDate": "2024-01-01T00:00:00.000Z",
  "subscriptionCancelledAt": "2024-01-31T00:00:00.000Z",
  "subscriptionEndsAt": "2024-02-01T00:00:00.000Z",
  "profile": {
    "completed": false,
    "completedAt": null,
    "sectionsCompleted": [],
    "role": {},
    "communication": {},
    "writingStyle": {},
    "workingStyle": {},
    "formatting": {},
    "personal": {}
  }
}
```

**When to edit:** Generally don't edit manually. These are managed by the app.

### `/backend/config/pricing.json` - Pricing Configuration

**Structure:**
```json
{
  "currency": "NZD",
  "currencySymbol": "$",
  "tiers": [
    {
      "id": "free",
      "name": "Free",
      "monthlyPrice": 0,
      "features": ["Feature 1", "Feature 2"],
      "limitations": ["Limitation 1"]
    },
    {
      "id": "professional",
      "name": "Professional",
      "monthlyPrice": 29,
      "stripePriceId": "price_xxx",  // Stripe price ID for checkout
      "originalPrice": 39,
      "discount": {
        "percentage": 25,
        "validUntil": "2025-03-31",
        "label": "Launch Special"
      },
      "features": ["Feature 1", "Feature 2"],
      "highlighted": true,
      "badge": "Most Popular"
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "monthlyPrice": 99,
      "stripePriceId": "price_yyy",
      "features": ["Feature 1", "Feature 2", "API Access", "SSO"],
      "badge": "For Teams"
    }
  ],
  "annualDiscount": 20,
  "trialDays": 14,
  "refundPolicy": "30-day money-back guarantee"
}
```

**When to edit:** To change prices, features, add/remove tiers, or update Stripe price IDs.

---

## Common Tasks Guide

### Adding a New Industry

1. Create new file: `backend/data/industries/your-industry.json`
2. Follow the structure from existing industry files
3. Restart backend (or wait 30 seconds in dev mode)
4. The new industry appears automatically!

### Adding New Prompts to an Industry

1. Open `backend/data/industries/[industry].json`
2. Add new prompt object to the `prompts` array
3. Make sure to give it a unique `id`
4. Set `access` to `"free"` or `"premium"`

### Changing Colours

**Current Theme:** Winter Ice / Alpine Minimal

1. Open `frontend/tailwind.config.js`
2. Find the `colors` section under `extend`
3. Color palettes available:
   - **primary**: Snow/frost/ice backgrounds → steel/glacier blues → alpine navy
   - **accent**: Arctic teal for CTA buttons and primary actions
   - **nebula**: Periwinkle for restrained accents
   - **cosmos**: Foundation colors (snow, frost, ice) and dark alpines
4. The app uses Tailwind classes like `bg-primary-600`, `text-primary-700`
5. Update CSS variables in `globals.css` `:root` for mountain parallax colors

### Changing Button Styles

1. Open `frontend/src/app/globals.css`
2. Find `.btn-primary`, `.btn-secondary`, `.btn-outline`
3. Modify the Tailwind classes

### Modifying the Sidebar

1. Open `frontend/src/app/dashboard/layout.tsx`
2. Find the `navigation` array near the top (around line 25)
3. Current navigation items:
   - Prompt Library
   - Questions Library
   - My Saved Prompts
   - Upgrade (shows subscription status when user is subscribed)
   - Prompt Builder (coming soon)
   - Team Features (coming soon)
4. Add/remove/modify navigation items
5. Each item has: `name`, `href`, `icon`, and optional `comingSoon`
6. Upgrade section dynamically shows subscription status and manage subscription button

### Changing Email Templates

1. Open `backend/src/services/email.js`
2. Find `sendVerificationEmail()` or `sendWelcomeEmail()`
3. Modify the HTML in `htmlContent` and text in `textContent`

### Changing Password Requirements

1. Open `backend/src/schemas/validation.js`
2. Find `signupSchema`
3. Modify the `password` validation rules

### Adding a New API Endpoint

1. Decide which route file it belongs in (`auth.js`, `library.js`, `user.js`, or create new)
2. Add the route handler
3. If it needs auth, use `authenticate` middleware
4. If you create a new route file, import and use it in `src/index.js`

### Adding a New Page

1. Create new folder in `frontend/src/app/` (folder name = URL path)
2. Create `page.tsx` inside with your component
3. If it needs auth, put it under `dashboard/` to use the dashboard layout

### Managing Stripe Subscriptions

#### Setting Up Stripe Integration
1. Create products and prices in Stripe dashboard
2. Copy price IDs to `backend/config/pricing.json` (stripePriceId field)
3. Set up webhook endpoint in Stripe dashboard: `https://your-backend.railway.app/api/stripe/webhook`
4. Add webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`
5. Configure required environment variables:
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Webhook signing secret
   - `STRIPE_MODE` - `test` or `live`

#### Testing Subscriptions Locally
1. Use Stripe CLI to forward webhooks: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
2. Use test cards from Stripe documentation
3. Verify webhook events are received in terminal
4. Check email service sends invoices correctly

#### Adding a New Pricing Tier
1. Create product and price in Stripe dashboard
2. Add tier to `backend/config/pricing.json` with stripePriceId
3. Update frontend upgrade page to display new tier
4. Update premium gating logic if needed

#### Changing Invoice Design
1. Open `backend/src/services/invoiceGenerator.js`
2. Modify PDF layout in `generateInvoicePDF()` function
3. Test by triggering a subscription or using the function directly
4. PDFs are automatically attached to subscription emails

---

## Troubleshooting Guide

### Authentication Issues

**Files to check:**
- `backend/src/routes/auth.js` - Login/signup logic
- `backend/src/middleware/auth.js` - Token verification
- `backend/src/services/userStorage.js` - User data management
- `frontend/src/contexts/AuthContext.tsx` - Frontend auth state
- `frontend/src/lib/api.ts` - API calls and token storage

**Common issues:**
- "Invalid token" → JWT_SECRET changed or token expired
- "User not found" → Check user file exists in `data/users/`
- "Authentication required" → Token not being sent with request

### Email Not Sending

**Files to check:**
- `backend/src/services/email.js` - Email sending logic
- `backend/.env` - Gmail API credentials

**Common issues:**
- Check `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` are set
- Refresh token may have expired (re-run gmail-setup.js)
- Check Railway/terminal logs for error messages

### Prompts Not Appearing

**Files to check:**
- `backend/data/industries/*.json` - Prompt data
- `backend/src/services/searchIndex.js` - Search indexing

**Common issues:**
- Invalid JSON syntax in prompt files
- Missing required fields (id, title, content, access)
- Check backend logs for "Search index built: X prompts"

### Styling Not Applying

**Files to check:**
- `frontend/src/app/globals.css` - Global styles
- `frontend/tailwind.config.js` - Tailwind configuration

**Common issues:**
- Tailwind class not in safelist
- CSS specificity issues
- Browser caching (hard refresh with Cmd+Shift+R)

### CORS Errors

**Files to check:**
- `backend/src/index.js` - CORS configuration
- `backend/.env` - CORS_ORIGIN setting

**Common issues:**
- CORS_ORIGIN doesn't match frontend URL exactly
- Missing `https://` or has trailing slash

### Rate Limiting Issues

**Files to check:**
- `backend/src/middleware/rateLimiter.js` - Rate limit settings

**To temporarily disable for testing:**
Comment out rate limiters in `backend/src/routes/auth.js`

### Stripe/Payment Issues

**Files to check:**
- `backend/src/routes/stripe.js` - Stripe integration logic
- `backend/config/pricing.json` - Price IDs and tier configuration
- `backend/.env` - Stripe API keys and webhook secret

**Common issues:**
- Webhook signature verification fails → Check STRIPE_WEBHOOK_SECRET matches Stripe dashboard
- Checkout session not creating → Verify stripePriceId in pricing.json matches Stripe dashboard
- User tier not updating → Check webhook events in Stripe dashboard, verify Railway logs
- Invoice not generating → Check PDFKit installation, verify generateInvoicePDF() function
- Emails not sending invoices → Check Gmail API credentials, verify attachment encoding

**Testing webhooks:**
- Use Stripe CLI: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
- Check Railway logs for webhook events in production
- Verify webhook endpoint in Stripe dashboard is correct

### Invoice Generation Issues

**Files to check:**
- `backend/src/services/invoiceGenerator.js` - PDF generation
- `backend/src/services/email.js` - Email with attachments

**Common issues:**
- PDF not generating → Check PDFKit dependency installed
- Invoice formatting wrong → Modify generateInvoicePDF() layout
- GST calculation incorrect → Verify calculateGST() returns 15%
- Invoice number collision → Check generateInvoiceNumber() logic

---

## Environment Variables Reference

### Backend (.env)

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `JWT_SECRET` | Secret for signing tokens | Random 64-char string |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `GOOGLE_CLIENT_ID` | Gmail OAuth client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth secret | From Google Cloud Console |
| `GOOGLE_REFRESH_TOKEN` | Gmail OAuth refresh token | From gmail-setup.js |
| `EMAIL_FROM` | Sender email address | `promptstackhello@gmail.com` |
| `FRONTEND_URL` | Frontend URL for email links | `http://localhost:3000` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Stripe API secret key | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `STRIPE_MODE` | Stripe mode (test or live) | `test` or `live` |

### Frontend (.env.local)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |

---

## File Modification Checklist

Before making changes, use this checklist:

- [ ] Identify which file(s) need editing using this guide
- [ ] Make a backup or commit current changes to Git
- [ ] Make your changes
- [ ] Test locally (both frontend and backend running)
- [ ] Check browser console for errors
- [ ] Check terminal for backend errors
- [ ] Commit and push to deploy

---

## Stripe Integration Guide

### Overview

PromptStack uses Stripe for subscription management, payment processing, and invoice generation. The integration handles the complete subscription lifecycle from checkout to cancellation.

### Architecture

```
User clicks "Subscribe"
    → Frontend calls createCheckoutSession()
    → Backend creates Stripe checkout session with price ID
    → User redirected to Stripe-hosted checkout
    → User completes payment
    → Stripe sends webhook to /api/stripe/webhook
    → Webhook handler updates user tier in database
    → Welcome email sent with PDF invoice
    → User redirected to success page
```

### Key Components

#### 1. Checkout Flow
- **Frontend**: `frontend/src/app/dashboard/upgrade/page.tsx`
  - Displays pricing tiers from `pricing.json`
  - "Subscribe" button calls `api.createCheckoutSession(tierId)`
  - Redirects to Stripe-hosted checkout page

- **Backend**: `backend/src/routes/stripe.js` → `POST /api/stripe/create-checkout-session`
  - Validates user authentication
  - Retrieves price ID from `pricing.json`
  - Creates Stripe checkout session with:
    - `mode: 'subscription'`
    - `success_url` and `cancel_url`
    - Customer email pre-filled
    - Metadata: userId, tier
  - Returns session URL for redirect

#### 2. Webhook Processing
- **Endpoint**: `POST /api/stripe/webhook`
- **Security**: Verifies webhook signature using `STRIPE_WEBHOOK_SECRET`
- **Events Handled**:

  | Event | Action |
  |-------|--------|
  | `checkout.session.completed` | Create/update Stripe customer, update user tier, send welcome email with invoice |
  | `customer.subscription.updated` | Update user tier, handle reactivation |
  | `customer.subscription.deleted` | Downgrade to free tier, remove subscription data |
  | `invoice.payment_succeeded` | Send monthly invoice email with PDF |
  | `invoice.payment_failed` | Send payment failure notification |

#### 3. Invoice Generation
- **Service**: `backend/src/services/invoiceGenerator.js`
- **Function**: `generateInvoicePDF(invoiceData)`
- **Features**:
  - Professional PDF layout using PDFKit
  - Company branding and logo space
  - Customer details section
  - Line items with descriptions
  - GST calculation (15% for NZ)
  - Subtotal, GST, and total breakdown
  - Invoice number format: `INV-YYYYMM-XXXX`
  - "PAID" status indicator

- **Integration**:
  - Called during subscription events
  - PDF buffer attached to emails
  - Base64 encoded for Gmail API

#### 4. Subscription Management
- **View Status**: `GET /api/stripe/subscription`
  - Returns current subscription details
  - Shows cancellation status and end date
  - Includes Stripe customer ID

- **Cancel**: `POST /api/stripe/cancel-subscription`
  - Schedules cancellation at period end
  - User keeps access until `subscriptionEndsAt`
  - Updates user record with `subscriptionCancelledAt`
  - Sends cancellation confirmation email

- **Reactivate**: `POST /api/stripe/reactivate-subscription`
  - Removes cancellation schedule
  - Restores subscription to active
  - Clears `subscriptionCancelledAt` and `subscriptionEndsAt`

- **Customer Portal**: `POST /api/stripe/create-portal-session`
  - Creates Stripe customer portal session
  - Redirects to Stripe-hosted portal
  - Users can manage payment methods, view invoices

#### 5. Email Integration
- **Service**: `backend/src/services/email.js`
- **Subscription Emails**:

  | Function | When Sent | Includes |
  |----------|-----------|----------|
  | `sendSubscriptionWelcomeEmail()` | First subscription | PDF invoice, welcome message |
  | `sendMonthlyInvoiceEmail()` | Monthly billing | PDF invoice, payment confirmation |
  | `sendCancellationEmail()` | User cancels | Cancellation confirmation, end date |
  | `sendPaymentFailedEmail()` | Payment fails | Failure notification, action required |

- **Email Features**:
  - Multi-part MIME (HTML + plain text)
  - PDF invoice attachments (base64 encoded)
  - Kiwi-themed messaging
  - Professional HTML templates

### Configuration

#### Environment Variables
```bash
# Backend .env
STRIPE_SECRET_KEY=sk_test_...  # or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MODE=test  # or live
```

#### Pricing Configuration
**File**: `backend/config/pricing.json`

```json
{
  "tiers": [
    {
      "id": "professional",
      "stripePriceId": "price_xxx",  // From Stripe dashboard
      "monthlyPrice": 29,
      // ... other fields
    }
  ]
}
```

### Setup Instructions

#### 1. Stripe Dashboard Setup
1. Create products in Stripe dashboard:
   - Professional ($29 NZD/month)
   - Enterprise ($99 NZD/month)
2. Create recurring prices for each product
3. Copy price IDs (e.g., `price_1234abcd`)
4. Add price IDs to `backend/config/pricing.json`

#### 2. Webhook Configuration
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend.railway.app/api/stripe/webhook`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret
5. Add to `.env` as `STRIPE_WEBHOOK_SECRET`

#### 3. Testing Locally
1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3001/api/stripe/webhook`
4. Use test cards from [Stripe Testing](https://stripe.com/docs/testing)
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
5. Monitor webhook events in terminal

#### 4. Going Live
1. Switch Stripe API keys to live mode
2. Update `STRIPE_SECRET_KEY` with `sk_live_...`
3. Update `STRIPE_MODE=live` in `.env`
4. Verify webhook endpoint in production
5. Test with real payment (small amount)
6. Set up Stripe Radar for fraud prevention

### Sandbox Mode

The codebase supports Stripe sandbox mode for testing:
- Set `STRIPE_MODE=test` in `.env`
- Use test API keys (`sk_test_...`)
- Use test price IDs
- All webhooks work in test mode
- No real charges are made

### Common Issues

#### Webhook Not Receiving Events
- Verify webhook endpoint URL is correct
- Check `STRIPE_WEBHOOK_SECRET` matches dashboard
- Ensure Railway app is deployed and running
- Check Stripe dashboard webhook logs for errors

#### User Tier Not Updating
- Verify webhook events are being received (check logs)
- Confirm `userId` is in checkout session metadata
- Check user exists in database
- Verify `updateUserTier()` function is working

#### Invoice Not Generating
- Ensure PDFKit is installed: `npm install pdfkit`
- Check `generateInvoicePDF()` function for errors
- Verify invoice data structure is correct
- Test PDF generation in isolation

#### Email Not Sending Invoice
- Verify Gmail API credentials are correct
- Check PDF is being generated successfully
- Ensure base64 encoding is correct
- Test email without attachment first

### Advanced Features

#### Proration
Stripe automatically handles proration when:
- User upgrades mid-cycle (prorated credit)
- User downgrades mid-cycle (prorated refund)

#### Trial Periods
Can be configured in Stripe checkout session:
```javascript
subscription_data: {
  trial_period_days: 14
}
```

#### Coupons and Discounts
Apply in pricing.json and checkout session:
```javascript
discounts: [{
  coupon: 'LAUNCH25'
}]
```

### Security Considerations

1. **Webhook Signature Verification**: Always verify webhook signatures
2. **Price Validation**: Validate price IDs against pricing.json
3. **Idempotency**: Stripe webhooks may send duplicates, handle gracefully
4. **Error Handling**: Log all errors but don't expose details to users
5. **Access Control**: Verify user owns subscription before allowing changes

### Monitoring

#### Key Metrics to Track
- Successful checkout conversions
- Failed payment attempts
- Cancellation rate and reasons
- Average subscription lifetime
- Monthly recurring revenue (MRR)

#### Stripe Dashboard
- Monitor webhook delivery success rate
- Review failed payments
- Check subscription status
- Export customer data

#### Application Logs
- Log all webhook events (Railway logs)
- Track subscription state changes
- Monitor email delivery
- Alert on invoice generation failures

---

## Recent Major Changes (January 2025)

### Stripe Payment Integration (MAJOR UPDATE)
- **Full subscription management system** with 3 pricing tiers (Free, Professional $29 NZD, Enterprise $99 NZD)
- **Stripe checkout integration** - Seamless subscription flow with `createCheckoutSession()`
- **Webhook event handling** - Automated tier updates via 5 webhook events:
  - `checkout.session.completed` - Initial subscription activation
  - `customer.subscription.updated` - Tier changes and reactivations
  - `customer.subscription.deleted` - Automatic downgrade to free
  - `invoice.payment_succeeded` - Monthly invoice emails
  - `invoice.payment_failed` - Payment failure notifications
- **Subscription lifecycle management**:
  - Scheduled cancellation (access until period end)
  - Reactivation support before period ends
  - Stripe customer portal integration for self-service management
- **PDF invoice generation** using PDFKit:
  - Professional invoice layout with company branding
  - GST calculation (15% for NZ)
  - Invoice numbering system (INV-YYYYMM-XXXX)
  - Automatic email delivery with PDF attachments
- **Enhanced email system**:
  - Subscription welcome emails with first invoice
  - Monthly invoice emails with PDF attachments
  - Cancellation confirmations
  - Payment failure notifications
  - Kiwi-themed messaging throughout
- **New components**:
  - `CancelSubscriptionModal` - Graceful cancellation flow
  - Subscription success page (`/dashboard/upgrade/success`)
  - Dynamic subscription status in sidebar
- **Files added**:
  - `backend/src/routes/stripe.js` (1084 lines) - Complete Stripe integration
  - `backend/src/services/invoiceGenerator.js` - PDF invoice generation
- **User model extended** with Stripe fields:
  - `stripeCustomerId`, `stripeSubscriptionId`
  - `subscriptionStartDate`, `subscriptionCancelledAt`, `subscriptionEndsAt`

### Email System Enhancements
- **Multi-part MIME support** - HTML + plain text versions
- **PDF attachment support** - Base64 encoding for Gmail API
- **4 new email types**:
  - `sendSubscriptionWelcomeEmail()` - Welcome with first invoice
  - `sendMonthlyInvoiceEmail()` - Recurring invoice delivery
  - `sendCancellationEmail()` - Subscription cancellation confirmation
  - `sendPaymentFailedEmail()` - Payment failure alerts
- **Professional templates** with inline CSS styling
- **Kiwi branding** - "Kia ora", "Sweet as, mate" messaging

### Profile Personalisation System (Previously Added)
- Users can complete multi-section profile (role, communication, writing style, working style, formatting, personal)
- Prompts with `contextTags` automatically inject relevant profile context when copied
- Profile completion percentage tracking
- `ProfileReminder` component encourages completion
- See `types/index.ts` for profile types

### Questions Library (Previously Added)
- New `/dashboard/questions` page for curated question library
- 5 categories: Deepen Understanding, Challenge & Improve, Expand Thinking, Quality Check, Make It Practical
- Category-based filtering
- Free/premium gating
- Helps users get better outputs from AI tools

### Design System Overhaul (Previously Added)
- **New Color Scheme**: Winter Ice / Alpine Minimal palette
  - Primary: Snow, frost, ice backgrounds → alpine navy anchors
  - Accent: Arctic teal for CTAs
  - Nebula: Periwinkle for restrained accents
- **MountainParallax Component**: Alpine-themed parallax background
- **Glassmorphism**: New `.glass-card` and `.glass-card-dark` styles
- Continuous scrolling landing page

### Technical Improvements
- Click-based sorting in prompt library (localStorage tracking)
- Combined library + custom prompts with unified search
- Request ID tracking to prevent stale API responses
- Profile context injection via `buildContextString()` helper
- Sandbox mode support for Stripe testing
- Comprehensive error handling for payment flows
- Webhook signature verification for security

### Infrastructure Updates
- Railway deployment with webhook endpoint support
- Stripe webhook endpoint: `/api/stripe/webhook`
- PDFKit dependency for invoice generation
- Enhanced user storage with subscription data persistence

---

*Last updated: January 2025*
