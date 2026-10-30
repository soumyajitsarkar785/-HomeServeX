import { prisma } from './prisma.js';

export interface AdminCommissionSettings {
  defaultCommissionPercentage: number; // default 15.0
  premiumCommissionPercentage: number; // default 0.0
  subscriptionEnabled: boolean;
  allowProviderSubscriptionPurchase: boolean;
  orderEntitlementPolicy: 'ACTIVE_AT_COMPLETION' | 'ACTIVE_AT_ACCEPTANCE' | 'ACTIVE_AT_BOTH';
  minimumPayoutPaise: number; // default 50000 = ₹500
  payoutCycleDays: number;
  autoPayoutEnabled: boolean;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export const DEFAULT_COMMISSION_SETTINGS: AdminCommissionSettings = {
  defaultCommissionPercentage: 15.0,
  premiumCommissionPercentage: 0.0,
  subscriptionEnabled: true,
  allowProviderSubscriptionPurchase: true,
  orderEntitlementPolicy: 'ACTIVE_AT_COMPLETION',
  minimumPayoutPaise: 50000, // ₹500
  payoutCycleDays: 7,
  autoPayoutEnabled: true,
  version: 1,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export interface OrderFinancialBreakdown {
  baseAmountPaise: number;
  optionsAmountPaise: number;
  discountAmountPaise: number;
  grossSubtotalPaise: number;
  taxRatePercent: number;
  taxAmountPaise: number;
  totalCustomerPayablePaise: number;
  commissionRatePercent: number;
  commissionAmountPaise: number;
  providerNetEarningsPaise: number;
  membershipType: 'NORMAL' | 'PREMIUM';
  subscriptionId?: string;
  entitlementReason: string;
}

export class CommissionEngine {
  private static instance: CommissionEngine;
  private cachedSettings: AdminCommissionSettings | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 5000;

  private constructor() {}

  public static getInstance(): CommissionEngine {
    if (!CommissionEngine.instance) {
      CommissionEngine.instance = new CommissionEngine();
    }
    return CommissionEngine.instance;
  }

  /**
   * Retrieve authoritative Admin commission & subscription configuration
   */
  public async getSettings(): Promise<AdminCommissionSettings> {
    const now = Date.now();
    if (this.cachedSettings && now - this.lastFetchTime < this.CACHE_TTL_MS) {
      return this.cachedSettings;
    }

    try {
      const setting = await prisma.platformSetting.findUnique({
        where: { key: 'COMMISSION_AND_SUBSCRIPTION_SETTINGS' },
      });

      if (setting && setting.value) {
        this.cachedSettings = {
          ...DEFAULT_COMMISSION_SETTINGS,
          ...JSON.parse(setting.value),
        };
      } else {
        this.cachedSettings = DEFAULT_COMMISSION_SETTINGS;
      }
      this.lastFetchTime = now;
      return this.cachedSettings || DEFAULT_COMMISSION_SETTINGS;
    } catch {
      return DEFAULT_COMMISSION_SETTINGS;
    }
  }

  /**
   * Update Admin commission & subscription settings with database persistence and audit log
   */
  public async updateSettings(
    newSettings: Partial<AdminCommissionSettings>,
    adminUser: string = 'admin'
  ): Promise<AdminCommissionSettings> {
    const current = await this.getSettings();

    // Validation
    if (newSettings.defaultCommissionPercentage !== undefined) {
      if (typeof newSettings.defaultCommissionPercentage !== 'number' || newSettings.defaultCommissionPercentage < 0 || newSettings.defaultCommissionPercentage > 50) {
        throw new Error('Default commission must be between 0% and 50%');
      }
    }
    if (newSettings.minimumPayoutPaise !== undefined) {
      if (typeof newSettings.minimumPayoutPaise !== 'number' || newSettings.minimumPayoutPaise < 10000) {
        throw new Error('Minimum payout threshold must be at least ₹100 (10000 paise)');
      }
    }

    const updated: AdminCommissionSettings = {
      ...current,
      ...newSettings,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUser,
    };

    await prisma.$transaction(async (tx) => {
      await tx.platformSetting.upsert({
        where: { key: 'COMMISSION_AND_SUBSCRIPTION_SETTINGS' },
        create: {
          key: 'COMMISSION_AND_SUBSCRIPTION_SETTINGS',
          value: JSON.stringify(updated),
          description: 'Authoritative platform commission rate and subscription policies',
        },
        update: {
          value: JSON.stringify(updated),
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_COMMISSION_AND_SUBSCRIPTION_SETTINGS',
          resource: 'COMMISSION_SETTINGS',
          details: JSON.stringify({
            previousVersion: current.version,
            newVersion: updated.version,
            defaultCommissionPercentage: updated.defaultCommissionPercentage,
            updatedBy: adminUser,
          }),
        },
      });
    });

    this.cachedSettings = updated;
    this.lastFetchTime = Date.now();
    return updated;
  }

  /**
   * Determine whether a provider has a valid active subscription entitlement
   */
  public async getProviderSubscriptionEntitlement(
    providerId: string,
    targetDate: Date = new Date()
  ): Promise<{
    isPremium: boolean;
    commissionRatePercent: number;
    subscription: any | null;
    reason: string;
  }> {
    const settings = await this.getSettings();

    if (!settings.subscriptionEnabled) {
      return {
        isPremium: false,
        commissionRatePercent: settings.defaultCommissionPercentage,
        subscription: null,
        reason: 'Subscription system disabled by platform administrator',
      };
    }

    // Find active subscription covering targetDate
    const activeSub = await prisma.providerSubscription.findFirst({
      where: {
        providerId,
        status: 'ACTIVE',
        startDate: { lte: targetDate },
        endDate: { gte: targetDate },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    if (activeSub) {
      return {
        isPremium: true,
        commissionRatePercent: activeSub.commissionExemptionRate ?? 0.0,
        subscription: activeSub,
        reason: `Active Premium Subscription (${activeSub.plan.name}) — 0% Commission Entitlement`,
      };
    }

    // Check if subscription recently expired
    const expiredSub = await prisma.providerSubscription.findFirst({
      where: {
        providerId,
        endDate: { lt: targetDate },
      },
      orderBy: { endDate: 'desc' },
    });

    // Ensure provider profile membershipType reflects status
    const profile = await prisma.providerProfile.findUnique({
      where: { id: providerId },
      select: { membershipType: true },
    });
    if (profile && profile.membershipType === 'PREMIUM') {
      await prisma.providerProfile.update({
        where: { id: providerId },
        data: { membershipType: 'NORMAL' },
      });
    }

    return {
      isPremium: false,
      commissionRatePercent: settings.defaultCommissionPercentage,
      subscription: expiredSub,
      reason: expiredSub
        ? `Subscription expired on ${new Date(expiredSub.endDate).toLocaleDateString('en-GB')}. Reverted to Normal Provider (${settings.defaultCommissionPercentage}% commission).`
        : `Normal Provider membership — Standard ${settings.defaultCommissionPercentage}% commission applied.`,
    };
  }

  /**
   * Centralized accurate server-side financial calculation for an order
   */
  public async calculateOrderFinancials(params: {
    baseAmountPaise: number;
    optionsAmountPaise?: number;
    discountAmountPaise?: number;
    taxRatePercent?: number;
    providerId?: string;
    targetDate?: Date;
  }): Promise<OrderFinancialBreakdown> {
    const settings = await this.getSettings();
    const baseAmountPaise = Math.max(0, Math.round(params.baseAmountPaise));
    const optionsAmountPaise = Math.max(0, Math.round(params.optionsAmountPaise || 0));
    const discountAmountPaise = Math.max(0, Math.round(params.discountAmountPaise || 0));

    // Gross service amount payable to technician/platform before tax
    const grossSubtotalPaise = Math.max(0, baseAmountPaise + optionsAmountPaise - discountAmountPaise);

    // 18% GST (9% CGST + 9% SGST)
    const taxRatePercent = params.taxRatePercent !== undefined ? params.taxRatePercent : 18;
    const taxAmountPaise = Math.round(grossSubtotalPaise * (taxRatePercent / 100));
    const totalCustomerPayablePaise = grossSubtotalPaise + taxAmountPaise;

    // Determine Commission Rate (0% for Premium, 15% for Normal)
    let commissionRatePercent = settings.defaultCommissionPercentage;
    let membershipType: 'NORMAL' | 'PREMIUM' = 'NORMAL';
    let subscriptionId: string | undefined = undefined;
    let entitlementReason = `Standard ${settings.defaultCommissionPercentage}% platform commission`;

    if (params.providerId) {
      const entitlement = await this.getProviderSubscriptionEntitlement(params.providerId, params.targetDate || new Date());
      if (entitlement.isPremium) {
        commissionRatePercent = entitlement.commissionRatePercent; // 0.0%
        membershipType = 'PREMIUM';
        subscriptionId = entitlement.subscription?.id;
        entitlementReason = entitlement.reason;
      } else {
        commissionRatePercent = entitlement.commissionRatePercent;
        membershipType = 'NORMAL';
        entitlementReason = entitlement.reason;
      }
    }

    // Platform Commission is calculated on gross service subtotal (strictly in integer paise)
    const commissionAmountPaise = Math.round(grossSubtotalPaise * (commissionRatePercent / 100));

    // Provider Net Earnings = Service Subtotal - Platform Commission
    // (If 0% commission: provider keeps 100% of gross subtotal!)
    const providerNetEarningsPaise = Math.max(0, grossSubtotalPaise - commissionAmountPaise);

    return {
      baseAmountPaise,
      optionsAmountPaise,
      discountAmountPaise,
      grossSubtotalPaise,
      taxRatePercent,
      taxAmountPaise,
      totalCustomerPayablePaise,
      commissionRatePercent,
      commissionAmountPaise,
      providerNetEarningsPaise,
      membershipType,
      subscriptionId,
      entitlementReason,
    };
  }

  /**
   * Settle Completed Booking into Financial Ledger & Provider Wallet atomically
   * Strict Double-Entry: GROSS_EARNING_CREDIT (+₹1000) -> COMMISSION_DEBIT (-₹150) -> COMPANY COMMISSION LEDGER (+₹150)
   * Net Provider Balance Impact = +₹850.
   */
  public async settleCompletedBooking(
    bookingId: string,
    providerId: string,
    completionDate: Date = new Date()
  ): Promise<{
    snapshot: any;
    walletBalancePaise: number;
    providerEarningsPaise: number;
    commissionPaise: number;
    grossSubtotalPaise: number;
  }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch booking with address, service, options
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { service: true, address: true },
      });

      if (!booking) {
        throw new Error(`NOT_FOUND: Booking ${bookingId} not found`);
      }

      // Idempotency: check if already settled to prevent duplicate financial entries
      const existingSnapshot = await tx.orderFinancialSnapshot.findUnique({
        where: { bookingId: booking.id },
      });
      if (existingSnapshot && existingSnapshot.status === 'SETTLED') {
        const wallet = await tx.providerWallet.findUnique({ where: { providerId } });
        return {
          snapshot: existingSnapshot,
          walletBalancePaise: wallet?.balancePaise || 0,
          providerEarningsPaise: existingSnapshot.providerNetEarningsPaise,
          commissionPaise: existingSnapshot.commissionAmountPaise,
          grossSubtotalPaise: existingSnapshot.serviceGrossPaise,
        };
      }

      // 2. Calculate accurate financials based on provider's subscription entitlement at completion
      const financials = await this.calculateOrderFinancials({
        baseAmountPaise: booking.baseAmountPaise,
        optionsAmountPaise: booking.optionsAmountPaise,
        discountAmountPaise: booking.discountAmountPaise,
        providerId,
        targetDate: completionDate,
      });

      const isPremium = financials.membershipType === 'PREMIUM';
      const settings = await this.getSettings();
      const hypotheticalSavingsPaise = isPremium
        ? Math.round(financials.grossSubtotalPaise * (settings.defaultCommissionPercentage / 100))
        : 0;

      // 3. Update Booking with finalized financial values
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'COMPLETED',
          paymentStatus: 'PAID',
          commissionAmountPaise: financials.commissionAmountPaise,
          providerEarningsPaise: financials.providerNetEarningsPaise,
          updatedAt: completionDate,
        },
      });

