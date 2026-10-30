import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

export const AdminServicesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal states
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    slug: '',
    categoryId: '',
    priceRupees: 499,
    strikethroughPriceRupees: 699,
    estimatedDurationMinutes: 45,
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    badge: 'Recommended',
    isPopular: false,
    isActive: true,
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    iconUrl: '⚡',
    description: '',
    displayOrder: 1,
    isActive: true,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchServicesAndCategories = async () => {
    setIsLoading(true);
    try {
      const [resSvc, resCat] = await Promise.all([
        fetch('/api/v1/admin/services'),
        fetch('/api/v1/admin/categories'),
      ]);
      if (resSvc.ok) {
        const json = await resSvc.json();
        if (json?.data) setServices(json.data);
      }
      if (resCat.ok) {
        const json = await resCat.json();
        if (json?.data) setCategories(json.data);
      }
    } catch (e) {
      console.warn('[Admin Services] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServicesAndCategories();
  }, []);

  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      slug: '',
      categoryId: categories[0]?.id || '',
      priceRupees: 499,
      strikethroughPriceRupees: 699,
      estimatedDurationMinutes: 45,
      description: '',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      badge: 'Recommended',
      isPopular: false,
      isActive: true,
    });
    setShowServiceModal(true);
  };

  const handleOpenEditService = (svc: any) => {
    setEditingService(svc);
    setServiceForm({
      name: svc.name,
      slug: svc.slug,
      categoryId: svc.categoryId,
      priceRupees: svc.priceRupees,
      strikethroughPriceRupees: svc.strikethroughPriceRupees || Math.round(svc.priceRupees * 1.3),
      estimatedDurationMinutes: svc.estimatedDurationMinutes || 45,
      description: svc.description || '',
      imageUrl: svc.imageUrl || '',
      badge: svc.badge || '',
      isPopular: Boolean(svc.isPopular),
      isActive: svc.isActive !== false,
    });
    setShowServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.categoryId) {
      alert('Service name and category are required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingService
        ? `/api/v1/admin/services/${editingService.id}`
        : '/api/v1/admin/services';
      const method = editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm),
      });

      if (res.ok) {
        setShowServiceModal(false);
        fetchServicesAndCategories();
      } else {
        const err = await res.json();
        alert(err?.error?.message || 'Failed to save service.');
      }
    } catch {
      alert('Network error while saving service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete service "${name}"? This will immediately remove it from the Customer App.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/admin/services/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert('Failed to delete service.');
      }
    } catch {
      alert('Network error while deleting service.');
    }
  };

  const handleToggleServiceActive = async (svc: any) => {
    const updatedStatus = !svc.isActive;
    try {
      await fetch(`/api/v1/admin/services/${svc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updatedStatus }),
      });
      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, isActive: updatedStatus } : s))
      );
    } catch {}
  };

  // Category handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      slug: '',
      iconUrl: '⚡',
      description: '',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      iconUrl: cat.iconUrl || '⚡',
      description: cat.description || '',
      displayOrder: cat.displayOrder || 1,
      isActive: cat.isActive !== false,
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert('Category name is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const url = editingCategory
        ? `/api/v1/admin/categories/${editingCategory.id}`
        : '/api/v1/admin/categories';
      const method = editingCategory ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });

      if (res.ok) {
        setShowCategoryModal(false);
        fetchServicesAndCategories();
      } else {
        const err = await res.json();
        alert(err?.error?.message || 'Failed to save category.');
      }
    } catch {
      alert('Network error while saving category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/categories/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert('Failed to delete category.');
      }
    } catch {
      alert('Network error while deleting category.');
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Services & Categories Control
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Direct real-time control over customer app rate cards, categories, and doorstep service catalog
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'services' ? (
            <button
              onClick={handleOpenAddService}
              style={{
                padding: '9px 18px',
                borderRadius: '24px',
                border: 'none',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <Icons.Plus size={16} color="#FFFFFF" />
              Add Service
            </button>
          ) : (
            <button
              onClick={handleOpenAddCategory}
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
              }}
            >
              <Icons.Plus size={16} color="#FFFFFF" />
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('services')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'services' ? '1.5px solid #0E3E2F' : '1px solid #CBD5E1',
            backgroundColor: activeTab === 'services' ? '#0E3E2F' : '#FFFFFF',
            color: activeTab === 'services' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Services</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'services' ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
              color: activeTab === 'services' ? '#FFFFFF' : '#64748B',
            }}
          >
            {services.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          style={{
            padding: '8px 20px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'categories' ? '1.5px solid #0E3E2F' : '1px solid #CBD5E1',
            backgroundColor: activeTab === 'categories' ? '#0E3E2F' : '#FFFFFF',
            color: activeTab === 'categories' ? '#FFFFFF' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>Categories</span>
          <span
            style={{
              fontSize: '11px',
              padding: '1px 7px',
              borderRadius: '10px',
              backgroundColor: activeTab === 'categories' ? 'rgba(255,255,255,0.25)' : '#F1F5F9',
              color: activeTab === 'categories' ? '#FFFFFF' : '#64748B',
            }}
          >
            {categories.length}
          </span>
        </button>
      </div>

      {/* Services Tab Content */}
      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontSize: '13px',
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Categories ({services.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.iconUrl} {c.name} ({services.filter((s) => s.categoryId === c.id).length})
                  </option>
                ))}
              </select>

              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Showing <b>{filteredServices.length}</b> services
              </span>
            </div>

            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="Search services..."
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

          {/* Services Table Card */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                Loading verified service catalog...
              </div>
            ) : filteredServices.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#64748B' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛠️</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>No services found</div>
                <p style={{ fontSize: '12px', margin: '4px 0 16px' }}>Try adjusting your search or add a new service.</p>
                <button
                  onClick={handleOpenAddService}
                  style={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add New Service
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '12px 16px' }}>Service Name</th>
                      <th style={{ padding: '12px 16px' }}>Category</th>
                      <th style={{ padding: '12px 16px' }}>Price (₹)</th>
                      <th style={{ padding: '12px 16px' }}>Duration</th>
                      <th style={{ padding: '12px 16px' }}>Badge</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((svc) => (
                      <tr key={svc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={svc.imageUrl}
                              alt={svc.name}
                              style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', backgroundColor: '#F1F5F9' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0F172A' }}>{svc.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>/{svc.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ backgroundColor: '#EAF4EF', color: '#0E3E2F', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                            {svc.categoryName}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontWeight: 800, color: '#0E3E2F' }}>₹{svc.priceRupees}</span>
                          {svc.strikethroughPriceRupees && (
                            <span style={{ fontSize: '11px', color: '#94A3B8', textDecoration: 'line-through', marginLeft: '6px' }}>
                              ₹{svc.strikethroughPriceRupees}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          ⏱ {svc.estimatedDurationMinutes} mins
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {svc.badge ? (
                            <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                              {svc.badge}
                            </span>
                          ) : (
                            <span style={{ color: '#CBD5E1' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => handleToggleServiceActive(svc)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '12px',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              backgroundColor: svc.isActive ? '#DCFCE7' : '#F1F5F9',
                              color: svc.isActive ? '#15803D' : '#64748B',
                            }}
                          >
                            ● {svc.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEditService(svc)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#0F172A',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteService(svc.id, svc.name)}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: '11px',
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
            )}
          </div>
        </div>
      )}

      {/* Categories Tab Content */}
      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Slug</th>
                  <th style={{ padding: '12px 16px' }}>Services Count</th>
                  <th style={{ padding: '12px 16px' }}>Order</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{cat.iconUrl || '⚡'}</span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{cat.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{cat.description}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#475569', fontSize: '12px' }}>
                      {cat.slug}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ backgroundColor: '#F1F5F9', color: '#0F172A', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                        {cat.servicesCount || 0} services
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748B' }}>
                      #{cat.displayOrder || 1}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: cat.isActive ? '#15803D' : '#64748B', backgroundColor: cat.isActive ? '#DCFCE7' : '#F1F5F9', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                        ● {cat.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            border: '1px solid #FECACA',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            fontSize: '11px',
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
        </div>
      )}

      {/* Service Add/Edit Modal */}
      {showServiceModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                {editingService ? 'Edit Doorstep Service' : 'Add New Doorstep Service'}
              </h3>
              <button onClick={() => setShowServiceModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Split AC Power Jet Cleaning"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Category *</label>
                  <select
                    required
                    value={serviceForm.categoryId}
                    onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', backgroundColor: '#FFFFFF' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={serviceForm.priceRupees}
                    onChange={(e) => setServiceForm({ ...serviceForm, priceRupees: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Strikethrough Price (₹)</label>
                  <input
                    type="number"
                    value={serviceForm.strikethroughPriceRupees}
                    onChange={(e) => setServiceForm({ ...serviceForm, strikethroughPriceRupees: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Duration (mins)</label>
                  <input
                    type="number"
                    value={serviceForm.estimatedDurationMinutes}
                    onChange={(e) => setServiceForm({ ...serviceForm, estimatedDurationMinutes: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Promotional Badge</label>
                <input
                  type="text"
                  placeholder="e.g. Recommended, Instant 30m, Bestseller"
                  value={serviceForm.badge}
                  onChange={(e) => setServiceForm({ ...serviceForm, badge: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Photo Image URL</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={serviceForm.imageUrl}
                  onChange={(e) => setServiceForm({ ...serviceForm, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe service inclusions, equipment used, and customer guarantee..."
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={serviceForm.isActive}
                    onChange={(e) => setServiceForm({ ...serviceForm, isActive: e.target.checked })}
                  />
                  <span>Active & Live in Customer App</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={serviceForm.isPopular}
                    onChange={(e) => setServiceForm({ ...serviceForm, isPopular: e.target.checked })}
                  />
                  <span>Featured / Popular</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Add/Edit Modal */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrician, Plumbing, AC Repair"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Icon (Emoji)</label>
                  <input
                    type="text"
                    placeholder="❄️, 🧺, ⚡, 🔧"
                    value={categoryForm.iconUrl}
                    onChange={(e) => setCategoryForm({ ...categoryForm, iconUrl: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Display Order</label>
                  <input
                    type="number"
                    value={categoryForm.displayOrder}
                    onChange={(e) => setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Description</label>
                <input
                  type="text"
                  placeholder="Brief description for category card..."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                />
                <span>Active & Visible in Customer App</span>
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#0E3E2F', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
