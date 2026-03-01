# NMC Assessment Dashboard

The **NMC Assessment Dashboard** is a comprehensive web application for managing candidates and tracking examiner assessments.

## Production Setup Summary
For a complete guide on how to host this live, please read the **[deployment_guide.md](deployment_guide.md)** file in this root folder.

## Key Configuration (Most Important!)

To fix communication between the frontend and backend on a live server, the following two things MUST be correct:

1.  **Frontend `.env`**: Before running `npm run build`, the `VITE_API_URL` must point to the live backend.
2.  **Backend `.env`**: The `FRONTEND_URL` must point to the live domain to allow access.

### Quick Start (Local Dev)
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
npm start

# Frontend (Root)
npm install
npm run dev
```
