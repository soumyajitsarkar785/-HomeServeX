/**
 * HomeServeX H3 Geospatial Dispatch & Location Intelligence Engine
 * - H3 Discrete Global Grid System (Uber H3 Resolution 8 / ~460m)
 * - Atomic cell membership tracking & counter deduplication
 * - Adaptive GPS ping intervals (Moving: 3-5s, Stationary: 15-30s, Active Job: 2-5s)
 * - Stale location expiry & active pruning
 * - Candidate discovery via H3 gridDisk + Accurate Haversine / PostGIS geodesic verification
 */

import { latLngToCell, gridDisk, cellToBoundary, cellToLatLng } from 'h3-js';

export interface CachedProviderLocation {
  providerId: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  speedKmh?: number;
  headingDegrees?: number;
  lastPingAt: number; // timestamp in ms
  h3Cell: string;
  h3Resolution: number;
  skills?: string[];
  isAvailable: boolean;
  isBusy: boolean;
  isOnline: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'STALE';
}

export interface H3CellMetrics {
  cellId: string;
  resolution: number;
  centerLat: number;
  centerLng: number;
  boundary: Array<[number, number]>; // polygon vertices [lat, lng]
  availableCount: number;
  busyCount: number;
  totalCount: number;
  density: 'LOW' | 'MEDIUM' | 'HIGH' | 'SURGE';
}

class GeoDispatchEngine {
  private static instance: GeoDispatchEngine;

  // In-memory provider location registry (Redis GEO & hash emulation with TTL)
  private locations = new Map<string, CachedProviderLocation>();

  // H3 cell memberships: cellId -> Set of providerIds
  private cellMemberships = new Map<string, Set<string>>();

  // Provider current cell pointer: providerId -> cellId
  private providerCurrentCell = new Map<string, string>();

  // H3 Cell counters: cellId -> { available, busy, total }
  private cellCounters = new Map<string, { available: number; busy: number; total: number }>();

  // Configuration
  private readonly DEFAULT_H3_RESOLUTION = 8; // ~461m edge length
  private staleThresholdMs = 60 * 1000; // 60s TTL by default

  public constructor() {}

  public static getInstance(): GeoDispatchEngine {
    if (!GeoDispatchEngine.instance) {
      GeoDispatchEngine.instance = new GeoDispatchEngine();
    }
    return GeoDispatchEngine.instance;
  }

  public setStaleThresholdSeconds(seconds: number) {
    this.staleThresholdMs = Math.max(10, seconds) * 1000;
  }

  public getStaleThresholdSeconds(): number {
    return Math.round(this.staleThresholdMs / 1000);
  }

  /**
   * Determine adaptive GPS update interval (Part 2.2)
   * - Moving (speed >= 3 km/h): 3–5 seconds
   * - Stationary (speed < 3 km/h): 15–30 seconds
   * - Active Booking: 2–5 seconds
   */
  public calculateAdaptiveIntervalSeconds(params: {
    speedKmh?: number;
    hasActiveJob?: boolean;
    isStationary?: boolean;
  }): number {
    if (params.hasActiveJob) return 3; // High-precision live doorstep transit
    if ((params.speedKmh ?? 0) >= 3 && !params.isStationary) return 4; // Active street movement
    return 20; // Stationary battery-saving mode
  }

