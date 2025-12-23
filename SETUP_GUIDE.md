# PromptStack Setup Guide

This guide walks you through everything from downloading the project to running it locally and deploying it live on Vercel and Railway.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding the Tech Stack](#understanding-the-tech-stack)
3. [Step 1: Download and Extract](#step-1-download-and-extract)
4. [Step 2: Set Up Gmail API](#step-2-set-up-gmail-api)
5. [Step 3: Configure Environment Variables](#step-3-configure-environment-variables)
6. [Step 4: Run Locally](#step-4-run-locally)
7. [Step 5: Push to GitHub](#step-5-push-to-github)
8. [Step 6: Deploy Backend to Railway](#step-6-deploy-backend-to-railway)
9. [Step 7: Deploy Frontend to Vercel](#step-7-deploy-frontend-to-vercel)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you start, make sure you have:

- **Node.js 18+** installed ([Download here](https://nodejs.org/))
- **Git** installed ([Download here](https://git-scm.com/))
- A **GitHub account** ([Sign up here](https://github.com/))
- A **Google account** (you have promptstackhello@gmail.com)
- A **Vercel account** ([Sign up here](https://vercel.com/) - use GitHub login)
- A **Railway account** ([Sign up here](https://railway.app/) - use GitHub login)

### Check Node.js is installed

Open Terminal (Mac) or Command Prompt (Windows) and run:

```bash
node --version
```

You should see something like `v18.17.0` or higher.

---

## Understanding the Tech Stack

Before we dive in, here's what each technology does:

| Technology | What it does |
|------------|--------------|
| **Next.js** | The frontend framework that creates the website users see |
| **Express.js** | The backend server that handles data and authentication |
| **JWT (JSON Web Token)** | A secure way to keep users logged in. When someone logs in, they get a "token" (like a digital wristband) that proves who they are |
| **Gmail API** | Allows the app to send verification emails from promptstackhello@gmail.com |
| **Vercel** | Hosts the frontend (the website part) |
| **Railway** | Hosts the backend (the server/API part) |

---

## Step 1: Download and Extract

1. Download the `promptstack.zip` file
2. Extract it to a folder on your computer (e.g., `Documents/promptstack`)
3. Open Terminal and navigate to that folder:

```bash
cd ~/Documents/promptstack
```

You should see two folders: `frontend` and `backend`

---

## Step 2: Set Up Gmail API

This allows the app to send emails from promptstackhello@gmail.com.

### 2.1 Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click the project dropdown at the top (might say "Select a project")
4. Click "New Project"
5. Name it `PromptStack` and click "Create"
6. Wait for it to be created, then select it from the dropdown

### 2.2 Enable Gmail API

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for `Gmail API`
3. Click on it and click **Enable**

### 2.3 Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in the form:
   - App name: `PromptStack`
   - User support email: `promptstackhello@gmail.com`
   - Developer contact: `promptstackhello@gmail.com`
4. Click **Save and Continue**
5. On "Scopes" page, click **Save and Continue** (skip this)
6. On "Test users" page, click **Add Users**
7. Add `promptstackhello@gmail.com` and click **Save**
8. Click **Save and Continue**, then **Back to Dashboard**

### 2.4 Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Application type: **Desktop app**
4. Name: `PromptStack CLI`
5. Click **Create**
6. You will see a popup with your **Client ID** and **Client Secret**
7. **Copy both values** - you will need them in the next step

### 2.5 Get Your Refresh Token

1. Open Terminal and navigate to the backend folder:

```bash
cd ~/Documents/promptstack/backend
npm install
```

2. Run the Gmail setup script with your Client ID and Client Secret:

```bash
node src/services/gmail-setup.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

Replace `YOUR_CLIENT_ID` and `YOUR_CLIENT_SECRET` with the values you copied.

3. A URL will appear. Open it in your browser.
4. Sign in with `promptstackhello@gmail.com`
5. Click "Continue" (you may see a warning - click "Advanced" then "Go to PromptStack (unsafe)")
6. Grant permission to send emails
7. You will be redirected and see "Success!" in the browser
8. In the terminal, you will see your credentials. **Copy them!**

The output will look like:

```
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
EMAIL_FROM=promptstackhello@gmail.com
```

---

## Step 3: Configure Environment Variables

### 3.1 Backend Environment

1. In the `backend` folder, copy the example file:

```bash
cd ~/Documents/promptstack/backend
cp .env.example .env
```

2. Open `.env` in a text editor (VS Code, TextEdit, Notepad, etc.)

3. Fill in the values:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
# Generate a random secret at: https://generate-secret.vercel.app/64
# Just click the link and copy the string it generates
JWT_SECRET=paste-a-64-character-random-string-here
JWT_EXPIRES_IN=7d

# Gmail API OAuth (paste your values from Step 2.5)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
EMAIL_FROM=promptstackhello@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Rate Limiting (keep defaults)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

### 3.2 Frontend Environment

1. In the `frontend` folder, copy the example file:

```bash
cd ~/Documents/promptstack/frontend
cp .env.example .env.local
```

2. Open `.env.local` and it should have:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

This is correct for local development.

---

## Step 4: Run Locally

Now let's start both servers!

### Terminal 1: Start the Backend

```bash
cd ~/Documents/promptstack/backend
npm install    # Only needed first time
npm run dev
```

You should see: `PromptStack API running on port 3001`

### Terminal 2: Start the Frontend

Open a NEW terminal window, then:

```bash
cd ~/Documents/promptstack/frontend
npm install    # Only needed first time
npm run dev
```

You should see: `Ready on http://localhost:3000`

### Test It!

1. Open your browser and go to: `http://localhost:3000`
2. You should see the PromptStack landing page
3. Try signing up with your email
4. Check your email for the verification link

**If it all works, you are ready to deploy!**

---

## Step 5: Push to GitHub

### 5.1 Create a GitHub Repository

1. Go to [GitHub](https://github.com/) and sign in
2. Click the **+** icon in the top right and select **New repository**
3. Name it `promptstack` (or whatever you like)
4. Keep it **Private** (recommended)
5. Do NOT initialise with README (we already have one)
6. Click **Create repository**

### 5.2 Push Your Code

In Terminal, navigate to your project root:

```bash
cd ~/Documents/promptstack
```

Initialise Git and push:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/promptstack.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## Step 6: Deploy Backend to Railway

Railway will host your backend server.

### 6.1 Connect to Railway

1. Go to [Railway](https://railway.app/) and sign in with GitHub
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Find and select your `promptstack` repository
5. Railway will ask which folder - select **backend**

### 6.2 Configure Environment Variables

1. In your Railway project, click on the service
2. Go to the **Variables** tab
3. Click **Raw Editor** and paste all your environment variables:

```env
PORT=3001
NODE_ENV=production
JWT_SECRET=your-jwt-secret-from-local-env
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
EMAIL_FROM=promptstackhello@gmail.com
FRONTEND_URL=https://your-app.vercel.app
CORS_ORIGIN=https://your-app.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

**Note:** For `FRONTEND_URL` and `CORS_ORIGIN`, you will update these after deploying the frontend.

4. Click **Add**

### 6.3 Get Your Railway URL

1. Go to **Settings** tab
2. Under **Networking**, click **Generate Domain**
3. Copy your Railway URL (e.g., `https://promptstack-production.up.railway.app`)

**Save this URL - you need it for the frontend!**

---

## Step 7: Deploy Frontend to Vercel

### 7.1 Connect to Vercel

1. Go to [Vercel](https://vercel.com/) and sign in with GitHub
2. Click **Add New...** > **Project**
3. Find and select your `promptstack` repository
4. For **Root Directory**, enter: `frontend`
5. Vercel should auto-detect Next.js

### 7.2 Configure Environment Variables

Before deploying, add your environment variable:

1. Expand the **Environment Variables** section
2. Add:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-railway-url.up.railway.app` (the URL from Step 6.3)
3. Click **Add**

### 7.3 Deploy

Click **Deploy** and wait for it to finish (2-3 minutes).

Once done, you will get your Vercel URL (e.g., `https://promptstack.vercel.app`)

### 7.4 Update Railway with Vercel URL

Go back to Railway and update these environment variables:

- `FRONTEND_URL` = `https://promptstack.vercel.app` (your Vercel URL)
- `CORS_ORIGIN` = `https://promptstack.vercel.app` (same URL)

Railway will automatically redeploy.

---

## You're Live!

Visit your Vercel URL to see your live PromptStack app!

Test it by:
1. Creating an account
2. Checking your email for verification
3. Logging in and browsing prompts

---

## Troubleshooting

### "Cannot connect to backend"

- Check Railway is running (green status)
- Verify `NEXT_PUBLIC_API_URL` in Vercel matches your Railway URL
- Make sure Railway URL does NOT have a trailing slash

### "Verification email not received"

- Check spam folder
- Verify Gmail API credentials are correct
- Check Railway logs for email errors

### "CORS error"

- Make sure `CORS_ORIGIN` in Railway exactly matches your Vercel URL
- Include `https://` but no trailing slash

### Viewing Logs

**Railway:** Click on your service and go to **Deployments** > click a deployment to see logs

**Vercel:** Go to your project > **Deployments** > click a deployment > **Functions** tab

---

## Making Changes

After making code changes locally:

```bash
git add .
git commit -m "Describe your changes"
git push
```

Both Vercel and Railway will automatically redeploy!

---

## Questions?

If you get stuck:
1. Check the logs on Railway/Vercel
2. Search the error message on Google
3. The error messages usually tell you what's wrong

Good luck with PromptStack! 🚀
