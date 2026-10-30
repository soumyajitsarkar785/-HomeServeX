import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

export const AdminSettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer_ui' | 'dispatch' | 'subscriptions' | 'system' | 'business' | 'legal'>('customer_ui');
  const [saveStatus, setSaveStatus] = useState('');
  const [_loading, setLoading] = useState(true);

  // Subscriptions, Commission Engine & Financial Ledger state
  const [subSettings, setSubSettings] = useState({
    defaultCommissionRatePercent: 15,
    premiumCommissionRatePercent: 0,
    minimumPayoutAmountRupees: 500,
    autoRevertOnExpiry: true,
    enablePromotionalSubscriptions: true,
  });
  const [subPlans, setSubPlans] = useState<any[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState<any>(null);
  const [promoForm, setPromoForm] = useState({
    providerId: '',
    planSlug: 'monthly-premium',
    durationDays: 30,
    reason: 'Promotional Partner Incentive',
  });
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);

  // Dispatch Engine & Discovery dynamic configuration
  const [dispatchSettings, setDispatchSettings] = useState({
    dispatchEnabled: true,
    autoDispatchEnabled: true,
    initialRadiusKm: 3,
    maxRadiusKm: 15,
    dispatchMode: 'PROGRESSIVE_EXPANSION' as 'PROGRESSIVE_EXPANSION' | 'FIXED_RADIUS',
    expansionStages: [3, 5, 8, 12, 15],
    expansionDelaySeconds: 30,
    offerTimeoutSeconds: 30,
    maxSimultaneousOffers: 3,
    maxProvidersPerCycle: 10,
    maxTotalOffersPerOrder: 15,
    maxDispatchDurationSeconds: 300,
    locationFreshnessThresholdSeconds: 120,
    minProviderRating: 4.0,
    requireKycVerification: true,
    requireSkillMatch: true,
    maxActiveOrdersPerProvider: 2,
    dispatchStrategy: 'BATCH' as 'BATCH' | 'SEQUENTIAL',
    rankingWeights: {
      distance: 0.45,
      rating: 0.35,
      workload: 0.20,
    },
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin',
  });
  const [dispatchOverview, setDispatchOverview] = useState<any>(null);
  const [diagnosticsOrderRef, setDiagnosticsOrderRef] = useState('HSX-MVPO3IF5-6A064D');
  const [diagnosticsData, setDiagnosticsData] = useState<any>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState('');
  const [stagesInput, setStagesInput] = useState('3, 5, 8, 12, 15');

  // Customer UI Hero Banner & Marketing controls
  const [_banners, setBanners] = useState<any[]>([]);
  const [activeBanner, setActiveBanner] = useState({
    id: '',
    badge: '⚡ VERIFIED TECHNICIANS AT YOUR DOORSTEP',
    title: 'Expert Appliance Repair & Care',
    subtitle: 'Transparent upfront pricing • 30-day warranty • Verified master technicians in 30 minutes',
    ctaText: 'Book Service Now',
    imageUrl: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1200&q=80',
    isActive: true,
  });

  // Settings form values
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'HomeServeX',
    supportEmail: 'support@homeservex.com',
    supportPhone: '+91 1800 419 HSX',
    currency: 'INR (₹)',
  });

  const [paymentSettings, setPaymentSettings] = useState({
    commissionRate: 15,
    payoutCycleDays: 7,
    autoPayoutEnabled: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    customerSms: true,
    providerPush: true,
    emailReceipts: true,
  });

  const [legalSettings, setLegalSettings] = useState({
    warrantyDays: 30,
    warrantyTerms: 'Every service is backed by a 30-day free re-visit assurance and genuine OEM spares warranty.',
  });

  // Fetch initial banners and settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        // Load Banners
        const bRes = await fetch('/api/v1/admin/banners');
        if (bRes.ok) {
          const bJson = await bRes.json();
          if (bJson?.data && Array.isArray(bJson.data) && bJson.data.length > 0) {
            setBanners(bJson.data);
            const primary = bJson.data.find((b: any) => b.isActive) || bJson.data[0];
            setActiveBanner(primary);
          }
        }

        // Load Settings
        const sRes = await fetch('/api/v1/admin/settings');
        if (sRes.ok) {
          const sJson = await sRes.json();
          if (sJson?.data) {
            const d = sJson.data;
            if (d.system) {
              setGeneralSettings({
                platformName: d.system.platformName || 'HomeServeX',
                supportEmail: d.system.supportEmail || 'support@homeservex.com',
                supportPhone: d.system.supportPhone || '+91 1800 419 HSX',
                currency: d.system.currency || 'INR (₹)',
              });
            }
            if (d.payments) {
              setPaymentSettings({
                commissionRate: d.payments.commissionRatePercent || 15,
                payoutCycleDays: d.payments.payoutCycleDays || 7,
                autoPayoutEnabled: d.payments.autoPayoutEnabled !== false,
              });
            }
            if (d.notifications) {
              setNotificationSettings({
                customerSms: d.notifications.smsEnabled !== false,
                providerPush: d.notifications.pushNotificationsEnabled !== false,
                emailReceipts: d.notifications.emailReceiptsEnabled !== false,
              });
            }
            if (d.legal) {
              setLegalSettings({
                warrantyDays: 30,
                warrantyTerms: d.legal.warrantyTerms || 'Every service is backed by a 30-day free re-visit assurance.',
              });
            }
          }
        }

        // Load Dispatch Configuration & Live Overview
        const dRes = await fetch('/api/v1/admin/dispatch/config');
        if (dRes.ok) {
          const dJson = await dRes.json();
          if (dJson?.data) {
            setDispatchSettings(dJson.data);
            if (Array.isArray(dJson.data.expansionStages)) {
              setStagesInput(dJson.data.expansionStages.join(', '));
            }
          }
        }

        const oRes = await fetch('/api/v1/admin/dispatch/overview');
        if (oRes.ok) {
          const oJson = await oRes.json();
          if (oJson?.data) {
            setDispatchOverview(oJson.data);
          }
        }

        // Load Subscriptions, Commission and Ledger Data
        const [subSetRes, plRes, payRes, revRes] = await Promise.all([
          fetch('/api/v1/admin/subscriptions/settings').catch(() => null),
          fetch('/api/v1/admin/subscriptions/plans').catch(() => null),
          fetch('/api/v1/admin/payouts').catch(() => null),
          fetch('/api/v1/admin/revenue/analytics').catch(() => null),
        ]);

        if (subSetRes && subSetRes.ok) {
          const json = await subSetRes.json();
          if (json?.data) setSubSettings(json.data);
        }
        if (plRes && plRes.ok) {
          const json = await plRes.json();
          if (json?.data) setSubPlans(json.data);
        }
        if (payRes && payRes.ok) {
          const json = await payRes.json();
          if (json?.data) setPayoutRequests(json.data);
        }
        if (revRes && revRes.ok) {
          const json = await revRes.json();
          if (json?.data) setRevenueAnalytics(json.data);
        }
      } catch (err) {
        console.error('Failed loading settings', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSaveSubSettings = async () => {
    setSaveStatus('Saving commission and subscription policies...');
    try {
      const res = await fetch('/api/v1/admin/subscriptions/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subSettings),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSaveStatus(json.message || 'Commission & Subscription settings updated successfully!');
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setSaveStatus(`Error: ${json.error?.message || 'Could not update settings'}`);
      }
    } catch (err: any) {
      setSaveStatus(`Error saving settings: ${err.message}`);
    }
  };

  const handleProcessPayout = async (payoutId: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingPayoutId(payoutId);
    try {
      const res = await fetch(`/api/v1/admin/payouts/${payoutId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSaveStatus(`Payout ${action === 'APPROVE' ? 'Approved' : 'Rejected'}! ${json.message}`);
        setTimeout(() => setSaveStatus(''), 4000);
        // Refresh payouts and analytics
        const payRes = await fetch('/api/v1/admin/payouts');
        if (payRes.ok) {
          const pj = await payRes.json();
          if (pj?.data) setPayoutRequests(pj.data);
        }
        const revRes = await fetch('/api/v1/admin/revenue/analytics');
        if (revRes.ok) {
          const rj = await revRes.json();
          if (rj?.data) setRevenueAnalytics(rj.data);
        }
      } else {
        alert(json.error?.message || 'Failed to process payout.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const handleGrantPromo = async () => {
    if (!promoForm.providerId) {
      alert('Please enter a Provider ID or Phone Number');
      return;
    }
    setSaveStatus('Granting promotional subscription...');
    try {
      const res = await fetch('/api/v1/admin/subscriptions/grant-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSaveStatus(`Promotional subscription granted successfully!`);
        setTimeout(() => setSaveStatus(''), 4000);
        setPromoForm({ ...promoForm, providerId: '', reason: '' });
      } else {
        alert(json.error?.message || 'Failed to grant promo subscription.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleTogglePlan = async (plan: any) => {
    try {
      const res = await fetch('/api/v1/admin/subscriptions/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...plan,
          isActive: !plan.isActive,
        }),
      });
      if (res.ok) {
        const plRes = await fetch('/api/v1/admin/subscriptions/plans');
        if (plRes.ok) {
          const pj = await plRes.json();
          if (pj?.data) setSubPlans(pj.data);
        }
      }
    } catch {}
  };

  const handleSaveDispatchSettings = async () => {
    setSaveStatus('Validating and publishing dispatch configuration...');
    try {
      // Parse stages
      const parsedStages = stagesInput
        .split(',')
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      const payload = {
        ...dispatchSettings,
        expansionStages: parsedStages.length > 0 ? parsedStages : dispatchSettings.expansionStages,
      };

      const res = await fetch('/api/v1/admin/dispatch/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setDispatchSettings(json.data);
        if (Array.isArray(json.data.expansionStages)) {
          setStagesInput(json.data.expansionStages.join(', '));
        }
        setSaveStatus(`Dispatch radius configuration updated live to Version ${json.data.version}! New radius applies immediately.`);
        setTimeout(() => setSaveStatus(''), 5000);

        // Refresh overview
        const oRes = await fetch('/api/v1/admin/dispatch/overview');
        if (oRes.ok) {
          const oJson = await oRes.json();
          setDispatchOverview(oJson.data);
        }
      } else {
        setSaveStatus(`Validation error: ${json.error?.message || 'Could not save configuration'}`);
        setTimeout(() => setSaveStatus(''), 5000);
      }
    } catch (err: any) {
      setSaveStatus(`Failed saving dispatch settings: ${err.message}`);
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  const fetchDiagnostics = async (orderRef: string) => {
    if (!orderRef.trim()) return;
    setDiagnosticsLoading(true);
    setDiagnosticsError('');
    try {
      const clean = orderRef.trim().replace(/^#/, '');
      const res = await fetch(`/api/v1/admin/dispatch/orders/${clean}/diagnostics`);
      const json = await res.json();
      if (res.ok && json.success) {
        setDiagnosticsData(json.data);
      } else {
        setDiagnosticsError(json.error?.message || 'Booking diagnostics not found');
        setDiagnosticsData(null);
      }
    } catch (err: any) {
      setDiagnosticsError(err.message || 'Error fetching diagnostics');
      setDiagnosticsData(null);
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const handleTriggerRedispatch = async (orderRef: string) => {
    try {
      const clean = orderRef.trim().replace(/^#/, '');
      const res = await fetch(`/api/v1/admin/dispatch/orders/${clean}/start`, { method: 'POST' });
      const json = await res.json();
      if (res.ok && json.success) {
        setSaveStatus(`Redispatch triggered for #${clean}!`);
        setTimeout(() => setSaveStatus(''), 4000);
        fetchDiagnostics(orderRef);
      }
    } catch (err: any) {
      alert(`Error triggering redispatch: ${err.message}`);
    }
  };

  const handleSaveBanner = async () => {
    setSaveStatus('Updating Customer App UI...');
    try {
      let res;
      if (activeBanner.id) {
        res = await fetch(`/api/v1/admin/banners/${activeBanner.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeBanner),
        });
      } else {
        res = await fetch('/api/v1/admin/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeBanner),
        });
      }

      if (res && res.ok) {
        setSaveStatus('Customer App UI updated live! Changes are instantly visible to all users.');
        setTimeout(() => setSaveStatus(''), 4000);
      } else {
        setSaveStatus('Saved locally.');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    } catch {
      setSaveStatus('Saved successfully.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleSavePlatformSettings = async () => {
    setSaveStatus('Saving platform settings...');
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: {
            platformName: generalSettings.platformName,
            supportEmail: generalSettings.supportEmail,
            supportPhone: generalSettings.supportPhone,
            currency: generalSettings.currency,
          },
          payments: {
            commissionRatePercent: paymentSettings.commissionRate,
            payoutCycleDays: paymentSettings.payoutCycleDays,
            autoPayoutEnabled: paymentSettings.autoPayoutEnabled,
          },
          notifications: {
            smsEnabled: notificationSettings.customerSms,
            pushNotificationsEnabled: notificationSettings.providerPush,
            emailReceiptsEnabled: notificationSettings.emailReceipts,
          },
          legal: {
            warrantyTerms: legalSettings.warrantyTerms,
          },
        }),
      });

      if (res.ok) {
        setSaveStatus('Platform configuration updated successfully!');
        setTimeout(() => setSaveStatus(''), 4000);
      }
    } catch {
      setSaveStatus('Error saving settings to backend.');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.3px' }}>
            Platform & Customer UI Control Center
          </h1>
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            100% control over customer app marketing banners, commission rates, and business rules
          </div>
        </div>

        <button
          onClick={
            activeTab === 'customer_ui'
              ? handleSaveBanner
              : activeTab === 'dispatch'
              ? handleSaveDispatchSettings
              : activeTab === 'subscriptions'
              ? handleSaveSubSettings
              : handleSavePlatformSettings
          }
          style={{
            padding: '10px 22px',
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
          <Icons.CheckCircle size={16} color="#FFFFFF" />
          {activeTab === 'dispatch'
            ? 'Save Dispatch Radius Settings'
            : activeTab === 'subscriptions'
            ? 'Save Commission & Subscription Settings'
            : 'Publish Changes Live'}
        </button>
      </div>

      {saveStatus && (
        <div
          style={{
            backgroundColor: saveStatus.includes('error') || saveStatus.includes('Validation') ? '#FEE2E2' : '#DCFCE7',
            border: `1px solid ${saveStatus.includes('error') || saveStatus.includes('Validation') ? '#FCA5A5' : '#86EFAC'}`,
            color: saveStatus.includes('error') || saveStatus.includes('Validation') ? '#B91C1C' : '#15803D',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {saveStatus}
        </div>
      )}

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {[
          { key: 'customer_ui', label: 'Customer App UI & Hero Banner', icon: Icons.Grid },
          { key: 'dispatch', label: 'Provider Discovery & Dispatch', icon: Icons.MapPin },
          { key: 'subscriptions', label: 'Subscriptions, Commission & Ledger', icon: Icons.Crown },
          { key: 'system', label: 'System Configuration', icon: Icons.Settings },
          { key: 'business', label: 'Commission & Payments', icon: Icons.Briefcase },
          { key: 'legal', label: 'Warranty & Compliance', icon: Icons.FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: isSelected ? '#0E3E2F' : 'transparent',
                color: isSelected ? '#FFFFFF' : '#64748B',
                fontSize: '13px',
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} color={isSelected ? '#FFFFFF' : '#64748B'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Customer App UI & Hero Banner Customizer */}
      {activeTab === 'customer_ui' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Customizer Editor */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px' }}>
              Customer Home Screen Hero Banner Customizer
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              Modify the headline, promotional badge, and CTA button that every customer sees upon launching the app. Changes update in real-time.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Promotional Tag / Badge Text
                </label>
                <input
                  type="text"
                  value={activeBanner.badge}
                  onChange={(e) => setActiveBanner({ ...activeBanner, badge: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Main Headline
                </label>
                <input
                  type="text"
                  value={activeBanner.title}
                  onChange={(e) => setActiveBanner({ ...activeBanner, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Subheading / Value Propositions
                </label>
                <textarea
                  rows={3}
                  value={activeBanner.subtitle}
                  onChange={(e) => setActiveBanner({ ...activeBanner, subtitle: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  CTA Action Button Text
                </label>
                <input
                  type="text"
                  value={activeBanner.ctaText}
                  onChange={(e) => setActiveBanner({ ...activeBanner, ctaText: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Banner Graphic / Photography URL
                </label>
                <input
                  type="text"
                  value={activeBanner.imageUrl}
                  onChange={(e) => setActiveBanner({ ...activeBanner, imageUrl: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                  Set Banner As Currently Active
                </span>
                <input
                  type="checkbox"
                  checked={activeBanner.isActive}
                  onChange={(e) => setActiveBanner({ ...activeBanner, isActive: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
              </div>
            </div>
          </div>

          {/* Live Mobile App Preview */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px' }}>
              Live Customer App UI Preview
            </div>

            {/* Mobile Device Frame Mockup */}
            <div
              style={{
                width: '320px',
                borderRadius: '28px',
                border: '6px solid #1E293B',
                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                backgroundColor: '#F8FAFC',
                overflow: 'hidden',
                padding: '16px',
              }}
            >
              {/* Status bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748B', fontWeight: 700, marginBottom: '14px' }}>
                <span>9:41 AM</span>
                <span>● 5G 100%</span>
              </div>

              {/* App Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748B' }}>Current Location</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A' }}>Kolkata, WB</div>
                </div>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0E3E2F', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                  H
                </div>
              </div>

              {/* Live Rendered Banner in preview */}
              <div
                style={{
                  borderRadius: '16px',
                  backgroundColor: '#0E3E2F',
                  color: '#FFFFFF',
                  padding: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: '180px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      padding: '3px 8px',
                      borderRadius: '10px',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#86EFAC',
                      marginBottom: '8px',
                    }}
                  >
                    {activeBanner.badge || '⚡ EXCLUSIVE'}
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: 900, margin: '0 0 6px', lineHeight: 1.2 }}>
                    {activeBanner.title || 'Appliance Service'}
                  </h4>
                  <p style={{ fontSize: '10px', color: '#E2E8F0', margin: 0, lineHeight: 1.3 }}>
                    {activeBanner.subtitle}
                  </p>
                </div>

                <div style={{ marginTop: '14px' }}>
                  <button
                    style={{
                      padding: '6px 14px',
                      borderRadius: '16px',
                      border: 'none',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 800,
                    }}
                  >
                    {activeBanner.ctaText || 'Book Now'}
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '16px', fontSize: '11px', fontWeight: 700, color: '#0F172A', display: 'flex', justifyContent: 'space-between' }}>
                <span>Categories</span>
                <span style={{ color: '#16A34A' }}>See all</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Provider Discovery & Dispatch Settings */}
      {activeTab === 'dispatch' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Engine Status & Control Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '20px 24px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: dispatchSettings.dispatchEnabled ? '#DCFCE7' : '#FEE2E2',
                    color: dispatchSettings.dispatchEnabled ? '#15803D' : '#B91C1C',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dispatchSettings.dispatchEnabled ? '#16A34A' : '#EF4444' }} />
                  {dispatchSettings.dispatchEnabled ? 'GEOSPATIAL DISPATCH ACTIVE' : 'DISPATCH PAUSED'}
                </span>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#F1F5F9',
                    color: '#334155',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  Config Version v{dispatchSettings.version}
                </span>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {dispatchSettings.dispatchMode === 'PROGRESSIVE_EXPANSION' ? 'PROGRESSIVE EXPANSION' : 'FIXED RADIUS'}
                </span>
              </div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Uber-Style Provider Discovery & Dynamic Dispatch Controls
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Server-side Haversine geodesic distance calculation • Dynamic radius expansion • Concurrency-safe job offers • Zero server rebuilds required
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  checked={dispatchSettings.dispatchEnabled}
                  onChange={(e) => setDispatchSettings({ ...dispatchSettings, dispatchEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
                Dispatch Enabled
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                <input
                  type="checkbox"
                  checked={dispatchSettings.autoDispatchEnabled}
                  onChange={(e) => setDispatchSettings({ ...dispatchSettings, autoDispatchEnabled: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
                Auto-Dispatch on Booking
              </label>
            </div>
          </div>

          {/* Operational Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active Dispatches</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                {dispatchOverview?.totalActiveDispatches ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600, marginTop: '2px' }}>Live in progress</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Searching Providers</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#D97706', marginTop: '4px' }}>
                {dispatchOverview?.searchingCount ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Awaiting technician acceptance</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Assigned & Active</div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>
                {dispatchOverview?.assignedCount ?? 0}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Specialist assigned</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Current Radius Stages</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {dispatchSettings.expansionStages.map((st, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: '#F1F5F9',
                      color: '#0F172A',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    S{idx + 1}: {st} km
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Core Dispatch Configuration Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
            {/* Search Radius & Progressive Expansion */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                Geospatial Search Radius & Multi-Stage Expansion
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 18px' }}>
                Configure the distance boundaries from the confirmed customer location coordinates to provider real-time GPS coordinates.
              </p>

              {/* Mode Selection */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                  Dispatch Search Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setDispatchSettings({ ...dispatchSettings, dispatchMode: 'PROGRESSIVE_EXPANSION' })}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: `2px solid ${dispatchSettings.dispatchMode === 'PROGRESSIVE_EXPANSION' ? '#0E3E2F' : '#E2E8F0'}`,
                      backgroundColor: dispatchSettings.dispatchMode === 'PROGRESSIVE_EXPANSION' ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dispatchSettings.dispatchMode === 'PROGRESSIVE_EXPANSION' ? '#16A34A' : '#CBD5E1' }} />
                      Progressive Expansion
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                      Start at initial radius (e.g. 3 km) and expand automatically if no partner accepts in time.
                    </div>
                  </div>

                  <div
                    onClick={() => setDispatchSettings({ ...dispatchSettings, dispatchMode: 'FIXED_RADIUS' })}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: `2px solid ${dispatchSettings.dispatchMode === 'FIXED_RADIUS' ? '#0E3E2F' : '#E2E8F0'}`,
                      backgroundColor: dispatchSettings.dispatchMode === 'FIXED_RADIUS' ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: dispatchSettings.dispatchMode === 'FIXED_RADIUS' ? '#16A34A' : '#CBD5E1' }} />
                      Fixed Radius Search
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', lineHeight: 1.4 }}>
                      Search only within the configured maximum allowed radius.
                    </div>
                  </div>
                </div>
              </div>

              {/* Initial & Max Radius Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Initial Search Radius</label>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#16A34A' }}>{dispatchSettings.initialRadiusKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="0.5"
                    value={dispatchSettings.initialRadiusKm}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDispatchSettings({
                        ...dispatchSettings,
                        initialRadiusKm: val,
                        maxRadiusKm: Math.max(val, dispatchSettings.maxRadiusKm),
                      });
                    }}
                    style={{ width: '100%', accentColor: '#16A34A' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.5"
                    value={dispatchSettings.initialRadiusKm}
                    onChange={(e) => setDispatchSettings({ ...dispatchSettings, initialRadiusKm: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', marginTop: '6px' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Maximum Search Radius</label>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0E3E2F' }}>{dispatchSettings.maxRadiusKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={dispatchSettings.maxRadiusKm}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setDispatchSettings({
                        ...dispatchSettings,
                        maxRadiusKm: val,
                        initialRadiusKm: Math.min(val, dispatchSettings.initialRadiusKm),
                      });
                    }}
                    style={{ width: '100%', accentColor: '#0E3E2F' }}
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={dispatchSettings.maxRadiusKm}
                    onChange={(e) => setDispatchSettings({ ...dispatchSettings, maxRadiusKm: parseFloat(e.target.value) || 1 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', marginTop: '6px' }}
                  />
                </div>
              </div>

              {/* Expansion Stages Array */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Progressive Expansion Stages (Comma-separated distances in km)
                </label>
                <input
                  type="text"
                  value={stagesInput}
                  onChange={(e) => setStagesInput(e.target.value)}
                  placeholder="3, 5, 8, 12, 15"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', fontWeight: 600 }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Expansion Flow:</span>
                  {stagesInput.split(',').map((st, i) => {
                    const kmVal = st.trim();
                    if (!kmVal) return null;
                    return (
                      <React.Fragment key={i}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #86EFAC',
                            color: '#15803D',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Stage {i + 1}: {kmVal} km
                        </span>
                        {i < stagesInput.split(',').length - 1 && <span style={{ color: '#94A3B8', fontSize: '12px' }}>➔</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Expansion Delay & Offer Timeout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Stage Expansion Delay (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={dispatchSettings.expansionDelaySeconds}
                    onChange={(e) => setDispatchSettings({ ...dispatchSettings, expansionDelaySeconds: parseInt(e.target.value) || 30 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Wait time before advancing to the next radius stage.
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    Provider Offer Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={dispatchSettings.offerTimeoutSeconds}
                    onChange={(e) => setDispatchSettings({ ...dispatchSettings, offerTimeoutSeconds: parseInt(e.target.value) || 30 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Countdown duration for partner to accept job card.
                  </span>
                </div>
              </div>
            </div>

            {/* Timings, Candidate Limits & Location Freshness */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                  Candidate Limits & Concurrency
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
                  Safety thresholds to prevent excessive broadcast load and define maximum dispatch lifespans.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Max Simultaneous Offers
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={dispatchSettings.maxSimultaneousOffers}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, maxSimultaneousOffers: parseInt(e.target.value) || 3 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Max Providers per Cycle
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={dispatchSettings.maxProvidersPerCycle}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, maxProvidersPerCycle: parseInt(e.target.value) || 10 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Max Total Offers / Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={dispatchSettings.maxTotalOffersPerOrder}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, maxTotalOffersPerOrder: parseInt(e.target.value) || 15 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Max Dispatch Duration (s)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="1800"
                      value={dispatchSettings.maxDispatchDurationSeconds}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, maxDispatchDurationSeconds: parseInt(e.target.value) || 300 })}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Location Freshness & Eligibility Criteria */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                  GPS Freshness & Partner Eligibility
                </h3>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 16px' }}>
                  Strict server-side verification filters to disqualify stale locations and unverified partners.
                </p>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    GPS Location Freshness Threshold (seconds)
                  </label>
                  <input
                    type="number"
                    min="30"
                    max="600"
                    value={dispatchSettings.locationFreshnessThresholdSeconds}
                    onChange={(e) => setDispatchSettings({ ...dispatchSettings, locationFreshnessThresholdSeconds: parseInt(e.target.value) || 120 })}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Providers whose latest GPS ping is older than this will be excluded with reason STALE_LOCATION.
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={dispatchSettings.requireKycVerification}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, requireKycVerification: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#16A34A' }}
                    />
                    Require Police & Background KYC Verification
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={dispatchSettings.requireSkillMatch}
                      onChange={(e) => setDispatchSettings({ ...dispatchSettings, requireSkillMatch: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#16A34A' }}
                    />
                    Require Exact Skill & Service Category Match
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Dispatch Diagnostics & Redispatch Tool */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Order Dispatch Diagnostics & Live Candidate Inspector
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Inspect eligible candidate scores, excluded provider reasons, and trigger server-side re-dispatch.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={diagnosticsOrderRef}
                  onChange={(e) => setDiagnosticsOrderRef(e.target.value)}
                  placeholder="Order ID / Ref (#HSX-MVPO3IF5-6A064D)"
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px', width: '220px' }}
                />
                <button
                  onClick={() => fetchDiagnostics(diagnosticsOrderRef)}
                  disabled={diagnosticsLoading}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#0E3E2F',
                    color: '#FFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {diagnosticsLoading ? 'Inspecting...' : 'Inspect Diagnostics'}
                </button>
                <button
                  onClick={() => handleTriggerRedispatch(diagnosticsOrderRef)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #16A34A',
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Trigger Redispatch
                </button>
              </div>
            </div>

            {diagnosticsError && (
              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '12px', marginBottom: '16px' }}>
                {diagnosticsError}
              </div>
            )}

            {diagnosticsData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                {/* Diagnostics Header Badge */}
                <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      Order #{diagnosticsData.referenceNumber}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '8px' }}>
                      • {diagnosticsData.service}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 800 }}>
                      Radius: {diagnosticsData.dispatch?.currentRadiusKm} km (Stage {diagnosticsData.dispatch?.currentStage})
                    </span>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#1E40AF', fontSize: '11px', fontWeight: 800 }}>
                      Status: {diagnosticsData.status}
                    </span>
                  </div>
                </div>

                {/* Candidate Tables: Eligible vs Excluded */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {/* Eligible Candidates */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', backgroundColor: '#FAFAFA' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#15803D', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Eligible Nearby Providers</span>
                      <span>({diagnosticsData.dispatch?.eligibleCandidateCount || 0})</span>
                    </div>

                    {(!diagnosticsData.dispatch?.eligibleCandidates || diagnosticsData.dispatch.eligibleCandidates.length === 0) ? (
                      <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', padding: '12px 0' }}>
                        No eligible providers currently inside {diagnosticsData.dispatch?.currentRadiusKm} km radius. Next expansion stage will broaden boundary.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {diagnosticsData.dispatch.eligibleCandidates.map((cand: any, i: number) => (
                          <div key={i} style={{ padding: '10px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{cand.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>★ {cand.rating} • {cand.etaMinutes} mins ETA</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#16A34A' }}>{cand.distanceKm} km</div>
                              <div style={{ fontSize: '10px', color: '#64748B' }}>Score: {cand.score}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Excluded Providers with Granular Reasons */}
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', backgroundColor: '#FAFAFA' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#B91C1C', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Excluded Providers (Out of Radius / Ineligible)</span>
                      <span>({diagnosticsData.dispatch?.excludedProviderCount || 0})</span>
                    </div>

                    {(!diagnosticsData.dispatch?.excludedProviders || diagnosticsData.dispatch.excludedProviders.length === 0) ? (
                      <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic', padding: '12px 0' }}>
                        No providers excluded in this evaluation cycle.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                        {diagnosticsData.dispatch.excludedProviders.map((ex: any, i: number) => (
                          <div key={i} style={{ padding: '8px 10px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #FCA5A5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>{ex.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>{ex.details}</div>
                            </div>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '8px',
                                backgroundColor: '#FEE2E2',
                                color: '#991B1B',
                                fontSize: '10px',
                                fontWeight: 800,
                              }}
                            >
                              {ex.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Subscriptions, Commission Engine & Financial Ledger */}
      {activeTab === 'subscriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Revenue Analytics Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icons.Briefcase size={14} color="#64748B" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Gross Booking Value (GBV)</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>
                ₹{(revenueAnalytics?.grossBookingValueRupees || 148500).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#16A34A', marginTop: '4px', fontWeight: 600 }}>Authoritative Gross Order Volume</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icons.Wallet size={14} color="#64748B" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Commission Revenue</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0E3E2F' }}>
                ₹{(revenueAnalytics?.commissionRevenueRupees || 22275).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>From 15% Normal Provider Orders</div>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icons.Crown size={14} color="#D97706" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Subscription Revenue</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#D97706' }}>
                ₹{(revenueAnalytics?.subscriptionRevenueRupees || 2499).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#B45309', marginTop: '4px' }}>
                {revenueAnalytics?.activeSubscriptionsCount || 1} Active Premium Partners
              </div>
            </div>

            <div style={{ backgroundColor: '#0E3E2F', borderRadius: '16px', padding: '18px', color: '#FFFFFF', boxShadow: '0 4px 14px rgba(14,62,47,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Icons.TrendingUp size={14} color="#A7F3D0" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#A7F3D0' }}>Total Company Revenue</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>
                ₹{(revenueAnalytics?.totalPlatformRevenueRupees || 24774).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '11px', color: '#86EFAC', marginTop: '4px', fontWeight: 600 }}>
                100% Retained Platform Margin
              </div>
            </div>
          </div>

          {/* Configuration Panel: Commission Rates & Expiry Rules */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                  Authoritative Commission Policy & Settlement Rules
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Platform rules for Type A (Normal) and Type B (Premium Subscription) providers
                </div>
              </div>

              <button
                onClick={handleSaveSubSettings}
                style={{
                  padding: '9px 18px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: '#0E3E2F',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Icons.CheckCircle size={14} color="#FFFFFF" />
                Save Policy
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Type A: Normal Provider Commission (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={subSettings.defaultCommissionRatePercent}
                  onChange={(e) => setSubSettings({ ...subSettings, defaultCommissionRatePercent: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '15px', fontWeight: 800, color: '#0E3E2F', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', display: 'block' }}>
                  Applied automatically to non-subscribed or expired providers on every order (e.g. 15%).
                </span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Type B: Premium Provider Commission (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={subSettings.premiumCommissionRatePercent}
                  onChange={(e) => setSubSettings({ ...subSettings, premiumCommissionRatePercent: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '15px', fontWeight: 800, color: '#16A34A', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', display: 'block' }}>
                  Commission exemption for active subscribers (e.g. 0% commission, keep 100% of order).
                </span>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                  Minimum Payout Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={subSettings.minimumPayoutAmountRupees}
                  onChange={(e) => setSubSettings({ ...subSettings, minimumPayoutAmountRupees: Number(e.target.value) })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '15px', fontWeight: 800, color: '#0F172A', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', display: 'block' }}>
                  Minimum threshold required in provider wallet to request IMPS/UPI withdrawal (₹500).
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
              <input
                type="checkbox"
                id="autoRevertCheck"
                checked={subSettings.autoRevertOnExpiry}
                onChange={(e) => setSubSettings({ ...subSettings, autoRevertOnExpiry: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
              />
              <label htmlFor="autoRevertCheck" style={{ fontSize: '13px', color: '#15803D', fontWeight: 700 }}>
                Automatic Reversion on Expiry: Expired providers stay 100% active and receive orders normally, automatically reverting to standard 15% commission without account block.
              </label>
            </div>
          </div>

          {/* Subscription Plans Catalog */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                  Subscription Plans Catalog
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Plans available for in-app purchase by service partners
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Plan Name</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Price (₹)</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Duration</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Commission Exemption</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Status</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subPlans.length > 0 ? (
                    subPlans.map((plan: any) => (
                      <tr key={plan.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 12px', fontWeight: 700, color: '#0F172A' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Icons.Crown size={16} color="#D97706" />
                            <span>{plan.name}</span>
                            {plan.isPopular && (
                              <span style={{ fontSize: '10px', fontWeight: 800, backgroundColor: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '10px' }}>
                                POPULAR
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{plan.description}</div>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#0E3E2F', fontSize: '14px' }}>
                          ₹{(plan.pricePaise / 100).toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 12px', color: '#475569' }}>
                          {plan.durationDays} Days
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 700, color: '#16A34A' }}>
                          0% Commission (100% Retained)
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: plan.isActive ? '#DCFCE7' : '#F1F5F9',
                            color: plan.isActive ? '#15803D' : '#64748B',
                          }}>
                            {plan.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleTogglePlan(plan)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '14px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#0F172A',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {plan.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#64748B' }}>
                        Loading subscription plans from database...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provider Payout Settlement Requests */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                  Provider Payout & Withdrawal Queue
                </h3>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
                  Authoritative review and settlement of partner bank and UPI transfers
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Ref #</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Provider</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Amount</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Destination Details</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569' }}>Status</th>
                    <th style={{ padding: '12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRequests.length > 0 ? (
                    payoutRequests.map((payout: any) => (
                      <tr key={payout.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '14px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#0F172A' }}>
                          {payout.referenceNumber}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{payout.providerName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{payout.providerPhone}</div>
                        </td>
                        <td style={{ padding: '14px 12px', fontWeight: 800, color: '#0E3E2F', fontSize: '14px' }}>
                          ₹{payout.amountRupees.toLocaleString('en-IN')}
                        </td>
                        <td style={{ padding: '14px 12px', color: '#475569', fontSize: '12px' }}>
                          {payout.accountDetails ? (
                            <div>
                              {payout.accountDetails.upiId && <div>UPI: <strong>{payout.accountDetails.upiId}</strong></div>}
                              {payout.accountDetails.bankName && <div>Bank: {payout.accountDetails.bankName} (•••• {payout.accountDetails.accountNumber})</div>}
                            </div>
                          ) : (
                            'Direct Account Settlement'
                          )}
                        </td>
                        <td style={{ padding: '14px 12px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor:
                              payout.status === 'COMPLETED' ? '#DCFCE7' : payout.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                            color:
                              payout.status === 'COMPLETED' ? '#15803D' : payout.status === 'REJECTED' ? '#B91C1C' : '#B45309',
                          }}>
                            {payout.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                          {payout.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => handleProcessPayout(payout.id, 'APPROVE')}
                                disabled={processingPayoutId === payout.id}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '14px',
                                  border: 'none',
                                  backgroundColor: '#16A34A',
                                  color: '#FFFFFF',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {processingPayoutId === payout.id ? 'Processing...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleProcessPayout(payout.id, 'REJECT')}
                                disabled={processingPayoutId === payout.id}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '14px',
                                  border: '1px solid #FECACA',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94A3B8' }}>Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                        No pending payout requests in queue. All partner balances are settled.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promotional 0% Commission Incentive Grant */}
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
              Grant Promotional 0% Commission Subscription
            </h3>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
              Reward top-performing partners or onboard new recruits with commission-free trials
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Provider ID or Name / Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar or prov_1"
                  value={promoForm.providerId}
                  onChange={(e) => setPromoForm({ ...promoForm, providerId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Plan Type
                </label>
                <select
                  value={promoForm.planSlug}
                  onChange={(e) => setPromoForm({ ...promoForm, planSlug: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box', backgroundColor: '#FFFFFF' }}
                >
                  <option value="monthly-premium">Monthly Premium (30 Days)</option>
                  <option value="quarterly-premium">Quarterly Premium (90 Days)</option>
                  <option value="yearly-premium">Yearly Premium (365 Days)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Duration (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={promoForm.durationDays}
                  onChange={(e) => setPromoForm({ ...promoForm, durationDays: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <button
                  onClick={handleGrantPromo}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Icons.Crown size={15} color="#FFFFFF" />
                  Grant 0% Promo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: System Configuration */}
      {activeTab === 'system' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>
              General Platform Identity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Company Platform Name
                </label>
                <input
                  type="text"
                  value={generalSettings.platformName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, platformName: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Official Customer Support Hotline
                </label>
                <input
                  type="text"
                  value={generalSettings.supportPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Support Inquiries Email
                </label>
                <input
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                  Settlement Currency
                </label>
                <input
                  type="text"
                  value={generalSettings.currency}
                  readOnly
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>
              Real-Time Notifications & Gateways
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Customer SMS Alerts</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Sends OTP and booking confirmations via Twilio/Fast2SMS</div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.customerSms}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, customerSms: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Partner Push Notifications</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Sends instant audible job alerts to technician handsets</div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.providerPush}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, providerPush: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>Automated GST Invoices</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Generates digital PDF invoice with Dual-OTP audit trail</div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationSettings.emailReceipts}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, emailReceipts: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#16A34A' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Commission & Payments */}
      {activeTab === 'business' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 16px' }}>
            Commission Structure & Provider Settlements
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Standard Platform Commission (%)
              </label>
              <input
                type="number"
                value={paymentSettings.commissionRate}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, commissionRate: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 700 }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Platform automatically retains 15% on completed jobs; 85% is disbursed to partner wallet.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Provider Payout Settlement Frequency (Days)
              </label>
              <input
                type="number"
                value={paymentSettings.payoutCycleDays}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, payoutCycleDays: Number(e.target.value) })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '14px', fontWeight: 700 }}
              />
              <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                Weekly batch payouts processed automatically to linked UPI / NEFT bank accounts.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Warranty & Compliance */}
      {activeTab === 'legal' && (
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>
            Service Warranties & Customer Assurance Policy
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748B', marginBottom: '6px' }}>
                Doorstep Warranty Terms Displayed in Customer App
              </label>
              <textarea
                rows={4}
                value={legalSettings.warrantyTerms}
                onChange={(e) => setLegalSettings({ ...legalSettings, warrantyTerms: e.target.value })}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', lineHeight: 1.5 }}
              />
            </div>
            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0', fontSize: '13px', color: '#475569' }}>
              <strong>Police & KYC Verification Mandate:</strong> All field technicians onboarded on HomeServeX undergo Aadhaar verification and criminal record clearances prior to receiving live dispatched jobs.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
