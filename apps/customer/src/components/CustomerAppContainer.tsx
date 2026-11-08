import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';
import { CustomerHomeScreen } from '../pages/CustomerHomeScreen.js';
import { CustomerServicesListScreen } from '../pages/CustomerServicesListScreen.js';
import { CustomerServiceDetailScreen } from '../pages/CustomerServiceDetailScreen.js';
import { CustomerTrackingScreen } from '../pages/CustomerTrackingScreen.js';
import { CustomerOrdersScreen } from '../pages/CustomerOrdersScreen.js';
import { CustomerOffersScreen } from '../pages/CustomerOffersScreen.js';
import { CustomerAccountScreen } from '../pages/CustomerAccountScreen.js';

export type CustomerScreenKey =
  | 'home'
  | 'services'
  | 'service-detail'
  | 'tracking'
  | 'bookings'
  | 'orders'
  | 'offers'
  | 'account';

export interface UserLocation {
  title: string;
  subtitle: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  isGps?: boolean;
}

interface CustomerAppContainerProps {
  initialScreen?: CustomerScreenKey;
}

export const CustomerAppContainer: React.FC<CustomerAppContainerProps> = ({
  initialScreen = 'home',
}) => {
  const [currentScreen, setCurrentScreen] = useState<CustomerScreenKey>(initialScreen);
  const [screenParams, setScreenParams] = useState<any>({});
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Automatic Real GPS Location & Delivery Address State
  const [currentLocation, setCurrentLocation] = useState<UserLocation>(() => {
    try {
      const saved = localStorage.getItem('hsx_user_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      title: 'Detecting Location...',
      subtitle: 'Locating your GPS doorstep...',
      fullAddress: 'Detecting current location...',
      latitude: 22.5726,
      longitude: 88.3639,
      isGps: false,
    };
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [showCustomAddressInput, setShowCustomAddressInput] = useState(false);
  const [customAddressText, setCustomAddressText] = useState('');

  // Automatic real GPS detection with OpenStreetMap reverse geocoding
  const detectUserLocation = React.useCallback(async () => {
    setIsDetectingLocation(true);

    const applyLocation = (loc: UserLocation) => {
      setCurrentLocation(loc);
      try {
        localStorage.setItem('hsx_user_location', JSON.stringify(loc));
      } catch {}
      setIsDetectingLocation(false);
    };

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
                'Current Location';
              const city = addr.city || addr.town || addr.municipality || addr.county || addr.state || '';
              const postcode = addr.postcode || '';
              const subtitle = [city, postcode].filter(Boolean).join(', ') || 'Your Exact Doorstep';
              const fullAddress = data.display_name || `${title}, ${subtitle}`;

              applyLocation({
                title,
                subtitle,
                fullAddress,
                latitude: lat,
                longitude: lon,
                isGps: true,
              });
              return;
            }
          } catch (e) {
            console.warn('[HomeServeX] Reverse geocoding fallback:', e);
          }

          // Fallback if reverse geocode fails but GPS coordinates obtained
          applyLocation({
            title: 'Current GPS Location 📍',
            subtitle: `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`,
            fullAddress: `GPS Coordinates: ${lat}, ${lon}`,
            latitude: lat,
            longitude: lon,
            isGps: true,
          });
        },
        async (error) => {
          console.warn('[HomeServeX] Geolocation permission or timeout:', error.message);
          // IP Geolocation fallback
          try {
            const ipRes = await fetch('https://ipapi.co/json/');
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData?.city) {
                applyLocation({
                  title: ipData.city,
                  subtitle: `${ipData.region || ipData.country_name}, ${ipData.postal || ''}`.trim(),
                  fullAddress: `${ipData.city}, ${ipData.region}, ${ipData.country_name} ${ipData.postal || ''}`,
                  latitude: ipData.latitude || 22.5726,
                  longitude: ipData.longitude || 88.3639,
                  isGps: false,
                });
                return;
              }
            }
          } catch {}

          // Default fallback
          applyLocation({
            title: 'Salt Lake Sector V',
            subtitle: 'Kolkata, WB 700091',
            fullAddress: 'Salt Lake Sector V, Bidhannagar, Kolkata, West Bengal 700091',
            latitude: 22.5804,
            longitude: 88.4378,
            isGps: false,
          });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    } else {
      setIsDetectingLocation(false);
    }
  }, []);

  React.useEffect(() => {
    // Automatically trigger GPS location detection on load
    detectUserLocation();
  }, [detectUserLocation]);

  const savedLocationsList: UserLocation[] = [
    {
      title: 'Salt Lake Sector V',
      subtitle: 'Kolkata, WB 700091',
      fullAddress: 'Salt Lake Sector V, Bidhannagar, Kolkata, West Bengal 700091',
      latitude: 22.5804,
      longitude: 88.4378,
    },
    {
      title: 'Park Street',
      subtitle: 'Kolkata, WB 700016',
      fullAddress: 'Park Street, Mullick Bazar, Kolkata, West Bengal 700016',
      latitude: 22.5516,
      longitude: 88.3524,
    },
    {
      title: 'New Town Action Area I',
      subtitle: 'Kolkata, WB 700156',
      fullAddress: 'Action Area I, New Town, Kolkata, West Bengal 700156',
      latitude: 22.5898,
      longitude: 88.4687,
    },
    {
      title: 'Powai, Hiranandani',
      subtitle: 'Mumbai, MH 400076',
      fullAddress: 'Flat 402, Lotus Tower, Central Ave, Hiranandani Gardens, Powai, Mumbai 400076',
      latitude: 19.1176,
      longitude: 72.9060,
    },
  ];

  const filteredSavedLocations = savedLocationsList.filter(
    (l) =>
      l.title.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
      l.subtitle.toLowerCase().includes(locationSearchQuery.toLowerCase()) ||
      l.fullAddress.toLowerCase().includes(locationSearchQuery.toLowerCase())
  );

  React.useEffect(() => {
    const loadNotifications = () => {
      fetch('/api/v1/customers/notifications')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data && Array.isArray(data.data)) {
            setNotifications(data.data);
            setUnreadCount(data.unreadCount ?? data.data.filter((n: any) => !n.read).length);
          }
        })
        .catch(() => {});
    };
    loadNotifications();
    const timer = setInterval(loadNotifications, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleNotificationClick = (notif: any) => {
    fetch(`/api/v1/customers/notifications/${notif.id}/read`, { method: 'PATCH' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setShowNotificationsModal(false);

    if (notif.actionScreen) {
      handleNavigate(notif.actionScreen, notif.actionParams);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    fetch('/api/v1/customers/notifications/read-all', { method: 'POST' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNavigate = (screen: string, params?: any) => {
    setCurrentScreen(screen as CustomerScreenKey);
    if (params) setScreenParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 5-Tab Mapping for bottom bar
  const activeTab: 'home' | 'bookings' | 'offers' | 'account' =
    currentScreen === 'home' || currentScreen === 'services' || currentScreen === 'service-detail'
      ? 'home'
      : currentScreen === 'bookings' || currentScreen === 'tracking'
      ? 'bookings'
      : currentScreen === 'offers'
      ? 'offers'
      : 'account';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Single Authoritative Top Header (Pixel-perfect matching uploaded screenshots) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '840px',
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {currentScreen === 'home' ? (
            /* Home Screen Header: Location Pin + Address + Subtitle + Live Support + Notification Bell */
            <>
              <div
                onClick={() => setShowLocationModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  maxWidth: '60%',
                }}
                title="Click to detect or change delivery location"
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    backgroundColor: isDetectingLocation ? '#DCFCE7' : '#EAF6EF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#16A34A',
                    flexShrink: 0,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <Icons.MapPin size={20} color="#16A34A" />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.3px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {currentLocation.title}
                    </span>
                    <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 800, flexShrink: 0 }}>∨</span>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: isDetectingLocation ? '#16A34A' : '#64748B',
                      fontWeight: isDetectingLocation ? 700 : 500,
                      marginTop: '1px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isDetectingLocation ? '📍 Detecting GPS...' : currentLocation.subtitle}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  onClick={() => setShowNotificationsModal(true)}
                  style={{
                    position: 'relative',
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                  title="View Notifications & Updates"
                >
                  <Icons.Bell size={18} color="#16A34A" />
                  {unreadCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Sub-Screen Header: Back button + Authoritative Screen Title + Context Action */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => {
                    if (currentScreen === 'service-detail') handleNavigate('home');
                    else if (currentScreen === 'tracking') handleNavigate('bookings');
                    else if (currentScreen === 'orders') handleNavigate('account');
                    else if (currentScreen === 'bookings') handleNavigate('home');
                    else handleNavigate('home');
                  }}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#0F172A',
                    transition: 'all 0.15s ease',
                  }}
                  title="Back"
                >
                  <Icons.ArrowLeft size={18} color="#0F172A" />
                </button>
                <div>
                  <h1 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {currentScreen === 'bookings' && 'Active Bookings'}
                    {currentScreen === 'orders' && 'My Orders'}
                    {currentScreen === 'offers' && 'Special Offers'}
                    {currentScreen === 'account' && 'My Account'}
                    {currentScreen === 'services' && 'All Services'}
                    {currentScreen === 'service-detail' && (screenParams.title || 'AC Service & Repair')}
                    {currentScreen === 'tracking' && `Track Order ${screenParams.bookingId || '#HSX123456'}`}
                  </h1>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentScreen === 'bookings' && (
                  <div
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    ● Live Ongoing
                  </div>
                )}
                {currentScreen === 'orders' && (
                  <div
                    style={{
                      backgroundColor: '#EAF4EF',
                      color: '#16A34A',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    Order History
                  </div>
                )}
                {currentScreen === 'tracking' && (
                  <div
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    ● Live Tracking
                  </div>
                )}
                {currentScreen === 'offers' && (
                  <div
                    style={{
                      backgroundColor: '#EAF4EF',
                      color: '#16A34A',
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    Active Coupons
                  </div>
                )}
                {currentScreen === 'account' && (
                  <button
                    onClick={() => handleNavigate('home')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#16A34A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content Area (Full-width clean company style matching Image 1) */}
      <main
        style={{
          flex: 1,
          maxWidth: '840px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
          paddingBottom: '100px',
        }}
      >
        {currentScreen === 'home' && (
          <CustomerHomeScreen
            onNavigate={handleNavigate}
            userAddress={currentLocation.fullAddress}
            currentLocation={currentLocation}
            onDetectLocation={detectUserLocation}
            onUpdateLocation={(loc: UserLocation) => {
              setCurrentLocation(loc);
              try {
                localStorage.setItem('hsx_user_location', JSON.stringify(loc));
              } catch {}
            }}
          />
        )}
        {currentScreen === 'services' && (
          <CustomerServicesListScreen
            onNavigate={handleNavigate}
            initialCategory={screenParams.category}
            initialSearch={screenParams.search}
          />
        )}
        {currentScreen === 'service-detail' && (
          <CustomerServiceDetailScreen
            onNavigate={handleNavigate}
            serviceTitle={screenParams.title || 'AC Service & Repair'}
            serviceSlug={screenParams.slug}
            userAddress={currentLocation.fullAddress}
            currentLocation={currentLocation}
            onDetectLocation={detectUserLocation}
            onUpdateLocation={(loc: UserLocation) => {
              setCurrentLocation(loc);
              try {
                localStorage.setItem('hsx_user_location', JSON.stringify(loc));
              } catch {}
            }}
          />
        )}
        {currentScreen === 'tracking' && (
          <CustomerTrackingScreen
            onNavigate={handleNavigate}
            bookingId={screenParams.bookingId || '#HSX123456'}
          />
        )}
        {currentScreen === 'bookings' && (
          <CustomerOrdersScreen onNavigate={handleNavigate} mode="activeOnly" />
        )}
        {currentScreen === 'orders' && (
          <CustomerOrdersScreen onNavigate={handleNavigate} mode="fullHistory" />
        )}
        {currentScreen === 'offers' && <CustomerOffersScreen onNavigate={handleNavigate} />}
        {currentScreen === 'account' && <CustomerAccountScreen onNavigate={handleNavigate} />}
      </main>

      {/* Authoritative 5-Tab Bottom Navigation Bar matching Image 1 */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '840px',
            margin: '0 auto',
            height: '64px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 12px',
          }}
        >
          {/* Tab 1: Home */}
          <button
            onClick={() => handleNavigate('home')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'home' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
            }}
          >
            <Icons.Home size={20} color={activeTab === 'home' ? '#0E3E2F' : '#94A3B8'} />
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'home' ? 800 : 500 }}>
              Home
            </span>
          </button>

          {/* Tab 2: Bookings */}
          <button
            onClick={() => handleNavigate('bookings')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'bookings' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
            }}
          >
            <Icons.Calendar size={20} color={activeTab === 'bookings' ? '#0E3E2F' : '#94A3B8'} />
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'bookings' ? 800 : 500 }}>
              Bookings
            </span>
          </button>

          {/* Center Floating Quick Book Button with Lightning Bolt (⚡) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <button
              onClick={() => setShowQuickBookModal(true)}
              title="Instant Doorstep Booking"
              style={{
                position: 'absolute',
                top: '-24px',
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: '3px solid #FFFFFF',
                boxShadow: '0 6px 16px rgba(22, 163, 74, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              <Icons.Zap size={24} color="#FFFFFF" />
            </button>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#16A34A', marginTop: '30px' }}>
              Book Now
            </span>
          </div>

          {/* Tab 3: Offers */}
          <button
            onClick={() => handleNavigate('offers')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'offers' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
            }}
          >
            <Icons.Tag size={20} color={activeTab === 'offers' ? '#0E3E2F' : '#94A3B8'} />
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'offers' ? 800 : 500 }}>
              Offers
            </span>
          </button>

          {/* Tab 4: Account */}
          <button
            onClick={() => handleNavigate('account')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'account' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
            }}
          >
            <Icons.User size={20} color={activeTab === 'account' ? '#0E3E2F' : '#94A3B8'} />
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'account' ? 800 : 500 }}>
              Account
            </span>
          </button>
        </div>
      </nav>

      {/* Real-time Customer Notifications Modal */}
      {showNotificationsModal && (
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
            padding: '16px',
            zIndex: 9999,
          }}
          onClick={() => setShowNotificationsModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              width: '100%',
              maxWidth: '430px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '14px',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#16A34A',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflowY: 'auto',
                maxHeight: '60vh',
                paddingRight: '2px',
              }}
            >
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748B', fontSize: '13px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</div>
                  No notifications right now.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: notif.read ? '#F8FAFC' : '#F0FDF4',
                      border: notif.read ? '1px solid #E2E8F0' : '1px solid #BBF7D0',
                      cursor: notif.actionScreen ? 'pointer' : 'default',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor:
                          notif.type === 'order'
                            ? '#DCFCE7'
                            : notif.type === 'security'
                            ? '#FEF3C7'
                            : notif.type === 'promo'
                            ? '#FCE7F3'
                            : '#E0F2FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}
                    >
                      {notif.type === 'order'
                        ? '🛵'
                        : notif.type === 'security'
                        ? '🔒'
                        : notif.type === 'promo'
                        ? '🎟️'
                        : '⭐'}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '3px',
                        }}
                      >
                        <h4
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: notif.read ? '#334155' : '#0F172A',
                            margin: 0,
                          }}
                        >
                          {notif.title}
                        </h4>
                        <span style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 600 }}>
                          {notif.timestamp}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          lineHeight: 1.4,
                          margin: '0 0 6px 0',
                        }}
                      >
                        {notif.message}
                      </p>
                      {notif.actionScreen && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            color: '#16A34A',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          View Details &gt;
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Delivery Location Picker & GPS Detector Modal */}
      {showLocationModal && (
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
            padding: '16px',
            zIndex: 9999,
          }}
          onClick={() => setShowLocationModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              width: '100%',
              maxWidth: '440px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>
                  Select Delivery Location
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Choose your address for service dispatch
                </p>
              </div>
              <button
                onClick={() => setShowLocationModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                ✕
              </button>
            </div>

            {/* GPS Live Detection Button */}
            <button
              onClick={() => {
                detectUserLocation();
                setShowLocationModal(false);
              }}
              disabled={isDetectingLocation}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '16px',
                backgroundColor: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                marginBottom: '16px',
                textAlign: 'left',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                }}
              >
                📍
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                  {isDetectingLocation ? 'Detecting via GPS...' : 'Use Current GPS Location'}
                </div>
                <div style={{ fontSize: '11px', color: '#15803D', marginTop: '2px' }}>
                  Enable device location for doorstep dispatch
                </div>
              </div>
              <Icons.ChevronRight size={18} color="#16A34A" />
            </button>

            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                padding: '10px 14px',
                gap: '10px',
                marginBottom: '16px',
              }}
            >
              <Icons.Search size={16} color="#64748B" />
              <input
                type="text"
                placeholder="Search area, street, or landmark..."
                value={locationSearchQuery}
                onChange={(e) => setLocationSearchQuery(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  width: '100%',
                  fontSize: '13px',
                  color: '#0F172A',
                }}
              />
              {locationSearchQuery && (
                <button
                  onClick={() => setLocationSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '12px' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Saved Locations List */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Saved & Popular Addresses
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredSavedLocations.map((loc, idx) => {
                  const isSelected = currentLocation.title === loc.title;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setCurrentLocation(loc);
                        try {
                          localStorage.setItem('hsx_user_location', JSON.stringify(loc));
                        } catch {}
                        setShowLocationModal(false);
                      }}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        border: isSelected ? '1.5px solid #16A34A' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>📍</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            {loc.title}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            {loc.subtitle}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#16A34A', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                          ✓
                        </div>
                      ) : (
                        <Icons.ChevronRight size={16} color="#CBD5E1" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Manual Address Input Section */}
            <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
              <button
                onClick={() => setShowCustomAddressInput(!showCustomAddressInput)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#16A34A',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: 0,
                }}
              >
                <span>➕</span>
                <span>Enter custom address manually</span>
              </button>

              {showCustomAddressInput && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter full doorstep address..."
                    value={customAddressText}
                    onChange={(e) => setCustomAddressText(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!customAddressText.trim()) return;
                      const parts = customAddressText.split(',');
                      const title = parts[0]?.trim() || 'Custom Location';
                      const subtitle = parts.slice(1).join(',').trim() || 'Doorstep Address';
                      const newLoc: UserLocation = {
                        title,
                        subtitle,
                        fullAddress: customAddressText.trim(),
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        isGps: false,
                      };
                      setCurrentLocation(newLoc);
                      try {
                        localStorage.setItem('hsx_user_location', JSON.stringify(newLoc));
                      } catch {}
                      setShowCustomAddressInput(false);
                      setShowLocationModal(false);
                    }}
                    style={{
                      backgroundColor: '#0E3E2F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Set as Delivery Address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Instant Doorstep Booking Modal */}
      {showQuickBookModal && (
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
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowQuickBookModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '22px 20px 32px 20px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '18px' }}>⚡</span>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Instant Doorstep Booking
                  </h3>
                </div>
                <p style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, margin: '2px 0 0 0' }}>
                  Doorstep arrival in 30–45 mins • Verified Technicians
                </p>
              </div>
              <button
                onClick={() => setShowQuickBookModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '8px 12px',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#166534',
                fontWeight: 600,
              }}
            >
              <span>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Service Address: <b>{currentLocation.title}</b> ({currentLocation.subtitle})
              </span>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginBottom: '10px' }}>
              SELECT SERVICE TO BOOK NOW
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {[
                {
                  id: 'ac',
                  icon: '❄️',
                  title: 'AC Power Jet Wash & Service',
                  price: '₹499',
                  duration: '45 mins',
                  slug: 'split-ac-regular-service',
                },
                {
                  id: 'wm',
                  icon: '🧺',
                  title: 'Washing Machine Repair & Overhaul',
                  price: '₹449',
                  duration: '45 mins',
                  slug: 'washing-machine-overhaul',
                },
                {
                  id: 'fridge',
                  icon: '🧊',
                  title: 'Refrigerator Cooling & Gas Check',
                  price: '₹549',
                  duration: '45 mins',
                  slug: 'fridge-cooling-diagnostics',
                },
                {
                  id: 'elec',
                  icon: '⚡',
                  title: 'Electrician & Switchboard Repair',
                  price: '₹249',
                  duration: '30 mins',
                  slug: 'switchboard-repair',
                },
                {
                  id: 'plumb',
                  icon: '🔧',
                  title: 'Tap Leakage & Pipe Repair',
                  price: '₹299',
                  duration: '30 mins',
                  slug: 'tap-leak-repair',
                },
                {
                  id: 'clean',
                  icon: '🧹',
                  title: 'Deep Bathroom & Floor Scrub',
                  price: '₹599',
                  duration: '60 mins',
                  slug: 'deep-bathroom-cleaning',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setShowQuickBookModal(false);
                    handleNavigate('service-detail', {
                      slug: item.slug,
                      title: item.title,
                    });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span style={{ fontWeight: 800, color: '#16A34A' }}>{item.price}</span>
                        <span>•</span>
                        <span>⏱ {item.duration}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                    }}
                  >
                    Book Now
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowQuickBookModal(false);
                handleNavigate('services');
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '14px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              View All 16+ Services Catalog →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
