import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

interface CustomerAccountScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  onLogout?: () => void;
}

export const CustomerAccountScreen: React.FC<CustomerAccountScreenProps> = ({ onNavigate, onLogout }) => {
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: <Icons.User size={18} color="#16A34A" /> },
    { id: 'addresses', label: 'My Addresses', icon: <Icons.MapPin size={18} color="#16A34A" /> },
    { id: 'orders', label: 'My Orders', icon: <Icons.ShoppingBag size={18} color="#16A34A" /> },
    { id: 'offers', label: 'My Offers', icon: <Icons.Tag size={18} color="#16A34A" /> },
    { id: 'wallet', label: 'Wallet & Payments', icon: <Icons.Wallet size={18} color="#16A34A" /> },
    { id: 'support', label: 'Support & Help', icon: <Icons.Headphones size={18} color="#16A34A" /> },
    { id: 'settings', label: 'Settings', icon: <Icons.Settings size={18} color="#16A34A" /> },
  ];

  const [supportMessages, setSupportMessages] = useState<any[]>([
    {
      id: 'msg-init-1',
      sender: 'admin',
      senderName: 'Priya Sharma (Admin Support Desk)',
      message: 'Hello Soumyajit! 👋 Welcome to HomeServeX 24/7 Priority Support. We are connected live with the Admin Dispatch team. How can we assist you today?',
      timestamp: 'Just now',
    },
  ]);
  const [supportInput, setSupportInput] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const fetchSupportMessages = () => {
    fetch('/api/v1/customers/support/messages')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          setSupportMessages(json.data);
        }
      })
      .catch(() => {});
  };

  const handleSendSupportMessage = async () => {
    if (!supportInput.trim() || isSendingSupport) return;
    const text = supportInput.trim();
    setSupportInput('');
    setIsSendingSupport(true);

    const tempMsg = {
      id: `local-${Date.now()}`,
      sender: 'customer',
      senderName: 'You',
      message: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setSupportMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/v1/customers/support/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        setTimeout(fetchSupportMessages, 1200);
      }
    } catch (e) {
      console.warn('[HomeServeX Support] Send error:', e);
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleMenuClick = (id: string) => {
    if (id === 'orders') onNavigate('orders');
    else if (id === 'offers') onNavigate('offers');
    else {
      setActiveModal(id);
      if (id === 'support') fetchSupportMessages();
    }
  };

  const handleInvite = () => {
    navigator.clipboard.writeText('https://homeservex.com/ref/SOUMYA100');
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  const [profile, setProfile] = useState<any>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken') || localStorage.getItem('hsx_customer_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/v1/customers/profile', { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data) {
          setProfile(data.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', paddingBottom: '90px' }}>

      {/* User Profile Header Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundColor: '#0E3E2F',
            border: '2px solid #86EFAC',
            flexShrink: 0,
          }}
        >
          <img
            src="/hero-technician.jpg"
            alt="Soumyajit Sarkar"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px 0' }}>
            {profile?.user?.name || 'Soumyajit Sarkar'}
          </h3>
          <div style={{ fontSize: '12px', color: '#64748B' }}>{profile?.user?.email || 'soumyajit@gmail.com'}</div>
          <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, marginTop: '2px' }}>
            VIP Member
          </div>
        </div>
      </div>

      {/* Profile Navigation List */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        {menuItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => handleMenuClick(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: idx < menuItems.length - 1 ? '1px solid #F1F5F9' : 'none',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#EAF4EF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>
                {item.label}
              </span>
            </div>

            <Icons.ChevronRight size={16} color="#94A3B8" />
          </div>
        ))}
      </div>

      {/* Refer & Earn Card */}
      <div
        style={{
          backgroundColor: '#EAF4EF',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #D5E8DF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, paddingRight: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '18px' }}>🎁</span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0E3E2F' }}>Refer &amp; Earn</span>
          </div>
          <p style={{ fontSize: '11px', color: '#166534', margin: '0 0 10px 0', lineHeight: 1.3 }}>
            Get ₹100 for every successful referral when they book.
          </p>
          <button
            onClick={handleInvite}
            style={{
              backgroundColor: '#0E3E2F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '20px',
              padding: '7px 16px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {copiedReferral ? 'Link Copied!' : 'Invite Now'}
          </button>
        </div>

        <div style={{ fontSize: '48px', opacity: 0.9 }}>
          📦
        </div>
      </div>

      {/* Logout Action */}
      <button
        onClick={() => {
          if (onLogout) onLogout();
          else alert('Logged out successfully.');
        }}
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '12px',
          borderRadius: '16px',
          border: '1px solid #FEE2E2',
          backgroundColor: '#FFFFFF',
          color: '#DC2626',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Icons.LogOut size={16} color="#DC2626" />
        <span>Log Out</span>
      </button>

      {/* Sub-modal for Profile / Addresses / Settings */}
      {activeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '22px',
              width: '100%',
              maxWidth: activeModal === 'support' ? '460px' : '340px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
                {menuItems.find(m => m.id === activeModal)?.label || 'Details'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {activeModal === 'addresses' ? (
              <div style={{ fontSize: '12px', color: '#334155' }}>
                {(() => {
                  let loc: any = null;
                  try {
                    const saved = localStorage.getItem('hsx_user_location');
                    if (saved) loc = JSON.parse(saved);
                  } catch {}
                  return (
                    <div style={{ padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #86EFAC', marginBottom: '8px' }}>
                      <div style={{ fontWeight: 800, color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                        <span>📍</span>
                        <span>{loc?.isGps ? 'Live GPS Location (Active)' : 'Active Doorstep Address'}</span>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{loc?.title || 'Salt Lake Sector V'}</div>
                      <div style={{ color: '#64748B', marginTop: '2px' }}>{loc?.subtitle || 'Kolkata, WB 700091'}</div>
                    </div>
                  );
                })()}
              </div>
            ) : activeModal === 'wallet' ? (
              <div style={{ fontSize: '12px', color: '#334155', textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E3E2F', marginBottom: '4px' }}>₹1,250.00</div>
                <div style={{ color: '#64748B', marginBottom: '14px' }}>HomeServeX Credits Balance</div>
                <button
                  onClick={() => alert('Razorpay / UPI top-up activated')}
                  style={{
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Add Money
                </button>
              </div>
            ) : activeModal === 'support' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* 24/7 Live Status Banner */}
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        position: 'relative',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        backgroundColor: '#0E3E2F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      PS
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          right: 0,
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#16A34A',
                          border: '2px solid #FFFFFF',
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                        Priya Sharma • Admin Desk
                      </div>
                      <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>
                        🟢 24/7 Live Support Specialist Online
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      padding: '3px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    Reply &lt; 1m
                  </span>
                </div>

                {/* Instant Contact Channels */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <a
                    href="tel:1800200479"
                    style={{
                      textDecoration: 'none',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#0F172A',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>📞</span>
                    <span style={{ fontSize: '11px', fontWeight: 800 }}>Toll-Free Call</span>
                    <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>1800-200-HSX</span>
                  </a>

                  <a
                    href="https://wa.me/919876543210?text=Hello%20HomeServeX%20Support,%20I%20need%20assistance%20with%20my%20service"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: 'none',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#0F172A',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>💬</span>
                    <span style={{ fontSize: '11px', fontWeight: 800 }}>WhatsApp Concierge</span>
                    <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>+91 98765 43210</span>
                  </a>
                </div>

                {/* Live Chat Thread Box */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '14px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>LIVE CONVERSATION WITH ADMIN</span>
                    <span style={{ fontSize: '10px', color: '#16A34A' }}>Encrypted &amp; Priority</span>
                  </div>

                  {/* Messages Stream */}
                  <div
                    style={{
                      maxHeight: '170px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      paddingRight: '4px',
                    }}
                  >
                    {supportMessages.map((msg) => {
                      const isAdmin = msg.sender === 'admin';
                      return (
                        <div
                          key={msg.id}
                          style={{
                            alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                            maxWidth: '85%',
                            backgroundColor: isAdmin ? '#FFFFFF' : '#0E3E2F',
                            color: isAdmin ? '#0F172A' : '#FFFFFF',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            border: isAdmin ? '1px solid #E2E8F0' : 'none',
                            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                            fontSize: '12px',
                            lineHeight: 1.4,
                          }}
                        >
                          {isAdmin && (
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#16A34A', marginBottom: '2px' }}>
                              {msg.senderName}
                            </div>
                          )}
                          <div>{msg.message}</div>
                          <div
                            style={{
                              fontSize: '9px',
                              color: isAdmin ? '#94A3B8' : '#86EFAC',
                              textAlign: 'right',
                              marginTop: '3px',
                            }}
                          >
                            {msg.timestamp}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chat Input Bar */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="Type your message or issue..."
                      value={supportInput}
                      onChange={(e) => setSupportInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendSupportMessage();
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '20px',
                        border: '1px solid #CBD5E1',
                        fontSize: '12px',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                    <button
                      onClick={handleSendSupportMessage}
                      disabled={isSendingSupport || !supportInput.trim()}
                      style={{
                        backgroundColor: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: isSendingSupport || !supportInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: isSendingSupport || !supportInput.trim() ? 0.6 : 1,
                      }}
                    >
                      Send
                    </button>
                  </div>
                </div>

                {/* Instant Resolution Shortcuts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      onNavigate('orders');
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    <span>🛵 Track &amp; Report Issue with Ongoing Booking</span>
                    <span style={{ color: '#16A34A' }}>&gt;</span>
                  </button>

                  <button
                    onClick={() => {
                      alert('30-Day Doorstep Warranty Claim #CLM-4910 registered. An admin supervisor will contact you.');
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer',
                    }}
                  >
                    <span>🛡️ Claim 30-Day Quality Warranty Revisit</span>
                    <span style={{ color: '#16A34A' }}>&gt;</span>
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                Preferences and account controls are active and synced with your cloud profile.
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                borderRadius: '20px',
                backgroundColor: '#0E3E2F',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
