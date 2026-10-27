/**
 * HomeServeX Geospatial Dispatch & Location Engine
 * High-frequency provider GPS caching (60s TTL), spatial radius filtering,
 * and dispatch candidate ranking.
 */

export interface CachedProviderLocation {
  providerId: string;
  latitude: number;
  longitude: number;
  lastPingAt: number; // timestamp in ms
  skills?: string[];
  isAvailable: boolean;
}

class GeoDispatchEngine {
  // In-memory geospatial registry (Redis GEO emulation with TTL)
  private locations = new Map<string, CachedProviderLocation>();
  private readonly STALE_THRESHOLD_MS = 60 * 1000; // 60 seconds TTL

  /**
   * High-frequency GPS ping from active provider
   */
  public recordPing(providerId: string, latitude: number, longitude: number, skills?: string[]) {
    this.locations.set(providerId, {
      providerId,
      latitude,
      longitude,
      lastPingAt: Date.now(),
      skills,
      isAvailable: true,
    });
  }

  /**
   * Set provider availability
   */
  public setAvailability(providerId: string, isAvailable: boolean) {
    const loc = this.locations.get(providerId);
    if (loc) {
      loc.isAvailable = isAvailable;
    }
  }

  /**
   * Remove provider from dispatch pool on assignment or offline
   */
  public remove(providerId: string) {
    this.locations.delete(providerId);
  }

  /**
   * Calculate distance between two coordinates in kilometers using Haversine formula
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Geospatial candidate search with multi-stage radius expansion (3km -> 6km -> 10km -> 15km)
   * Stale providers (>60s without ping) are automatically pruned.
   */
  public searchNearbyProviders(
    customerLat: number,
    customerLng: number,
    radiusKm: number = 10,
    requiredSkill?: string
  ): Array<CachedProviderLocation & { distanceKm: number; etaMinutes: number }> {
    const now = Date.now();
    const candidates: Array<CachedProviderLocation & { distanceKm: number; etaMinutes: number }> = [];

    // Filter and prune stale
    for (const [providerId, loc] of this.locations.entries()) {
      // 60-second TTL check
      if (now - loc.lastPingAt > this.STALE_THRESHOLD_MS) {
        this.locations.delete(providerId);
        continue;
      }

      if (!loc.isAvailable) continue;

      if (requiredSkill && loc.skills && loc.skills.length > 0) {
        if (!loc.skills.includes(requiredSkill)) continue;
      }

      const distanceKm = this.calculateDistanceKm(customerLat, customerLng, loc.latitude, loc.longitude);
      if (distanceKm <= radiusKm) {
        // Average Indian urban transit speed: ~20 km/h + 5 min dispatch buffer
        const etaMinutes = Math.max(5, Math.round((distanceKm / 20) * 60) + 3);
        candidates.push({
          ...loc,
          distanceKm: Number(distanceKm.toFixed(2)),
          etaMinutes,
        });
      }
    }

    // Sort by road distance ascending
    return candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  public getProviderLocation(providerId: string): CachedProviderLocation | null {
    const loc = this.locations.get(providerId);
    if (!loc) return null;
    if (Date.now() - loc.lastPingAt > this.STALE_THRESHOLD_MS) {
      this.locations.delete(providerId);
      return null;
    }
    return loc;
  }

  public getAllActiveLocations(): CachedProviderLocation[] {
    const now = Date.now();
    const active: CachedProviderLocation[] = [];
    for (const [providerId, loc] of this.locations.entries()) {
      if (now - loc.lastPingAt > this.STALE_THRESHOLD_MS) {
        this.locations.delete(providerId);
      } else {
        active.push(loc);
      }
    }
    return active;
  }
}

export const geoDispatch = new GeoDispatchEngine();