  /**
   * High-frequency GPS ping from active authenticated provider
   * Computes H3 cell, executes atomic cell transitions, and updates counters without duplication.
   * Supports both object-parameter and positional parameter invocations.
   */
  public recordPing(
    providerIdOrParams: string | {
      providerId: string;
      latitude: number;
      longitude: number;
      accuracyMeters?: number;
      speedKmh?: number;
      headingDegrees?: number;
      skills?: string[];
      isAvailable?: boolean;
      isBusy?: boolean;
      resolution?: number;
    },
    latArg?: number,
    lngArg?: number,
    skillsArg?: string[],
    isAvailableArg?: boolean,
    isBusyArg?: boolean,
    speedKmhArg?: number,
    headingDegreesArg?: number,
    accuracyMetersArg?: number,
    resolutionArg?: number
  ): { h3Cell: string; recommendedPingIntervalSec: number } {
    let providerId: string;
    let latitude: number;
    let longitude: number;
    let accuracyMeters = 5.0;
    let speedKmh = 0.0;
    let headingDegrees = 0.0;
    let skills: string[] | undefined;
    let isAvailable = true;
    let isBusy = false;
    let resolution = this.DEFAULT_H3_RESOLUTION;

    if (typeof providerIdOrParams === 'object' && providerIdOrParams !== null) {
      providerId = providerIdOrParams.providerId;
      latitude = providerIdOrParams.latitude;
      longitude = providerIdOrParams.longitude;
      if (providerIdOrParams.accuracyMeters !== undefined) accuracyMeters = providerIdOrParams.accuracyMeters;
      if (providerIdOrParams.speedKmh !== undefined) speedKmh = providerIdOrParams.speedKmh;
      if (providerIdOrParams.headingDegrees !== undefined) headingDegrees = providerIdOrParams.headingDegrees;
      if (providerIdOrParams.skills !== undefined) skills = providerIdOrParams.skills;
      if (providerIdOrParams.isAvailable !== undefined) isAvailable = providerIdOrParams.isAvailable;
      if (providerIdOrParams.isBusy !== undefined) isBusy = providerIdOrParams.isBusy;
      if (providerIdOrParams.resolution !== undefined) resolution = providerIdOrParams.resolution;
    } else {
      providerId = providerIdOrParams;
      latitude = latArg!;
      longitude = lngArg!;
      if (skillsArg !== undefined) skills = skillsArg;
      if (isAvailableArg !== undefined) isAvailable = isAvailableArg;
      if (isBusyArg !== undefined) isBusy = isBusyArg;
      if (speedKmhArg !== undefined) speedKmh = speedKmhArg;
      if (headingDegreesArg !== undefined) headingDegrees = headingDegreesArg;
      if (accuracyMetersArg !== undefined) accuracyMeters = accuracyMetersArg;
      if (resolutionArg !== undefined) resolution = resolutionArg;
    }

    const now = Date.now();
    const h3Cell = latLngToCell(latitude, longitude, resolution);

    const prevCell = this.providerCurrentCell.get(providerId);
    const existing = this.locations.get(providerId);

    // Atomic Cell Transition
    if (!prevCell) {
      // First ping: add to new cell
      this.addProviderToCell(h3Cell, providerId, isAvailable && !isBusy);
      this.providerCurrentCell.set(providerId, h3Cell);
    } else if (prevCell !== h3Cell) {
      // Provider moved to a different cell: atomically transition
      this.removeProviderFromCell(prevCell, providerId, existing ? existing.isAvailable && !existing.isBusy : true);
      this.addProviderToCell(h3Cell, providerId, isAvailable && !isBusy);
      this.providerCurrentCell.set(providerId, h3Cell);
    } else {
      // Repeated ping in same cell: Do NOT increment counters!
      // Update cell availability status if changed
      if (existing && (existing.isAvailable !== isAvailable || existing.isBusy !== isBusy)) {
        this.updateCellCounters(h3Cell);
      }
    }

    const providerLoc: CachedProviderLocation = {
      providerId,
      latitude,
      longitude,
      accuracyMeters,
      speedKmh,
      headingDegrees,
      lastPingAt: now,
      h3Cell,
      h3Resolution: resolution,
      skills: skills || existing?.skills || [],
      isAvailable: isAvailable && !isBusy,
      isBusy,
      isOnline: true,
      status: isBusy ? 'BUSY' : 'ONLINE',
    };

    this.locations.set(providerId, providerLoc);

    const intervalSec = this.calculateAdaptiveIntervalSeconds({
      speedKmh,
      hasActiveJob: isBusy,
    });

    return { h3Cell, recommendedPingIntervalSec: intervalSec };
  }

  /**
   * Helper: Atomic add provider to H3 cell membership
   */
  private addProviderToCell(cellId: string, providerId: string, _isAvailable: boolean) {
    if (!this.cellMemberships.has(cellId)) {
      this.cellMemberships.set(cellId, new Set());
    }
    const set = this.cellMemberships.get(cellId)!;
    if (!set.has(providerId)) {
      set.add(providerId);
      this.updateCellCounters(cellId);
    }
  }

  /**
   * Helper: Atomic remove provider from H3 cell membership
   */
  private removeProviderFromCell(cellId: string, providerId: string, _isAvailable: boolean) {
    const set = this.cellMemberships.get(cellId);
    if (set && set.has(providerId)) {
      set.delete(providerId);
      if (set.size === 0) {
        this.cellMemberships.delete(cellId);
        this.cellCounters.delete(cellId);
      } else {
        this.updateCellCounters(cellId);
      }
    }
  }

  /**
   * Helper: Reconcile counters for a cell to guarantee atomic consistency
   */
  private updateCellCounters(cellId: string) {
    const set = this.cellMemberships.get(cellId);
    if (!set || set.size === 0) {
      this.cellCounters.delete(cellId);
      return;
    }

    let available = 0;
    let busy = 0;
    const now = Date.now();

    for (const pId of set) {
      const loc = this.locations.get(pId);
      if (!loc) continue;
      // Stale check
      if (now - loc.lastPingAt > this.staleThresholdMs) continue;

      if (loc.isBusy) busy++;
      else if (loc.isAvailable) available++;
    }

    this.cellCounters.set(cellId, {
      available,
      busy,
      total: set.size,
    });
  }

  /**
   * Set provider availability
   */
  public setAvailability(providerId: string, isAvailable: boolean, isBusy: boolean = false) {
    const loc = this.locations.get(providerId);
    if (loc) {
      loc.isAvailable = isAvailable && !isBusy;
      loc.isBusy = isBusy;
      loc.status = isBusy ? 'BUSY' : isAvailable ? 'ONLINE' : 'OFFLINE';
      if (loc.h3Cell) {
        this.updateCellCounters(loc.h3Cell);
      }
    }
  }

