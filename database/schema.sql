-- ============================================================================
-- Home Service X — Production Database Schema (PostgreSQL + PostGIS)
-- Architecture: Rapido / Uber On-Demand Dispatch & Live Route Telemetry
-- ============================================================================

-- 1. Enable PostGIS Spatial Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Booking Status Lifecycle Enum
DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'PENDING_ACCEPTANCE',
        'ACCEPTED',
        'ARRIVED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Users Table (Customers and Providers)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER', 'PROVIDER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Service Providers Table
-- Stores live provider geolocation with high-performance PostGIS geography column
CREATE TABLE IF NOT EXISTS providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL DEFAULT false,
    is_available BOOLEAN NOT NULL DEFAULT true,
    vehicle_info VARCHAR(100) NOT NULL DEFAULT 'Electric Scooter',
    service_categories TEXT[] NOT NULL DEFAULT ARRAY['AC_SERVICE'],
    -- CRITICAL: PostGIS Point stores coordinates in (Longitude, Latitude) order!
    current_location GEOGRAPHY(Point, 4326),
    current_heading DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    current_speed DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_ping_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(32) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    service_id VARCHAR(64) NOT NULL,
    status booking_status NOT NULL DEFAULT 'PENDING_ACCEPTANCE',
    -- Customer Doorstep Destination (Longitude FIRST, Latitude SECOND)
    user_location GEOGRAPHY(Point, 4326) NOT NULL,
    -- Snapshot of Provider location at moment of acceptance
    accepted_provider_location GEOGRAPHY(Point, 4326),
    street_address TEXT NOT NULL,
    total_amount_cents INT NOT NULL,
    -- Cached Route & Cost Control: Encoded overview polyline from Google Directions
    encoded_route_polyline TEXT,
    estimated_duration_seconds INT,
    estimated_distance_meters INT,
    -- Secure 4-Digit Handshake OTPs
    start_otp VARCHAR(6) NOT NULL,
    completion_otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

-- 6. High-Performance Spatial GiST Indexes
CREATE INDEX IF NOT EXISTS idx_providers_location ON providers USING GIST (current_location);
CREATE INDEX IF NOT EXISTS idx_bookings_user_location ON bookings USING GIST (user_location);
CREATE INDEX IF NOT EXISTS idx_providers_dispatch ON providers (is_online, is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_status_customer ON bookings (customer_id, status);

-- ============================================================================
-- 7. PRODUCTION POSTGIS DISPATCH QUERY (ST_DWithin & ST_Distance)
-- ============================================================================
-- IMPORTANT COORDINATE ORDER RULE:
-- ST_MakePoint($1, $2): Parameter $1 is LONGITUDE, Parameter $2 is LATITUDE!
-- Radius $4 is in METERS (e.g., 5000 for 5km).
-- ============================================================================

/*
PREPARED QUERY FOR BACKEND DISPATCHER:

SELECT 
    p.id AS provider_id,
    u.id AS user_id,
    u.full_name AS provider_name,
    u.phone AS provider_phone,
    p.vehicle_info,
    ST_Y(p.current_location::geometry) AS latitude,
    ST_X(p.current_location::geometry) AS longitude,
    p.current_heading AS heading,
    ROUND(
        ST_Distance(
            p.current_location, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        )::numeric, 
        1
    ) AS distance_meters
FROM providers p
JOIN users u ON u.id = p.user_id
WHERE p.is_online = true 
  AND p.is_available = true
  AND $3 = ANY(p.service_categories)
  AND ST_DWithin(
      p.current_location, 
      ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
      $4 -- 5000 meters (5 km)
  )
ORDER BY distance_meters ASC
LIMIT 10;
*/
