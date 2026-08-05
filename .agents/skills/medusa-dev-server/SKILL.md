---
name: medusa-dev-server
description: Start and verify MedusaJS development server with health checks and common issue resolution
---

# MedusaJS Dev Server Management

This skill handles starting the MedusaJS development server, verifying health, and resolving common startup issues.

## When to Use

- Starting development session
- Server crashes or needs restart
- Port conflicts occur
- Database connection issues

## Workflow

### Step 1: Check Prerequisites
```bash
# Check if PostgreSQL is running
netstat -ano | findstr ":5432"

# Check if Redis is running
netstat -ano | findstr ":6379"
```

### Step 2: Verify Environment
```powershell
# Check .env file exists and is correct
Test-Path apps/medusa-backend/.env
```

### Step 3: Start Server
```bash
cd c:/ai-commerce-platform && npm run dev 2>&1
```

### Step 4: Health Check
```bash
# Wait for startup, then check
Start-Sleep -Seconds 5
curl -s http://localhost:9000/health
```

### Step 5: Common Issue Resolution

**Port 5433 → 5432 mismatch:**
```powershell
# Fix .env DATABASE_URL
(Get-Content apps/medusa-backend/.env) -replace '5433', '5432' | Set-Content apps/medusa-backend/.env
```

**Database migration needed:**
```bash
npm --workspace apps/medusa-backend run db:migrate
```

**Admin reset:**
```bash
npm --workspace apps/medusa-backend run medusa user --email admin@citigoo.app --password password
```

## Verification Checklist

- [ ] Server starts without errors
- [ ] Health endpoint responds
- [ ] Admin dashboard accessible at http://localhost:9000/app
- [ ] Database connections working

## Example Usage

User: "Start the dev server"
→ Execute steps 1-5, report status

User: "Server won't start"
→ Diagnose issue, apply fix, restart
