# Quick Start: PostgreSQL Installation

## ⚠️ PostgreSQL Not Found

PostgreSQL is not currently installed on your system.

## 📥 Download PostgreSQL

**Direct Download Link:** https://www.postgresql.org/download/windows/

### Quick Steps:

1. **Download** (5 minutes)
   - Click the link above
   - Click "Download the installer"
   - Choose the latest version (PostgreSQL 16 recommended)
   - Download the Windows x86-64 installer

2. **Install** (10 minutes)
   - Run the installer
   - **IMPORTANT**: Set a password for `postgres` user (remember it!)
   - Suggested password: `admin123` (or your own)
   - Keep all default settings
   - Port: `5432`

3. **Create Database** (2 minutes)
   - Open pgAdmin 4 (installed with PostgreSQL)
   - Right-click "Databases" → Create → Database
   - Name: `nmc_db`

4. **Update Backend Config** (1 minute)
   - Edit: `A:\Downloads\nmc\backend\.env`
   - Update this line:
     ```
     DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/nmc_db?schema=public"
     ```
   - Replace `YOUR_PASSWORD` with your actual password

5. **Initialize Database** (3 minutes)
   ```powershell
   cd A:\Downloads\nmc\backend
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   npm run dev
   ```

## 🎯 Expected Result

After installation, you should see:
```
🚀 Server running on port 5000
📝 Environment: development
🌐 Frontend URL: http://localhost:3000
```

## ❓ Need Help?

Common issues:
- **Can't find psql command**: Add to PATH (see full guide)
- **Connection refused**: Start PostgreSQL service
- **Password error**: Check `.env` file for typos

**Full detailed guide available in:** `postgres_setup.md`

---

**Let me know when you've:**
1. Downloaded PostgreSQL
2. Installed it (with password set)
3. Created the `nmc_db` database

Then I'll help you configure and start the backend! 🚀
