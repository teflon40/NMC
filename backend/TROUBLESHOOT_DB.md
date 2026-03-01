# ⚠️ Database Connection Issue

## Problem
Prisma cannot connect to your PostgreSQL database. This is usually because:

1. **Wrong password** in the `.env` file
2. **PostgreSQL service not running**
3. **Wrong database name**

## Quick Fix

### Step 1: Check Your PostgreSQL Password

The `.env` file currently has:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/nmc_db?schema=public&sslmode=disable"
```

**Is `password` your actual PostgreSQL password?**

If not, update the `.env` file with your real password:
```
DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/nmc_db?schema=public&sslmode=disable"
```

### Step 2: Verify PostgreSQL is Running

**Check if PostgreSQL service is running:**

```powershell
# Check PostgreSQL service status
Get-Service -Name postgresql*
```

If it's not running, start it:
```powershell
# Start PostgreSQL service
Start-Service -Name postgresql-x64-16
```

Or use Services GUI:
1. Press `Win + R`
2. Type `services.msc`
3. Find "postgresql-x64-16"
4. Right-click → Start

### Step 3: Test Database Connection

Try connecting manually to verify credentials:

```powershell
# This will prompt for password
psql -U postgres -d nmc_db
```

If this works, your credentials are correct!

### Step 4: Verify Database Exists

```powershell
# Connect to PostgreSQL
psql -U postgres

# List all databases
\l

# You should see 'nmc_db' in the list
# If not, create it:
CREATE DATABASE nmc_db;

# Exit
\q
```

## After Fixing

Once the connection works, run:

```powershell
cd A:\Downloads\nmc\backend

# Try generating Prisma client again
npx prisma generate

# Then run migrations
npx prisma migrate dev --name init

# Seed the database
npm run prisma:seed

# Start the server
npm run dev
```

## Still Having Issues?

**Common Problems:**

1. **Port 5432 in use**: Another PostgreSQL instance might be running
2. **Firewall blocking**: Allow PostgreSQL through Windows Firewall
3. **Wrong host**: Make sure it's `localhost` not `127.0.0.1`

**Let me know:**
- What password did you set during PostgreSQL installation?
- Can you connect using `psql -U postgres`?
- What error message do you see?

I'll help you troubleshoot! 🔧
