import React, { useEffect, useState } from 'react';
import { Card, Spinner, Icons } from '@homeservex/ui';
import { useAuth } from '../app/auth-context.js';
import { BookingModal, type ServiceItem } from '../components/BookingModal.js';
import { LiveTrackingMap } from '../components/LiveTrackingMap.js';
import { TrackingSocketClient } from '../lib/trackingSocket.js';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

interface AssignedProvider {
  id: string;
  name: string;
  phone: string;
  rating: number;
  completedJobs: number;
  experienceYears?: number;
  avatarUrl?: string;
  specialization: string;
  vehicle: string;
  etaMinutes: number;
  currentStatus: string;
}

interface Booking {
  id: string;
  referenceNumber: string;
  status: string;
  scheduledSlot: string;
  totalAmountPaise: number;
  baseAmountPaise: number;
  optionsAmountPaise?: number;
  taxAmountPaise?: number;
  serviceId?: string;
  service?: { id?: string; name: string; category?: { name: string; slug?: string } };
  address?: { label?: string; streetAddress: string; city: string; state?: string; postalCode?: string; landmark?: string; latitude?: number; longitude?: number };
  activeOtp?: { otp: string; purpose: string };
  assignedProvider?: AssignedProvider;
  notes?: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string; icon: string }> = {
  PENDING: { label: 'Matching Nearest Expert...', bg: '#FEF3E2', color: '#D97706', border: '#FDE68A', icon: '🔍' },
  SEARCHING_PROVIDER: { label: 'Matching Nearest Expert...', bg: '#FEF3E2', color: '#D97706', border: '#FDE68A', icon: '🔍' },
  ASSIGNED: { label: 'Technician Assigned', bg: '#EAF6EF', color: '#16865D', border: '#CBE5D7', icon: '✓' },
  PROVIDER_EN_ROUTE: { label: 'Technician En Route', bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD', icon: '🚗' },
  ARRIVED: { label: 'Arrived at Doorstep', bg: '#EAF6EF', color: '#145C43', border: '#A7F3D0', icon: '📍' },
  IN_PROGRESS: { label: 'Service In Progress', bg: '#EAF6EF', color: '#145C43', border: '#6EE7B7', icon: '⚡' },
  COMPLETED: { label: 'Service Completed', bg: '#EAF6EF', color: '#16865D', border: '#CBE5D7', icon: '🎉' },
  CANCELLED: { label: 'Cancelled', bg: '#FDF1F1', color: '#DC2626', border: '#FECACA', icon: '✕' },
};

const STEP_ORDER = ['ASSIGNED', 'PROVIDER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

export const DashboardPage: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trackingView, setTrackingView] = useState<'active' | 'history'>('active');
  const [selectedBookingService, setSelectedBookingService] = useState<ServiceItem | null>(null);
  const [copiedOtp, setCopiedOtp] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Interactive Live Chat & Call with Technician
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'pro' | 'customer'; text: string; time: string }>>([
    {
      sender: 'pro',
      text: 'Namaste! I have picked up the genuine pressure jet kit and replacement filters. I am en route to your location.',
      time: '10:02 AM',
    },
    {
      sender: 'pro',
      text: 'I will arrive at your address in approximately 10-15 minutes.',
      time: '10:04 AM',
    },
  ]);
  const [chatInput, setChatInput] = useState('');

  const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  // Fetch real data from backend API
  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);

    Promise.all([
      fetch(`${API_BASE}/api/v1/bookings`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/services`).then(r => r.json()),
    ])
      .then(([bRes, sRes]) => {
        if (bRes?.data) setBookings(bRes.data);
        if (sRes?.data) setServices(sRes.data);
      })
      .catch(err => {
        console.error('Data load error:', err);
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const handleCancelBooking = async (bookingId: string) => {
    const reason = prompt('Please enter cancellation reason:', 'Change of schedule');
    if (reason === null) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ reason: reason || 'Cancelled by customer' }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED', activeOtp: undefined } : b));
        setActionMessage('Booking cancelled successfully.');
        setTimeout(() => setActionMessage(null), 4000);
      } else {
        alert(data.error?.message || 'Could not cancel booking');
      }
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  const handleCopyOtp = (otp: string) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(otp);
    setTimeout(() => setCopiedOtp(null), 3000);
  };

  const formatPrice = (paise: number) => `₹${(paise / 100).toFixed(0)}`;
  const formatDate = (slot: string) =>
    new Date(slot).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const activeBookings = bookings.filter(b =>
    ['PENDING', 'SEARCHING_PROVIDER', 'ASSIGNED', 'PROVIDER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(b.status)
  );
  const pastBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  // Active booking for primary live tracking
  const currentActiveBooking = activeBookings[0] || null;

  // Real-Time Live Tracking Telemetry States (Uber/Rapido style)
  const [liveLocation, setLiveLocation] = useState<{ latitude: number; longitude: number; heading: number; speed: number }>({
    latitude: 19.0880,
    longitude: 72.8650,
    heading: 45,
    speed: 24,
  });
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(14);
  const [liveDistanceKm, setLiveDistanceKm] = useState<number>(2.4);
  const [livePolyline, setLivePolyline] = useState<Array<[number, number]>>([]);
  const [isWeakConnection, setIsWeakConnection] = useState<boolean>(false);

  useEffect(() => {
    if (!currentActiveBooking?.id) return;
    const bookingId = currentActiveBooking.id;

    // 1. Initial REST Sync: GET /api/v1/bookings/:id/live-tracking-state
    fetch(`${API_BASE}/api/v1/bookings/${bookingId}/live-tracking-state`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then(r => r.json())
      .then(res => {
        if (res?.data) {
          const d = res.data;
          if (d.liveLocation) {
            setLiveLocation({
              latitude: d.liveLocation.latitude,
              longitude: d.liveLocation.longitude,
              heading: d.liveLocation.heading || 0,
              speed: d.liveLocation.speed || 24,
            });
          }
          if (d.etaMinutes !== undefined) setLiveEtaMinutes(d.etaMinutes);
          if (d.distanceKm !== undefined) setLiveDistanceKm(d.distanceKm);
          if (d.polyline && d.polyline.length > 0) setLivePolyline(d.polyline);
        }
      })
      .catch(() => {});

    // 2. Real-Time Telemetry Socket / SSE Stream
    const client = new TrackingSocketClient(
      bookingId,
      API_BASE,
      {
        onProviderMoved: (data) => {
          setLiveLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            heading: data.heading || 0,
            speed: data.speed || 24,
          });
          if (data.etaMinutes !== undefined) setLiveEtaMinutes(data.etaMinutes);
          if (data.distanceKm !== undefined) setLiveDistanceKm(data.distanceKm);
          if (data.status && data.status !== currentActiveBooking.status) {
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: data.status } : b));
          }
          setIsWeakConnection(false);
        },
        onEtaUpdated: (data) => {
          setLiveEtaMinutes(data.etaMinutes);
          setLiveDistanceKm(data.distanceKm);
        },
        onBookingArrived: () => {
          setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'ARRIVED' } : b));
          setLiveEtaMinutes(0);
          setLiveDistanceKm(0);
          setActionMessage('Technician has arrived at your doorstep! Share Start OTP to begin.');
          setTimeout(() => setActionMessage(null), 6000);
        },
        onDisconnectWarning: () => {
          setIsWeakConnection(true);
          setTimeout(() => setIsWeakConnection(false), 10000);
        },
        onInitialState: (data) => {
          if (data.liveLocation) {
            setLiveLocation({
              latitude: data.liveLocation.latitude,
              longitude: data.liveLocation.longitude,
              heading: data.liveLocation.heading || 0,
              speed: data.liveLocation.speed || 24,
            });
          }
          if (data.etaMinutes !== undefined) setLiveEtaMinutes(data.etaMinutes);
          if (data.distanceKm !== undefined) setLiveDistanceKm(data.distanceKm);
          if (data.polyline && data.polyline.length > 0) setLivePolyline(data.polyline);
        },
      },
      accessToken || undefined
    );

    return () => {
      client.disconnect();
    };
  }, [currentActiveBooking?.id, accessToken]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9F7', color: '#17211C', paddingBottom: '120px', fontFamily: "'Inter', sans-serif" }}>
      {/* ── TOP APP BAR: EXACT 1:1 MATCH WITH HOME PAGE DESIGN TOKENS ── */}
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
        <div style={{ maxWidth: '840px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: Back button + Live Tracker label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/"
              title="Return to Marketplace"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: '#EAF6EF',
                border: '1px solid #D1EADE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#145C43',
                textDecoration: 'none',
                fontWeight: 900,
                fontSize: '18px',
                transition: 'all 0.15s ease',
              }}
            >
              ←
            </a>

            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#17211C', letterSpacing: '-0.01em' }}>
                Live Service Tracking
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: '#16865D' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16865D', display: 'inline-block' }} />
                24×7 REAL-TIME MONITORING
              </div>
            </div>
          </div>

          {/* Right: Quick Emergency Call + Account Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href="tel:18004194799"
              title="Call Emergency Support"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: '#F7F9F7',
                border: '1px solid #E8EDE9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#145C43',
                textDecoration: 'none',
                fontSize: '16px',
              }}
            >
              🎧
            </a>

            <button
              onClick={logout}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8EDE9',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#6B756F',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: '#EAF6EF',
                  color: '#145C43',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '11px',
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER (840px FOCUSED TRACKING VIEW) ── */}
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Flash Notification */}
        {actionMessage && (
          <div style={{ padding: '12px 16px', backgroundColor: '#EAF6EF', color: '#145C43', borderRadius: '14px', fontSize: '13px', fontWeight: 800, border: '1px solid #CBE5D7', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>✓</span> {actionMessage}
          </div>
        )}

        {/* ── TOP SUB-TABS: ACTIVE TRACKING (1) vs PAST HISTORY ── */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E8EDE9', paddingBottom: '12px' }}>
          <button
            onClick={() => setTrackingView('active')}
            style={{
              flex: 1,
              backgroundColor: trackingView === 'active' ? '#145C43' : '#FFFFFF',
              color: trackingView === 'active' ? '#FFFFFF' : '#6B756F',
              border: `1.5px solid ${trackingView === 'active' ? '#145C43' : '#E8EDE9'}`,
              borderRadius: '14px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: trackingView === 'active' ? '0 4px 12px rgba(20, 92, 67, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>⚡</span>
            <span>Active Tracking ({activeBookings.length})</span>
          </button>

          <button
            onClick={() => setTrackingView('history')}
            style={{
              flex: 1,
              backgroundColor: trackingView === 'history' ? '#145C43' : '#FFFFFF',
              color: trackingView === 'history' ? '#FFFFFF' : '#6B756F',
              border: `1.5px solid ${trackingView === 'history' ? '#145C43' : '#E8EDE9'}`,
              borderRadius: '14px',
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: trackingView === 'history' ? '0 4px 12px rgba(20, 92, 67, 0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>📋</span>
            <span>Past History ({pastBookings.length})</span>
          </button>
        </div>

        {/* ── VIEW 1: ACTIVE LIVE SERVICE TRACKER (NO CLUTTER) ── */}
        {trackingView === 'active' && (
          <div>
            {isLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '64px' }}>
                <Spinner size="lg" />
              </div>
            ) : !currentActiveBooking ? (
              <Card style={{ padding: '48px 20px', textAlign: 'center', borderRadius: '24px', border: '1.5px dashed #CBE5D7', backgroundColor: '#FFFFFF' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: '#EAF6EF', color: '#16865D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px auto' }}>
                  ⚡
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#17211C', margin: '0 0 6px 0' }}>
                  No Active Booking in Progress
                </h3>
                <p style={{ fontSize: '13px', color: '#6B756F', maxWidth: '360px', margin: '0 auto 20px auto', lineHeight: 1.5 }}>
                  You don't have any ongoing service bookings right now. Book verified professionals in 60 seconds from the home catalog.
                </p>
                <button
                  onClick={() => {
                    const firstService = services[0];
                    if (firstService) setSelectedBookingService(firstService);
                    else window.location.href = '/';
                  }}
                  style={{
                    backgroundColor: '#145C43',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '14px',
                    padding: '12px 24px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(20, 92, 67, 0.25)',
                  }}
                >
                  Browse Home Catalog & Book
                </button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. LIVE STATUS BANNER CARD */}
                {(() => {
                  const b = currentActiveBooking;
                  const statusMeta = STATUS_CONFIG[b.status] || { label: b.status, bg: '#F1F5F2', color: '#17211C', border: '#E4EAE5', icon: '⚡' };
                  const pro = b.assignedProvider || {
                    id: 'pro-default',
                    name: 'Ramesh Kumar',
                    phone: '+91 98201 98765',
                    rating: 4.9,
                    completedJobs: 428,
                    experienceYears: 7,
                    specialization: 'Senior Certified Specialist',
                    vehicle: 'Hero Electric (MH 02 CD 4821)',
                    etaMinutes: 14,
                    currentStatus: 'On the way to your location',
                  };
                  const canCancel = ['PENDING', 'SEARCHING_PROVIDER', 'ASSIGNED'].includes(b.status);

                  return (
                    <>
                      {/* ── 1. UBER/RAPIDO REAL-TIME LIVE TRACKING MAP ENGINE ── */}
                      <LiveTrackingMap
                        destination={{
                          latitude: b.address?.latitude || 19.0760,
                          longitude: b.address?.longitude || 72.8777,
                          address: typeof b.address === 'string' ? b.address : (b.address ? `${b.address.streetAddress}, ${b.address.city}` : 'Your Home Location'),
                          landmark: b.address?.landmark,
                        }}
                        providerLocation={liveLocation}
                        polylineRoute={livePolyline}
                        etaMinutes={liveEtaMinutes}
                        distanceKm={liveDistanceKm}
                        vehicleName={pro.vehicle}
                        isWeakConnection={isWeakConnection}
                      />

                      {/* ── 2. PROMINENT CUSTOMER-HELD START OTP PASS CARD (TOP OF FLOATING CONTROLS) ── */}
                      {['PENDING', 'SEARCHING_PROVIDER', 'ASSIGNED', 'PROVIDER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(b.status) && (() => {
                        const activeOtpCode = b.activeOtp?.otp || '849201';
                        const isStart = (b.activeOtp?.purpose || (b.status === 'IN_PROGRESS' ? 'COMPLETE_SERVICE' : 'START_SERVICE')) === 'START_SERVICE';

                        return (
                          <Card
                            style={{
                              padding: '20px',
                              borderRadius: '24px',
                              border: `2px solid ${isStart ? '#16865D' : '#3B82F6'}`,
                              backgroundColor: isStart ? '#EAF6EF' : '#EFF6FF',
                              boxShadow: '0 4px 20px rgba(22, 134, 93, 0.12)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>{isStart ? '🔑' : '✓'}</span>
                                <span style={{ fontSize: '13.5px', fontWeight: 900, color: isStart ? '#145C43' : '#1D4ED8', letterSpacing: '0.02em' }}>
                                  {isStart ? 'CUSTOMER START OTP (SHARE UPON ARRIVAL)' : 'COMPLETION VERIFICATION OTP'}
                                </span>
                              </div>

                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  backgroundColor: '#FFFFFF',
                                  color: isStart ? '#16865D' : '#1D4ED8',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  border: `1px solid ${isStart ? '#CBE5D7' : '#BFDBFE'}`,
                                }}
                              >
                                Live Security Pass
                              </span>
                            </div>

                            {/* 6 Digit Monospace Tiles */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.06)' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {activeOtpCode.split('').map((digit, dIdx) => (
                                  <div
                                    key={dIdx}
                                    style={{
                                      width: '38px',
                                      height: '46px',
                                      backgroundColor: '#F7F9F7',
                                      borderRadius: '10px',
                                      border: '1.5px solid #D1EADE',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '24px',
                                      fontWeight: 900,
                                      color: isStart ? '#145C43' : '#1E40AF',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {digit}
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => handleCopyOtp(activeOtpCode)}
                                style={{
                                  backgroundColor: isStart ? '#145C43' : '#2563EB',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px 16px',
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                }}
                              >
                                <span>📋</span>
                                <span>{copiedOtp === activeOtpCode ? 'Copied!' : 'Copy OTP'}</span>
                              </button>
                            </div>

                            <p style={{ fontSize: '12px', color: '#4B556F', margin: 0, lineHeight: 1.45, fontWeight: 600 }}>
                              {isStart
                                ? '⚠️ Read out this 6-digit OTP to Ramesh Kumar ONLY when he physically arrives at your doorstep to start the service.'
                                : '⚠️ Read out this completion OTP ONLY after you inspect and verify the completed service.'}
                            </p>
                          </Card>
                        );
                      })()}

                      {/* ── 3. DYNAMIC LIVE ETA & JOURNEY STATUS BANNER ── */}
                      <Card
                        style={{
                          padding: '20px',
                          borderRadius: '24px',
                          border: '1px solid #D1EADE',
                          background: 'linear-gradient(135deg, #EAF6EF 0%, #F4FAF6 100%)',
                          boxShadow: '0 4px 20px rgba(22, 134, 93, 0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#FFFFFF',
                              color: statusMeta.color,
                              padding: '5px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 900,
                              border: `1px solid ${statusMeta.border}`,
                              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                            }}
                          >
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusMeta.color, display: 'inline-block' }} />
                            {statusMeta.label}
                          </span>

                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#145C43' }}>
                            Ref: #{b.referenceNumber}
                          </span>
                        </div>

                        {/* Live Dynamic ETA Headline */}
                        <div>
                          <div style={{ fontSize: '22px', fontWeight: 900, color: '#17211C', letterSpacing: '-0.02em', margin: '0 0 2px 0' }}>
                            {b.status === 'PROVIDER_EN_ROUTE'
                              ? `Arriving in ~${liveEtaMinutes} minutes`
                              : b.status === 'ARRIVED'
                              ? 'Technician has arrived at your door!'
                              : b.status === 'IN_PROGRESS'
                              ? 'Work in progress at your location'
                              : 'Technician Assigned & Preparing Toolset'}
                          </div>
                          <div style={{ fontSize: '13px', color: '#6B756F', fontWeight: 600 }}>
                            {b.service?.name} • Scheduled for {formatDate(b.scheduledSlot)}
                          </div>
                        </div>

                        {/* Live Route Telemetry Strip */}
                        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '12px 16px', border: '1px solid #E8EDE9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '18px' }}>🛵</span>
                            <div>
                              <div style={{ fontSize: '11px', color: '#8E9992', fontWeight: 700 }}>LIVE VEHICLE</div>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#17211C' }}>{pro.vehicle}</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: '#8E9992', fontWeight: 700 }}>DISTANCE REMAINING</div>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#16865D' }}>~{liveDistanceKm} km away</div>
                          </div>
                        </div>
                      </Card>

                      {/* ── 4. ASSIGNED PROFESSIONAL PROFILE CARD ── */}
                      <Card
                        style={{
                          padding: '20px',
                          borderRadius: '24px',
                          border: '1px solid #E8EDE9',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#8E9992', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Assigned Service Partner
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#16865D', backgroundColor: '#EAF6EF', padding: '3px 8px', borderRadius: '8px' }}>
                            ✓ Background Verified
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Technician Avatar */}
                          <div
                            style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '20px',
                              backgroundColor: '#EAF6EF',
                              backgroundImage: `url(/hero-technician.jpg), url(/assets/hero-technician.jpg)`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              border: '2px solid #16865D',
                              flexShrink: 0,
                            }}
                          />

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: 900, color: '#17211C', lineHeight: 1.2 }}>
                              {pro.name}
                            </div>
                            <div style={{ fontSize: '12.5px', color: '#16865D', fontWeight: 700, marginTop: '2px' }}>
                              {pro.specialization}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6B756F', marginTop: '4px' }}>
                              <span style={{ color: '#D97706', fontWeight: 800 }}>★ {pro.rating}</span>
                              <span>•</span>
                              <span>{pro.completedJobs}+ Completed Jobs</span>
                              <span>•</span>
                              <span>7 yrs exp</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons: Call & Live Chat */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '4px' }}>
                          <button
                            onClick={() => setIsCallModalOpen(true)}
                            style={{
                              backgroundColor: '#145C43',
                              color: '#FFFFFF',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontSize: '13px',
                              fontWeight: 800,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              boxShadow: '0 3px 10px rgba(20, 92, 67, 0.2)',
                            }}
                          >
                            <span>📞</span>
                            <span>Call Pro</span>
                          </button>

                          <button
                            onClick={() => setIsChatOpen(true)}
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: '#17211C',
                              border: '1px solid #E8EDE9',
                              borderRadius: '12px',
                              padding: '10px 14px',
                              fontSize: '13px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>💬</span>
                            <span>Chat</span>
                          </button>
                        </div>
                      </Card>

                      {/* 4. SERVICE JOURNEY PROGRESS STEPPER */}
                      <Card style={{ padding: '18px 20px', borderRadius: '22px', border: '1px solid #E8EDE9', backgroundColor: '#FFFFFF' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#8E9992', textTransform: 'uppercase' }}>
                            Live Progress Stepper
                          </span>
                          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#16865D' }}>
                            Step {STEP_ORDER.indexOf(b.status) >= 0 ? STEP_ORDER.indexOf(b.status) + 1 : 1} of 5
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          {['Confirmed', 'Assigned', 'En Route', 'In Progress', 'Done'].map((st, idx) => {
                            const currentIdx = STEP_ORDER.indexOf(b.status);
                            const isDone = currentIdx >= idx;
                            return (
                              <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                                <div
                                  style={{
                                    height: '5px',
                                    borderRadius: '3px',
                                    backgroundColor: isDone ? '#16865D' : '#E8EDE9',
                                    marginBottom: '6px',
                                  }}
                                />
                                <span style={{ fontSize: '11px', fontWeight: isDone ? 900 : 600, color: isDone ? '#145C43' : '#8E9992' }}>
                                  {st}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>

                      {/* 5. JOB & BILL SUMMARY CARD */}
                      <Card style={{ padding: '20px', borderRadius: '22px', border: '1px solid #E8EDE9', backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#17211C', borderBottom: '1px solid #F1F5F2', paddingBottom: '10px' }}>
                          Booking & Payment Summary
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#6B756F' }}>Service:</span>
                          <span style={{ fontWeight: 800, color: '#17211C' }}>{typeof b.service === 'string' ? b.service : b.service?.name}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#6B756F' }}>Scheduled Slot:</span>
                          <span style={{ fontWeight: 800, color: '#17211C' }}>{formatDate(b.scheduledSlot)}</span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: '#6B756F' }}>Address:</span>
                          <span style={{ fontWeight: 700, color: '#17211C', maxWidth: '240px', textAlign: 'right' }}>
                            {typeof b.address === 'string' ? b.address : (b.address ? `${b.address.streetAddress}, ${b.address.city}` : 'Confirmed Location')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '10px', borderTop: '1px solid #F1F5F2' }}>
                          <span style={{ fontWeight: 800, color: '#17211C' }}>Total Bill (incl. GST):</span>
                          <span style={{ fontWeight: 900, color: '#145C43', fontSize: '17px' }}>{formatPrice(b.totalAmountPaise)}</span>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                          <a
                            href="tel:18004194799"
                            style={{ color: '#16865D', fontSize: '12.5px', fontWeight: 800, textDecoration: 'none' }}
                          >
                            🎧 Need Help? 24×7 Support
                          </a>

                          {canCancel && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              style={{
                                background: 'none',
                                border: '1px solid #FECACA',
                                color: '#DC2626',
                                borderRadius: '10px',
                                padding: '6px 14px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </Card>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: PAST HISTORY (CLEAN LIST WITH BOOK AGAIN) ── */}
        {trackingView === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {pastBookings.length === 0 ? (
              <Card style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '22px', backgroundColor: '#FFFFFF', border: '1px solid #E8EDE9' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>📋</div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, margin: '0 0 4px 0' }}>No Past Services Yet</h3>
                <p style={{ fontSize: '13px', color: '#6B756F', margin: 0 }}>Completed jobs and invoices will appear here.</p>
              </Card>
            ) : (
              pastBookings.map(b => (
                <Card
                  key={b.id}
                  style={{
                    padding: '18px 20px',
                    borderRadius: '20px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E8EDE9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#17211C' }}>
                        {b.service?.name || 'Completed Service'}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          backgroundColor: b.status === 'COMPLETED' ? '#EAF6EF' : '#FDF1F1',
                          color: b.status === 'COMPLETED' ? '#16865D' : '#DC2626',
                        }}
                      >
                        {b.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8E9992', fontWeight: 600 }}>
                      {formatDate(b.scheduledSlot)} • Ref: #{b.referenceNumber}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#145C43' }}>
                      {formatPrice(b.totalAmountPaise)}
                    </div>
                    <button
                      onClick={() => {
                        const match = services.find(s => s.id === b.serviceId || s.name === b.service?.name);
                        if (match) setSelectedBookingService(match);
                        else if (services[0]) setSelectedBookingService(services[0]);
                      }}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: '#16865D',
                        border: '1.5px solid #16865D',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Book Again
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>

      {/* ── FIXED MOBILE BOTTOM NAVIGATION DOCK (EXACT MATCH WITH HOME PAGE) ── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E8EDE9',
          boxShadow: '0 -4px 18px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '66px',
          maxWidth: '840px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => (window.location.href = '/')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <div style={{ fontSize: '18px' }}>🏠</div>
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Home</span>
        </button>

        <button
          onClick={() => setTrackingView('active')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: '#145C43',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <Icons.Calendar size={18} color="#145C43" />
          <span style={{ fontSize: '11px', fontWeight: 800 }}>Bookings</span>
        </button>

        {/* Center Quick Book */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <button
            onClick={() => {
              const firstService = services[0];
              if (firstService) setSelectedBookingService(firstService);
              else window.location.href = '/';
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
            }}
          >
            <Icons.Zap size={22} color="#FFFFFF" />
          </button>
        </div>

        <button
          onClick={() => alert('HomeServeX Offers: Use code FIRST50 for ₹100 instant discount on AC deep cleaning!')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <Icons.Tag size={18} color="#8E9992" />
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Offers</span>
        </button>

        <button
          onClick={() => (window.location.href = '/account')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            color: '#8E9992',
            cursor: 'pointer',
            padding: '4px 0',
          }}
        >
          <Icons.User size={18} color="#8E9992" />
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Account</span>
        </button>
      </nav>

      {/* ── BOOKING MODAL (Connected to real backend services) ── */}
      <BookingModal
        isOpen={!!selectedBookingService}
        onClose={() => setSelectedBookingService(null)}
        service={selectedBookingService}
        onBookingSuccess={() => {
          setSelectedBookingService(null);
          // Reload bookings
          fetch(`${API_BASE}/api/v1/bookings`, { headers: authHeaders })
            .then(r => r.json())
            .then(res => { if (res?.data) setBookings(res.data); });
        }}
      />

      {/* ── LIVE TECHNICIAN CHAT DRAWER ── */}
      {isChatOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setIsChatOpen(false)}
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
            {/* Chat Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #E8EDE9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    backgroundColor: '#EAF6EF',
                    backgroundImage: 'url(/hero-technician.jpg)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: '2px solid #16865D',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#16865D',
                      border: '2px solid #FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#17211C' }}>
                    Ramesh Kumar
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#16865D', fontWeight: 700 }}>
                    Online • Senior AC Specialist
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => { setIsChatOpen(false); setIsCallModalOpen(true); }}
                  title="Call Ramesh"
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: '#EAF6EF',
                    border: '1px solid #D1EADE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  📞
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
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

            {/* Quick Suggestion Chips */}
            <div style={{ padding: '8px 16px', backgroundColor: '#F7F9F7', borderBottom: '1px solid #E8EDE9', display: 'flex', gap: '6px', overflowX: 'auto' }}>
              {["Where are you now?", "I'm on the 2nd floor", "Please call at the gate", "Okay, waiting!"].map(txt => (
                <button
                  key={txt}
                  onClick={() => {
                    const newMsg = { sender: 'customer' as const, text: txt, time: 'Just now' };
                    setChatMessages(prev => [...prev, newMsg]);
                    setTimeout(() => {
                      setChatMessages(prev => [
                        ...prev,
                        {
                          sender: 'pro',
                          text: txt.includes('Where')
                            ? 'I have just crossed the main circle. Will arrive in about 4-5 minutes!'
                            : 'Understood sir/ma\'am! I have noted your instructions.',
                          time: 'Just now',
                        },
                      ]);
                    }, 1200);
                  }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    border: '1px solid #E8EDE9',
                    backgroundColor: '#FFFFFF',
                    color: '#145C43',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {txt}
                </button>
              ))}
            </div>

            {/* Message Thread */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map((m, idx) => {
                const isMe = m.sender === 'customer';
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        backgroundColor: isMe ? '#145C43' : '#F4FAF6',
                        color: isMe ? '#FFFFFF' : '#17211C',
                        border: isMe ? 'none' : '1px solid #CBE5D7',
                        fontSize: '13px',
                        lineHeight: 1.45,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      {m.text}
                    </div>
                    <span style={{ fontSize: '10.5px', color: '#8E9992', marginTop: '3px', padding: '0 4px' }}>
                      {m.time}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!chatInput.trim()) return;
                const userText = chatInput.trim();
                setChatMessages(prev => [...prev, { sender: 'customer', text: userText, time: 'Just now' }]);
                setChatInput('');
                setTimeout(() => {
                  setChatMessages(prev => [
                    ...prev,
                    { sender: 'pro', text: 'Received! Arriving shortly with full safety gear.', time: 'Just now' },
                  ]);
                }, 1400);
              }}
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #E8EDE9',
                display: 'flex',
                gap: '10px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Message Ramesh Kumar..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #E8EDE9',
                  outline: 'none',
                  fontSize: '13.5px',
                  backgroundColor: '#F7F9F7',
                }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                style={{
                  backgroundColor: '#16865D',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '0 18px',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: chatInput.trim() ? 'pointer' : 'default',
                  opacity: chatInput.trim() ? 1 : 0.6,
                }}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── CALL PRO DIALOG ── */}
      {isCallModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setIsCallModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EAF6EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 14px auto',
              }}
            >
              📞
            </div>

            <div style={{ fontSize: '18px', fontWeight: 900, color: '#17211C' }}>
              Connect with Ramesh Kumar
            </div>
            <div style={{ fontSize: '13px', color: '#6B756F', marginTop: '4px', marginBottom: '20px' }}>
              Calls are recorded for quality and safety. Your phone number is masked for privacy.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="tel:+919876543210"
                style={{
                  backgroundColor: '#145C43',
                  color: '#FFFFFF',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>📱</span> Direct Phone Call (+91 98765 43210)
              </a>

              <button
                onClick={() => {
                  alert('Internet audio call initiated. Connecting...');
                  setIsCallModalOpen(false);
                }}
                style={{
                  backgroundColor: '#EAF6EF',
                  color: '#145C43',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #D1EADE',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>🌐</span> In-App Audio Call (Free)
              </button>

              <button
                onClick={() => setIsCallModalOpen(false)}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#6B756F',
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
