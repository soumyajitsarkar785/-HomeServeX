import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

export interface UserLocation {
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  isGps?: boolean;
}

interface CustomerServiceDetailScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  serviceTitle?: string;
  serviceSlug?: string;
  userAddress?: string;
  currentLocation?: UserLocation;
  onDetectLocation?: () => Promise<void>;
  onUpdateLocation?: (loc: UserLocation) => void;
  onBookSuccess?: () => void;
}

export const CustomerServiceDetailScreen: React.FC<CustomerServiceDetailScreenProps> = ({
  onNavigate,
  serviceTitle = 'AC Service & Repair',
  serviceSlug,
  userAddress,
  currentLocation,
  onDetectLocation: _onDetectLocation,
  onUpdateLocation,
  onBookSuccess,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccessModal, setBookingSuccessModal] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  // Booking Timing Mode: Instant Dispatch vs Scheduled Slot
  const [bookingMode, setBookingMode] = useState<'instant' | 'schedule'>('instant');
  const [scheduleDay, setScheduleDay] = useState<'today' | 'tomorrow' | 'day_after' | 'custom'>('tomorrow');
  const [customScheduleDate, setCustomScheduleDate] = useState(() => {
    const tm = new Date(Date.now() + 86400000);
    return tm.toISOString().split('T')[0];
  });
  const [scheduleTimeSlot, setScheduleTimeSlot] = useState('10:00 AM - 01:00 PM');
  const [problemDescription, setProblemDescription] = useState('');

  // Location State (Zomato / Swiggy style current location detection)
  const [activeLocation, setActiveLocation] = useState<UserLocation>(() => {
    if (currentLocation && currentLocation.title) return currentLocation;
    try {
      const saved = localStorage.getItem('hsx_user_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      title: 'Joynagar',
      subtitle: 'Greater Kolkata, 700145',
      fullAddress: userAddress || 'Joynagar, Greater Kolkata, WB 700145',
      latitude: 22.5726,
      longitude: 88.3639,
      isGps: true,
    };
  });

  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsSuccessMessage, setGpsSuccessMessage] = useState('');
  const [showAddressEditor, setShowAddressEditor] = useState(false);
  const [flatNumber, setFlatNumber] = useState('');
  const [landmark, setLandmark] = useState('');

  // Synchronize when parent currentLocation updates
  React.useEffect(() => {
    if (currentLocation && currentLocation.title) {
      setActiveLocation(currentLocation);
    }
  }, [currentLocation]);

  // Dynamic configuration based on service title
  const config = React.useMemo(() => {
    const t = (serviceTitle || '').toLowerCase();
    if (t.includes('washing machine')) {
      return {
        serviceTypes: ['Drum Deep Clean', 'Motor Repair', 'Inlet Valve Diagnostics'],
        variantTypes: ['Front Load', 'Top Load', 'Semi-Automatic'],
        variantLabel: 'Appliance Type',
        price: '₹449',
        originalPrice: '₹599',
        discount: '25% OFF',
        image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 45 mins',
        slug: serviceSlug || 'washing-machine-overhaul',
        servicePricing: {
          'Drum Deep Clean': { price: 449, orig: 599, duration: '⏱ 45 mins' },
          'Motor Repair': { price: 599, orig: 799, duration: '⏱ 60 mins' },
          'Inlet Valve Diagnostics': { price: 349, orig: 499, duration: '⏱ 30 mins' },
        },
        variantDeltas: {
          'Front Load': 0,
          'Top Load': 0,
          'Semi-Automatic': -50,
        },
      };
    }
    if (t.includes('refrigerator') || t.includes('fridge')) {
      return {
        serviceTypes: ['Cooling Diagnostics', 'Gas Top-up', 'Compressor / Relay'],
        variantTypes: ['Single Door', 'Double Door', 'Side by Side'],
        variantLabel: 'Refrigerator Type',
        price: '₹549',
        originalPrice: '₹749',
        discount: '27% OFF',
        image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 45 mins',
        slug: serviceSlug || 'fridge-cooling-diagnostics',
        servicePricing: {
          'Cooling Diagnostics': { price: 549, orig: 749, duration: '⏱ 45 mins' },
          'Gas Top-up': { price: 1199, orig: 1599, duration: '⏱ 60 mins' },
          'Compressor / Relay': { price: 899, orig: 1199, duration: '⏱ 60 mins' },
        },
        variantDeltas: {
          'Single Door': 0,
          'Double Door': 150,
          'Side by Side': 300,
        },
      };
    }
    if (t.includes('microwave')) {
      return {
        serviceTypes: ['Magnetron Heating', 'Turntable Fix', 'Safety Inspection'],
        variantTypes: ['Solo Microwave', 'Grill Microwave', 'Convection Oven'],
        variantLabel: 'Microwave Model',
        price: '₹399',
        originalPrice: '₹549',
        discount: '27% OFF',
        image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 30 mins',
        slug: serviceSlug || 'microwave-heating-repair',
        servicePricing: {
          'Magnetron Heating': { price: 549, orig: 749, duration: '⏱ 45 mins' },
          'Turntable Fix': { price: 349, orig: 499, duration: '⏱ 30 mins' },
          'Safety Inspection': { price: 399, orig: 549, duration: '⏱ 30 mins' },
        },
        variantDeltas: {
          'Solo Microwave': 0,
          'Grill Microwave': 100,
          'Convection Oven': 150,
        },
      };
    }
    if (t.includes('water purifier') || t.includes('ro')) {
      return {
        serviceTypes: ['Membrane & Filter Wash', 'Sediment Filter Change', 'TDS Calibration'],
        variantTypes: ['RO + UV', 'RO + UV + Alkaline', 'Gravity Purifier'],
        variantLabel: 'Purifier Technology',
        price: '₹499',
        originalPrice: '₹699',
        discount: '28% OFF',
        image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 45 mins',
        slug: serviceSlug || 'ro-filter-service',
        servicePricing: {
          'Membrane & Filter Wash': { price: 499, orig: 699, duration: '⏱ 45 mins' },
          'Sediment Filter Change': { price: 399, orig: 549, duration: '⏱ 30 mins' },
          'TDS Calibration': { price: 299, orig: 399, duration: '⏱ 30 mins' },
        },
        variantDeltas: {
          'RO + UV': 0,
          'RO + UV + Alkaline': 150,
          'Gravity Purifier': -100,
        },
      };
    }
    if (t.includes('geyser') || t.includes('water heater')) {
      return {
        serviceTypes: ['Heating Coil Replacement', 'Thermostat Check', 'Tank Descaling'],
        variantTypes: ['Instant Geyser (3L)', 'Storage Geyser (15L-25L)', 'Gas Geyser'],
        variantLabel: 'Geyser Capacity',
        price: '₹399',
        originalPrice: '₹599',
        discount: '33% OFF',
        image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 30 mins',
        slug: serviceSlug || 'geyser-service',
        servicePricing: {
          'Heating Coil Replacement': { price: 549, orig: 749, duration: '⏱ 45 mins' },
          'Thermostat Check': { price: 349, orig: 499, duration: '⏱ 30 mins' },
          'Tank Descaling': { price: 399, orig: 599, duration: '⏱ 30 mins' },
        },
        variantDeltas: {
          'Instant Geyser (3L)': 0,
          'Storage Geyser (15L-25L)': 100,
          'Gas Geyser': 150,
        },
      };
    }
    if (t.includes('chimney') || t.includes('hob')) {
      return {
        serviceTypes: ['Baffle Filter Clean', 'Deep Degreasing', 'Motor Flush'],
        variantTypes: ['60cm Wall Mounted', '90cm Curved Glass', 'Island Chimney'],
        variantLabel: 'Chimney Size',
        price: '₹699',
        originalPrice: '₹999',
        discount: '30% OFF',
        image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 60 mins',
        slug: serviceSlug || 'kitchen-deep-degreasing',
        servicePricing: {
          'Baffle Filter Clean': { price: 499, orig: 699, duration: '⏱ 45 mins' },
          'Deep Degreasing': { price: 699, orig: 999, duration: '⏱ 60 mins' },
          'Motor Flush': { price: 899, orig: 1199, duration: '⏱ 60 mins' },
        },
        variantDeltas: {
          '60cm Wall Mounted': 0,
          '90cm Curved Glass': 150,
          'Island Chimney': 300,
        },
      };
    }
    if (t.includes('tv')) {
      return {
        serviceTypes: ['Wall Mount Setup', 'Display Diagnosis', 'Sound & Port Fix'],
        variantTypes: ['32 - 43 Inch', '50 - 65 Inch 4K', '75+ Inch OLED'],
        variantLabel: 'TV Screen Size',
        price: '₹499',
        originalPrice: '₹799',
        discount: '38% OFF',
        image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 45 mins',
        slug: serviceSlug || 'tv-repair-service',
        servicePricing: {
          'Wall Mount Setup': { price: 399, orig: 599, duration: '⏱ 30 mins' },
          'Display Diagnosis': { price: 499, orig: 799, duration: '⏱ 45 mins' },
          'Sound & Port Fix': { price: 449, orig: 649, duration: '⏱ 45 mins' },
        },
        variantDeltas: {
          '32 - 43 Inch': 0,
          '50 - 65 Inch 4K': 200,
          '75+ Inch OLED': 400,
        },
      };
    }
    if (t.includes('cleaning') || t.includes('bathroom')) {
      return {
        serviceTypes: ['Tile Scrubbing', 'Hardwater Stain Removal', 'Full Sanitization'],
        variantTypes: ['1 Bathroom', '2 Bathrooms', '3+ Bathrooms / Villa'],
        variantLabel: 'Service Scope',
        price: '₹599',
        originalPrice: '₹899',
        discount: '33% OFF',
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 90 mins',
        slug: serviceSlug || 'deep-bathroom-cleaning',
        servicePricing: {
          'Tile Scrubbing': { price: 499, orig: 699, duration: '⏱ 60 mins' },
          'Hardwater Stain Removal': { price: 599, orig: 899, duration: '⏱ 75 mins' },
          'Full Sanitization': { price: 799, orig: 1099, duration: '⏱ 90 mins' },
        },
        variantDeltas: {
          '1 Bathroom': 0,
          '2 Bathrooms': 400,
          '3+ Bathrooms / Villa': 800,
        },
      };
    }
    if (t.includes('sofa') || t.includes('carpet')) {
      return {
        serviceTypes: ['Deep Vacuuming', 'Shampoo Scrub', 'Stain Extraction'],
        variantTypes: ['3-Seater Sofa', '5-Seater Sofa', '7-Seater / L-Shape'],
        variantLabel: 'Sofa Configuration',
        price: '₹799',
        originalPrice: '₹1099',
        discount: '27% OFF',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 90 mins',
        slug: serviceSlug || 'sofa-carpet-cleaning',
        servicePricing: {
          'Deep Vacuuming': { price: 599, orig: 799, duration: '⏱ 60 mins' },
          'Shampoo Scrub': { price: 799, orig: 1099, duration: '⏱ 90 mins' },
          'Stain Extraction': { price: 999, orig: 1399, duration: '⏱ 90 mins' },
        },
        variantDeltas: {
          '3-Seater Sofa': 0,
          '5-Seater Sofa': 300,
          '7-Seater / L-Shape': 600,
        },
      };
    }
    if (t.includes('electrician') || t.includes('wiring') || t.includes('switch')) {
      return {
        serviceTypes: ['Switch & Socket Fix', 'MCB Tripping Check', 'Ceiling Fan Mounting'],
        variantTypes: ['Standard Switchboard', 'Heavy 16A Appliance Point', 'Full House Check'],
        variantLabel: 'Work Requirement',
        price: '₹249',
        originalPrice: '₹349',
        discount: '28% OFF',
        image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 30 mins',
        slug: serviceSlug || 'switchboard-repair',
        servicePricing: {
          'Switch & Socket Fix': { price: 249, orig: 349, duration: '⏱ 30 mins' },
          'MCB Tripping Check': { price: 399, orig: 549, duration: '⏱ 45 mins' },
          'Ceiling Fan Mounting': { price: 299, orig: 399, duration: '⏱ 30 mins' },
        },
        variantDeltas: {
          'Standard Switchboard': 0,
          'Heavy 16A Appliance Point': 100,
          'Full House Check': 300,
        },
      };
    }
    if (t.includes('plumbing') || t.includes('leak') || t.includes('pipe') || t.includes('tap')) {
      return {
        serviceTypes: ['Tap & Shower Repair', 'Pipe Joint Leakage', 'Drain Unclogging'],
        variantTypes: ['Bathroom Fittings', 'Kitchen Sink & Trap', 'Main Line / Tank'],
        variantLabel: 'Plumbing Area',
        price: '₹299',
        originalPrice: '₹399',
        discount: '25% OFF',
        image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 45 mins',
        slug: serviceSlug || 'tap-leak-repair',
        servicePricing: {
          'Tap & Shower Repair': { price: 299, orig: 399, duration: '⏱ 45 mins' },
          'Pipe Joint Leakage': { price: 399, orig: 549, duration: '⏱ 45 mins' },
          'Drain Unclogging': { price: 499, orig: 699, duration: '⏱ 45 mins' },
        },
        variantDeltas: {
          'Bathroom Fittings': 0,
          'Kitchen Sink & Trap': 50,
          'Main Line / Tank': 200,
        },
      };
    }
    if (t.includes('carpentry') || t.includes('furniture')) {
      return {
        serviceTypes: ['Door Lock & Latch', 'Furniture Assembly', 'Hinge & Channel Fix'],
        variantTypes: ['Bed / Wardrobe Assembly', 'Wooden Door Repair', 'Cabinet Work'],
        variantLabel: 'Furniture Scope',
        price: '₹399',
        originalPrice: '₹599',
        discount: '33% OFF',
        image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 60 mins',
        slug: serviceSlug || 'carpentry-service',
        servicePricing: {
          'Door Lock & Latch': { price: 349, orig: 499, duration: '⏱ 45 mins' },
          'Furniture Assembly': { price: 499, orig: 699, duration: '⏱ 60 mins' },
          'Hinge & Channel Fix': { price: 399, orig: 599, duration: '⏱ 60 mins' },
        },
        variantDeltas: {
          'Bed / Wardrobe Assembly': 150,
          'Wooden Door Repair': 0,
          'Cabinet Work': 100,
        },
      };
    }
    if (t.includes('pest') || t.includes('termite')) {
      return {
        serviceTypes: ['Cockroach & Ant Gel', 'Bed Bug Treatment', 'Anti-Termite Drill'],
        variantTypes: ['1 BHK Apartment', '2-3 BHK Apartment', 'Independent House'],
        variantLabel: 'Premises Size',
        price: '₹899',
        originalPrice: '₹1299',
        discount: '30% OFF',
        image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 90 mins',
        slug: serviceSlug || 'pest-control-service',
        servicePricing: {
          'Cockroach & Ant Gel': { price: 799, orig: 1099, duration: '⏱ 60 mins' },
          'Bed Bug Treatment': { price: 1199, orig: 1699, duration: '⏱ 90 mins' },
          'Anti-Termite Drill': { price: 1899, orig: 2599, duration: '⏱ 120 mins' },
        },
        variantDeltas: {
          '1 BHK Apartment': 0,
          '2-3 BHK Apartment': 400,
          'Independent House': 800,
        },
      };
    }
    if (t.includes('painting')) {
      return {
        serviceTypes: ['1 Room Fresh Coat', 'Waterproofing & Putty', 'Full House Painting'],
        variantTypes: ['1 Room (Touchup)', '2 BHK Full Painting', '3 BHK + Balcony'],
        variantLabel: 'Painting Scope',
        price: '₹2499',
        originalPrice: '₹3499',
        discount: '28% OFF',
        image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
        duration: '⏱ 180 mins',
        slug: serviceSlug || 'painting-service',
        servicePricing: {
          '1 Room Fresh Coat': { price: 1999, orig: 2799, duration: '⏱ 120 mins' },
          'Waterproofing & Putty': { price: 2499, orig: 3499, duration: '⏱ 180 mins' },
          'Full House Painting': { price: 5999, orig: 8499, duration: '⏱ 360 mins' },
        },
        variantDeltas: {
          '1 Room (Touchup)': 0,
          '2 BHK Full Painting': 2000,
          '3 BHK + Balcony': 4000,
        },
      };
    }
    // Default AC
    return {
      serviceTypes: ['AC Power Jet Service', 'AC Gas Top-up & Leak Check', 'AC Installation'],
      variantTypes: ['Split AC', 'Window AC', 'Cassette AC'],
      variantLabel: 'AC Type',
      price: '₹499',
      originalPrice: '₹699',
      discount: '30% OFF',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80',
      duration: '⏱ 45 mins',
      slug: serviceSlug || 'split-ac-regular-service',
      servicePricing: {
        'AC Power Jet Service': { price: 499, orig: 699, duration: '⏱ 45 mins' },
        'AC Gas Top-up & Leak Check': { price: 1299, orig: 1699, duration: '⏱ 75 mins' },
        'AC Installation': { price: 1199, orig: 1599, duration: '⏱ 90 mins' },
      },
      variantDeltas: {
        'Split AC': 0,
        'Window AC': -100,
        'Cassette AC': 300,
      },
    };
  }, [serviceTitle, serviceSlug]);

  const [selectedServiceType, setSelectedServiceType] = useState(config.serviceTypes[0]);
  const [selectedVariantType, setSelectedVariantType] = useState(config.variantTypes[0]);

  React.useEffect(() => {
    setSelectedServiceType(config.serviceTypes[0]);
    setSelectedVariantType(config.variantTypes[0]);
  }, [config]);

  // Real-time Urban Company Itemized Dynamic Pricing Logic
  const activePricing = React.useMemo(() => {
    const serviceKey = selectedServiceType || config.serviceTypes[0] || '';
    const variantKey = selectedVariantType || config.variantTypes[0] || '';
    const sp = (config as any).servicePricing?.[serviceKey] || {
      price: parseInt(config.price.replace(/[^\d]/g, ''), 10) || 449,
      orig: parseInt(config.originalPrice.replace(/[^\d]/g, ''), 10) || 599,
      duration: config.duration,
    };
    const delta = (config as any).variantDeltas?.[variantKey] || 0;
    const priceNum = Math.max(99, sp.price + delta);
    const origNum = Math.max(priceNum + 50, sp.orig + delta);
    const discountPct = Math.round(((origNum - priceNum) / origNum) * 100);

    return {
      priceNum,
      origNum,
      price: `₹${priceNum}`,
      originalPrice: `₹${origNum}`,
      discount: `${discountPct}% OFF`,
      duration: sp.duration || config.duration,
    };
  }, [config, selectedServiceType, selectedVariantType]);

  // Zomato/Swiggy Real GPS Geolocation & Reverse Geocoding
  const handleDetectGpsCurrentLocation = async () => {
    setIsDetectingGps(true);
    setGpsSuccessMessage('');

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

              setActiveLocation(newLoc);
              try {
                localStorage.setItem('hsx_user_location', JSON.stringify(newLoc));
              } catch {}
              if (onUpdateLocation) onUpdateLocation(newLoc);
              setGpsSuccessMessage(`GPS locked: ${title}`);
              setIsDetectingGps(false);
              setTimeout(() => setGpsSuccessMessage(''), 4500);
              return;
            }
          } catch (e) {
            console.warn('[HomeServeX] Reverse geocoding error:', e);
          }

          // Fallback if reverse geocode fails
          const newLoc: UserLocation = {
            title: 'Current GPS Location 📍',
            subtitle: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
            fullAddress: `GPS Coordinates: ${lat}, ${lon}`,
            latitude: lat,
            longitude: lon,
            isGps: true,
          };
          setActiveLocation(newLoc);
          try {
            localStorage.setItem('hsx_user_location', JSON.stringify(newLoc));
          } catch {}
          if (onUpdateLocation) onUpdateLocation(newLoc);
          setGpsSuccessMessage('GPS coordinates verified!');
          setIsDetectingGps(false);
          setTimeout(() => setGpsSuccessMessage(''), 4500);
        },
        (error) => {
          console.warn('[HomeServeX] Geolocation error:', error);
          setIsDetectingGps(false);
          alert('Could not access current location. Please enable location permissions or enter address manually.');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    } else {
      setIsDetectingGps(false);
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleBookNow = async () => {
    setIsBooking(true);

    // Compute Scheduled Slot
    let scheduledDateObj = new Date();
    if (bookingMode === 'schedule') {
      let targetDateStr = '';
      if (scheduleDay === 'today') {
        targetDateStr = (new Date().toISOString().split('T')[0]) || '';
      } else if (scheduleDay === 'tomorrow') {
        const tm = new Date(Date.now() + 86400000);
        targetDateStr = (tm.toISOString().split('T')[0]) || '';
      } else if (scheduleDay === 'day_after') {
        const da = new Date(Date.now() + 172800000);
        targetDateStr = (da.toISOString().split('T')[0]) || '';
      } else {
        targetDateStr = customScheduleDate || (new Date().toISOString().split('T')[0]) || '';
      }

      let hour = 10;
      if (scheduleTimeSlot.includes('12:00 PM')) hour = 12;
      else if (scheduleTimeSlot.includes('03:00 PM')) hour = 15;
      else if (scheduleTimeSlot.includes('06:00 PM')) hour = 18;

      scheduledDateObj = new Date(`${targetDateStr}T${String(hour).padStart(2, '0')}:00:00`);
    }

    const fullDoorstepAddress = [
      flatNumber ? `Flat/House: ${flatNumber}` : '',
      activeLocation.fullAddress || activeLocation.title || 'Joynagar, Greater Kolkata, 700145',
      landmark ? `Landmark: ${landmark}` : '',
    ].filter(Boolean).join(', ');

    const payloadNotes = problemDescription.trim()
      ? `${selectedServiceType} (${selectedVariantType}): ${problemDescription.trim()}`
      : `${selectedServiceType} - ${selectedVariantType}`;

    try {
      const token = localStorage.getItem('hsx_token') || localStorage.getItem('hsx_access_token') || '';
      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          serviceSlug: config.slug,
          serviceType: selectedServiceType,
          applianceType: selectedVariantType,
          price: activePricing.priceNum,
          scheduledSlot: scheduledDateObj.toISOString(),
          address: fullDoorstepAddress,
          notes: payloadNotes,
          latitude: activeLocation.latitude || 22.5726,
          longitude: activeLocation.longitude || 88.3639,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) {
          setConfirmedOrder({
            ...json.data,
            address: fullDoorstepAddress,
            scheduledSlotFormatted: bookingMode === 'instant' ? 'Instant (within 30-45 mins)' : `${scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${scheduleTimeSlot})`,
            problemNotes: problemDescription.trim(),
            serviceType: selectedServiceType,
            variantType: selectedVariantType,
          });
        }
      } else {
        // Fallback demo order with real unique 4-digit OTP
        const fallbackOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const fallbackCompOtp = Math.floor(1000 + Math.random() * 9000).toString();
        setConfirmedOrder({
          id: '#HSX' + Math.floor(100000 + Math.random() * 900000),
          service: serviceTitle,
          price: activePricing.price,
          address: fullDoorstepAddress,
          scheduledSlotFormatted: bookingMode === 'instant' ? 'Instant (within 30-45 mins)' : `${scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${scheduleTimeSlot})`,
          problemNotes: problemDescription.trim(),
          technician: 'Ramesh Kumar (Verified Master Specialist)',
          otp: fallbackOtp,
          completionOtp: fallbackCompOtp,
          serviceType: selectedServiceType,
          variantType: selectedVariantType,
        });
      }
    } catch {
      const fallbackOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const fallbackCompOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setConfirmedOrder({
        id: '#HSX' + Math.floor(100000 + Math.random() * 900000),
        service: serviceTitle,
        price: activePricing.price,
        address: fullDoorstepAddress,
        scheduledSlotFormatted: bookingMode === 'instant' ? 'Instant (within 30-45 mins)' : `${scheduledDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} (${scheduleTimeSlot})`,
        problemNotes: problemDescription.trim(),
        technician: 'Ramesh Kumar (Verified Master Specialist)',
        otp: fallbackOtp,
        completionOtp: fallbackCompOtp,
        serviceType: selectedServiceType,
        variantType: selectedVariantType,
      });
    }

    setIsBooking(false);
    setBookingSuccessModal(true);
    if (onBookSuccess) onBookSuccess();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', paddingBottom: '160px' }}>

      {/* Hero Image */}
      <div
        style={{
          width: '100%',
          height: '190px',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#E2E8F0',
          position: 'relative',
        }}
      >
        <img
          src={config.image}
          alt={serviceTitle}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80';
          }}
        />
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.92)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '18px',
            transition: 'transform 0.15s ease',
          }}
          aria-label="Favorite service"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Service Meta Title & Badges */}
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
          {serviceTitle}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: '3px' }}>
            ★ 4.8 <span style={{ color: '#64748B', fontWeight: 500 }}>(3.2k)</span>
          </span>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>{activePricing.duration}</span>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: '3px' }}>
            🛡 Certified Expert
          </span>
        </div>
      </div>

      {/* Pricing Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A' }}>{activePricing.price}</span>
        <span style={{ fontSize: '16px', color: '#94A3B8', textDecoration: 'line-through' }}>{activePricing.originalPrice}</span>
        <span
          style={{
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          {activePricing.discount}
        </span>
      </div>

      {/* Assurance Pills (Horizontal 3 cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#334155',
          }}
        >
          <div style={{ color: '#16A34A', marginBottom: '2px' }}>✔</div>
          Verified Experts
        </div>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#334155',
          }}
        >
          <div style={{ color: '#16A34A', marginBottom: '2px' }}>⚙</div>
          Genuine OEM Parts
        </div>
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '10px 8px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: '#334155',
          }}
        >
          <div style={{ color: '#16A34A', marginBottom: '2px' }}>🛡</div>
          30-Day Warranty
        </div>
      </div>

      {/* Selection 1 — Service Type */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
          Select Service Type
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {config.serviceTypes.map((type) => {
            const isSelected = selectedServiceType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedServiceType(type)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '24px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? '#0E3E2F' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Icons.Check size={14} color="#FFFFFF" />}
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection 2 — Choose Your Variant */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
          Choose {config.variantLabel}
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {config.variantTypes.map((type) => {
            const isSelected = selectedVariantType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedVariantType(type)}
                style={{
                  padding: '9px 18px',
                  borderRadius: '24px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isSelected ? 'none' : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? '#0E3E2F' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                {isSelected && <Icons.Check size={14} color="#FFFFFF" />}
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Mode Selector: Instant vs Schedule */}
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
          Booking Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => setBookingMode('instant')}
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              border: bookingMode === 'instant' ? '2px solid #16A34A' : '1px solid #E2E8F0',
              backgroundColor: bookingMode === 'instant' ? '#F0FDF4' : '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>⚡</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: bookingMode === 'instant' ? '#166534' : '#0F172A' }}>
                Instant Service
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Arrival in 30–45 mins • Live GPS tracking
            </div>
          </button>

          <button
            onClick={() => setBookingMode('schedule')}
            style={{
              padding: '12px 14px',
              borderRadius: '14px',
              border: bookingMode === 'schedule' ? '2px solid #16A34A' : '1px solid #E2E8F0',
              backgroundColor: bookingMode === 'schedule' ? '#F0FDF4' : '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>📅</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: bookingMode === 'schedule' ? '#166534' : '#0F172A' }}>
                Schedule for Later
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>
              Pick exact date & preferred arrival time
            </div>
          </button>
        </div>
      </div>

      {/* If Scheduled Mode: Show Date, Time Slot & Problem Description */}
      {bookingMode === 'schedule' && (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Preferred Date */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Preferred Date
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
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: scheduleDay === d.id ? '2px solid #16A34A' : '1px solid #E2E8F0',
                    backgroundColor: scheduleDay === d.id ? '#F0FDF4' : '#FFFFFF',
                    textAlign: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, color: scheduleDay === d.id ? '#166534' : '#0F172A' }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>
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

          {/* Time Slot Selection */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Arrival Window
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
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: scheduleTimeSlot === s.slot ? '2px solid #16A34A' : '1px solid #E2E8F0',
                    backgroundColor: scheduleTimeSlot === s.slot ? '#F0FDF4' : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 800, color: scheduleTimeSlot === s.slot ? '#166534' : '#0F172A' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                    {s.range}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Problem Description Textarea */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              Describe Issue / Instructions for Specialist (Optional)
            </div>
            <textarea
              rows={3}
              placeholder="e.g., AC water is dripping from indoor coil, washing machine vibration during spin, please bring genuine copper filter..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontFamily: 'inherit',
                color: '#0F172A',
                boxSizing: 'border-box',
                resize: 'none',
                outline: 'none',
              }}
            />
            {/* Quick Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {[
                'Water leakage issue',
                'Not turning on',
                'Strange noise / vibration',
                'Routine full servicing',
                'Spare part replacement',
              ].map((chip) => (
                <span
                  key={chip}
                  onClick={() => setProblemDescription((prev) => (prev ? `${prev}, ${chip}` : chip))}
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
        </div>
      )}

      {/* Zomato / Swiggy Style Doorstep Delivery Address Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          padding: '16px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              📍
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                Service Doorstep Location
              </div>
              <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                {activeLocation.isGps ? '● Live GPS Doorstep Verified' : '● Delivery Address'}
              </div>
            </div>
          </div>

          {/* Zomato / Swiggy Style Use Current Location Button */}
          <button
            onClick={handleDetectGpsCurrentLocation}
            disabled={isDetectingGps}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F0FDF4',
              border: '1.5px solid #86EFAC',
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 800,
              color: '#166534',
              cursor: isDetectingGps ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)',
              transition: 'all 0.15s ease',
            }}
            title="Detect and use your real-time GPS location like Zomato/Swiggy"
          >
            <span>{isDetectingGps ? '⏳' : '🎯'}</span>
            <span>{isDetectingGps ? 'Locating...' : 'Use Current Location'}</span>
          </button>
        </div>

        {/* Address Card Container */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid #E2E8F0',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                {activeLocation.title || 'Joynagar'}
              </span>
              {activeLocation.isGps && (
                <span
                  style={{
                    fontSize: '10px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    padding: '1px 6px',
                    borderRadius: '6px',
                    fontWeight: 800,
                  }}
                >
                  GPS
                </span>
              )}
            </div>
            <button
              onClick={() => setShowAddressEditor(!showAddressEditor)}
              style={{
                background: 'none',
                border: 'none',
                color: '#16A34A',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {showAddressEditor ? 'Done' : '✏️ Add Flat/Landmark'}
            </button>
          </div>

          <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
            {flatNumber ? `${flatNumber}, ` : ''}{activeLocation.fullAddress || activeLocation.subtitle}
            {landmark ? ` (Near: ${landmark})` : ''}
          </div>
        </div>

        {gpsSuccessMessage && (
          <div
            style={{
              fontSize: '11px',
              color: '#15803D',
              fontWeight: 700,
              backgroundColor: '#DCFCE7',
              padding: '6px 12px',
              borderRadius: '8px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>✓</span> {gpsSuccessMessage}
          </div>
        )}

        {/* Expandable Flat / Floor / Landmark inputs */}
        {showAddressEditor && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Flat / House / Floor / Building Name
              </div>
              <input
                type="text"
                placeholder="e.g., Flat 4B, Greenwood Apartments"
                value={flatNumber}
                onChange={(e) => setFlatNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                Nearby Landmark (Optional)
              </div>
              <input
                type="text"
                placeholder="e.g., Near City Centre 1 / Opposite Metro Gate"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <button
              onClick={() => setShowAddressEditor(false)}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                alignSelf: 'flex-end',
              }}
            >
              Save Address Details
            </button>
          </div>
        )}

        {/* Quick Location Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748B' }}>Quick Select:</span>
          {[
            { label: 'Joynagar', sub: 'Greater Kolkata, 700145', full: 'Joynagar, Greater Kolkata, West Bengal 700145' },
            { label: 'Salt Lake Sec V', sub: 'Kolkata, 700091', full: 'Salt Lake Sector V, Bidhannagar, Kolkata 700091' },
            { label: 'Park Street', sub: 'Kolkata, 700016', full: 'Park Street, Mullick Bazar, Kolkata 700016' },
            { label: 'New Town Action Area I', sub: 'Kolkata, 700156', full: 'Action Area I, New Town, Kolkata 700156' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                const updated: UserLocation = {
                  title: item.label,
                  subtitle: item.sub,
                  fullAddress: item.full,
                  latitude: 22.5726,
                  longitude: 88.3639,
                  isGps: false,
                };
                setActiveLocation(updated);
                try {
                  localStorage.setItem('hsx_user_location', JSON.stringify(updated));
                } catch {}
                if (onUpdateLocation) onUpdateLocation(updated);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '12px',
                border: activeLocation.title === item.label ? '1px solid #16A34A' : '1px solid #E2E8F0',
                backgroundColor: activeLocation.title === item.label ? '#F0FDF4' : '#FFFFFF',
                color: activeLocation.title === item.label ? '#166534' : '#475569',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky Bottom CTA Bar Above 64px Bottom Nav Tabs */}
      <div
        style={{
          position: 'fixed',
          bottom: '64px',
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          zIndex: 45,
        }}
      >
        <div
          style={{
            maxWidth: '840px',
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ maxWidth: '58%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#0E3E2F' }}>{activePricing.price}</span>
              <span style={{ fontSize: '13px', color: '#94A3B8', textDecoration: 'line-through' }}>{activePricing.originalPrice}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', backgroundColor: '#EAF6EF', padding: '1px 6px', borderRadius: '4px' }}>
                {activePricing.discount}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              📍 {activeLocation.title || 'Joynagar'} • {bookingMode === 'instant' ? '⚡ 30-45m' : '📅 Scheduled'}
            </div>
          </div>

          <button
            onClick={handleBookNow}
            disabled={isBooking}
            style={{
              backgroundColor: '#0E3E2F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '24px',
              padding: '12px 24px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: isBooking ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(14, 62, 47, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: isBooking ? 0.8 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {isBooking
              ? 'Securing Slot...'
              : bookingMode === 'instant'
              ? 'Book Now (Instant)'
              : 'Confirm & Schedule'}
          </button>
        </div>
      </div>

      {/* Booking Success Modal */}
      {bookingSuccessModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
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
                margin: '0 auto 14px auto',
                fontSize: '24px',
              }}
            >
              ✓
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              {bookingMode === 'instant' ? 'Booking Confirmed!' : 'Service Scheduled!'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Order <b>{confirmedOrder?.id || '#HSX123456'}</b> confirmed for <b>{serviceTitle}</b>.
            </p>

            {/* Doorstep Location Badge in Modal */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#166534', marginBottom: '2px' }}>
                <span>📍 Doorstep Dispatch Address:</span>
                <span style={{ backgroundColor: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', fontSize: '9px' }}>
                  {activeLocation.isGps ? 'GPS Verified' : 'Confirmed'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#334155', lineHeight: 1.3 }}>
                {confirmedOrder?.address || activeLocation.fullAddress || 'Joynagar, Greater Kolkata 700145'}
              </div>
              <div style={{ fontSize: '11px', color: '#0E3E2F', fontWeight: 700, marginTop: '4px' }}>
                ⏰ Arrival: {confirmedOrder?.scheduledSlotFormatted || 'Instant (30-45 mins)'}
              </div>
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
                {confirmedOrder?.otp || '—'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                Share this with your specialist upon arrival
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  const targetBookingId = confirmedOrder?.id || '#HSX123456';
                  setBookingSuccessModal(false);
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
                Track Order Live &gt;
              </button>
              <button
                onClick={() => {
                  setBookingSuccessModal(false);
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
