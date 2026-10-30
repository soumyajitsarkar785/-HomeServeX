import crypto from 'crypto';
import { prisma } from './prisma.js';

export interface WalletSummary {
  walletId: string;
  providerId: string;
  balancePaise: number;
  balanceRupees: number;
  pendingPaise: number;
  pendingRupees: number;
  totalEarnedPaise: number;
  totalEarnedRupees: number;
  totalCommissionPaidPaise: number;
  totalCommissionPaidRupees: number;
  totalWithdrawnPaise: number;
  totalWithdrawnRupees: number;
  isPayoutEligible: boolean;
  minimumPayoutRupees: number;
  recentTransactions: any[];
}

export class WalletLedgerService {
  private static instance: WalletLedgerService;

  private constructor() {}

  public static getInstance(): WalletLedgerService {
    if (!WalletLedgerService.instance) {
      WalletLedgerService.instance = new WalletLedgerService();
    }
    return WalletLedgerService.instance;
  }

  /**
   * Authoritative getter or initializer for raw provider wallet database model
   */
  public async getOrCreateWallet(providerId: string) {
    let wallet = await prisma.providerWallet.findUnique({
      where: { providerId },
    });
    if (!wallet) {
      wallet = await prisma.providerWallet.create({
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
    return wallet;
  }

  /**
   * Get or initialize provider wallet summary with formatted financial values
   */
  public async getProviderWalletSummary(providerId: string): Promise<WalletSummary> {
    let wallet = await prisma.providerWallet.findUnique({
      where: { providerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      wallet = await prisma.providerWallet.create({
        data: {
          providerId,
          balancePaise: 0,
          pendingPaise: 0,
          totalEarnedPaise: 0,
          totalCommissionPaidPaise: 0,
          totalWithdrawnPaise: 0,
        },
        include: {
          transactions: true,
        },
      });
    }

    const minimumPayoutRupees = 500;
    const isPayoutEligible = wallet.balancePaise >= minimumPayoutRupees * 100;

    return {
      walletId: wallet.id,
      providerId: wallet.providerId,
      balancePaise: wallet.balancePaise,
      balanceRupees: wallet.balancePaise / 100,
      pendingPaise: wallet.pendingPaise,
      pendingRupees: wallet.pendingPaise / 100,
      totalEarnedPaise: wallet.totalEarnedPaise,
      totalEarnedRupees: wallet.totalEarnedPaise / 100,
      totalCommissionPaidPaise: wallet.totalCommissionPaidPaise,
      totalCommissionPaidRupees: wallet.totalCommissionPaidPaise / 100,
      totalWithdrawnPaise: wallet.totalWithdrawnPaise,
      totalWithdrawnRupees: wallet.totalWithdrawnPaise / 100,
      isPayoutEligible,
      minimumPayoutRupees,
      recentTransactions: wallet.transactions.map((tx) => ({
        id: tx.id,
        entryNumber: tx.entryNumber,
        type: tx.type,
        category: tx.category,
        amountPaise: tx.amountPaise,
        amountRupees: tx.amountPaise / 100,
        balanceAfterRupees: tx.balanceAfterPaise / 100,
        description: tx.description,
        reference: tx.reference,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get paginated ledger transactions for a provider
   */
  public async getProviderLedger(
    providerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await prisma.$transaction([
      prisma.financialLedger.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.financialLedger.count({ where: { providerId } }),
    ]);

    return {
      data: transactions.map((t) => ({
        ...t,
        amountRupees: t.amountPaise / 100,
        balanceAfterRupees: t.balanceAfterPaise / 100,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Provider requests withdrawal / payout
   * Supports both object parameters and positional arguments.
   */
  public async requestPayout(
    providerIdOrParams: string | {
      providerId: string;
      amountPaise?: number;
      amountRupees?: number;
      paymentMethod?: string;
      accountDetails?: { upiId?: string; bankName?: string; accountNumber?: string; ifsc?: string };
    },
    amountRupeesArg?: number,
    accountDetailsArg?: { upiId?: string; bankName?: string; accountNumber?: string; ifsc?: string }
  ): Promise<any> {
    let providerId: string;
    let amountPaise: number;
    let amountRupees: number;
    let paymentMethod = 'UPI';
    let accountDetails: any = {};

    if (typeof providerIdOrParams === 'object') {
      providerId = providerIdOrParams.providerId;
      if (providerIdOrParams.amountPaise !== undefined) {
        amountPaise = providerIdOrParams.amountPaise;
        amountRupees = amountPaise / 100;
      } else {
        amountRupees = providerIdOrParams.amountRupees ?? 500;
        amountPaise = Math.round(amountRupees * 100);
      }
      if (providerIdOrParams.paymentMethod) paymentMethod = providerIdOrParams.paymentMethod;
      if (providerIdOrParams.accountDetails) accountDetails = providerIdOrParams.accountDetails;
    } else {
      providerId = providerIdOrParams;
      amountRupees = amountRupeesArg ?? 500;
      amountPaise = Math.round(amountRupees * 100);
      accountDetails = accountDetailsArg ?? {};
      paymentMethod = accountDetails.upiId ? 'UPI' : 'BANK_TRANSFER';
    }

    const minimumPaise = 50000; // ₹500

    if (amountPaise < minimumPaise) {
      throw new Error('Minimum withdrawal amount is ₹500');
    }

    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.providerWallet.findUnique({ where: { providerId } });
      if (!wallet) throw new Error('Wallet not found');

      if (wallet.balancePaise < amountPaise) {
        throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balancePaise / 100}, Requested: ₹${amountRupees}`);
      }

      // Deduct from available balance, hold in pending
      const updatedWallet = await tx.providerWallet.update({
        where: { id: wallet.id },
        data: {
          balancePaise: wallet.balancePaise - amountPaise,
          pendingPaise: wallet.pendingPaise + amountPaise,
        },
      });

      const referenceNumber = `HSX-PAYOUT-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      const payout = await tx.providerPayout.create({
        data: {
          referenceNumber,
          providerId,
          walletId: wallet.id,
          amountPaise,
          status: 'PENDING',
          paymentMethod,
          accountDetails: JSON.stringify(accountDetails),
        },
      });

      // Record ledger hold
      await tx.financialLedger.create({
        data: {
          entryNumber: `TXN-PAYOUT-HOLD-${referenceNumber}`,
          providerId,
          walletId: wallet.id,
          payoutId: payout.id,
          type: 'DEBIT',
          category: 'PAYOUT_WITHDRAWAL',
          amountPaise,
          balanceAfterPaise: updatedWallet.balancePaise,
          description: `Withdrawal request #${referenceNumber} submitted (Held for admin disbursement)`,
          reference: referenceNumber,
          metadata: JSON.stringify(accountDetails),
        },
      });

      return {
        id: payout.id,
        payoutId: payout.id,
        referenceNumber: payout.referenceNumber,
        amountRupees,
        amountPaise,
        remainingBalanceRupees: updatedWallet.balancePaise / 100,
        status: payout.status,
      };
    });
  }

  /**
   * Admin approves or rejects payout
   */
  public async adminProcessPayout(
    payoutId: string,
    action: 'APPROVE' | 'REJECT',
    adminUser: string = 'admin',
    notes?: string
  ): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const payout = await tx.providerPayout.findUnique({
        where: { id: payoutId },
        include: { wallet: true },
      });

      if (!payout) throw new Error(`Payout ${payoutId} not found`);
      if (payout.status !== 'PENDING') {
        throw new Error(`Payout is already ${payout.status}`);
      }

      const now = new Date();

      if (action === 'APPROVE') {
        // Complete payout
        await tx.providerPayout.update({
          where: { id: payout.id },
          data: {
            status: 'COMPLETED',
            processedAt: now,
            adminNotes: notes || `Approved and disbursed by ${adminUser}`,
          },
        });

        // Deduct pending, increase totalWithdrawn
        await tx.providerWallet.update({
          where: { id: payout.walletId },
          data: {
            pendingPaise: Math.max(0, payout.wallet.pendingPaise - payout.amountPaise),
            totalWithdrawnPaise: payout.wallet.totalWithdrawnPaise + payout.amountPaise,
          },
        });

        await tx.financialLedger.create({
          data: {
            entryNumber: `TXN-PAYOUT-DISBURSED-${payout.referenceNumber}`,
            providerId: payout.providerId,
            walletId: payout.walletId,
            payoutId: payout.id,
            type: 'DEBIT',
            category: 'PAYOUT_WITHDRAWAL',
            amountPaise: payout.amountPaise,
            balanceAfterPaise: payout.wallet.balancePaise,
            description: `Payout #${payout.referenceNumber} disbursed successfully via ${payout.paymentMethod}`,
            reference: payout.referenceNumber,
            metadata: JSON.stringify({ disbursedAt: now.toISOString(), adminUser }),
          },
        });

        const updatedPayout = await tx.providerPayout.findUnique({ where: { id: payout.id } });
        return { success: true, status: 'COMPLETED', payout: updatedPayout, message: 'Payout approved and marked disbursed.' };
      } else {
        // Reject and refund pending balance back to provider wallet
        const updatedWallet = await tx.providerWallet.update({
          where: { id: payout.walletId },
          data: {
            balancePaise: payout.wallet.balancePaise + payout.amountPaise,
            pendingPaise: Math.max(0, payout.wallet.pendingPaise - payout.amountPaise),
          },
        });

        await tx.providerPayout.update({
          where: { id: payout.id },
          data: {
            status: 'REJECTED',
            rejectionReason: notes || 'Rejected by administrator',
            adminNotes: `Rejected by ${adminUser}: ${notes || 'No reason provided'}`,
          },
        });

        await tx.financialLedger.create({
          data: {
            entryNumber: `TXN-PAYOUT-REFUND-${payout.referenceNumber}`,
            providerId: payout.providerId,
            walletId: payout.walletId,
            payoutId: payout.id,
            type: 'CREDIT',
            category: 'REFUND_REVERSAL',
            amountPaise: payout.amountPaise,
            balanceAfterPaise: updatedWallet.balancePaise,
            description: `Payout #${payout.referenceNumber} rejected. ₹${payout.amountPaise / 100} returned to available balance.`,
            reference: payout.referenceNumber,
            metadata: JSON.stringify({ rejectionReason: notes, adminUser }),
          },
        });

        return { success: true, status: 'REJECTED', message: 'Payout rejected. Funds restored to provider wallet.' };
      }
    });
  }

  /**
   * Enterprise-Grade Platform Revenue Analytics & Financial Reconciliation
   */
  public async getPlatformRevenueAnalytics(): Promise<any> {
    const [
      totalBookings,
      completedBookings,
      allSnapshots,
      successfulSubPayments,
      allWallets,
      allPayouts,
      providers,
    ] = await prisma.$transaction([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.orderFinancialSnapshot.findMany(),
      prisma.subscriptionPayment.findMany({ where: { status: 'SUCCESS' } }),
      prisma.providerWallet.findMany(),
      prisma.providerPayout.findMany(),
      prisma.providerProfile.findMany({ select: { id: true, membershipType: true } }),
    ]);

    // 1. Gross Booking Value (GBV)
    const grossBookingValuePaise = allSnapshots.reduce((acc, s) => acc + s.serviceGrossPaise, 0);

    // 2. Order Platform Commission Revenue
    const commissionRevenuePaise = allSnapshots.reduce((acc, s) => acc + s.commissionAmountPaise, 0);

    // 3. Provider Subscription Revenue
    const subscriptionRevenuePaise = successfulSubPayments.reduce((acc, p) => acc + p.amountPaise, 0);

    // 4. Total Platform Net Revenue = Commission + Subscriptions
    const totalPlatformRevenuePaise = commissionRevenuePaise + subscriptionRevenuePaise;

    // 5. Provider Payout Liability & Disbursed
    const providerWalletLiabilityPaise = allWallets.reduce((acc, w) => acc + w.balancePaise + w.pendingPaise, 0);
    const completedPayouts = allPayouts.filter((p) => p.status === 'COMPLETED');
    const totalPayoutsDisbursedPaise = completedPayouts.reduce((acc, p) => acc + p.amountPaise, 0);
    const pendingPayoutsCount = allPayouts.filter((p) => p.status === 'PENDING').length;

    // 6. Provider Membership Distribution
    const premiumProvidersCount = providers.filter((p) => p.membershipType === 'PREMIUM').length;
    const normalProvidersCount = providers.length - premiumProvidersCount;

    // 7. Active Subscriptions
    const now = new Date();
    const activeSubsCount = await prisma.providerSubscription.count({
      where: { status: 'ACTIVE', endDate: { gte: now } },
    });
    const expiredSubsCount = await prisma.providerSubscription.count({
      where: { OR: [{ status: 'EXPIRED' }, { endDate: { lt: now } }] },
    });

    return {
      kpis: {
        grossBookingValueRupees: grossBookingValuePaise / 100,
        commissionRevenueRupees: commissionRevenuePaise / 100,
        subscriptionRevenueRupees: subscriptionRevenuePaise / 100,
        totalPlatformRevenueRupees: totalPlatformRevenuePaise / 100,
        providerWalletLiabilityRupees: providerWalletLiabilityPaise / 100,
        totalPayoutsDisbursedRupees: totalPayoutsDisbursedPaise / 100,
        pendingPayoutsCount,
        totalBookings,
        completedBookings,
        normalProvidersCount,
        premiumProvidersCount,
        activeSubscriptionsCount: activeSubsCount,
        expiredSubscriptionsCount: expiredSubsCount,
      },
      revenueBreakdown: {
        commissionSharePercent: totalPlatformRevenuePaise > 0 ? Math.round((commissionRevenuePaise / totalPlatformRevenuePaise) * 100) : 75,
        subscriptionSharePercent: totalPlatformRevenuePaise > 0 ? Math.round((subscriptionRevenuePaise / totalPlatformRevenuePaise) * 100) : 25,
      },
      recentSettlements: allSnapshots.slice(-10).reverse().map((s) => ({
        id: s.id,
        bookingId: s.bookingId,
        membershipType: s.membershipType,
        grossRupees: s.serviceGrossPaise / 100,
        commissionRatePercent: s.commissionRatePercent,
        commissionRupees: s.commissionAmountPaise / 100,
        providerNetRupees: s.providerNetEarningsPaise / 100,
        settledAt: s.settledAt?.toISOString() || s.createdAt.toISOString(),
      })),
      recentSubscriptionSales: successfulSubPayments.slice(-10).reverse().map((p) => ({
        id: p.id,
        gatewayOrderId: p.gatewayOrderId,
        amountRupees: p.amountPaise / 100,
        paymentMethod: p.paymentMethod,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }
}

export const walletLedgerService = WalletLedgerService.getInstance();
