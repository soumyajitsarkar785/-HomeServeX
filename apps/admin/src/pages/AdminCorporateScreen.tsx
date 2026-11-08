import React, { useState, useEffect } from 'react';

export const AdminCorporateScreen: React.FC = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [bulkBookings, setBulkBookings] = useState<any[]>([]);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgContact, setNewOrgContact] = useState('');
  const [newOrgPhone, setNewOrgPhone] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newOrgAddress, setNewOrgAddress] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchCorporateData = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const res = await fetch('/api/v1/corporate/organizations', { headers });
      if (res.ok) {
        const j = await res.json();
        setOrganizations(j?.data || []);
      }
    } catch {}

    // Mock initial corporate list if empty
    setOrganizations(prev => prev.length > 0 ? prev : [
      { id: 'org-1', name: 'Silver Oak Heights RWA', type: 'SOCIETY', contactPerson: 'Col. Rajesh Sengupta', contactPhone: '+91 98301 22341', billingAddress: 'Action Area 2, New Town, Kolkata' },
      { id: 'org-2', name: 'Tata Consultancy Tech Park B4', type: 'CORPORATE', contactPerson: 'Priya Nambiar', contactPhone: '+91 98450 78219', billingAddress: 'Sector V, Salt Lake, Kolkata' },
    ]);

    setBulkBookings([
      { id: 'blk-1', orgName: 'Silver Oak Heights RWA', service: 'Split AC Power Jet Cleaning', units: 48, requestedDate: '2026-11-25', status: 'QUOTED', quoteRupees: 21600 },
      { id: 'blk-2', orgName: 'Tata Consultancy Tech Park B4', service: 'Deep Floor Scrubbing & Sanitization', units: 12, requestedDate: '2026-12-01', status: 'APPROVED', quoteRupees: 18000 },
    ]);
  };

  useEffect(() => {
    fetchCorporateData();
  }, []);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgPhone.trim()) return;
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const res = await fetch('/api/v1/corporate/organizations', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: newOrgName.trim(),
        type: 'SOCIETY',
        contactPerson: newOrgContact.trim() || 'President / Facility Head',
        contactPhone: newOrgPhone.trim(),
        contactEmail: newOrgEmail.trim() || 'society@homeservex.com',
        billingAddress: newOrgAddress.trim() || 'Kolkata, WB',
      }),
    });

    if (res.ok) {
      setActionSuccess(`Organization ${newOrgName} successfully registered!`);
      setShowOrgModal(false);
      setNewOrgName('');
      setNewOrgContact('');
      setNewOrgPhone('');
      setTimeout(() => setActionSuccess(''), 3000);
      fetchCorporateData();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            🏢 Society &amp; Corporate Bulk Booking Desk
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Manage apartment housing societies, RWAs, tech parks, and commercial fleet service contracts.
          </p>
        </div>
        <button
          onClick={() => setShowOrgModal(true)}
          style={{
            backgroundColor: '#0E3E2F',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          + Register Organization
        </button>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '12px', padding: '12px 16px', color: '#15803D', fontWeight: 700, fontSize: '13px' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* Bulk Contracts Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active Societies &amp; RWAs</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0E3E2F', marginTop: '4px' }}>{organizations.length}</div>
          <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>Over 600+ residential flats covered</div>
        </div>

        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Active Bulk Batches</div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>{bulkBookings.length}</div>
          <div style={{ fontSize: '12px', color: '#0284C7', marginTop: '4px' }}>Multi-unit scheduled operations</div>
        </div>
      </div>

      {/* Bulk Bookings Table */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>
          Recent Corporate Service Requisitions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {bulkBookings.map((b) => (
            <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{b.orgName}</div>
                <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                  <b>{b.service}</b> • {b.units} Units / Flats
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Date: {b.requestedDate}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0E3E2F' }}>₹{b.quoteRupees?.toLocaleString()}</div>
                <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: b.status === 'APPROVED' ? '#DCFCE7' : '#FEF3C7', color: b.status === 'APPROVED' ? '#15803D' : '#B45309', padding: '3px 8px', borderRadius: '8px', display: 'inline-block', marginTop: '4px' }}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showOrgModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px' }}>Register Organization</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Organization / Society Name" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <input type="text" placeholder="Contact Person (e.g. Secretary / Facility Mgr)" value={newOrgContact} onChange={e => setNewOrgContact(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <input type="text" placeholder="Phone Number" value={newOrgPhone} onChange={e => setNewOrgPhone(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <input type="email" placeholder="Official Email Address" value={newOrgEmail} onChange={e => setNewOrgEmail(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }} />
              <textarea placeholder="Billing Address & Complex Details" value={newOrgAddress} onChange={e => setNewOrgAddress(e.target.value)} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', minHeight: '60px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
              <button onClick={() => setShowOrgModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>Cancel</button>
              <button onClick={handleCreateOrg} style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#0E3E2F', color: '#FFFFFF', cursor: 'pointer', fontWeight: 700, fontSize: '12px' }}>Save Organization</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
