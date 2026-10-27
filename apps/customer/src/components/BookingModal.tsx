import React, { useState, useEffect } from 'react';
import { Button, Input, Badge, Modal, Icons } from '@homeservex/ui';
import { useAuth } from '../app/auth-context.js';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

export interface ServiceItem {
  id: string;
  name: string;
  slug?: string;
  description: string;
  basePricePaise: number;
  strikethroughPricePaise?: number | null;
  estimatedDurationMinutes: number;
  imageUrl?: string | null;
  rating?: number;
  reviewCount?: number | string;
  badge?: string | null;
  isPopular?: boolean;
  category?: { id?: string; name: string; slug?: string };
  options?: Array<{ id: string; name: string; priceDeltaPaise: number; durationDeltaMinutes?: number }>;
}

export interface AddressItem {
  id: string;
  label?: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  landmark?: string | null;
  isDefault?: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceItem | null;
  onBookingSuccess?: (booking: any, startOtp?: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  service,
  onBookingSuccess,
}) => {
  const { user, accessToken } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1); // 1: Details & Addons, 2: Address & Slot, 3: Review & Summary, 4: Confirmed
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('Mumbai');
  const [newState] = useState('Maharashtra');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [startOtp, setStartOtp] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset modal state when service changes
  useEffect(() => {
    if (isOpen && service) {
      setStep(1);
      setSelectedOptionIds([]);
      setErrorMsg(null);
      setCreatedBooking(null);
      setStartOtp(null);
    }
  }, [isOpen, service]);

  // Fetch addresses when logged in
  useEffect(() => {
    if (isOpen && accessToken && user?.role === 'CUSTOMER') {
      fetch(`${API_BASE}/api/v1/customers/addresses`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data?.data && Array.isArray(data.data)) {
            setAddresses(data.data);
            if (data.data.length > 0 && !selectedAddressId) {
              const defaultAddr = data.data.find((a: AddressItem) => a.isDefault) || data.data[0];
              setSelectedAddressId(defaultAddr.id);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, accessToken, user]);

  if (!service) return null;

  // Calculate pricing
  const basePrice = service.basePricePaise / 100;
  const optionsDelta = (service.options || [])
    .filter(opt => selectedOptionIds.includes(opt.id))
    .reduce((acc, opt) => acc + (opt.priceDeltaPaise / 100), 0);
  const subtotal = basePrice + optionsDelta;
  const gstTax = Math.round(subtotal * 0.18);
  const totalAmount = subtotal + gstTax;

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet || !newPostalCode) {
      setErrorMsg('Please enter street address and pin code');
      return;
    }
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/customers/addresses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'Home',
          streetAddress: newStreet,
          city: newCity,
          state: newState,
          postalCode: newPostalCode,
          landmark: newLandmark || undefined,
          isDefault: addresses.length === 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to save address');
      setAddresses(prev => [data.data, ...prev]);
      setSelectedAddressId(data.data.id);
      setShowNewAddressForm(false);
      setNewStreet('');
      setNewPostalCode('');
      setNewLandmark('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save address');
    }
  };

  const handleConfirmBooking = async () => {
    if (!accessToken) {
      window.location.href = '/login';
      return;
    }
    if (!selectedAddressId) {
      setErrorMsg('Please select or add a service address');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const slotDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`);
      const payload = {
        serviceId: service.id,
        addressId: selectedAddressId,
        scheduledSlot: slotDateTime.toISOString(),
        selectedOptionIds,
        notes: notes || undefined,
      };

      const res = await fetch(`${API_BASE}/api/v1/bookings`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error?.message || 'Booking submission failed');

      setCreatedBooking(resData.data);
      // Extract OTP from response message or data
      const match = resData.message?.match(/Start OTP:\s*(\d{6})/i);
      const extractedOtp = resData.data?.activeOtp?.otp || (match ? match[1] : null);
      setStartOtp(extractedOtp);
      setStep(4);
      if (onBookingSuccess) onBookingSuccess(resData.data, extractedOtp);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating your booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={step === 4 ? 'Booking Confirmed!' : `Book: ${service.name}`} maxWidth="560px">
      {/* Step Indicator */}
      {step < 4 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border, #E4EAE5)' }}>
          {[
            { num: 1, label: 'Service' },
            { num: 2, label: 'Address & Slot' },
            { num: 3, label: 'Summary' },
          ].map(s => (
            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: step === s.num ? 'var(--color-primary, #145C43)' : step > s.num ? 'var(--color-success, #188653)' : '#E4EAE5',
                  color: step >= s.num ? '#FFFFFF' : 'var(--color-text-secondary, #6B756F)',
                }}
              >
                {step > s.num ? '✓' : s.num}
              </div>
              <span style={{ fontSize: '13px', fontWeight: step === s.num ? 700 : 500, color: step === s.num ? 'var(--color-primary, #145C43)' : 'var(--color-text-secondary, #6B756F)' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FDF1F1', color: '#D64545', borderRadius: '10px', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Icons.AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Service Details & Optional Add-ons */}
      {step === 1 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <Badge variant="primary" style={{ marginBottom: '8px' }}>{service.category?.name || 'Home Service'}</Badge>
              <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text, #17211C)', margin: '0 0 6px 0' }}>
                {service.name}
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', margin: 0, lineHeight: 1.5 }}>
                {service.description}
              </p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '16px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary, #145C43)' }}>₹{basePrice}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted, #8E9992)' }}>~{service.estimatedDurationMinutes} mins</div>
            </div>
          </div>

          <div style={{ padding: '14px 16px', backgroundColor: 'var(--color-mint-light, #EAF6EF)', borderRadius: '12px', marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Icons.ShieldCheck size={24} color="var(--color-primary, #145C43)" />
            <div style={{ fontSize: '13px', color: 'var(--color-primary-dark, #0D3B2B)' }}>
              <strong>HomeServeX Guarantee:</strong> Background-verified technician, transparent pricing, and 30-day post-service warranty.
            </div>
          </div>

          {/* Add-ons if available */}
          {service.options && service.options.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: 'var(--color-text, #17211C)' }}>
                Customize & Add-ons
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {service.options.map(opt => {
                  const isChecked = selectedOptionIds.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '10px',
                        border: `1px solid ${isChecked ? 'var(--color-primary-emerald, #16865D)' : 'var(--color-border, #E4EAE5)'}`,
                        backgroundColor: isChecked ? 'var(--color-mint-light, #EAF6EF)' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedOptionIds(prev =>
                              isChecked ? prev.filter(id => id !== opt.id) : [...prev, opt.id]
                            );
                          }}
                          style={{ accentColor: 'var(--color-primary, #145C43)', width: '16px', height: '16px' }}
                        />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text, #17211C)' }}>{opt.name}</span>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-primary, #145C43)' }}>
                        +₹{(opt.priceDeltaPaise / 100).toFixed(0)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button
              variant="primary"
              onClick={() => {
                if (!accessToken) {
                  window.location.href = '/login';
                } else {
                  setStep(2);
                }
              }}
            >
              {accessToken ? 'Select Address & Schedule →' : 'Log In to Book'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Address & Schedule Slot */}
      {step === 2 && (
        <div>
          {/* Address selection */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text, #17211C)' }}>Service Address</div>
              {!showNewAddressForm && (
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary, #145C43)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  + Add New Address
                </button>
              )}
            </div>

            {showNewAddressForm ? (
              <form onSubmit={handleAddNewAddress} style={{ padding: '16px', backgroundColor: 'var(--color-bg-main, #F7F9F7)', borderRadius: '12px', border: '1px solid var(--color-border, #E4EAE5)', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                <Input label="House/Flat No., Street Address *" value={newStreet} onChange={e => setNewStreet(e.target.value)} placeholder="e.g. 402, Green Meadows Apt, Powai" required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <Input label="City *" value={newCity} onChange={e => setNewCity(e.target.value)} required />
                  <Input label="Pin Code *" value={newPostalCode} onChange={e => setNewPostalCode(e.target.value)} placeholder="400076" required />
                </div>
                <Input label="Landmark (Optional)" value={newLandmark} onChange={e => setNewLandmark(e.target.value)} placeholder="Near Hiranandani Hospital" />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowNewAddressForm(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" type="submit">Save Address</Button>
                </div>
              </form>
            ) : addresses.length === 0 ? (
              <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-main, #F7F9F7)', borderRadius: '12px', textAlign: 'center', border: '1px dashed var(--color-border, #E4EAE5)' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', margin: '0 0 10px 0' }}>No addresses saved yet.</p>
                <Button variant="secondary" size="sm" onClick={() => setShowNewAddressForm(true)}>+ Add Service Address</Button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {addresses.map(addr => (
                  <label
                    key={addr.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${selectedAddressId === addr.id ? 'var(--color-primary, #145C43)' : 'var(--color-border, #E4EAE5)'}`,
                      backgroundColor: selectedAddressId === addr.id ? 'var(--color-mint-light, #EAF6EF)' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="selectedAddress"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      style={{ accentColor: 'var(--color-primary, #145C43)', marginTop: '3px' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text, #17211C)' }}>
                        {addr.streetAddress}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary, #6B756F)' }}>
                        {addr.city}, {addr.state} - {addr.postalCode} {addr.landmark ? `(Near ${addr.landmark})` : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Schedule Date & Time Slot */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: 'var(--color-text, #17211C)' }}>
              Preferred Date & Time
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--color-text-secondary, #6B756F)' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setScheduledDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border, #E4EAE5)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--color-text-secondary, #6B756F)' }}>
                  Slot Time
                </label>
                <select
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border, #E4EAE5)',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="09:00">09:00 AM - 11:00 AM (Morning)</option>
                  <option value="11:30">11:30 AM - 01:30 PM (Midday)</option>
                  <option value="14:00">02:00 PM - 04:00 PM (Afternoon)</option>
                  <option value="16:30">04:30 PM - 06:30 PM (Evening)</option>
                  <option value="18:30">06:30 PM - 08:30 PM (Late Eve)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', color: 'var(--color-text-secondary, #6B756F)' }}>
              Special Notes / Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Please ring doorbell twice, main water valve is in balcony"
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid var(--color-border, #E4EAE5)',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
            <Button variant="primary" disabled={!selectedAddressId} onClick={() => setStep(3)}>Review Summary →</Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Summary */}
      {step === 3 && (
        <div>
          <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-main, #F7F9F7)', borderRadius: '12px', border: '1px solid var(--color-border, #E4EAE5)', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text, #17211C)', marginBottom: '4px' }}>
              {service.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', marginBottom: '12px' }}>
              📅 {scheduledDate} at {scheduledTime}
            </div>
            {selectedAddressId && (
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', paddingTop: '10px', borderTop: '1px solid #E4EAE5' }}>
                📍 {addresses.find(a => a.id === selectedAddressId)?.streetAddress}, {addresses.find(a => a.id === selectedAddressId)?.city}
              </div>
            )}
          </div>

          {/* Pricing Breakdown */}
          <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border, #E4EAE5)', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--color-text, #17211C)' }}>
              Transparent Bill Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', marginBottom: '6px' }}>
              <span>Base Service Fee</span>
              <span>₹{basePrice.toFixed(2)}</span>
            </div>
            {optionsDelta > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', marginBottom: '6px' }}>
                <span>Selected Add-ons</span>
                <span>₹{optionsDelta.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', marginBottom: '10px' }}>
              <span>GST / Taxes (18%)</span>
              <span>₹{gstTax.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary, #145C43)', paddingTop: '10px', borderTop: '1px solid var(--color-border, #E4EAE5)' }}>
              <span>Total Payable</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ padding: '12px 14px', backgroundColor: '#F2FAF5', borderRadius: '10px', border: '1px solid #CBE5D7', fontSize: '12px', color: 'var(--color-primary-dark, #0D3B2B)', marginBottom: '24px', display: 'flex', gap: '8px' }}>
            <span>🔒</span>
            <span>
              <strong>Two-OTP Protected:</strong> You will receive a 6-digit Start OTP to share with your verified professional when they arrive. Payment is settled securely upon your satisfaction.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
            <Button variant="primary" isLoading={isSubmitting} onClick={handleConfirmBooking}>
              Confirm & Book Service
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Success & Start OTP Display */}
      {step === 4 && createdBooking && (
        <div style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--color-mint-light, #EAF6EF)', color: 'var(--color-success, #188653)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>
            ✓
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text, #17211C)', marginBottom: '6px' }}>
            Booking Confirmed!
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary, #6B756F)', marginBottom: '20px' }}>
            Ref: <strong style={{ color: 'var(--color-text, #17211C)' }}>{createdBooking.referenceNumber}</strong>
          </p>

          {/* Prominent Start OTP Box */}
          {startOtp && (
            <div style={{ backgroundColor: 'var(--color-mint-light, #EAF6EF)', border: '2px dashed var(--color-primary-emerald, #16865D)', borderRadius: '16px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary-dark, #0D3B2B)', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Your Service Start OTP
              </div>
              <div style={{ fontSize: '36px', fontWeight: 900, color: 'var(--color-primary, #145C43)', letterSpacing: '6px', margin: '4px 0' }}>
                {startOtp}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-primary-dark, #0D3B2B)', maxWidth: '380px', margin: '8px auto 0' }}>
                🛡️ Share this code with the technician <strong>only after they arrive at your home</strong> to begin service.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button variant="primary" onClick={() => window.location.href = '/bookings'}>
              View in My Bookings →
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
