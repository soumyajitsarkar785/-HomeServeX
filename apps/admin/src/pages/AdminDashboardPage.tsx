import React, { useEffect, useState } from 'react';
import { Button, Card, Badge, Spinner, Modal, Input } from '@homeservex/ui';
import { useAdminAuth } from '../app/auth-context.js';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

interface DashboardStats {
  customers: { total: number };
  providers: { total: number; pending: number };
  bookings: { total: number; completed: number; cancelled: number };
  revenue: { totalRupees: number; commissionRupees: number };
}

interface PendingProvider {
  id: string;
  verificationStatus: string;
  skills: string;
  user: { id: string; name: string; email: string; phone: string; createdAt: string };
  documents?: Array<{ id: string; type: string; url: string }>;
}

interface BookingRow {
  id: string;
  referenceNumber: string;
  status: string;
  totalAmountPaise: number;
  service?: { name: string; category?: { name: string } };
  address?: { streetAddress: string; city: string; landmark?: string };
  scheduledSlot: string;
  assignedProviderId?: string | null;
  notes?: string;
  createdAt?: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'CUSTOMER' | 'PROVIDER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string | null;
  imageUrl?: string | null;
  servicesCount?: number;
  isActive: boolean;
  displayOrder: number;
}

interface ServiceRow {
  id: string;
  name: string;
  slug: string;
  categoryId?: string;
  category?: { id?: string; name: string };
  description?: string;
  basePricePaise: number;
  estimatedDurationMinutes: number;
  imageUrl?: string | null;
  isActive: boolean;
}

interface MarketingBanner {
  id: string;
  badge: string;
  title: string;
  highlightTitle?: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaTarget: string;
  discountBadge?: string;
  isActive: boolean;
  displayOrder: number;
}

const STATUS_VARIANTS: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  PENDING: 'warning',
  SEARCHING_PROVIDER: 'warning',
  ASSIGNED: 'primary',
  PROVIDER_EN_ROUTE: 'warning',
  ARRIVED: 'primary',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const NAV_ITEMS = ['Overview', 'Dispatch Radar', 'Bookings', 'Provider Approvals', 'Users', 'Services & Catalog', 'Banners & Marketing'] as const;
type NavItem = typeof NAV_ITEMS[number];

