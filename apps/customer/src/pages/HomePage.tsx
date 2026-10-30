import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Spinner, Icons } from '@homeservex/ui';
import { useAuth } from '../app/auth-context.js';
import { BookingModal, type ServiceItem } from '../components/BookingModal.js';
export type { ServiceItem };

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

export interface TrustBadge {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  description: string;
}

export const DEFAULT_TRUST_BADGES: TrustBadge[] = [
  {
    id: 'trust-1',
    key: 'verified_experts',
    title: 'Verified Experts',
    subtitle: '100% Background & Police Verified',
    icon: 'ShieldCheck',
    badge: '100% Verified',
    description: 'Every pro undergoes strict 4-step skill testing, ID validation, and police background clearance before arriving at your home.',
  },
  {
    id: 'trust-2',
    key: 'genuine_parts',
    title: 'Genuine Parts',
    subtitle: 'Original Manufacturer Spares',
    icon: 'Tools',
    badge: 'OEM Spares',
    description: 'Direct manufacturer supplied components with 90-day replacement assurance and authentic barcoded parts.',
  },
  {
    id: 'trust-3',
    key: 'upfront_pricing',
    title: 'Upfront Pricing',
    subtitle: 'Zero Hidden Charges',
    icon: 'Rupee',
    badge: 'Fixed Rate',
    description: 'Fixed rate cards displayed upfront. No surprise bills, bargaining, or hidden technician travel fees.',
  },
  {
    id: 'trust-4',
    key: 'warranty_30_days',
    title: '30-Day Warranty',
    subtitle: 'Free Service Re-visit Cover',
    icon: 'CheckCircle',
    badge: 'Guaranteed',
    description: 'Complete 30-day post-service warranty with zero-cost re-visits if your issue persists.',
  },
  {
    id: 'trust-5',
    key: 'support_24_7',
    title: '24x7 Support',
    subtitle: 'Instant Help & Resolution',
    icon: 'Headphones',
    badge: 'Always On',
    description: 'Dedicated priority support team and live order tracking assistance available round the clock.',
  },
];



const CITIES = ['221B Baker Street, Powai, Mumbai', 'Indiranagar 100ft Rd, Bengaluru', 'DLF Phase 5, Gurugram', 'Banjara Hills, Hyderabad'];

// 6 Core Categories matching reference specification
const CORE_CATEGORIES = [
  { id: 'cat-ac', name: 'AC Service', slug: 'ac-servicing', icon: '❄️', tag: 'Fast 45m' },
  { id: 'cat-wm', name: 'Washing Machine', slug: 'washing-machine', icon: '🧺', tag: 'Expert' },
  { id: 'cat-fridge', name: 'Refrigerator', slug: 'refrigerator', icon: '🧊', tag: 'Repairs' },
  { id: 'cat-micro', name: 'Microwave Oven', slug: 'microwave', icon: '📻', tag: 'Diagnostics' },
  { id: 'cat-ro', name: 'Water Purifier', slug: 'water-purifier', icon: '💧', tag: 'Filter' },
  { id: 'cat-more', name: 'More Categories', slug: 'all', icon: '➕', tag: '20+ More' },
];

export const DEFAULT_APPLIANCES_LIST = [
  {
    id: 'appliance-ac-1',
    name: 'Living Room Split AC',
    brandModel: 'Daikin 1.5 Ton 5-Star Inverter',
    icon: '❄️',
    healthScore: 88,
    status: 'GOOD',
    lastServiceDate: '12 Jan 2025',
    lastServiceNotes: 'Pressure jet cleaned, coil sanitized & gas calibrated to 140 PSI',
    nextServiceDueDays: 45,
    recommendedServiceSlug: 'split-ac-regular-service',
  },
  {
    id: 'appliance-wm-1',
    name: 'Balcony Washing Machine',
    brandModel: 'Bosch 8kg Front Load Series 6',
    icon: '🧺',
    healthScore: 94,
    status: 'EXCELLENT',
    lastServiceDate: '20 Nov 2024',
    lastServiceNotes: 'Descaling cycle performed, drum suspension shock absorbers tuned',
    nextServiceDueDays: 78,
    recommendedServiceSlug: 'washing-machine-overhaul',
  },
  {
    id: 'appliance-fridge-1',
    name: 'Kitchen Double Door Refrigerator',
    brandModel: 'Samsung 345L Twin Cooling Plus',
    icon: '🧊',
    healthScore: 76,
    status: 'ATTENTION_NEEDED',
    lastServiceDate: '15 Aug 2024',
    lastServiceNotes: 'Thermostat relay checked, minor condenser dust noted',
    nextServiceDueDays: 14,
    recommendedServiceSlug: 'fridge-cooling-diagnostics',
  },
  {
    id: 'appliance-ro-1',
    name: 'Kitchen RO Water Purifier',
    brandModel: 'Kent Grand Plus Mineral RO',
    icon: '💧',
    healthScore: 92,
    status: 'GOOD',
    lastServiceDate: '05 Jan 2025',
    lastServiceNotes: 'Filter cartridges renewed, TDS calibrated to 110 PPM',
    nextServiceDueDays: 60,
    recommendedServiceSlug: 'ro-filter-service',
  },
];

