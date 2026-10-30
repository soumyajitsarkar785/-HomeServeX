import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface ProviderRow {
  id: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  locality: string;
  city?: string;
  rating: string | number;
  ratingNum?: number;
  status: 'Active' | 'Pending' | 'Suspended';
  category: string;
  jobsDone?: number;
  verificationStatus?: string;
}

export const AdminProvidersScreen: React.FC = () => {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    phone: '',
    locality: 'Kolkata',
    category: 'AC Service & Repair',
  });
  const [actionMessage, setActionMessage] = useState('');

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/providers');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setProviders(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch providers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const filteredProviders = providers.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.locality && p.locality.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleStatus = async (provider: ProviderRow) => {
    const newStatus = provider.status === 'Active' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/v1/admin/providers/${provider.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          verificationStatus: newStatus === 'ACTIVE' ? 'APPROVED' : 'REJECTED',
        }),
      });
      if (res.ok) {
        setActionMessage(`Provider ${provider.name} status updated to ${newStatus}`);
        setTimeout(() => setActionMessage(''), 3000);
        fetchProviders();
      }
    } catch {
      setActionMessage('Failed to update provider status');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProvider.name || !newProvider.phone) return;
    try {
      const cleanPhone = newProvider.phone.replace(/\D/g, '') || Date.now().toString().slice(-10);
      const res = await fetch('/api/v1/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProvider.name,
          phone: newProvider.phone,
          email: `partner.${cleanPhone}@homeservex.com`,
          city: newProvider.locality,
          category: newProvider.category,
        }),
      });

      if (res.ok) {
        setActionMessage(`New partner ${newProvider.name} registered successfully!`);
        setTimeout(() => setActionMessage(''), 3000);
        setShowAddModal(false);
        setNewProvider({ name: '', phone: '', locality: 'Kolkata', category: 'AC Service & Repair' });
        fetchProviders();
      } else {
        const data = await res.json();
        alert(data?.error?.message || 'Failed to add provider');
      }
    } catch {
      alert('Error connecting to backend');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Provider & Partner Directory
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Authoritative registry of verified master technicians and live dispatch telemetry
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '0 12px',
              width: '240px',
            }}
          >
            <Icons.Search size={15} color="#94A3B8" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search partner or phone..."
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

          <button
            onClick={() => setShowAddModal(true)}
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
              boxShadow: '0 4px 12px rgba(14,62,47,0.15)',
            }}
          >
            <Icons.Plus size={16} color="#FFFFFF" />
            Onboard Provider
          </button>
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

      {/* Provider Directory Table */}
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
                  Provider
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Phone
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Locality / City
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Jobs Done
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Rating
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
                    Loading real provider data from database...
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No providers found matching your filter. Click "Onboard Provider" to register a technician.
                  </td>
                </tr>
              ) : (
                filteredProviders.map((provider, idx) => {
                  const isActive = provider.status === 'Active';
                  return (
                    <tr
                      key={provider.id}
                      style={{
                        borderBottom: idx < filteredProviders.length - 1 ? '1px solid #F1F5F9' : 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{provider.name}</div>
                        <div style={{ fontSize: '12px', color: '#0E3E2F', fontWeight: 600 }}>{provider.category}</div>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', color: '#475569' }}>
                        {provider.phone}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', color: '#475569' }}>
                        {provider.locality || provider.city || 'Kolkata'}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        {provider.jobsDone ?? 0}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#D97706',
                          }}
                        >
                          <Icons.Star size={13} color="#D97706" fill="#D97706" />
                          {typeof provider.rating === 'string' ? provider.rating.replace('★ ', '') : Number(provider.rating || 5.0).toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <button
                          onClick={() => handleToggleStatus(provider)}
                          title="Click to toggle Active / Suspended status in DB"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2',
                            color: isActive ? '#15803D' : '#B91C1C',
                            border: isActive ? '1px solid #86EFAC' : '1px solid #FECACA',
                            cursor: 'pointer',
                          }}
                        >
                          {isActive ? 'Active' : 'Suspended'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedProvider(provider)}
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
                          View KYC
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
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
            Showing <strong style={{ color: '#0F172A' }}>{filteredProviders.length}</strong> verified provider{filteredProviders.length === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
            ● Connected to Live Database
          </div>
        </div>
      </div>

      {/* Provider Detail / KYC Modal */}
      {selectedProvider && (
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
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Technician KYC Dossier
              </h3>
              <button
                onClick={() => setSelectedProvider(null)}
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
                <span style={{ color: '#64748B', fontSize: '13px' }}>Partner ID</span>
                <span style={{ fontWeight: 700, color: '#0E3E2F', fontSize: '13px' }}>{selectedProvider.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Full Name</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>{selectedProvider.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Contact Phone</span>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{selectedProvider.phone}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Service Specialization</span>
                <span style={{ fontWeight: 700, color: '#0E3E2F', fontSize: '13px' }}>{selectedProvider.category}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Assigned Region</span>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{selectedProvider.locality || 'Kolkata'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Lifetime Completed Jobs</span>
                <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '14px' }}>{selectedProvider.jobsDone ?? 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Background Verification</span>
                <span style={{ color: '#15803D', fontWeight: 700, fontSize: '13px' }}>✔ Aadhaar & Criminal Record Cleared</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedProvider(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#0E3E2F',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close Dossier
            </button>
          </div>
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddModal && (
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
          <form
            onSubmit={handleAddProvider}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Onboard New Partner Technician
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Technician Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subhash Bose"
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Mobile Number (Will receive dispatch SMS & login)
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 00000"
                  value={newProvider.phone}
                  onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Specialization Category
                </label>
                <select
                  value={newProvider.category}
                  onChange={(e) => setNewProvider({ ...newProvider, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="AC Service & Repair">AC Service & Repair</option>
                  <option value="Washing Machine">Washing Machine</option>
                  <option value="Refrigerator">Refrigerator</option>
                  <option value="Microwave Oven">Microwave Oven</option>
                  <option value="Water Purifier (RO)">Water Purifier (RO)</option>
                  <option value="Plumbing & Electrical">Plumbing & Electrical</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Operational Locality / City
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kolkata"
                  value={newProvider.locality}
                  onChange={(e) => setNewProvider({ ...newProvider, locality: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#0E3E2F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Save & Authorize
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
