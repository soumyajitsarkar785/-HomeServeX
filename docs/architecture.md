# HomeServeX — System Architecture

## Overview

HomeServeX is a full-stack, production-oriented home-services booking platform. It provides three independent interfaces communicating with a single authoritative backend API and database:

1. **Customer Application** (`apps/customer` on port `5173`):
   - Service discovery, search, slot booking, address selection, transparent pricing.
   - Realtime booking status, provider details, customer-side OTP display (Start & Completion OTPs), invoices, ratings & reviews.
2. **Service Partner Application** (`apps/partner` on port `5174`):
   - Dedicated provider onboarding, document status, online/offline availability switch.
   - Atomic job acceptance for eligible unassigned requests, navigation/arrival status, OTP entry verification, earnings breakdown.
3. **Admin Owner Dashboard** (`apps/admin` on port `5175`):
   - Complete operational control center.
   - Category and service catalog management, provider document verification & approvals, booking overrides, pricing/commission controls, dispute & ticket management, audit logs.
4. **Backend API** (`apps/api` on port `5000`):
   - Authoritative business logic, state machines, price calculation, OTP generation and hashing, role-based access control, security middleware.

## Monorepo Layout

```text
homeservex/
├── apps/
│   ├── customer/
│   ├── partner/
│   ├── admin/
│   └── api/
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── api-client/
│   ├── design-tokens/
│   └── ui/
├── prisma/
│   └── schema.prisma
├── tests/
└── docs/
```

## Security & Architecture Principles

- **Single Source of Truth**: All prices, discounts, taxes, and commissions are computed server-side in integer paise (INR). Client-sent prices are strictly rejected.
- **Atomic Job Acceptance**: Race conditions in provider job claiming are prevented via atomic database transactions.
- **Two-OTP Handshake**: Start OTP and Completion OTP are cryptographically generated, hashed in the database, and only revealed to the customer on their device. Providers must obtain the OTP from the customer physically.
- **Isolated Authentication**: Strict role checks (`CUSTOMER`, `PROVIDER`, `ADMIN`) are enforced at the API middleware level. Role spoofing is impossible.
