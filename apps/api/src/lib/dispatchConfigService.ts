import { prisma } from './prisma.js';

export interface ServiceRadiusOverride {
  initialRadiusKm?: number;
  maxRadiusKm?: number;
  dispatchStrategy?: 'SEQUENTIAL' | 'BATCH';
}

export interface DispatchConfig {
  id?: string;
  initialRadiusKm: number;
  maxRadiusKm: number;
  expansionIncrementKm: number;
  expansionStages: number[];
  dispatchMode: 'PROGRESSIVE_EXPANSION' | 'FIXED_RADIUS';
  expansionIntervalSeconds: number;
  offerTimeoutSeconds: number;
  maxConcurrentOffers: number;
  maxOffersPerOrder: number;
  maxDispatchDurationSeconds: number;
  locationFreshnessThresholdSeconds: number;
  dispatchStrategy: 'SEQUENTIAL' | 'BATCH';
  automaticDispatchEnabled: boolean;
  automaticExpansionEnabled: boolean;
  serviceSpecificOverrides: Record<string, ServiceRadiusOverride>;
  version: number;
  updatedBy: string;
  updatedAt: string;
}

export const DEFAULT_DISPATCH_CONFIG: DispatchConfig = {
  initialRadiusKm: 3,
  maxRadiusKm: 15,
  expansionIncrementKm: 2,
  expansionStages: [3, 5, 8, 12, 15],
  dispatchMode: 'PROGRESSIVE_EXPANSION',
  expansionIntervalSeconds: 45,
  offerTimeoutSeconds: 30,
  maxConcurrentOffers: 3,
  maxOffersPerOrder: 10,
  maxDispatchDurationSeconds: 300,
  locationFreshnessThresholdSeconds: 120,
  dispatchStrategy: 'BATCH',
  automaticDispatchEnabled: true,
  automaticExpansionEnabled: true,
  serviceSpecificOverrides: {
    'electrical-repairs': { initialRadiusKm: 4, maxRadiusKm: 15 },
    'plumbing-services': { initialRadiusKm: 4, maxRadiusKm: 15 },
  },
  version: 1,
  updatedBy: 'system',
  updatedAt: new Date().toISOString(),
};

export class DispatchConfigService {
  private static instance: DispatchConfigService;
  private cachedConfig: DispatchConfig | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 5000; // 5-second reload / convergence across backend instances

  private constructor() {}

  public static getInstance(): DispatchConfigService {
    if (!DispatchConfigService.instance) {
      DispatchConfigService.instance = new DispatchConfigService();
    }
    return DispatchConfigService.instance;
  }

  /**
   * Validate parameters according to business safety constraints
   */
  public validateConfig(input: Partial<DispatchConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.initialRadiusKm !== undefined) {
      if (typeof input.initialRadiusKm !== 'number' || input.initialRadiusKm <= 0) {
        errors.push('Initial search radius must be a positive number greater than 0 km.');
      }
      if (input.initialRadiusKm > 50) {
        errors.push('Initial search radius cannot exceed 50 km.');
      }
    }

    if (input.maxRadiusKm !== undefined) {
      if (typeof input.maxRadiusKm !== 'number' || input.maxRadiusKm <= 0) {
        errors.push('Maximum search radius must be a positive number.');
      }
      if (input.maxRadiusKm > 100) {
        errors.push('Maximum search radius cannot exceed 100 km.');
      }
    }

    const initial = input.initialRadiusKm !== undefined ? input.initialRadiusKm : this.cachedConfig?.initialRadiusKm ?? DEFAULT_DISPATCH_CONFIG.initialRadiusKm;
    const max = input.maxRadiusKm !== undefined ? input.maxRadiusKm : this.cachedConfig?.maxRadiusKm ?? DEFAULT_DISPATCH_CONFIG.maxRadiusKm;

    if (initial > max) {
      errors.push(`Initial radius (${initial} km) cannot be greater than maximum radius (${max} km).`);
    }

