# HomeServeX — Full-Stack Home Services Booking Platform

HomeServeX is a production-oriented, multi-portal home services platform allowing customers to book professional services (plumbing, electrical repairs, deep cleaning, AC servicing, appliance repairs) with verified service partners.

---

## 🏗️ Multi-Interface Architecture

The platform consists of three distinct, role-separated frontend interfaces connected to a unified authoritative backend:

| Application | Entry Point | Default Port | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Customer App** | `apps/customer` | `http://localhost:5173` | Service search, slot booking, address selection, transparent pricing, live tracking, two-OTP handshake display, review submission. |
| **Partner App** | `apps/partner` | `http://localhost:5174` | Dedicated partner onboarding, document status, availability switch (Online/Offline), atomic job acceptance, OTP verification entry, earnings breakdown. |
| **Admin Console** | `apps/admin` | `http://localhost:5175` | Operational command center, category & service catalog CRUD, provider approval/rejection, booking management, commissions, audit logs. |
| **API Backend** | `apps/api` | `http://localhost:5000` | Authoritative state machine, price calculation in integer paise, cryptographic OTP generation/hashing, role-based security middleware. |

---

## 📦 Monorepo Structure

```text
homeservex/
├── apps/
│   ├── customer/         # React + Vite Customer Portal (:5173)
│   ├── partner/          # React + Vite Service Partner Console (:5174)
│   ├── admin/            # React + Vite Admin Operations Dashboard (:5175)
│   └── api/              # Node.js + Express + Prisma Authoritative API (:5000)
├── packages/
│   ├── design-tokens/    # Shared CSS tokens & TS constants (Blue & White theme)
│   ├── shared-types/     # TypeScript contracts & interfaces
│   ├── validation/       # Zod runtime validation schemas
│   ├── api-client/       # Type-safe HTTP client with retry & error handling
│   └── ui/               # Reusable accessible UI components (Button, Card, Input, etc.)
├── prisma/
│   ├── schema.prisma     # Relational schema (SQLite dev / PostgreSQL prod)
│   └── seed.ts           # Safe development catalog & settings seed
├── docs/                 # Complete system documentation
├── tests/                # Integration, E2E, and fixture tests
├── scripts/              # Pre-flight validation scripts
├── .env.example          # Documented configuration variables
├── tsconfig.base.json    # Strict TypeScript root configuration
└── package.json          # Monorepo workspaces definition
```

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js LTS (v18 or v20+)
- npm v9+

### 2. Setup

```bash
# Copy environment variables
cp .env.example .env

# Install dependencies across all workspaces
npm install

# Initialize database schema & seed catalog
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 3. Run Development Servers

```bash
# Concurrently start API and all 3 frontends:
npm run dev

# Or run individual applications:
npm run dev:customer   # Port 5173
npm run dev:partner    # Port 5174
npm run dev:admin      # Port 5175
npm run dev:api        # Port 5000
```

---

## 🔒 Security & Business Rules

1. **Authoritative Pricing**: All amounts are computed and validated exclusively on the server in integer paise (INR). Client-sent prices are strictly ignored.
2. **Atomic Job Acceptance**: Provider job claiming uses database transactions to eliminate race conditions.
3. **Two-OTP Handshake**:
   - **Start-Service OTP**: 6-digit random code shown exclusively on the customer's device. Entered by the provider upon arrival.
   - **Complete-Service OTP**: 6-digit random code shown on customer's device after job execution.
4. **Isolated Access Control**: Customer, Provider, and Admin permissions are strictly validated server-side.
