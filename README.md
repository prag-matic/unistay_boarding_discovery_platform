# UniStay Boarding Discovery Platform

## Demo Database Seeding

Use this to populate the backend MongoDB with realistic demo data (users, boardings, reservations, payments, reviews, and marketplace items).

### Prerequisites

- MongoDB must be running and reachable via `backend/.env` (`MONGODB_URI`).
- Backend dependencies must be installed.

### Run Seed

From the project root:

```bash
cd backend
npm run seed
```

### Demo Login Accounts

Default password for all demo accounts: `Demo@12345`

- `admin@unistay.local` (ADMIN)
- `owner.amal@unistay.local` (OWNER)
- `owner.nisansala@unistay.local` (OWNER)
- `student.kavindu@unistay.local` (STUDENT)
- `student.tharushi@unistay.local` (STUDENT)

### Optional Password Override

Set `SEED_PASSWORD` before running seed if you want a custom password for all seeded users.

PowerShell example:

```powershell
$env:SEED_PASSWORD = "YourStrongPassword@123"
npm run seed
```

### Notes

- Seeding is destructive for existing data in seeded collections (`deleteMany` is used before insert).
- The script is idempotent in practice because each run starts from a clean dataset.