    if (input.expansionStages !== undefined) {
      if (!Array.isArray(input.expansionStages) || input.expansionStages.length === 0) {
        errors.push('Expansion stages must be a non-empty array of numbers.');
      } else {
        let prev = 0;
        for (let i = 0; i < input.expansionStages.length; i++) {
          const val = input.expansionStages[i];
          if (typeof val !== 'number' || val <= 0) {
            errors.push(`Stage ${i + 1} (${val} km) must be a positive number.`);
            break;
          }
          if (val < prev) {
            errors.push(`Expansion stages must be in ascending order (${prev} km > ${val} km).`);
            break;
          }
          if (val > max) {
            errors.push(`Expansion stage (${val} km) cannot exceed maximum radius (${max} km).`);
            break;
          }
          prev = val;
        }
      }
    }

    if (input.offerTimeoutSeconds !== undefined) {
      if (typeof input.offerTimeoutSeconds !== 'number' || input.offerTimeoutSeconds < 10 || input.offerTimeoutSeconds > 300) {
        errors.push('Provider offer timeout must be between 10 and 300 seconds.');
      }
    }

    if (input.expansionIntervalSeconds !== undefined) {
      if (typeof input.expansionIntervalSeconds !== 'number' || input.expansionIntervalSeconds < 10 || input.expansionIntervalSeconds > 600) {
        errors.push('Expansion interval must be between 10 and 600 seconds.');
      }
    }

    if (input.maxDispatchDurationSeconds !== undefined) {
      if (typeof input.maxDispatchDurationSeconds !== 'number' || input.maxDispatchDurationSeconds < 60 || input.maxDispatchDurationSeconds > 1800) {
        errors.push('Maximum dispatch duration must be between 60 seconds (1 min) and 1800 seconds (30 mins).');
      }
    }

    if (input.locationFreshnessThresholdSeconds !== undefined) {
      if (typeof input.locationFreshnessThresholdSeconds !== 'number' || input.locationFreshnessThresholdSeconds < 30 || input.locationFreshnessThresholdSeconds > 600) {
        errors.push('Location freshness threshold must be between 30 and 600 seconds.');
      }
    }

    if (input.maxConcurrentOffers !== undefined) {
      if (typeof input.maxConcurrentOffers !== 'number' || input.maxConcurrentOffers < 1 || input.maxConcurrentOffers > 10) {
        errors.push('Max concurrent offers must be between 1 and 10.');
      }
    }

    if (input.dispatchMode !== undefined && !['PROGRESSIVE_EXPANSION', 'FIXED_RADIUS'].includes(input.dispatchMode)) {
      errors.push('Dispatch mode must be either PROGRESSIVE_EXPANSION or FIXED_RADIUS.');
    }

    if (input.dispatchStrategy !== undefined && !['SEQUENTIAL', 'BATCH'].includes(input.dispatchStrategy)) {
      errors.push('Dispatch strategy must be either SEQUENTIAL or BATCH.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Authoritative read from database with in-memory caching and automatic convergence
   */
  public async getConfig(forceReload: boolean = false): Promise<DispatchConfig> {
    const now = Date.now();
    if (!forceReload && this.cachedConfig && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedConfig;
    }

    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: 'DISPATCH_CONFIGURATION' },
      });

