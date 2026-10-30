import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface OfferRow {
  id: string;
  code?: string;
  title: string;
  discount: string;
  discountType?: string;
  discountValue?: number;
  validTill: string;
  status: string;
  minOrder?: number;
  minOrderRupees?: number;
  maxDiscountRupees?: number;
  usageLimit?: number;
}

export const AdminOffersScreen: React.FC = () => {
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<OfferRow | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    code: '',
    title: '',
    discount: '',
    validTill: '30 Apr 2025',
    minOrder: 499,
  });
  const [actionMessage, setActionMessage] = useState('');

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/admin/offers');
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data)) {
          setOffers(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch offers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const filteredOffers = offers.filter(o => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        o.title.toLowerCase().includes(q) ||
        (o.code && o.code.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleStatus = async (offer: OfferRow) => {
    const nextStatus = offer.status === 'Active' || offer.status === 'ACTIVE' ? 'PAUSED' : 'Active';
    try {
      const res = await fetch(`/api/v1/admin/offers/${offer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setActionMessage(`Offer "${offer.title}" set to ${nextStatus}`);
        setTimeout(() => setActionMessage(''), 3000);
        fetchOffers();
      }
    } catch {
      setActionMessage('Failed to update offer status');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional offer?')) return;
    try {
      const res = await fetch(`/api/v1/admin/offers/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setActionMessage('Offer deleted from customer platform');
        setTimeout(() => setActionMessage(''), 3000);
        setSelectedOffer(null);
        fetchOffers();
      }
    } catch {
      setActionMessage('Failed to delete offer');
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffer.title || !newOffer.discount) return;
    try {
      const discountNum = parseInt(newOffer.discount.replace(/\D/g, '')) || 10;
      const res = await fetch('/api/v1/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newOffer.title,
          code: (newOffer.code || newOffer.title.substring(0, 6)).toUpperCase().replace(/\s+/g, ''),
          discount: newOffer.discount,
          discountType: newOffer.discount.includes('%') ? 'PERCENTAGE' : 'FLAT',
          discountValue: discountNum,
          validTill: newOffer.validTill,
          status: 'Active',
          minOrderRupees: Number(newOffer.minOrder) || 499,
          maxDiscountRupees: 500,
          usageLimit: 1000,
        }),
      });

      if (res.ok) {
        setActionMessage(`New campaign "${newOffer.title}" published!`);
        setTimeout(() => setActionMessage(''), 3000);
        setShowAddModal(false);
        setNewOffer({ code: '', title: '', discount: '', validTill: '30 Apr 2025', minOrder: 499 });
        fetchOffers();
      } else {
        const data = await res.json();
        alert(data?.error?.message || 'Failed to create offer');
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
            Offers & Coupons Management
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            Active customer promotional campaigns, discounts, and minimum order rules
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
              placeholder="Search offer or coupon..."
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
            Create Campaign
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

      {/* Coupons Table */}
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
                  Campaign Title & Code
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Discount
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Min Spend
                </th>
                <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Valid Till
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
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    Loading campaigns from authoritative database...
                  </td>
                </tr>
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
                    No campaigns found. Click "Create Campaign" to add discounts for customers.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer, idx) => {
                  const isActive = offer.status === 'Active' || offer.status === 'ACTIVE';
                  const code = offer.code || offer.title.substring(0, 8).toUpperCase().replace(/\s+/g, '');
                  return (
                    <tr
                      key={offer.id}
                      style={{
                        borderBottom: idx < filteredOffers.length - 1 ? '1px solid #F1F5F9' : 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>{offer.title}</div>
                        <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 800, letterSpacing: '1px', marginTop: '2px' }}>
                          CODE: {code}
                        </div>
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', fontWeight: 800, color: '#0E3E2F' }}>
                        {offer.discount}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', color: '#475569' }}>
                        ₹{offer.minOrderRupees ?? offer.minOrder ?? 0}
                      </td>
                      <td style={{ padding: '16px 18px', fontSize: '14px', color: '#475569' }}>
                        {offer.validTill}
                      </td>
                      <td style={{ padding: '16px 18px' }}>
                        <button
                          onClick={() => handleToggleStatus(offer)}
                          title="Click to toggle Active / Paused"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 700,
                            backgroundColor: isActive ? '#DCFCE7' : '#FEF3C7',
                            color: isActive ? '#15803D' : '#D97706',
                            border: isActive ? '1px solid #86EFAC' : '1px solid #FDE68A',
                            cursor: 'pointer',
                          }}
                        >
                          {isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedOffer(offer)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#0E3E2F',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteOffer(offer.id)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
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
            Showing <strong style={{ color: '#0F172A' }}>{filteredOffers.length}</strong> active campaign{filteredOffers.length === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
            ● Automatically synchronized with Customer App
          </div>
        </div>
      </div>

      {/* Offer Detail Modal */}
      {selectedOffer && (
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
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Campaign Details
              </h3>
              <button
                onClick={() => setSelectedOffer(null)}
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
                <span style={{ color: '#64748B', fontSize: '13px' }}>Campaign Title</span>
                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>{selectedOffer.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Coupon Code</span>
                <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '14px', letterSpacing: '1px' }}>
                  {selectedOffer.code || selectedOffer.title.substring(0, 8).toUpperCase().replace(/\s+/g, '')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Discount Value</span>
                <span style={{ fontWeight: 800, color: '#0E3E2F', fontSize: '14px' }}>{selectedOffer.discount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Minimum Order Spend</span>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>
                  ₹{selectedOffer.minOrderRupees ?? selectedOffer.minOrder ?? 0}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Expiry Date</span>
                <span style={{ fontWeight: 600, color: '#0F172A', fontSize: '13px' }}>{selectedOffer.validTill}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F1F5F9' }}>
                <span style={{ color: '#64748B', fontSize: '13px' }}>Live Status</span>
                <span style={{ fontWeight: 700, color: selectedOffer.status === 'Active' ? '#15803D' : '#D97706', fontSize: '13px' }}>
                  {selectedOffer.status}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOffer(null)}
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
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Offer Modal */}
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
            onSubmit={handleAddOffer}
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
                Create New Promotional Campaign
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
                  Coupon Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER50"
                  value={newOffer.code}
                  onChange={(e) => setNewOffer({ ...newOffer, code: e.target.value.toUpperCase() })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    outline: 'none',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Campaign Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer Cooling Special"
                  value={newOffer.title}
                  onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })}
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
                  Discount (e.g. ₹200 or 15%)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ₹200 or 20%"
                  value={newOffer.discount}
                  onChange={(e) => setNewOffer({ ...newOffer, discount: e.target.value })}
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
                  Minimum Order Value (₹)
                </label>
                <input
                  type="number"
                  placeholder="499"
                  value={newOffer.minOrder}
                  onChange={(e) => setNewOffer({ ...newOffer, minOrder: Number(e.target.value) })}
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
                Publish Live
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