      // 4. Create or load ProviderWallet
      let wallet = await tx.providerWallet.findUnique({ where: { providerId } });
      if (!wallet) {
        wallet = await tx.providerWallet.create({
          data: {
            providerId,
            balancePaise: 0,
            pendingPaise: 0,
            totalEarnedPaise: 0,
            totalCommissionPaidPaise: 0,
            totalWithdrawnPaise: 0,
          },
        });
      }

      // Double-entry calculation:
      // Starting balance -> +Gross Earning -> -Commission Debit -> Final Net Balance
      const walletBeforePaise = wallet.balancePaise;
      const balanceAfterGrossPaise = walletBeforePaise + financials.grossSubtotalPaise;
      const finalBalancePaise = balanceAfterGrossPaise - financials.commissionAmountPaise;

      const newTotalEarnedPaise = wallet.totalEarnedPaise + financials.grossSubtotalPaise;
      const newTotalCommissionPaidPaise = wallet.totalCommissionPaidPaise + financials.commissionAmountPaise;

      await tx.providerWallet.update({
        where: { id: wallet.id },
        data: {
          balancePaise: finalBalancePaise,
          totalEarnedPaise: newTotalEarnedPaise,
          totalCommissionPaidPaise: newTotalCommissionPaidPaise,
        },
      });

