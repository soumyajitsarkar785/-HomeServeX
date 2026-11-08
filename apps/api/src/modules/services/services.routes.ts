import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { getOrCreateCustomerOtp } from '../bookings/bookings.routes.js';

export const servicesRouter = Router();

let catalogEnsured = false;

/**
 * Self-healing DB migration helper for SQLite dev.db
 */
async function ensureDbColumns() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN "strikethroughPricePaise" INTEGER;`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN "rating" REAL DEFAULT 4.8;`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN "reviewCount" INTEGER DEFAULT 120;`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN "badge" TEXT;`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN "isPopular" BOOLEAN DEFAULT 0;`);
  } catch {}
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ApplianceAsset" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "applianceType" TEXT NOT NULL,
        "name" TEXT,
        "brand" TEXT,
        "modelNumber" TEXT,
        "serialNumber" TEXT,
        "healthScore" INTEGER NOT NULL DEFAULT 88,
        "status" TEXT NOT NULL DEFAULT 'GOOD',
        "icon" TEXT,
        "lastServiceDate" DATETIME,
        "lastServiceNotes" TEXT,
        "nextServiceDueDate" DATETIME,
        "recommendedServiceSlug" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ApplianceAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
  } catch {}
}

/**
 * Realistic Indian Catalog Seeder (Categories, Services, Addons, Membership Plans)
 */
async function ensureCatalog() {
  if (catalogEnsured) return;
  try {
    await ensureDbColumns();

    const categoriesData = [
      {
        slug: 'ac-servicing',
        name: 'AC Servicing & Repair',
        description: 'Comprehensive cooling checks, deep filter washing, gas charging, and installation.',
        iconUrl: '❄️',
        displayOrder: 1,
      },
      {
        slug: 'washing-machine',
        name: 'Washing Machine Repair',
        description: 'Drum overhaul, spin motor repairs, inlet valve diagnostics, and motherboard fixes.',
        iconUrl: '🧺',
        displayOrder: 2,
      },
      {
        slug: 'refrigerator',
        name: 'Refrigerator Repair',
        description: 'Cooling diagnostics, compressor relay, defrost timer, and genuine refrigerant recharge.',
        iconUrl: '🧊',
        displayOrder: 3,
      },
      {
        slug: 'water-purifier',
        name: 'Water Purifier (RO) Service',
        description: 'RO membrane replacement, sediment filter flush, TDS level calibration, and UV bulb check.',
        iconUrl: '💧',
        displayOrder: 4,
      },
      {
        slug: 'cleaning',
        name: 'Deep Cleaning Services',
        description: 'Intensive bathroom scrubbing, kitchen degreasing, and sofa upholstery sanitization.',
        iconUrl: '🧹',
        displayOrder: 5,
      },
      {
        slug: 'electrical',
        name: 'Electrical Repairs',
        description: 'Licensed technicians for wiring, switchboards, short circuits, and ceiling fan mounting.',
        iconUrl: '⚡',
        displayOrder: 6,
      },
      {
        slug: 'plumbing',
        name: 'Plumbing Services',
        description: 'Expert tap repairs, pipe leak fixes, bathroom fittings, and drain unclogging.',
        iconUrl: '🔧',
        displayOrder: 7,
      },
      {
        slug: 'microwave',
        name: 'Microwave Oven Repair',
        description: 'Magnetron heating repair, high-voltage diode check, and turntable motor replacement.',
        iconUrl: '📻',
        displayOrder: 8,
      },
      {
        slug: 'geyser',
        name: 'Geyser Service',
        description: 'Instant & storage geyser heating element replacement, thermostat repair, and scaling flush.',
        iconUrl: '🔥',
        displayOrder: 9,
      },
    ];

    // Seed Categories
    const categoryMap = new Map<string, string>();
    for (const cat of categoriesData) {
      const category = await prisma.serviceCategory.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name, description: cat.description, iconUrl: cat.iconUrl, displayOrder: cat.displayOrder, isActive: true },
        create: { slug: cat.slug, name: cat.name, description: cat.description, iconUrl: cat.iconUrl, displayOrder: cat.displayOrder, isActive: true },
      });
      categoryMap.set(cat.slug, category.id);
    }

    // Realistic Services List (Indian Pricing in paise, Realistic Duration, High-Res Images, Badges, Ratings)
    const servicesData = [
      // ── AC Servicing ──
      {
        categorySlug: 'ac-servicing',
        slug: 'split-ac-regular-service',
        name: 'Split AC Power Jet Cleaning',
        description: 'Pressure jet wash of indoor cooling coils, outdoor condenser unit, drainage tray sanitization & gas level check.',
        basePricePaise: 69900,
        strikethroughPricePaise: 89900,
        estimatedDurationMinutes: 60,
        rating: 4.8,
        reviewCount: 2450,
        badge: 'Recommended',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'Anti-Bacterial Foam Jet Sanitization', priceDeltaPaise: 14900, durationDeltaMinutes: 15 },
          { name: 'Outdoor Condenser Chemical Coil Flush', priceDeltaPaise: 19900, durationDeltaMinutes: 20 },
        ],
      },
      {
        categorySlug: 'ac-servicing',
        slug: 'ac-gas-topup',
        name: 'AC Gas Top-up & Leak Check (R32/R410)',
        description: 'Nitrogen pressure testing, copper valve leak brazing, vacuum evacuation, and pure R32/R410 refrigerant recharge.',
        basePricePaise: 129900,
        strikethroughPricePaise: 169900,
        estimatedDurationMinutes: 75,
        rating: 4.9,
        reviewCount: 1820,
        badge: 'Most Booked',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'High-Pressure Nitrogen Leakage Search', priceDeltaPaise: 29900, durationDeltaMinutes: 20 },
          { name: 'Compressor Run Capacitor Replacement', priceDeltaPaise: 39900, durationDeltaMinutes: 15 },
        ],
      },
      {
        categorySlug: 'ac-servicing',
        slug: 'split-ac-installation',
        name: 'Split AC Installation & Uninstallation',
        description: 'Precision bracket mounting, copper pipe flare connection, vacuum purge, and cooling air flow calibration.',
        basePricePaise: 119900,
        strikethroughPricePaise: 149900,
        estimatedDurationMinutes: 90,
        rating: 4.8,
        reviewCount: 920,
        badge: 'Expert Fit',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'ac-servicing',
        slug: 'window-ac-service',
        name: 'Window AC Deep Jet Cleaning',
        description: 'Complete slide-out chassis washing, coil descaling, blower motor oiling, and dust filter sanitization.',
        basePricePaise: 54900,
        strikethroughPricePaise: 69900,
        estimatedDurationMinutes: 45,
        rating: 4.7,
        reviewCount: 740,
        badge: 'Value Pack',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Washing Machine ──
      {
        categorySlug: 'washing-machine',
        slug: 'washing-machine-overhaul',
        name: 'Washing Machine Drum & Motor Overhaul',
        description: 'Full spin vibration calibration, inlet valve descaling, belt tension check, and drain pump unclogging.',
        basePricePaise: 44900,
        strikethroughPricePaise: 59900,
        estimatedDurationMinutes: 60,
        rating: 4.8,
        reviewCount: 950,
        badge: 'Recommended',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'Drainage Pipe & Filter Deep Descaling', priceDeltaPaise: 9900, durationDeltaMinutes: 15 },
          { name: 'Drum Suspension Shock Absorber Tuning', priceDeltaPaise: 24900, durationDeltaMinutes: 20 },
        ],
      },
      {
        categorySlug: 'washing-machine',
        slug: 'washing-machine-descaling',
        name: 'Front & Top Load Chemical Descaling',
        description: 'High-temperature drum cleaning with food-grade citric descaling compound to remove lime-scale, odor, and detergent buildup.',
        basePricePaise: 34900,
        strikethroughPricePaise: 49900,
        estimatedDurationMinutes: 45,
        rating: 4.9,
        reviewCount: 1250,
        badge: 'Instant 45m',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'washing-machine',
        slug: 'washing-machine-pcb-repair',
        name: 'PCB Circuit & Motor Sensor Diagnostics',
        description: 'Motherboard circuit diagnostics, error code reset (E01, UE, dE), and inverter motor hall sensor testing.',
        basePricePaise: 79900,
        strikethroughPricePaise: 109900,
        estimatedDurationMinutes: 60,
        rating: 4.7,
        reviewCount: 430,
        badge: 'Genuine Spares',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Refrigerator ──
      {
        categorySlug: 'refrigerator',
        slug: 'fridge-cooling-diagnostics',
        name: 'Refrigerator Cooling Diagnostics & Gas Recharge',
        description: 'Complete cooling coil testing, relay/overload protector check, and thermostat temperature calibration.',
        basePricePaise: 54900,
        strikethroughPricePaise: 74900,
        estimatedDurationMinutes: 60,
        rating: 4.8,
        reviewCount: 1420,
        badge: 'Bestseller',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'Magnetic Door Gasket Seal Replacement', priceDeltaPaise: 29900, durationDeltaMinutes: 15 },
        ],
      },
      {
        categorySlug: 'refrigerator',
        slug: 'fridge-compressor-repair',
        name: 'Inverter Compressor Relay & Coil Repair',
        description: 'Diagnostic troubleshooting of non-cooling fridge, clicking noises, PTC starter relay, and genuine refrigerant recharge.',
        basePricePaise: 89900,
        strikethroughPricePaise: 129900,
        estimatedDurationMinutes: 75,
        rating: 4.9,
        reviewCount: 810,
        badge: 'Warranty Covered',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Water Purifier (RO) ──
      {
        categorySlug: 'water-purifier',
        slug: 'ro-filter-service',
        name: 'Water Purifier RO Membrane & Filter Service',
        description: 'Multi-stage RO membrane inspection, sediment filter flush, TDS balance testing, and UV chamber sterilize check.',
        basePricePaise: 49900,
        strikethroughPricePaise: 69900,
        estimatedDurationMinutes: 50,
        rating: 4.9,
        reviewCount: 3200,
        badge: 'Pure Water',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'Pre-Carbon & Sediment Filter Kit Replacement', priceDeltaPaise: 29900, durationDeltaMinutes: 20 },
          { name: 'Alkaline Mineral Cartridge Boost', priceDeltaPaise: 19900, durationDeltaMinutes: 15 },
        ],
      },
      {
        categorySlug: 'water-purifier',
        slug: 'ro-membrane-copper-alkaline',
        name: 'RO Membrane + Copper Alkaline Upgrade',
        description: 'Upgrade your existing RO purifier with 80 GPD Filmtec membrane and Bio-Copper alkaline mineralizer.',
        basePricePaise: 149900,
        strikethroughPricePaise: 199900,
        estimatedDurationMinutes: 60,
        rating: 4.9,
        reviewCount: 1650,
        badge: 'Immunity Boost',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'water-purifier',
        slug: 'uv-tds-calibration',
        name: 'TDS Water Calibration & UV Chamber Check',
        description: 'Laser TDS meter testing, mineral balancer adjustment, UV lamp intensity verification, and pressure pump check.',
        basePricePaise: 29900,
        strikethroughPricePaise: 39900,
        estimatedDurationMinutes: 30,
        rating: 4.8,
        reviewCount: 520,
        badge: 'Express 30m',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Deep Cleaning ──
      {
        categorySlug: 'cleaning',
        slug: 'deep-bathroom-cleaning',
        name: 'Intensive Bathroom Tile & Grout Scrub',
        description: 'Hard-water stain removal, floor tile rotary scrubbing, fixture descaling, and mirror buffing.',
        basePricePaise: 59900,
        strikethroughPricePaise: 79900,
        estimatedDurationMinutes: 90,
        rating: 4.7,
        reviewCount: 3100,
        badge: 'Combo Offer',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'Anti-Mold Grout Chemical Shield', priceDeltaPaise: 14900, durationDeltaMinutes: 15 },
        ],
      },
      {
        categorySlug: 'cleaning',
        slug: 'kitchen-deep-degreasing',
        name: 'Modular Kitchen Deep Degreasing & Sanitization',
        description: 'Exhaust chimney degreasing, slab scrubbing, oil stain removal from tiles, and sink sanitization.',
        basePricePaise: 129900,
        strikethroughPricePaise: 169900,
        estimatedDurationMinutes: 120,
        rating: 4.8,
        reviewCount: 2200,
        badge: 'Zero Oil',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'cleaning',
        slug: 'sofa-upholstery-cleaning',
        name: '5-Seater Sofa Foam Shampoo & Dust Mite Extraction',
        description: 'Deep extraction vacuuming, organic chemical foam shampooing, and fabric conditioning for soft upholstery.',
        basePricePaise: 89900,
        strikethroughPricePaise: 119900,
        estimatedDurationMinutes: 75,
        rating: 4.8,
        reviewCount: 1950,
        badge: 'Fabric Safe',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'cleaning',
        slug: 'full-home-deep-cleaning',
        name: 'Complete 2BHK Deep Cleaning',
        description: 'Floor scrubbing machines, balcony wash, window glass cleaning, bathroom & kitchen deep sanitization.',
        basePricePaise: 299900,
        strikethroughPricePaise: 399900,
        estimatedDurationMinutes: 240,
        rating: 4.9,
        reviewCount: 890,
        badge: 'Festive Special',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Electrical ──
      {
        categorySlug: 'electrical',
        slug: 'switchboard-repair',
        name: 'Switch & Socket Replacement',
        description: 'Safety check, rewiring, and installation of modular switches, indicators, and 16A power plugs.',
        basePricePaise: 24900,
        strikethroughPricePaise: 34900,
        estimatedDurationMinutes: 30,
        rating: 4.8,
        reviewCount: 1540,
        badge: 'Licensed Tech',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'electrical',
        slug: 'ceiling-fan-installation',
        name: 'Ceiling Fan Installation & Repair',
        description: 'Secure rod hanging, safety pin check, electronic regulator alignment, and motor vibration fixes.',
        basePricePaise: 34900,
        strikethroughPricePaise: 49900,
        estimatedDurationMinutes: 45,
        rating: 4.8,
        reviewCount: 2120,
        badge: 'Quick Visit',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'electrical',
        slug: 'mcb-inverter-wiring',
        name: 'MCB Tripping & Inverter Backup Wiring',
        description: 'Short-circuit detection with megohmmeter, MCB fuse replacement, and inverter battery terminal cleaning.',
        basePricePaise: 49900,
        strikethroughPricePaise: 69900,
        estimatedDurationMinutes: 60,
        rating: 4.9,
        reviewCount: 670,
        badge: 'Heavy Duty',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Plumbing ──
      {
        categorySlug: 'plumbing',
        slug: 'tap-leak-repair',
        name: 'Tap & Shower Leak Repair',
        description: 'Fix dripping taps, loose mixer handles, broken washers, aerators, and low water pressure issues.',
        basePricePaise: 29900,
        strikethroughPricePaise: 39900,
        estimatedDurationMinutes: 45,
        rating: 4.7,
        reviewCount: 1800,
        badge: 'Fast 45m',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'plumbing',
        slug: 'drain-blockage-removal',
        name: 'Drain Blockage Removal',
        description: 'High-pressure unclogging of kitchen sinks, bathroom floor traps, bottle traps, and sewer drainage pipes.',
        basePricePaise: 49900,
        strikethroughPricePaise: 69900,
        estimatedDurationMinutes: 60,
        rating: 4.8,
        reviewCount: 1350,
        badge: 'High Pressure',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
      {
        categorySlug: 'plumbing',
        slug: 'toilet-flush-cistern-repair',
        name: 'Toilet Flush Cistern & Jet Spray Overhaul',
        description: 'Cistern siphon valve replacement, water inlet ball valve calibration, and new health faucet jet install.',
        basePricePaise: 39900,
        strikethroughPricePaise: 54900,
        estimatedDurationMinutes: 45,
        rating: 4.8,
        reviewCount: 890,
        badge: 'Sanitized',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
        options: [],
      },

      // ── Microwave Oven ──
      {
        categorySlug: 'microwave',
        slug: 'microwave-heating-repair',
        name: 'Microwave Magnetron & Heating Repair',
        description: 'Magnetron output inspection, high-voltage diode and capacitor safety testing, and door interlock repair.',
        basePricePaise: 39900,
        strikethroughPricePaise: 54900,
        estimatedDurationMinutes: 45,
        rating: 4.8,
        reviewCount: 640,
        badge: 'Certified',
        isPopular: false,
        imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=800&q=80',
        options: [
          { name: 'Turntable Motor Roller Alignment', priceDeltaPaise: 9900, durationDeltaMinutes: 10 },
        ],
      },
      // ── Geyser ──
      {
        categorySlug: 'geyser',
        slug: 'geyser-service',
        name: 'Geyser Service & Repair',
        description: 'Instant & storage geyser heating element replacement, thermostat calibration, hard-water scaling flush, and safety valve check.',
        basePricePaise: 24900,
        strikethroughPricePaise: 39900,
        estimatedDurationMinutes: 30,
        rating: 4.8,
        reviewCount: 780,
        badge: 'Express 30m',
        isPopular: true,
        imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        options: [],
      },
    ];

    for (const svc of servicesData) {
      const categoryId = categoryMap.get(svc.categorySlug);
      if (!categoryId) continue;

      const record = await prisma.service.upsert({
        where: { slug: svc.slug },
        update: {
          categoryId,
          name: svc.name,
          description: svc.description,
          basePricePaise: svc.basePricePaise,
          estimatedDurationMinutes: svc.estimatedDurationMinutes,
          imageUrl: svc.imageUrl,
          isActive: true,
        },
        create: {
          categoryId,
          name: svc.name,
          slug: svc.slug,
          description: svc.description,
          basePricePaise: svc.basePricePaise,
          estimatedDurationMinutes: svc.estimatedDurationMinutes,
          imageUrl: svc.imageUrl,
          isActive: true,
        },
      });

      // Synchronize optional extended attributes safely
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "Service" SET "strikethroughPricePaise" = ?, "rating" = ?, "reviewCount" = ?, "badge" = ?, "isPopular" = ? WHERE "id" = ?`,
          svc.strikethroughPricePaise ?? Math.round(svc.basePricePaise * 1.3),
          svc.rating ?? 4.8,
          svc.reviewCount ?? 120,
          svc.badge ?? null,
          svc.isPopular ? 1 : 0,
          record.id
        );
      } catch {
        // Graceful fallback if SQLite schema has not been migrated
      }

      if (svc.options && svc.options.length > 0) {
        for (const opt of svc.options) {
          const existingOpt = await prisma.serviceOption.findFirst({
            where: { serviceId: record.id, name: opt.name },
          });
          if (!existingOpt) {
            await prisma.serviceOption.create({
              data: {
                serviceId: record.id,
                name: opt.name,
                priceDeltaPaise: opt.priceDeltaPaise,
                durationDeltaMinutes: opt.durationDeltaMinutes,
              },
            });
          }
        }
      }
    }

    // Seed Membership Plans in PlatformSetting
    await prisma.platformSetting.upsert({
      where: { key: 'MEMBERSHIP_PLANS' },
      update: {
        value: JSON.stringify([
          {
            id: 'plan-plus-annual',
            name: 'HomeServeX Plus',
            badge: 'VIP Member',
            pricePaise: 99900,
            originalPricePaise: 199900,
            validityMonths: 12,
            discountPercentage: 10,
            benefits: [
              'Flat 10% instant discount on all service bookings',
              'Free doorstep inspection on every visit (Save ₹199 each)',
              'Priority technician dispatch under 30 minutes',
              'Zero cancellation charges anytime',
              'Dedicated 24x7 VIP Support Manager',
            ],
            isActive: true,
          },
        ]),
      },
      create: {
        key: 'MEMBERSHIP_PLANS',
        value: JSON.stringify([
          {
            id: 'plan-plus-annual',
            name: 'HomeServeX Plus',
            badge: 'VIP Member',
            pricePaise: 99900,
            originalPricePaise: 199900,
            validityMonths: 12,
            discountPercentage: 10,
            benefits: [
              'Flat 10% instant discount on all service bookings',
              'Free doorstep inspection on every visit (Save ₹199 each)',
              'Priority technician dispatch under 30 minutes',
              'Zero cancellation charges anytime',
              'Dedicated 24x7 VIP Support Manager',
            ],
            isActive: true,
          },
        ]),
        description: 'Active customer membership tier configurations',
      },
    });

    // ── 5. Seed Authoritative Promotional Offers matching 19 Reference Screens ──
    const defaultOffers = [
      {
        id: 'offer-1',
        title: 'AC Service Discount',
        description: 'Get ₹200 OFF on AC service',
        discount: '₹200',
        discountType: 'FLAT',
        discountValue: 200,
        minOrderRupees: 999,
        validTill: '31 Mar 2025',
        status: 'Active',
        category: 'AC',
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-2',
        title: 'Flat 15% OFF',
        description: 'on All Appliance Repairs',
        discount: '15%',
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minOrderRupees: 499,
        validTill: '31 Mar 2025',
        status: 'Active',
        category: 'Appliances',
        imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-3',
        title: 'Free Inspection',
        description: 'on First Booking',
        discount: '100%',
        discountType: 'PERCENTAGE',
        discountValue: 100,
        minOrderRupees: 0,
        validTill: '31 Mar 2025',
        status: 'Active',
        category: 'All',
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-4',
        title: 'Plumbing Discount',
        description: 'Get ₹150 OFF on plumbing repairs',
        discount: '₹150',
        discountType: 'FLAT',
        discountValue: 150,
        minOrderRupees: 599,
        validTill: '30 Apr 2025',
        status: 'Active',
        category: 'Plumbing',
        imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-5',
        title: 'Cleaning Offer',
        description: 'Flat 10% discount on deep cleaning',
        discount: '10%',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderRupees: 699,
        validTill: '30 Apr 2025',
        status: 'Active',
        category: 'Cleaning',
        imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
      },
    ];

    await prisma.platformSetting.upsert({
      where: { key: 'PROMOTIONAL_OFFERS' },
      update: {},
      create: {
        key: 'PROMOTIONAL_OFFERS',
        value: JSON.stringify(defaultOffers),
        description: 'Authoritative promotional offers matching customer and admin reference screens',
      },
    });

    // ── 6. Seed Authoritative Users, Profiles, Addresses, and 5 Bookings ──
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Admin: Soumyajit Sarkar
    await prisma.user.upsert({
      where: { email: 'admin@homeservex.com' },
      update: { name: 'Soumyajit Sarkar', role: 'ADMIN', status: 'ACTIVE' },
      create: {
        email: 'admin@homeservex.com',
        phone: '+91 99999 00001',
        passwordHash,
        name: 'Soumyajit Sarkar',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Providers: Rohit Kumar, Amit Singh, Suresh Das, Pooja Roy, Rahul Mehta
    const rohitUser = await prisma.user.upsert({
      where: { email: 'rohit@homeservex.com' },
      update: { name: 'Rohit Kumar', phone: '+91 98765 43210', role: 'PROVIDER', status: 'ACTIVE' },
      create: {
        email: 'rohit@homeservex.com',
        phone: '+91 98765 43210',
        passwordHash,
        name: 'Rohit Kumar',
        role: 'PROVIDER',
        status: 'ACTIVE',
      },
    });

    const rohitProfile = await prisma.providerProfile.upsert({
      where: { userId: rohitUser.id },
      update: {
        skills: JSON.stringify(['ac-servicing', 'appliances']),
        verificationStatus: 'APPROVED',
        availabilityStatus: 'ONLINE',
        ratingAverage: 4.8,
        totalRatingsCount: 1200,
        completedJobsCount: 248,
        bio: 'Certified AC Technician with 5 years experience',
      },
      create: {
        userId: rohitUser.id,
        skills: JSON.stringify(['ac-servicing', 'appliances']),
        verificationStatus: 'APPROVED',
        availabilityStatus: 'ONLINE',
        ratingAverage: 4.8,
        totalRatingsCount: 1200,
        completedJobsCount: 248,
        bio: 'Certified AC Technician with 5 years experience',
      },
    });

    const providersData = [
      { email: 'amit.singh@homeservex.com', phone: '+91 87654 32109', name: 'Amit Singh', rating: 4.6, count: 180, skill: 'washing-machine', city: 'Howrah' },
      { email: 'suresh.das@homeservex.com', phone: '+91 76543 21098', name: 'Suresh Das', rating: 4.7, count: 215, skill: 'refrigerator', city: 'Durgapur' },
      { email: 'pooja.roy@homeservex.com', phone: '+91 65432 10987', name: 'Pooja Roy', rating: 4.5, count: 160, skill: 'cleaning', city: 'Siliguri' },
      { email: 'rahul.mehta@homeservex.com', phone: '+91 54321 09876', name: 'Rahul Mehta', rating: 4.3, count: 130, skill: 'plumbing', city: 'Kharagpur' },
    ];

    for (const p of providersData) {
      const u = await prisma.user.upsert({
        where: { email: p.email },
        update: { name: p.name, phone: p.phone, role: 'PROVIDER', status: 'ACTIVE' },
        create: { email: p.email, phone: p.phone, passwordHash, name: p.name, role: 'PROVIDER', status: 'ACTIVE' },
      });
      await prisma.providerProfile.upsert({
        where: { userId: u.id },
        update: { skills: JSON.stringify([p.skill]), verificationStatus: 'APPROVED', availabilityStatus: 'ONLINE', ratingAverage: p.rating, completedJobsCount: p.count },
        create: { userId: u.id, skills: JSON.stringify([p.skill]), verificationStatus: 'APPROVED', availabilityStatus: 'ONLINE', ratingAverage: p.rating, completedJobsCount: p.count },
      });
    }

    // Customers: Soumyajit Sarkar, Rahul Sharma, Priya Das, Amit Roy, Sneha Paul, Suman Ghosh
    const customersData = [
      { email: 'soumyajit@gmail.com', name: 'Soumyajit Sarkar', phone: '+91 91234 56789' },
      { email: 'rahul.sharma@gmail.com', name: 'Rahul Sharma', phone: '+91 98765 43201' },
      { email: 'priya.das@gmail.com', name: 'Priya Das', phone: '+91 98765 43211' },
      { email: 'amit.roy@gmail.com', name: 'Amit Roy', phone: '+91 98765 43212' },
      { email: 'sneha.paul@gmail.com', name: 'Sneha Paul', phone: '+91 98765 43213' },
      { email: 'suman.ghosh@gmail.com', name: 'Suman Ghosh', phone: '+91 98765 43214' },
    ];

    const customerMap = new Map<string, string>();
    for (const c of customersData) {
      try {
        const u = await prisma.user.upsert({
          where: { email: c.email },
          update: { name: c.name, role: 'CUSTOMER', status: 'ACTIVE' },
          create: { email: c.email, name: c.name, phone: c.phone, passwordHash, role: 'CUSTOMER', status: 'ACTIVE' },
        });
        const cp = await prisma.customerProfile.upsert({
          where: { userId: u.id },
          update: {},
          create: { userId: u.id },
        });
        customerMap.set(c.email, cp.id);
      } catch {
        // Fallback find if already created with different phone
        const existing = await prisma.user.findFirst({ where: { email: c.email } });
        if (existing) {
          const cp = await prisma.customerProfile.findUnique({ where: { userId: existing.id } });
          if (cp) customerMap.set(c.email, cp.id);
        }
      }

      const customerProfileId = customerMap.get(c.email);
      if (customerProfileId) {
        const existingAddr = await prisma.address.findFirst({ where: { customerId: customerProfileId, streetAddress: '2218 Baker Street' } });
        if (!existingAddr) {
          await prisma.address.create({
            data: {
              customerId: customerProfileId,
              label: 'Home',
              streetAddress: '2218 Baker Street',
              landmark: 'Near Regent Park',
              city: 'London',
              state: 'London',
              postalCode: 'NW1 6AE',
              latitude: 51.5237,
              longitude: -0.1585,
              isDefault: true,
            },
          });
        }
      }
    }

    // Seed the 5 Authoritative Bookings
    const addr = await prisma.address.findFirst({ where: { streetAddress: '2218 Baker Street' } });
    const acService = await prisma.service.findFirst({ where: { slug: 'split-ac-regular-service' } });
    const wmService = await prisma.service.findFirst({ where: { slug: 'washing-machine-overhaul' } });
    const fridgeService = await prisma.service.findFirst({ where: { slug: 'fridge-cooling-diagnostics' } });
    const microService = await prisma.service.findFirst({ where: { slug: 'microwave-heating-repair' } });
    const roService = await prisma.service.findFirst({ where: { slug: 'ro-filter-service' } });

    if (addr && acService && wmService && fridgeService && microService && roService) {
      const rahulProfileId = customerMap.get('rahul.sharma@gmail.com') || customerMap.get('soumyajit@gmail.com')!;
      const priyaProfileId = customerMap.get('priya.das@gmail.com') || rahulProfileId;
      const amitProfileId = customerMap.get('amit.roy@gmail.com') || rahulProfileId;
      const snehaProfileId = customerMap.get('sneha.paul@gmail.com') || rahulProfileId;
      const sumanProfileId = customerMap.get('suman.ghosh@gmail.com') || rahulProfileId;

      // 1. #HSX123456: Rahul Sharma | AC Service | ₹299 | On the way | 12 Mar 2025
      const b1 = await prisma.booking.upsert({
        where: { referenceNumber: 'HSX123456' },
        update: {
          status: 'PROVIDER_EN_ROUTE',
          currentEtaMinutes: 12,
          assignedProviderId: rohitProfile.id,
          totalAmountPaise: 29900,
          baseAmountPaise: 29900,
          providerEarningsPaise: 29900,
        },
        create: {
          referenceNumber: 'HSX123456',
          customerId: rahulProfileId,
          serviceId: acService.id,
          addressId: addr.id,
          scheduledSlot: new Date('2025-03-12T12:30:00Z'),
          status: 'PROVIDER_EN_ROUTE',
          currentEtaMinutes: 12,
          assignedProviderId: rohitProfile.id,
          baseAmountPaise: 29900,
          totalAmountPaise: 29900,
          providerEarningsPaise: 29900,
          notes: 'Customer requested quick filter check',
          createdAt: new Date('2025-03-12T10:12:00Z'),
        },
      });

      // Generate and persist random customer OTPs (Zero reference derivation / zero constant fallbacks)
      await getOrCreateCustomerOtp(b1.id, 'START_SERVICE');
      await getOrCreateCustomerOtp(b1.id, 'COMPLETE_SERVICE');

      // 2. #HSX123455: Priya Das | Washing Machine | ₹249 | Completed | 10 Mar 2025
      await prisma.booking.upsert({
        where: { referenceNumber: 'HSX123455' },
        update: { status: 'COMPLETED', paymentStatus: 'PAID', totalAmountPaise: 24900 },
        create: {
          referenceNumber: 'HSX123455',
          customerId: priyaProfileId,
          serviceId: wmService.id,
          addressId: addr.id,
          scheduledSlot: new Date('2025-03-10T11:15:00Z'),
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          baseAmountPaise: 24900,
          totalAmountPaise: 24900,
          providerEarningsPaise: 24900,
          createdAt: new Date('2025-03-10T11:00:00Z'),
        },
      });

      // 3. #HSX123454: Amit Roy | Refrigerator | ₹299 | Completed | 8 Mar 2025
      await prisma.booking.upsert({
        where: { referenceNumber: 'HSX123454' },
        update: { status: 'COMPLETED', paymentStatus: 'PAID', totalAmountPaise: 29900 },
        create: {
          referenceNumber: 'HSX123454',
          customerId: amitProfileId,
          serviceId: fridgeService.id,
          addressId: addr.id,
          scheduledSlot: new Date('2025-03-08T09:40:00Z'),
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          baseAmountPaise: 29900,
          totalAmountPaise: 29900,
          providerEarningsPaise: 29900,
          createdAt: new Date('2025-03-08T09:30:00Z'),
        },
      });

      // 4. #HSX123453: Sneha Paul | Microwave Oven | ₹199 | Cancelled | 5 Mar 2025
      await prisma.booking.upsert({
        where: { referenceNumber: 'HSX123453' },
        update: { status: 'CANCELLED', totalAmountPaise: 19900 },
        create: {
          referenceNumber: 'HSX123453',
          customerId: snehaProfileId,
          serviceId: microService.id,
          addressId: addr.id,
          scheduledSlot: new Date('2025-03-05T16:00:00Z'),
          status: 'CANCELLED',
          baseAmountPaise: 19900,
          totalAmountPaise: 19900,
          cancellationReason: 'Customer rescheduled travel plans',
          createdAt: new Date('2025-03-05T15:00:00Z'),
        },
      });

      // 5. #HSX123452: Suman Ghosh | Water Purifier | ₹249 | Pending | 2 Mar 2025
      await prisma.booking.upsert({
        where: { referenceNumber: 'HSX123452' },
        update: { status: 'PENDING', totalAmountPaise: 24900 },
        create: {
          referenceNumber: 'HSX123452',
          customerId: sumanProfileId,
          serviceId: roService.id,
          addressId: addr.id,
          scheduledSlot: new Date('2025-03-02T10:00:00Z'),
          status: 'PENDING',
          baseAmountPaise: 24900,
          totalAmountPaise: 24900,
          createdAt: new Date('2025-03-02T09:50:00Z'),
        },
      });
    }

    catalogEnsured = true;
    console.log('[HomeServeX] Catalog ensured and seeded with 22+ realistic production services.');
  } catch (err: any) {
    console.warn('[HomeServeX] Catalog seed notice (non-fatal):', err.message || err);
    // Non-fatal: do not crash API process so server continues listening
  }
}

// Trigger initial ensure on load
ensureCatalog();

// GET /api/v1/services/seed-catalog — Dedicated HTTP Trigger for DB Seeding
servicesRouter.all('/seed-catalog', async (_req, res: Response) => {
  try {
    catalogEnsured = false;
    await ensureCatalog();
    const count = await prisma.service.count();
    const catCount = await prisma.serviceCategory.count();
    res.json({
      success: true,
      message: 'Catalog migration & seed completed successfully',
      stats: { totalCategories: catCount, totalServices: count },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/membership-plans — HomeServeX Plus & Loyalty Programs
servicesRouter.get('/membership-plans', async (_req, res: Response) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'MEMBERSHIP_PLANS' },
    });
    let plans = [];
    if (setting?.value) {
      try {
        plans = JSON.parse(setting.value);
      } catch {}
    }
    res.json({ success: true, data: plans });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/banners — Public promotional banners for Customer App (customized by Admin)
servicesRouter.get('/banners', async (_req, res: Response) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'PROMOTIONAL_BANNERS' },
    });
    const defaultBanners = [
      {
        id: 'banner-default-hero',
        badge: '⚡ FAST. RELIABLE. TRUSTED.',
        title: 'We fix it today,',
        highlightTitle: 'so you can relax tomorrow.',
        subtitle: 'Certified experts at your doorstep in as little as 30 minutes with upfront transparent pricing.',
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
        ctaText: 'Book Service',
        ctaTarget: '#recommended-section',
        discountBadge: '10K+ Happy Customers',
        isActive: true,
        displayOrder: 1,
        createdAt: new Date().toISOString(),
      },
    ];
    let banners = defaultBanners;
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) banners = parsed;
      } catch {}
    }
    res.json({ success: true, data: banners.filter((b: any) => b.isActive !== false) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/offers — Public promotional offers & coupons for Customer App (customized by Admin)
servicesRouter.get('/offers', async (_req, res: Response) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'PROMOTIONAL_OFFERS' },
    });
    const defaultOffers = [
      { id: 'offer-1', title: 'AC Service Discount', description: 'Get ₹200 OFF on AC service', discount: '₹200', discountType: 'FLAT', discountValue: 200, minOrder: 'Min. order ₹999', validity: 'Valid till 31 Mar 2025', status: 'Active', category: 'AC', code: 'AC200', imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80' },
      { id: 'offer-2', title: 'Flat 15% OFF', description: 'on All Appliance Repairs', discount: '15%', discountType: 'PERCENTAGE', discountValue: 15, minOrder: 'Min. order ₹499', validity: 'Valid till 31 Mar 2025', status: 'Active', category: 'Appliances', code: 'FLAT15', imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80' },
      { id: 'offer-3', title: 'Free Inspection', description: 'on First Booking', discount: '100%', discountType: 'PERCENTAGE', discountValue: 100, minOrder: 'Zero minimum order', validity: 'Valid till 31 Mar 2025', status: 'Active', category: 'All', code: 'FREEINSPECT', imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80' },
      { id: 'offer-4', title: 'Plumbing Discount', description: 'Get ₹150 OFF on plumbing repairs', discount: '₹150', discountType: 'FLAT', discountValue: 150, minOrder: 'Min. order ₹599', validity: 'Valid till 30 Apr 2025', status: 'Active', category: 'Plumbing', code: 'PLUMB150', imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80' },
      { id: 'offer-5', title: 'Cleaning Offer', description: 'Flat 10% discount on deep cleaning', discount: '10%', discountType: 'PERCENTAGE', discountValue: 10, minOrder: 'Min. order ₹699', validity: 'Valid till 30 Apr 2025', status: 'Active', category: 'Cleaning', code: 'CLEAN10', imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80' },
    ];
    let offers = defaultOffers;
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) offers = parsed;
      } catch {}
    }
    res.json({ success: true, data: offers.filter((o: any) => o.status === 'Active') });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/config — Public business & platform configuration (Admin controlled)
servicesRouter.get('/config', async (_req, res: Response) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'SYSTEM_SETTINGS' },
    });
    let config = {
      platformName: 'HomeServeX',
      supportEmail: 'support@homeservex.com',
      supportPhone: '+91 1800 200 4821',
      currency: 'INR (₹)',
      timezone: 'Asia/Kolkata (IST)',
      maintenanceMode: false,
      taxRatePercent: 18,
    };
    if (setting?.value) {
      try {
        config = { ...config, ...JSON.parse(setting.value).system };
      } catch {}
    }
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/trust-badges — Verified Experts, Genuine Parts, Upfront Pricing, 30-Day Warranty, 24x7 Support
servicesRouter.get('/trust-badges', async (_req, res: Response) => {
  try {
    const defaultBadges = [
      {
        id: 'trust-1',
        key: 'verified_experts',
        title: 'Verified Experts',
        subtitle: '100% Background & Police Verified',
        icon: 'ShieldCheck',
        badge: '100% Verified',
        description: 'Rigorous 4-step skill assessment and police background checks for every technician.'
      },
      {
        id: 'trust-2',
        key: 'genuine_parts',
        title: 'Genuine Parts',
        subtitle: 'Original Manufacturer Spares',
        icon: 'Tools',
        badge: 'OEM Certified',
        description: 'Brand-authorized OEM replacement parts with authentic batch warranties.'
      },
      {
        id: 'trust-3',
        key: 'upfront_pricing',
        title: 'Upfront Pricing',
        subtitle: 'Zero Hidden Charges',
        icon: 'Rupee',
        badge: 'Fixed Rate',
        description: 'Fixed rate cards displayed upfront. No surprise bills or hidden technician fees.'
      },
      {
        id: 'trust-4',
        key: 'warranty_30_days',
        title: '30-Day Warranty',
        subtitle: 'Free Service Re-visit Cover',
        icon: 'CheckCircle',
        badge: 'Guaranteed',
        description: 'Complete 30-day post-service warranty with zero-cost re-visits if issue persists.'
      },
      {
        id: 'trust-5',
        key: 'support_24_7',
        title: '24x7 Support',
        subtitle: 'Instant Dispute Resolution',
        icon: 'Headphones',
        badge: 'Always On',
        description: 'Dedicated priority support team and live order tracking assistance round the clock.'
      },
    ];

    let badges = defaultBadges;
    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: 'TRUST_BADGES' },
      });
      if (setting?.value) {
        badges = JSON.parse(setting.value);
      }
    } catch {}

    res.json({ success: true, data: badges });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// PUT /api/v1/services/trust-badges (Admin customization)
