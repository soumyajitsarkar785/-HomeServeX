export type UserRole = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export type ProviderVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type ProviderAvailabilityStatus = 'ONLINE' | 'OFFLINE';

export type BookingStatus =
  | 'PENDING'
  | 'SEARCHING_PROVIDER'
  | 'ASSIGNED'
  | 'PROVIDER_EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_PROVIDER_AVAILABLE'
  | 'REQUIRES_RESCHEDULE';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PAID'
  | 'FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type OtpPurpose = 'START_SERVICE' | 'COMPLETE_SERVICE';

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfile {
  id: string;
  userId: string;
  user?: User;
  addresses?: Address[];
  createdAt: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  user?: User;
  skills: string[];
  bio?: string | null;
  verificationStatus: ProviderVerificationStatus;
  verificationNotes?: string | null;
  availabilityStatus: ProviderAvailabilityStatus;
  ratingAverage: number;
  totalRatingsCount: number;
  completedJobsCount: number;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastLocationUpdatedAt?: string | null;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconUrl?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
  servicesCount?: number;
  createdAt: string;
}

export interface ServiceOption {
  id: string;
  serviceId: string;
  name: string;
  description?: string | null;
  priceDeltaPaise: number;
  durationDeltaMinutes: number;
  isDefault: boolean;
}

export interface ServiceItem {
  id: string;
  categoryId: string;
  category?: ServiceCategory;
  name: string;
  slug: string;
  description: string;
  basePricePaise: number;
  strikethroughPricePaise?: number | null;
  estimatedDurationMinutes: number;
  imageUrl?: string | null;
  badge?: string | null;
  rating?: number;
  reviewCount?: number;
  isPopular?: boolean;
  isActive: boolean;
  options?: ServiceOption[];
  createdAt: string;
}

export interface PaginationMeta {
  currentPage: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface ApplianceAsset {
  id: string;
  userId: string;
  applianceType: string;
  name?: string | null;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  healthScore: number;
  status: string;
  icon?: string | null;
  lastServiceDate?: string | null;
  lastServiceNotes?: string | null;
  nextServiceDueDate?: string | null;
  nextServiceDueDays?: number;
  recommendedServiceSlug?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  customerId: string;
  label: string; // e.g. "Home", "Office"
  streetAddress: string;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
}

export interface Booking {
  id: string;
  referenceNumber: string;
  customerId: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email: string;
  };
  serviceId: string;
  service?: ServiceItem;
  addressId: string;
  address?: Address;
  scheduledSlot: string;
  status: BookingStatus;
  notes?: string | null;

  // Financials strictly in integer paise (INR)
  baseAmountPaise: number;
  optionsAmountPaise: number;
  discountAmountPaise: number;
  taxAmountPaise: number;
  totalAmountPaise: number;
  commissionAmountPaise: number;
  providerEarningsPaise: number;

  assignedProviderId?: string | null;
  assignedProvider?: {
    id: string;
    name: string;
    phone?: string;
    avatarUrl?: string | null;
    ratingAverage: number;
    latitude?: number | null;
    longitude?: number | null;
  } | null;

  paymentStatus: PaymentStatus;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingOtpDetails {
  bookingId: string;
  purpose: OtpPurpose;
  otpCode: string;
  expiresAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TrackingLocationPing {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp?: number;
}

export interface LiveTrackingLocation {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  lastPingAt: number;
  isStale: boolean;
}

export interface LiveTrackingState {
  bookingId: string;
  referenceNumber: string;
  status: BookingStatus;
  scheduledSlot: string;
  destination: {
    latitude: number;
    longitude: number;
    address: string;
    landmark?: string | null;
    city: string;
  };
  provider: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    completedJobs: number;
    experienceYears: number;
    avatarUrl?: string;
    specialization: string;
    vehicle: string;
  };
  liveLocation: LiveTrackingLocation;
  etaMinutes: number;
  distanceKm: number;
  polyline: Array<[number, number]>;
  activeOtp?: {
    otp: string;
    purpose: string;
  };
}

