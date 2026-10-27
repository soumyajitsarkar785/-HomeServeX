# HomeServeX — Deployment Guide

## Architecture in Production

- **Customer Frontend**: Deployed on CDN / Static host (e.g. Vercel, Cloudflare Pages, AWS CloudFront) on `homeservex.com`
- **Partner App**: Deployed on `partner.homeservex.com`
- **Admin Dashboard**: Deployed on `admin.homeservex.com` (IP-restricted or protected by VPN / Cloudflare Access)
- **Authoritative API**: Deployed on Node.js container / PM2 on `api.homeservex.com`
- **Database**: Managed PostgreSQL (e.g. AWS RDS, Supabase, Neon)

## Production Checklist

1. Set strong random secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`.
2. Configure `DATABASE_URL` with PostgreSQL connection string and SSL enabled (`sslmode=require`).
3. Set `CORS_ALLOWED_ORIGINS` to the exact production domains.
4. Ensure cookie attributes use `HttpOnly`, `Secure`, `SameSite=Strict`.
5. Run migrations: `npx prisma migrate deploy`.
6. Enable HTTPS and configure Nginx reverse proxy headers (`X-Forwarded-For`, `X-Forwarded-Proto`).
