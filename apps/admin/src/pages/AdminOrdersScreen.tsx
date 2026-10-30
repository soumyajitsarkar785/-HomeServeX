import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface OrderRow {
  id: string;
  rawId?: string;
  orderNumber: string;
  referenceNumber?: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceName: string;
  amount: number | string;
  amountFormatted?: string;
  status: string;
  statusLabel: string;
  statusCode?: string;
  date: string;
  startOtp?: string;
  completionOtp?: string;
  providerName?: string;
  address?: string;
}

interface ProviderOption {
  id: string;
  name: string;
  phone: string;
  category: string;
}

export const AdminOrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const fetchOrders = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/v1/admin/orders?limit=50');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/v1/admin/providers');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setProviders(json.data);
          if (json.data[0]?.id) setSelectedProviderId(json.data[0].id);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchOrders(true);
    fetchProviders();

    // Live auto-polling every 3 seconds to reflect customer orders in real-time
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (selectedStatus !== 'ALL') {
      const s = (order.statusLabel || order.status || '').toLowerCase();
      if (selectedStatus === 'ON_THE_WAY' && !s.includes('on the way') && !s.includes('route')) return false;
      if (selectedStatus === 'COMPLETED' && !s.includes('completed')) return false;
      if (selectedStatus === 'CANCELLED' && !s.includes('cancelled')) return false;
      if (selectedStatus === 'PENDING' && !s.includes('pending') && !s.includes('searching')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        (order.orderNumber && order.orderNumber.toLowerCase().includes(q)) ||
        (order.customerName && order.customerName.toLowerCase().includes(q)) ||
        (order.serviceName && order.serviceName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadgeStyle = (statusLabel: string = '') => {
    const s = statusLabel.toLowerCase();
    if (s.includes('completed')) {
      return { backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
    }
    if (s.includes('way') || s.includes('route') || s.includes('progress')) {
      return { backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' };
    }
    if (s.includes('cancelled')) {
      return { backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' };
    }
    return { backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #BAE6FD' };
  };

  const handleAssignProvider = async () => {
    if (!selectedOrder?.rawId || !selectedProviderId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/v1/admin/bookings/${selectedOrder.rawId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProviderId,
          notes: 'Dispatched manually via Admin Console',
        }),
      });

      if (res.ok) {
        setActionMessage(`Provider assigned successfully to ${selectedOrder.orderNumber}!`);
        setTimeout(() => setActionMessage(''), 3000);
        setSelectedOrder(null);
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data?.error?.message || 'Failed to dispatch provider');
      }
    } catch {
      alert('Error connecting to backend');
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedOrder?.rawId) return;
    if (!confirm(`Are you sure you want to cancel booking ${selectedOrder.orderNumber}?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/bookings/${selectedOrder.rawId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin intervention' }),
      });

      if (res.ok) {
        setActionMessage(`Booking ${selectedOrder.orderNumber} cancelled`);
        setTimeout(() => setActionMessage(''), 3000);
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch {
      alert('Failed to cancel order');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
              Bookings & Order Dispatch
            </h1>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  display: 'inline-block',
                  boxShadow: '0 0 8px #10B981',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#065F46', letterSpacing: '0.4px' }}>
                LIVE SYNC ACTIVE
              </span>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Live booking telemetry, dispatch control, and Dual-OTP verification handshakes
          </div>
        </div>

        {/* Filter Tabs, Search & Manual Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchOrders(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              color: '#0F172A',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Refresh order table"
          >
            <Icons.Refresh size={14} color="#0F172A" />
            <span>Refresh</span>
          </button>

          {/* Status Pills */}
          <div style={{ display: 'flex', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '3px' }}>
            {['ALL', 'PENDING', 'ON_THE_WAY', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9px',
                  border: 'none',
                  backgroundColor: selectedStatus === st ? '#0E3E2F' : 'transparent',
                  color: selectedStatus === st ? '#FFFFFF' : '#64748B',
                  fontSize: '12px',
                  fontWeight: selectedStatus === st ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '0 12px',
              width: '220px',
            }}
          >
            <Icons.Search size={15} color="#94A3B8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference # or client..."
              style={{
                width: '100%',
                padding: '9px 8px',
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
              }}
            />
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            padding: '10px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Orders Data Table */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Booking ID
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Customer
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Service
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Assigned Partner
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Amount
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    Loading live orders from database...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No bookings found matching filter criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, idx) => {
                  const badgeStyle = getStatusBadgeStyle(order.statusLabel || order.status);
                  return (
                    <tr
                      key={order.id || idx}
                      style={{
                        borderBottom: idx < filteredOrders.length - 1 ? '1px solid #F1F5F9' : 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#0E3E2F' }}>
                          {order.orderNumber || order.id}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{order.date}</div>
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                          {order.customerName}
                        </div>
                        {order.customerPhone && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{order.customerPhone}</div>
                        )}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', color: '#475569', fontWeight: 500 }}>
                        {order.serviceName}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: order.providerName === 'Unassigned' ? '#D97706' : '#0F172A',
                          }}
                        >
                          {order.providerName || 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                        ₹{order.amount}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            ...badgeStyle,
                          }}
                        >
                          {order.statusLabel || order.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            color: '#0E3E2F',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Summary Bar */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          <div>
            Showing <strong style={{ color: '#0F172A' }}>{filteredOrders.length}</strong> active booking{filteredOrders.length === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
            ● Real-Time Telemetry Active
          </div>
        </div>
      </div>

      {/* Order Detail & Dispatch Management Modal */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px' }}>
                  Booking Dispatch Control
                </h3>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
                  Reference {selectedOrder.orderNumber} • {selectedOrder.date}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '20px',
                  color: '#94A3B8',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Customer</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                  {selectedOrder.customerName} {selectedOrder.customerPhone ? `(${selectedOrder.customerPhone})` : ''}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Booked Service</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>{selectedOrder.serviceName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Doorstep Address</span>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px', textAlign: 'right', maxWidth: '60%' }}>
                  {selectedOrder.address || 'Doorstep Service, Kolkata'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Booking Total</span>
                <span style={{ fontWeight: 800, color: '#0E3E2F', fontSize: '16px' }}>₹{selectedOrder.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Current Assigned Partner</span>
                <span style={{ fontWeight: 700, color: '#0E3E2F', fontSize: '13px' }}>
                  {selectedOrder.providerName || 'None (Awaiting Dispatch)'}
                </span>
              </div>

              {/* Dual OTP Security Box */}
              <div style={{ backgroundColor: '#EAF4EF', borderRadius: '14px', padding: '14px', marginTop: '6px', border: '1px solid #A7F3D0' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0E3E2F', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                  Dual-OTP Handshake Security (Authoritative)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Start Job OTP</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0E3E2F', letterSpacing: '3px' }}>
                      {selectedOrder.startOtp || '—'}
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Completion OTP</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', letterSpacing: '3px' }}>
                      {selectedOrder.completionOtp || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Dispatch Override */}
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', padding: '14px', marginTop: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Manual Dispatch Provider Override
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={selectedProviderId}
                    onChange={(e) => setSelectedProviderId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category || 'Technician'}) - {p.phone}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignProvider}
                    disabled={assigning}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#0E3E2F',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {assigning ? 'Dispatching...' : 'Dispatch'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleCancelBooking}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid #FECACA',
                  backgroundColor: '#FEE2E2',
                  color: '#B91C1C',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel Booking
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#0E3E2F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