      if (setting?.value) {
        const parsed = JSON.parse(setting.value);
        this.cachedConfig = {
          ...DEFAULT_DISPATCH_CONFIG,
          ...parsed,
          updatedAt: setting.updatedAt ? setting.updatedAt.toISOString() : parsed.updatedAt || new Date().toISOString(),
        };
      } else {
        // Seed default config into DB if missing
        this.cachedConfig = { ...DEFAULT_DISPATCH_CONFIG };
        await prisma.platformSetting.create({
          data: {
            key: 'DISPATCH_CONFIGURATION',
            value: JSON.stringify(DEFAULT_DISPATCH_CONFIG),
            description: 'Authoritative dynamic dispatch and geospatial provider discovery configuration',
          },
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[DispatchConfigService] Failed to load config from database, using cached/defaults:', err);
      if (!this.cachedConfig) {
        this.cachedConfig = { ...DEFAULT_DISPATCH_CONFIG };
      }
    }

    this.lastFetchTime = now;
    return this.cachedConfig || DEFAULT_DISPATCH_CONFIG;
  }

  /**
   * Get effective configuration for a given service category or slug, resolving overrides
   */
  public async getEffectiveConfig(serviceSlugOrCategory?: string): Promise<DispatchConfig & { effectiveInitialRadiusKm: number; effectiveMaxRadiusKm: number }> {
    const base = await this.getConfig();
    let initial = base.initialRadiusKm;
    let max = base.maxRadiusKm;
    let strategy = base.dispatchStrategy;

    if (serviceSlugOrCategory && base.serviceSpecificOverrides) {
      const normalizedKey = serviceSlugOrCategory.toLowerCase().trim();
      const override =
        base.serviceSpecificOverrides[normalizedKey] ||
        Object.entries(base.serviceSpecificOverrides).find(([k]) => normalizedKey.includes(k.toLowerCase()))?.[1];

      if (override) {
        if (typeof override.initialRadiusKm === 'number' && override.initialRadiusKm > 0) {
          initial = override.initialRadiusKm;
        }
        if (typeof override.maxRadiusKm === 'number' && override.maxRadiusKm >= initial) {
          max = override.maxRadiusKm;
        }
        if (override.dispatchStrategy) {
          strategy = override.dispatchStrategy;
        }
      }
    }

    return {
      ...base,
      dispatchStrategy: strategy,
      effectiveInitialRadiusKm: initial,
      effectiveMaxRadiusKm: max,
    };
  }

  /**
   * Update configuration dynamically from Admin Dashboard
   */
  public async updateConfig(
    updates: Partial<DispatchConfig>,
    updatedBy: string = 'admin@homeservex.com'
  ): Promise<DispatchConfig> {
    const validation = this.validateConfig(updates);
    if (!validation.valid) {
      throw new Error(`Validation Error: ${validation.errors.join('; ')}`);
    }

    const current = await this.getConfig(true);
    const newVersion = (current.version || 1) + 1;
    const updatedAt = new Date().toISOString();

    const merged: DispatchConfig = {
      ...current,
      ...updates,
      version: newVersion,
      updatedBy,
      updatedAt,
    };

    // If max radius was reduced, ensure expansion stages don't exceed it
    if (merged.expansionStages && merged.maxRadiusKm) {
      merged.expansionStages = merged.expansionStages.filter((s) => s <= merged.maxRadiusKm);
      if (merged.expansionStages.length === 0 || merged.expansionStages[merged.expansionStages.length - 1] !== merged.maxRadiusKm) {
        merged.expansionStages.push(merged.maxRadiusKm);
        merged.expansionStages.sort((a, b) => a - b);
      }
    }

    // Persist to database
    await prisma.platformSetting.upsert({
      where: { key: 'DISPATCH_CONFIGURATION' },
      update: {
        value: JSON.stringify(merged),
        updatedAt: new Date(),
      },
      create: {
        key: 'DISPATCH_CONFIGURATION',
        value: JSON.stringify(merged),
        description: 'Authoritative dynamic dispatch and geospatial provider discovery configuration',
      },
    });

    // Record immutable audit log
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE_DISPATCH_CONFIGURATION',
        resource: 'PlatformSetting',
        resourceId: 'DISPATCH_CONFIGURATION',
        details: JSON.stringify({
          updatedBy,
          version: newVersion,
          changes: updates,
          effectiveConfig: {
            initialRadiusKm: merged.initialRadiusKm,
            maxRadiusKm: merged.maxRadiusKm,
            dispatchMode: merged.dispatchMode,
            expansionStages: merged.expansionStages,
          },
        }),
      },
    }).catch(() => {});

    // Update in-memory cache immediately
    this.cachedConfig = merged;
    this.lastFetchTime = Date.now();

    return merged;
  }

  /**
   * Invalidate local cache to force reload on next query
   */
  public invalidateCache(): void {
    this.cachedConfig = null;
    this.lastFetchTime = 0;
  }
}

export const dispatchConfigService = DispatchConfigService.getInstance();
