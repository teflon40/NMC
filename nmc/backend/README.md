# NMC Backend API

Backend API for the Nursing and Midwifery Training College (NMTC) Admin Dashboard.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

**Important:** Update the `DATABASE_URL` with your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/nmc_db?schema=public"
```

### 3. Set Up Database

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed the database with initial data:

```bash
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with initial data
- `npm run prisma:studio` - Open Prisma Studio (database GUI)

## Default Credentials

After seeding, you can login with:

**Administrator:**
- Username: `nmtc-teshie`
- Password: `password`

**Examiner:**
- Username: `AGYAATENG`
- Password: `password`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (requires auth)

### Students
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `POST /api/students` - Create student (Admin only)
- `PUT /api/students/:id` - Update student (Admin only)
- `DELETE /api/students/:id` - Delete student (Admin only)
- `POST /api/students/bulk` - Bulk import students (Admin only)

### Results
- `GET /api/results` - Get all results (with filters)
- `GET /api/results/:id` - Get result by ID
- `POST /api/results/practical` - Submit practical exam result
- `POST /api/results/care-study` - Submit care study result
- `POST /api/results/care-plan` - Submit care plan result
- `POST /api/results/obstetrician` - Submit obstetrician result

## Database Schema

The database includes the following main tables:

- **users** - System users (Administrators and Examiners)
- **programs** - Nursing programs (RGN, RMW, RCN, RMN)
- **students** - Student records
- **examiners** - Examiner records
- **tasks** - Exam tasks/procedures
- **task_procedures** - Individual steps for each task
- **exam_results** - All exam results (unified table)

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. Login via `/api/auth/login` to receive access and refresh tokens
2. Include access token in Authorization header: `Bearer <token>`
3. Access tokens expire in 15 minutes
4. Use refresh token to get new access token via `/api/auth/refresh`

## Role-Based Access Control

- **ADMINISTRATOR** - Full access to all endpoints
- **EXAMINER** - Can submit exam results and view data

## Development Tools

### Prisma Studio

Open a visual database editor:

```bash
npm run prisma:studio
```

Access at `http://localhost:5555`

## Production Deployment

1. Set `NODE_ENV=production` in environment variables
2. Update `DATABASE_URL` with production database
3. Change JWT secrets to strong random values
4. Run migrations: `npm run prisma:migrate`
5. Build: `npm run build`
6. Start: `npm start`

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running and the connection string is correct:

```bash
# Test PostgreSQL connection
psql -U username -d nmc_db
```

### Prisma Client Not Found

Regenerate the Prisma Client:

```bash
npm run prisma:generate
```

### Migration Errors

Reset the database (⚠️ This will delete all data):

```bash
npx prisma migrate reset
```

## License

ISC
