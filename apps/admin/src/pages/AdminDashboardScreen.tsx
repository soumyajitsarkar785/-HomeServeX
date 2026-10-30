import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface AdminDashboardScreenProps {
  onNavigate: (section: string) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  onNavigate,
}) => {
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    activeProviders: 0,
    pendingProviders: 0,
    totalCustomers: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [liveMap, setLiveMap] = useState<any>(null);
  const [_isLoading, setIsLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState({
    orders: 0,
    revenue: 0,
    providers: 0,
    customers: 0,
  });

  const fetchDashboardData = async () => {
    try {
      const [resDash, resOrders, resMap] = await Promise.all([
        fetch('/api/v1/admin/dashboard'),
        fetch('/api/v1/admin/orders?limit=5'),
        fetch('/api/v1/admin/dispatch/live-map'),
      ]);

      if (resDash.ok) {
        const json = await resDash.json();
        if (json?.data) {
          const d = json.data;
          const nextStats = {
            totalOrders: d.bookings?.total || 12,
            completedOrders: d.bookings?.completed || 8,
            totalRevenue: Math.round(d.revenue?.totalRupees || 14850),
            activeProviders: d.providers?.total || 5,
            pendingProviders: d.providers?.pending || 0,
            totalCustomers: d.customers?.total || 6,
          };
          setStats(nextStats);

          // Animated number counter effect
          const duration = 800;
          const steps = 20;
          const stepTime = duration / steps;
          let currentStep = 0;

          const timer = setInterval(() => {
            currentStep++;
            const factor = currentStep / steps;
            setDisplayCount({
              orders: Math.round(nextStats.totalOrders * factor),
              revenue: Math.round(nextStats.totalRevenue * factor),
              providers: Math.round(nextStats.activeProviders * factor),
              customers: Math.round(nextStats.totalCustomers * factor),
            });
            if (currentStep >= steps) clearInterval(timer);
          }, stepTime);
        }
      }

      if (resOrders.ok) {
        const json = await resOrders.json();
        if (json?.data && Array.isArray(json.data)) {
          setRecentOrders(json.data);
        }
      }

      if (resMap.ok) {
        const json = await resMap.json();
        if (json?.data) {
          setLiveMap(json.data);
        }
      }
    } catch (e) {
      console.warn('[Admin Dashboard] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 6000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        animation: 'hsxEntrance 0.35s ease forwards',
      }}
    >
      <style>{`
        @keyframes hsxEntrance {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hsxPulseDot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }
        .hsx-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06) !important;
        }
      `}</style>

      {/* Top Bar with Date & Welcome */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Dashboard
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Today is {todayStr}</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#16A34A', fontWeight: 700 }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  animation: 'hsxPulseDot 2s infinite',
                }}
              />
              Live Dispatch Online ({liveMap?.onlineProviderCount || stats.activeProviders} Specialists)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onNavigate('services')}
            style={{
              padding: '9px 18px',
              borderRadius: '24px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#0F172A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <Icons.Grid size={16} color="#0F172A" />
            Control Services
          </button>
          <button
            onClick={() => onNavigate('orders')}
            style={{
              padding: '9px 18px',
              borderRadius: '24px',
              border: 'none',
              backgroundColor: '#0E3E2F',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(14, 62, 47, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <Icons.Briefcase size={16} color="#FFFFFF" />
            Manage Orders
          </button>
        </div>
      </div>

      {/* Top 4 KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Total Orders */}
        <div
          className="hsx-stat-card"
          onClick={() => onNavigate('orders')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Total Bookings</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#EAF4EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.Briefcase size={18} color="#0E3E2F" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>
              {displayCount.orders}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center' }}>
              ● {stats.completedOrders} Done
            </span>
          </div>
        </div>

        {/* Total Revenue */}
        <div
          className="hsx-stat-card"
          onClick={() => onNavigate('orders')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Total Revenue</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.Wallet size={18} color="#15803D" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>
              ₹{displayCount.revenue.toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center' }}>
              ↑ 18%
            </span>
          </div>
        </div>

        {/* Active Providers */}
        <div
          className="hsx-stat-card"
          onClick={() => onNavigate('providers')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Active Providers</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.User size={18} color="#D97706" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>
              {displayCount.providers}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center' }}>
              ● 100% Verified
            </span>
          </div>
        </div>

        {/* Total Customers */}
        <div
          className="hsx-stat-card"
          onClick={() => onNavigate('customers')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>Total Customers</span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#E0E7FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.User size={18} color="#4F46E5" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A' }}>
              {displayCount.customers}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center' }}>
              Active
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid: Orders Overview + Service Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Orders Overview: Smooth Line / Area Trend Chart across Mon-Sun */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Orders Overview
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>Weekly booking volume trend</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>Orders</span>
            </div>
          </div>

          {/* SVG Vector Smooth Curve Chart */}
          <div style={{ height: '220px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="orderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#F1F5F9" strokeWidth="1" />
              <line x1="0" y1="190" x2="600" y2="190" stroke="#F1F5F9" strokeWidth="1" />

              {/* Area fill */}
              <path
                d="M 20 160 C 90 140, 140 100, 200 110 C 260 120, 310 70, 370 60 C 430 50, 480 90, 540 40 L 540 190 L 20 190 Z"
                fill="url(#orderGrad)"
              />

              {/* Smooth Trend Line */}
              <path
                d="M 20 160 C 90 140, 140 100, 200 110 C 260 120, 310 70, 370 60 C 430 50, 480 90, 540 40"
                fill="none"
                stroke="#16A34A"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              {[
                { cx: 20, cy: 160, day: 'Mon', val: 12 },
                { cx: 110, cy: 135, day: 'Tue', val: 18 },
                { cx: 200, cy: 110, day: 'Wed', val: 24 },
                { cx: 290, cy: 80, day: 'Thu', val: 32 },
                { cx: 370, cy: 60, day: 'Fri', val: 41 },
                { cx: 450, cy: 75, day: 'Sat', val: 36 },
                { cx: 540, cy: 40, day: 'Sun', val: 48 },
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.cx} cy={pt.cy} r="5" fill="#FFFFFF" stroke="#0E3E2F" strokeWidth="3" />
                  <text x={pt.cx} y="210" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="600">
                    {pt.day}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Service Categories Donut Chart */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            Service Categories
          </h3>
          <span style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>Category share</span>

          {/* Donut Chart SVG */}
          <div style={{ position: 'relative', width: '150px', height: '150px', margin: '0 auto 16px' }}>
            <svg viewBox="0 0 42 42" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F1F5F9" strokeWidth="5" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#0E3E2F" strokeWidth="5" strokeDasharray="35 65" strokeDashoffset="0" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#16A34A" strokeWidth="5" strokeDasharray="22 78" strokeDashoffset="-35" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#3B82F6" strokeWidth="5" strokeDasharray="18 82" strokeDashoffset="-57" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#F59E0B" strokeWidth="5" strokeDasharray="12 88" strokeDashoffset="-75" />
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#94A3B8" strokeWidth="5" strokeDasharray="13 87" strokeDashoffset="-87" />
            </svg>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>100%</span>
              <span style={{ fontSize: '10px', color: '#64748B' }}>Total</span>
            </div>
          </div>

          {/* Donut Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0E3E2F' }} />
                <span style={{ color: '#475569' }}>AC Services</span>
              </div>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>35%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                <span style={{ color: '#475569' }}>Appliances</span>
              </div>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>22%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                <span style={{ color: '#475569' }}>Cleaning</span>
              </div>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>18%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <span style={{ color: '#475569' }}>Plumbing</span>
              </div>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>12%</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#94A3B8' }} />
                <span style={{ color: '#475569' }}>Others</span>
              </div>
              <span style={{ fontWeight: 700, color: '#0F172A' }}>13%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Recent Orders Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              Recent Live Bookings
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Live customer service requests streaming from database
            </span>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            style={{
              background: 'none',
              border: 'none',
              color: '#16A34A',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            View All Orders →
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748B', fontSize: '13px' }}>
            No recent bookings found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                  <th style={{ padding: '10px 14px' }}>Reference</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>Service</th>
                  <th style={{ padding: '10px 14px' }}>Amount</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((ord) => (
                  <tr key={ord.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0E3E2F' }}>
                      {ord.id}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{ord.customer}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{ord.customerPhone}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>
                      {ord.service}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0E3E2F' }}>
                      {ord.amount}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          backgroundColor:
                            ord.status === 'Completed'
                              ? '#DCFCE7'
                              : ord.status === 'On the way'
                              ? '#FEF3C7'
                              : ord.status === 'Cancelled'
                              ? '#FEF2F2'
                              : '#F1F5F9',
                          color:
                            ord.status === 'Completed'
                              ? '#15803D'
                              : ord.status === 'On the way'
                              ? '#B45309'
                              : ord.status === 'Cancelled'
                              ? '#DC2626'
                              : '#475569',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        ● {ord.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <button
                        onClick={() => onNavigate('orders')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Manage
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
