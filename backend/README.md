# PromptStack Backend

Express.js API server for the PromptStack platform.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

## API Endpoints

### Authentication

#### POST /api/auth/signup
Create a new user account.

Request:
```json
{
  "email": "user@example.co.nz",
  "password": "SecurePass123",
  "name": "John Smith"
}
```

Response (201):
```json
{
  "message": "Account created successfully...",
  "user": { "id": "...", "email": "...", "name": "...", "tier": "free" },
  "token": "jwt-token"
}
```

#### POST /api/auth/login
Authenticate an existing user.

Request:
```json
{
  "email": "user@example.co.nz",
  "password": "SecurePass123"
}
```

#### POST /api/auth/logout
Log out the current user.

#### GET /api/auth/verify?token=...
Verify email address using token from email.

#### POST /api/auth/resend-verification
Resend verification email.

Request:
```json
{
  "email": "user@example.co.nz"
}
```

#### GET /api/auth/me
Get current authenticated user (requires auth).

### Prompt Library

#### GET /api/library/industries
List all available industries.

Response:
```json
{
  "industries": [
    {
      "id": "finance",
      "name": "Finance & Banking",
      "description": "...",
      "promptCount": 6
    }
  ],
  "total": 4
}
```

#### GET /api/library/filters
Get available filter options.

#### GET /api/library/prompts
Search and list prompts.

Query parameters:
- `q` - Search query
- `industry` - Filter by industry ID
- `role` - Filter by role
- `access` - Filter by access level (all, free, premium)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20)

#### GET /api/library/prompts/:id
Get a single prompt by ID.

### User Prompts

All endpoints require authentication.

#### GET /api/user/prompts
List user's custom prompts.

#### POST /api/user/prompts
Create a custom prompt.

Request:
```json
{
  "title": "My Prompt",
  "content": "Prompt content with [Placeholder]",
  "keywords": ["keyword1", "keyword2"]
}
```

#### PUT /api/user/prompts/:id
Update a custom prompt.

#### DELETE /api/user/prompts/:id
Delete a custom prompt.

#### GET /api/user/saved
List saved library prompts.

#### POST /api/user/saved/:id
Save a library prompt.

#### DELETE /api/user/saved/:id
Remove a saved prompt.

### Configuration

#### GET /api/config/pricing
Get pricing configuration.

## Adding New Industries

1. Create a new JSON file in `data/industries/`
2. Follow the schema:

```json
{
  "name": "Industry Name",
  "description": "Description",
  "icon": "icon-name",
  "roles": ["Role 1", "Role 2"],
  "categories": ["Category 1"],
  "prompts": [
    {
      "id": "unique-id",
      "title": "Prompt Title",
      "content": "Full prompt content with [Placeholders]",
      "access": "free",
      "role": "Role 1",
      "category": "Category 1",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}
```

3. The API will automatically discover the new industry file.

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT authentication
- Rate limiting on auth endpoints
- Input validation with Zod
- Atomic file writes
- Email verification tokens are hashed and single-use

## Testing

```bash
npm test
```

## Deployment

The backend is designed for Railway deployment:

1. Connect your repository to Railway
2. Set root directory to `backend`
3. Add environment variables
4. Deploy

Railway will automatically:
- Detect Node.js
- Run `npm install`
- Run `npm start`
