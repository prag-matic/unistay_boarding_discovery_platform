# UniStay Boarding Discovery Platform

UniStay is a full-stack student boarding discovery platform with:

- A mobile app for students (`frontend`, Expo + React Native)
- A backend API with real-time features (`backend`, Node.js + Express + MongoDB + Socket.IO)
- An admin dashboard (`admin`, React + Vite)

---

## Repository Structure

```text
unistay_boarding_discovery_platform/
├── backend/   # REST API, auth, reservations, payments, reviews, visits, marketplace
├── frontend/  # Expo mobile app (students + owners)
├── admin/     # Admin web dashboard
├── docs/      # Test-case and project-level docs
└── README.md
```

---

## Tech Stack

### Backend (`backend`)
- TypeScript, Node.js, Express
- MongoDB (Mongoose)
- Socket.IO (real-time chat/events)
- Zod (validation)
- Vitest (testing)

### Mobile App (`frontend`)
- Expo + React Native + TypeScript
- Expo Router
- Zustand, Axios, React Hook Form
- React Native Maps

### Admin Dashboard (`admin`)
- React + TypeScript + Vite
- Tailwind CSS

---

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm
- Docker Desktop (recommended for backend dependencies)
- Android Studio / Xcode or Expo Go (for mobile app testing)

---

## Quick Start

### 1) Clone and install dependencies

Install dependencies inside each app:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
```

### 2) Configure environment files

#### Backend

Create `backend/.env` from `backend/.env.example` and set required values.

Minimum fields to run locally:

```env
PORT=3000
DATABASE_URL=mongodb://localhost:27017/unistay_db
JWT_ACCESS_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
```

> Note: `backend/.env.example` currently provides `MONGODB_URI`, while runtime config reads `DATABASE_URL`.
> Ensure `DATABASE_URL` is present in `backend/.env`.

#### Frontend (Expo app)

Create `frontend/.env` from `frontend/.env.example`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

### 3) Start services

#### Backend

```bash
cd backend
npm run dev
```

API base URL: `http://localhost:3000/api`

#### Frontend (Mobile app)

```bash
cd frontend
npm run start
```

Then run on a target:

```bash
npm run android
# or
npm run ios
```

#### Admin Dashboard

```bash
cd admin
npm run dev
```

---

## Optional: Backend with Docker

From `backend/`:

```bash
docker compose up --build
```

This starts:
- API service
- MongoDB
- MinIO
- Openinary

---

## Demo Database Seeding

Use this to populate MongoDB with realistic demo data (users, boardings, reservations, payments, reviews, marketplace items).

From `backend/`:

```bash
npm run seed
```

### Demo login accounts

Default password for all seeded users: `Demo@12345`

- `admin@unistay.local` (ADMIN)
- `owner.amal@unistay.local` (OWNER)
- `owner.nisansala@unistay.local` (OWNER)
- `student.kavindu@unistay.local` (STUDENT)
- `student.tharushi@unistay.local` (STUDENT)

### Optional password override

PowerShell:

```powershell
$env:SEED_PASSWORD = "YourStrongPassword@123"
npm run seed
```

### Seed notes

- Seeding clears existing data in seeded collections before insert.
- Designed to be re-runnable for local development.

---

## Useful Scripts

### Backend

- `npm run dev` – Run backend in watch mode
- `npm run build` – Build TypeScript to `dist`
- `npm run start` – Run compiled server
- `npm run test` – Run test suite
- `npm run test:coverage` – Run tests with coverage

### Frontend

- `npm run start` – Start Expo dev server
- `npm run android` – Launch Android target
- `npm run ios` – Launch iOS target
- `npm run web` – Run app in web mode

### Admin

- `npm run dev` – Start Vite dev server
- `npm run build` – Production build
- `npm run preview` – Preview production build

---

## API Documentation

Detailed backend API specs are available in:

- `backend/docs/AUTH_API_DOCUMENTATION.md`
- `backend/docs/BOARDINGS_API_DOCUMENTATION.md`
- `backend/docs/RESERVATIONS_API_DOCUMENTATION.md`
- `backend/docs/PAYMENT_API_DOCUMENTATION.md`
- `backend/docs/REVIEW_API_DOCUMENTATION.md`
- `backend/docs/VISIT_REQUEST_API_DOCUMENTATION.md`
- `backend/docs/MARKETPLACE_API_DOCUMENTATION.md`

Mobile-side mirrored docs are available under `frontend/api_docs/`.

---

## Troubleshooting

- If mobile app cannot reach API on a physical device, replace `localhost` with your machine LAN IP in `EXPO_PUBLIC_API_URL`.
- If backend fails at startup, verify MongoDB connection string and ensure `DATABASE_URL` exists in `backend/.env`.
- If maps do not render, verify `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and API restrictions.

---

## License

This project is for academic and educational use unless otherwise specified by the repository owners.