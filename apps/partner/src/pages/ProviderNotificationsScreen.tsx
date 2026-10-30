import React from 'react';
import { Icons } from '@homeservex/ui';

interface ProviderNotificationsScreenProps {
  onNavigate: (screen: string) => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: 'job' | 'check' | 'payment' | 'offer' | 'reminder';
}

export const ProviderNotificationsScreen: React.FC<ProviderNotificationsScreenProps> = ({
  onNavigate,
}) => {
  const notifications: NotificationItem[] = [
    {
      id: 'notif-1',
      title: 'New job assigned',
      description: 'AC Service & Repair • 2.4 km',
      time: '12:15 PM',
      icon: 'job',
    },
    {
      id: 'notif-2',
      title: 'Job completed',
      description: '#HSX123455 marked verified',
      time: '11:45 AM',
      icon: 'check',
    },
    {
      id: 'notif-3',
      title: 'Payment received',
      description: '₹249 • #HSX123455 credited to wallet',
      time: '11:40 AM',
      icon: 'payment',
    },
    {
      id: 'notif-4',
      title: 'New offer available',
      description: 'Get 15% OFF on appliance repair',
      time: '10:20 AM',
      icon: 'offer',
    },
    {
      id: 'notif-5',
      title: 'Reminder',
      description: 'Update your availability for tomorrow',
      time: '09:30 AM',
      icon: 'reminder',
    },
  ];

  const renderIcon = (type: NotificationItem['icon']) => {
    switch (type) {
      case 'job':
        return (
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EAF4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Briefcase size={18} color="#0E3E2F" />
          </div>
        );
      case 'check':
        return (
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.CheckCircle size={18} color="#15803D" />
          </div>
        );
      case 'payment':
        return (
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Wallet size={18} color="#D97706" />
          </div>
        );
      case 'offer':
        return (
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Gift size={18} color="#EA580C" />
          </div>
        );
      case 'reminder':
        return (
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icons.Clock size={18} color="#64748B" />
          </div>
        );
    }
  };

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', padding: '16px 16px 90px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icons.ArrowLeft size={18} color="#0F172A" />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Notifications
        </h1>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.map(item => (
          <div
            key={item.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '14px 16px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {renderIcon(item.icon)}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                  {item.title}
                </span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{item.time}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.3 }}>
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
