import { z } from 'zod';

// Auth Schemas
export const customerRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const providerRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone must be at least 10 digits').max(15),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
  bio: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Address Schema
export const addressSchema = z.object({
  label: z.string().min(1, 'Label is required (e.g. Home, Office)'),
  streetAddress: z.string().min(5, 'Street address is required'),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDefault: z.boolean().default(false),
});

// Booking Schemas
export const createBookingSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  addressId: z.string().min(1, 'Address ID is required'),
  selectedOptionIds: z.array(z.string()).default([]),
  scheduledSlot: z.string().min(1, 'Scheduled slot is required'),
  notes: z.string().max(500).optional(),
});

// OTP Verification Schema
export const verifyOtpSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  purpose: z.enum(['START_SERVICE', 'COMPLETE_SERVICE']),
  otpCode: z.string().optional(),
  otp: z.string().optional(),
}).transform(val => {
  const code = (val.otpCode || val.otp || '').trim();
  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: 'OTP must be exactly 6 digits numeric',
        path: ['otpCode'],
      },
    ]);
  }
  return {
    bookingId: val.bookingId,
    purpose: val.purpose,
    otpCode: code,
    otp: code,
  };
});

// Provider Location Schema
export const updateProviderLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Review Schema
export const createReviewSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5, 'Review comment must be at least 5 characters').max(1000),
});

// Admin Service & Category Schemas
export const serviceCategorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  slug: z.string().min(2, 'Slug is required'),
  description: z.string().min(5, 'Description is required'),
  iconUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const serviceItemSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(2, 'Service name is required'),
  slug: z.string().min(2, 'Slug is required'),
  description: z.string().min(5, 'Description is required'),
  basePricePaise: z.number().int().positive('Price must be greater than 0'),
  estimatedDurationMinutes: z.number().int().positive('Duration must be greater than 0'),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
});
