import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

export const AdminCustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'ACTIVE' | 'SUSPENDED'>('All');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/admin/customers');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setCustomers(json.data);
        }
      }
    } catch (e) {
      console.warn('[Admin Customers] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggleStatus = async (customer: any) => {
    const nextStatus = customer.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg =
      nextStatus === 'SUSPENDED'
        ? `Are you sure you want to suspend customer "${customer.name}"? They will not be able to book services.`
        : `Re-activate customer "${customer.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    setIsUpdatingStatus(customer.id);
    try {
      const res = await fetch(`/api/v1/admin/customers/${customer.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === customer.id ? { ...c, status: nextStatus } : c))
        );
      } else {
        alert('Failed to update customer status.');
      }
    } catch {
      alert('Network error while updating customer status.');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const filtered = customers.filter((c) => {
    const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.totalSpendRupees || 0), 0);
  const totalBookingsAll = customers.reduce((sum, c) => sum + (c.totalBookings || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Customers Directory
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Authoritative registry of registered customers, lifetime spends, and doorstep service requests
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchCustomers}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>↻ Refresh</span>
          </button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Total Registered Customers</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0F172A' }}>{customers.length}</div>
          <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 700 }}>
            ● {customers.filter((c) => c.status === 'ACTIVE').length} Active
          </div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Total Customer Bookings</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#0E3E2F' }}>{totalBookingsAll}</div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Across all service categories</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px 20px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '8px' }}>Total Customer Spend</div>
          <div style={{ fontSize: '26px', fontWeight: 900, color: '#16A34A' }}>₹{totalSpentAll.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Completed services revenue</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['All', 'ACTIVE', 'SUSPENDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === tab ? '1.5px solid #0E3E2F' : '1px solid #CBD5E1',
                backgroundColor: statusFilter === tab ? '#0E3E2F' : '#FFFFFF',
                color: statusFilter === tab ? '#FFFFFF' : '#475569',
              }}
            >
              {tab === 'All' ? 'All Customers' : tab === 'ACTIVE' ? 'Active Only' : 'Suspended'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '260px' }}>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: '20px',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              outline: 'none',
            }}
          />
          <div style={{ position: 'absolute', left: '10px', top: '8px', color: '#94A3B8' }}>
            <Icons.Search size={14} color="#94A3B8" />
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Loading customer accounts from database...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>No customers found</div>
            <p style={{ fontSize: '12px', margin: '4px 0 0' }}>Try adjusting your search query.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Customer</th>
                  <th style={{ padding: '12px 16px' }}>Contact</th>
                  <th style={{ padding: '12px 16px' }}>Doorstep Address</th>
                  <th style={{ padding: '12px 16px' }}>Bookings</th>
                  <th style={{ padding: '12px 16px' }}>Lifetime Spend</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#EAF4EF',
                            color: '#0E3E2F',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px',
                            flexShrink: 0,
                          }}
                        >
                          {c.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{c.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Joined {new Date(c.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#0F172A', fontWeight: 600 }}>{c.phone}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{c.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', maxWidth: '240px' }}>
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        📍 {c.address}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{c.totalBookings} orders</div>
                      <div style={{ fontSize: '11px', color: '#16A34A' }}>{c.completedBookings} completed</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 800, color: '#0E3E2F' }}>
                        ₹{(c.totalSpendRupees || 0).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: c.status === 'ACTIVE' ? '#DCFCE7' : '#FEF2F2',
                          color: c.status === 'ACTIVE' ? '#15803D' : '#DC2626',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        ● {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        disabled={isUpdatingStatus === c.id}
                        onClick={() => handleToggleStatus(c)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: c.status === 'ACTIVE' ? '1px solid #FECACA' : '1px solid #86EFAC',
                          backgroundColor: c.status === 'ACTIVE' ? '#FEF2F2' : '#F0FDF4',
                          color: c.status === 'ACTIVE' ? '#DC2626' : '#15803D',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {isUpdatingStatus === c.id ? 'Updating...' : c.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
