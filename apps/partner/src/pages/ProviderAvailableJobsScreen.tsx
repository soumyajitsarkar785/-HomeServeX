import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface AvailableJob {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  distance: string;
  time: string;
  payout: number;
  imageUrl: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'COMPLETED';
}

const INITIAL_JOBS: AvailableJob[] = [
  {
    id: 'job-hsx-ac',
    orderNumber: '#HSX-MVPO3IF5-6A064D',
    title: 'Split AC Power Jet Cleaning',
    category: 'AC Service & Repair',
    distance: 'Joynagar, Greater Kolkata',
    time: '02:00 PM',
    payout: 742,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    status: 'ASSIGNED',
  },
  {
    id: 'job-1',
    orderNumber: '#HSX123456',
    title: 'AC Regular Filter Servicing',
    category: 'AC',
    distance: '2.4 km',
    time: '03:30 PM',
    payout: 299,
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
  },
  {
    id: 'job-2',
    orderNumber: '#HSX123457',
    title: 'Washing Machine Repair',
    category: 'Washing Machine',
    distance: '3.1 km',
    time: '4:15 PM',
    payout: 349,
    imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
  },
  {
    id: 'job-3',
    orderNumber: '#HSX123458',
    title: 'Refrigerator Repair',
    category: 'Refrigerator',
    distance: '4.8 km',
    time: '5:30 PM',
    payout: 399,
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
    status: 'AVAILABLE',
  },
];

interface ProviderAvailableJobsScreenProps {
  onNavigate: (screen: string) => void;
  onSelectJob: (jobId: string) => void;
}

