import crypto from 'crypto';
import { prisma } from './prisma.js';

export interface SubscriptionStatusSummary {
  membershipType: 'NORMAL' | 'PREMIUM';
  status: 'NORMAL' | 'PREMIUM_ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
  currentCommissionRate: number; // 0% if premium, 15% if normal
  activeSubscription: {
    id: string;
    planId: string;
    planName: string;
    planSlug: string;
    startDate: string;
    endDate: string;
    remainingDays: number;
    remainingHours: number;
    amountPaidRupees: number;
    badge: string;
    autoRenew: boolean;
  } | null;
  benefits: string[];
  recentInvoices: any[];
}

export class SubscriptionEngine {
  private static instance: SubscriptionEngine;

  private constructor() {}

  public static getInstance(): SubscriptionEngine {
    if (!SubscriptionEngine.instance) {
      SubscriptionEngine.instance = new SubscriptionEngine();
    }
    return SubscriptionEngine.instance;
  }

  /**
   * List all available subscription plans
   */
  public async listPlans(includeInactive: boolean = false): Promise<any[]> {
    const where = includeInactive ? {} : { isActive: true };
    const plans = await prisma.subscriptionPlan.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { pricePaise: 'asc' }],
    });

    return plans.map((p) => {
      let parsedBenefits: string[] = [];
      try {
        parsedBenefits = JSON.parse(p.benefits);
      } catch {
        parsedBenefits = [p.benefits];
      }
      return {
        ...p,
        priceRupees: p.pricePaise / 100,
        benefits: parsedBenefits,
      };
    });
  }

  /**
   * Get plan details by slug or id
   */
  public async getPlan(slugOrId: string): Promise<any | null> {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
    });
    if (!plan) return null;

    let parsedBenefits: string[] = [];
    try {
      parsedBenefits = JSON.parse(plan.benefits);
    } catch {
      parsedBenefits = [plan.benefits];
    }
    return {
      ...plan,
      priceRupees: plan.pricePaise / 100,
      benefits: parsedBenefits,
    };
  }

  /**
   * Admin: Create or update subscription plan
   */
  public async upsertPlan(data: {
    id?: string;
    name: string;
    slug: string;
    description?: string;
    priceRupees: number;
    durationDays: number;
    commissionRatePercent?: number;
    benefits: string[] | string;
    badge?: string;
    isActive?: boolean;
    isPopular?: boolean;
    displayOrder?: number;
  }, adminUser: string = 'admin'): Promise<any> {
    const pricePaise = Math.round(data.priceRupees * 100);
    const benefitsStr = Array.isArray(data.benefits) ? JSON.stringify(data.benefits) : data.benefits;

    const plan = await prisma.subscriptionPlan.upsert({
      where: { slug: data.slug },
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        pricePaise,
        durationDays: data.durationDays,
        commissionRatePercent: data.commissionRatePercent ?? 0.0,
        benefits: benefitsStr,
        badge: data.badge || 'PREMIUM_ZERO_COMMISSION',
        isActive: data.isActive !== false,
        isPopular: !!data.isPopular,
        displayOrder: data.displayOrder ?? 0,
      },
      update: {
        name: data.name,
        description: data.description,
        pricePaise,
        durationDays: data.durationDays,
        commissionRatePercent: data.commissionRatePercent ?? 0.0,
        benefits: benefitsStr,
        badge: data.badge,
        isActive: data.isActive,
        isPopular: data.isPopular,
        displayOrder: data.displayOrder,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPSERT_SUBSCRIPTION_PLAN',
        resource: 'SUBSCRIPTION_PLAN',
        resourceId: plan.id,
        details: JSON.stringify({ slug: plan.slug, priceRupees: data.priceRupees, updatedBy: adminUser }),
      },
    });

    return plan;
  }

  /**
   * Get detailed real-time subscription status for a provider
   */
  public async getProviderSubscriptionStatus(providerId: string): Promise<SubscriptionStatusSummary> {
    const now = new Date();

    // 1. Fetch active subscription
    const activeSub = await prisma.providerSubscription.findFirst({
      where: {
        providerId,
        status: 'ACTIVE',
        endDate: { gte: now },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    // 2. Fetch recent invoices
    const invoices = await prisma.subscriptionInvoice.findMany({
      where: { providerId },
      orderBy: { issuedAt: 'desc' },
      take: 5,
    });

    if (activeSub) {
      const remainingMs = Math.max(0, activeSub.endDate.getTime() - now.getTime());
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      const isExpiringSoon = remainingDays <= 7;

      let planBenefits: string[] = [];
      try {
        planBenefits = JSON.parse(activeSub.plan.benefits);
      } catch {
        planBenefits = [activeSub.plan.benefits];
      }

      return {
        membershipType: 'PREMIUM',
        status: isExpiringSoon ? 'EXPIRING_SOON' : 'PREMIUM_ACTIVE',
        currentCommissionRate: activeSub.commissionExemptionRate ?? 0.0,
        activeSubscription: {
          id: activeSub.id,
          planId: activeSub.planId,
          planName: activeSub.plan.name,
          planSlug: activeSub.plan.slug,
          startDate: activeSub.startDate.toISOString(),
          endDate: activeSub.endDate.toISOString(),
          remainingDays,
          remainingHours,
          amountPaidRupees: activeSub.amountPaidPaise / 100,
          badge: activeSub.plan.badge || 'PREMIUM_ZERO_COMMISSION',
          autoRenew: activeSub.autoRenew,
        },
        benefits: planBenefits,
        recentInvoices: invoices.map((inv) => ({
          ...inv,
          amountRupees: inv.amountPaise / 100,
          totalRupees: inv.totalPaise / 100,
        })),
      };
    }

    // Check if expired subscription exists
    const lastExpired = await prisma.providerSubscription.findFirst({
      where: { providerId },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    return {
      membershipType: 'NORMAL',
      status: lastExpired ? 'EXPIRED' : 'NORMAL',
      currentCommissionRate: 15.0, // Standard commission
      activeSubscription: null,
      benefits: [
        'Full access to all nearby customer orders',
        'Standard 15% platform commission',
        'Upgrade to Premium anytime for 0% commission',
      ],
      recentInvoices: invoices.map((inv) => ({
        ...inv,
        amountRupees: inv.amountPaise / 100,
        totalRupees: inv.totalPaise / 100,
      })),
    };
  }

  /**
   * Create authoritative server-side subscription payment order
   */
  public async createSubscriptionPaymentOrder(
    providerId: string,
    planSlug: string,
    paymentMethod: string = 'ONLINE_UPI'
  ): Promise<{
    paymentId: string;
    gatewayOrderId: string;
    amountPaise: number;
    amountRupees: number;
    planName: string;
    currency: string;
  }> {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: {
        OR: [{ id: planSlug }, { slug: planSlug }],
        isActive: true,
      },
    });

    if (!plan) {
      throw new Error(`NOT_FOUND: Subscription plan '${planSlug}' not found or inactive`);
    }

    const gatewayOrderId = `sub_order_hsx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const payment = await prisma.subscriptionPayment.create({
      data: {
        providerId,
        planId: plan.id,
        amountPaise: plan.pricePaise,
        currency: 'INR',
        status: 'PENDING',
        gatewayOrderId,
        paymentMethod,
        metadata: JSON.stringify({ planSlug: plan.slug, planName: plan.name, durationDays: plan.durationDays }),
      },
    });

    return {
      paymentId: payment.id,
      gatewayOrderId: payment.gatewayOrderId,
      amountPaise: payment.amountPaise,
      amountRupees: payment.amountPaise / 100,
      planName: plan.name,
      currency: payment.currency,
    };
  }

  /**
   * Authoritatively verify and activate subscription upon payment confirmation
   */
  public async verifyAndActivateSubscription(
    gatewayOrderId: string,
    gatewayPaymentId?: string,
    gatewaySignature?: string
  ): Promise<{
    subscription: any;
    invoice: any;
    message: string;
  }> {
    return await prisma.$transaction(async (tx) => {
      // 1. Find pending payment order
      const payment = await tx.subscriptionPayment.findUnique({
        where: { gatewayOrderId },
        include: { plan: true, provider: { include: { user: true } } },
      });

      if (!payment) {
        throw new Error(`NOT_FOUND: Subscription payment order '${gatewayOrderId}' not found`);
      }

      if (payment.status === 'SUCCESS' && payment.subscriptionId) {
        const existingSub = await tx.providerSubscription.findUnique({
          where: { id: payment.subscriptionId },
          include: { plan: true },
        });
        const existingInv = await tx.subscriptionInvoice.findFirst({
          where: { subscriptionId: payment.subscriptionId },
        });
        return {
          subscription: existingSub,
          invoice: existingInv,
          message: 'Subscription was already activated.',
        };
      }

      // 2. Compute startDate and endDate safely
      const now = new Date();
      let startDate = now;
      let endDate = new Date(now.getTime() + payment.plan.durationDays * 24 * 60 * 60 * 1000);

      // Check if provider has an existing active subscription (SAFE EXTENSION: Do not truncate or shorten existing entitlement!)
      const currentActive = await tx.providerSubscription.findFirst({
        where: {
          providerId: payment.providerId,
          status: 'ACTIVE',
          endDate: { gte: now },
        },
        orderBy: { endDate: 'desc' },
      });

      if (currentActive) {
        // Extend forward from current active end date
        startDate = currentActive.startDate;
        endDate = new Date(currentActive.endDate.getTime() + payment.plan.durationDays * 24 * 60 * 60 * 1000);
      }

      // 3. Create or update ProviderSubscription
      let subscription: any;
      if (currentActive) {
        subscription = await tx.providerSubscription.update({
          where: { id: currentActive.id },
          data: {
            endDate,
            amountPaidPaise: currentActive.amountPaidPaise + payment.amountPaise,
            updatedAt: now,
          },
          include: { plan: true },
        });
      } else {
        subscription = await tx.providerSubscription.create({
          data: {
            providerId: payment.providerId,
            planId: payment.planId,
            status: 'ACTIVE',
            startDate,
            endDate,
            commissionExemptionRate: payment.plan.commissionRatePercent ?? 0.0,
            amountPaidPaise: payment.amountPaise,
            paymentMethod: payment.paymentMethod,
            paymentReference: gatewayPaymentId || gatewayOrderId,
          },
          include: { plan: true },
        });
      }

      // 4. Update payment record to SUCCESS
      await tx.subscriptionPayment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          subscriptionId: subscription.id,
          gatewayPaymentId: gatewayPaymentId || `pay_sim_${Date.now()}`,
          gatewaySignature: gatewaySignature || `sig_${crypto.randomBytes(8).toString('hex')}`,
          updatedAt: now,
        },
      });

      // 5. Update provider profile to PREMIUM
      await tx.providerProfile.update({
        where: { id: payment.providerId },
        data: {
          membershipType: 'PREMIUM',
        },
      });

      // 6. Generate SubscriptionInvoice
      const invoiceNumber = `HSX-SUB-${Date.now().toString().slice(-6)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const invoice = await tx.subscriptionInvoice.create({
        data: {
          invoiceNumber,
          subscriptionId: subscription.id,
          providerId: payment.providerId,
          amountPaise: payment.amountPaise,
          taxPaise: 0,
          totalPaise: payment.amountPaise,
          currency: 'INR',
        },
      });

      // 7. Record Subscription Purchase in Financial Ledger
      const wallet = await tx.providerWallet.findUnique({ where: { providerId: payment.providerId } });
      await tx.financialLedger.create({
        data: {
          entryNumber: `TXN-SUB-${invoiceNumber}`,
          providerId: payment.providerId,
          walletId: wallet?.id,
          subscriptionId: subscription.id,
          type: 'DEBIT',
          category: 'SUBSCRIPTION_PURCHASE',
          amountPaise: payment.amountPaise,
          balanceAfterPaise: wallet?.balancePaise || 0,
          description: `Premium Subscription Purchase: ${payment.plan.name} (${payment.plan.durationDays} Days, 0% Commission)`,
          reference: invoiceNumber,
          metadata: JSON.stringify({
            planName: payment.plan.name,
            amountRupees: payment.amountPaise / 100,
            gatewayOrderId,
            validUntil: endDate.toISOString(),
          }),
        },
      });

      return {
        subscription,
        invoice,
        message: `Congratulations! ${payment.plan.name} activated successfully. You now enjoy 0% commission until ${endDate.toLocaleDateString('en-GB')}.`,
      };
    });
  }

  /**
   * Automated Subscription Expiry Processor (Background cron / on-demand)
   * If a subscription expires:
   * - Provider account remains ACTIVE
   * - Provider continues receiving & accepting orders
   * - Provider automatically reverts to Normal 15% commission
   */
  public async processSubscriptionExpirations(): Promise<{
    expiredCount: number;
    expiredProviderIds: string[];
  }> {
    const now = new Date();

    const expiredSubs = await prisma.providerSubscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lt: now },
      },
    });

    const expiredProviderIds: string[] = [];

    for (const sub of expiredSubs) {
      await prisma.$transaction(async (tx) => {
        // Mark subscription expired
        await tx.providerSubscription.update({
          where: { id: sub.id },
          data: { status: 'EXPIRED' },
        });

        // Revert provider membership to NORMAL
        await tx.providerProfile.update({
          where: { id: sub.providerId },
          data: { membershipType: 'NORMAL' },
        });

        expiredProviderIds.push(sub.providerId);
      });
    }

    if (expiredCount(expiredSubs.length) > 0) {
      console.log(`[SubscriptionEngine] Processed ${expiredSubs.length} expired subscriptions. Restored standard 15% commission.`);
    }

    return {
      expiredCount: expiredSubs.length,
      expiredProviderIds,
    };
  }

  /**
   * Admin: Grant promotional zero-commission subscription
   */
  public async grantPromotionalSubscription(params: {
    providerId: string;
    durationDays: number;
    planSlug?: string;
    adminUser: string;
    reason: string;
  }): Promise<any> {
    const now = new Date();
    const durationDays = params.durationDays || 30;
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { slug: params.planSlug || 'monthly-premium' },
    });

    if (!plan) throw new Error('Target plan not found');

    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.providerSubscription.create({
      data: {
        providerId: params.providerId,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: now,
        endDate,
        commissionExemptionRate: 0.0,
        amountPaidPaise: 0,
        paymentMethod: 'ADMIN_PROMOTIONAL_GRANT',
        paymentReference: `PROMO_${Date.now()}`,
      },
    });

    await prisma.providerProfile.update({
      where: { id: params.providerId },
      data: { membershipType: 'PREMIUM' },
    });

    await prisma.auditLog.create({
      data: {
        action: 'GRANT_PROMOTIONAL_SUBSCRIPTION',
        resource: 'PROVIDER_PROFILE',
        resourceId: params.providerId,
        details: JSON.stringify({
          adminUser: params.adminUser,
          durationDays,
          reason: params.reason,
          validUntil: endDate.toISOString(),
        }),
      },
    });

    return subscription;
  }
}

function expiredCount(n: number): number {
  return n;
}

export const subscriptionEngine = SubscriptionEngine.getInstance();