servicesRouter.put('/trust-badges', authenticate, requireRole('ADMIN'), async (req, res: Response) => {
  try {
    const badges = req.body.badges;
    if (!Array.isArray(badges)) {
      res.status(400).json({ success: false, error: 'Badges must be an array' });
      return;
    }
    await prisma.platformSetting.upsert({
      where: { key: 'TRUST_BADGES' },
      update: { value: JSON.stringify(badges) },
      create: { key: 'TRUST_BADGES', value: JSON.stringify(badges), description: 'Trust & Value Badges' },
    });
    res.json({ success: true, message: 'Trust badges updated successfully', data: badges });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/categories
servicesRouter.get('/categories', async (_req, res: Response, next: NextFunction) => {
  try {
    await ensureCatalog();
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: { _count: { select: { services: true } } },
    });
    res.json({
      success: true,
      data: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        iconUrl: c.iconUrl,
        imageUrl: c.imageUrl,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
        servicesCount: c._count.services,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/services — Paginated & Chunked Service Listing API
 *
 * Query Params:
 *  - categoryId: string (optional)
 *  - categorySlug: string (optional)
 *  - search / q: string (optional)
 *  - page: number (default: 1)
 *  - limit: number (default: 8, lightweight chunk)
 *  - cursor: string (optional for cursor-based pagination)
 *  - isPopular: boolean (optional)
 *
 * Response Structure:
 *  {
 *    "success": true,
 *    "data": [...],
 *    "pagination": {
 *      "currentPage": 1,
 *      "limit": 8,
 *      "totalRecords": 22,
 *      "totalPages": 3,
 *      "hasMore": true,
 *      "nextCursor": "uuid..."
 *    }
 *  }
 */
servicesRouter.get('/', async (req, res: Response, next: NextFunction) => {
  try {
    await ensureCatalog();

    const {
      categoryId,
      categorySlug,
      search,
      q,
      cursor,
      isPopular,
    } = req.query;

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '8'), 10) || 8));

    const where: any = { isActive: true };

    if (categoryId && typeof categoryId === 'string') {
      where.categoryId = categoryId;
    } else if (categorySlug && typeof categorySlug === 'string' && categorySlug !== 'all') {
      where.category = { slug: categorySlug };
    }

    const searchTerm = (search as string) || (q as string);
    if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
      where.OR = [
        { name: { contains: searchTerm.trim() } },
        { description: { contains: searchTerm.trim() } },
      ];
    }

    // Note: isPopular is handled safely in-memory or via raw attributes

    // Determine total matching records
    const totalRecords = await prisma.service.count({ where });
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    let services: any[] = [];

    // Support Cursor-based or Offset-based pagination
    if (cursor && typeof cursor === 'string') {
      services = await prisma.service.findMany({
        where,
        take: limit,
        skip: 1,
        cursor: { id: cursor },
        include: { category: true, options: true },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      const skip = (page - 1) * limit;
      services = await prisma.service.findMany({
        where,
        take: limit,
        skip,
        include: { category: true, options: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const hasMore = page < totalPages;
    const nextCursor = services.length > 0 && hasMore ? services[services.length - 1].id : null;

    let mapped = services.map((s: any) => ({
      id: s.id,
      categoryId: s.categoryId,
      category: s.category
        ? {
            id: s.category.id,
            name: s.category.name,
            slug: s.category.slug,
          }
        : undefined,
      name: s.name,
      slug: s.slug,
      description: s.description,
      basePricePaise: s.basePricePaise,
      strikethroughPricePaise: s.strikethroughPricePaise ?? Math.round(s.basePricePaise * 1.3),
      estimatedDurationMinutes: s.estimatedDurationMinutes,
      rating: s.rating ?? 4.8,
      reviewCount: s.reviewCount ?? 150,
      badge: s.badge ?? (s.isPopular ? 'Popular' : null),
      isPopular: s.isPopular ?? false,
      imageUrl: s.imageUrl,
      isActive: s.isActive,
      options: s.options,
      createdAt: s.createdAt.toISOString(),
    }));

    if (isPopular === 'true') {
      mapped = mapped.filter(item => item.isPopular);
    }

    res.json({
      success: true,
      data: mapped,
      pagination: {
        currentPage: page,
        limit,
        totalRecords,
        totalPages,
        hasMore,
        nextCursor,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/services/offers — Authoritative Special Offers & Coupon Codes matching Image 4
servicesRouter.get('/offers', async (_req, res: Response) => {
  try {
    const authoritativeOffers = [
      {
        id: 'offer-1',
        title: 'AC Service Discount',
        description: 'Get ₹200 OFF on AC service',
        minOrder: 'Min. order ₹999',
        validity: 'Valid till 31 Mar 2025',
        category: 'AC',
        code: 'AC200',
        discountType: 'FLAT',
        discountPaise: 20000,
        imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-2',
        title: 'Flat 15% OFF',
        description: 'on All Appliance Repairs',
        minOrder: 'Min. order ₹499',
        validity: 'Valid till 31 Mar 2025',
        category: 'Appliances',
        code: 'FLAT15',
        discountType: 'PERCENTAGE',
        discountPercent: 15,
        imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-3',
        title: 'Free Inspection',
        description: 'on First Booking',
        minOrder: 'Zero minimum order',
        validity: 'Valid till 31 Mar 2025',
        category: 'Appliances',
        code: 'FREEINSPECT',
        discountType: 'FLAT',
        discountPaise: 19900,
        imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-4',
        title: 'Deep Cleaning Special',
        description: 'Get ₹300 OFF on Full Home Cleaning',
        minOrder: 'Min. order ₹1499',
        validity: 'Valid till 31 Mar 2025',
        category: 'Cleaning',
        code: 'CLEAN300',
        discountType: 'FLAT',
        discountPaise: 30000,
        imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'offer-5',
        title: 'Water Purifier Filter Care',
        description: 'Flat 20% OFF on RO Membrane & Filters',
        minOrder: 'Min. order ₹599',
        validity: 'Valid till 31 Mar 2025',
        category: 'Appliances',
        code: 'RO20',
        discountType: 'PERCENTAGE',
        discountPercent: 20,
        imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
      },
    ];

    res.json({ success: true, data: authoritativeOffers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// GET /api/v1/services/:id
servicesRouter.get('/:id', async (req, res: Response, next: NextFunction) => {
  if (req.params.id === 'recommendations') return next();
  try {
    const service = await prisma.service.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }], isActive: true },
      include: { category: true, options: true },
    });
    if (!service) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Service not found' } });
      return;
    }
    const s = service as any;
    res.json({
      success: true,
      data: {
        ...service,
        strikethroughPricePaise: s.strikethroughPricePaise ?? Math.round(s.basePricePaise * 1.3),
        rating: s.rating ?? 4.8,
        reviewCount: s.reviewCount ?? 150,
        badge: s.badge ?? (s.isPopular ? 'Popular' : null),
        isPopular: s.isPopular ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Admin: POST /api/v1/services/categories
servicesRouter.post('/categories', authenticate, requireRole('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    const { name, slug, description, iconUrl, imageUrl, displayOrder, isActive } = req.body;
    const category = await prisma.serviceCategory.create({
      data: { name, slug, description, iconUrl, imageUrl, displayOrder: displayOrder ?? 0, isActive: isActive ?? true },
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// Admin: POST /api/v1/services
servicesRouter.post('/', authenticate, requireRole('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    const {
      categoryId,
      name,
      slug,
      description,
      basePricePaise,
      strikethroughPricePaise,
      estimatedDurationMinutes,
      imageUrl,
      badge,
      isPopular,
      isActive,
    } = req.body;
    const service = await prisma.service.create({
      data: {
        categoryId,
        name,
        slug,
        description,
        basePricePaise,
        estimatedDurationMinutes,
        imageUrl,
        isActive: isActive ?? true,
      },
      include: { category: true },
    });

    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Service" SET "strikethroughPricePaise" = ?, "badge" = ?, "isPopular" = ? WHERE "id" = ?`,
        strikethroughPricePaise || null,
        badge || null,
        isPopular ? 1 : 0,
        service.id
      );
    } catch {
      // Graceful fallback
    }
    res.status(201).json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

// Public: GET /api/v1/services/banners
servicesRouter.get('/banners', async (_req, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'PROMOTIONAL_BANNERS' },
    });
    let banners = [
      {
        id: 'banner-default-hero',
        badge: '⚡ FAST. RELIABLE. TRUSTED.',
        title: 'We fix it today,',
        highlightTitle: 'so you can relax tomorrow.',
        subtitle: 'Certified experts at your doorstep in as little as 30 minutes with upfront transparent pricing.',
        imageUrl: '/hero-technician.jpg',
        ctaText: 'Book Service',
        ctaTarget: '#recommended-section',
        discountBadge: '10K+ Happy Customers',
        isActive: true,
        displayOrder: 1,
      },
    ];
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          banners = parsed.filter(b => b.isActive !== false);
        }
      } catch {}
    }
    res.json({ success: true, data: banners });
  } catch (err) {
    next(err);
  }
});

// Public: GET /api/v1/services/offers
servicesRouter.get('/offers', async (_req, res: Response, next: NextFunction) => {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'PROMOTIONAL_OFFERS' },
    });
    let offers = [];
    if (setting?.value) {
      try {
        offers = JSON.parse(setting.value);
      } catch {}
    }
    if (!offers || offers.length === 0) {
      offers = [
        {
          id: 'offer-1',
          title: 'AC Service Discount',
          description: 'Get ₹200 OFF on AC service',
          discount: '₹200',
          discountType: 'FLAT',
          discountValue: 200,
          minOrderRupees: 999,
          validTill: '31 Mar 2025',
          status: 'Active',
          category: 'AC',
          imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'offer-2',
          title: 'Flat 15% OFF',
          description: 'on All Appliance Repairs',
          discount: '15%',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          minOrderRupees: 499,
          validTill: '31 Mar 2025',
          status: 'Active',
          category: 'Appliances',
          imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'offer-3',
          title: 'Free Inspection',
          description: 'on First Booking',
          discount: '100%',
          discountType: 'PERCENTAGE',
          discountValue: 100,
          minOrderRupees: 0,
          validTill: '31 Mar 2025',
          status: 'Active',
          category: 'All',
          imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'offer-4',
          title: 'Plumbing Discount',
          description: 'Get ₹150 OFF on plumbing repairs',
          discount: '₹150',
          discountType: 'FLAT',
          discountValue: 150,
          minOrderRupees: 599,
          validTill: '30 Apr 2025',
          status: 'Active',
          category: 'Plumbing',
          imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
        },
        {
          id: 'offer-5',
          title: 'Cleaning Offer',
          description: 'Flat 10% discount on deep cleaning',
          discount: '10%',
          discountType: 'PERCENTAGE',
          discountValue: 10,
          minOrderRupees: 699,
          validTill: '30 Apr 2025',
          status: 'Active',
          category: 'Cleaning',
          imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
        },
      ];
    }
    res.json({ success: true, data: offers });
  } catch (err) {
    next(err);
  }
});

// Admin: PATCH /api/v1/services/:id
servicesRouter.patch('/:id', authenticate, requireRole('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: req.body,
      include: { category: true, options: true },
    });
    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
});

// Admin: DELETE /api/v1/services/:id
servicesRouter.delete('/:id', authenticate, requireRole('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// Admin: PATCH /api/v1/services/categories/:id
servicesRouter.patch('/categories/:id', authenticate, requireRole('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.serviceCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
});

// Admin: DELETE /api/v1/services/categories/:id
servicesRouter.delete('/categories/:id', authenticate, requireRole('ADMIN'), async (req, res: Response, next: NextFunction) => {
  try {
    await prisma.serviceCategory.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});
