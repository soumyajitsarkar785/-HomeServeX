import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  slug: string;
  title: string;
  category: string;
}

export interface UserLocation {
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  isGps?: boolean;
}

interface CustomerHomeScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  userAddress?: string;
  currentLocation?: UserLocation;
  onDetectLocation?: () => Promise<void>;
  onUpdateLocation?: (loc: UserLocation) => void;
}

export const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({
  onNavigate,
  userAddress: _userAddress = 'Joynagar, Greater Kolkata, WB 700145',
  currentLocation,
  onDetectLocation: _onDetectLocation,
  onUpdateLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechFeedback, setSpeechFeedback] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = React.useRef<HTMLDivElement>(null);

  // Full-Featured 📅 Schedule Booking State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedScheduleService, setSelectedScheduleService] = useState('split-ac-regular-service');
  const [scheduleDay, setScheduleDay] = useState<'today' | 'tomorrow' | 'day_after' | 'custom'>('tomorrow');
  const [customScheduleDate, setCustomScheduleDate] = useState(() => {
    const tm = new Date(Date.now() + 86400000);
    return tm.toISOString().split('T')[0];
  });
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState('10:00 AM - 01:00 PM');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleFlatNumber, setScheduleFlatNumber] = useState('');
  const [scheduleLandmark, setScheduleLandmark] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [confirmedScheduledOrder, setConfirmedScheduledOrder] = useState<any | null>(null);
  const [showScheduleSuccessModal, setShowScheduleSuccessModal] = useState(false);
  const [isDetectingScheduleGps, setIsDetectingScheduleGps] = useState(false);
  const [scheduleGpsSuccessMsg, setScheduleGpsSuccessMsg] = useState('');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const cardWidth = 200;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveSlide(Math.min(trustPromises.length - 1, Math.max(0, index)));
  };

  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setShowVoiceModal(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechFeedback('Listening... Speak your service request now');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript || '';
        if (transcript) {
          setSearchQuery(transcript);
          setSpeechFeedback(`Recognized: "${transcript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[HomeServeX] Voice recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setShowVoiceModal(true);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('[HomeServeX] Voice recognition start error:', e);
      setIsListening(false);
      setShowVoiceModal(true);
    }
  };

  const trustPromises = [
    {
      id: 'experts',
      title: 'Verified Experts',
      subtitle: 'Police & background verified master technicians',
      badge: 'Police Verified',
      icon: <Icons.ShieldCheck size={20} color="#16A34A" />,
    },
    {
      id: 'parts',
      title: 'Genuine OEM Parts',
      subtitle: 'Brand-authentic components with official invoice',
      badge: '100% Original',
      icon: <Icons.Tools size={20} color="#16A34A" />,
    },
    {
      id: 'pricing',
      title: 'Upfront Pricing',
      subtitle: 'Transparent rate cards with zero hidden surprise costs',
      badge: 'Fixed Rates',
      icon: <Icons.Tag size={20} color="#16A34A" />,
    },
    {
      id: 'warranty',
      title: '30-Day Warranty',
      subtitle: 'Free doorstep revisit & complete rework guarantee',
      badge: 'Protected',
      icon: <Icons.CheckCircle size={20} color="#16A34A" />,
    },
    {
      id: 'dispatch',
      title: '30-Min Fast Dispatch',
      subtitle: 'Real-time GPS tracking to your exact doorstep',
      badge: 'Live GPS',
      icon: <Icons.Zap size={20} color="#16A34A" />,
    },
  ];

  const defaultCategories: CategoryItem[] = [
    { id: 'ac', name: 'AC Service', icon: '❄️', slug: 'split-ac-regular-service', title: 'AC Service & Repair', category: 'AC' },
    { id: 'wm', name: 'Washing Machine', icon: '🧺', slug: 'washing-machine-overhaul', title: 'Washing Machine Repair', category: 'Appliances' },
    { id: 'fridge', name: 'Refrigerator', icon: '🧊', slug: 'fridge-cooling-diagnostics', title: 'Refrigerator Repair', category: 'Appliances' },
    { id: 'micro', name: 'Microwave Oven', icon: '📻', slug: 'microwave-heating-repair', title: 'Microwave Oven Repair', category: 'Appliances' },
    { id: 'purifier', name: 'Water Purifier', icon: '💧', slug: 'ro-filter-service', title: 'Water Purifier (RO) Service', category: 'Appliances' },
    { id: 'geyser', name: 'Geyser', icon: '🔥', slug: 'geyser-service', title: 'Geyser Service & Installation', category: 'Appliances' },
    { id: 'chimney', name: 'Chimney & Hob', icon: '💨', slug: 'kitchen-deep-degreasing', title: 'Kitchen Chimney & Hob Cleaning', category: 'Appliances' },
    { id: 'tv', name: 'TV Repair', icon: '📺', slug: 'tv-repair-service', title: 'Smart & LED TV Repair', category: 'Appliances' },
    { id: 'cleaning', name: 'Deep Cleaning', icon: '🧹', slug: 'deep-bathroom-cleaning', title: 'Home & Bathroom Deep Cleaning', category: 'Cleaning' },
    { id: 'sofa', name: 'Sofa Cleaning', icon: '🛋️', slug: 'sofa-carpet-cleaning', title: 'Sofa & Carpet Shampooing', category: 'Cleaning' },
    { id: 'electrician', name: 'Electrician', icon: '⚡', slug: 'switchboard-repair', title: 'Electrician & Wiring Repair', category: 'Electrical' },
    { id: 'plumbing', name: 'Plumbing', icon: '🔧', slug: 'tap-leak-repair', title: 'Plumbing & Leak Repairs', category: 'Plumbing' },
    { id: 'carpentry', name: 'Carpentry', icon: '🪚', slug: 'carpentry-service', title: 'Carpentry & Furniture Assembly', category: 'Carpentry' },
    { id: 'pest', name: 'Pest Control', icon: '🪲', slug: 'pest-control-service', title: 'Pest & Termite Control', category: 'Pest Control' },
    { id: 'painting', name: 'Home Painting', icon: '🎨', slug: 'painting-service', title: 'House & Wall Painting', category: 'Painting' },
    { id: 'book_now', name: 'Book Service', icon: '⚡', slug: 'split-ac-regular-service', title: 'Instant Doorstep Booking', category: 'AC' },
    { id: 'all_catalog', name: 'All Services', icon: '📑', slug: 'all', title: 'All Services Catalog', category: 'All' },
  ];

  const [allCategories, setAllCategories] = useState<CategoryItem[]>(defaultCategories);
  const [recommendedServices, setRecommendedServices] = useState<any[]>([
    {
      id: 'rec-1',
      title: 'Split AC Power Jet Cleaning',
      category: 'AC Servicing & Repair',
      description: 'Indoor coil high-pressure wash, outdoor condenser jet flush, drainage tray sanitization & gas check.',
      rating: '4.8',
      reviews: '2.4K',
      duration: '60 mins',
      price: '₹699',
      originalPrice: '₹899',
      badge: 'Fast 45m',
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=500&q=80',
      slug: 'split-ac-regular-service',
    },
    {
      id: 'rec-2',
      title: 'AC Gas Top-up & Leak Check (R32/R410)',
      category: 'AC Servicing & Repair',
      description: 'Nitrogen pressure testing, copper valve leak brazing, vacuum evacuation, and pure R32/R410 refrigerant recharge.',
      rating: '4.9',
      reviews: '1.8K',
      duration: '75 mins',
      price: '₹1299',
      originalPrice: '₹1699',
      badge: 'Recommended',
      badgeBg: '#DCFCE7',
      badgeColor: '#15803D',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=500&q=80',
      slug: 'split-ac-regular-service',
    },
    {
      id: 'rec-3',
      title: 'Split AC Installation & Uninstallation',
      category: 'AC Servicing & Repair',
      description: 'Precision bracket mounting, copper pipe flare connection, vacuum purge, and cooling air flow calibration.',
      rating: '4.8',
      reviews: '920',
      duration: '90 mins',
      price: '₹1199',
      originalPrice: '₹1499',
      badge: 'Popular',
      badgeBg: '#FEF9C3',
      badgeColor: '#A16207',
      imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=500&q=80',
      slug: 'split-ac-regular-service',
    },
    {
      id: 'rec-4',
      title: 'Washing Machine Deep Clean & Repair',
      category: 'Washing Machine Repair',
      description: 'Drum descaling, drain pump unclogging, motor vibration dampening & comprehensive electrical check.',
      rating: '4.8',
      reviews: '1.5K',
      duration: '45 mins',
      price: '₹499',
      originalPrice: '₹799',
      badge: 'Instant 45m',
      badgeBg: '#E0F2FE',
      badgeColor: '#0369A1',
      imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=500&q=80',
      slug: 'washing-machine-overhaul',
    },
  ]);

  const [heroBanner, setHeroBanner] = useState<any>({
    badge: '⚡ FAST. RELIABLE. TRUSTED.',
    title: 'We fix it today,',
    highlightTitle: 'so you can relax tomorrow.',
    subtitle: 'Certified experts at your doorstep in as little as 30 minutes.',
    imageUrl: '/hero-technician.jpg',
    ctaText: 'Book Service',
    discountBadge: '10K+ Happy Customers',
  });

  const [activeOrder, setActiveOrder] = useState<any | null>(null);

  // Dynamic Data Synchronization with Admin Backend DB
  React.useEffect(() => {
    const categoryEmojiMap: Record<string, string> = {
      'ac-servicing': '❄️',
      'washing-machine': '🧺',
      'refrigerator': '🧊',
      'water-purifier': '💧',
      'cleaning': '🧹',
      'electrical': '⚡',
      'plumbing': '🔧',
      'appliances': '📺',
      'microwave': '📻',
      'geyser': '🔥',
      'painting': '🎨',
      'carpentry': '🪚',
    };

    // 1. Fetch Dynamic Categories from DB
    fetch('/api/v1/services/categories')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const dynamicCats: CategoryItem[] = json.data.map((c: any) => {
            const isEmoji = c.iconUrl && !c.iconUrl.startsWith('/') && !c.iconUrl.startsWith('http');
            const icon = isEmoji ? c.iconUrl : (categoryEmojiMap[c.slug] || '⚡');
            return {
              id: c.id,
              name: c.name,
              icon,
              slug: c.slug,
              title: c.name,
              category: c.name,
            };
          });
          dynamicCats.push({
            id: 'book_now',
            name: 'Book Service',
            icon: '⚡',
            slug: dynamicCats[0]?.slug || 'split-ac-regular-service',
            title: 'Instant Doorstep Booking',
            category: 'AC',
          });
          dynamicCats.push({
            id: 'all_catalog',
            name: 'All Services',
            icon: '📑',
            slug: 'all',
            title: 'All Services Catalog',
            category: 'All',
          });
          setAllCategories(dynamicCats);
        }
      })
      .catch(() => {});

    // 2. Fetch Dynamic Recommended Services from DB
    fetch('/api/v1/services?limit=8')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const dynamicRecs = json.data.map((s: any, idx: number) => ({
            id: s.id,
            title: s.name,
            category: s.category?.name || 'Home Appliances',
            description: s.description || 'Verified doorstep service by certified specialist',
            rating: s.rating ? String(s.rating) : '4.8',
            reviews: s.reviewCount ? `${s.reviewCount}` : '1.2K',
            duration: `${s.estimatedDurationMinutes || 45} mins`,
            price: `₹${Math.round(s.basePricePaise / 100)}`,
            originalPrice: `₹${Math.round((s.strikethroughPricePaise || s.basePricePaise * 1.3) / 100)}`,
            badge: s.badge || (idx === 0 ? 'Fast 45m' : 'Popular'),
            badgeBg: idx === 0 ? '#E0F2FE' : '#DCFCE7',
            badgeColor: idx === 0 ? '#0369A1' : '#15803D',
            imageUrl: s.imageUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=500&q=80',
            slug: s.slug,
          }));
          setRecommendedServices(dynamicRecs);
        }
      })
      .catch(() => {});

    // 3. Fetch Promotional Hero Banner (Admin Controlled)
    fetch('/api/v1/services/banners')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const first = json.data[0];
          setHeroBanner({
            badge: first.badge || '⚡ FAST. RELIABLE. TRUSTED.',
            title: first.title || 'We fix it today,',
            highlightTitle: first.highlightTitle || 'so you can relax tomorrow.',
            subtitle: first.subtitle || 'Certified experts at your doorstep in as little as 30 minutes.',
            imageUrl: first.imageUrl || '/hero-technician.jpg',
            ctaText: first.ctaText || 'Book Service',
            discountBadge: first.discountBadge || '10K+ Happy Customers',
          });
        }
      })
      .catch(() => {});
  }, []);

  const compactCategories: CategoryItem[] = allCategories.slice(0, 8);
  const displayedCategories: CategoryItem[] = showAllCategories ? allCategories : compactCategories;

  React.useEffect(() => {
    const checkLiveOrder = () => {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hsx_customer_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/v1/bookings', { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data && Array.isArray(data.data)) {
            const ongoing = data.data.find((b: any) => b.status === 'On the way' || b.statusType === 'ongoing');
            setActiveOrder(ongoing || null);
          }
        })
        .catch(() => {});
    };

    checkLiveOrder();
    const interval = setInterval(checkLiveOrder, 5000);
    return () => clearInterval(interval);
  }, []);

  const scheduleCategoryList = [
    { slug: 'split-ac-regular-service', title: 'AC Service & Repair', icon: '❄️', category: 'AC', price: '₹499', duration: '45 mins' },
    { slug: 'washing-machine-overhaul', title: 'Washing Machine Repair', icon: '🧺', category: 'Appliances', price: '₹449', duration: '45 mins' },
    { slug: 'fridge-cooling-diagnostics', title: 'Refrigerator Repair', icon: '🧊', category: 'Appliances', price: '₹549', duration: '45 mins' },
    { slug: 'ro-filter-service', title: 'Water Purifier (RO) Service', icon: '💧', category: 'Appliances', price: '₹499', duration: '45 mins' },
    { slug: 'microwave-heating-repair', title: 'Microwave Oven Repair', icon: '📻', category: 'Appliances', price: '₹399', duration: '30 mins' },
    { slug: 'geyser-service', title: 'Geyser & Water Heater', icon: '🔥', category: 'Appliances', price: '₹399', duration: '30 mins' },
    { slug: 'kitchen-deep-degreasing', title: 'Kitchen Chimney & Hob', icon: '💨', category: 'Appliances', price: '₹699', duration: '60 mins' },
    { slug: 'tv-repair-service', title: 'Smart & LED TV Repair', icon: '📺', category: 'Appliances', price: '₹499', duration: '45 mins' },
    { slug: 'deep-bathroom-cleaning', title: 'Deep Cleaning Services', icon: '🧹', category: 'Cleaning', price: '₹599', duration: '90 mins' },
    { slug: 'sofa-carpet-cleaning', title: 'Sofa & Carpet Cleaning', icon: '🛋️', category: 'Cleaning', price: '₹799', duration: '90 mins' },
    { slug: 'switchboard-repair', title: 'Electrician & Wiring', icon: '⚡', category: 'Electrical', price: '₹249', duration: '30 mins' },
    { slug: 'tap-leak-repair', title: 'Plumbing & Leakages', icon: '🔧', category: 'Plumbing', price: '₹299', duration: '45 mins' },
    { slug: 'carpentry-service', title: 'Carpentry & Furniture', icon: '🪚', category: 'Carpentry', price: '₹399', duration: '60 mins' },
    { slug: 'pest-control-service', title: 'Pest & Termite Control', icon: '🪲', category: 'Pest Control', price: '₹899', duration: '90 mins' },
    { slug: 'painting-service', title: 'House & Wall Painting', icon: '🎨', category: 'Painting', price: '₹2499', duration: '180 mins' },
  ];

  const handleDetectScheduleGps = async () => {
    setIsDetectingScheduleGps(true);
    setScheduleGpsSuccessMsg('');
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const title =
                addr.road ||
                addr.suburb ||
                addr.neighbourhood ||
                addr.residential ||
                addr.city_district ||
                addr.city ||
                'Current Doorstep Location';
              const city = addr.city || addr.town || addr.municipality || addr.county || addr.state || '';
              const postcode = addr.postcode || '';
              const subtitle = [city, postcode].filter(Boolean).join(', ') || 'Doorstep Delivery';
              const fullAddress = data.display_name || `${title}, ${subtitle}`;

              const newLoc: UserLocation = {
                title,
                subtitle,
                fullAddress,
                latitude: lat,
                longitude: lon,
                isGps: true,
              };
              if (onUpdateLocation) onUpdateLocation(newLoc);
              setScheduleGpsSuccessMsg(`GPS set: ${title}`);
              setIsDetectingScheduleGps(false);
              setTimeout(() => setScheduleGpsSuccessMsg(''), 4500);
              return;
            }
          } catch {}

          const fallbackLoc: UserLocation = {
            title: 'Current GPS Location 📍',
            subtitle: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
            fullAddress: `GPS Coordinates: ${lat}, ${lon}`,
            latitude: lat,
            longitude: lon,
            isGps: true,
          };
          if (onUpdateLocation) onUpdateLocation(fallbackLoc);
          setScheduleGpsSuccessMsg('GPS verified!');
          setIsDetectingScheduleGps(false);
          setTimeout(() => setScheduleGpsSuccessMsg(''), 4500);
        },
        () => {
          setIsDetectingScheduleGps(false);
          alert('Could not access device GPS. Please enable browser permissions or enter address manually.');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      setIsDetectingScheduleGps(false);
    }
  };

  const handleConfirmScheduleBooking = async () => {
    setIsSubmittingSchedule(true);
    const selectedItem =
      scheduleCategoryList.find((c) => c.slug === selectedScheduleService) ?? scheduleCategoryList[0]!;

    // Compute Scheduled Slot
    let targetDateStr = '';
    const now = new Date();
    if (scheduleDay === 'today') {
      targetDateStr = (now.toISOString().split('T')[0]) || '';
    } else if (scheduleDay === 'tomorrow') {
      const tm = new Date(Date.now() + 86400000);
      targetDateStr = (tm.toISOString().split('T')[0]) || '';
    } else if (scheduleDay === 'day_after') {
      const da = new Date(Date.now() + 172800000);
      targetDateStr = (da.toISOString().split('T')[0]) || '';
    } else {
      targetDateStr = customScheduleDate || (now.toISOString().split('T')[0]) || '';
    }

    let hour = 10;
    if (scheduleTimeSlot.includes('12:00 PM')) hour = 12;
    else if (scheduleTimeSlot.includes('03:00 PM')) hour = 15;
    else if (scheduleTimeSlot.includes('06:00 PM')) hour = 18;

    const scheduledDateObj = new Date(`${targetDateStr}T${String(hour).padStart(2, '0')}:00:00`);

    const activeAddr = [
      scheduleFlatNumber ? `Flat/House: ${scheduleFlatNumber}` : '',
      currentLocation?.fullAddress || _userAddress || 'Joynagar, Greater Kolkata, 700145',
      scheduleLandmark ? `Landmark: ${scheduleLandmark}` : '',
    ].filter(Boolean).join(', ');

    try {
      const token = localStorage.getItem('hsx_token') || localStorage.getItem('hsx_access_token') || '';
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serviceSlug: selectedItem.slug,
          serviceType: selectedItem.title,
          applianceType: 'Scheduled Doorstep Inspection',
          scheduledSlot: scheduledDateObj.toISOString(),
          address: activeAddr,
          notes: scheduleDescription.trim() || `Scheduled service for ${selectedItem.title}`,
          latitude: currentLocation?.latitude || 22.5726,
          longitude: currentLocation?.longitude || 88.3639,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setConfirmedScheduledOrder({
            ...json.data,
            scheduledSlotFormatted: `${scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${scheduleTimeSlot})`,
            serviceName: selectedItem.title,
            icon: selectedItem.icon,
            userNotes: scheduleDescription.trim(),
            address: activeAddr,
          });
          setShowScheduleModal(false);
          setShowScheduleSuccessModal(true);
        }
      } else {
        setConfirmedScheduledOrder({
          id: '#HSX' + Math.floor(100000 + Math.random() * 900000),
          scheduledSlotFormatted: `${scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${scheduleTimeSlot})`,
          serviceName: selectedItem.title,
          icon: selectedItem.icon,
          userNotes: scheduleDescription.trim(),
          address: activeAddr,
          otp: '4821',
          price: selectedItem.price,
        });
        setShowScheduleModal(false);
        setShowScheduleSuccessModal(true);
      }
    } catch {
      setConfirmedScheduledOrder({
        id: '#HSX' + Math.floor(100000 + Math.random() * 900000),
        scheduledSlotFormatted: `${scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} (${scheduleTimeSlot})`,
        serviceName: selectedItem.title,
        icon: selectedItem.icon,
        userNotes: scheduleDescription.trim(),
        address: activeAddr,
        otp: '4821',
        price: selectedItem.price,
      });
      setShowScheduleModal(false);
      setShowScheduleSuccessModal(true);
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px', paddingBottom: '110px' }}>

      {/* Search Input Box with Real Voice Search & Suggestions */}
      <div style={{ position: 'relative', zIndex: 30 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isListening ? '#FEF2F2' : '#FFFFFF',
            borderRadius: '16px',
            padding: '8px 12px 8px 16px',
            gap: '12px',
            border: isListening ? '1.5px solid #EF4444' : '1px solid #E2E8F0',
            boxShadow: isListening
              ? '0 0 0 4px rgba(239, 68, 68, 0.15)'
              : '0 2px 8px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s ease',
          }}
        >
          <div
            onClick={() => {
              if (searchQuery.trim()) onNavigate('services', { search: searchQuery });
            }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Search"
          >
            <Icons.Search size={18} color={isListening ? '#DC2626' : '#64748B'} />
          </div>

          <input
            type="text"
            placeholder={
              isListening
                ? '🎙️ Listening... speak now (e.g. AC service, plumbing)...'
                : 'Search for appliance or service...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                onNavigate('services', { search: searchQuery });
              }
            }}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              fontSize: '13px',
              color: '#0F172A',
            }}
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px 4px',
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}

          <div
            onClick={startVoiceSearch}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: isListening ? '#DC2626' : '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: isListening
                ? '0 0 0 5px rgba(220, 38, 38, 0.3), 0 2px 8px rgba(220, 38, 38, 0.4)'
                : '0 2px 6px rgba(22, 163, 74, 0.3)',
              transition: 'all 0.2s ease',
            }}
            title={isListening ? 'Listening... speak now' : 'Voice Search (Click to speak)'}
          >
            <Icons.Mic size={17} color="#FFFFFF" />
          </div>
        </div>

        {/* Listening indicator notification */}
        {isListening && (
          <div
            style={{
              marginTop: '6px',
              padding: '8px 12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: '#B91C1C',
              fontWeight: 600,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#DC2626',
                }}
              />
              <span>{speechFeedback || 'Listening... Speak your service request'}</span>
            </div>
            <button
              onClick={() => setIsListening(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#B91C1C',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              Stop
            </button>
          </div>
        )}

        {/* Instant Search Results Dropdown */}
        {searchQuery.trim().length > 0 && !isListening && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '6px',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
              border: '1px solid #E2E8F0',
              padding: '10px',
              zIndex: 100,
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', padding: '4px 8px 8px 8px' }}>
              MATCHING SERVICES
            </div>
            {allCategories
              .filter(
                (c) =>
                  c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .slice(0, 4)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    onNavigate('service-detail', {
                      slug: c.slug,
                      title: c.title,
                      category: c.category,
                    });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{c.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{c.name}</span>
                  </div>
                  <button
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Book
                  </button>
                </div>
              ))}

            <div
              onClick={() => onNavigate('services', { search: searchQuery })}
              style={{
                marginTop: '6px',
                padding: '8px',
                textAlign: 'center',
                backgroundColor: '#F0FDF4',
                borderRadius: '10px',
                color: '#166534',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Search "{searchQuery}" in All Services →
            </div>
          </div>
        )}
      </div>

      {/* Hero Banner Card */}
      <div
        style={{
          backgroundColor: '#0E3E2F',
          borderRadius: '18px',
          padding: '22px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(14, 62, 47, 0.25)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '64%' }}>
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#86EFAC',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            {heroBanner.badge || 'FAST • RELIABLE • TRUSTED'}
          </div>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 800,
              lineHeight: 1.25,
              margin: '0 0 8px 0',
              color: '#FFFFFF',
            }}
          >
            {heroBanner.title || 'We fix it today,'} {heroBanner.highlightTitle || 'so you can relax tomorrow.'}
          </h2>
          <p
            style={{
              fontSize: '11px',
              color: '#D1EAE0',
              lineHeight: 1.4,
              margin: '0 0 16px 0',
            }}
          >
            {heroBanner.subtitle || 'Certified experts at your doorstep in as little as 30 minutes.'}
          </p>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => {
                const el = document.getElementById('service-categories-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.style.transition = 'all 0.3s ease';
                  el.style.transform = 'scale(1.02)';
                  setTimeout(() => {
                    el.style.transform = 'scale(1)';
                  }, 300);
                } else {
                  onNavigate('services');
                }
              }}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '24px',
                padding: '9px 20px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.4)',
                transition: 'all 0.15s ease',
              }}
            >
              {heroBanner.ctaText || 'Book Service'}
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#0E3E2F',
                border: 'none',
                borderRadius: '24px',
                padding: '9px 18px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📅 Schedule
            </button>
          </div>
        </div>

        {/* Hero Technician Image */}
        <div
          style={{
            position: 'absolute',
            right: '-10px',
            bottom: '-10px',
            width: '145px',
            height: '160px',
            zIndex: 1,
          }}
        >
          <img
            src={heroBanner.imageUrl || '/hero-technician.jpg'}
            alt="Technician"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '12px',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80';
            }}
          />
        </div>

        {/* Floating Social Proof Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(4px)',
            borderRadius: '20px',
            padding: '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 3,
          }}
        >
          <span style={{ fontSize: '10px' }}>⭐⭐⭐⭐⭐</span>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#0F172A' }}>
            {heroBanner.discountBadge || '10K+ Happy Customers'}
          </span>
        </div>
      </div>

      {/* The HomeServeX Promise — Clean, High-end Touch Carousel */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          padding: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            The HomeServeX Promise
          </h3>

          {/* Interactive touch/swipe indicator dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {trustPromises.map((_, i) => (
              <div
                key={i}
                onClick={() => carouselRef.current?.scrollTo({ left: i * 195, behavior: 'smooth' })}
                style={{
                  width: activeSlide === i ? '16px' : '6px',
                  height: '6px',
                  borderRadius: '3px',
                  backgroundColor: activeSlide === i ? '#16A34A' : '#CBD5E1',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>

        {/* Swipeable Cards Container */}
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            paddingBottom: '4px',
          }}
        >
          {trustPromises.map((promise, idx) => (
            <div
              key={idx}
              style={{
                minWidth: '180px',
                maxWidth: '190px',
                backgroundColor: '#F8FAFC',
                borderRadius: '14px',
                padding: '14px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DCFCE7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    {promise.icon}
                  </div>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#166534',
                      backgroundColor: '#DCFCE7',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {promise.badge}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#0F172A',
                    lineHeight: 1.25,
                    marginBottom: '4px',
                  }}
                >
                  {promise.title}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.4 }}>
                  {promise.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Categories Grid */}
      <div id="service-categories-section" style={{ scrollMarginTop: '80px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Service Categories
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              onClick={() => setShowAllCategories(!showAllCategories)}
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#16A34A',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                userSelect: 'none',
              }}
            >
              {showAllCategories ? 'Show less ▴' : `View all (${allCategories.length}) ▾`}
            </span>
          </div>
        </div>

        {/* Categories Grid (4x4 when expanded, 4x2 when compact) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '14px 10px',
            textAlign: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          {displayedCategories.map((cat: CategoryItem) => (
            <div
              key={cat.id}
              onClick={() => {
                if (cat.id === 'all_catalog') {
                  onNavigate('services');
                } else if (cat.id === 'book_now') {
                  onNavigate('service-detail', {
                    slug: 'split-ac-regular-service',
                    title: 'AC Service & Repair',
                    category: 'AC',
                  });
                } else {
                  onNavigate('service-detail', {
                    slug: cat.slug,
                    title: cat.title,
                    category: cat.category,
                  });
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '18px',
                  backgroundColor: '#F0FDF4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  border: '1px solid #DCFCE7',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {cat.icon}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#1E293B',
                  lineHeight: 1.25,
                  maxWidth: '72px',
                  textAlign: 'center',
                }}
              >
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Services Section (Matching Image 2) */}
      <div style={{ marginTop: '6px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Recommended Services
          </h3>
          <button
            onClick={() => onNavigate('services')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              color: '#16A34A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: 0,
            }}
          >
            See More &gt;
          </button>
        </div>

        {/* Recommended Service Cards Grid (Matching Image 2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {recommendedServices.map((svc) => (
            <div
              key={svc.id}
              onClick={() => onNavigate('service-detail', { slug: svc.slug, title: svc.title })}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                {/* Image Container with Badge */}
                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: '#F1F5F9',
                    marginBottom: '12px',
                  }}
                >
                  <img
                    src={svc.imageUrl}
                    alt={svc.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80';
                    }}
                  />
                  {svc.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        backgroundColor: svc.badgeBg || '#E0F2FE',
                        color: svc.badgeColor || '#0369A1',
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {svc.badge}
                    </div>
                  )}
                </div>

                {/* Title */}
                <h4
                  style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 6px 0',
                    lineHeight: 1.3,
                  }}
                >
                  {svc.title}
                </h4>

                {/* Description */}
                <p
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    lineHeight: 1.4,
                    margin: '0 0 8px 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {svc.description}
                </p>

                {/* Rating & Duration */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ color: '#D97706', fontWeight: 800 }}>★ {svc.rating}</span>
                  <span style={{ color: '#64748B' }}>({svc.reviews})</span>
                  <span style={{ color: '#CBD5E1' }}>•</span>
                  <span style={{ color: '#64748B' }}>⏱ {svc.duration}</span>
                </div>
              </div>

              {/* Pricing & + Book Button Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  borderTop: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 900, color: '#0E3E2F' }}>
                    {svc.price}
                  </span>
                  {svc.originalPrice && (
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#94A3B8',
                        textDecoration: 'line-through',
                      }}
                    >
                      {svc.originalPrice}
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate('service-detail', { slug: svc.slug, title: svc.title });
                  }}
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#16A34A',
                    border: '1.5px solid #16A34A',
                    borderRadius: '20px',
                    padding: '5px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#16A34A';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.color = '#16A34A';
                  }}
                >
                  + Book
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sleek Floating Live Tracking Popup Capsule (Auto-shows during active order, auto-dismisses on completion) */}
      {activeOrder && (
        <div
          onClick={() => onNavigate('tracking', { bookingId: activeOrder.id })}
          style={{
            position: 'fixed',
            bottom: '76px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)',
            maxWidth: '520px',
            backgroundColor: '#0E3E2F',
            color: '#FFFFFF',
            borderRadius: '50px',
            padding: '10px 14px 10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 28px rgba(14, 62, 47, 0.4)',
            border: '1.5px solid #16A34A',
            zIndex: 900,
            cursor: 'pointer',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div
              style={{
                position: 'relative',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
              }}
            >
              📍
              <span
                style={{
                  position: 'absolute',
                  top: '-1px',
                  right: '-1px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#86EFAC',
                  boxShadow: '0 0 0 2px #0E3E2F',
                }}
              />
            </div>
            <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#86EFAC', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Live Order Active
              </div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {activeOrder.service}
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#0E3E2F',
              backgroundColor: '#86EFAC',
              padding: '7px 16px',
              borderRadius: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(134, 239, 172, 0.4)',
            }}
          >
            <span>Track Live</span>
            <span style={{ fontSize: '14px' }}>➔</span>
          </div>
        </div>
      )}

      {/* Voice Search Quick Modal */}
      {showVoiceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
          onClick={() => setShowVoiceModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <Icons.Mic size={28} color="#15803D" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Voice Search
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px 0' }}>
              Tap any popular request or grant microphone permission to speak:
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {[
                { label: '❄️ AC Cleaning', query: 'AC Service' },
                { label: '🧺 Washing Machine', query: 'Washing Machine' },
                { label: '🧊 Fridge Repair', query: 'Refrigerator' },
                { label: '⚡ Electrician', query: 'Electrician' },
                { label: '🔧 Plumber', query: 'Plumbing' },
                { label: '🧹 Deep Cleaning', query: 'Deep Cleaning' },
                { label: '🔥 Geyser Fix', query: 'Geyser' },
              ].map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(pill.query);
                    setShowVoiceModal(false);
                    onNavigate('services', { search: pill.query });
                  }}
                  style={{
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1E293B',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DCFCE7';
                    e.currentTarget.style.borderColor = '#86EFAC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F1F5F9';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowVoiceModal(false)}
              style={{
                width: '100%',
                backgroundColor: '#0E3E2F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '16px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Comprehensive 📅 Schedule Doorstep Service Modal */}
      {showScheduleModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📅</span>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Schedule Doorstep Service
                  </h3>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                  Select category, choose date & time, describe issue and order
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            {/* 1. Category Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Select Service Category
                </span>
                <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                  15 Categories Available
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {scheduleCategoryList.map((item) => {
                  const isSelected = selectedScheduleService === item.slug;
                  return (
                    <div
                      key={item.slug}
                      onClick={() => setSelectedScheduleService(item.slug)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: isSelected ? '2px solid #16A34A' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F0FDF4' : '#F8FAFC',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '22px' }}>{item.icon}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? '#166534' : '#1E293B',
                          lineHeight: 1.2,
                        }}
                      >
                        {item.title}
                      </span>
                      <span style={{ fontSize: '10px', color: isSelected ? '#15803D' : '#64748B', fontWeight: 700 }}>
                        {item.price}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Preferred Date Selection */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Select Preferred Date
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {[
                  { id: 'today', label: 'Today', sub: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                  { id: 'tomorrow', label: 'Tomorrow', sub: new Date(Date.now() + 86400000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                  { id: 'day_after', label: 'Day After', sub: new Date(Date.now() + 172800000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setScheduleDay(d.id as any)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '12px',
                      border: scheduleDay === d.id ? '2px solid #16A34A' : '1px solid #E2E8F0',
                      backgroundColor: scheduleDay === d.id ? '#F0FDF4' : '#F8FAFC',
                      textAlign: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: scheduleDay === d.id ? '#166534' : '#0F172A' }}>
                      {d.label}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                      {d.sub}
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Or pick custom date:</span>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={customScheduleDate}
                  onChange={(e) => {
                    setCustomScheduleDate(e.target.value);
                    setScheduleDay('custom');
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: scheduleDay === 'custom' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    fontSize: '12px',
                    color: '#0F172A',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            {/* 3. Arrival Time Window */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                3. Choose Arrival Time Slot
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { slot: '09:00 AM - 12:00 PM', label: '🌅 Morning', range: '09:00 - 12:00' },
                  { slot: '12:00 PM - 03:00 PM', label: '☀️ Afternoon', range: '12:00 - 15:00' },
                  { slot: '03:00 PM - 06:00 PM', label: '🌆 Evening', range: '15:00 - 18:00' },
                  { slot: '06:00 PM - 08:30 PM', label: '🌙 Night', range: '18:00 - 20:30' },
                ].map((s) => (
                  <button
                    key={s.slot}
                    onClick={() => setScheduleTimeSlot(s.slot)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      border: scheduleTimeSlot === s.slot ? '2px solid #16A34A' : '1px solid #E2E8F0',
                      backgroundColor: scheduleTimeSlot === s.slot ? '#F0FDF4' : '#F8FAFC',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 800, color: scheduleTimeSlot === s.slot ? '#166534' : '#0F172A' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      {s.range}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Issue Description & Details */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                4. Problem Description / Instructions
              </div>
              <textarea
                rows={3}
                placeholder="Describe your issue in detail (e.g., AC not cooling, strange vibration, water leaking from geyser pipe, please bring copper flare nut...)"
                value={scheduleDescription}
                onChange={(e) => setScheduleDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  fontFamily: 'inherit',
                  color: '#0F172A',
                  boxSizing: 'border-box',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {[
                  'Water leakage issue',
                  'Not turning on',
                  'Strange noise / vibration',
                  'Routine full servicing',
                  'Spare part replacement needed',
                ].map((chip) => (
                  <span
                    key={chip}
                    onClick={() => setScheduleDescription((prev) => (prev ? `${prev}, ${chip}` : chip))}
                    style={{
                      fontSize: '10px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#E2E8F0',
                      color: '#334155',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + {chip}
                  </span>
                ))}
              </div>
            </div>

            {/* 5. Doorstep Address & Zomato/Swiggy GPS Location */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📍</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>
                    Doorstep Address
                  </span>
                </div>
                {/* Zomato / Swiggy Style Current Location Button */}
                <button
                  onClick={handleDetectScheduleGps}
                  disabled={isDetectingScheduleGps}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #86EFAC',
                    borderRadius: '16px',
                    padding: '4px 10px',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#166534',
                    cursor: isDetectingScheduleGps ? 'wait' : 'pointer',
                  }}
                  title="Detect GPS location like Zomato/Swiggy"
                >
                  <span>{isDetectingScheduleGps ? '⏳' : '🎯'}</span>
                  <span>{isDetectingScheduleGps ? 'Locating...' : 'Use Current Location'}</span>
                </button>
              </div>

              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '8px', lineHeight: 1.3 }}>
                {scheduleFlatNumber ? `${scheduleFlatNumber}, ` : ''}{currentLocation?.fullAddress || _userAddress || 'Joynagar, Greater Kolkata, 700145'}
                {scheduleLandmark ? ` (Near: ${scheduleLandmark})` : ''}
              </div>

              {scheduleGpsSuccessMsg && (
                <div style={{ fontSize: '10px', color: '#15803D', fontWeight: 700, marginBottom: '6px' }}>
                  ✓ {scheduleGpsSuccessMsg}
                </div>
              )}

              {/* Flat & Landmark Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <input
                  type="text"
                  placeholder="Flat / Floor / House No."
                  value={scheduleFlatNumber}
                  onChange={(e) => setScheduleFlatNumber(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '11px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
                <input
                  type="text"
                  placeholder="Landmark (Optional)"
                  value={scheduleLandmark}
                  onChange={(e) => setScheduleLandmark(e.target.value)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '11px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>
            </div>

            {/* Confirm & Place Scheduled Order Button */}
            <button
              onClick={handleConfirmScheduleBooking}
              disabled={isSubmittingSchedule}
              style={{
                width: '100%',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '16px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: isSubmittingSchedule ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isSubmittingSchedule ? 0.8 : 1,
              }}
            >
              <span>{isSubmittingSchedule ? 'Scheduling Order...' : 'Confirm & Schedule Doorstep Service →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Scheduled Booking Confirmation Success Modal */}
      {showScheduleSuccessModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '360px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
                fontSize: '26px',
              }}
            >
              ✓
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              Service Scheduled!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Order <b>{confirmedScheduledOrder?.id || '#HSX829144'}</b> scheduled for <b>{confirmedScheduledOrder?.serviceName || 'Home Service'}</b>.
            </p>

            {/* Scheduled Details Card */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '12px',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: '11px', color: '#0E3E2F', fontWeight: 800, marginBottom: '4px' }}>
                ⏰ Arrival: {confirmedScheduledOrder?.scheduledSlotFormatted}
              </div>
              <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.3 }}>
                📍 <b>Doorstep:</b> {confirmedScheduledOrder?.address || 'Joynagar, Greater Kolkata, 700145'}
              </div>
              {confirmedScheduledOrder?.userNotes && (
                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                  📝 Note: "{confirmedScheduledOrder?.userNotes}"
                </div>
              )}
            </div>

            {/* Start OTP */}
            <div
              style={{
                backgroundColor: '#F0FDF4',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px',
                border: '1px dashed #86EFAC',
              }}
            >
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>START SERVICE OTP</div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803D', letterSpacing: '3px', marginTop: '2px' }}>
                {confirmedScheduledOrder?.otp || '—'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                Share with specialist when they arrive at your doorstep
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  const targetBookingId = confirmedScheduledOrder?.id || '#HSX829144';
                  setShowScheduleSuccessModal(false);
                  onNavigate('tracking', { bookingId: targetBookingId });
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
                }}
              >
                Track Scheduled Order &gt;
              </button>
              <button
                onClick={() => {
                  setShowScheduleSuccessModal(false);
                  onNavigate('bookings');
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#EAF4EF',
                  color: '#0E3E2F',
                  border: 'none',
                  borderRadius: '24px',
                  padding: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                View in Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