      // 5. Create immutable OrderFinancialSnapshot
      const snapshot = await tx.orderFinancialSnapshot.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          providerId,
          membershipType: financials.membershipType,
          subscriptionId: financials.subscriptionId,
          serviceGrossPaise: financials.grossSubtotalPaise,
          commissionRatePercent: financials.commissionRatePercent,
          commissionAmountPaise: financials.commissionAmountPaise,
          providerNetEarningsPaise: financials.providerNetEarningsPaise,
          taxAmountPaise: financials.taxAmountPaise,
          totalCustomerPaidPaise: financials.totalCustomerPayablePaise,
          status: 'SETTLED',
          settledAt: completionDate,
        },
        update: {
          membershipType: financials.membershipType,
          subscriptionId: financials.subscriptionId,
          serviceGrossPaise: financials.grossSubtotalPaise,
          commissionRatePercent: financials.commissionRatePercent,
          commissionAmountPaise: financials.commissionAmountPaise,
          providerNetEarningsPaise: financials.providerNetEarningsPaise,
          taxAmountPaise: financials.taxAmountPaise,
          totalCustomerPaidPaise: financials.totalCustomerPayablePaise,
          status: 'SETTLED',
          settledAt: completionDate,
        },
      });

      const uniqueSuffix = Date.now().toString().slice(-4);

      // 6. Double-Entry Balanced FinancialLedger Entries (Part 10.1 & 10.2)
      // Transaction 1: GROSS_EARNING_CREDIT = +Gross Earning
      await tx.financialLedger.create({
        data: {
          entryNumber: `TXN-GROSS-${booking.referenceNumber}-${uniqueSuffix}`,
          providerId,
          walletId: wallet.id,
          bookingId: booking.id,
          type: 'CREDIT',
          category: 'GROSS_EARNING_CREDIT',
          amountPaise: financials.grossSubtotalPaise,
          balanceAfterPaise: balanceAfterGrossPaise,
          description: `Gross service earning credit for #${booking.referenceNumber} (${booking.service.name})`,
          reference: booking.referenceNumber,
          metadata: JSON.stringify({
            step: 'GROSS_EARNING_CREDIT',
            grossSubtotalRupees: financials.grossSubtotalPaise / 100,
          }),
        },
      });

      // Transaction 2: COMMISSION_DEBIT = -Commission Amount (Funded by the same order!)
      await tx.financialLedger.create({
        data: {
          entryNumber: `TXN-COMM-${booking.referenceNumber}-${uniqueSuffix}`,
          providerId,
          walletId: wallet.id,
          bookingId: booking.id,
          type: 'DEBIT',
          category: 'COMMISSION_DEBIT',
          amountPaise: financials.commissionAmountPaise,
          balanceAfterPaise: finalBalancePaise,
          description: financials.commissionAmountPaise > 0
            ? `Platform commission deduction (${financials.commissionRatePercent}%) for #${booking.referenceNumber}`
            : `0% Commission Pro Tier applied for #${booking.referenceNumber} (Zero fee deduction)`,
          reference: booking.referenceNumber,
          metadata: JSON.stringify({
            step: 'COMMISSION_DEBIT',
            commissionRatePercent: financials.commissionRatePercent,
            commissionAmountRupees: financials.commissionAmountPaise / 100,
            fundedBySameOrder: true,
          }),
        },
      });

      // 7. Company Commission Ledger Entry (Part 10.1)
      await tx.companyCommissionLedger.create({
        data: {
          entryNumber: `COM-TXN-${booking.referenceNumber}-${uniqueSuffix}`,
          bookingId: booking.id,
          providerId,
          categoryId: booking.service.categoryId,
          type: isPremium ? 'EXEMPT_SUBSCRIPTION_BENEFIT' : 'COMMISSION_REVENUE_CREDIT',
          grossAmountPaise: financials.grossSubtotalPaise,
          commissionRatePercent: financials.commissionRatePercent,
          commissionAmountPaise: isPremium ? 0 : financials.commissionAmountPaise,
          exemptSavingsPaise: isPremium ? hypotheticalSavingsPaise : 0,
          status: 'SETTLED',
          description: isPremium
            ? `0% Commission benefit applied for Pro Partner #${booking.referenceNumber}`
            : `Platform commission revenue (${financials.commissionRatePercent}%) from #${booking.referenceNumber}`,
          reference: booking.referenceNumber,
          settledAt: completionDate,
        },
      });

      return {
        snapshot,
        walletBalancePaise: finalBalancePaise,
        providerEarningsPaise: financials.providerNetEarningsPaise,
        commissionPaise: financials.commissionAmountPaise,
        grossSubtotalPaise: financials.grossSubtotalPaise,
      };
    });
  }

  /**
   * Authoritative centralized method alias for automated financial settlement engine (Part 11)
   */
  public async settleCompletedBookingFinancials(
    bookingId: string,
    providerId: string,
    completionDate: Date = new Date()
  ) {
    return this.settleCompletedBooking(bookingId, providerId, completionDate);
  }
}

export const commissionEngine = CommissionEngine.getInstance();
