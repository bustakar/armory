# Armory

**Transform your GitHub activity into a survival game.**

Your character's HP constantly drains from active repo commitments. Stay alive by shipping code — merge PRs to heal, make commits to earn XP. Neglect your repos and your character dies.

[Live Demo](https://armory-brown.vercel.app)

## How It Works

1. **Create a character** — Choose a name and difficulty level
2. **Activate repos** — Select GitHub repositories to commit to (30-day cycles)
3. **Survive the drain** — Each active repo drains HP over time
4. **Ship code to heal** — Merged PRs restore HP, commits give XP
5. **Level up** — Earn XP to increase your level
6. **Don't die** — If HP hits 0, your character goes to the graveyard

## Game Mechanics

| Action | HP | XP | Notes |
|--------|----|----|-------|
| Merged PR (closes issue) | +12 | +50 | Best way to heal |
| Merged PR (no issue) | +6 | +25 | |
| Commit | - | +10 | Max 5/day per repo |
| Active repo | -0.2 to -1.0/hr | - | Based on difficulty |
| Early exit penalty | -50 | - | Leave commitment early |
| Complete 30-day commitment | +10 | +25 | |

### Difficulty Modes

| Mode | HP Drain/hr | XP Multiplier |
|------|-------------|---------------|
| Easy | 0.2 | 1x |
| Medium | 0.5 | 2x |
| Hard | 1.0 | 3x |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Convex (real-time database + serverless functions)
- **Auth**: Clerk (GitHub OAuth)
- **Deployment**: Vercel

## Development

### Prerequisites

- [Bun](https://bun.sh) (package manager & runtime)
- [Convex](https://convex.dev) account
- [Clerk](https://clerk.dev) account with GitHub OAuth configured

### Setup

```bash
# Clone the repo
git clone https://github.com/bustakar/armory.git
cd armory

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Fill in your Convex and Clerk credentials

# Run development server
bun run dev
```

### Environment Variables

#### Web App (`.env.local`)

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_JWT_ISSUER_DOMAIN=https://your-domain.clerk.accounts.dev

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

#### Convex (Dashboard → Settings → Environment Variables)

```bash
# Clerk JWT Issuer Domain (must match web app)
CLERK_JWT_ISSUER_DOMAIN=https://your-domain.clerk.accounts.dev

# Encryption key for GitHub token storage (32 bytes)
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-64-char-hex-string
```

## License

MIT
