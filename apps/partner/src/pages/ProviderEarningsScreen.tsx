import React, { useState, useEffect } from 'react';
import { Icons } from '@homeservex/ui';

interface ProviderEarningsScreenProps {
  onNavigate: (screen: string) => void;
}

interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  time: string;
  isCredit?: boolean;
  isBonus?: boolean;
}

export const ProviderEarningsScreen: React.FC<ProviderEarningsScreenProps> = ({
  onNavigate,
}) => {
  const [timeframe, setTimeframe] = useState<'Today' | 'This Week' | 'This Month'>('Today');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMethod, setWithdrawMethod] = useState<'bank' | 'upi'>('bank');
  const [withdrawAmount, setWithdrawAmount] = useState('2450');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [todayBalance, setTodayBalance] = useState(2450);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(3290);
  const [liveTransactions, setLiveTransactions] = useState<TransactionItem[]>([]);

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('hsx_partner_token');
      const headers: Record<string, string> = {
        'x-role': 'PROVIDER',
        'x-app': 'partner',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/v1/providers/wallet/summary', { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setTodayBalance(d.balanceRupees ?? 2450);
          setPendingBalance(d.pendingRupees ?? 0);
          setTotalEarned(d.totalEarnedRupees ?? 3290);

          if (Array.isArray(d.recentTransactions) && d.recentTransactions.length > 0) {
            const mapped: TransactionItem[] = d.recentTransactions.map((tx: any) => ({
              id: tx.id || `tx-${Math.random()}`,
              title: tx.description || 'Service Settlement',
              amount: Math.abs(tx.amountRupees || tx.amountPaise / 100),
              time: tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:30 PM',
              isCredit: tx.type === 'CREDIT',
              isBonus: tx.category === 'BONUS',
            }));
            setLiveTransactions(mapped);
          }
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const getStats = () => {
    switch (timeframe) {
      case 'Today':
        return {
          total: `₹${todayBalance.toLocaleString('en-IN')}`,
          subtitle: "Today's Available Balance",
          completed: 5,
          bonus: '₹620',
          pending: `₹${pendingBalance.toLocaleString('en-IN')}`,
        };
      case 'This Week':
        return {
          total: `₹${(totalEarned > 14820 ? totalEarned : 14820).toLocaleString('en-IN')}`,
          subtitle: "This Week's Earnings",
          completed: 28,
          bonus: '₹2,400',
          pending: `₹${pendingBalance.toLocaleString('en-IN')}`,
        };
      case 'This Month':
        return {
          total: `₹${(totalEarned > 62400 ? totalEarned : 62400).toLocaleString('en-IN')}`,
          subtitle: "This Month's Earnings",
          completed: 114,
          bonus: '₹8,500',
          pending: `₹${pendingBalance.toLocaleString('en-IN')}`,
        };
    }
  };

  const handleExecuteWithdrawal = async () => {
    const amt = parseInt(withdrawAmount.replace(/[^\d]/g, ''), 10) || 0;
    if (amt <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    if (amt < 500) {
      alert('Minimum payout withdrawal amount is ₹500.');
      return;
    }
    if (amt > todayBalance) {
      alert('Withdrawal amount exceeds your available balance.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const token = localStorage.getItem('hsx_partner_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-role': 'PROVIDER',
        'x-app': 'partner',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch('/api/v1/providers/wallet/payout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amountRupees: amt,
          upiId: 'ramesh.kumar@okhdfcbank',
          bankName: 'State Bank of India',
          accountNumber: '4821',
          ifsc: 'SBIN0004821',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Payout request failed');
      }

      const payout = json.data;
      setTodayBalance((prev) => Math.max(0, prev - amt));
      setPendingBalance((prev) => prev + amt);
      setShowWithdrawModal(false);

      const destinationLabel =
        withdrawMethod === 'bank'
          ? 'State Bank of India (•••• 4821)'
          : 'UPI ID ramesh.kumar@okhdfcbank';
      setSuccessToast(`✓ ₹${amt.toLocaleString('en-IN')} withdrawal request submitted for ${destinationLabel}! Ref #${payout?.referenceNumber || 'HSX-PAYOUT'}`);
      setTimeout(() => setSuccessToast(''), 6000);
      fetchWalletData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not process payout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stats = getStats();

  const fallbackTransactions: TransactionItem[] = [
    {
      id: 'tx-1',
      title: 'AC Service & Repair (0% Commission)',
      amount: 299,
      time: '12:30 PM',
      isCredit: true,
    },
    {
      id: 'tx-2',
      title: 'Washing Machine Repair',
      amount: 249,
      time: '11:15 AM',
      isCredit: true,
    },
    {
      id: 'tx-3',
      title: 'Refrigerator Repair',
      amount: 299,
      time: '09:40 AM',
      isCredit: true,
    },
    {
      id: 'tx-4',
      title: 'Service Bonus',
      amount: 50,
      time: '08:20 AM',
      isCredit: true,
      isBonus: true,
    },
  ];

  const transactions = liveTransactions.length > 0 ? liveTransactions : fallbackTransactions;

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', padding: '16px 16px 90px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#CBD5E1';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.transform = 'none';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        >
          <Icons.ArrowLeft size={18} color="#0F172A" />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.3px' }}>
          Earnings
        </h1>
      </div>

      {/* Timeframe Filter Pills */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#FFFFFF',
          padding: '4px',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {(['Today', 'This Week', 'This Month'] as const).map(tab => {
          const isSelected = timeframe === tab;
          return (
            <button
              key={tab}
              onClick={() => setTimeframe(tab)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: '12px',
                border: 'none',
                background: isSelected ? 'linear-gradient(180deg, #145C43 0%, #0E3E2F 100%)' : 'transparent',
                color: isSelected ? '#FFFFFF' : '#64748B',
                fontSize: '13px',
                fontWeight: isSelected ? 800 : 600,
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSelected ? '0 2px 8px rgba(14, 62, 47, 0.25)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                  e.currentTarget.style.color = '#0F172A';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748B';
                }
              }}
            >
              {tab}
            </button>
          );
        })}
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

      {/* Hero Amount Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '24px 20px',
          textAlign: 'center',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          marginBottom: '16px',
        }}
      >
        <div style={{ fontSize: '36px', fontWeight: 900, color: '#0E3E2F', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          {stats.total}
        </div>
        <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, marginBottom: '14px' }}>
          {stats.subtitle}
        </div>

        <button
          onClick={() => {
            setWithdrawAmount(todayBalance > 0 ? todayBalance.toString() : '500');
            setShowWithdrawModal(true);
          }}
          style={{
            padding: '10px 26px',
            borderRadius: '24px',
            border: 'none',
            background: 'linear-gradient(180deg, #18B854 0%, #15803D 100%)',
            color: '#FFFFFF',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(22, 163, 74, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.35)';
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
        >
          <span>Withdraw Payout</span>
          <span>➔</span>
        </button>
      </div>

      {/* Sub-Metrics Breakdown (3 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '12px',
            textAlign: 'center',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '2px' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Completed Jobs</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '12px',
            textAlign: 'center',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#16A34A', marginBottom: '2px' }}>
            {stats.bonus}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Bonus</div>
        </div>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '12px',
            textAlign: 'center',
            border: '1px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#64748B', marginBottom: '2px' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>Pending</div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: '0 0 14px' }}>
          Recent Transactions
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {transactions.map(tx => (
            <div
              key={tx.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '14px 16px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: tx.isBonus ? '#FEF3C7' : '#DCFCE7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tx.isBonus ? (
                    <Icons.Gift size={18} color="#D97706" />
                  ) : (
                    <Icons.Briefcase size={18} color="#15803D" />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '2px' }}>
                    {tx.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{tx.time}</div>
                </div>
              </div>

              <div style={{ fontSize: '15px', fontWeight: 800, color: '#16A34A' }}>
                +₹{tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instant Payout Withdrawal Modal */}
      {showWithdrawModal && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Instant Payout Withdrawal
                </h2>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Available Balance: <strong style={{ color: '#0E3E2F' }}>₹{todayBalance.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setErrorMessage('');
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#F1F5F9',
                  color: '#64748B',
                  fontSize: '18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {errorMessage}
              </div>
            )}

            {/* Destination Selection */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Transfer Destination
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  onClick={() => setWithdrawMethod('bank')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: withdrawMethod === 'bank' ? '2px solid #0E3E2F' : '1px solid #E2E8F0',
                    backgroundColor: withdrawMethod === 'bank' ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '20px' }}>🏦</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        State Bank of India (•••• 4821)
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        IFSC: SBIN0004821 • Primary Account
                      </div>
                    </div>
                  </div>
                  {withdrawMethod === 'bank' && (
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#0E3E2F', color: '#FFFFFF', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✓
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setWithdrawMethod('upi')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: withdrawMethod === 'upi' ? '2px solid #0E3E2F' : '1px solid #E2E8F0',
                    backgroundColor: withdrawMethod === 'upi' ? '#F0FDF4' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '20px' }}>📱</div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                        Instant UPI Transfer
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        ramesh.kumar@okhdfcbank
                      </div>
                    </div>
                  </div>
                  {withdrawMethod === 'upi' && (
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#0E3E2F', color: '#FFFFFF', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✓
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Amount input & preset buttons */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Enter Withdrawal Amount (₹)
              </div>
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', fontWeight: 700, color: '#64748B' }}>
                  ₹
                </span>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '12px 14px 12px 32px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#0F172A',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Quick Preset Chips */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {[500, 1000, 2000, todayBalance].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWithdrawAmount(preset.toString())}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#F8FAFC',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {idx === 3 ? 'Max (All)' : `₹${preset}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Settlement Guarantee notice */}
            <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>⚡</span>
              <span>24x7 Instant IMPS / UPI transfer with zero deduction fees.</span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleExecuteWithdrawal}
                disabled={isProcessing || todayBalance === 0}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '24px',
                  border: 'none',
                  backgroundColor: todayBalance === 0 ? '#94A3B8' : '#16A34A',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: todayBalance === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: todayBalance === 0 ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.25)',
                }}
              >
                <span>{isProcessing ? 'Processing Transfer...' : `Confirm & Transfer ₹${withdrawAmount || '0'} ➔`}</span>
              </button>
              <button
                onClick={() => setShowWithdrawModal(false)}
                style={{
                  padding: '12px 20px',
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
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
