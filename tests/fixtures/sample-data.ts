export const testUserCustomer = {
  name: 'John Doe',
  email: 'customer.test@homeservex.com',
  phone: '9876543210',
  password: 'Password@123',
  role: 'CUSTOMER' as const,
};

export const testUserProvider = {
  name: 'Expert Plumber',
  email: 'provider.test@homeservex.com',
  phone: '9876543211',
  password: 'Password@123',
  role: 'PROVIDER' as const,
  skills: ['plumbing'],
};

export const testUserAdmin = {
  name: 'Platform Administrator',
  email: 'admin.test@homeservex.com',
  phone: '9876543212',
  password: 'AdminPassword@123',
  role: 'ADMIN' as const,
};
