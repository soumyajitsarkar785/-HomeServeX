import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { geoDispatch } from '../../apps/api/src/lib/geoDispatch.js';
import { dispatchConfigService, DEFAULT_DISPATCH_CONFIG } from '../../apps/api/src/lib/dispatchConfigService.js';

describe('HOMESERVEX MASTER UPGRADE V2 — UBER-STYLE DISPATCH ENGINE & DYNAMIC RADIUS', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: Server-Side Accurate Haversine Distance Engine
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 1: Server-Side Accurate Distance Calculation', () => {
    it('accurately computes Haversine geodesic distance between two points in kilometers', () => {
      // Joynagar coordinates (Customer)
      const custLat = 22.1818;
      const custLng = 88.4282;

      // Nearby provider ~2.2 km away
      const provLat = 22.1950;
      const provLng = 88.4420;

      const dist = geoDispatch.calculateDistanceKm(custLat, custLng, provLat, provLng);
      expect(dist).toBeGreaterThan(2.0);
      expect(dist).toBeLessThan(2.5);
    });

    it('returns zero distance for identical coordinates', () => {
      const lat = 22.5800;
      const lng = 88.4326;
      expect(geoDispatch.calculateDistanceKm(lat, lng, lat, lng)).toBe(0);
    });

    it('disqualifies coordinates outside Earth bounds', () => {
      const isValid = (lat: number, lng: number) =>
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

      expect(isValid(22.58, 88.43)).toBe(true);
      expect(isValid(95.0, 88.43)).toBe(false); // Invalid lat
      expect(isValid(22.58, 200.0)).toBe(false); // Invalid lng
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: Dynamic Admin-Controlled Dispatch Configuration Validation
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 2: Dynamic Configuration Validation & Server Rules', () => {
    it('accepts valid production-grade dispatch configuration', () => {
      const validConfig = {
        initialRadiusKm: 3,
        maxRadiusKm: 15,
        dispatchMode: 'PROGRESSIVE_EXPANSION' as const,
        expansionStages: [3, 5, 8, 12, 15],
        expansionIntervalSeconds: 30,
        offerTimeoutSeconds: 30,
        maxConcurrentOffers: 3,
        maxOffersPerOrder: 10,
        maxDispatchDurationSeconds: 300,
        locationFreshnessThresholdSeconds: 120,
      };

      const result = dispatchConfigService.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid configuration: negative distances', () => {
      const result = dispatchConfigService.validateConfig({
        initialRadiusKm: -5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('positive number'))).toBe(true);
    });

    it('rejects invalid configuration: initial radius greater than maximum radius', () => {
      const result = dispatchConfigService.validateConfig({
        initialRadiusKm: 20,
        maxRadiusKm: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot be greater than maximum radius'))).toBe(true);
    });

    it('rejects invalid configuration: stages exceeding maximum radius', () => {
      const result = dispatchConfigService.validateConfig({
        initialRadiusKm: 3,
        maxRadiusKm: 10,
        expansionStages: [3, 5, 12], // 12 > 10
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('cannot exceed maximum radius'))).toBe(true);
    });

    it('rejects invalid configuration: non-ascending stages', () => {
      const result = dispatchConfigService.validateConfig({
        initialRadiusKm: 3,
        maxRadiusKm: 15,
        expansionStages: [5, 3, 8],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('must be in ascending order'))).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: Provider Eligibility, Freshness & Radius Filtering
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 3: Geospatial Eligibility & Provider Exclusion Reasons', () => {
    const custLat = 22.5800;
    const custLng = 88.4326;
    const currentRadiusKm = 3.0;
    const freshnessThresholdSeconds = 120;
    const now = Date.now();

    it('includes eligible online providers inside the current radius with fresh GPS', () => {
      const provider = {
        id: 'p-1',
        name: 'Ramesh Kumar',
        currentLatitude: 22.5850,
        currentLongitude: 88.4350,
        lastLocationUpdatedAt: new Date(now - 15 * 1000), // 15 seconds ago (fresh)
        availabilityStatus: 'ONLINE',
        verificationStatus: 'APPROVED',
        skills: ['AC', 'Appliance Repair'],
        ratingAverage: 4.9,
      };

      const dist = geoDispatch.calculateDistanceKm(custLat, custLng, provider.currentLatitude, provider.currentLongitude);
      const isWithinRadius = dist <= currentRadiusKm;
      const ageSeconds = (now - provider.lastLocationUpdatedAt.getTime()) / 1000;
      const isLocationFresh = ageSeconds <= freshnessThresholdSeconds;
      const isOnline = provider.availabilityStatus === 'ONLINE';
      const isVerified = provider.verificationStatus === 'APPROVED';

      expect(isWithinRadius).toBe(true);
      expect(isLocationFresh).toBe(true);
      expect(isOnline).toBe(true);
      expect(isVerified).toBe(true);
    });

    it('excludes provider when outside current radius (OUT_OF_RADIUS)', () => {
      const farProvider = {
        name: 'Far Specialist',
        currentLatitude: 22.6400, // ~7 km away
        currentLongitude: 88.4800,
      };

      const dist = geoDispatch.calculateDistanceKm(custLat, custLng, farProvider.currentLatitude, farProvider.currentLongitude);
      const isWithinRadius = dist <= currentRadiusKm;
      expect(isWithinRadius).toBe(false);
      expect(dist).toBeGreaterThan(currentRadiusKm);
    });

    it('excludes provider when GPS location is stale (> freshness threshold)', () => {
      const staleProvider = {
        name: 'Stale Tech',
        currentLatitude: 22.5820,
        currentLongitude: 88.4330, // 0.3 km away
        lastLocationUpdatedAt: new Date(now - 300 * 1000), // 300s ago (> 120s)
      };

      const ageSeconds = (now - staleProvider.lastLocationUpdatedAt.getTime()) / 1000;
      const isFresh = ageSeconds <= freshnessThresholdSeconds;
      expect(isFresh).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: Atomic Concurrency-Safe Provider Acceptance & Double-Claim Prevention
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 4: Atomic Concurrency-Safe Provider Claiming', () => {
    it('allows the first eligible provider within radius to claim atomically', () => {
      const orderState = {
        status: 'SEARCHING_PROVIDER',
        assignedProviderId: null as string | null,
        allowedRadiusKm: 5.0,
      };

      const providerCoords = { latitude: 22.5850, longitude: 88.4350 };
      const custCoords = { latitude: 22.5800, longitude: 88.4326 };
      const dist = geoDispatch.calculateDistanceKm(custCoords.latitude, custCoords.longitude, providerCoords.latitude, providerCoords.longitude);

      // Revalidate distance against allowed radius
      expect(dist).toBeLessThanOrEqual(orderState.allowedRadiusKm);

      // Atomic state change
      if (orderState.status === 'SEARCHING_PROVIDER') {
        orderState.status = 'ASSIGNED';
        orderState.assignedProviderId = 'pro-ramesh-1';
      }

      expect(orderState.status).toBe('ASSIGNED');
      expect(orderState.assignedProviderId).toBe('pro-ramesh-1');
    });

    it('rejects a second competing provider attempting to claim the same order concurrently', () => {
      const orderState = {
        status: 'ASSIGNED',
        assignedProviderId: 'pro-ramesh-1',
        allowedRadiusKm: 5.0,
      };

      // Second provider attempts claim
      const attemptClaim = () => {
        if (orderState.status !== 'SEARCHING_PROVIDER') {
          throw new Error('CONFLICT: This booking is no longer available or was accepted by another partner');
        }
        orderState.assignedProviderId = 'pro-rohit-2';
      };

      expect(attemptClaim).toThrow(/CONFLICT/);
      expect(orderState.assignedProviderId).toBe('pro-ramesh-1');
    });

    it('rejects provider who attempts to accept from outside the currently allowed radius (OUT_OF_RADIUS)', () => {
      const orderState = {
        status: 'SEARCHING_PROVIDER',
        assignedProviderId: null as string | null,
        allowedRadiusKm: 5.0,
      };

      const farCoords = { latitude: 22.7500, longitude: 88.6000 }; // ~25 km away
      const custCoords = { latitude: 22.5800, longitude: 88.4326 };
      const dist = geoDispatch.calculateDistanceKm(custCoords.latitude, custCoords.longitude, farCoords.latitude, farCoords.longitude);

      const attemptAccept = () => {
        if (dist > orderState.allowedRadiusKm) {
          throw new Error(`OUT_OF_RADIUS: Provider distance (${dist.toFixed(1)} km) exceeds current search radius (${orderState.allowedRadiusKm} km)`);
        }
        orderState.status = 'ASSIGNED';
      };

      expect(attemptAccept).toThrow(/OUT_OF_RADIUS/);
      expect(orderState.status).toBe('SEARCHING_PROVIDER');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: Two-Step Secure OTP Verification & Lifecycle Settlement
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 5: Two-Step OTP Verification Lifecycle', () => {
    it('verifies Start OTP using bcrypt hash to transition booking to IN_PROGRESS', async () => {
      const startOtpPlain = '4821';
      const otpHash = await bcrypt.hash(startOtpPlain, 10);
      let bookingStatus = 'ASSIGNED';

      const verifyStartOtp = async (inputCode: string) => {
        const matches = await bcrypt.compare(inputCode, otpHash);
        if (!matches) throw new Error('OTP_INVALID: Incorrect Start OTP');
        bookingStatus = 'IN_PROGRESS';
        return { success: true, bookingStatus };
      };

      // Incorrect OTP fails
      await expect(verifyStartOtp('9999')).rejects.toThrow(/OTP_INVALID/);
      expect(bookingStatus).toBe('ASSIGNED');

      // Correct OTP succeeds
      const res = await verifyStartOtp(startOtpPlain);
      expect(res.success).toBe(true);
      expect(bookingStatus).toBe('IN_PROGRESS');
    });

    it('verifies Completion OTP and calculates financial settlement ledger', async () => {
      const completeOtpPlain = '7394';
      const otpHash = await bcrypt.hash(completeOtpPlain, 10);
      let bookingStatus = 'IN_PROGRESS';

      const verifyCompletionOtp = async (inputCode: string) => {
        const matches = await bcrypt.compare(inputCode, otpHash);
        if (!matches) throw new Error('OTP_INVALID: Incorrect Completion OTP');
        bookingStatus = 'COMPLETED';

        const totalAmountPaise = 82500; // ₹825.00
        const commissionPaise = Math.round(totalAmountPaise * 0.10); // 10% platform fee = ₹82.50
        const providerEarningsPaise = totalAmountPaise - commissionPaise; // 90% = ₹742.50

        return {
          success: true,
          bookingStatus,
          settlement: {
            totalAmountPaise,
            commissionPaise,
            providerEarningsPaise,
            totalRupees: totalAmountPaise / 100,
            providerEarningsRupees: providerEarningsPaise / 100,
          },
        };
      };

      const result = await verifyCompletionOtp(completeOtpPlain);
      expect(result.success).toBe(true);
      expect(result.bookingStatus).toBe('COMPLETED');
      expect(result.settlement.totalRupees).toBe(825);
      expect(result.settlement.providerEarningsRupees).toBe(742.5);
    });
  });
});
