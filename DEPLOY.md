# CLAW.FUN Deployment Guide

## GitHub Repository
Your code has been pushed to: https://github.com/clawfun/claw-fun

## Railway Deployment

### Step 1: Login to Railway
```bash
cd C:\Users\grant\Desktop\CLAW.FUN
railway login
```

### Step 2: Create Project & Deploy
```bash
# Initialize new Railway project
railway init

# Add PostgreSQL database
railway add -d postgres

# Add Redis
railway add -d redis

# Deploy the app
railway up
```

### Step 3: Set Environment Variables
In Railway dashboard or via CLI:
```bash
railway variables set DATABASE_URL="${{Postgres.DATABASE_URL}}"
railway variables set REDIS_URL="${{Redis.REDIS_URL}}"
railway variables set NEXT_PUBLIC_SOLANA_RPC_URL="https://api.mainnet-beta.solana.com"
railway variables set NEXT_PUBLIC_APP_URL="https://your-app.up.railway.app"
```

### Step 4: Generate Domain
```bash
railway domain
```

## Alternative: Deploy via Railway Dashboard

1. Go to https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Choose `clawfun/claw-fun`
4. Railway will auto-detect the nixpacks.toml config
5. Add PostgreSQL and Redis services
6. Configure environment variables
7. Deploy!

## Required Environment Variables

| Variable | Value |
|----------|-------|
| DATABASE_URL | PostgreSQL connection string (auto from Railway) |
| REDIS_URL | Redis connection string (auto from Railway) |
| NEXT_PUBLIC_SOLANA_RPC_URL | https://api.mainnet-beta.solana.com |
| NEXT_PUBLIC_APP_URL | Your Railway domain |
| NEXT_PUBLIC_OPENCLAW_PROGRAM_ID | (after Solana program deployment) |

## Local Development

```bash
# Start databases
docker-compose up -d

# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push schema
npm run db:push

# Start dev server
npm run dev
```
