import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { config } from '../../config/env.js';
import { loginSchema, customerRegisterSchema } from '@homeservex/validation';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.js';

export const authRouter = Router();

let demoUsersEnsured = false;
export async function ensureDemoUsers() {
  if (demoUsersEnsured) return;
  try {
    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Customer Demo User
    let customer = await prisma.user.findUnique({ where: { email: 'customer@homeservex.com' } });
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          name: 'Soumyajit Customer',
          email: 'customer@homeservex.com',
          phone: '+919876543214',
          passwordHash,
          role: 'CUSTOMER',
          status: 'ACTIVE',
          customerProfile: { create: {} },
        },
      });
    } else {
      await prisma.user.update({
        where: { id: customer.id },
        data: { passwordHash, role: 'CUSTOMER', status: 'ACTIVE' },
      });
    }
    const cp = await prisma.customerProfile.findUnique({ where: { userId: customer.id } });
    if (cp) {
      const existingAddr = await prisma.address.findFirst({ where: { customerId: cp.id } });
      if (!existingAddr) {
        await prisma.address.create({
          data: {
            customerId: cp.id,
            label: 'Home',
            streetAddress: '123 Main Street, Powai',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400076',
            landmark: 'Near Hiranandani Hospital',
            isDefault: true,
          },
        });
      }
    }

    // 2. Admin Demo User
    let admin = await prisma.user.findUnique({ where: { email: 'admin@homeservex.com' } });
    if (!admin) {
      await prisma.user.create({
        data: {
          name: 'HomeServeX Operations Admin',
          email: 'admin@homeservex.com',
          phone: '+919876543210',
          passwordHash,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });
    } else {
      await prisma.user.update({
        where: { id: admin.id },
        data: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
      });
    }

    // 3. Provider / Partner Demo User
    const providerEmails = [
      { email: 'provider@homeservex.com', name: 'Ramesh Kumar', phone: '+919876543211', skills: JSON.stringify(['ac-servicing', 'electrical', 'Air Conditioner Servicing']) },
      { email: 'technician@homeservex.com', name: 'Amit Verma', phone: '+919876543212', skills: JSON.stringify(['washing-machine', 'refrigerator', 'Appliance Repair']) },
    ];

    for (const p of providerEmails) {
      let provUser = await prisma.user.findUnique({ where: { email: p.email } });
      if (!provUser) {
        provUser = await prisma.user.create({
          data: {
            name: p.name,
            email: p.email,
            phone: p.phone,
            passwordHash,
            role: 'PROVIDER',
            status: 'ACTIVE',
            avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
            providerProfile: {
              create: {
                skills: p.skills,
                bio: 'Certified master technician with 7+ years of experience across all major brands.',
                verificationStatus: 'APPROVED',
                availabilityStatus: 'ONLINE',
                ratingAverage: 4.9,
                totalRatingsCount: 142,
                completedJobsCount: 428,
                currentLatitude: 19.0760,
                currentLongitude: 72.8777,
              },
            },
          },
        });
      } else {
        await prisma.user.update({
          where: { id: provUser.id },
          data: { passwordHash, role: 'PROVIDER', status: 'ACTIVE' },
        });
        // Ensure provider profile exists and is approved
        const prof = await prisma.providerProfile.findUnique({ where: { userId: provUser.id } });
        if (!prof) {
          await prisma.providerProfile.create({
            data: {
              userId: provUser.id,
              skills: p.skills,
              bio: 'Certified master technician with 7+ years of experience.',
              verificationStatus: 'APPROVED',
              availabilityStatus: 'ONLINE',
              ratingAverage: 4.9,
              totalRatingsCount: 142,
              completedJobsCount: 428,
              currentLatitude: 19.0760,
              currentLongitude: 72.8777,
            },
          });
        } else {
          await prisma.providerProfile.update({
            where: { id: prof.id },
            data: { verificationStatus: 'APPROVED', availabilityStatus: 'ONLINE' },
          });
        }
      }
    }

    demoUsersEnsured = true;
  } catch (err) {
    console.error('[HomeServeX] Demo user init error:', err);
  }
}
ensureDemoUsers();

function generateTokens(userId: string, role: string, email: string) {
  const accessToken = jwt.sign({ id: userId, role, email }, config.jwtAccessSecret, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ id: userId, role, email }, config.jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/v1/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = customerRegisterSchema.parse(req.body);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: 'User with this email or phone already exists' },
      });
      return;
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: 'CUSTOMER',
        customerProfile: { create: {} },
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email);
    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      return;
    }
    if (user.status === 'SUSPENDED') {
      res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended' },
      });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, user.email);
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Refresh token required' } });
      return;
    }
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as { id: string; role: string; email: string };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id, decoded.role, decoded.email);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' } });
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});
