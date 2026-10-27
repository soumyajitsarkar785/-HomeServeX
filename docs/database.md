# HomeServeX — Database Design & Specification

## Database Engine

- **Local Development**: SQLite (for frictionless local bootstrapping without external database prerequisites).
- **Staging & Production**: PostgreSQL 15+.
- **ORM**: Prisma Client with typed relations and transactions.

## Core Relational Entities

1. **User**: Authentication credentials (argon2/bcrypt hashed passwords), email, phone, role (`CUSTOMER`, `PROVIDER`, `ADMIN`), account status (`ACTIVE`, `SUSPENDED`, `PENDING_VERIFICATION`).
2. **CustomerProfile**: Saved addresses, preferred payment methods, customer metadata.
3. **ProviderProfile**: Skills, verification status (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`), active status, current availability status (`ONLINE`, `OFFLINE`), documents submitted.
4. **ServiceCategory**: Hierarchical service groupings (e.g. Plumbing, Electrical, Cleaning, AC Servicing) with active flags, icons, display order.
5. **Service**: Configurable home services with base price in integer paise, duration in minutes, descriptions, media URLs, active flags.
6. **ServiceOption**: Add-ons or specific variants (e.g., "Deep Kitchen Cleaning", "Single Unit AC Service") with price adjustments.
7. **Address**: Customer delivery/service coordinates, street address, postal code, city, landmark, latitude, longitude.
8. **Booking**: Core booking record with reference code, scheduled timestamp, status machine, base amount, discount, platform fee, total amount in paise.
9. **BookingAssignment**: Exclusive relationship linking a booking to an accepted provider, assignment timestamps, status (`OFFERED`, `ACCEPTED`, `REJECTED`, `CANCELLED`).
10. **BookingStatusHistory**: Immutable audit trail of every status transition with actor ID and reason.
11. **BookingOtp**: Secure hashes of Start OTP and Completion OTP, expiration timestamps, attempt counters, and consumed flags.
12. **Payment**: Payment intent, method, provider transaction ID, status (`PENDING`, `PROCESSING`, `PAID`, `FAILED`, `REFUND_PENDING`, `REFUNDED`), amount in paise.
13. **Invoice**: Invoice number, itemized totals, tax breakdown, billing address, generation timestamp.
14. **Review**: Rating (1-5 stars), text commentary, photos, admin moderation status, strictly tied to completed bookings.
15. **SupportTicket**: User issue tracker, category, messages, priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), status (`OPEN`, `RESOLVED`, `CLOSED`).
16. **PlatformSetting**: System configuration keys (commissions, service areas, operating hours, maintenance mode).
17. **AuditLog**: Comprehensive security logs for sensitive actions (reassignment, refunds, approvals, privilege changes).
