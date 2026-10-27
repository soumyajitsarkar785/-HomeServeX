# HomeServeX — Setup & Getting Started

## Prerequisites

- Node.js LTS (v18 or v20+)
- npm (v9+)
- Git

## Installation Steps

1. Clone the repository and navigate into the project directory:

   ```bash
   cd "Home services"
   ```

2. Copy the environment configuration:

   ```bash
   cp .env.example .env
   ```

3. Install dependencies across all workspaces:

   ```bash
   npm install
   ```

4. Initialize and seed the database:

   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

## Development Servers

Run all applications concurrently:

```bash
npm run dev
```

Or run individual apps:

- Customer Portal: `npm run dev:customer` (`http://localhost:5173`)
- Service Partner App: `npm run dev:partner` (`http://localhost:5174`)
- Admin Owner Dashboard: `npm run dev:admin` (`http://localhost:5175`)
- Authoritative API: `npm run dev:api` (`http://localhost:5000`)
