import React, { useState, useEffect } from 'react';

export const AdminWarrantyDisputesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'claims' | 'disputes'>('claims');
  const [claims, setClaims] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchClaimsAndDisputes = async () => {
    setLoading(true);
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      const [resC, resD] = await Promise.all([
        fetch('/api/v1/admin/warranty/claims', { headers }),
        fetch('/api/v1/disputes', { headers }),
      ]);

      if (resC.ok) {
        const j = await resC.json();
        setClaims(j?.data || []);
      }
      if (resD.ok) {
        const j = await resD.json();
        setDisputes(j?.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimsAndDisputes();
  }, []);

  const handleResolveClaim = async (claimId: string, status: 'APPROVED' | 'REJECTED') => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const res = await fetch(`/api/v1/admin/warranty/claims/${claimId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status,
        adminNotes: status === 'APPROVED' ? 'Approved for free doorstep rework inspection.' : 'Claim rejected after evidence review.',
      }),
    });

    if (res.ok) {
      setActionSuccess(`Warranty Claim #${claimId.slice(-6)} marked as ${status}`);
      setTimeout(() => setActionSuccess(''), 3000);
      fetchClaimsAndDisputes();
    }
  };

  const handleResolveDispute = async (disputeId: string, status: string, refundPaise: number = 0) => {
    const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const res = await fetch(`/api/v1/admin/disputes/${disputeId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status,
        refundAmountPaise: refundPaise,
        adminDecision: `Resolved by Admin. Status: ${status}`,
      }),
    });

    if (res.ok) {
      setActionSuccess(`Dispute #${disputeId.slice(-6)} updated: ${status}`);
      setTimeout(() => setActionSuccess(''), 3000);
      fetchClaimsAndDisputes();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
            Warranty, Protection &amp; Dispute Desk
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Investigate customer quality claims, authorize zero-cost warranty reworks, and settle payment refunds.
          </p>
        </div>
        <button
          onClick={fetchClaimsAndDisputes}
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
          {loading ? 'Refreshing...' : '↻ Refresh Records'}
        </button>
      </div>

      {actionSuccess && (
        <div style={{ backgroundColor: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '12px', padding: '12px 16px', color: '#15803D', fontWeight: 700, fontSize: '13px' }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('claims')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'claims' ? '#0E3E2F' : '#F1F5F9',
            color: activeTab === 'claims' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          🛡️ 30-Day Warranty Claims ({claims.length})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          style={{
            padding: '8px 18px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'disputes' ? '#0E3E2F' : '#F1F5F9',
            color: activeTab === 'disputes' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          ⚖️ Customer Disputes &amp; Refunds ({disputes.length})
        </button>
      </div>

      {/* Tab 1: Warranty Claims */}
      {activeTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {claims.length === 0 ? (
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
              No active warranty claims pending review. All completed services operating at 100% satisfaction.
            </div>
          ) : (
            claims.map((claim) => (
              <div key={claim.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>#{claim.referenceNumber}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: claim.status === 'APPROVED' ? '#DCFCE7' : claim.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7', color: claim.status === 'APPROVED' ? '#15803D' : claim.status === 'REJECTED' ? '#DC2626' : '#B45309', padding: '3px 8px', borderRadius: '8px' }}>
                      {claim.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Service: {claim.serviceName}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}><b>Reason:</b> {claim.claimReason}</div>
                  {claim.adminNotes && <div style={{ fontSize: '11px', color: '#0E3E2F', marginTop: '4px', fontStyle: 'italic' }}>Supervisor Notes: {claim.adminNotes}</div>}
                </div>

                {claim.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleResolveClaim(claim.id, 'APPROVED')}
                      style={{ backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Approve Rework
                    </button>
                    <button
                      onClick={() => handleResolveClaim(claim.id, 'REJECTED')}
                      style={{ backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Disputes */}
      {activeTab === 'disputes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {disputes.length === 0 ? (
            <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '16px', textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
              No open customer disputes recorded.
            </div>
          ) : (
            disputes.map((disp) => (
              <div key={disp.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '18px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>Booking #{disp.referenceNumber}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#F1F5F9', color: '#0F172A', padding: '3px 8px', borderRadius: '8px' }}>
                      Type: {disp.disputeType}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: disp.status.startsWith('RESOLVED') ? '#DCFCE7' : '#FEF3C7', color: disp.status.startsWith('RESOLVED') ? '#15803D' : '#B45309', padding: '3px 8px', borderRadius: '8px' }}>
                      {disp.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '4px' }}><b>Description:</b> {disp.description}</div>
                  {disp.adminDecision && <div style={{ fontSize: '11px', color: '#0E3E2F', marginTop: '4px', fontStyle: 'italic' }}>Decision: {disp.adminDecision}</div>}
                </div>

                {disp.status === 'OPEN' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleResolveDispute(disp.id, 'RESOLVED_REFUND', 49900)}
                      style={{ backgroundColor: '#0284C7', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Authorize Refund (₹499)
                    </button>
                    <button
                      onClick={() => handleResolveDispute(disp.id, 'RESOLVED_REWORK')}
                      style={{ backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '8px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                    >
                      Order Rework
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
