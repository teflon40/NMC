# NMC Deployment Guide (Live Hosting)

This guide explains how to fix the "Backend Communication" error and correctly host the site on Apache.

## 1. Fixing the Communication Error (Critical)

The reason the frontend is loading but cannot talk to the backend is because the "baked-in" API address is still pointing to a local IP address. 

**Follow these steps exactly:**

### A. Update the Frontend URL
1.  Open the `.env` file in the **root** folder.
2.  Change `VITE_API_URL` to your live domain API address.
    *   *Example:* `VITE_API_URL=https://nmc.clicksoftwaregh.com/api`
3.  **RE-BUILD THE FRONTEND**: You MUST run `npm run build` again after changing this file. 
4.  Upload the new `dist/` folder to the server.

### B. Update the Backend URL
1.  Open the `.env` file in the **backend/** folder.
2.  Change `FRONTEND_URL` to your live domain.
    *   *Example:* `FRONTEND_URL=https://nmc.clicksoftwaregh.com`
3.  Restart the backend server (e.g., `pm2 restart nmc-backend`).

---

## 2. Apache Configuration (.htaccess)

I have included a `.htaccess` file in the `public/` folder. It will automatically be copied to the `dist/` folder when you build. This ensures that refreshing the page doesn't result in a 404 error.

### Reverse Proxy (Connecting Frontend to Backend)
Since you are using Apache, you need to tell Apache to "proxy" requests from `/api` to the Node.js server (running on port 5000).

Add this to your Apache VirtualHost configuration:

```apache
ProxyPass /api http://localhost:5000/api
ProxyPassReverse /api http://localhost:5000/api
```

Alternatively, if he is using a separate subdomain like `api.clicksoftwaregh.com`, he should point the frontend `.env` to that subdomain.

---

## 3. Standard Deployment Commands

**Backend:**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 start dist/index.js --name "nmc-backend"
```

**Frontend:**
```bash
npm install
# Ensure .env is updated before this step!
npm run build
```
Copy the contents of the `dist/` folder to the web server's public directory.
