# PromptStack

A premium AI prompt library platform built for New Zealand corporate professionals.

**Built by Kiwis, for Kiwis.**

> **New to this project?** See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for a complete walkthrough from download to deployment.

## Project Structure

```
promptstack/
├── frontend/          # Next.js frontend application
├── backend/           # Express.js API server
├── SETUP_GUIDE.md     # Complete setup instructions
└── README.md          # This file
```

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Gmail account for API (promptstackhello@gmail.com)

## Local Development Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration (see SETUP_GUIDE.md)
npm run dev
```

The backend runs on `http://localhost:3001` by default.

### 2. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev
```

The frontend runs on `http://localhost:3000` by default.

### 3. Gmail API Setup

To send verification emails, you need to set up Gmail API OAuth:

```bash
cd backend
node src/services/gmail-setup.js YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed Gmail API setup instructions.

## Environment Variables

### Backend (.env)

```
PORT=3001
NODE_ENV=development
JWT_SECRET=your-secure-jwt-secret-minimum-32-characters
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
EMAIL_FROM=promptstackhello@gmail.com
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

### Backend on Railway

1. Create a new Railway project
2. Connect your GitHub repository
3. Set the root directory to `backend`
4. Add environment variables in Railway dashboard
5. Deploy

### Frontend on Vercel

1. Import your GitHub repository to Vercel
2. Set the root directory to `frontend`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL
4. Deploy

## Adding New Industries

To add a new industry to the prompt library:

1. Create a new JSON file in `backend/data/industries/`
2. Follow the schema in existing industry files
3. The API will automatically discover and serve the new industry

No code changes required.

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT-based authentication with secure cookies
- Rate limiting on auth endpoints
- Input validation with Zod schemas
- Email verification with one-time tokens
- Atomic file writes to prevent corruption
- No secrets committed to version control

## Licence

Proprietary - PromptStack
