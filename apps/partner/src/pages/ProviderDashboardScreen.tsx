import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface ProviderDashboardScreenProps {
  onNavigate: (screen: string) => void;
  onSelectJob?: (jobId: string) => void;
  isOnline?: boolean;
  onToggleOnline?: () => void;
}

export const ProviderDashboardScreen: React.FC<ProviderDashboardScreenProps> = ({
  onNavigate,
  onSelectJob,
  isOnline = true,
  onToggleOnline,
}) => {
  const [incomingJob, setIncomingJob] = useState<any | null>(null);
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [availableCount, setAvailableCount] = useState(4);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [walletSummary, setWalletSummary] = useState<any>(null);

  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Poll live bookings and financial status
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('hsx_partner_token');
        const headers: Record<string, string> = {
          'x-role': 'PROVIDER',
          'x-app': 'partner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // 1. Fetch bookings
        const res = await fetch('/api/v1/bookings', { headers });
        if (res.ok) {
          const json = await res.json();
          if (json?.data && Array.isArray(json.data) && isMounted) {
            const list = json.data;

            // Incoming unaccepted jobs
            const incoming = list.find((b: any) =>
              b.rawStatus === 'SEARCHING_PROVIDER' || b.rawStatus === 'PENDING'
            );
            setIncomingJob(incoming || null);

            // Active ongoing jobs assigned to provider
            const active = list.find((b: any) =>
              ['ASSIGNED', 'PROVIDER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(b.rawStatus)
            );
            setActiveJob(active || null);

            const availCount = list.filter((b: any) =>
              b.rawStatus === 'SEARCHING_PROVIDER' || b.rawStatus === 'PENDING'
            ).length;
            if (availCount > 0) {
              setAvailableCount(availCount);
            }
          }
        }

        // 2. Fetch subscription status & wallet summary in parallel
        const [subRes, walRes] = await Promise.all([
          fetch('/api/v1/providers/subscription/status', { headers }).catch(() => null),
          fetch('/api/v1/providers/wallet/summary', { headers }).catch(() => null),
        ]);

        if (subRes && subRes.ok && isMounted) {
          const subJson = await subRes.json();
          if (subJson.success && subJson.data) {
            setSubscriptionStatus(subJson.data);
          }
        }

        if (walRes && walRes.ok && isMounted) {
          const walJson = await walRes.json();
          if (walJson.success && walJson.data) {
            setWalletSummary(walJson.data);
          }
        }
      } catch {}
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAcceptJob = async (job: any) => {
    setIsAccepting(true);
    try {
      const cleanId = (job.id || '').replace(/^#/, '');
      const token = localStorage.getItem('hsx_partner_token');
      const res = await fetch(`/api/v1/bookings/${cleanId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'PROVIDER',
          'x-app': 'partner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch(`/api/v1/bookings/${cleanId}/status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-role': 'PROVIDER',
            'x-app': 'partner',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: 'ASSIGNED' }),
        }).catch(() => {});
      }

      if (onSelectJob) onSelectJob(job.id);
      onNavigate('active-job');
    } finally {
      setIsAccepting(false);
    }
  };

  const isPremium = subscriptionStatus?.membershipType === 'PREMIUM';
  const balanceRupees = walletSummary?.balanceRupees ?? 3290;

  return (
    <div
      style={{
        backgroundColor: '#F8FAFC',
        minHeight: '100%',
        padding: '16px 20px 100px',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. Master Company Profile Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar with Online Status Indicator */}
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #064E3B 0%, #0E3E2F 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '16px',
                letterSpacing: '-0.2px',
                boxShadow: '0 2px 8px rgba(14, 62, 47, 0.25)',
              }}
            >
              RK
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: isOnline ? '#22C55E' : '#94A3B8',
                border: '2px solid #FFFFFF',
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
                {greetingTime}, Ramesh Kumar
              </h1>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#DCFCE7',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                ✓ VERIFIED PRO
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
              Senior Certified AC Specialist • Hero Electric (MH 02 CD 4821)
            </p>
          </div>
        </div>

        {/* Upgrade / Commission Pill Button */}
        <button
          onClick={() => onNavigate('subscription')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isPremium ? '#F0FDF4' : '#FFFBEB',
            border: isPremium ? '1px solid #BBF7D0' : '1px solid #FDE68A',
            color: isPremium ? '#15803D' : '#B45309',
            padding: '7px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        >
          {isPremium ? (
            <>
              <Icons.Crown size={14} color="#15803D" />
              <span>👑 Pro Partner · 0% Comm Active</span>
            </>
          ) : (
            <>
              <Icons.Zap size={14} color="#D97706" />
              <span>15% Commission • <strong style={{ color: '#0E3E2F', textDecoration: 'underline' }}>Upgrade to 0% Pro ➔</strong></span>
            </>
          )}
        </button>
      </div>

      {/* 2. Pristine 3-Column Metrics (Clean, Spacious, Zero Clutter) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {/* Today's Jobs */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#EFF6FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icons.Briefcase size={14} color="#2563EB" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px' }}>
                TODAY'S JOBS
              </span>
            </div>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#2563EB',
                backgroundColor: '#EFF6FF',
                padding: '2px 6px',
                borderRadius: '8px',
              }}
            >
              Target 5
            </span>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginBottom: '6px' }}>
            4
          </div>
          <div style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600 }}>
            ✓ 100% On-time completion
          </div>
        </div>

        {/* Net Earnings */}
        <div
          onClick={() => onNavigate('earnings')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#16A34A';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#DCFCE7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icons.Wallet size={14} color="#16A34A" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px' }}>
                NET EARNINGS
              </span>
            </div>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#15803D',
                backgroundColor: '#DCFCE7',
                padding: '2px 6px',
                borderRadius: '8px',
              }}
            >
              +₹620 bonus
            </span>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginBottom: '6px' }}>
            ₹{balanceRupees.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11.5px', color: '#0E3E2F', fontWeight: 700, textDecoration: 'underline' }}>
            ₹2,450 withdrawable ➔
          </div>
        </div>

        {/* Customer Rating */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '14px 16px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icons.Star size={14} color="#D97706" fill="#D97706" />
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px' }}>
                RATING
              </span>
            </div>
            <span
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                color: '#B45309',
                backgroundColor: '#FEF3C7',
                padding: '2px 6px',
                borderRadius: '8px',
              }}
            >
              Top 5%
            </span>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', lineHeight: 1, marginBottom: '6px' }}>
            4.9 <span style={{ fontSize: '16px', color: '#F59E0B' }}>★★★★★</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
            124 verified reviews
          </div>
        </div>
      </div>

      {/* 3. High Priority Incoming Booking Card (If Any) */}
      {incomingJob && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            borderRadius: '18px',
            border: '2px solid #F59E0B',
            padding: '18px',
            marginBottom: '16px',
            boxShadow: '0 6px 20px rgba(245, 158, 11, 0.16)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🚨</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', letterSpacing: '0.4px' }}>
                NEW ORDER REQUEST NEARBY
              </span>
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#0E3E2F' }}>
              Payout: {incomingJob.price || '₹742'}
            </span>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            {incomingJob.service || 'Split AC Power Jet Cleaning'}
          </h3>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 14px' }}>
            {incomingJob.id} • {incomingJob.address || 'Joynagar, Greater Kolkata, WB 700145'}
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleAcceptJob(incomingJob)}
              disabled={isAccepting}
              style={{
                flex: 1,
                padding: '11px',
                borderRadius: '24px',
                border: 'none',
                background: 'linear-gradient(180deg, #18B854 0%, #15803D 100%)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 800,
                cursor: isAccepting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
                transition: 'all 0.18s ease',
              }}
            >
              <span>{isAccepting ? 'Accepting Order...' : 'Accept Order ➔'}</span>
            </button>
            <button
              onClick={() => onNavigate('jobs')}
              style={{
                padding: '11px 18px',
                borderRadius: '24px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              View in Jobs
            </button>
          </div>
        </div>
      )}

      {/* 4. Active Job Card (If Any Ongoing) */}
      {activeJob ? (
        <div
          style={{
            backgroundColor: '#0E3E2F',
            borderRadius: '20px',
            padding: '22px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(14, 62, 47, 0.22)',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#A7F3D0',
              }}
            >
              <span>
                {activeJob.rawStatus === 'ASSIGNED'
                  ? 'ASSIGNED • READY TO START'
                  : activeJob.rawStatus === 'PROVIDER_EN_ROUTE'
                  ? 'ON THE WAY • LIVE TRACKING'
                  : activeJob.rawStatus === 'ARRIVED'
                  ? 'AT DOORSTEP • AWAITING OTP'
                  : activeJob.rawStatus === 'IN_PROGRESS'
                  ? 'IN PROGRESS • ACTIVE SERVICE'
                  : 'LIVE SERVICE'}
              </span>
              <span>•</span>
              <span>{activeJob.date || '02:00 PM'}</span>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#86EFAC' }}>
              Net: {activeJob.price || '₹742'}
            </span>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF' }}>
            {activeJob.service || 'Split AC Power Jet Cleaning'}
          </h3>
          <p style={{ fontSize: '12px', color: '#D1FAE5', margin: '0 0 16px' }}>
            {activeJob.id} • {activeJob.address || 'Joynagar, Greater Kolkata, WB 700145'}
          </p>

          <button
            onClick={() => {
              if (onSelectJob) onSelectJob(activeJob.id);
              onNavigate('active-job');
            }}
            style={{
              background: 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '24px',
              padding: '11px 24px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.18s ease',
            }}
          >
            <span>
              {activeJob.rawStatus === 'ASSIGNED'
                ? 'Start Trip & Navigate ➔'
                : activeJob.rawStatus === 'PROVIDER_EN_ROUTE'
                ? 'Track Route & Doorstep ➔'
                : activeJob.rawStatus === 'ARRIVED'
                ? 'Enter Start OTP ➔'
                : activeJob.rawStatus === 'IN_PROGRESS'
                ? 'Enter Completion OTP ➔'
                : 'Manage Active Job ➔'}
            </span>
          </button>
        </div>
      ) : (
        /* 5. Live Operations Hero Radar Card (Clean, World-Class Company Polish) */
        <div
          style={{
            background: isOnline
              ? 'linear-gradient(135deg, #073827 0%, #0D4A36 60%, #115E45 100%)'
              : 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: '20px',
            padding: '22px 24px',
            color: '#FFFFFF',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: isOnline ? '0 10px 25px rgba(10, 60, 40, 0.22)' : '0 8px 20px rgba(15, 23, 42, 0.25)',
            marginBottom: '16px',
            transition: 'all 0.3s ease',
            border: isOnline ? '1px solid rgba(255,255,255,0.1)' : '1px solid #334155',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            {/* Left Column: Duty Status & Action */}
            <div>
              {/* Meta Top Line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    border: isOnline ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isOnline ? '#86EFAC' : '#CBD5E1',
                    letterSpacing: '0.4px',
                  }}
                >
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: isOnline ? '#22C55E' : '#94A3B8',
                      boxShadow: isOnline ? '0 0 8px #22C55E' : 'none',
                    }}
                  />
                  <span>{isOnline ? 'ONLINE • GPS ACTIVE' : 'OFFLINE • DISPATCH PAUSED'}</span>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: isOnline ? '#A7F3D0' : '#94A3B8' }}>
                  Hero Electric (MH 02 CD 4821)
                </span>
              </div>

              {/* Clean, Impactful Headline */}
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                {isOnline ? 'Ready for Service Requests' : 'You are Currently Offline'}
              </h2>
              <p style={{ fontSize: '13px', color: isOnline ? '#D1FAE5' : '#CBD5E1', margin: '0 0 18px', lineHeight: 1.4, maxWidth: '420px' }}>
                {isOnline
                  ? 'Joynagar dispatch radar is scanning. Incoming customer bookings appear here.'
                  : 'Turn on your duty toggle to connect to nearby dispatch hubs and receive orders.'}
              </p>

              {/* Upgraded Tactical Button */}
              <button
                onClick={() => {
                  if (!isOnline && onToggleOnline) {
                    onToggleOnline();
                  } else {
                    onNavigate('jobs');
                  }
                }}
                style={{
                  background: isOnline
                    ? 'linear-gradient(180deg, #22C55E 0%, #16A34A 100%)'
                    : 'linear-gradient(180deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '24px',
                  padding: '11px 26px',
                  fontSize: '13px',
                  fontWeight: 800,
                  letterSpacing: '-0.2px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(22, 163, 74, 0.45)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 163, 74, 0.55)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(22, 163, 74, 0.45)';
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              >
                <span>{isOnline ? `View Available Jobs (${availableCount})` : 'Turn On & Go Online Now'}</span>
                <span style={{ fontSize: '14px' }}>➔</span>
              </button>
            </div>

            {/* Right Column: Live Dispatch Radar Widget (Company Style) */}
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '14px 18px',
                minWidth: '220px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isOnline ? '#22C55E' : '#94A3B8',
                      boxShadow: isOnline ? '0 0 8px #22C55E' : 'none',
                    }}
                  />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#A7F3D0', letterSpacing: '0.4px' }}>
                    LIVE RADAR
                  </span>
                </div>
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#86EFAC' }}>
                  GPS ±3m
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(34, 197, 94, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#86EFAC',
                  }}
                >
                  <Icons.MapPin size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
                    Joynagar Hub
                  </div>
                  <div style={{ fontSize: '11px', color: '#D1FAE5' }}>
                    5.0 km broadcast range
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#86EFAC',
                    backgroundColor: 'rgba(22, 163, 74, 0.3)',
                    padding: '3px 8px',
                    borderRadius: '10px',
                  }}
                >
                  Demand: High
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    padding: '3px 8px',
                    borderRadius: '10px',
                  }}
                >
                  HSX Insured
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Clean 2-Column Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <button
          onClick={() => onNavigate('jobs')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 18px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#0E3E2F';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#EAF4EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icons.Briefcase size={18} color="#0E3E2F" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                Available Jobs
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {availableCount} requests nearby
              </div>
            </div>
          </div>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0E3E2F',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            ➔
          </div>
        </button>

        <button
          onClick={() => onNavigate('earnings')}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 18px',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#D97706';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.02)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.99)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icons.Wallet size={18} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
                Daily Payout
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                ₹2,450 earned
              </div>
            </div>
          </div>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
              fontSize: '12px',
              fontWeight: 800,
            }}
          >
            ➔
          </div>
        </button>
      </div>
    </div>
  );
};
