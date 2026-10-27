import React, { useEffect, useState } from 'react';
import { Button, Input, Card, Spinner, Icons } from '@homeservex/ui';
import { useAuth } from '../app/auth-context.js';
import type { AddressItem } from '../components/BookingModal.js';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

export const AccountPage: React.FC = () => {
  const { user, accessToken, logout } = useAuth();
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('Mumbai');
  const [state, setState] = useState('Maharashtra');
  const [postalCode, setPostalCode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const authHeaders = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!accessToken) return;
    setIsLoading(true);
    fetch(`${API_BASE}/api/v1/customers/addresses`, { headers: authHeaders })
      .then(r => r.json())
      .then(res => {
        if (res?.data) setAddresses(res.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!streetAddress.trim() || !postalCode.trim()) {
      setErrorMessage('Please enter street address and pin code');
      return;
    }
    setIsSavingAddress(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/addresses`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          label: addressLabel,
          streetAddress: streetAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          landmark: landmark.trim() || undefined,
          isDefault: addresses.length === 0,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.data) {
        setAddresses(prev => [data.data, ...prev]);
        setShowAddressForm(false);
        setStreetAddress('');
        setPostalCode('');
        setLandmark('');
        setActionMessage(`Address saved successfully!`);
        setTimeout(() => setActionMessage(null), 3000);
      } else {
        setErrorMessage(data.error?.message || 'Failed to save address');
      }
    } catch {
      setErrorMessage('Network error while saving address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/addresses/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== id));
        setActionMessage('Address deleted.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9F7', color: '#17211C', paddingBottom: '120px', fontFamily: "'Inter', sans-serif" }}>
      {/* Top Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E8EDE9',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ maxWidth: '840px', margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <a
              href="/"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: '#EAF6EF',
                border: '1px solid #D1EADE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#145C43',
                textDecoration: 'none',
                fontWeight: 900,
                fontSize: '18px',
              }}
            >
              ←
            </a>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#17211C' }}>My Account</div>
              <div style={{ fontSize: '11px', color: '#16865D', fontWeight: 800 }}>Profile & Saved Addresses</div>
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8EDE9',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
              color: '#DC2626',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '840px', margin: '0 auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {actionMessage && (
          <div style={{ padding: '12px 16px', backgroundColor: '#EAF6EF', color: '#145C43', borderRadius: '14px', fontSize: '13px', fontWeight: 800, border: '1px solid #CBE5D7' }}>
            ✓ {actionMessage}
          </div>
        )}

        {/* Profile Card */}
        <Card style={{ padding: '22px', borderRadius: '22px', border: '1px solid #E8EDE9', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#EAF6EF',
              border: '2px solid #16865D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
              fontWeight: 900,
              color: '#145C43',
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#17211C' }}>{user?.name || 'Customer'}</h2>
              <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#EAF6EF', color: '#16865D', padding: '2px 8px', borderRadius: '6px' }}>
                Verified
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#6B756F', marginTop: '2px' }}>{user?.phone ? `+91 ${user.phone}` : ''}</div>
            <div style={{ fontSize: '12px', color: '#8E9992' }}>{user?.email}</div>
          </div>
        </Card>

        {/* Saved Addresses Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>Saved Delivery Addresses</h3>
            <div style={{ fontSize: '12px', color: '#6B756F' }}>Used for quick 1-click doorstep service booking</div>
          </div>

          <button
            onClick={() => setShowAddressForm(!showAddressForm)}
            style={{
              backgroundColor: '#145C43',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {showAddressForm ? 'Cancel' : '+ Add Address'}
          </button>
        </div>

        {/* Add Address Form */}
        {showAddressForm && (
          <Card style={{ padding: '20px', borderRadius: '20px', border: '1.5px solid #16865D', backgroundColor: '#FFFFFF' }}>
            <h4 style={{ fontSize: '15px', fontWeight: 900, margin: '0 0 14px 0' }}>New Address Details</h4>
            <form onSubmit={handleSaveAddress} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#17211C', display: 'block', marginBottom: '6px' }}>Label</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['Home', 'Office', 'Other'] as const).map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '10px',
                        border: `1.5px solid ${addressLabel === lbl ? '#16865D' : '#E8EDE9'}`,
                        backgroundColor: addressLabel === lbl ? '#EAF6EF' : '#FFFFFF',
                        color: addressLabel === lbl ? '#145C43' : '#6B756F',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <Input label="Flat / Street Address *" placeholder="e.g. 123 Main Street, Powai" value={streetAddress} onChange={e => setStreetAddress(e.target.value)} required />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input label="Landmark (Optional)" placeholder="Near Metro" value={landmark} onChange={e => setLandmark(e.target.value)} />
                <Input label="Pin Code *" placeholder="400076" value={postalCode} onChange={e => setPostalCode(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <Input label="City *" value={city} onChange={e => setCity(e.target.value)} required />
                <Input label="State *" value={state} onChange={e => setState(e.target.value)} required />
              </div>

              {errorMessage && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FDF1F1', color: '#DC2626', borderRadius: '8px', fontSize: '12px' }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              <Button type="submit" variant="primary" isLoading={isSavingAddress} style={{ width: '100%', marginTop: '6px' }}>
                Save Address
              </Button>
            </form>
          </Card>
        )}

        {/* Address Cards List */}
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><Spinner /></div>
        ) : addresses.length === 0 ? (
          <Card style={{ padding: '30px', textAlign: 'center', borderRadius: '18px' }}>
            <p style={{ fontSize: '13px', color: '#6B756F', margin: 0 }}>No addresses saved yet.</p>
          </Card>
        ) : (
          addresses.map(addr => (
            <Card key={addr.id} style={{ padding: '16px 20px', borderRadius: '18px', border: '1px solid #E8EDE9', backgroundColor: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: '#EAF6EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  📍
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 900 }}>{addr.label || 'Home'}</span>
                    {addr.isDefault && (
                      <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#EAF6EF', color: '#16865D', padding: '1px 6px', borderRadius: '6px' }}>Default</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#4B556F' }}>
                    {addr.streetAddress}, {addr.city} - {addr.postalCode}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteAddress(addr.id)}
                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '14px', padding: '6px' }}
                title="Delete address"
              >
                🗑️
              </button>
            </Card>
          ))
        )}
      </main>

      {/* Fixed Bottom Dock */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 60,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E8EDE9',
          boxShadow: '0 -4px 18px rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: '66px',
          maxWidth: '840px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => (window.location.href = '/')}
          style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: '#8E9992', cursor: 'pointer' }}
        >
          <div style={{ fontSize: '18px' }}>🏠</div>
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Home</span>
        </button>

        <button
          onClick={() => (window.location.href = '/bookings')}
          style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: '#8E9992', cursor: 'pointer' }}
        >
          <Icons.Calendar size={18} color="#8E9992" />
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Bookings</span>
        </button>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              position: 'absolute',
              top: '-26px',
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#145C43',
              color: '#FFFFFF',
              border: '3px solid #FFFFFF',
              boxShadow: '0 6px 18px rgba(20, 92, 67, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icons.Zap size={22} color="#FFFFFF" />
          </button>
        </div>

        <button
          onClick={() => alert('HomeServeX Offers: Use code FIRST50 for ₹100 instant discount on AC deep cleaning!')}
          style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: '#8E9992', cursor: 'pointer' }}
        >
          <Icons.Tag size={18} color="#8E9992" />
          <span style={{ fontSize: '11px', fontWeight: 500 }}>Offers</span>
        </button>

        <button
          style={{ flex: 1, background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', color: '#145C43', cursor: 'pointer' }}
        >
          <Icons.User size={18} color="#145C43" />
          <span style={{ fontSize: '11px', fontWeight: 800 }}>Account</span>
        </button>
      </nav>
    </div>
  );
};
