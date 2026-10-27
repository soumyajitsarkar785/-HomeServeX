# HomeServeX — API Specification

## Protocol & Conventions

- Base prefix: `/api/v1`
- Content-Type: `application/json`
- Status Codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `500 Internal Error`.
- Uniform Response Envelope:

```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

- Error Envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human readable explanation",
    "details": []
  }
}
```

## Primary Route Groups

- `/api/v1/auth/*`: Customer & Partner registration, separate logins, refresh tokens, profile logout.
- `/api/v1/services/*`: Public and authenticated service catalogs, categories, pricing calculators.
- `/api/v1/addresses/*`: Customer address book CRUD with geo coordinates.
- `/api/v1/bookings/*`: Booking creation, customer bookings list, detailed status, customer OTP retrieval.
- `/api/v1/partner/jobs/*`: Available job feed for eligible partners, atomic acceptance, en-route / arrival updates, OTP submission.
- `/api/v1/admin/*`: Category/Service CRUD, provider verification approval/rejection, booking reassignment, platform metrics, settings, audit logs.
- `/api/v1/payments/*`: Payment initialization, mock/sandbox webhook handlers, invoices.
- `/api/v1/reviews/*`: Review creation (guarded by verified completion check), public service reviews feed.
- `/api/v1/support/*`: Ticket creation and administrative replies.
- `/health` & `/ready`: Health checks for monitoring and load balancers.
