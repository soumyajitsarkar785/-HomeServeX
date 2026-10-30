import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface DispatchConfig {
  initialRadiusKm: number;
  maxRadiusKm: number;
  dispatchMode: 'PROGRESSIVE_EXPANSION' | 'BROADCAST_ALL';
  expansionStages: number[];
  expansionIntervalSeconds: number;
  offerTimeoutSeconds: number;
  maxConcurrentOffers: number;
  maxOffersPerOrder: number;
  locationFreshnessThresholdSeconds: number;
  version: number;
}

interface ActiveDispatchOrder {
  bookingId: string;
  orderNumber: string;
  service: string;
  currentRadiusKm: number;
  stage: number;
  status: string;
  eligibleCount: number;
  offersSent: number;
  startedAt: string;
}

interface CandidateInfo {
  providerId: string;
  name: string;
  phone: string;
  ratingAverage: number;
  completedJobsCount: number;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  skills: string[];
}

interface ExcludedProviderInfo {
  providerId: string;
  name: string;
  reason: string;
  details: string;
}

interface DiagnosticsData {
  bookingId: string;
  referenceNumber: string;
  status: string;
  service: string;
  location: { latitude: number; longitude: number; address: string };
  dispatch: {
    currentStage: number;
    currentRadiusKm: number;
    stages: number[];
    mode: string;
    eligibleCandidateCount: number;
    excludedProviderCount: number;
    eligibleCandidates: CandidateInfo[];
    excludedProviders: ExcludedProviderInfo[];
    assignedProvider: string | null;
  };
}