  /**
   * Remove provider on offline or logout
   */
  public remove(providerId: string) {
    const prevCell = this.providerCurrentCell.get(providerId);
    if (prevCell) {
      this.removeProviderFromCell(prevCell, providerId, true);
      this.providerCurrentCell.delete(providerId);
    }
    this.locations.delete(providerId);
  }

  /**
   * Prune stale locations older than TTL
   */
  public pruneStaleLocations(): string[] {
    const now = Date.now();
    const prunedIds: string[] = [];

    for (const [providerId, loc] of this.locations.entries()) {
      if (now - loc.lastPingAt > this.staleThresholdMs) {
        prunedIds.push(providerId);
        loc.status = 'STALE';
        loc.isAvailable = false;
        if (loc.h3Cell) {
          this.removeProviderFromCell(loc.h3Cell, providerId, false);
          this.providerCurrentCell.delete(providerId);
        }
        this.locations.delete(providerId);
      }
    }

    return prunedIds;
  }

  /**
   * Accurate Haversine Geodesic Distance in Kilometers
   */
  public calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(3));
  }

  /**
   * Candidate Discovery using H3 gridDisk & Geodesic Filtering (Part 6)
   */
  public searchNearbyProviders(
    customerLat: number,
    customerLng: number,
    radiusKm: number = 10,
    requiredSkill?: string
  ): Array<CachedProviderLocation & { distanceKm: number; etaMinutes: number }> {
    this.pruneStaleLocations();

    const customerCell = latLngToCell(customerLat, customerLng, this.DEFAULT_H3_RESOLUTION);

    // Resolution 8 hexagon diameter is ~0.92 km. Ring distance k = ceil(radiusKm / 0.8)
    const kRing = Math.min(25, Math.max(1, Math.ceil(radiusKm / 0.8)));
    const candidateCells = new Set(gridDisk(customerCell, kRing));

    const candidateIds = new Set<string>();
    for (const cell of candidateCells) {
      const providersInCell = this.cellMemberships.get(cell);
      if (providersInCell) {
        for (const pId of providersInCell) {
          candidateIds.add(pId);
        }
      }
    }

    // Fallback: If no providers found in indexed H3 disk, check active locations within radius
    if (candidateIds.size === 0) {
      for (const [pId] of this.locations.entries()) {
        candidateIds.add(pId);
      }
    }

    const results: Array<CachedProviderLocation & { distanceKm: number; etaMinutes: number }> = [];

    for (const pId of candidateIds) {
      const loc = this.locations.get(pId);
      if (!loc || !loc.isAvailable || loc.isBusy) continue;

      if (requiredSkill && loc.skills && loc.skills.length > 0) {
        const reqLower = requiredSkill.toLowerCase();
        const hasSkill = loc.skills.some((s) => {
          const sLower = s.toLowerCase();
          return sLower === 'all' || sLower.includes(reqLower) || reqLower.includes(sLower) || sLower.includes('appliance');
        });
        if (!hasSkill) continue;
      }

      const distanceKm = this.calculateDistanceKm(customerLat, customerLng, loc.latitude, loc.longitude);
      if (distanceKm <= radiusKm + 0.5) {
        // Indian urban transit speed: ~20 km/h + 3 min prep buffer
        const etaMinutes = Math.max(5, Math.round((distanceKm / 20) * 60) + 3);
        results.push({
          ...loc,
          distanceKm: Number(distanceKm.toFixed(2)),
          etaMinutes,
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  public getProviderLocation(providerId: string): CachedProviderLocation | null {
    const loc = this.locations.get(providerId);
    if (!loc) return null;
    if (Date.now() - loc.lastPingAt > this.staleThresholdMs) {
      this.remove(providerId);
      return null;
    }
    return loc;
  }

  public getAllActiveLocations(): CachedProviderLocation[] {
    this.pruneStaleLocations();
    return Array.from(this.locations.values());
  }

  /**
   * H3 Heatmap Generator for Admin Live Operations Center (Part 3)
   * Renders real H3 cell polygons, density, available/busy counts
   */
  public getH3HeatmapData(): H3CellMetrics[] {
    this.pruneStaleLocations();
    const metrics: H3CellMetrics[] = [];

    for (const [cellId, countInfo] of this.cellCounters.entries()) {
      if (countInfo.total === 0) continue;

      try {
        const [centerLat, centerLng] = cellToLatLng(cellId);
        const boundary = cellToBoundary(cellId); // Array of [lat, lng]

        let density: 'LOW' | 'MEDIUM' | 'HIGH' | 'SURGE' = 'LOW';
        if (countInfo.available >= 5) density = 'SURGE';
        else if (countInfo.available >= 3) density = 'HIGH';
        else if (countInfo.available >= 2) density = 'MEDIUM';

        metrics.push({
          cellId,
          resolution: this.DEFAULT_H3_RESOLUTION,
          centerLat,
          centerLng,
          boundary,
          availableCount: countInfo.available,
          busyCount: countInfo.busy,
          totalCount: countInfo.total,
          density,
        });
      } catch (err) {
        console.warn(`[H3] Failed to compute polygon for ${cellId}:`, err);
      }
    }

    return metrics;
  }
}

export const geoDispatch = GeoDispatchEngine.getInstance();
