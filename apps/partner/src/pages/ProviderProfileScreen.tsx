import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface ProviderProfileScreenProps {
  onNavigate: (screen: string) => void;
}

type ModalType =
  | 'edit-profile'
  | 'documents'
  | 'service-areas'
  | 'availability'
  | 'bank-details'
  | 'change-password'
  | null;

export const ProviderProfileScreen: React.FC<ProviderProfileScreenProps> = ({
  onNavigate,
}) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [successToast, setSuccessToast] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  // Fetch real subscription status
  useEffect(() => {
    let isMounted = true;
    const fetchSubStatus = async () => {
      try {
        const token = localStorage.getItem('hsx_partner_token');
        const headers: Record<string, string> = {
          'x-role': 'PROVIDER',
          'x-app': 'partner',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const res = await fetch('/api/v1/providers/subscription/status', { headers });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data && isMounted) {
            setSubscriptionStatus(json.data);
          }
        }
      } catch {}
    };
    fetchSubStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // Editable Profile State
  const [profile, setProfile] = useState({
    name: 'Ramesh Kumar',
    role: 'Senior Certified AC Specialist',
    phone: '+91 98201 98765',
    email: 'ramesh.kumar@servicepartner.in',
    vehicle: 'Hero Electric (MH 02 CD 4821)',
    experience: '5 Years',
    jobsDone: 248,
    successRate: '98%',
  });

  // Editable Service Areas State
  const [serviceAreas, setServiceAreas] = useState<string[]>([
    'Joynagar (Active Hub)',
    'Salt Lake Sec V',
    'Park Street & Central Kolkata',
    'New Town Action Area I',
    'Jadavpur & South Kolkata',
  ]);

  // Editable Availability State
  const [availability, setAvailability] = useState({
    morningShift: true,
    eveningShift: true,
    autoAccept: true,
    vacationMode: false,
  });

  // Editable Bank State
  const [bankDetails, setBankDetails] = useState({
    bankName: 'State Bank of India',
    accountNumber: '•••• •••• •••• 4821',
    ifscCode: 'SBIN0004821',
    accountHolder: 'Ramesh Kumar',
    upiId: 'ramesh.kumar@okhdfcbank',
  });

  // Password State
  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirmPass: '',
  });

  const isPremium = subscriptionStatus?.membershipType === 'PREMIUM';

  const menuItems = [
    {
      id: 'subscription',
      label: 'Premium Membership (0% Commission)',
      icon: Icons.Crown,
      badge: isPremium ? 'ACTIVE' : '0% COMM',
      isNav: true,
      badgeColor: isPremium ? '#15803D' : '#D97706',
      badgeBg: isPremium ? '#DCFCE7' : '#FEF3C7',
    },
    { id: 'edit-profile', label: 'Edit Profile', icon: Icons.User },
    { id: 'documents', label: 'Documents (KYC)', icon: Icons.FileText },
    { id: 'service-areas', label: 'Service Areas', icon: Icons.MapPin },
    { id: 'availability', label: 'Availability', icon: Icons.Clock },
    { id: 'bank-details', label: 'Bank Details', icon: Icons.Wallet },
    { id: 'change-password', label: 'Change Password', icon: Icons.Lock },
  ];

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const handleToggleArea = (area: string) => {
    setServiceAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', padding: '16px 16px 90px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Profile
        </h1>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '6px',
          }}
        >
          <Icons.Settings size={20} color="#64748B" />
        </button>
      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#15803D',
            fontSize: '13px',
            fontWeight: 700,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>✓</span>
          <span>{successToast}</span>
        </div>
      )}

      {/* Profile Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px 16px',
          textAlign: 'center',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
          marginBottom: '16px',
        }}
      >
        <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto 12px' }}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
            alt={profile.name}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #EAF4EF',
            }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              backgroundColor: '#16A34A',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              border: '2px solid #FFFFFF',
            }}
          >
            ✓
          </span>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
          {profile.name}
        </h2>
        <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>
          {profile.role} • {profile.vehicle}
        </div>

        {/* Rating and Verified Pill */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              padding: '3px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <Icons.Star size={13} color="#D97706" fill="#D97706" />
            <span>4.8 (1.2k)</span>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              padding: '3px 8px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            <Icons.CheckCircle size={13} color="#15803D" />
            <span>Verified</span>
          </div>

          {isPremium ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#0E3E2F',
                color: '#FFFFFF',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <Icons.Crown size={13} color="#FBBF24" />
              <span>0% Comm (Premium)</span>
            </div>
          ) : (
            <div
              onClick={() => onNavigate('subscription')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#F1F5F9',
                color: '#475569',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>15% Commission</span>
            </div>
          )}
        </div>
      </div>

      {/* Track Record Metrics: 5 Years Exp. | 248 Jobs Done | 98% Success Rate */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '14px 8px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
        }}
      >
        <div style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{profile.experience}</div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Exp.</div>
        </div>
        <div style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{profile.jobsDone}</div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Jobs Done</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#16A34A' }}>{profile.successRate}</div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Success Rate</div>
        </div>
      </div>

      {/* Interactive Options List (6 items matching screenshot) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.isNav) {
                  onNavigate('subscription');
                } else {
                  setActiveModal(item.id as ModalType);
                }
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                border: 'none',
                borderBottom: idx !== menuItems.length - 1 ? '1px solid #F1F5F9' : 'none',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: item.id === 'subscription' ? '#DCFCE7' : '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={item.id === 'subscription' ? '#15803D' : '#0E3E2F'} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  {item.label}
                </span>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      backgroundColor: item.badgeBg,
                      color: item.badgeColor,
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <Icons.ChevronRight size={18} color="#94A3B8" />
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* 1. EDIT PROFILE MODAL */}
      {/* ============================================================== */}
      {activeModal === 'edit-profile' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Edit Partner Profile
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                style={{ border: 'none', background: '#F1F5F9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Specialization / Role
              </label>
              <input
                type="text"
                value={profile.role}
                onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Service Vehicle
                </label>
                <input
                  type="text"
                  value={profile.vehicle}
                  onChange={(e) => setProfile({ ...profile, vehicle: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setActiveModal(null);
                  triggerToast('Profile information successfully saved!');
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '24px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
              >
                Save Changes ➔
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '12px 20px', borderRadius: '24px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. DOCUMENTS (KYC) MODAL */}
      {/* ============================================================== */}
      {activeModal === 'documents' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Verification & KYC Documents
                </h2>
                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
                  ● 100% Verified Gold Partner
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ border: 'none', background: '#F1F5F9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { title: 'Aadhaar Identity Card', idNumber: 'UIDAI 8492-XXXX-4821', verifiedDate: 'Verified 12 Jan 2024' },
                { title: 'NSIC Skill AC Certification', idNumber: 'GRADE A+ • #SKL-88219', verifiedDate: 'Verified 04 Mar 2024' },
                { title: 'Police Clearance Certificate', idNumber: 'Kolkata Police Dept • #PCC-99120', verifiedDate: 'Verified 20 Feb 2024' },
                { title: 'Commercial Driving License', idNumber: 'WB-09-2018-912841', verifiedDate: 'Valid till Nov 2031' },
              ].map((doc, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{doc.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>{doc.idNumber} • {doc.verifiedDate}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '8px' }}>
                    VERIFIED ✓
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              style={{ width: '100%', padding: '12px', borderRadius: '24px', border: 'none', backgroundColor: '#0E3E2F', color: '#FFFFFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SERVICE AREAS MODAL */}
      {/* ============================================================== */}
      {activeModal === 'service-areas' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Service Operational Areas
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Select Kolkata zones you accept doorstep orders from:
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ border: 'none', background: '#F1F5F9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {[
                'Joynagar (Active Hub)',
                'Salt Lake Sec V',
                'Park Street & Central Kolkata',
                'New Town Action Area I',
                'Jadavpur & South Kolkata',
                'Howrah & Shibpur',
                'Behala & Taratala',
                'Dum Dum & Airport',
              ].map((area) => {
                const isSelected = serviceAreas.includes(area);
                return (
                  <button
                    key={area}
                    onClick={() => handleToggleArea(area)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: isSelected ? '1px solid #16A34A' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#DCFCE7' : '#FFFFFF',
                      color: isSelected ? '#15803D' : '#475569',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{area}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setActiveModal(null);
                  triggerToast('Operational service zones updated successfully!');
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '24px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
              >
                Save Active Zones ➔
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '12px 20px', borderRadius: '24px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. AVAILABILITY MODAL */}
      {/* ============================================================== */}
      {activeModal === 'availability' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Working Shifts & Availability
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Manage your working schedule and auto-dispatch rules
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ border: 'none', background: '#F1F5F9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Morning Shift</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>08:00 AM – 02:00 PM</div>
                </div>
                <input
                  type="checkbox"
                  checked={availability.morningShift}
                  onChange={(e) => setAvailability({ ...availability, morningShift: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Evening Shift</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>02:00 PM – 08:00 PM</div>
                </div>
                <input
                  type="checkbox"
                  checked={availability.eveningShift}
                  onChange={(e) => setAvailability({ ...availability, eveningShift: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Auto-Accept Instant Jobs</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Automatically assign nearby urgent orders within 3 km</div>
                </div>
                <input
                  type="checkbox"
                  checked={availability.autoAccept}
                  onChange={(e) => setAvailability({ ...availability, autoAccept: e.target.checked })}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setActiveModal(null);
                  triggerToast('Working hours & auto-dispatch updated!');
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '24px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
              >
                Save Availability ➔
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '12px 20px', borderRadius: '24px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. BANK DETAILS MODAL */}
      {/* ============================================================== */}
      {activeModal === 'bank-details' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Bank & Payout Settlement
                </h2>
                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
                  ● Instant IMPS & UPI Active
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                style={{ border: 'none', background: '#F1F5F9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Bank Name
              </label>
              <input
                type="text"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankDetails.ifscCode}
                  onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value })}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                UPI ID (VPA)
              </label>
              <input
                type="text"
                value={bankDetails.upiId}
                onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: 600 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  setActiveModal(null);
                  triggerToast('Bank & settlement details successfully updated!');
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '24px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
              >
                Save Bank Details ➔
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '12px 20px', borderRadius: '24px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. CHANGE PASSWORD MODAL */}
      {/* ============================================================== */}
      {activeModal === 'change-password' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Change Account Password
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                style={{ border: 'none', background: '#F1F5F9', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Current Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwords.newPass}
                onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwords.confirmPass}
                onChange={(e) => setPasswords({ ...passwords, confirmPass: e.target.value })}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                onClick={() => {
                  if (!passwords.newPass) {
                    alert('Please enter a new password.');
                    return;
                  }
                  if (passwords.newPass !== passwords.confirmPass) {
                    alert('New password and confirmation do not match.');
                    return;
                  }
                  setActiveModal(null);
                  setPasswords({ current: '', newPass: '', confirmPass: '' });
                  triggerToast('Password updated securely!');
                }}
                style={{ flex: 1, padding: '12px', borderRadius: '24px', border: 'none', backgroundColor: '#16A34A', color: '#FFFFFF', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
              >
                Update Password ➔
              </button>
              <button
                onClick={() => setActiveModal(null)}
                style={{ padding: '12px 20px', borderRadius: '24px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