export const AdminDispatchControlScreen: React.FC = () => {
  const [config, setConfig] = useState<DispatchConfig>({
    initialRadiusKm: 5,
    maxRadiusKm: 25,
    dispatchMode: 'PROGRESSIVE_EXPANSION',
    expansionStages: [5, 10, 15, 20, 25],
    expansionIntervalSeconds: 30,
    offerTimeoutSeconds: 30,
    maxConcurrentOffers: 3,
    maxOffersPerOrder: 10,
    locationFreshnessThresholdSeconds: 120,
    version: 1,
  });

  const [activeOrders, setActiveOrders] = useState<ActiveDispatchOrder[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [allProviders, setAllProviders] = useState<Array<{ id: string; name: string; phone: string; category: string }>>([]);
  const [manualProviderId, setManualProviderId] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Load dispatch configuration & active dispatch engine overview
  const fetchData = async () => {
    try {
      const [cfgRes, overviewRes, provRes] = await Promise.all([
        fetch('/api/v1/admin/dispatch/config'),
        fetch('/api/v1/admin/dispatch/overview'),
        fetch('/api/v1/admin/providers'),
      ]);

      if (cfgRes.ok) {
        const json = await cfgRes.json();
        if (json?.data) setConfig(json.data);
      }

      if (overviewRes.ok) {
        const json = await overviewRes.json();
        if (json?.data?.activeOrders) {
          setActiveOrders(json.data.activeOrders);
          if (!selectedBookingId && json.data.activeOrders.length > 0) {
            setSelectedBookingId(json.data.activeOrders[0].bookingId);
          }
        }
      }

      if (provRes.ok) {
        const json = await provRes.json();
        if (json?.data) {
          setAllProviders(json.data);
          if (json.data[0]?.id) setManualProviderId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load dispatch control data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, 3000);
    return () => clearInterval(timer);
  }, []);

  // Fetch diagnostics for selected booking
  useEffect(() => {
    if (!selectedBookingId) return;

    const fetchDiag = async () => {
      setLoadingDiagnostics(true);
      try {
        const res = await fetch(`/api/v1/admin/dispatch/orders/${selectedBookingId}/diagnostics`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) setDiagnostics(json.data);
        }
      } catch (err) {
        console.error('Diagnostics fetch failed:', err);
      } finally {
        setLoadingDiagnostics(false);
      }
    };

    fetchDiag();
  }, [selectedBookingId]);

  // Save updated configuration to backend
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/v1/admin/dispatch/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.data) setConfig(json.data);
        setActionMessage('Dispatch rules saved successfully! Takes effect immediately.');
        setTimeout(() => setActionMessage(''), 4000);
      } else {
        const err = await res.json();
        alert(err?.error?.message || 'Failed to update configuration');
      }
    } catch {
      alert('Error updating configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Trigger immediate redispatch / radius expansion
  const handleForceRedispatch = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/dispatch/orders/${bookingId}/start`, {
        method: 'POST',
      });
      if (res.ok) {
        setActionMessage('Dispatch cycle re-triggered successfully.');
        setTimeout(() => setActionMessage(''), 3000);
        fetchData();
      }
    } catch {
      alert('Failed to redispatch');
    }
  };

  // Manual provider assignment override
  const handleManualAssign = async () => {
    if (!selectedBookingId || !manualProviderId) return;
    try {
      const res = await fetch(`/api/v1/admin/bookings/${selectedBookingId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: manualProviderId,
          notes: 'Admin manual assignment override via Dispatch Control Center',
        }),
      });

      if (res.ok) {
        setActionMessage('Specialist assigned successfully via Dispatch Override!');
        setTimeout(() => setActionMessage(''), 3000);
        fetchData();
      } else {
        const err = await res.json();
        alert(err?.error?.message || 'Failed to assign specialist');
      }
    } catch {
      alert('Error assigning specialist');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: "'Inter', sans-serif" }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
              Dispatch Control Center
            </h1>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                border: '1px solid #86EFAC',
              }}
            >
              ALGORITHM V{config.version} • LIVE
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>
            Uber-style progressive radius configuration, candidate scoring inspection, and manual override controls
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              color: '#0F172A',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Icons.Refresh size={14} color="#0F172A" />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            backgroundColor: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            padding: '12px 18px',
            borderRadius: '14px',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* 2. Top Section: Live Dynamic Radius & Algorithm Configuration */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Dynamic Dispatch Radius & Matchmaking Rules
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Changes take effect immediately across all active provider searches without application restart.
            </span>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={isSavingConfig}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0E3E2F',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(14,62,47,0.2)',
            }}
          >
            {isSavingConfig ? 'Saving Rules...' : 'Save & Apply Live Rules'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Initial Radius */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Initial Search Radius (km)
            </label>
            <input
              type="number"
              value={config.initialRadiusKm}
              onChange={(e) => setConfig({ ...config, initialRadiusKm: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
              }}
            />
          </div>

          {/* Max Radius */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Maximum Radius Ceiling (km)
            </label>
            <input
              type="number"
              value={config.maxRadiusKm}
              onChange={(e) => setConfig({ ...config, maxRadiusKm: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
              }}
            />
          </div>

          {/* Stage Interval (seconds) */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Expansion Stage Interval (sec)
            </label>
            <input
              type="number"
              value={config.expansionIntervalSeconds}
              onChange={(e) => setConfig({ ...config, expansionIntervalSeconds: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
              }}
            />
          </div>

          {/* Offer Acceptance Timeout */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Provider Offer Timeout (sec)
            </label>
            <input
              type="number"
              value={config.offerTimeoutSeconds}
              onChange={(e) => setConfig({ ...config, offerTimeoutSeconds: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
              }}
            />
          </div>

          {/* Max Concurrent Offers */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Max Simultaneous Offers / Order
            </label>
            <input
              type="number"
              value={config.maxConcurrentOffers}
              onChange={(e) => setConfig({ ...config, maxConcurrentOffers: Number(e.target.value) })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
              }}
            />
          </div>

          {/* Dispatch Mode */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
              Dispatch Mode
            </label>
            <select
              value={config.dispatchMode}
              onChange={(e) => setConfig({ ...config, dispatchMode: e.target.value as any })}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                fontWeight: 700,
                color: '#0F172A',
                backgroundColor: '#FFFFFF',
              }}
            >
              <option value="PROGRESSIVE_EXPANSION">Progressive Radius Expansion (Uber-Style)</option>
              <option value="BROADCAST_ALL">Instant Broadcast to Entire City</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Dispatch Operations: Active Queue & Candidate Inspection Drawer */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px' }}>
        {/* Left: Active Dispatch Orders Queue */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Active Dispatch Queue ({activeOrders.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#64748B' }}>
              Orders currently evaluated by geospatial matcher
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
            {activeOrders.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                No active orders searching. All bookings currently assigned or completed.
              </div>
            ) : (
              activeOrders.map((ord) => {
                const isSelected = selectedBookingId === ord.bookingId;
                return (
                  <div
                    key={ord.bookingId}
                    onClick={() => setSelectedBookingId(ord.bookingId)}
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '4px solid #16A34A' : '4px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                        {ord.orderNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '8px',
                          backgroundColor: ord.status === 'SEARCHING' ? '#FEE2E2' : '#DCFCE7',
                          color: ord.status === 'SEARCHING' ? '#B91C1C' : '#15803D',
                        }}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                      {ord.service}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
                      <span>Radius: <strong>{ord.currentRadiusKm} km</strong></span>
                      <span>Candidates: <strong>{ord.eligibleCount}</strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Candidate Discovery & Match Scoring Inspector */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Candidate Ranking & Match Scoring Inspector
              </h3>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                Server-side Haversine geodesic distance, skill validation, and workload exclusion audit
              </span>
            </div>

            {selectedBookingId && (
              <button
                onClick={() => handleForceRedispatch(selectedBookingId)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  color: '#0F172A',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Force Expand Radius ➔
              </button>
            )}
          </div>

          {loadingDiagnostics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Calculating real-time candidate scores...
            </div>
          ) : !diagnostics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              Select an order from the queue on the left to inspect candidate ranking and exclusion reasons.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Order Context Strip */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#F8FAFC',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <strong>Order #{diagnostics.referenceNumber}</strong>: {diagnostics.service}
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    {diagnostics.location.address} (Lat: {diagnostics.location.latitude.toFixed(4)}, Lng: {diagnostics.location.longitude.toFixed(4)})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0E3E2F' }}>
                    Active Radius: {diagnostics.dispatch.currentRadiusKm} km (Stage {diagnostics.dispatch.currentStage})
                  </span>
                </div>
              </div>

              {/* 1. Eligible Candidates (Ranked by Score) */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A', margin: '0 0 10px' }}>
                  Eligible Nearby Specialists ({diagnostics.dispatch.eligibleCandidateCount})
                </h4>
                {diagnostics.dispatch.eligibleCandidates.length === 0 ? (
                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '12px', fontSize: '13px', color: '#64748B' }}>
                    No eligible candidates within current {diagnostics.dispatch.currentRadiusKm} km radius. Radii expansion will trigger automatically.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {diagnostics.dispatch.eligibleCandidates.map((c, idx) => (
                      <div
                        key={c.providerId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          backgroundColor: idx === 0 ? '#F0FDF4' : '#FFFFFF',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                              #{idx + 1} {c.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>
                              ★ {c.ratingAverage} ({c.completedJobsCount} jobs)
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Distance: <strong>{c.distanceKm} km</strong> • ETA: <strong>~{c.etaMinutes} mins</strong> • Skills: {c.skills.join(', ')}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#0E3E2F',
                              backgroundColor: '#DCFCE7',
                              padding: '4px 10px',
                              borderRadius: '8px',
                            }}
                          >
                            Score: {(c.score * 100).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Excluded Providers (Detailed Reason Audit) */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#DC2626', margin: '0 0 10px' }}>
                  Excluded Providers Audit ({diagnostics.dispatch.excludedProviderCount})
                </h4>
                {diagnostics.dispatch.excludedProviders.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#64748B' }}>None excluded.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {diagnostics.dispatch.excludedProviders.slice(0, 5).map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FEE2E2',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#991B1B' }}>{ex.name}</strong>
                          <span style={{ color: '#7F1D1D', marginLeft: '8px' }}>{ex.details}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#FCA5A5',
                            color: '#7F1D1D',
                          }}
                        >
                          {ex.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Manual Dispatch Override */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1px solid #E2E8F0',
                  marginTop: '10px',
                }}
              >
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
                  Manual Dispatch Override
                </h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={manualProviderId}
                    onChange={(e) => setManualProviderId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {allProviders.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.category} ({p.phone})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleManualAssign}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Assign Specialist Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

