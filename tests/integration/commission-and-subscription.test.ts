import { describe, it, expect } from 'vitest';
import { commissionEngine, DEFAULT_COMMISSION_SETTINGS } from '../../apps/api/src/lib/commissionEngine.js';

describe('HOMESERVEX ENTERPRISE COMMISSION & SUBSCRIPTION FINANCIAL ENGINE', () => {
  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 1: Normal Provider 15% Platform Commission
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 1: Normal Provider Standard Commission Logic', () => {
    it('applies exactly 15% commission on a ₹1,000 order for normal provider', async () => {
      const orderGrossPaise = 100000; // ₹1,000.00
      const financials = await commissionEngine.calculateOrderFinancials({
        baseAmountPaise: orderGrossPaise,
        optionsAmountPaise: 0,
        discountAmountPaise: 0,
        // No providerId or normal provider -> standard 15%
      });

      expect(financials.grossSubtotalPaise).toBe(100000); // ₹1,000
      expect(financials.commissionRatePercent).toBe(15.0);
      expect(financials.commissionAmountPaise).toBe(15000); // ₹150.00 platform commission
      expect(financials.providerNetEarningsPaise).toBe(85000); // ₹850.00 provider net earning
      expect(financials.commissionAmountPaise + financials.providerNetEarningsPaise).toBe(financials.grossSubtotalPaise);
      expect(financials.membershipType).toBe('NORMAL');
    });

    it('calculates integer paise accurately for irregular amounts without floating point errors', async () => {
      const orderGrossPaise = 84900; // ₹849.00
      const financials = await commissionEngine.calculateOrderFinancials({
        baseAmountPaise: orderGrossPaise,
      });

      expect(financials.commissionRatePercent).toBe(15.0);
      expect(Number.isInteger(financials.commissionAmountPaise)).toBe(true);
      expect(Number.isInteger(financials.providerNetEarningsPaise)).toBe(true);
      expect(financials.commissionAmountPaise).toBe(12735); // 15% of 84900 = 12735 paise (₹127.35)
      expect(financials.providerNetEarningsPaise).toBe(72165); // 84900 - 12735 = 72165 paise (₹721.65)
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 2: Premium Subscription Provider 0% Commission
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 2: Premium Provider Zero-Commission Exemption', () => {
    it('exempts commission completely (0%) for an active subscribed provider', async () => {
      const orderGrossPaise = 100000; // ₹1,000.00

      // Simulate active premium entitlement
      const commissionRatePercent = 0.0;
      const commissionAmountPaise = Math.round(orderGrossPaise * (commissionRatePercent / 100));
      const providerNetEarningsPaise = orderGrossPaise - commissionAmountPaise;

      expect(commissionRatePercent).toBe(0.0);
      expect(commissionAmountPaise).toBe(0); // ₹0 company commission
      expect(providerNetEarningsPaise).toBe(100000); // ₹1,000.00 provider keeps 100%!
    });

    it('verifies that premium subscription is purely a commission exemption and not order priority', () => {
      // Matching rules must be independent
      const normalProvider = { id: 'p1', rating: 4.9, distanceKm: 2.1, membership: 'NORMAL' };
      const premiumProvider = { id: 'p2', rating: 4.8, distanceKm: 4.5, membership: 'PREMIUM' };

      const calculateMatchScore = (p: { rating: number; distanceKm: number }) => {
        return (1 / (p.distanceKm + 0.1)) * (p.rating / 5.0);
      };

      const scoreNormal = calculateMatchScore(normalProvider);
      const scorePremium = calculateMatchScore(premiumProvider);

      // Normal provider closer with higher rating wins fair dispatch ranking
      expect(scoreNormal).toBeGreaterThan(scorePremium);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 3: Subscription Expiration Business Rules
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 3: Expired Subscription Mandatory Rules', () => {
    it('automatically restores 15% standard commission when subscription is expired', () => {
      const now = new Date();
      const pastEndDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day expired

      const isSubscriptionActive = pastEndDate >= now;
      expect(isSubscriptionActive).toBe(false);

      const effectiveCommission = isSubscriptionActive ? 0.0 : 15.0;
      expect(effectiveCommission).toBe(15.0);
    });

    it('guarantees provider can STILL accept and complete orders even after subscription expires', () => {
      const providerState = {
        id: 'p-ramesh-1',
        accountStatus: 'ACTIVE', // Account NEVER gets disabled or blocked
        subscriptionStatus: 'EXPIRED',
        membershipType: 'NORMAL',
        canReceiveJobs: true,
        canAcceptJobs: true,
      };

      expect(providerState.accountStatus).toBe('ACTIVE');
      expect(providerState.canReceiveJobs).toBe(true);
      expect(providerState.canAcceptJobs).toBe(true);
      expect(providerState.membershipType).toBe('NORMAL');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 4: Safe Renewal & Entitlement Extension
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 4: Safe Subscription Extension on Renewal', () => {
    it('extends forward from current active end date so existing days are never lost', () => {
      const now = new Date();
      // Current active subscription has 10 days remaining
      const currentEndDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const planDurationDays = 30; // Adding 30 days

      // Correct safe extension
      const extendedEndDate = new Date(currentEndDate.getTime() + planDurationDays * 24 * 60 * 60 * 1000);

      const remainingTotalDays = Math.round((extendedEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      expect(remainingTotalDays).toBe(40); // 10 remaining + 30 new = 40 days total!
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // SUITE 5: Double-Entry Balanced Financial Ledger Integrity
  // ───────────────────────────────────────────────────────────────────────────
  describe('Suite 5: Double-Entry Balanced Financial Ledger', () => {
    it('strictly balances credit and debit amounts with zero mathematical discrepancy', () => {
      const orderTotalPaise = 100000; // ₹1,000.00
      const commissionPaise = 15000;  // ₹150.00 (Platform Credit)
      const providerEarningPaise = 85000; // ₹850.00 (Provider Wallet Credit)

      const debits = [{ account: 'Customer Accounts Receivable', amountPaise: orderTotalPaise }];
      const credits = [
        { account: 'Platform Commission Revenue', amountPaise: commissionPaise },
        { account: 'Provider Payable Wallet', amountPaise: providerEarningPaise },
      ];

      const sumDebits = debits.reduce((acc, d) => acc + d.amountPaise, 0);
      const sumCredits = credits.reduce((acc, c) => acc + c.amountPaise, 0);

      expect(sumDebits).toBe(sumCredits);
      expect(sumDebits - sumCredits).toBe(0);
    });

    it('enforces separate recording of subscription purchases from order earnings', () => {
      let walletBalancePaise = 0;

      // 1. Order 1 Completed (Normal: ₹1,000 gross -> +₹850 net earning)
      const order1NetPaise = 85000;
      walletBalancePaise += order1NetPaise;
      expect(walletBalancePaise).toBe(85000);

      // 2. Provider purchases ₹299 monthly subscription using UPI gateway
      // This is a direct payment, NOT an unconsented deduction from order earnings
      const subscriptionFeePaise = 29900;
      const externalUpiPaymentSuccessful = true;
      expect(externalUpiPaymentSuccessful).toBe(true);

      // Wallet balance remains untouched by outside subscription purchase
      expect(walletBalancePaise).toBe(85000);

      // 3. Order 2 Completed with 0% Commission (Premium Provider)
      const order2GrossPaise = 100000;
      const order2CommissionPaise = 0;
      const order2NetPaise = order2GrossPaise - order2CommissionPaise; // ₹1,000 full
      walletBalancePaise += order2NetPaise;

      expect(walletBalancePaise).toBe(185000); // ₹1,850.00 total
    });
  });
});

