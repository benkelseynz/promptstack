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
│  └── /api/config/*               └── verificationTokens         │
│                                                                 │
│  Middleware (runs before routes) Schemas (validation)           │
│  ├── auth (check login)          └── validation (Zod rules)     │
│  ├── rateLimiter                                                │
│  └── errorHandler                                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        JSON FILE STORAGE                        │
│                                                                 │
│  /data/users/*.json         One file per user (profile, prompts)│
│  /data/industries/*.json    Prompt libraries by industry        │
│  /data/general.json         General prompts                     │
│  /config/pricing.json       Pricing tiers and features          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: What to Edit

| I want to change...                     | Edit these files                                           |
|-----------------------------------------|-----------------------------------------------------------|
| **Colours/styling**                     | `frontend/src/app/globals.css`, `frontend/tailwind.config.js` |
| **Landing page content**                | `frontend/src/app/page.tsx`                               |
| **Login/signup pages**                  | `frontend/src/app/login/page.tsx`, `frontend/src/app/signup/page.tsx` |
| **Dashboard layout/sidebar**            | `frontend/src/app/dashboard/layout.tsx`                   |
| **Prompt library page**                 | `frontend/src/app/dashboard/page.tsx`                     |
| **Prompt modal (view/copy prompts)**    | `frontend/src/components/PromptModal.tsx`                 |
| **Saved prompts page**                  | `frontend/src/app/dashboard/saved/page.tsx`               |
| **Upgrade/pricing page**                | `frontend/src/app/dashboard/upgrade/page.tsx`             |
| **Settings page**                       | `frontend/src/app/dashboard/settings/page.tsx`            |
| **Pricing tiers/prices**                | `backend/config/pricing.json`                             |
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
| `createEmail()` | Formats email for Gmail API |
| `sendEmail()` | Sends an email via Gmail API |
| `sendVerificationEmail()` | Sends the "verify your email" email |
| `sendWelcomeEmail()` | Sends the "welcome" email after verification |

**When to edit:** If you want to change email templates, add new email types, or modify email sending logic.

#### `gmail-setup.js` - Gmail OAuth Setup Script

Run this to get your Gmail refresh token. Not used during normal operation.

**When to edit:** Rarely. Only if Google changes their OAuth flow.

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
| `dashboard/saved/page.tsx` | `/dashboard/saved` | Saved and custom prompts |
| `dashboard/upgrade/page.tsx` | `/dashboard/upgrade` | Pricing/upgrade page |
| `dashboard/builder/page.tsx` | `/dashboard/builder` | Prompt builder (coming soon) |
| `dashboard/team/page.tsx` | `/dashboard/team` | Team features (coming soon) |
| `dashboard/settings/page.tsx` | `/dashboard/settings` | Account settings |

---

### `/src/app/globals.css` - Styles

**Key sections:**

```css
/* Lines 1-3: Tailwind imports */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Lines 5-6: Google Fonts import */

/* Lines 8-15: CSS variables for colours */

/* Lines 17-50: Component classes (.btn-primary, .card, etc.) */

/* Lines 52-70: Scrollbar styling */

/* Lines 72-80: Animation for locked prompts */
```

**When to edit:** To change button styles, card styles, or add new CSS classes.

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
- Copy and "Copy Populated" buttons
- Save/unsave button
- Upgrade CTA for locked prompts

**When to edit:** To change how prompts are displayed, modify copy functionality, or change the upgrade messaging.

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
- User methods: `getUserPrompts()`, `createUserPrompt()`, `updateUserPrompt()`, `deleteUserPrompt()`, `getSavedPrompts()`, `savePrompt()`, `removeSavedPrompt()`
- Config methods: `getPricing()`

**When to edit:** When adding new API endpoints or changing how API calls are made.

---

### `/src/types/index.ts` - TypeScript Types

Defines the shape of data used throughout the app.

**Types defined:**
- `User`: User profile data
- `Prompt`: Library prompt
- `CustomPrompt`: User-created prompt
- `Industry`: Industry metadata
- `PricingTier` / `PricingConfig`: Pricing data
- `FilterOptions`: Available filters
- `SearchQuery`: Search parameters
- `PaginatedResponse`: Paginated results
- `ApiError`: Error response format

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
  "savedPrompts": []
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
      "originalPrice": 39,           // For showing discount
      "discount": {
        "percentage": 25,
        "validUntil": "2025-03-31",
        "label": "Launch Special"
      },
      "features": ["Feature 1", "Feature 2"],
      "highlighted": true,           // Shows "Most Popular" styling
      "badge": "Most Popular"
    }
  ],
  "annualDiscount": 20,
  "trialDays": 14,
  "refundPolicy": "30-day money-back guarantee"
}
```

**When to edit:** To change prices, features, or add/remove tiers.

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

1. Open `frontend/tailwind.config.js`
2. Find the `colors` section under `extend`
3. Modify `primary` or `accent` colour values
4. The app uses Tailwind classes like `bg-primary-600`, `text-primary-700`

### Changing Button Styles

1. Open `frontend/src/app/globals.css`
2. Find `.btn-primary`, `.btn-secondary`, `.btn-outline`
3. Modify the Tailwind classes

### Modifying the Sidebar

1. Open `frontend/src/app/dashboard/layout.tsx`
2. Find the `navigation` array near the top
3. Add/remove/modify navigation items
4. Each item has: `name`, `href`, `icon`, and optional `comingSoon`

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

*Last updated: December 2024*
