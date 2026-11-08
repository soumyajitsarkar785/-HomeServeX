import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';
import { RealStreetMap } from '../components/RealStreetMap';

interface CustomerTrackingScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  bookingId?: string;
}

export const CustomerTrackingScreen: React.FC<CustomerTrackingScreenProps> = ({
  onNavigate,
  bookingId = '#HSX-MVPO3IF5-6A064D',
}) => {
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<string[]>([
    'Hello! I am Ramesh Kumar, your certified AC servicing specialist.',
    'I have arrived at your doorstep with the power jet machine and protective kit.',
  ]);

  const [liveState, setLiveState] = useState<any | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [customDestination, setCustomDestination] = useState<any | null>(null);

  const cleanId = bookingId.replace(/^#/, '');

  // Poll live telemetry and fetch booking data
  useEffect(() => {
    let isMounted = true;

    const fetchTracking = () => {
      fetch(`/api/v1/bookings/${cleanId}/live-tracking-state`)
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data && isMounted) {
            setLiveState(json.data);
          }
        })
        .catch(() => {});

      // Fetch bookings list to match order details
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hsx_customer_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/v1/bookings', { headers })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data && isMounted) {
            const list = Array.isArray(json.data) ? json.data : [];
            const found =
              list.find(
                (b: any) =>
                  b.id === cleanId ||
                  b.referenceNumber === cleanId ||
                  b.id === bookingId ||
                  b.referenceNumber === bookingId
              ) ||
              list.find((b: any) => b.isOngoing) ||
              list[0];

            if (found) {
              setBookingDetails(found);
            }
          }
        })
        .catch(() => {});
    };

    fetchTracking();
    const interval = setInterval(fetchTracking, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [cleanId, bookingId]);

  // Real GPS Location Detection for Customer (Uber style)
  const handleDetectCustomerGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCustomDestination({ latitude: lat, longitude: lng });
        setNotificationBanner(`📍 Device GPS synced (${lat.toFixed(4)}, ${lng.toFixed(4)})! Route updated.`);

        try {
          await fetch(`/api/v1/bookings/${cleanId}/customer-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              address: destination.address,
            }),
          });
        } catch {}

        setGpsLoading(false);
        setTimeout(() => setNotificationBanner(null), 4000);
      },
      () => {
        setGpsLoading(false);
        alert('Could not retrieve device GPS. Please allow location permissions in your browser.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOtp(code);
    setTimeout(() => setCopiedOtp(null), 2500);
  };

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    setMessages((prev) => [...prev, messageText.trim()]);
    setMessageText('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        'Thank you! I am ready to begin the AC Power Jet Cleaning.',
      ]);
    }, 1200);
  };

  // Normalize lifecycle status
  const rawStatus = liveState?.status || bookingDetails?.rawStatus || bookingDetails?.status || 'SEARCHING_PROVIDER';
  const currentStatus: 'SEARCHING_PROVIDER' | 'ASSIGNED' | 'PROVIDER_EN_ROUTE' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' =
    rawStatus === 'COMPLETED' || rawStatus === 'Completed' ? 'COMPLETED' :
    rawStatus === 'IN_PROGRESS' || rawStatus === 'In progress' ? 'IN_PROGRESS' :
    rawStatus === 'ARRIVED' || rawStatus === 'Arrived' ? 'ARRIVED' :
    rawStatus === 'PROVIDER_EN_ROUTE' || rawStatus === 'On the way' ? 'PROVIDER_EN_ROUTE' :
    rawStatus === 'ASSIGNED' || rawStatus === 'Assigned' ? 'ASSIGNED' :
    'SEARCHING_PROVIDER';

  const isAssigned = currentStatus !== 'SEARCHING_PROVIDER';
  const providerName = isAssigned ? (liveState?.provider?.name || bookingDetails?.technician || 'Ramesh Kumar') : 'Matching Certified Pro...';
  const providerPhone = liveState?.provider?.phone || '+91 98201 98765';
  const providerSpecialization = liveState?.provider?.specialization || 'Senior AC Servicing Specialist';
  const vehicleName = liveState?.provider?.vehicle || 'Hero Electric (MH 02 CD 4821)';
  const displayStartOtp = liveState?.activeOtp?.purpose === 'START_SERVICE' ? liveState.activeOtp.otp : (bookingDetails?.otp || '');
  const displayCompleteOtp = liveState?.activeOtp?.purpose === 'COMPLETE_SERVICE' ? liveState.activeOtp.otp : (bookingDetails?.completionOtp || '');
  const rawEta = liveState?.etaMinutes ?? (currentStatus === 'PROVIDER_EN_ROUTE' ? 12 : 18);
  const etaMinutes =
    currentStatus === 'ARRIVED' || currentStatus === 'IN_PROGRESS' || currentStatus === 'COMPLETED'
      ? 0
      : Math.min(22, Math.max(2, rawEta > 60 ? 12 : rawEta));

  const rawDist = liveState?.distanceKm ?? (currentStatus === 'PROVIDER_EN_ROUTE' ? 1.4 : 2.6);
  const distanceKm =
    currentStatus === 'ARRIVED' || currentStatus === 'IN_PROGRESS' || currentStatus === 'COMPLETED'
      ? 0.0
      : Math.min(8.0, Math.max(0.3, rawDist > 25 ? 1.6 : rawDist));

  const userSavedLoc = (() => {
    try {
      const saved = localStorage.getItem('hsx_user_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  })();

  const destination = {
    latitude: customDestination?.latitude || liveState?.destination?.latitude || userSavedLoc?.latitude || 22.5800,
    longitude: customDestination?.longitude || liveState?.destination?.longitude || userSavedLoc?.longitude || 88.4326,
    address: liveState?.destination?.address || bookingDetails?.address || userSavedLoc?.fullAddress || 'Salt Lake Sector V, Kolkata, WB 700091',
  };

  const isAtDoorstep = ['ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(currentStatus);
  const isProvFar = (() => {
    if (!liveState?.liveLocation) return true;
    const dLat = Math.abs(liveState.liveLocation.latitude - destination.latitude);
    const dLng = Math.abs(liveState.liveLocation.longitude - destination.longitude);
    return Math.hypot(dLat, dLng) > 0.25;
  })();

  const providerLocation = {
    latitude: isAtDoorstep
      ? destination.latitude + 0.00006
      : (!isProvFar && liveState?.liveLocation ? liveState.liveLocation.latitude : destination.latitude + 0.0095),
    longitude: isAtDoorstep
      ? destination.longitude + 0.00004
      : (!isProvFar && liveState?.liveLocation ? liveState.liveLocation.longitude : destination.longitude - 0.0085),
    heading: isAtDoorstep ? 180 : (liveState?.liveLocation?.heading || 45),
    speed: isAtDoorstep ? 0 : (liveState?.liveLocation?.speed || 24),
  };

  const polylineRoute = isAtDoorstep || currentStatus === 'SEARCHING_PROVIDER' ? [] : (liveState?.polyline || []);
  const serviceName = bookingDetails?.service?.title || bookingDetails?.service || 'Split AC Power Jet Cleaning';
  const formattedPrice = bookingDetails?.price || (bookingDetails?.totalAmountPaise ? `₹${bookingDetails.totalAmountPaise / 100}` : '₹825');

  // Milestone Progress index (0-4)
  const milestoneIdx =
    currentStatus === 'COMPLETED' ? 4 :
    currentStatus === 'IN_PROGRESS' ? 3 :
    currentStatus === 'ARRIVED' ? 3 :
    currentStatus === 'PROVIDER_EN_ROUTE' ? 2 :
    currentStatus === 'ASSIGNED' ? 1 : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '12px 16px 80px',
        maxWidth: '720px',
        margin: '0 auto',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* ── CLEAN STATUS ROW (Single header handled by app container) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
        <div style={{ fontSize: '13px', color: '#0F172A', fontWeight: 800 }}>
          {serviceName}
        </div>

        <span
          style={{
            backgroundColor:
              currentStatus === 'ARRIVED' ? '#FEF3C7' :
              currentStatus === 'IN_PROGRESS' ? '#E0F2FE' :
              currentStatus === 'PROVIDER_EN_ROUTE' ? '#DCFCE7' :
              currentStatus === 'COMPLETED' ? '#DCFCE7' : '#F1F5F9',
            color:
              currentStatus === 'ARRIVED' ? '#B45309' :
              currentStatus === 'IN_PROGRESS' ? '#0369A1' :
              currentStatus === 'PROVIDER_EN_ROUTE' ? '#15803D' :
              currentStatus === 'COMPLETED' ? '#15803D' : '#475569',
            fontSize: '11px',
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor:
                currentStatus === 'ARRIVED' ? '#D97706' :
                currentStatus === 'IN_PROGRESS' ? '#0284C7' :
                currentStatus === 'PROVIDER_EN_ROUTE' ? '#16A34A' :
                currentStatus === 'COMPLETED' ? '#16A34A' : '#94A3B8',
              display: 'inline-block',
            }}
          />
          {currentStatus === 'ARRIVED'
            ? 'At Doorstep'
            : currentStatus === 'IN_PROGRESS'
            ? 'In Progress'
            : currentStatus === 'PROVIDER_EN_ROUTE'
            ? `En Route (~${etaMinutes}m)`
            : currentStatus === 'ASSIGNED'
            ? 'Pro Assigned'
            : currentStatus === 'COMPLETED'
            ? 'Completed'
            : 'Matching Pro'}
        </span>
      </div>

      {/* ── Toast Notification Banner ── */}
      {notificationBanner && (
        <div
          style={{
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <span>{notificationBanner}</span>
          <button
            onClick={() => setNotificationBanner(null)}
            style={{ background: 'none', border: 'none', color: '#94A3B8', fontWeight: 800, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── CONDITIONAL RENDER: AWAITING PROVIDER ACCEPTANCE VS LIVE TRACKING ── */}
      {!isAssigned ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '24px 20px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '18px',
          }}
        >
          {/* Animated Searching Radar (Rapido / Uber style) */}
          <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'rgba(22, 163, 74, 0.12)', animation: 'pulse 1.8s infinite' }} />
            <div style={{ position: 'absolute', width: '65px', height: '65px', borderRadius: '50%', backgroundColor: 'rgba(22, 163, 74, 0.22)' }} />
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '20px', zIndex: 2 }}>
              🔍
            </div>
          </div>

          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
              Finding Nearby Professional...
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '16px', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '12px', fontWeight: 800, margin: '6px 0 10px' }}>
              <span>🎯 Searching within {liveState?.dispatch?.currentRadiusKm || 3} km</span>
              {liveState?.dispatch?.currentStage && (
                <span>• Stage {liveState.dispatch.currentStage} of {liveState.dispatch.totalStages || 5}</span>
              )}
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.4, maxWidth: '420px' }}>
              Broadcasting request to certified specialists within {liveState?.dispatch?.currentRadiusKm || 3} km. As soon as a provider accepts, live GPS route tracking will begin automatically.
            </p>
          </div>

          {/* Booking Summary Box */}
          <div style={{ width: '100%', backgroundColor: '#F8FAFC', borderRadius: '16px', padding: '16px', border: '1px solid #E2E8F0', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Service Request</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#16A34A' }}># {bookingId}</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
              {serviceName}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#475569' }}>
              <span>📍</span>
              <span>{destination.address}</span>
            </div>
          </div>

          {/* Transparent Price Breakdown */}
          <div style={{ width: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '14px 16px', border: '1px solid #E2E8F0', textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
              Estimated Price Breakdown
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
              <span>Base Service Fee</span>
              <span>₹750</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', marginBottom: '4px' }}>
              <span>Taxes & Urban Kit Safety</span>
              <span>₹75</span>
            </div>
            <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>
              <span>Total Payable at Completion</span>
              <span style={{ color: '#0E3E2F' }}>{formattedPrice}</span>
            </div>
          </div>

          {/* Cancel Request Button */}
          <button
            onClick={() => {
              if (confirm('Are you sure you want to cancel this booking request?')) {
                onNavigate('home');
              }
            }}
            style={{
              padding: '12px 24px',
              borderRadius: '24px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#EF4444',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            Cancel Request
          </button>
        </div>
      ) : (
        <>
          {/* ── 1. UBER/RAPIDO STYLE LIVE STREET MAP ── */}
          <RealStreetMap
            destination={destination}
            providerLocation={providerLocation}
            polylineRoute={polylineRoute}
            etaMinutes={etaMinutes}
            distanceKm={distanceKm}
            providerName={providerName}
            vehicleName={vehicleName}
            status={currentStatus}
            height="260px"
            onDetectGps={handleDetectCustomerGps}
            gpsLoading={gpsLoading}
          />

      {/* ── 2. UNIFIED CLEAN WHITE BOTTOM CARD (No Clutter, Uber/Rapido Design) ── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          padding: '18px 20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Row 1: Technician Profile Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                backgroundColor: '#F1F5F9',
                position: 'relative',
                flexShrink: 0,
                border: '2px solid #16A34A',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                alt={providerName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  {providerName}
                </h3>
                <span
                  style={{
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '9px',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  VERIFIED PRO
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {providerSpecialization} • ★ 4.9 • <span style={{ color: '#0F172A', fontWeight: 600 }}>{vehicleName}</span>
              </div>
            </div>
          </div>

          {/* Quick Call & Message Circular Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowCallModal(true)}
              title="Call Technician"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icons.Phone size={17} color="#16A34A" />
            </button>
            <button
              onClick={() => setShowMessageModal(true)}
              title="Chat with Technician"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Icons.MessageSquare size={17} color="#0F172A" />
            </button>
          </div>
        </div>

        {/* Hairline Divider */}
        <div style={{ height: '1px', backgroundColor: '#F1F5F9', margin: '0 -4px' }} />

        {/* Row 2: Contextual Real-Time Status & Clean Passcode Chip */}
        {currentStatus === 'ARRIVED' ? (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              borderRadius: '16px',
              padding: '16px',
              border: '1.5px solid #86EFAC',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>
                  📍 Ramesh is at your doorstep!
                </div>
                <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px' }}>
                  Share this 4-digit passcode with Ramesh to begin AC jet washing.
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                  START PASSCODE
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#166534', fontFamily: 'monospace', letterSpacing: '4px' }}>
                  {displayStartOtp}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(displayStartOtp)}
                style={{
                  backgroundColor: '#0E3E2F',
                  color: '#86EFAC',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {copiedOtp === displayStartOtp ? '✓ Copied' : 'Copy ❐'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#15803D', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#16A34A', display: 'inline-block' }} />
              Waiting for Ramesh to enter Start OTP in Provider App...
            </div>
          </div>
        ) : currentStatus === 'IN_PROGRESS' ? (
          <div
            style={{
              backgroundColor: '#F0F9FF',
              borderRadius: '16px',
              padding: '16px',
              border: '1.5px solid #BAE6FD',
            }}
          >
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0369A1' }}>
                ⚡ AC Power Jet Cleaning in Progress
              </div>
              <div style={{ fontSize: '12px', color: '#0284C7', marginTop: '2px' }}>
                Coil jet washing & pressure test underway. Share completion code when finished.
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                padding: '12px 16px',
                border: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' }}>
                  COMPLETION PASSCODE
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0369A1', fontFamily: 'monospace', letterSpacing: '4px' }}>
                  {displayCompleteOtp}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(displayCompleteOtp)}
                style={{
                  backgroundColor: '#0369A1',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {copiedOtp === displayCompleteOtp ? '✓ Copied' : 'Copy ❐'}
              </button>
            </div>
          </div>
        ) : currentStatus === 'PROVIDER_EN_ROUTE' ? (
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '14px',
              padding: '14px 16px',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
              🛵 Ramesh is on the way (~{etaMinutes} mins away)
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '10px' }}>
              Live GPS route tracking active to your doorstep.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '8px 12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: '12px', color: '#475569' }}>
                Start OTP for Doorstep: <b style={{ color: '#0F172A', letterSpacing: '2px' }}>{displayStartOtp}</b>
              </span>
              <button
                onClick={() => copyToClipboard(displayStartOtp)}
                style={{ background: 'none', border: 'none', color: '#16A34A', fontWeight: 800, fontSize: '12px', cursor: 'pointer' }}
              >
                {copiedOtp === displayStartOtp ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ) : currentStatus === 'COMPLETED' ? (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              borderRadius: '16px',
              padding: '16px',
              border: '1.5px solid #86EFAC',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>🎉</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#166534' }}>
              Service Completed Successfully!
            </div>
            <div style={{ fontSize: '12px', color: '#15803D', marginTop: '2px', marginBottom: '12px' }}>
              AC Jet wash verified with Completion OTP. 30-Day warranty active.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              <button
                onClick={() => alert(`Official Invoice for ${cleanId} downloaded!`)}
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                📄 Tax Invoice
              </button>
              <button
                onClick={() => onNavigate('orders')}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  borderRadius: '20px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                View Orders
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FEF3E2',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #FDE68A',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
              🔍 Matching Nearby Certified Specialist...
            </div>
            <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
              Order request active. Waiting for nearest provider to accept.
            </div>
          </div>
        )}

        {/* Row 3: Uber Style Minimal Stepper Bar */}
        <div style={{ padding: '6px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: '7px',
                left: '12px',
                right: '12px',
                height: '2px',
                backgroundColor: '#E2E8F0',
                zIndex: 1,
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '7px',
                left: '12px',
                width: `${(milestoneIdx / 4) * 94}%`,
                height: '2px',
                backgroundColor: '#16A34A',
                zIndex: 2,
                transition: 'width 0.3s ease',
              }}
            />
            {['Placed', 'Assigned', 'En Route', 'At Door', 'Done'].map((label, idx) => {
              const isPast = idx < milestoneIdx;
              const isCurr = idx === milestoneIdx;
              return (
                <div key={label} style={{ zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: isPast || isCurr ? '#16A34A' : '#FFFFFF',
                      border: isPast || isCurr ? '2px solid #FFFFFF' : '2px solid #CBD5E1',
                      boxShadow: isCurr ? '0 0 0 3px rgba(22, 163, 74, 0.25)' : 'none',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: isCurr ? 800 : 600,
                      color: isCurr ? '#0F172A' : '#94A3B8',
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Row 4: Doorstep Address & Real Device GPS Sync Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            padding: '12px 14px',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '16px' }}>📍</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                Service Doorstep Destination
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {destination.address}
              </div>
            </div>
          </div>

          <button
            onClick={handleDetectCustomerGps}
            disabled={gpsLoading}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: '1px solid #16A34A',
              backgroundColor: gpsLoading ? '#FEF3C7' : '#FFFFFF',
              color: '#16A34A',
              fontSize: '11px',
              fontWeight: 800,
              cursor: gpsLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{gpsLoading ? 'Detecting...' : '📍 Sync Device GPS'}</span>
          </button>
        </div>

        {/* Row 5: Booking Details Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B' }}>
          <div>
            <span style={{ fontWeight: 800, color: '#0F172A' }}>{serviceName}</span> • Standard Urban Kit
          </div>
          <div style={{ fontWeight: 900, color: '#0E3E2F', fontSize: '14px' }}>
            {formattedPrice}
          </div>
        </div>
      </div>
    </>
  )}

      {/* ── CALL MODAL ── */}
      {showCallModal && (
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
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '320px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EAF4EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Icons.Phone size={28} color="#16A34A" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
              Calling {providerName}
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 8px 0' }}>
              Masked Secure Call: {providerPhone}
            </p>
            <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, marginBottom: '20px' }}>
              ● Ringing Technician...
            </div>
            <button
              onClick={() => setShowCallModal(false)}
              style={{
                backgroundColor: '#EF4444',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '24px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
              }}
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* ── CHAT MODAL ── */}
      {showMessageModal && (
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
              borderRadius: '20px',
              padding: '20px',
              width: '100%',
              maxWidth: '360px',
              display: 'flex',
              flexDirection: 'column',
              height: '420px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Chat with {providerName}
                </h3>
                <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>● Online at Doorstep</span>
              </div>
              <button
                onClick={() => setShowMessageModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '8px',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                marginBottom: '12px',
              }}
            >
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: idx % 2 === 0 ? 'flex-start' : 'flex-end',
                    backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#0E3E2F',
                    color: idx % 2 === 0 ? '#0F172A' : '#FFFFFF',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    maxWidth: '80%',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  {m}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type instructions for Ramesh..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '20px',
                  border: '1px solid #CBD5E1',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSendMessage}
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
