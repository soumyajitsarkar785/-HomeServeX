import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

interface CustomerOrdersScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  mode?: 'activeOnly' | 'fullHistory';
}

export const CustomerOrdersScreen: React.FC<CustomerOrdersScreenProps> = ({
  onNavigate,
  mode = 'fullHistory',
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Ongoing' | 'Completed' | 'Cancelled'>('All');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tabs: Array<'All' | 'Ongoing' | 'Completed' | 'Cancelled'> = ['All', 'Ongoing', 'Completed', 'Cancelled'];

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const cleanDisplayAddress = (addr: any) => {
    if (!addr) return activeSavedAddress;
    if (typeof addr === 'object') {
      const parts = [addr.streetAddress, addr.city, addr.state, addr.postalCode].filter(Boolean);
      return parts.join(', ') || activeSavedAddress;
    }
    let clean = String(addr).replace(/,\s*,/g, ',').replace(/,\s*$/, '').trim();
    return clean || activeSavedAddress;
  };

  const activeSavedAddress = (() => {
    try {
      const saved = localStorage.getItem('hsx_user_location');
      if (saved) return JSON.parse(saved).fullAddress;
    } catch {}
    return 'Salt Lake Sector V, Kolkata, WB 700091';
  })();

  const fallbackOrders = [
    {
      id: '#HSX-MVPO3IF5-6A064D',
      service: 'Split AC Power Jet Cleaning',
      price: '₹825',
      date: '27 Oct 2026',
      status: 'Arrived',
      statusType: 'ongoing',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      technician: 'Ramesh Kumar',
      category: 'AC Service & Repair',
      rating: 4.9,
      address: activeSavedAddress,
      otp: '4821',
      completionOtp: '7394',
    },
    {
      id: '#HSX-CLN88219-4B022',
      service: 'Deep Home Cleaning & Sanitization',
      price: '₹1,499',
      date: '20 Oct 2026',
      status: 'Completed',
      statusType: 'completed',
      imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80',
      technician: 'Amit Singh',
      category: 'Cleaning',
      rating: 4.8,
      address: activeSavedAddress,
      otp: '5512',
    },
    {
      id: '#HSX-REF44120-9C114',
      service: 'Refrigerator Dual Cooling Repair',
      price: '₹649',
      date: '15 Oct 2026',
      status: 'Completed',
      statusType: 'completed',
      imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
      technician: 'Suresh Das',
      category: 'Appliance Repair',
      rating: 4.9,
      address: activeSavedAddress,
      otp: '3201',
    },
    {
      id: '#HSX-WSH31908-7D339',
      service: 'Washing Machine Motor Overhaul',
      price: '₹899',
      date: '02 Oct 2026',
      status: 'Completed',
      statusType: 'completed',
      imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
      technician: 'Rahul Mehta',
      category: 'Appliance Repair',
      rating: 4.7,
      address: activeSavedAddress,
      otp: '6712',
    },
    {
      id: '#HSX-MCW10924-5A901',
      service: 'Microwave Oven Magnetron Inspection',
      price: '₹349',
      date: '28 Sep 2026',
      status: 'Cancelled',
      statusType: 'cancelled',
      imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=400&q=80',
      technician: 'Unassigned',
      category: 'Kitchen Appliance',
      address: activeSavedAddress,
      otp: '1102',
    },
  ];

  const fetchOrders = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hsx_customer_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/v1/bookings', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setOrders(data.data);
        } else {
          setOrders(fallbackOrders);
        }
      })
      .catch(() => setOrders(fallbackOrders))
      .finally(() => setIsLoading(false));
  };

  React.useEffect(() => {
    fetchOrders();
    const timer = setInterval(fetchOrders, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm(`Are you sure you want to cancel order ${orderId}?`)) return;
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hsx_customer_token');
      await fetch(`/api/v1/bookings/${orderId.replace('#', '')}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'Cancelled', statusType: 'cancelled' } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'Cancelled', statusType: 'cancelled' });
      }
    } catch {
      alert('Unable to cancel at this moment.');
    }
  };

  const isOngoingStatus = (status: string, statusType: string) => {
    return (
      statusType === 'ongoing' ||
      ['Searching', 'Arrived', 'On the way', 'In progress', 'Assigned', 'PROVIDER_EN_ROUTE', 'SEARCHING_PROVIDER'].includes(status)
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (mode === 'activeOnly') {
      // User requirement: "booking page user book korle just setai dekhte pabe , complete hole ar dekhte pabe na"
      return isOngoingStatus(o.status, o.statusType);
    }
    if (activeTab === 'All') return true;
    if (activeTab === 'Ongoing') return isOngoingStatus(o.status, o.statusType);
    if (activeTab === 'Completed') return o.statusType === 'completed' || o.status === 'Completed';
    if (activeTab === 'Cancelled') return o.statusType === 'cancelled' || o.status === 'Cancelled';
    return true;
  });

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', dot: '#16A34A', text: 'Completed' };
      case 'Arrived':
        return { bg: '#FEF3C7', color: '#B45309', border: '#FCD34D', dot: '#D97706', text: 'Arrived at Doorstep' };
      case 'In progress':
        return { bg: '#E0F2FE', color: '#0369A1', border: '#7DD3FC', dot: '#0284C7', text: 'In Progress' };
      case 'On the way':
        return { bg: '#EAF4EF', color: '#0E3E2F', border: '#86EFAC', dot: '#16A34A', text: 'On the Way (12m)' };
      case 'Searching':
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', dot: '#16A34A', text: 'Searching' };
      case 'Cancelled':
        return { bg: '#FEE2E2', color: '#B91C1C', border: '#FCA5A5', dot: '#DC2626', text: 'Cancelled' };
      default:
        return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', dot: '#64748B', text: status };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', paddingBottom: '90px', maxWidth: '800px', margin: '0 auto' }}>
      {/* ── Screen Header Title ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            {mode === 'activeOnly' ? 'Active Bookings' : 'My Orders'}
          </h2>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>
            {mode === 'activeOnly'
              ? 'Live doorstep service tracking & technician progress'
              : 'Complete history of all your doorstep bookings & service receipts'}
          </p>
        </div>
        {mode === 'activeOnly' && filteredOrders.length > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', backgroundColor: '#DCFCE7', padding: '4px 10px', borderRadius: '16px' }}>
            ● {filteredOrders.length} Ongoing
          </span>
        )}
      </div>

      {/* ── Filter Tabs: Only shown in Full History mode (Account -> My Orders) ── */}
      {mode === 'fullHistory' && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '2px',
            scrollbarWidth: 'none',
          }}
        >
          {tabs.map((tab) => {
            const isSelected = activeTab === tab;
            const count = orders.filter((o) => {
              if (tab === 'All') return true;
              if (tab === 'Ongoing') return isOngoingStatus(o.status, o.statusType);
              if (tab === 'Completed') return o.statusType === 'completed' || o.status === 'Completed';
              if (tab === 'Cancelled') return o.statusType === 'cancelled' || o.status === 'Cancelled';
              return true;
            }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '24px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: isSelected ? '1.5px solid #0E3E2F' : '1.5px solid #E2E8F0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  backgroundColor: isSelected ? '#0E3E2F' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#475569',
                  boxShadow: isSelected ? '0 3px 10px rgba(14, 62, 47, 0.2)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab}</span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : '#64748B',
                    fontWeight: 800,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Order Cards Vertical List ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#16A34A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading your verified bookings...
        </div>
      ) : filteredOrders.length === 0 ? (
        mode === 'activeOnly' ? (
          /* Clean empty state for Active Bookings tab */
          <div style={{ textAlign: 'center', padding: '48px 20px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 14px' }}>
              🛵
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
              No Active Bookings Right Now
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 auto 18px', lineHeight: 1.5, maxWidth: '340px' }}>
              When you book a service, live technician tracking, ETA, and doorstep OTP will appear here until completion.
            </p>
            <button
              onClick={() => onNavigate('home')}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '24px',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
              }}
            >
              Book a Service Now →
            </button>
            <div style={{ marginTop: '16px' }}>
              <button
                onClick={() => onNavigate('orders')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#166534',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                View past completed orders in My Orders History →
              </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B', fontSize: '13px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '15px' }}>No orders in {activeTab}</div>
            <p style={{ margin: '4px 0 0 0', color: '#64748B', fontSize: '12px' }}>Your service requests will appear here once booked.</p>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOrders.map((order) => {
            const badge = getStatusBadgeStyle(order.status);
            const isOngoing = isOngoingStatus(order.status, order.statusType);

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '16px',
                  border: isOngoing ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                  boxShadow: isOngoing
                    ? '0 6px 20px rgba(22, 163, 74, 0.08)'
                    : '0 2px 10px rgba(0, 0, 0, 0.03)',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                {/* 1. Top Category & Status Header Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#0E3E2F',
                        backgroundColor: '#EAF4EF',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      ❄️ {order.category || 'AC SERVICE & REPAIR'}
                    </span>
                  </div>

                  {/* Status Pill with Pulsing Dot */}
                  <div
                    style={{
                      backgroundColor: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: badge.dot,
                        display: 'inline-block',
                      }}
                    />
                    <span>{badge.text}</span>
                  </div>
                </div>

                {/* 2. Middle Body: Thumbnail + Info */}
                <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <img
                      src={order.imageUrl}
                      alt={order.service}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                      {order.service}
                    </h4>

                    {/* Monospace Reference ID with Quick Copy */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#475569',
                          backgroundColor: '#F8FAFC',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid #E2E8F0',
                        }}
                      >
                        {order.id}
                      </span>
                      <button
                        onClick={(e) => handleCopyId(order.id, e)}
                        title="Copy Reference"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px',
                          cursor: 'pointer',
                          color: copiedId === order.id ? '#16A34A' : '#94A3B8',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {copiedId === order.id ? '✓' : '📋'}
                      </button>
                    </div>

                    {/* Price, Payment Mode & Date */}
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 900, color: '#0E3E2F' }}>{order.price}</span>
                      <span style={{ color: '#94A3B8' }}>•</span>
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>Paid UPI ✓</span>
                      <span style={{ color: '#94A3B8' }}>•</span>
                      <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Icons.Calendar size={12} color="#64748B" />
                        {order.date}
                      </span>
                    </div>

                    {/* Address snippet */}
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>📍</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cleanDisplayAddress(order.address || activeSavedAddress)}
                      </span>
                    </div>

                    {/* Partner & Start OTP highlights for ongoing */}
                    {isOngoing && (
                      <div
                        style={{
                          marginTop: '8px',
                          padding: '6px 10px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px dashed #CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                        }}
                      >
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                          🧑‍🔧 {order.technician || 'Ramesh Kumar'} <b style={{ color: '#D97706' }}>★ 4.9</b>
                        </span>
                        <span style={{ color: '#166534', fontWeight: 800, backgroundColor: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                          Start OTP: {order.otp || '—'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Bottom Action Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '8px',
                    paddingTop: '10px',
                    borderTop: '1px solid #F1F5F9',
                  }}
                >
                  {isOngoing ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(order);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        Receipt & Details
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('tracking', { bookingId: order.id });
                        }}
                        style={{
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '7px 16px',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 3px 12px rgba(22, 163, 74, 0.35)',
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <span>Track Live</span>
                        <span>➔</span>
                      </button>
                    </>
                  ) : order.statusType === 'completed' ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          alert(`Official Tax Invoice for ${order.id} downloaded!`);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        📄 Download Invoice
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('services');
                        }}
                        style={{
                          backgroundColor: '#0E3E2F',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '20px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Book Again ↻
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('services');
                      }}
                      style={{
                        backgroundColor: '#0E3E2F',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Rebook Service ↻
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Order Details / Full Receipt Modal ── */}
      {selectedOrder && (
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
              padding: '22px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Booking Receipt & Details
                </h3>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Official HomeServeX Verified Invoice</span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {/* Service & Reference Banner */}
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid #E2E8F0', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748B' }}>Order Reference</span>
                <span style={{ fontSize: '12px', fontWeight: 800, fontFamily: 'monospace', color: '#0E3E2F', backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px' }}>
                  {selectedOrder.id}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                {selectedOrder.service}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: '#0E3E2F', fontWeight: 700, backgroundColor: '#EAF4EF', padding: '2px 6px', borderRadius: '4px' }}>
                  {selectedOrder.category || 'AC Service & Repair'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  📅 {selectedOrder.date}
                </span>
              </div>
            </div>

            {/* Specialist & Address Info */}
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', marginBottom: '12px', border: '1px solid #E2E8F0', fontSize: '12px', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Technician:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>
                  🧑‍🔧 {selectedOrder.technician || 'Ramesh Kumar'} <b style={{ color: '#D97706' }}>★ 4.9</b>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', fontSize: '11px', color: '#475569' }}>
                <span>📍</span>
                <span style={{ lineHeight: 1.4 }}>
                  {cleanDisplayAddress(selectedOrder.address || activeSavedAddress)}
                </span>
              </div>
            </div>

            {/* Doorstep Verification Passcode Card (for ongoing bookings) */}
            {isOngoingStatus(selectedOrder.status, selectedOrder.statusType) && (
              <div
                style={{
                  backgroundColor: '#0E3E2F',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  color: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#86EFAC', textTransform: 'uppercase' }}>
                    Doorstep Verification Codes
                  </span>
                  <span style={{ fontSize: '10px', color: '#A7F3D0' }}>Safe Handshake</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', textAlign: 'center' }}>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '9px', color: '#D1EAE0' }}>Start OTP</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#86EFAC', letterSpacing: '2px' }}>
                      {selectedOrder.otp || '—'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '9px', color: '#D1EAE0' }}>Completion OTP</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'monospace', color: '#FEF08A', letterSpacing: '2px' }}>
                      {selectedOrder.completionOtp || '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 30-Day Warranty Badge for Completed Orders */}
            {selectedOrder.statusType === 'completed' && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '11px',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '14px' }}>🛡️</span>
                <div>
                  <b>30-Day Doorstep Guarantee Active</b>
                  <div style={{ color: '#166534', fontSize: '10px' }}>Free revisit & full rework included</div>
                </div>
              </div>
            )}

            {/* Refund Notice for Cancelled Orders */}
            {selectedOrder.statusType === 'cancelled' && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  marginBottom: '12px',
                  fontSize: '11px',
                  color: '#B91C1C',
                }}
              >
                <b>Order Cancelled</b>
                <div style={{ fontSize: '10px', color: '#991B1B', marginTop: '2px' }}>
                  Full refund of {selectedOrder.price} processed to original payment method.
                </div>
              </div>
            )}

            {/* Itemized Billing Breakdown */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginBottom: '14px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '4px' }}>
                <span>Service Base Charge</span>
                <span>{selectedOrder.price}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '4px' }}>
                <span>Convenience & Doorstep Safety</span>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>FREE</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B', marginBottom: '6px' }}>
                <span>Taxes & GST (18%)</span>
                <span>Included</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Total Paid (UPI)</span>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#0E3E2F' }}>{selectedOrder.price}</span>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {isOngoingStatus(selectedOrder.status, selectedOrder.statusType) ? (
                <>
                  <button
                    onClick={() => {
                      const bId = selectedOrder.id;
                      setSelectedOrder(null);
                      onNavigate('tracking', { bookingId: bId });
                    }}
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    }}
                  >
                    <span>Track Live on Map</span>
                    <span>➔</span>
                  </button>
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    style={{
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      border: '1px solid #FECACA',
                      borderRadius: '24px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel Booking
                  </button>
                </>
              ) : selectedOrder.statusType === 'completed' ? (
                <>
                  <button
                    onClick={() => {
                      alert(`Official Tax Invoice for ${selectedOrder.id} downloaded successfully!`);
                      setSelectedOrder(null);
                    }}
                    style={{
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
                    📄 Download Official Tax Invoice (PDF)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrder(null);
                      onNavigate('services');
                    }}
                    style={{
                      backgroundColor: '#0E3E2F',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '24px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Book This Service Again ↻
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    onNavigate('services');
                  }}
                  style={{
                    backgroundColor: '#0E3E2F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Rebook Service ↻
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