export const PRODUCTION_SERVICES_CATALOG: ServiceItem[] = [
  {
    id: 'svc-ac-1',
    name: 'Split AC Power Jet Cleaning',
    slug: 'split-ac-regular-service',
    description: 'Indoor coil high-pressure wash, outdoor condenser jet flush, drainage tray sanitization & gas check.',
    basePricePaise: 69900,
    strikethroughPricePaise: 89900,
    estimatedDurationMinutes: 60,
    rating: 4.8,
    reviewCount: '2.4K',
    badge: 'Recommended',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    category: { name: 'AC Servicing & Repair', slug: 'ac-servicing' },
  },
  {
    id: 'svc-ac-2',
    name: 'AC Gas Top-up & Leak Check (R32/R410)',
    slug: 'ac-gas-topup',
    description: 'Nitrogen pressure testing, copper valve leak brazing, vacuum evacuation, and pure R32/R410 refrigerant recharge.',
    basePricePaise: 129900,
    strikethroughPricePaise: 169900,
    estimatedDurationMinutes: 75,
    rating: 4.9,
    reviewCount: '1.8K',
    badge: 'Most Booked',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    category: { name: 'AC Servicing & Repair', slug: 'ac-servicing' },
  },
  {
    id: 'svc-ac-3',
    name: 'Split AC Installation & Uninstallation',
    slug: 'split-ac-installation',
    description: 'Precision bracket mounting, copper pipe flare connection, vacuum purge, and cooling air flow calibration.',
    basePricePaise: 119900,
    strikethroughPricePaise: 149900,
    estimatedDurationMinutes: 90,
    rating: 4.8,
    reviewCount: '920',
    badge: 'Expert Fit',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
    category: { name: 'AC Servicing & Repair', slug: 'ac-servicing' },
  },
  {
    id: 'svc-ac-4',
    name: 'Window AC Deep Jet Cleaning',
    slug: 'window-ac-service',
    description: 'Complete slide-out chassis washing, coil descaling, blower motor oiling, and dust filter sanitization.',
    basePricePaise: 54900,
    strikethroughPricePaise: 69900,
    estimatedDurationMinutes: 45,
    rating: 4.7,
    reviewCount: '740',
    badge: 'Fast 45m',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    category: { name: 'AC Servicing & Repair', slug: 'ac-servicing' },
  },
  {
    id: 'svc-wm-1',
    name: 'Washing Machine Drum & Motor Overhaul',
    slug: 'washing-machine-overhaul',
    description: 'Full spin vibration calibration, inlet valve descaling, belt tension check, and drain pump unclogging.',
    basePricePaise: 44900,
    strikethroughPricePaise: 59900,
    estimatedDurationMinutes: 60,
    rating: 4.8,
    reviewCount: '950',
    badge: 'Recommended',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Washing Machine Repair', slug: 'washing-machine' },
  },
  {
    id: 'svc-wm-2',
    name: 'Front & Top Load Chemical Descaling',
    slug: 'washing-machine-descaling',
    description: 'High-temperature drum cleaning with food-grade citric descaling compound to remove lime-scale, odor, and detergent buildup.',
    basePricePaise: 34900,
    strikethroughPricePaise: 49900,
    estimatedDurationMinutes: 45,
    rating: 4.9,
    reviewCount: '1.2K',
    badge: 'Instant 45m',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Washing Machine Repair', slug: 'washing-machine' },
  },
  {
    id: 'svc-wm-3',
    name: 'PCB Circuit & Motor Sensor Diagnostics',
    slug: 'washing-machine-pcb-repair',
    description: 'Motherboard circuit diagnostics, error code reset (E01, UE, dE), and inverter motor hall sensor testing.',
    basePricePaise: 79900,
    strikethroughPricePaise: 109900,
    estimatedDurationMinutes: 60,
    rating: 4.7,
    reviewCount: '430',
    badge: 'Genuine Spares',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Washing Machine Repair', slug: 'washing-machine' },
  },
  {
    id: 'svc-fridge-1',
    name: 'Refrigerator Cooling Diagnostics & Gas Recharge',
    slug: 'fridge-cooling-diagnostics',
    description: 'Complete cooling coil testing, relay/overload protector check, and thermostat temperature calibration.',
    basePricePaise: 54900,
    strikethroughPricePaise: 74900,
    estimatedDurationMinutes: 60,
    rating: 4.8,
    reviewCount: '1.4K',
    badge: 'Bestseller',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Refrigerator Repair', slug: 'refrigerator' },
  },
  {
    id: 'svc-fridge-2',
    name: 'Inverter Compressor Relay & Coil Repair',
    slug: 'fridge-compressor-repair',
    description: 'Diagnostic troubleshooting of non-cooling fridge, clicking noises, PTC starter relay, and genuine refrigerant recharge.',
    basePricePaise: 89900,
    strikethroughPricePaise: 129900,
    estimatedDurationMinutes: 75,
    rating: 4.9,
    reviewCount: '810',
    badge: 'Warranty Covered',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Refrigerator Repair', slug: 'refrigerator' },
  },
  {
    id: 'svc-ro-1',
    name: 'Water Purifier RO Membrane & Filter Service',
    slug: 'ro-filter-service',
    description: 'Multi-stage RO membrane inspection, sediment filter flush, TDS balance testing, and UV chamber sterilize check.',
    basePricePaise: 49900,
    strikethroughPricePaise: 69900,
    estimatedDurationMinutes: 50,
    rating: 4.9,
    reviewCount: '3.2K',
    badge: 'Pure Water',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Water Purifier (RO) Service', slug: 'water-purifier' },
  },
  {
    id: 'svc-ro-2',
    name: 'RO Membrane + Copper Alkaline Upgrade',
    slug: 'ro-membrane-copper-alkaline',
    description: 'Upgrade your existing RO purifier with 80 GPD Filmtec membrane and Bio-Copper alkaline mineralizer.',
    basePricePaise: 149900,
    strikethroughPricePaise: 199900,
    estimatedDurationMinutes: 60,
    rating: 4.9,
    reviewCount: '1.6K',
    badge: 'Immunity Boost',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Water Purifier (RO) Service', slug: 'water-purifier' },
  },
  {
    id: 'svc-ro-3',
    name: 'TDS Water Calibration & UV Chamber Check',
    slug: 'uv-tds-calibration',
    description: 'Laser TDS meter testing, mineral balancer adjustment, UV lamp intensity verification, and pressure pump check.',
    basePricePaise: 29900,
    strikethroughPricePaise: 39900,
    estimatedDurationMinutes: 30,
    rating: 4.8,
    reviewCount: '520',
    badge: 'Instant 30m',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Water Purifier (RO) Service', slug: 'water-purifier' },
  },
  {
    id: 'svc-clean-1',
    name: 'Intensive Bathroom Tile & Grout Scrub',
    slug: 'deep-bathroom-cleaning',
    description: 'Hard-water stain removal, floor tile rotary scrubbing, fixture descaling, and mirror buffing.',
    basePricePaise: 59900,
    strikethroughPricePaise: 79900,
    estimatedDurationMinutes: 90,
    rating: 4.7,
    reviewCount: '3.1K',
    badge: 'Combo Offer',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Deep Cleaning Services', slug: 'cleaning' },
  },
  {
    id: 'svc-clean-2',
    name: 'Modular Kitchen Deep Degreasing & Sanitization',
    slug: 'kitchen-deep-degreasing',
    description: 'Exhaust chimney degreasing, slab scrubbing, oil stain removal from tiles, and sink sanitization.',
    basePricePaise: 129900,
    strikethroughPricePaise: 169900,
    estimatedDurationMinutes: 120,
    rating: 4.8,
    reviewCount: '2.2K',
    badge: 'Zero Oil',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Deep Cleaning Services', slug: 'cleaning' },
  },
  {
    id: 'svc-clean-3',
    name: '5-Seater Sofa Foam Shampoo & Dust Mite Extraction',
    slug: 'sofa-upholstery-cleaning',
    description: 'Deep extraction vacuuming, organic chemical foam shampooing, and fabric conditioning for soft upholstery.',
    basePricePaise: 89900,
    strikethroughPricePaise: 119900,
    estimatedDurationMinutes: 75,
    rating: 4.8,
    reviewCount: '1.9K',
    badge: 'Fabric Safe',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Deep Cleaning Services', slug: 'cleaning' },
  },
  {
    id: 'svc-clean-4',
    name: 'Complete 2BHK Deep Cleaning',
    slug: 'full-home-deep-cleaning',
    description: 'Floor scrubbing machines, balcony wash, window glass cleaning, bathroom & kitchen deep sanitization.',
    basePricePaise: 299900,
    strikethroughPricePaise: 399900,
    estimatedDurationMinutes: 240,
    rating: 4.9,
    reviewCount: '890',
    badge: 'Festive Special',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Deep Cleaning Services', slug: 'cleaning' },
  },
  {
    id: 'svc-elec-1',
    name: 'Switch & Socket Replacement',
    slug: 'switchboard-repair',
    description: 'Safety check, rewiring, and installation of modular switches, indicators, and 16A power plugs.',
    basePricePaise: 24900,
    strikethroughPricePaise: 34900,
    estimatedDurationMinutes: 30,
    rating: 4.8,
    reviewCount: '1.5K',
    badge: 'Licensed Tech',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Electrical Repairs', slug: 'electrical' },
  },
  {
    id: 'svc-elec-2',
    name: 'Ceiling Fan Installation & Repair',
    slug: 'ceiling-fan-installation',
    description: 'Secure rod hanging, safety pin check, electronic regulator alignment, and motor vibration fixes.',
    basePricePaise: 34900,
    strikethroughPricePaise: 49900,
    estimatedDurationMinutes: 45,
    rating: 4.8,
    reviewCount: '2.1K',
    badge: 'Fast 45m',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Electrical Repairs', slug: 'electrical' },
  },
  {
    id: 'svc-elec-3',
    name: 'MCB Tripping & Inverter Backup Wiring',
    slug: 'mcb-inverter-wiring',
    description: 'Short-circuit detection with megohmmeter, MCB fuse replacement, and inverter battery terminal cleaning.',
    basePricePaise: 49900,
    strikethroughPricePaise: 69900,
    estimatedDurationMinutes: 60,
    rating: 4.9,
    reviewCount: '670',
    badge: 'Heavy Duty',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Electrical Repairs', slug: 'electrical' },
  },
  {
    id: 'svc-plumb-1',
    name: 'Tap & Shower Leak Repair',
    slug: 'tap-leak-repair',
    description: 'Fix dripping taps, loose mixer handles, broken washers, aerators, and low water pressure issues.',
    basePricePaise: 29900,
    strikethroughPricePaise: 39900,
    estimatedDurationMinutes: 45,
    rating: 4.7,
    reviewCount: '1.8K',
    badge: 'Fast 45m',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Plumbing Services', slug: 'plumbing' },
  },
  {
    id: 'svc-plumb-2',
    name: 'Drain Blockage Removal',
    slug: 'drain-blockage-removal',
    description: 'High-pressure unclogging of kitchen sinks, bathroom floor traps, bottle traps, and sewer drainage pipes.',
    basePricePaise: 49900,
    strikethroughPricePaise: 69900,
    estimatedDurationMinutes: 60,
    rating: 4.8,
    reviewCount: '1.3K',
    badge: 'High Pressure',
    isPopular: true,
    imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Plumbing Services', slug: 'plumbing' },
  },
  {
    id: 'svc-plumb-3',
    name: 'Toilet Flush Cistern & Jet Spray Overhaul',
    slug: 'toilet-flush-cistern-repair',
    description: 'Cistern siphon valve replacement, water inlet ball valve calibration, and new health faucet jet install.',
    basePricePaise: 39900,
    strikethroughPricePaise: 54900,
    estimatedDurationMinutes: 45,
    rating: 4.8,
    reviewCount: '890',
    badge: 'Sanitized',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Plumbing Services', slug: 'plumbing' },
  },
  {
    id: 'svc-micro-1',
    name: 'Microwave Magnetron & Heating Repair',
    slug: 'microwave-heating-repair',
    description: 'Magnetron output inspection, high-voltage diode and capacitor safety testing, and door interlock repair.',
    basePricePaise: 39900,
    strikethroughPricePaise: 54900,
    estimatedDurationMinutes: 45,
    rating: 4.8,
    reviewCount: '640',
    badge: 'Certified',
    isPopular: false,
    imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=800&q=80',
    category: { name: 'Microwave Oven Repair', slug: 'microwave' },
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const [selectedAddress, setSelectedAddress] = useState<string>(CITIES[0] ?? '221B Baker Street, Powai, Mumbai');
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null);

  // ── PRODUCTION PAGINATION & CHUNKED LAZY LOADING STATE ──
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const [appliances, setAppliances] = useState<Array<{
    id: string;
    name: string;
    brandModel: string;
    icon: string;
    healthScore: number;
    status: string;
    lastServiceDate: string;
    lastServiceNotes: string;
    nextServiceDueDays: number;
    recommendedServiceSlug: string;
  }>>([]);
  const [selectedBookingService, setSelectedBookingService] = useState<ServiceItem | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'home' | 'bookings' | 'offers' | 'account'>('home');

  // Dynamic Promotional Hero Banner from Admin
  const [activeBanner, setActiveBanner] = useState<{
    id: string;
    badge: string;
    title: string;
    highlightTitle?: string;
    subtitle: string;
    imageUrl: string;
    ctaText: string;
    ctaTarget: string;
    discountBadge?: string;
  }>({
    id: 'banner-default-hero',
    badge: '⚡ FAST. RELIABLE. TRUSTED.',
    title: 'We fix it today,',
    highlightTitle: 'so you can relax tomorrow.',
    subtitle: 'Certified experts at your doorstep in as little as 30 minutes with upfront transparent pricing.',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    ctaText: 'Book Service',
    ctaTarget: '#recommended-section',
    discountBadge: '10K+ Happy Customers',
  });

  // ── DYNAMIC TRUST BADGES & GUARANTEES FROM BACKEND ──
  const [trustBadges, setTrustBadges] = useState<TrustBadge[]>(DEFAULT_TRUST_BADGES);
  const [selectedTrustBadge, setSelectedTrustBadge] = useState<TrustBadge | null>(null);

  // ── HORIZONTAL SCROLL CONTROLS FOR RECOMMENDED SECTION (Strictly 1 Single Row) ──
  const recommendedScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollRecommended = (direction: 'left' | 'right') => {
    if (recommendedScrollRef.current) {
      const offset = direction === 'left' ? -300 : 300;
      recommendedScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const curatedRecommended = useMemo(() => {
    return PRODUCTION_SERVICES_CATALOG.filter(s => s.isPopular || s.badge?.includes('Recommend') || s.badge?.includes('Most Booked')).slice(0, 10);
  }, []);

  // Interactive In-App Notification Center
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<'ALL' | 'BOOKINGS' | 'OFFERS'>('ALL');
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'BOOKING' | 'OFFER' | 'SYSTEM' | 'ALERT';
    title: string;
    message: string;
    timeAgo: string;
    isRead: boolean;
    actionLabel?: string;
    actionUrl?: string;
  }>>([
    {
      id: 'notif-1',
      type: 'BOOKING',
      title: 'Technician Assigned & En Route',
      message: 'Ramesh Kumar is arriving in ~15 mins for Split AC Power Jet Cleaning (Ref: #HSX-MVPRP5C6).',
      timeAgo: '4m ago',
      isRead: false,
      actionLabel: 'Track Live',
      actionUrl: '/bookings',
    },
    {
      id: 'notif-2',
      type: 'OFFER',
      title: 'Monsoon Cleanfest: 20% OFF',
      message: 'Get flat 20% off on all Water Purifier RO repairs and sanitization. Use code: PURE20.',
      timeAgo: '1h ago',
      isRead: false,
      actionLabel: 'Book Now',
      actionUrl: '#recommended-section',
    },
    {
      id: 'notif-3',
      type: 'SYSTEM',
      title: 'Service Start Security OTP',
      message: 'Your service start OTP for AC Cleaning is 4821. Never share this before technician arrives at your door.',
      timeAgo: '2h ago',
      isRead: true,
    },
    {
      id: 'notif-4',
      type: 'ALERT',
      title: 'Air Quality & Filter Alert',
      message: 'AQI in your area reached 182. Clean AC indoor filters to safeguard family health and reduce power consumption.',
      timeAgo: '1d ago',
      isRead: true,
      actionLabel: 'Book AC Clean',
      actionUrl: '#recommended-section',
    },
  ]);

  const unreadNotificationCount = notifications.filter(n => !n.isRead).length;

  // ── ON-DEMAND DATA FETCHING & PAGINATION (Urban Company / Swiggy style) ──
  const fetchServicesPage = useCallback(async (targetPage: number, isInitial = false) => {
    if (isInitial) {
      setIsLoadingInitial(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', '8');
      if (selectedCategorySlug && selectedCategorySlug !== 'all') {
        params.append('categorySlug', selectedCategorySlug);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const res = await fetch(`${API_BASE}/api/v1/services?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          setServices(prev => (isInitial ? json.data : [...prev, ...json.data]));
          if (json.pagination) {
            setHasMore(json.pagination.hasMore);
            setTotalRecords(json.pagination.totalRecords);
            setPage(json.pagination.currentPage);
          } else {
            setHasMore(false);
          }
          setIsLoadingInitial(false);
          setIsLoadingMore(false);
          return;
        }
      }
    } catch {
      // Graceful fallback to client-side chunked pagination
    }

    // High-fidelity chunked pagination fallback (8 items per chunk)
    const limit = 8;
    const filtered = PRODUCTION_SERVICES_CATALOG.filter(s => {
      if (selectedCategorySlug && selectedCategorySlug !== 'all') {
        if (s.category?.slug !== selectedCategorySlug) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (targetPage - 1) * limit;
    const chunk = filtered.slice(start, start + limit);

    setServices(prev => (isInitial ? chunk : [...prev, ...chunk]));
    setHasMore(targetPage < totalPages);
    setTotalRecords(total);
    setPage(targetPage);
    setIsLoadingInitial(false);
    setIsLoadingMore(false);
  }, [selectedCategorySlug, searchQuery]);

  // Reset & load page 1 when category or search filter changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchServicesPage(1, true);
  }, [selectedCategorySlug, searchQuery, fetchServicesPage]);

  // Lazy Infinite Scrolling Observer — Triggers next chunk when nearing the bottom
  useEffect(() => {
    if (!hasMore || isLoadingMore || isLoadingInitial) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !isLoadingMore && !isLoadingInitial) {
          fetchServicesPage(page + 1, false);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, isLoadingMore, isLoadingInitial, page, fetchServicesPage]);

  // Fetch active promotional hero banners from Admin
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/services/banners`)
      .then(r => r.json())
      .then(res => {
        if (res?.data && res.data.length > 0) {
          setActiveBanner(res.data[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch verified trust badges from backend API
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/services/trust-badges`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          setTrustBadges(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const renderTrustIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <Icons.ShieldCheck size={20} color="#16865D" />;
      case 'Tools':
        return <Icons.Tools size={20} color="#16865D" />;
      case 'Rupee':
        return <span style={{ fontSize: '18px', fontWeight: 900, color: '#16865D' }}>₹</span>;
      case 'CheckCircle':
        return <Icons.CheckCircle size={20} color="#16865D" />;
      case 'Headphones':
        return <Icons.Headphones size={20} color="#16865D" />;
      default:
        return <Icons.ShieldCheck size={20} color="#16865D" />;
    }
  };

  // Fetch live appliance health history from backend API
  useEffect(() => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    fetch(`${API_BASE}/api/v1/customers/appliances`, { headers })
      .then(r => r.json())
      .then(res => {
        if (res?.data && res.data.length > 0) {
          setAppliances(res.data);
        } else {
          setAppliances(DEFAULT_APPLIANCES_LIST);
        }
      })
      .catch(() => {
        setAppliances(DEFAULT_APPLIANCES_LIST);
      });
  }, [accessToken]);

  const filteredNotifications = notifications.filter(n => {
    if (notificationTab === 'BOOKINGS') return n.type === 'BOOKING' || n.type === 'SYSTEM';
    if (notificationTab === 'OFFERS') return n.type === 'OFFER';
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9F7', color: '#17211C', paddingBottom: '130px', fontFamily: "'Inter', sans-serif" }}>
      {/* ── SECTION A: TOP APP BAR & HEADER ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8EDE9',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto', padding: '14px 20px 16px' }}>
          {/* Top Row: Location Pin + Address Dropdown + Live Support & Notification / Cart */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            {/* Left: Location Pin inside rounded emerald badge + Address label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  backgroundColor: '#EAF6EF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16865D',
                  flexShrink: 0,
                }}
              >
                <Icons.MapPin size={20} color="#16865D" />
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsAddressDropdownOpen(!isAddressDropdownOpen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#17211C', letterSpacing: '-0.3px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedAddress.split(',')[0]}
                  </span>
                  <span style={{ fontSize: '12px', color: '#16865D', fontWeight: 700 }}>∨</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#188653' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16865D', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Live Support • 24x7
                  </span>
                </div>

                {/* Dropdown Menu */}
                {isAddressDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '8px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #E8EDE9',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      width: '280px',
                      zIndex: 60,
                      overflow: 'hidden',
                    }}
                  >
                    {CITIES.map(addr => (
                      <div
                        key={addr}
                        onClick={() => {
                          setSelectedAddress(addr);
                          setIsAddressDropdownOpen(false);
                        }}
                        style={{
                          padding: '12px 16px',
                          fontSize: '13px',
                          fontWeight: selectedAddress === addr ? 700 : 500,
                          color: selectedAddress === addr ? '#145C43' : '#17211C',
                          backgroundColor: selectedAddress === addr ? '#EAF6EF' : 'transparent',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F1F5F2',
                        }}
                      >
                        {addr}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Interactive Notification Bell */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsNotificationOpen(true)}
                title="Open Notification Center"
                style={{
                  position: 'relative',
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: isNotificationOpen ? '#EAF6EF' : '#F7F9F7',
                  border: `1px solid ${isNotificationOpen ? '#16865D' : '#E8EDE9'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: isNotificationOpen ? '#145C43' : '#17211C',
                  transition: 'all 0.15s ease',
                  boxShadow: isNotificationOpen ? '0 2px 8px rgba(22, 134, 93, 0.15)' : 'none',
                }}
              >
                <Icons.Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: '#16865D',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #FFFFFF',
                      boxShadow: '0 2px 6px rgba(22, 134, 93, 0.35)',
                    }}
                  >
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Row: Floating pill-style search input + Green circular mic search button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                flex: 1,
                backgroundColor: '#F7F9F7',
                borderRadius: '14px',
                border: '1px solid #E8EDE9',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <Icons.Search size={18} color="#6B756F" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for appliance or service..."
                style={{
                  flex: 1,
                  border: 'none',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#17211C',
                }}
              />
              {searchQuery && (
                <span onClick={() => setSearchQuery('')} style={{ cursor: 'pointer', fontSize: '13px', color: '#6B756F' }}>
                  ✕
                </span>
              )}
            </div>

            {/* Dedicated green circular voice/mic search button */}
            <button
              onClick={() => {
                const sampleSearches = ['AC Jet Cleaning', 'Water Purifier Filter', 'Washing Machine Drum'];
                const random = sampleSearches[Math.floor(Math.random() * sampleSearches.length)];
                if (random) setSearchQuery(random);
              }}
              title="Voice Search"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#145C43',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(20, 92, 67, 0.25)',
                transition: 'transform 0.15s ease',
              }}
            >
              <Icons.Mic size={18} color="#FFFFFF" />
            </button>
          </div>
        </div>
      </header>

      {/* ── APP BODY CONTAINER ── */}
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* ── SECTION B: HERO BANNER CARD ── */}
        <div
          style={{
            backgroundColor: '#EAF6EF',
            borderRadius: '20px',
            border: '1px solid #D6E8DC',
            padding: '24px 20px',
            position: 'relative',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          {/* Left Hero Content */}
          <div style={{ zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1EADE',
                fontSize: '11px',
                fontWeight: 800,
                color: '#145C43',
                letterSpacing: '0.6px',
                marginBottom: '12px',
              }}
            >
              {activeBanner.badge || '⚡ FAST. RELIABLE. TRUSTED.'}
            </div>

            <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 28px)', fontWeight: 900, color: '#17211C', lineHeight: 1.25, letterSpacing: '-0.5px', margin: '0 0 10px 0' }}>
              {activeBanner.title} <br />
              {activeBanner.highlightTitle && (
                <span style={{ color: '#16865D' }}>{activeBanner.highlightTitle}</span>
              )}
            </h1>

            <p style={{ fontSize: '13.5px', color: '#4A5B52', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {activeBanner.subtitle}
            </p>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <button
                onClick={() => {
                  const targetId = activeBanner.ctaTarget?.startsWith('#') ? activeBanner.ctaTarget.substring(1) : 'recommended-section';
                  const el = document.getElementById(targetId);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  backgroundColor: '#16865D',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  borderRadius: '14px',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(22, 134, 93, 0.3)',
                }}
              >
                <span>⚡</span> {activeBanner.ctaText || 'Book Service'}
              </button>

              <button
                onClick={() => {
                  const firstRec = services[0];
                  if (firstRec) setSelectedBookingService(firstRec);
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#17211C',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  border: '1px solid #D1EADE',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📅</span> Schedule
              </button>
            </div>

            {/* Social Proof Widget (Bottom of hero) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex' }}>
                {['#145C43', '#16865D', '#0F4935', '#D97706'].map((bg, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: bg,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 800,
                      border: '2px solid #FFFFFF',
                      marginLeft: idx > 0 ? '-8px' : 0,
                    }}
                  >
                    ★
                  </div>
                ))}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#17211C' }}>
                ★ {activeBanner.discountBadge || '10K+ Happy Customers'}
              </span>
            </div>
          </div>

          {/* Right Hero Image: Professional Technician Servicing AC or Admin Uploaded Banner */}
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '280px',
                borderRadius: '18px',
                overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(20, 92, 67, 0.15)',
                border: '3px solid #FFFFFF',
                backgroundColor: '#FFFFFF',
              }}
            >
              <img
                src={
                  activeBanner.imageUrl.startsWith('http') || activeBanner.imageUrl.startsWith('data:')
                    ? activeBanner.imageUrl
                    : activeBanner.imageUrl.startsWith('/uploads')
                    ? `${API_BASE}${activeBanner.imageUrl}`
                    : activeBanner.imageUrl
                }
                alt={activeBanner.title}
                onError={e => {
                  const target = e.currentTarget;
                  target.onerror = null;
                  target.src = '/hero-technician.jpg';
                }}
                style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>

        {/* ── SECTION C: DYNAMIC VALUE PROPOSITION / TRUST PILLARS STRIP (Backed by /api/v1/services/trust-badges) ── */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E8EDE9',
            padding: '16px 14px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '10px',
            textAlign: 'center',
            boxShadow: '0 3px 12px rgba(0,0,0,0.02)',
            overflowX: 'auto',
          }}
        >
          {trustBadges.map((f) => (
            <div
              key={f.id}
              onClick={() => setSelectedTrustBadge(f)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '68px',
                cursor: 'pointer',
                padding: '6px 4px',
                borderRadius: '12px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#F0FAF4';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              title={`Click to view ${f.title} guarantee`}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  backgroundColor: '#EAF6EF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px',
                  border: '1px solid #D1EADE',
                  boxShadow: '0 2px 6px rgba(22, 134, 93, 0.08)',
                }}
              >
                {renderTrustIcon(f.icon)}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#17211C', lineHeight: 1.2, marginBottom: '2px' }}>
                {f.title}
              </span>
              <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#16865D', backgroundColor: '#EAF6EF', padding: '1px 6px', borderRadius: '6px' }}>
                {f.badge || 'Verified'}
              </span>
            </div>
          ))}
        </div>

        {/* ── SECTION D: SERVICE CATEGORIES GRID (6 items) ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
              Service Categories
            </h2>
            <button
              onClick={() => setSelectedCategorySlug(null)}
              style={{ background: 'none', border: 'none', fontSize: '13px', fontWeight: 700, color: '#16865D', cursor: 'pointer' }}
            >
              View all &gt;
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
            }}
          >
            {CORE_CATEGORIES.map(cat => {
              const isSelected = selectedCategorySlug === cat.slug;
              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategorySlug(isSelected ? null : cat.slug)}
                  style={{
                    backgroundColor: isSelected ? '#EAF6EF' : '#FFFFFF',
                    borderRadius: '16px',
                    border: `1.5px solid ${isSelected ? '#16865D' : '#E8EDE9'}`,
                    padding: '16px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 6px 18px rgba(22, 134, 93, 0.12)' : '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      backgroundColor: isSelected ? '#FFFFFF' : '#F7F9F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      marginBottom: '8px',
                    }}
                  >
                    {cat.icon}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#17211C', marginBottom: '2px' }}>
                    {cat.name}
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#16865D', fontWeight: 700 }}>
                    {cat.tag}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION E: RECOMMENDED FOR YOU (Strictly 1 Single Horizontal Row) ── */}
        <div id="recommended-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                  Recommended for You
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    backgroundColor: '#EAF6EF',
                    color: '#16865D',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>✨</span> Curated
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B756F', marginTop: '2px' }}>
                Top rated repairs & seasonal upkeep • Swipe sideways to explore
              </div>
            </div>

            {/* Controls: Left/Right Desktop buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => scrollRecommended('left')}
                title="Scroll Left"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #E8EDE9',
                  backgroundColor: '#FFFFFF',
                  color: '#145C43',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 800,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                ‹
              </button>
              <button
                onClick={() => scrollRecommended('right')}
                title="Scroll Right"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #E8EDE9',
                  backgroundColor: '#FFFFFF',
                  color: '#145C43',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 800,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                }}
              >
                ›
              </button>
            </div>
          </div>

          {/* Strictly 1 Single Horizontal Row Carousel */}
          <div
            ref={recommendedScrollRef}
            style={{
              display: 'flex',
              flexDirection: 'row',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              gap: '16px',
              padding: '4px 2px 14px 2px',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {curatedRecommended.map(svc => {
              const basePrice = Math.round(svc.basePricePaise / 100);
              const mrp = svc.strikethroughPricePaise
                ? Math.round(svc.strikethroughPricePaise / 100)
                : Math.round(basePrice * 1.3);
              const pillTag = svc.badge || (svc.isPopular ? 'Popular' : 'Recommended');

              let pillBg = '#EAF6EF';
              let pillText = '#16865D';
              if (pillTag === 'Most Booked' || pillTag === 'Bestseller' || pillTag === 'Popular') {
                pillBg = '#FEF3E2';
                pillText = '#D97706';
              } else if (pillTag === 'Combo Offer' || pillTag === 'Immunity Boost') {
                pillBg = '#EEF2FF';
                pillText = '#4F46E5';
              } else if (pillTag.includes('Fast') || pillTag.includes('Instant') || pillTag.includes('30m') || pillTag.includes('45m')) {
                pillBg = '#E0F2FE';
                pillText = '#0284C7';
              }

              const rating = svc.rating ?? 4.8;
              const rawReviews = svc.reviewCount ?? 150;
              const reviews = typeof rawReviews === 'number' && rawReviews >= 1000
                ? `${(rawReviews / 1000).toFixed(1)}K`
                : String(rawReviews);

              return (
                <div
                  key={svc.id}
                  style={{
                    flex: '0 0 275px',
                    width: '275px',
                    scrollSnapAlign: 'start',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    border: '1px solid #E8EDE9',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {/* Top Pill Tag & Category */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        backgroundColor: pillBg,
                        color: pillText,
                        padding: '2px 8px',
                        borderRadius: '8px',
                      }}
                    >
                      {pillTag}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#6B756F', fontWeight: 600, maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {svc.category?.name}
                    </span>
                  </div>

                  {/* Service Photo Thumbnail */}
                  {svc.imageUrl && (
                    <div
                      style={{
                        width: '100%',
                        height: '130px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        marginBottom: '10px',
                        backgroundColor: '#F7F9F7',
                        border: '1px solid #E8EDE9',
                      }}
                    >
                      <img
                        src={svc.imageUrl}
                        alt={svc.name}
                        onError={e => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  )}

                  <h3 style={{ fontSize: '14.5px', fontWeight: 800, color: '#17211C', margin: '0 0 4px 0', lineHeight: 1.3, height: '38px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {svc.name}
                  </h3>

                  <p style={{ fontSize: '11.5px', color: '#6B756F', margin: '0 0 10px 0', lineHeight: 1.35, height: '32px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {svc.description}
                  </p>

                  {/* Metadata: Rating & Duration */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px', color: '#6B756F', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#D97706' }}>★ {rating} ({reviews})</span>
                    <span>•</span>
                    <span>⏱ {svc.estimatedDurationMinutes} mins</span>
                  </div>

                  {/* Bottom Row: Price & Book Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #F1F5F2' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 900, color: '#145C43' }}>
                          ₹{basePrice}
                        </span>
                        <span style={{ fontSize: '11px', color: '#8E9992', textDecoration: 'line-through' }}>
                          ₹{mrp}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedBookingService(svc);
                      }}
                      style={{
                        backgroundColor: '#16865D',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(22, 134, 93, 0.25)',
                      }}
                    >
                      + Book
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Swipe Indicator Footer */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#16865D', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#EAF6EF', padding: '3px 12px', borderRadius: '12px' }}>
              <span>👉</span> Swipe sideways to view all {curatedRecommended.length} recommended services
            </span>
          </div>
        </div>

        {/* ── SECTION F: SERVICE CATEGORIES CATALOG (All Services Organized Under Respective Categories) ── */}
        <div id="catalog-section" style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                  {selectedCategorySlug && selectedCategorySlug !== 'all'
                    ? `${CORE_CATEGORIES.find(c => c.slug === selectedCategorySlug)?.name || 'Category'} Services`
                    : 'All Services by Category'}
                </h2>
                {selectedCategorySlug && selectedCategorySlug !== 'all' && (
                  <button
                    onClick={() => setSelectedCategorySlug(null)}
                    style={{
                      backgroundColor: '#EAF6EF',
                      color: '#16865D',
                      border: '1px solid #D1EADE',
                      borderRadius: '8px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ✕ Clear Filter
                  </button>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#6B756F', marginTop: '2px' }}>
                {selectedCategorySlug && selectedCategorySlug !== 'all'
                  ? `Showing all verified services under ${CORE_CATEGORIES.find(c => c.slug === selectedCategorySlug)?.name}`
                  : 'Select a category above or browse through all verified doorstep repairs'}
              </div>
            </div>

            {/* Category Filter Badges */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }}>
              <button
                onClick={() => setSelectedCategorySlug(null)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid #D6E8DC',
                  backgroundColor: !selectedCategorySlug || selectedCategorySlug === 'all' ? '#145C43' : '#FFFFFF',
                  color: !selectedCategorySlug || selectedCategorySlug === 'all' ? '#FFFFFF' : '#4A5B52',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                All ({totalRecords || PRODUCTION_SERVICES_CATALOG.length})
              </button>
              {CORE_CATEGORIES.filter(c => c.slug !== 'all').map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategorySlug(cat.slug)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: '1px solid #D6E8DC',
                    backgroundColor: selectedCategorySlug === cat.slug ? '#145C43' : '#FFFFFF',
                    color: selectedCategorySlug === cat.slug ? '#FFFFFF' : '#4A5B52',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {isLoadingInitial ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px', gap: '12px' }}>
              <Spinner size="lg" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#16865D' }}>Loading verified catalog...</span>
            </div>
          ) : services.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 16px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #E8EDE9' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#17211C' }}>No Matching Services Found</div>
              <div style={{ fontSize: '13px', color: '#6B756F', marginTop: '4px', maxWidth: '340px', margin: '4px auto 16px auto' }}>
                We couldn't find any services matching your search or category filter.
              </div>
              <button
                onClick={() => { setSelectedCategorySlug(null); setSearchQuery(''); }}
                style={{ backgroundColor: '#145C43', color: '#FFFFFF', border: 'none', borderRadius: '12px', padding: '8px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
              >
                Reset & View All Services
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '16px',
                }}
              >
                {services.map(svc => {
                  const basePrice = Math.round(svc.basePricePaise / 100);
                  const mrp = svc.strikethroughPricePaise
                    ? Math.round(svc.strikethroughPricePaise / 100)
                    : Math.round(basePrice * 1.3);
                  const pillTag = svc.badge || (svc.isPopular ? 'Popular' : 'Recommended');

                  let pillBg = '#EAF6EF';
                  let pillText = '#16865D';
                  if (pillTag === 'Most Booked' || pillTag === 'Bestseller' || pillTag === 'Popular') {
                    pillBg = '#FEF3E2';
                    pillText = '#D97706';
                  } else if (pillTag === 'Combo Offer' || pillTag === 'Immunity Boost') {
                    pillBg = '#EEF2FF';
                    pillText = '#4F46E5';
                  } else if (pillTag.includes('Fast') || pillTag.includes('Instant') || pillTag.includes('30m') || pillTag.includes('45m')) {
                    pillBg = '#E0F2FE';
                    pillText = '#0284C7';
                  }

                  const rating = svc.rating ?? 4.8;
                  const rawReviews = svc.reviewCount ?? 150;
                  const reviews = typeof rawReviews === 'number' && rawReviews >= 1000
                    ? `${(rawReviews / 1000).toFixed(1)}K`
                    : String(rawReviews);

                  return (
                    <Card
                      key={svc.id}
                      style={{
                        padding: '16px',
                        borderRadius: '18px',
                        border: '1px solid #E8EDE9',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 3px 12px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Top Pill Tag */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: pillBg,
                            color: pillText,
                            padding: '3px 8px',
                            borderRadius: '8px',
                          }}
                        >
                          {pillTag}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6B756F', fontWeight: 600 }}>
                          {svc.category?.name}
                        </span>
                      </div>

                      {/* Service Photo Thumbnail */}
                      {svc.imageUrl && (
                        <div
                          style={{
                            width: '100%',
                            height: '135px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '10px',
                            backgroundColor: '#F7F9F7',
                            border: '1px solid #E8EDE9',
                          }}
                        >
                          <img
                            src={
                              svc.imageUrl.startsWith('http') || svc.imageUrl.startsWith('data:')
                                ? svc.imageUrl
                                : svc.imageUrl.startsWith('/')
                                ? `${API_BASE}${svc.imageUrl}`
                                : `${API_BASE}/${svc.imageUrl}`
                            }
                            alt={svc.name}
                            onError={e => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#17211C', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                        {svc.name}
                      </h3>

                      <p style={{ fontSize: '12px', color: '#6B756F', margin: '0 0 12px 0', lineHeight: 1.4, flex: 1 }}>
                        {svc.description}
                      </p>

                      {/* Metadata: Rating & Duration */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B756F', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 700, color: '#D97706' }}>★ {rating} ({reviews})</span>
                        <span>•</span>
                        <span>⏱ {svc.estimatedDurationMinutes} mins</span>
                      </div>

                      {/* Bottom Row: Price & Add Button */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F1F5F2' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '18px', fontWeight: 900, color: '#145C43' }}>
                              ₹{basePrice}
                            </span>
                            <span style={{ fontSize: '12px', color: '#8E9992', textDecoration: 'line-through' }}>
                              ₹{mrp}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedBookingService(svc);
                          }}
                          style={{
                            backgroundColor: '#FFFFFF',
                            color: '#16865D',
                            border: '1.5px solid #16865D',
                            borderRadius: '10px',
                            padding: '6px 14px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          + Book
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* ── ON-DEMAND INFINITE SCROLLING SENTINEL & LIVE CHUNK LOADER ── */}
              <div
                ref={sentinelRef}
                style={{
                  minHeight: '52px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '16px',
                }}
              >
                {isLoadingMore && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#16865D',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#EAF6EF',
                      padding: '8px 18px',
                      borderRadius: '20px',
                    }}
                  >
                    <Spinner size="sm" />
                    <span>Loading more services (Chunk Page {page + 1})...</span>
                  </div>
                )}
                {!hasMore && services.length > 0 && (
                  <div
                    style={{
                      color: '#6B756F',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: '1px solid #E8EDE9',
                    }}
                  >
                    <span>✓ All {totalRecords} available services loaded</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── SECTION F: LOYALTY & MEMBERSHIP BANNER (HomeServeX Plus) ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF7EE 0%, #FFF0DF 100%)',
            borderRadius: '20px',
            border: '1.5px solid #FED7AA',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 16px rgba(232, 122, 30, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '240px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#E87A1E',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(232, 122, 30, 0.3)',
              }}
            >
              👑
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: '#7C2D12' }}>
                  HomeServeX Plus
                </span>
                <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#E87A1E', color: '#FFFFFF', padding: '1px 6px', borderRadius: '6px' }}>
                  10% OFF
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#9A3412', margin: 0, lineHeight: 1.4 }}>
                Priority booking, free revisits, exclusive discounts and more!
              </p>
            </div>
          </div>

          <button
            onClick={() => alert('HomeServeX Plus Membership activated! Enjoy 10% flat off on all bookings.')}
            style={{
              backgroundColor: '#E87A1E',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(232, 122, 30, 0.25)',
            }}
          >
            Join Now &gt;
          </button>
        </div>

        {/* ── SECTION G: "YOUR APPLIANCE HEALTH" ASSET TRACKER ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
              Your Appliance Health
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16865D', backgroundColor: '#EAF6EF', padding: '3px 8px', borderRadius: '8px' }}>
              {appliances.length} Registered Units
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {appliances.map(app => (
              <div
                key={app.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #E8EDE9',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      backgroundColor: '#EAF6EF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      flexShrink: 0,
                    }}
                  >
                    {app.icon || '❄️'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#17211C' }}>
                        {app.name}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#16865D', backgroundColor: '#EAF6EF', padding: '2px 8px', borderRadius: '10px' }}>
                        Next service due in {app.nextServiceDueDays} days
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B756F' }}>
                      Last service: {app.lastServiceDate} · {app.lastServiceNotes}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const match = services.find(s => s.slug === app.recommendedServiceSlug) || services[0];
                    if (match) setSelectedBookingService(match);
                  }}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#145C43',
                    border: '1.5px solid #145C43',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  Book Service &gt;
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── SECTION H: FIXED MOBILE-FIRST BOTTOM NAVIGATION DOCK ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E8EDE9',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
      <nav
        style={{
          height: '68px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '0 12px',
          maxWidth: '840px',
          margin: '0 auto',
        }}
      >
        {/* Tab 1: Home */}
        <button
          onClick={() => {
            setActiveBottomTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeBottomTab === 'home' ? '#145C43' : '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <div style={{ fontSize: '18px' }}>🏠</div>
          <span style={{ fontSize: '11px', fontWeight: activeBottomTab === 'home' ? 800 : 500 }}>
            Home
          </span>
        </button>

        {/* Tab 2: Bookings */}
        <button
          onClick={() => navigate('/bookings')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeBottomTab === 'bookings' ? '#145C43' : '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <Icons.Calendar size={18} color={activeBottomTab === 'bookings' ? '#145C43' : '#8E9992'} />
          <span style={{ fontSize: '11px', fontWeight: activeBottomTab === 'bookings' ? 800 : 500 }}>
            Bookings
          </span>
        </button>

        {/* CENTER ELEVATED FLOATING CIRCULAR QUICK BOOK BUTTON */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <button
            onClick={() => {
              const chosen = services[0] ?? curatedRecommended[0];
              if (chosen) setSelectedBookingService(chosen);
            }}
            title="Quick Book Service"
            style={{
              position: 'absolute',
              top: '-26px',
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#145C43',
              color: '#FFFFFF',
              border: '3px solid #FFFFFF',
              boxShadow: '0 6px 18px rgba(20, 92, 67, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.15s ease',
            }}
          >
            <Icons.Zap size={22} color="#FFFFFF" />
          </button>
        </div>

        {/* Tab 3: Offers */}
        <button
          onClick={() => navigate('/offers')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeBottomTab === 'offers' ? '#145C43' : '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <Icons.Tag size={18} color={activeBottomTab === 'offers' ? '#145C43' : '#8E9992'} />
          <span style={{ fontSize: '11px', fontWeight: activeBottomTab === 'offers' ? 800 : 500 }}>
            Offers
          </span>
        </button>

        {/* Tab 4: Account */}
        <button
          onClick={() => {
            if (user) {
              navigate('/account');
            } else {
              navigate('/login');
            }
          }}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: activeBottomTab === 'account' ? '#145C43' : '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <Icons.User size={18} color={activeBottomTab === 'account' ? '#145C43' : '#8E9992'} />
          <span style={{ fontSize: '11px', fontWeight: activeBottomTab === 'account' ? 800 : 500 }}>
            {user ? 'Account' : 'Sign In'}
          </span>
        </button>
      </nav>
      </div>

      {/* ── BOOKING MODAL ── */}
      <BookingModal
        isOpen={!!selectedBookingService}
        onClose={() => setSelectedBookingService(null)}
        service={selectedBookingService}
      />

      {/* ── NOTIFICATION CENTER SLIDE-OUT DRAWER ── */}
      {isNotificationOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsNotificationOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '420px',
              height: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: '-8px 0 30px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid #E8EDE9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🔔</span>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#17211C' }}>
                    Notification Center
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B756F' }}>
                    {unreadNotificationCount} unread update{unreadNotificationCount === 1 ? '' : 's'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadNotificationCount > 0 && (
                  <button
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#16865D',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsNotificationOpen(false)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#F7F9F7',
                    border: '1px solid #E8EDE9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: '#6B756F',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                padding: '10px 16px',
                gap: '8px',
                backgroundColor: '#F7F9F7',
                borderBottom: '1px solid #E8EDE9',
              }}
            >
              {(['ALL', 'BOOKINGS', 'OFFERS'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setNotificationTab(tab)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: notificationTab === tab ? 800 : 600,
                    backgroundColor: notificationTab === tab ? '#145C43' : '#FFFFFF',
                    color: notificationTab === tab ? '#FFFFFF' : '#6B756F',
                    cursor: 'pointer',
                    boxShadow: notificationTab === tab ? '0 2px 6px rgba(20, 92, 67, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab === 'ALL' ? 'All' : tab === 'BOOKINGS' ? 'Bookings' : 'Offers'}
                </button>
              ))}
            </div>

            {/* Notification List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', color: '#8E9992' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>📭</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#17211C' }}>No Notifications</div>
                  <div style={{ fontSize: '12.5px', marginTop: '4px' }}>You're all caught up!</div>
                </div>
              ) : (
                filteredNotifications.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '16px',
                      backgroundColor: item.isRead ? '#FFFFFF' : '#F4FAF6',
                      border: `1.5px solid ${item.isRead ? '#E8EDE9' : '#CBE5D7'}`,
                      boxShadow: item.isRead ? 'none' : '0 2px 8px rgba(22, 134, 93, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>
                          {item.type === 'BOOKING' ? '🛠️' : item.type === 'OFFER' ? '🏷️' : item.type === 'ALERT' ? '⚠️' : '🛡️'}
                        </span>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#17211C' }}>
                          {item.title}
                        </div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#8E9992', fontWeight: 600 }}>
                        {item.timeAgo}
                      </span>
                    </div>

                    <div style={{ fontSize: '12.5px', color: '#4A5B52', lineHeight: 1.45 }}>
                      {item.message}
                    </div>

                    {item.actionLabel && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setIsNotificationOpen(false);
                            if (item.actionUrl?.startsWith('#')) {
                              const el = document.getElementById(item.actionUrl.substring(1));
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            } else if (item.actionUrl) {
                              if (item.actionUrl.startsWith('/')) {
                                navigate(item.actionUrl);
                              } else {
                                window.location.href = item.actionUrl;
                              }
                            }
                          }}
                          style={{
                            backgroundColor: '#16865D',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {item.actionLabel} &gt;
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer with Clear All */}
            {notifications.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #E8EDE9', backgroundColor: '#F7F9F7', display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => setNotifications([])}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#8E9992',
                    cursor: 'pointer',
                  }}
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INTERACTIVE TRUST BADGE GUARANTEE MODAL ── */}
      {selectedTrustBadge && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            backdropFilter: 'blur(3px)',
          }}
          onClick={() => setSelectedTrustBadge(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
              border: '1px solid #E8EDE9',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    backgroundColor: '#EAF6EF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #D1EADE',
                  }}
                >
                  {renderTrustIcon(selectedTrustBadge.icon)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#17211C' }}>
                    {selectedTrustBadge.title}
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#16865D', backgroundColor: '#EAF6EF', padding: '1px 8px', borderRadius: '6px' }}>
                    {selectedTrustBadge.badge}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrustBadge(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '1px solid #E8EDE9',
                  backgroundColor: '#F7F9F7',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: '#6B756F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13.5px', color: '#4A5B52', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              {selectedTrustBadge.description || selectedTrustBadge.subtitle}
            </p>

            <div style={{ backgroundColor: '#F0FAF4', borderRadius: '14px', padding: '14px', border: '1px solid #D1EADE', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#145C43', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🛡️</span> HomeServeX Quality Assurance
              </div>
              <div style={{ fontSize: '12px', color: '#3A4B42', lineHeight: 1.45 }}>
                {selectedTrustBadge.subtitle}. If our verified professional fails to meet these standards, you are entitled to a zero-cost re-visit or 100% money-back guarantee under our customer charter.
              </div>
            </div>

            <button
              onClick={() => setSelectedTrustBadge(null)}
              style={{
                width: '100%',
                backgroundColor: '#145C43',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(20, 92, 67, 0.25)',
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
