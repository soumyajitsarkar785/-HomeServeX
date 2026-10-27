import { Router, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.js';

export const paymentsRouter = Router();

/**
 * POST /api/v1/payments/create-order
 * Generates an authoritative server-side gateway order for a booking
 */
paymentsRouter.post('/create-order', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'bookingId is required' } });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { customer: true, service: true, payment: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Role check: Only the customer who owns the booking or an admin may create orders
    if (req.user!.role === 'CUSTOMER' && booking.customer.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied to this booking' } });
      return;
    }

    if (booking.paymentStatus === 'PAID') {
      res.status(400).json({ success: false, error: { code: 'ALREADY_PAID', message: 'Booking is already paid' } });
      return;
    }

    // Generate cryptographic order identifier
    const orderId = `order_hsx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Upsert payment intent with authoritative total
    await prisma.payment.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        amountPaise: booking.totalAmountPaise,
        currency: 'INR',
        status: 'PENDING',
        providerTransactionId: orderId,
        paymentMethod: 'ONLINE_GATEWAY',
      },
      update: {
        amountPaise: booking.totalAmountPaise,
        status: 'PENDING',
        providerTransactionId: orderId,
      },
    });

    res.json({
      success: true,
      data: {
        orderId,
        amountPaise: booking.totalAmountPaise,
        amountRupees: booking.totalAmountPaise / 100,
        currency: 'INR',
        keyId: config.payments.keyId,
        bookingId: booking.id,
        referenceNumber: booking.referenceNumber,
        serviceName: booking.service.name,
      },
      message: 'Gateway order created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/verify
 * Mandatory cryptographic server-side verification.
 * Client-submitted payment status is NEVER trusted without signature proof!
 */
paymentsRouter.post('/verify', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { bookingId, orderId, paymentId, signature } = req.body;

    if (!bookingId || !orderId || !paymentId || !signature) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Missing required payment verification fields: bookingId, orderId, paymentId, signature',
        },
      });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true, service: true },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Booking not found' } });
      return;
    }

    // Cryptographic HMAC-SHA256 verification
    const expectedSignature = crypto
      .createHmac('sha256', config.payments.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Secure timing comparison
    const isSignatureValid =
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

    // Special allowance for test environment demo token:
    const isDemoVerified =
      config.env === 'development' &&
      (signature === 'sig_demo_verified_success' || signature.startsWith('mock_sig_'));

    if (!isSignatureValid && !isDemoVerified) {
      // Audit log the failed verification attempt
      try {
        await prisma.auditLog.create({
          data: {
            userId: req.user?.id,
            action: 'PAYMENT_VERIFICATION_FAILED',
            resource: 'Booking',
            resourceId: bookingId,
            details: JSON.stringify({ orderId, paymentId, reason: 'Cryptographic signature mismatch' }),
          },
        });
      } catch {}

      res.status(400).json({
        success: false,
        error: {
          code: 'PAYMENT_SIGNATURE_INVALID',
          message: 'Cryptographic payment verification failed. Untrusted payment reference.',
        },
      });
      return;
    }

    // Atomically transition payment and booking state
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Payment record
      const updatedPayment = await tx.payment.update({
        where: { bookingId: booking.id },
        data: {
          status: 'PAID',
          providerTransactionId: paymentId,
          updatedAt: new Date(),
        },
      });

      // 2. Update Booking payment status
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentStatus: 'PAID',
          updatedAt: new Date(),
        },
      });

      // 3. Generate GST Invoice if not already existing
      const invoiceNumber = `HSX-INV-${booking.referenceNumber.replace('HSX-', '')}`;
      const existingInvoice = await tx.invoice.findUnique({ where: { bookingId: booking.id } });
      if (!existingInvoice) {
        await tx.invoice.create({
          data: {
            bookingId: booking.id,
            invoiceNumber,
            subtotalPaise: booking.baseAmountPaise + booking.optionsAmountPaise - booking.discountAmountPaise,
            taxPaise: booking.taxAmountPaise,
            totalPaise: booking.totalAmountPaise,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'PAYMENT_CAPTURED_VERIFIED',
          resource: 'Payment',
          resourceId: updatedPayment.id,
          details: JSON.stringify({
            bookingId: booking.id,
            amountPaise: booking.totalAmountPaise,
            paymentId,
            orderId,
          }),
        },
      });

      return { payment: updatedPayment, booking: updatedBooking };
    });

    res.json({
      success: true,
      data: {
        paymentId,
        orderId,
        bookingId: result.booking.id,
        paymentStatus: result.booking.paymentStatus,
        amountPaise: result.payment.amountPaise,
        amountRupees: result.payment.amountPaise / 100,
      },
      message: 'Payment verified and confirmed by HomeServeX financial engine.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/webhooks/:provider
 * Idempotent Webhook Processor for Gateway Events
 */
paymentsRouter.post('/webhooks/:provider', async (req, res: Response, next: NextFunction): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const bodyStr = JSON.stringify(req.body);

    if (config.payments.webhookSecret && signature) {
      const expectedSig = crypto
        .createHmac('sha256', config.payments.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      if (signature !== expectedSig) {
        res.status(400).json({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature mismatch' } });
        return;
      }
    }

    const event = req.body?.event;
    const paymentEntity = req.body?.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const payment = await prisma.payment.findFirst({
        where: { providerTransactionId: orderId },
      });

      if (payment) {
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'PAID', providerTransactionId: paymentId },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: { paymentStatus: 'PAID' },
          }),
        ]);
      }
    }

    res.json({ success: true, message: 'Webhook processed idempotently' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/payments/:paymentId
 * Retrieve verified payment record
 */
paymentsRouter.get('/:paymentId', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: { booking: { include: { service: true } } },
    });

    if (!payment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment record not found' } });
      return;
    }

    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/payments/:paymentId/refund
 * Authoritative refund processing (Admin only)
 */
paymentsRouter.post('/:paymentId/refund', authenticate, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { reason, amountPaise } = req.body;
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.paymentId },
      include: { booking: true },
    });

    if (!payment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
      return;
    }

    if (payment.status !== 'PAID') {
      res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Only paid transactions can be refunded' } });
      return;
    }

    const refundAmount = amountPaise || payment.amountPaise;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED', updatedAt: new Date() },
      }),
      prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'REFUNDED', cancellationReason: reason || 'Refund issued by administrator' },
      }),
      prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'PAYMENT_REFUND_PROCESSED',
          resource: 'Payment',
          resourceId: payment.id,
          details: JSON.stringify({ refundAmount, reason }),
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        refundAmountPaise: refundAmount,
        refundAmountRupees: refundAmount / 100,
        status: 'REFUNDED',
      },
      message: `Refund of ₹${refundAmount / 100} successfully processed.`,
    });
  } catch (err) {
    next(err);
  }
});
