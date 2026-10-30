import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HomeServeX production-grade Indian catalog...');

  // 1. Ensure SQLite columns exist
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

  // 2. Seed Realistic Categories
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
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const category = await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, iconUrl: cat.iconUrl, displayOrder: cat.displayOrder, isActive: true },
      create: { slug: cat.slug, name: cat.name, description: cat.description, iconUrl: cat.iconUrl, displayOrder: cat.displayOrder, isActive: true },
    });
    categoryMap.set(cat.slug, category.id);
  }

  // 3. Seed Realistic Services with Indian Pricing & High-Res Unsplash Images
  const services = [
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
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
    },
  ];

  for (const svc of services) {
    const categoryId = categoryMap.get(svc.categorySlug);
    if (!categoryId) continue;

    await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {
        categoryId,
        name: svc.name,
        description: svc.description,
        basePricePaise: svc.basePricePaise,
        strikethroughPricePaise: svc.strikethroughPricePaise,
        estimatedDurationMinutes: svc.estimatedDurationMinutes,
        rating: svc.rating,
        reviewCount: svc.reviewCount,
        badge: svc.badge,
        isPopular: svc.isPopular,
        imageUrl: svc.imageUrl,
        isActive: true,
      } as any,
      create: {
        categoryId,
        name: svc.name,
        slug: svc.slug,
        description: svc.description,
        basePricePaise: svc.basePricePaise,
        strikethroughPricePaise: svc.strikethroughPricePaise,
        estimatedDurationMinutes: svc.estimatedDurationMinutes,
        rating: svc.rating,
        reviewCount: svc.reviewCount,
        badge: svc.badge,
        isPopular: svc.isPopular,
        imageUrl: svc.imageUrl,
        isActive: true,
      } as any,
    });
  }

  // 4. Seed Customer Membership Plans & Settings
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

  // 5. Seed Enterprise Provider Premium Subscription Plans (0% Commission Tier)
  const providerPlans = [
    {
      slug: 'monthly-premium',
      name: 'Monthly Premium',
      description: 'Zero commission guarantee on every completed order for 30 days.',
      pricePaise: 29900, // ₹299
      durationDays: 30,
      commissionRatePercent: 0.0,
      badge: 'PREMIUM_ZERO_COMMISSION',
      benefits: JSON.stringify([
        '0% Platform Commission on all orders',
        'Keep 100% of customer service payment',
        'Premium Specialist badge on profile',
        'Instant wallet settlements',
        'Dedicated partner support line',
      ]),
      isActive: true,
      isPopular: false,
      displayOrder: 1,
    },
    {
      slug: 'quarterly-premium',
      name: 'Quarterly Premium',
      description: 'Best value! 90 days of 100% earnings retention with zero commission.',
      pricePaise: 79900, // ₹799
      durationDays: 90,
      commissionRatePercent: 0.0,
      badge: 'MOST_POPULAR',
      benefits: JSON.stringify([
        '0% Platform Commission on all orders',
        'Keep 100% of customer service payment',
        'Verified Premium Specialist badge',
        'Priority wallet withdrawal processing',
        'Save ₹98 compared to monthly plan',
      ]),
      isActive: true,
      isPopular: true,
      displayOrder: 2,
    },
    {
      slug: 'yearly-premium',
      name: 'Yearly Premium',
      description: 'Maximum annual savings! Full 365 days of zero commission coverage.',
      pricePaise: 249900, // ₹2,499
      durationDays: 365,
      commissionRatePercent: 0.0,
      badge: 'BEST_VALUE',
      benefits: JSON.stringify([
        '0% Platform Commission all year long',
        'Keep 100% of customer service payment',
        'Gold Verified Specialist status',
        'Same-day bank settlement payouts',
        'Save over ₹1,089 annually',
      ]),
      isActive: true,
      isPopular: false,
      displayOrder: 3,
    },
  ];

  for (const plan of providerPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  // 6. Ensure existing providers have initialized wallets
  const existingProviders = await prisma.providerProfile.findMany();
  for (const pro of existingProviders) {
    await prisma.providerWallet.upsert({
      where: { providerId: pro.id },
      update: {},
      create: {
        providerId: pro.id,
        balancePaise: 245000, // ₹2,450 default seed balance
        totalEarnedPaise: 329000,
        totalCommissionPaidPaise: 49350,
      },
    });
  }

  console.log('HomeServeX production database seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