export const AdminDashboardPage: React.FC = () => {
  const { user, accessToken, logout } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<NavItem>('Overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingProviders, setPendingProviders] = useState<PendingProvider[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [banners, setBanners] = useState<MarketingBanner[]>([]);
  const [liveDispatch, setLiveDispatch] = useState<{
    onlineProviderCount: number;
    activeBookingCount: number;
    onlineProviders: Array<{
      providerId: string;
      name: string;
      phone: string;
      rating: number;
      skills: string[];
      latitude: number;
      longitude: number;
      lastPingAt: string;
      isAvailable: boolean;
    }>;
    activeBookings: Array<{
      id: string;
      referenceNumber: string;
      status: string;
      serviceName: string;
      categoryName?: string;
      address: string;
      city: string;
      latitude: number;
      longitude: number;
      totalAmountRupees: number;
    }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Modal states
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  
  // Category Modal
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '', iconUrl: '', imageUrl: '' });

  // Service Modal
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [newService, setNewService] = useState({
    categoryId: '',
    name: '',
    slug: '',
    description: '',
    basePriceRupees: 699,
    estimatedDurationMinutes: 60,
    imageUrl: '',
  });

  // Hero Banner Modal
  const [isAddBannerOpen, setIsAddBannerOpen] = useState(false);
  const [newBanner, setNewBanner] = useState({
    badge: '⚡ FESTIVE EXCLUSIVE',
    title: 'Professional Home Repairs, Guaranteed',
    highlightTitle: 'Delivered at your doorstep.',
    subtitle: 'Expert verified technicians in 30 minutes with upfront transparent pricing.',
    imageUrl: '',
    ctaText: 'Book Service',
    ctaTarget: '#recommended-section',
    discountBadge: 'Flat ₹150 OFF',
  });

  const [actionLoading, setActionLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = () => {
    if (!accessToken) return;
    setIsLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/v1/admin/dashboard`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/admin/providers/pending`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/admin/bookings?limit=50`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/admin/users?limit=50`, { headers: authHeaders }).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/services/categories`).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/services`).then(r => r.json()),
      fetch(`${API_BASE}/api/v1/admin/dispatch/live-map`, { headers: authHeaders }).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/api/v1/admin/banners`, { headers: authHeaders }).then(r => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([dashRes, provRes, bookRes, usersRes, catRes, srvRes, liveRes, banRes]) => {
        if (dashRes?.data) setStats(dashRes.data);
        if (provRes?.data) setPendingProviders(provRes.data);
        if (bookRes?.data) setBookings(bookRes.data);
        if (usersRes?.data) setUsers(usersRes.data);
        if (catRes?.data) setCategories(catRes.data);
        if (srvRes?.data) setServices(srvRes.data);
        if (liveRes?.data) setLiveDispatch(liveRes.data);
        if (banRes?.data) setBanners(banRes.data);
      })
      .catch(err => console.error('Admin data fetch error:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  // Upload photo file via Base64 to backend
  const uploadPhotoFile = async (file: File, folder = 'services'): Promise<string | null> => {
    setUploadLoading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${API_BASE}/api/v1/admin/upload`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ imageBase64: base64, filename: file.name, folder }),
      });
      const data = await res.json();
      if (res.ok && data.data?.url) {
        showToast('Photo uploaded successfully!');
        return data.data.url;
      } else {
        alert(data.error?.message || 'Failed to upload photo');
        return null;
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Photo upload failed. Please try again.');
      return null;
    } finally {
      setUploadLoading(false);
    }
  };

  const verifyProvider = async (providerId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/providers/${providerId}/verify`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status,
          notes: status === 'REJECTED' ? 'Verification criteria not satisfied' : 'Approved by HomeServeX Operations',
        }),
      });
      if (res.ok) {
        setPendingProviders(prev => prev.filter(p => p.id !== providerId));
        if (stats) {
          setStats({
            ...stats,
            providers: { ...stats.providers, pending: Math.max(0, stats.providers.pending - 1) },
          });
        }
        showToast(`Partner application ${status === 'APPROVED' ? 'Approved' : 'Rejected'}.`);
      }
    } catch (err) {
      console.error('Verify failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    setActionLoading(true);
    const action = currentStatus === 'ACTIVE' ? 'suspend' : 'activate';
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/users/${userId}/${action}`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      if (res.ok) {
        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, status: currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u))
        );
        showToast(`User ${action}d successfully.`);
      }
    } catch (err) {
      console.error(`User ${action} failed:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.name) return;
    setActionLoading(true);
    try {
      const slug = newCategory.slug || newCategory.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch(`${API_BASE}/api/v1/services/categories`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: newCategory.name,
          slug,
          description: newCategory.description,
          iconUrl: newCategory.iconUrl || '🔧',
          imageUrl: newCategory.imageUrl || null,
          displayOrder: categories.length + 1,
          isActive: true,
        }),
      });
      if (res.ok) {
        setIsAddCategoryOpen(false);
        setNewCategory({ name: '', slug: '', description: '', iconUrl: '', imageUrl: '' });
        showToast('New category added successfully!');
        loadData();
      }
    } catch (err) {
      console.error('Create category failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/categories/${catId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== catId));
        showToast('Category removed.');
      }
    } catch (err) {
      console.error('Delete category failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name || !newService.categoryId) {
      alert('Please select a category and enter a service name.');
      return;
    }
    setActionLoading(true);
    try {
      const slug = newService.slug || newService.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res = await fetch(`${API_BASE}/api/v1/services`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          categoryId: newService.categoryId,
          name: newService.name,
          slug,
          description: newService.description || `${newService.name} delivered by verified technicians.`,
          basePricePaise: Math.round(newService.basePriceRupees * 100),
          estimatedDurationMinutes: Number(newService.estimatedDurationMinutes) || 60,
          imageUrl: newService.imageUrl || null,
          isActive: true,
        }),
      });
      if (res.ok) {
        setIsAddServiceOpen(false);
        setNewService({ categoryId: '', name: '', slug: '', description: '', basePriceRupees: 699, estimatedDurationMinutes: 60, imageUrl: '' });
        showToast('Service added to live catalog successfully!');
        loadData();
      } else {
        const err = await res.json();
        alert(err.error?.message || 'Failed to add service');
      }
    } catch (err) {
      console.error('Create service error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/services/${serviceId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setServices(prev => prev.filter(s => s.id !== serviceId));
        showToast('Service removed from catalog.');
      }
    } catch (err) {
      console.error('Delete service error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/services/${serviceId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setServices(prev => prev.map(s => s.id === serviceId ? { ...s, isActive: !currentStatus } : s));
        showToast(`Service status updated to ${!currentStatus ? 'Active' : 'Inactive'}.`);
      }
    } catch (err) {
      console.error('Toggle service status error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanner.title || !newBanner.imageUrl) {
      alert('Please enter a banner title and upload/provide a banner image.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/banners`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(newBanner),
      });
      if (res.ok) {
        setIsAddBannerOpen(false);
        setNewBanner({
          badge: '⚡ FESTIVE EXCLUSIVE',
          title: 'Professional Home Repairs, Guaranteed',
          highlightTitle: 'Delivered at your doorstep.',
          subtitle: 'Expert verified technicians in 30 minutes with upfront transparent pricing.',
          imageUrl: '',
          ctaText: 'Book Service',
          ctaTarget: '#recommended-section',
          discountBadge: 'Flat ₹150 OFF',
        });
        showToast('Hero banner published to Customer App!');
        loadData();
      }
    } catch (err) {
      console.error('Create banner error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/banners/${bannerId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setBanners(prev => prev.filter(b => b.id !== bannerId));
        showToast('Promotional banner deleted.');
      }
    } catch (err) {
      console.error('Delete banner error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBannerStatus = async (bannerId: string, currentStatus: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/banners/${bannerId}`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setBanners(prev => prev.map(b => b.id === bannerId ? { ...b, isActive: !currentStatus } : b));
        showToast(`Banner status updated to ${!currentStatus ? 'Active' : 'Inactive'}.`);
      }
    } catch (err) {
      console.error('Toggle banner status error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
    const matchesSearch =
      bookingSearch === '' ||
      b.referenceNumber.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.service?.name.toLowerCase().includes(bookingSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filteredUsers = users.filter(u => {
    if (userRoleFilter === 'ALL') return true;
    return u.role === userRoleFilter;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F7F9F7', fontFamily: 'Inter, sans-serif' }}>
      {/* ── SIDEBAR ── */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#111D17', // Deep forest night
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          boxShadow: '2px 0 16px rgba(0,0,0,0.1)',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px', marginBottom: '32px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              backgroundColor: '#145C43',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: 900,
              fontSize: '18px',
              border: '1px solid #16865D',
            }}
          >
            H
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F7F9F7', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              HomeServe<span style={{ color: '#16865D' }}>X</span>
            </div>
            <div style={{ fontSize: '11px', color: '#8BA196', fontWeight: 600, letterSpacing: '0.5px' }}>
              ADMINISTRATION
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeSection === item;
            return (
              <button
                key={item}
                id={`admin-nav-${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setActiveSection(item)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#145C43' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#8BA196',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
              >
                <span>
                  {item === 'Overview' && '📊 '}
                  {item === 'Dispatch Radar' && '📡 '}
                  {item === 'Bookings' && '📋 '}
                  {item === 'Provider Approvals' && '🛡 '}
                  {item === 'Users' && '👥 '}
                  {item === 'Services & Catalog' && '🔧 '}
                  {item === 'Banners & Marketing' && '🎨 '}
                  {item}
                </span>

                {item === 'Provider Approvals' && pendingProviders.length > 0 && (
                  <span
                    style={{
                      backgroundColor: '#D99118',
                      color: '#111D17',
                      borderRadius: '10px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}
                  >
                    {pendingProviders.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Admin Footer & Logout */}
        <div style={{ borderTop: '1px solid #1E3328', paddingTop: '16px' }}>
          <div style={{ padding: '0 8px 12px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F7F9F7' }}>{user?.name || 'Administrator'}</div>
            <div style={{ fontSize: '11px', color: '#8BA196' }}>{user?.email}</div>
          </div>
          <button
            onClick={logout}
            id="admin-logout"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #284439',
              backgroundColor: 'transparent',
              color: '#8BA196',
              fontWeight: 600,
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Log Out of Console
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
        <header
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E4EAE5',
            padding: '0 32px',
            height: '68px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#17211C', margin: 0, letterSpacing: '-0.3px' }}>
              {activeSection}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#145C43', backgroundColor: '#EAF6EF', padding: '6px 14px', borderRadius: '20px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16865D' }} />
              API Connected · Live Data
            </div>
            <button
              onClick={loadData}
              style={{
                border: '1px solid #E4EAE5',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#6B756F',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </header>

        {/* Section Body */}
        <div style={{ padding: '32px', flex: 1 }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '80px' }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              {/* ── 1. OVERVIEW ── */}
              {activeSection === 'Overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {/* KPI Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    {[
                      { label: 'Registered Customers', value: stats?.customers.total ?? 0, sub: 'Active accounts', color: '#17211C' },
                      { label: 'Service Providers', value: stats?.providers.total ?? 0, sub: `${stats?.providers.pending ?? 0} pending approval`, color: '#145C43' },
                      { label: 'Total Bookings', value: stats?.bookings.total ?? 0, sub: `${stats?.bookings.completed ?? 0} completed · ${stats?.bookings.cancelled ?? 0} cancelled`, color: '#16865D' },
                      { label: 'Marketplace Volume', value: `₹${(stats?.revenue.totalRupees ?? 0).toLocaleString('en-IN')}`, sub: `₹${(stats?.revenue.commissionRupees ?? 0).toLocaleString('en-IN')} net commission`, color: '#145C43' },
                    ].map((kpi, i) => (
                      <Card key={i} style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E4EAE5' }}>
                        <div style={{ fontSize: '12px', color: '#6B756F', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          {kpi.label}
                        </div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: kpi.color, letterSpacing: '-0.5px' }}>
                          {kpi.value}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B756F', marginTop: '6px' }}>
                          {kpi.sub}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Pending Verifications Alert */}
                  {pendingProviders.length > 0 && (
                    <Card style={{ padding: '20px', backgroundColor: '#FEF9EF', border: '1px solid #F6D695', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🛡</span>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#976107' }}>
                            {pendingProviders.length} Service Partner Application(s) Awaiting Verification
                          </div>
                          <div style={{ fontSize: '13px', color: '#B47814' }}>
                            Review submitted documentation and authorize eligible partners to receive bookings.
                          </div>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => setActiveSection('Provider Approvals')}>
                        Review Applications →
                      </Button>
                    </Card>
                  )}

                  {/* Recent Bookings Table */}
                  <Card style={{ padding: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #E4EAE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#17211C', margin: 0 }}>Recent Marketplace Bookings</h3>
                      <button
                        onClick={() => setActiveSection('Bookings')}
                        style={{ color: '#145C43', fontSize: '13px', fontWeight: 700, border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                      >
                        Open Full Bookings Console →
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F7F9F7', borderBottom: '1px solid #E4EAE5' }}>
                            {['Reference', 'Service', 'Scheduled Slot', 'Amount', 'Status'].map(h => (
                              <th key={h} style={{ padding: '12px 18px', fontWeight: 700, color: '#6B756F', textAlign: 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.slice(0, 6).map(b => (
                            <tr key={b.id} style={{ borderBottom: '1px solid #F1F3F1' }}>
                              <td style={{ padding: '14px 18px', fontWeight: 700, color: '#145C43' }}>{b.referenceNumber}</td>
                              <td style={{ padding: '14px 18px', fontWeight: 600 }}>{b.service?.name || '—'}</td>
                              <td style={{ padding: '14px 18px', color: '#6B756F' }}>
                                {new Date(b.scheduledSlot).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ padding: '14px 18px', fontWeight: 700 }}>₹{(b.totalAmountPaise / 100).toFixed(0)}</td>
                              <td style={{ padding: '14px 18px' }}>
                                <Badge variant={STATUS_VARIANTS[b.status] || 'neutral'}>{b.status.replace(/_/g, ' ')}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── DISPATCH RADAR: REAL-TIME GEOLOCATION MONITORING ── */}
              {activeSection === 'Dispatch Radar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Radar KPI Header */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                    <Card style={{ padding: '20px', borderRadius: '14px', border: '1px solid #D1EADE', backgroundColor: '#EAF6EF' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#16865D', textTransform: 'uppercase' }}>
                        Online Technicians (Pinging)
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#145C43', marginTop: '6px' }}>
                        {liveDispatch?.onlineProviderCount ?? 1}
                      </div>
                      <div style={{ fontSize: '12px', color: '#16865D', marginTop: '4px' }}>
                        High-frequency GPS (60s TTL)
                      </div>
                    </Card>

                    <Card style={{ padding: '20px', borderRadius: '14px', border: '1px solid #FED7AA', backgroundColor: '#FFF7ED' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#C2410C', textTransform: 'uppercase' }}>
                        Unassigned / Searching Bookings
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#9A3412', marginTop: '6px' }}>
                        {liveDispatch?.activeBookingCount ?? 0}
                      </div>
                      <div style={{ fontSize: '12px', color: '#EA580C', marginTop: '4px' }}>
                        Sequential 25s offer queue
                      </div>
                    </Card>

                    <Card style={{ padding: '20px', borderRadius: '14px', border: '1px solid #BAE6FD', backgroundColor: '#F0F9FF' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0369A1', textTransform: 'uppercase' }}>
                        Spatial Expansion Staging
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: '#0C4A6E', marginTop: '6px' }}>
                        3km ➔ 6km ➔ 10km
                      </div>
                      <div style={{ fontSize: '12px', color: '#0284C7', marginTop: '4px' }}>
                        Max capped radius 15km
                      </div>
                    </Card>
                  </div>

                  {/* Active Online Providers Telemetry Table */}
                  <Card style={{ padding: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4EAE5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                          Live Provider Telemetry Stream
                        </h3>
                        <p style={{ fontSize: '12px', color: '#6B756F', margin: '4px 0 0 0' }}>
                          Updated via high-frequency GPS pinging every 4–10 seconds. Inactive signals prune automatically after 60s.
                        </p>
                      </div>
                      <button
                        onClick={loadData}
                        style={{ backgroundColor: '#145C43', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '12.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ⚡ Refresh Radar
                      </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F7F9F7', borderBottom: '1px solid #E4EAE5' }}>
                            {['Technician Name', 'Contact', 'Rating', 'Latitude', 'Longitude', 'Availability', 'Last GPS Ping'].map(h => (
                              <th key={h} style={{ padding: '12px 18px', fontWeight: 700, color: '#6B756F', textAlign: 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(liveDispatch?.onlineProviders && liveDispatch.onlineProviders.length > 0) ? (
                            liveDispatch.onlineProviders.map(p => (
                              <tr key={p.providerId} style={{ borderBottom: '1px solid #F1F3F1' }}>
                                <td style={{ padding: '12px 18px', fontWeight: 700, color: '#17211C' }}>{p.name}</td>
                                <td style={{ padding: '12px 18px', color: '#6B756F' }}>{p.phone}</td>
                                <td style={{ padding: '12px 18px', fontWeight: 700, color: '#D97706' }}>★ {p.rating}</td>
                                <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#0369A1' }}>{p.latitude.toFixed(6)}</td>
                                <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#0369A1' }}>{p.longitude.toFixed(6)}</td>
                                <td style={{ padding: '12px 18px' }}>
                                  <Badge variant={p.isAvailable ? 'success' : 'warning'}>
                                    {p.isAvailable ? 'AVAILABLE FOR JOBS' : 'ON ACTIVE JOB'}
                                  </Badge>
                                </td>
                                <td style={{ padding: '12px 18px', color: '#16865D', fontWeight: 600 }}>
                                  {new Date(p.lastPingAt).toLocaleTimeString('en-IN')}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6B756F' }}>
                                No partners currently broadcasting GPS telemetry. Online partners will appear here in real-time.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Active Geospatial Dispatch Requests */}
                  <Card style={{ padding: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #E4EAE5' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                        Active Dispatch Requests in Queue
                      </h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F7F9F7', borderBottom: '1px solid #E4EAE5' }}>
                            {['Ref Code', 'Service', 'Category', 'Customer Area', 'Fare', 'Dispatch Status'].map(h => (
                              <th key={h} style={{ padding: '12px 18px', fontWeight: 700, color: '#6B756F', textAlign: 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(liveDispatch?.activeBookings && liveDispatch.activeBookings.length > 0) ? (
                            liveDispatch.activeBookings.map(b => (
                              <tr key={b.id} style={{ borderBottom: '1px solid #F1F3F1' }}>
                                <td style={{ padding: '12px 18px', fontWeight: 700, color: '#145C43' }}>{b.referenceNumber}</td>
                                <td style={{ padding: '12px 18px', fontWeight: 600 }}>{b.serviceName}</td>
                                <td style={{ padding: '12px 18px', color: '#6B756F' }}>{b.categoryName || 'Home Service'}</td>
                                <td style={{ padding: '12px 18px' }}>{b.address}, {b.city}</td>
                                <td style={{ padding: '12px 18px', fontWeight: 700 }}>₹{b.totalAmountRupees.toFixed(0)}</td>
                                <td style={{ padding: '12px 18px' }}>
                                  <Badge variant={STATUS_VARIANTS[b.status] || 'warning'}>{b.status}</Badge>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#6B756F' }}>
                                No pending requests awaiting provider matching.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── 2. BOOKINGS MANAGEMENT ── */}
              {activeSection === 'Bookings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Search and Status Filters */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
                      <input
                        type="text"
                        placeholder="Search by Reference # or Service name..."
                        value={bookingSearch}
                        onChange={e => setBookingSearch(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: '240px',
                          padding: '10px 14px',
                          fontSize: '13.5px',
                          borderRadius: '8px',
                          border: '1px solid #E4EAE5',
                          outline: 'none',
                        }}
                      />
                      <select
                        value={bookingStatusFilter}
                        onChange={e => setBookingStatusFilter(e.target.value)}
                        style={{
                          padding: '10px 14px',
                          fontSize: '13.5px',
                          borderRadius: '8px',
                          border: '1px solid #E4EAE5',
                          backgroundColor: '#FFFFFF',
                          outline: 'none',
                        }}
                      >
                        <option value="ALL">All Statuses ({bookings.length})</option>
                        <option value="PENDING">PENDING</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="PROVIDER_EN_ROUTE">PROVIDER_EN_ROUTE</option>
                        <option value="ARRIVED">ARRIVED</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div style={{ fontSize: '13px', color: '#6B756F' }}>
                      Showing {filteredBookings.length} of {bookings.length} bookings
                    </div>
                  </div>

                  {/* Bookings Table */}
                  <Card style={{ padding: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F7F9F7', borderBottom: '1px solid #E4EAE5' }}>
                            {['Ref Code', 'Service Details', 'Customer Address', 'Scheduled Slot', 'Total Amount', 'Status', 'Action'].map(h => (
                              <th key={h} style={{ padding: '14px 18px', fontWeight: 700, color: '#6B756F', textAlign: 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredBookings.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#6B756F' }}>
                                No bookings match the filter criteria.
                              </td>
                            </tr>
                          ) : (
                            filteredBookings.map(b => (
                              <tr key={b.id} style={{ borderBottom: '1px solid #F1F3F1' }}>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#145C43' }}>
                                  {b.referenceNumber}
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <div style={{ fontWeight: 600 }}>{b.service?.name || 'Service'}</div>
                                  <div style={{ fontSize: '11.5px', color: '#6B756F' }}>{b.service?.category?.name}</div>
                                </td>
                                <td style={{ padding: '14px 18px', color: '#6B756F', maxWidth: '200px' }}>
                                  {typeof b.address === 'string' ? b.address : (b.address ? `${b.address.streetAddress}, ${b.address.city}` : '—')}
                                </td>
                                <td style={{ padding: '14px 18px', color: '#6B756F' }}>
                                  {new Date(b.scheduledSlot).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </td>
                                <td style={{ padding: '14px 18px', fontWeight: 700 }}>
                                  ₹{(b.totalAmountPaise / 100).toFixed(0)}
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <Badge variant={STATUS_VARIANTS[b.status] || 'neutral'}>
                                    {b.status.replace(/_/g, ' ')}
                                  </Badge>
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <button
                                    onClick={() => setSelectedBooking(b)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #E4EAE5',
                                      backgroundColor: '#FFFFFF',
                                      color: '#145C43',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Inspect
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── 3. PROVIDER APPROVALS ── */}
              {activeSection === 'Provider Approvals' && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                      Pending Service Provider Verifications ({pendingProviders.length})
                    </h2>
                    <p style={{ fontSize: '13px', color: '#6B756F', marginTop: '4px' }}>
                      Review background profiles, trades, and credentials of applied technicians before admitting them to the marketplace.
                    </p>
                  </div>

                  {pendingProviders.length === 0 ? (
                    <Card style={{ padding: '60px 24px', textAlign: 'center', borderRadius: '16px' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
                      <div style={{ fontWeight: 800, color: '#17211C', fontSize: '18px', marginBottom: '6px' }}>
                        All Provider Applications Reviewed
                      </div>
                      <div style={{ color: '#6B756F', fontSize: '14px' }}>
                        There are currently no provider applications awaiting approval.
                      </div>
                    </Card>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {pendingProviders.map(provider => {
                        let parsedSkills: string[] = [];
                        try {
                          parsedSkills = JSON.parse(provider.skills);
                        } catch {
                          parsedSkills = [provider.skills];
                        }

                        return (
                          <Card
                            key={provider.id}
                            style={{
                              padding: '24px',
                              borderRadius: '16px',
                              border: '1px solid #E4EAE5',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                              gap: '16px',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: '280px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 800, fontSize: '18px', color: '#17211C' }}>
                                  {provider.user.name}
                                </span>
                                <Badge variant="warning">PENDING VERIFICATION</Badge>
                              </div>

                              <div style={{ fontSize: '13px', color: '#6B756F', display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                <span>📧 {provider.user.email}</span>
                                <span>📱 {provider.user.phone}</span>
                                <span>📅 Applied: {new Date(provider.user.createdAt).toLocaleDateString('en-IN')}</span>
                              </div>

                              <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#17211C', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Submitted Skills & Trades:
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {parsedSkills.map(s => (
                                    <span
                                      key={s}
                                      style={{
                                        fontSize: '12px',
                                        padding: '4px 10px',
                                        backgroundColor: '#EAF6EF',
                                        color: '#145C43',
                                        borderRadius: '20px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                              <Button
                                variant="outline"
                                size="sm"
                                id={`reject-provider-${provider.id}`}
                                disabled={actionLoading}
                                onClick={() => verifyProvider(provider.id, 'REJECTED')}
                                style={{ color: '#D64545', borderColor: '#F3A8A8' }}
                              >
                                Reject
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                id={`approve-provider-${provider.id}`}
                                disabled={actionLoading}
                                onClick={() => verifyProvider(provider.id, 'APPROVED')}
                              >
                                Approve Partner
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── 4. USERS MANAGEMENT ── */}
              {activeSection === 'Users' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(['ALL', 'CUSTOMER', 'PROVIDER'] as const).map(role => (
                        <button
                          key={role}
                          onClick={() => setUserRoleFilter(role)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${userRoleFilter === role ? '#145C43' : '#E4EAE5'}`,
                            backgroundColor: userRoleFilter === role ? '#EAF6EF' : '#FFFFFF',
                            color: userRoleFilter === role ? '#145C43' : '#6B756F',
                            fontWeight: userRoleFilter === role ? 700 : 500,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          {role === 'ALL' ? 'All Roles' : `${role}s`}
                        </button>
                      ))}
                    </div>

                    <div style={{ fontSize: '13px', color: '#6B756F' }}>
                      Total {filteredUsers.length} Users
                    </div>
                  </div>

                  <Card style={{ padding: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F7F9F7', borderBottom: '1px solid #E4EAE5' }}>
                            {['Name', 'Email Address', 'Phone', 'Role', 'Status', 'Registered Date', 'Control'].map(h => (
                              <th key={h} style={{ padding: '14px 18px', fontWeight: 700, color: '#6B756F', textAlign: 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #F1F3F1' }}>
                              <td style={{ padding: '14px 18px', fontWeight: 700, color: '#17211C' }}>{u.name}</td>
                              <td style={{ padding: '14px 18px', color: '#6B756F' }}>{u.email}</td>
                              <td style={{ padding: '14px 18px', color: '#6B756F' }}>{u.phone || '—'}</td>
                              <td style={{ padding: '14px 18px' }}>
                                <Badge variant={u.role === 'PROVIDER' ? 'warning' : u.role === 'ADMIN' ? 'danger' : 'primary'}>
                                  {u.role}
                                </Badge>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <Badge variant={u.status === 'ACTIVE' ? 'success' : 'danger'}>
                                  {u.status}
                                </Badge>
                              </td>
                              <td style={{ padding: '14px 18px', color: '#6B756F' }}>
                                {new Date(u.createdAt).toLocaleDateString('en-IN')}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                {u.role !== 'ADMIN' && (
                                  <button
                                    disabled={actionLoading}
                                    onClick={() => toggleUserStatus(u.id, u.status)}
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '6px',
                                      border: '1px solid #E4EAE5',
                                      backgroundColor: '#FFFFFF',
                                      color: u.status === 'ACTIVE' ? '#D64545' : '#145C43',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── 5. SERVICES & CATALOG ── */}
              {activeSection === 'Services & Catalog' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {/* Category Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                        Service Categories ({categories.length})
                      </h2>
                      <p style={{ fontSize: '13px', color: '#6B756F', marginTop: '4px' }}>
                        Browse and configure home service categories displayed on the customer discovery portal.
                      </p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setIsAddCategoryOpen(true)}>
                      + Add New Category
                    </Button>
                  </div>

                  {/* Categories Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {categories.map(cat => (
                      <Card key={cat.id} style={{ padding: '20px', borderRadius: '14px', border: '1px solid #E4EAE5' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                backgroundColor: '#EAF6EF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px',
                              }}
                            >
                              {cat.iconUrl || '🔧'}
                            </div>
                            <div>
                              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                                {cat.name}
                              </h4>
                              <div style={{ fontSize: '11px', color: '#145C43', fontWeight: 600 }}>
                                /{cat.slug}
                              </div>
                            </div>
                          </div>
                          <Badge variant={cat.isActive ? 'success' : 'neutral'}>
                            {cat.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </div>
                        <div style={{ fontSize: '13px', color: '#6B756F', lineHeight: 1.4, margin: '8px 0 12px 0' }}>
                          {cat.description || 'Verified home services delivered by expert technicians.'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #F1F3F1' }}>
                          <span style={{ fontSize: '12px', color: '#16865D', fontWeight: 700 }}>
                            {cat.servicesCount || 0} services
                          </span>
                          <button
                            disabled={actionLoading}
                            onClick={() => handleDeleteCategory(cat.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#D64545',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 6px',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Services Catalog Table */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                        All Listed Services ({services.length})
                      </h3>
                      <Button variant="primary" size="sm" onClick={() => setIsAddServiceOpen(true)}>
                        + Add New Service
                      </Button>
                    </div>
                    <Card style={{ padding: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#F7F9F7', borderBottom: '1px solid #E4EAE5' }}>
                              {['Photo', 'Service Name', 'Category', 'Base Price (₹)', 'Est. Duration', 'Status', 'Control'].map(h => (
                                <th key={h} style={{ padding: '14px 18px', fontWeight: 700, color: '#6B756F', textAlign: 'left' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {services.map(s => (
                              <tr key={s.id} style={{ borderBottom: '1px solid #F1F3F1' }}>
                                <td style={{ padding: '10px 18px' }}>
                                  <div
                                    style={{
                                      width: '42px',
                                      height: '42px',
                                      borderRadius: '10px',
                                      overflow: 'hidden',
                                      backgroundColor: '#EAF6EF',
                                      border: '1px solid #D1EADE',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    {s.imageUrl ? (
                                      <img
                                        src={s.imageUrl.startsWith('http') ? s.imageUrl : `${API_BASE}${s.imageUrl}`}
                                        alt={s.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={e => { (e.currentTarget.style.display = 'none'); }}
                                      />
                                    ) : (
                                      <span style={{ fontSize: '18px' }}>⚡</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#17211C' }}>{s.name}</td>
                                <td style={{ padding: '14px 18px', color: '#6B756F' }}>{s.category?.name || '—'}</td>
                                <td style={{ padding: '14px 18px', fontWeight: 700, color: '#145C43' }}>
                                  ₹{(s.basePricePaise / 100).toFixed(0)}
                                </td>
                                <td style={{ padding: '14px 18px', color: '#6B756F' }}>
                                  {s.estimatedDurationMinutes} mins
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <Badge variant={s.isActive ? 'success' : 'neutral'}>
                                    {s.isActive ? 'Active' : 'Inactive'}
                                  </Badge>
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                      disabled={actionLoading}
                                      onClick={() => handleToggleServiceStatus(s.id, s.isActive)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #E4EAE5',
                                        backgroundColor: '#FFFFFF',
                                        color: s.isActive ? '#D97706' : '#145C43',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {s.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      disabled={actionLoading}
                                      onClick={() => handleDeleteService(s.id)}
                                      style={{
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        border: '1px solid #F3A8A8',
                                        backgroundColor: '#FFFFFF',
                                        color: '#D64545',
                                        fontSize: '11.5px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* ── 6. BANNERS & MARKETING (DYNAMIC CONTROL OVER CUSTOMER APP HERO) ── */}
              {activeSection === 'Banners & Marketing' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', margin: 0 }}>
                        Promotional Hero Banners & Marketing
                      </h2>
                      <p style={{ fontSize: '13px', color: '#6B756F', marginTop: '4px' }}>
                        Manage hero cards, discount badges, and promotional photos shown on the customer homepage.
                      </p>
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setIsAddBannerOpen(true)}>
                      + Create Hero Banner
                    </Button>
                  </div>

                  {banners.length === 0 ? (
                    <Card style={{ padding: '40px', textAlign: 'center', borderRadius: '16px', border: '1px solid #E4EAE5' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎨</div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#17211C' }}>No Custom Banners Yet</div>
                      <div style={{ fontSize: '13px', color: '#6B756F', marginTop: '4px', marginBottom: '16px' }}>
                        Create your first promotional hero banner with a custom uploaded photo.
                      </div>
                      <Button variant="primary" size="sm" onClick={() => setIsAddBannerOpen(true)}>
                        Create First Banner
                      </Button>
                    </Card>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '18px' }}>
                      {banners.map(banner => (
                        <Card key={banner.id} style={{ padding: '20px', borderRadius: '16px', border: '1px solid #E4EAE5', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          {/* Banner Photo Preview */}
                          <div style={{ width: '100%', height: '160px', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#EAF6EF', border: '1px solid #D1EADE' }}>
                            <img
                              src={banner.imageUrl.startsWith('http') ? banner.imageUrl : `${API_BASE}${banner.imageUrl}`}
                              alt={banner.title}
                              onError={e => {
                                const target = e.currentTarget;
                                if (!target.src.includes('hero-technician.jpg')) {
                                  target.src = '/hero-technician.jpg';
                                }
                              }}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#EAF6EF', color: '#145C43', padding: '3px 8px', borderRadius: '6px' }}>
                              {banner.badge || 'PROMOTIONAL'}
                            </span>
                            <Badge variant={banner.isActive ? 'success' : 'neutral'}>
                              {banner.isActive ? 'Active on App' : 'Disabled'}
                            </Badge>
                          </div>

                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#17211C', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                              {banner.title} {banner.highlightTitle && <span style={{ color: '#16865D' }}>{banner.highlightTitle}</span>}
                            </h4>
                            <p style={{ fontSize: '12.5px', color: '#6B756F', margin: 0, lineHeight: 1.4 }}>
                              {banner.subtitle}
                            </p>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #F1F3F1' }}>
                            <div style={{ fontSize: '12px', color: '#16865D', fontWeight: 700 }}>
                              CTA: {banner.ctaText}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleToggleBannerStatus(banner.id, banner.isActive)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #E4EAE5',
                                  backgroundColor: '#FFFFFF',
                                  color: banner.isActive ? '#D97706' : '#145C43',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {banner.isActive ? 'Hide' : 'Show on App'}
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleDeleteBanner(banner.id)}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid #F3A8A8',
                                  backgroundColor: '#FFFFFF',
                                  color: '#D64545',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── INSPECT BOOKING MODAL ── */}
      {selectedBooking && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedBooking(null)}
          title={`Booking Details: ${selectedBooking.referenceNumber}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#17211C' }}>
                  {selectedBooking.service?.name}
                </div>
                <div style={{ fontSize: '13px', color: '#6B756F' }}>
                  Category: {selectedBooking.service?.category?.name || 'Home Services'}
                </div>
              </div>
              <Badge variant={STATUS_VARIANTS[selectedBooking.status] || 'neutral'}>
                {selectedBooking.status}
              </Badge>
            </div>

            <div style={{ backgroundColor: '#F7F9F7', padding: '16px', borderRadius: '10px', border: '1px solid #E4EAE5' }}>
              <div style={{ fontWeight: 700, color: '#17211C', marginBottom: '4px' }}>Customer Service Address:</div>
              <div style={{ color: '#6B756F' }}>
                {typeof selectedBooking.address === 'string' ? selectedBooking.address : `${selectedBooking.address?.streetAddress}, ${selectedBooking.address?.city}`}
              </div>
              {selectedBooking.address?.landmark && (
                <div style={{ color: '#6B756F', fontSize: '12px', marginTop: '2px' }}>
                  Landmark: {selectedBooking.address.landmark}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6B756F' }}>Scheduled Slot</div>
                <div style={{ fontWeight: 700 }}>
                  {new Date(selectedBooking.scheduledSlot).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6B756F' }}>Total Booking Amount</div>
                <div style={{ fontWeight: 800, color: '#145C43', fontSize: '18px' }}>
                  ₹{(selectedBooking.totalAmountPaise / 100).toFixed(0)}
                </div>
              </div>
            </div>

            {selectedBooking.notes && (
              <div>
                <div style={{ fontSize: '12px', color: '#6B756F' }}>Customer Notes</div>
                <div style={{ fontStyle: 'italic', color: '#17211C' }}>{selectedBooking.notes}</div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ADD CATEGORY MODAL ── */}
      {isAddCategoryOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddCategoryOpen(false)}
          title="Add New Service Category"
        >
          <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input
              label="Category Name"
              type="text"
              placeholder="e.g. Smart Home Automation"
              value={newCategory.name}
              onChange={e => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="URL Slug (Optional)"
                type="text"
                placeholder="e.g. smart-home"
                value={newCategory.slug}
                onChange={e => setNewCategory(prev => ({ ...prev, slug: e.target.value }))}
              />
              <Input
                label="Icon Emoji"
                type="text"
                placeholder="e.g. 🤖 or 💡"
                value={newCategory.iconUrl}
                onChange={e => setNewCategory(prev => ({ ...prev, iconUrl: e.target.value }))}
              />
            </div>

            {/* Category Photo Uploader */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '6px' }}>
                Category Image (Optional)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {newCategory.imageUrl && (
                  <div style={{ width: '50px', height: '50px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E4EAE5' }}>
                    <img src={newCategory.imageUrl.startsWith('http') ? newCategory.imageUrl : `${API_BASE}${newCategory.imageUrl}`} alt="Category" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploadLoading}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadPhotoFile(file, 'categories');
                      if (url) setNewCategory(prev => ({ ...prev, imageUrl: url }));
                    }
                  }}
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief description for customers..."
                value={newCategory.description}
                onChange={e => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #E4EAE5',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="outline" type="button" onClick={() => setIsAddCategoryOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={actionLoading || uploadLoading}>
                Create Category
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ADD SERVICE MODAL WITH PHOTO UPLOADER ── */}
      {isAddServiceOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddServiceOpen(false)}
          title="Add New Service to Catalog"
        >
          <form onSubmit={handleCreateService} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '6px' }}>
                Service Category <span style={{ color: '#D64545' }}>*</span>
              </label>
              <select
                value={newService.categoryId}
                onChange={e => setNewService(prev => ({ ...prev, categoryId: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #E4EAE5',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
              >
                <option value="">Select a Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <Input
              label="Service Name"
              type="text"
              placeholder="e.g. Split AC Chemical Foam Wash"
              value={newService.name}
              onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Base Price (₹ INR)"
                type="number"
                placeholder="699"
                value={String(newService.basePriceRupees)}
                onChange={e => setNewService(prev => ({ ...prev, basePriceRupees: Number(e.target.value) }))}
                required
              />
              <Input
                label="Estimated Duration (Mins)"
                type="number"
                placeholder="60"
                value={String(newService.estimatedDurationMinutes)}
                onChange={e => setNewService(prev => ({ ...prev, estimatedDurationMinutes: Number(e.target.value) }))}
                required
              />
            </div>

            {/* Service Photo Uploader */}
            <div style={{ backgroundColor: '#F7F9F7', padding: '14px', borderRadius: '12px', border: '1px solid #E4EAE5' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#17211C', marginBottom: '4px' }}>
                📸 Service Photo (Shown on Customer App)
              </label>
              <p style={{ fontSize: '12px', color: '#6B756F', margin: '0 0 10px 0' }}>
                Upload a high-resolution photo from your device. Real-time preview available.
              </p>

              {newService.imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '80px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #16865D' }}>
                    <img src={newService.imageUrl.startsWith('http') ? newService.imageUrl : `${API_BASE}${newService.imageUrl}`} alt="Service Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#16865D' }}>Photo Uploaded ✓</div>
                    <button
                      type="button"
                      onClick={() => setNewService(prev => ({ ...prev, imageUrl: '' }))}
                      style={{ background: 'none', border: 'none', color: '#D64545', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: '2px' }}
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadLoading}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await uploadPhotoFile(file, 'services');
                        if (url) setNewService(prev => ({ ...prev, imageUrl: url }));
                      }
                    }}
                    style={{ fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#8BA196' }}>Or paste an image URL directly:</div>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newService.imageUrl}
                    onChange={e => setNewService(prev => ({ ...prev, imageUrl: e.target.value }))}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #E4EAE5',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '6px' }}>
                Service Description
              </label>
              <textarea
                rows={3}
                placeholder="What is included in this service..."
                value={newService.description}
                onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #E4EAE5',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="outline" type="button" onClick={() => setIsAddServiceOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={actionLoading || uploadLoading}>
                Add Service
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── ADD HERO BANNER MODAL WITH PHOTO UPLOADER ── */}
      {isAddBannerOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddBannerOpen(false)}
          title="Create Promotional Hero Banner"
        >
          <form onSubmit={handleCreateBanner} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="Badge Chip Text"
                type="text"
                placeholder="e.g. ⚡ FESTIVE 30% OFF"
                value={newBanner.badge}
                onChange={e => setNewBanner(prev => ({ ...prev, badge: e.target.value }))}
              />
              <Input
                label="Discount / Social Proof"
                type="text"
                placeholder="e.g. Flat ₹150 OFF or 10K+ Customers"
                value={newBanner.discountBadge}
                onChange={e => setNewBanner(prev => ({ ...prev, discountBadge: e.target.value }))}
              />
            </div>

            <Input
              label="Headline Title"
              type="text"
              placeholder="e.g. We fix it today,"
              value={newBanner.title}
              onChange={e => setNewBanner(prev => ({ ...prev, title: e.target.value }))}
              required
            />

            <Input
              label="Highlighted Title (Colored text)"
              type="text"
              placeholder="e.g. so you can relax tomorrow."
              value={newBanner.highlightTitle}
              onChange={e => setNewBanner(prev => ({ ...prev, highlightTitle: e.target.value }))}
            />

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '6px' }}>
                Subtitle Description
              </label>
              <textarea
                rows={2}
                placeholder="Certified experts at your doorstep in as little as 30 minutes..."
                value={newBanner.subtitle}
                onChange={e => setNewBanner(prev => ({ ...prev, subtitle: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #E4EAE5',
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Banner Photo Upload */}
            <div style={{ backgroundColor: '#F7F9F7', padding: '14px', borderRadius: '12px', border: '1px solid #E4EAE5' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#17211C', marginBottom: '4px' }}>
                🖼️ Hero Banner Image (Displayed prominently on Customer App) <span style={{ color: '#D64545' }}>*</span>
              </label>
              <p style={{ fontSize: '12px', color: '#6B756F', margin: '0 0 10px 0' }}>
                Upload banner graphics or technician photo from your device.
              </p>

              {newBanner.imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '120px', height: '80px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #16865D' }}>
                    <img src={newBanner.imageUrl.startsWith('http') ? newBanner.imageUrl : `${API_BASE}${newBanner.imageUrl}`} alt="Banner Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#16865D' }}>Banner Photo Uploaded ✓</div>
                    <button
                      type="button"
                      onClick={() => setNewBanner(prev => ({ ...prev, imageUrl: '' }))}
                      style={{ background: 'none', border: 'none', color: '#D64545', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: '4px' }}
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadLoading}
                    onChange={async e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await uploadPhotoFile(file, 'banners');
                        if (url) setNewBanner(prev => ({ ...prev, imageUrl: url }));
                      }
                    }}
                    style={{ fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#8BA196' }}>Or use image URL / default:</div>
                  <input
                    type="text"
                    placeholder="/hero-technician.jpg or https://..."
                    value={newBanner.imageUrl}
                    onChange={e => setNewBanner(prev => ({ ...prev, imageUrl: e.target.value }))}
                    style={{
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #E4EAE5',
                      outline: 'none',
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                label="CTA Button Text"
                type="text"
                placeholder="e.g. Book Service"
                value={newBanner.ctaText}
                onChange={e => setNewBanner(prev => ({ ...prev, ctaText: e.target.value }))}
              />
              <Input
                label="Target Link / Section"
                type="text"
                placeholder="e.g. #recommended-section"
                value={newBanner.ctaTarget}
                onChange={e => setNewBanner(prev => ({ ...prev, ctaTarget: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button variant="outline" type="button" onClick={() => setIsAddBannerOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={actionLoading || uploadLoading}>
                Publish Hero Banner
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#145C43',
            color: '#FFFFFF',
            padding: '12px 22px',
            borderRadius: '12px',
            fontSize: '13.5px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(20, 92, 67, 0.35)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