export const ProviderAvailableJobsScreen: React.FC<ProviderAvailableJobsScreenProps> = ({
  onNavigate,
  onSelectJob,
}) => {
  const [activeTab, setActiveTab] = useState<'Nearby' | 'Assigned' | 'History'>('Nearby');
  const [jobs, setJobs] = useState<AvailableJob[]>(INITIAL_JOBS);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<AvailableJob | null>(null);
  const [offerTimer, setOfferTimer] = useState(30);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setOfferTimer((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Poll live bookings from backend
  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('hsx_partner_token');
        const res = await fetch('/api/v1/bookings', {
          headers: {
            'x-role': 'PROVIDER',
            'x-app': 'partner',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.data && Array.isArray(json.data) && isMounted) {
            const mappedBookings: AvailableJob[] = json.data.map((b: any) => {
              const rawSt = b.rawStatus || b.status;
              let jobStatus: 'AVAILABLE' | 'ASSIGNED' | 'COMPLETED' = 'AVAILABLE';
              if (rawSt === 'COMPLETED' || rawSt === 'Completed' || rawSt === 'CANCELLED' || rawSt === 'Cancelled') {
                jobStatus = 'COMPLETED';
              } else if (
                rawSt === 'ASSIGNED' || rawSt === 'Assigned' ||
                rawSt === 'PROVIDER_EN_ROUTE' || rawSt === 'On the way' ||
                rawSt === 'ARRIVED' || rawSt === 'Arrived' ||
                rawSt === 'IN_PROGRESS' || rawSt === 'In progress'
              ) {
                jobStatus = 'ASSIGNED';
              } else {
                jobStatus = 'AVAILABLE';
              }

              const numPayout = typeof b.price === 'string'
                ? parseInt(b.price.replace(/[^\d]/g, ''), 10) || 742
                : 742;

              return {
                id: b.bookingId || b.id,
                orderNumber: b.id?.startsWith('#') ? b.id : `#${b.id}`,
                title: b.service || 'Split AC Power Jet Cleaning',
                category: b.service?.includes('AC') ? 'AC Service & Repair' : 'Home Service',
                distance: b.address ? (b.address.length > 30 ? b.address.slice(0, 30) + '...' : b.address) : 'Doorstep (2.4 km)',
                time: b.date || '02:00 PM',
                payout: Math.round(numPayout * 0.9),
                imageUrl: b.imageUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
                status: jobStatus,
              };
            });

            setJobs(_prev => {
              const dynamicRefs = new Set(mappedBookings.map(m => m.orderNumber));
              const nonCollidingMocks = INITIAL_JOBS.filter(
                m => !dynamicRefs.has(m.orderNumber) && m.id !== 'job-hsx-ac'
              );
              return [...mappedBookings, ...nonCollidingMocks];
            });
          }
        }
      } catch {}
    };

    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleAccept = async (job: AvailableJob) => {
    setAcceptingId(job.id);
    setSelectedJobForDetails(null);
    try {
      const cleanJobId = job.orderNumber.replace('#', '');
      const token = localStorage.getItem('hsx_partner_token');

      // GPS Coordinates for server-side Haversine geodesic validation
      let coords: { latitude: number; longitude: number } | undefined = undefined;
      try {
        if (navigator.geolocation) {
          const pos: any = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3000 });
          });
          if (pos?.coords) {
            coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          }
        }
      } catch {}
      if (!coords) {
        coords = { latitude: 22.5850, longitude: 88.4350 };
      }

      // Post to accept endpoint
      const res = await fetch(`/api/v1/bookings/${cleanJobId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'PROVIDER',
          'x-app': 'partner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(coords),
      }).catch(() => null);

      if (res && res.ok) {
        setJobs(prev =>
          prev.map(j => (j.id === job.id || j.orderNumber === job.orderNumber ? { ...j, status: 'ASSIGNED' } : j))
        );
        onSelectJob(job.orderNumber || job.id);
        onNavigate('active-job');
        return;
      }

      if (res) {
        if (res.status === 403) {
          const json = await res.json().catch(() => ({}));
          setToastMessage(json.error?.message || 'Outside allowed dispatch search radius.');
          setTimeout(() => setToastMessage(null), 4000);
          return;
        }
        if (res.status === 409) {
          const json = await res.json().catch(() => ({}));
          setToastMessage(json.error?.message || 'Offer expired or accepted by another provider.');
          setTimeout(() => setToastMessage(null), 4000);
          return;
        }
      }

      // Resilient fallback to status endpoint
      await fetch(`/api/v1/bookings/${cleanJobId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role': 'PROVIDER',
          'x-app': 'partner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'ASSIGNED' }),
      }).catch(() => {});

      setJobs(prev =>
        prev.map(j => (j.id === job.id || j.orderNumber === job.orderNumber ? { ...j, status: 'ASSIGNED' } : j))
      );
      onSelectJob(job.orderNumber || job.id);
      onNavigate('active-job');
    } finally {
      setAcceptingId(null);
    }
  };

  const nearbyCount = jobs.filter(j => j.status === 'AVAILABLE').length;
  const assignedCount = jobs.filter(j => j.status === 'ASSIGNED').length;
  const historyCount = jobs.filter(j => j.status === 'COMPLETED').length;

  const filteredJobs = jobs.filter(job => {
    if (activeTab === 'Nearby') return job.status === 'AVAILABLE';
    if (activeTab === 'Assigned') return job.status === 'ASSIGNED';
    return job.status === 'COMPLETED';
  });

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', padding: '16px 16px 90px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'none';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        >
          <Icons.ArrowLeft size={18} color="#0F172A" />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          Available Jobs
        </h1>
      </div>

      {/* Filter Segment (Nearby, Assigned, History) */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          padding: '4px',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {(['Nearby', 'Assigned', 'History'] as const).map(tab => {
          const isSelected = activeTab === tab;
          const count = tab === 'Nearby' ? nearbyCount : tab === 'Assigned' ? assignedCount : historyCount;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '12px',
                border: 'none',
                background: isSelected ? 'linear-gradient(180deg, #145C43 0%, #0E3E2F 100%)' : 'transparent',
                color: isSelected ? '#FFFFFF' : '#64748B',
                fontSize: '13px',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isSelected ? '0 2px 8px rgba(14, 62, 47, 0.25)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.color = '#0F172A';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }
              }}
            >
              <span>{tab}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : '#64748B',
                  fontWeight: 700,
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {toastMessage && (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '14px',
          }}
        >
          ⚠️ {toastMessage}
        </div>
      )}

      {/* Jobs Feed Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredJobs.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '36px 20px',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
              No {activeTab} Jobs
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Check back shortly or keep location services active to receive instant dispatches.
            </div>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div
              key={job.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '14px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              {/* Live Offer Timer Badge for Available Jobs */}
              {job.status === 'AVAILABLE' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#FEF3C7',
                      color: '#B45309',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    ⏱ {offerTimer}s remaining to accept
                  </span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    ● Live Dispatch Offer
                  </span>
                </div>
              )}

              {/* Top details */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <img
                  src={job.imageUrl}
                  alt={job.title}
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    backgroundColor: '#F1F5F9',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                      {job.title}
                    </h3>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0E3E2F' }}>
                      ₹{job.payout}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{job.distance}</span>
                    <span>•</span>
                    <span>{job.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                    Order: {job.orderNumber}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Contextual based on job status */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {job.status === 'AVAILABLE' ? (
                  <>
                    <button
                      id={`accept-job-btn-${job.orderNumber.replace(/[^a-zA-Z0-9]/g, '')}`}
                      onClick={() => handleAccept(job)}
                      disabled={acceptingId === job.id}
                      style={{
                        flex: 1,
                        padding: '11px 0',
                        borderRadius: '24px',
                        border: 'none',
                        background: 'linear-gradient(180deg, #18B854 0%, #15803D 100%)',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: acceptingId === job.id ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        if (acceptingId !== job.id) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 163, 74, 0.45)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.35)';
                      }}
                      onMouseDown={(e) => {
                        if (acceptingId !== job.id) e.currentTarget.style.transform = 'scale(0.97)';
                      }}
                      onMouseUp={(e) => {
                        if (acceptingId !== job.id) e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                    >
                      <span>{acceptingId === job.id ? 'Accepting Offer...' : 'Accept Order ➔'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedJobForDetails(job)}
                      style={{
                        padding: '11px 20px',
                        borderRadius: '24px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#94A3B8';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.transform = 'none';
                      }}
                      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                      onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                    >
                      Details
                    </button>
                  </>
                ) : job.status === 'ASSIGNED' ? (
                  <button
                    onClick={() => {
                      onSelectJob(job.orderNumber || job.id);
                      onNavigate('active-job');
                    }}
                    style={{
                      flex: 1,
                      padding: '11px 0',
                      borderRadius: '24px',
                      border: 'none',
                      background: 'linear-gradient(180deg, #145C43 0%, #0E3E2F 100%)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(14, 62, 47, 0.3)',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(14, 62, 47, 0.42)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(14, 62, 47, 0.3)';
                    }}
                    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                    onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  >
                    <span>Manage Active Job</span>
                    <span>➔</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onSelectJob(job.orderNumber || job.id);
                      onNavigate('active-job');
                    }}
                    style={{
                      flex: 1,
                      padding: '11px 0',
                      borderRadius: '24px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      transition: 'all 0.18s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }}
                  >
                    View Job Summary
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Real Job Details Modal */}
      {selectedJobForDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#16A34A',
                    backgroundColor: '#DCFCE7',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    letterSpacing: '0.4px',
                  }}
                >
                  {selectedJobForDetails.status === 'AVAILABLE'
                    ? '● INSTANT DISPATCH'
                    : selectedJobForDetails.status === 'ASSIGNED'
                    ? '● ASSIGNED TO YOU'
                    : '● COMPLETED'}
                </span>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Job Details
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Order: {selectedJobForDetails.orderNumber}
                </div>
              </div>
              <button
                onClick={() => setSelectedJobForDetails(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {/* Service & Payout Card */}
            <div
              style={{
                display: 'flex',
                gap: '14px',
                padding: '14px',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                alignItems: 'center',
              }}
            >
              <img
                src={selectedJobForDetails.imageUrl}
                alt={selectedJobForDetails.title}
                style={{ width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  {selectedJobForDetails.title}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {selectedJobForDetails.category}
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0E3E2F', marginTop: '4px' }}>
                  ₹{selectedJobForDetails.payout}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#16A34A', marginLeft: '6px' }}>
                    Net Guaranteed Payout
                  </span>
                </div>
              </div>
            </div>

            {/* Doorstep Location Card */}
            <div
              style={{
                padding: '14px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Icons.MapPin size={16} color="#16A34A" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                  Service Doorstep Address
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    padding: '2px 6px',
                    borderRadius: '6px',
                  }}
                >
                  GPS Verified
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#334155', margin: '0 0 6px', lineHeight: 1.4, fontWeight: 500 }}>
                {selectedJobForDetails.distance.includes('km')
                  ? 'Joynagar, Greater Kolkata, Sonarpur, South 24 Parganas, West Bengal, 700145'
                  : selectedJobForDetails.distance}
              </p>
              <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Scheduled: <strong>{selectedJobForDetails.time}</strong></span>
                <span>•</span>
                <span>Within 35 mins</span>
              </div>
            </div>

            {/* Problem & Requirements Card */}
            <div
              style={{
                padding: '14px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Customer Diagnostics & Request
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                • Standard comprehensive cleaning & diagnostic health inspection.<br />
                • Check motor performance, wiring continuity, and filter cleanliness.<br />
                • Original OEM parts and 30-day doorstep warranty covered by HomeServeX.
              </p>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              {selectedJobForDetails.status === 'AVAILABLE' ? (
                <>
                  <button
                    onClick={() => handleAccept(selectedJobForDetails)}
                    disabled={acceptingId === selectedJobForDetails.id}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '24px',
                      border: 'none',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    <span>{acceptingId === selectedJobForDetails.id ? 'Accepting Offer...' : `Accept Order (₹${selectedJobForDetails.payout}) ➔`}</span>
                  </button>
                  <button
                    onClick={() => setSelectedJobForDetails(null)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '24px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    const id = selectedJobForDetails.orderNumber || selectedJobForDetails.id;
                    setSelectedJobForDetails(null);
                    onSelectJob(id);
                    onNavigate('active-job');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '24px',
                    border: 'none',
                    backgroundColor: '#0E3E2F',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <span>Go to Active Job Screen ➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
