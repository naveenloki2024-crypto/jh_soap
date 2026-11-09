import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo;
let server;
let baseUrl;
let Product;
let Inventory;
let Customer;
let Admin;
let Coupon;
let Order;
let HeroSection;
let hashPassword;
let disconnectDatabase;

const cookieFrom = (response) => {
  const values = response.headers.getSetCookie?.() || [];
  return values.map((value) => value.split(';')[0]).join('; ');
};

async function request(path, { method = 'GET', body, cookie = '', headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { response, data };
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongo.getUri();
  process.env.DB_NAME = 'jh_integration';
  process.env.JWT_SECRET = 'integration-secret-at-least-32-characters';
  process.env.JWT_ISSUER = 'jh-soaps';
  process.env.JWT_AUDIENCE = 'jh-web';
  process.env.COOKIE_SECURE = 'false';
  process.env.CORS_ORIGIN = '*';

  const database = await import('../config/database.js');
  ({ disconnectDatabase } = database);
  await database.connectDatabase();

  ({ default: Product } = await import('../models/Product.js'));
  ({ default: Inventory } = await import('../models/Inventory.js'));
  ({ default: Customer } = await import('../models/Customer.js'));
  ({ default: Admin } = await import('../models/Admin.js'));
  ({ default: Coupon } = await import('../models/Coupon.js'));
  ({ default: Order } = await import('../models/Order.js'));
  ({ default: HeroSection } = await import('../models/HeroSection.js'));
  ({ hashPassword } = await import('../lib/password.js'));
  const { default: app } = await import('../app.js');

  await Promise.all([
    Product.createIndexes(),
    Inventory.createIndexes(),
    Customer.createIndexes(),
    Admin.createIndexes(),
    Coupon.createIndexes(),
    Order.createIndexes(),
    HeroSection.createIndexes(),
  ]);

  await Product.create({
    name: 'Vettiver',
    slug: 'vetiver',
    category: 'Herbal',
    regularPrice: 110,
    stockQuantity: 20,
    isActive: true,
  });
  await Product.create({
    name: 'Red Wine',
    slug: 'redwine',
    category: 'Skincare',
    regularPrice: 120,
    stockQuantity: 20,
    isActive: true,
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  await disconnectDatabase?.();
  if (mongo) await mongo.stop();
});

test('catalog is served from MongoDB', async () => {
  const { response, data } = await request('/products');
  assert.equal(response.status, 200);
  assert.equal(data.products.length, 2);
  assert.equal(data.products.find((product) => product.slug === 'vetiver').price, 110);
});

test('guest checkout prices three soaps at 285 and is idempotent', async () => {
  const key = 'guest-idempotency-key';
  const payload = {
    customer: {
      fullName: 'Guest Buyer',
      mobile: '9876500001',
      address: '1 Test Street',
      area: 'Test Area',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
    },
    items: [{ id: 'vetiver', qty: 3 }],
    idempotencyKey: key,
  };

  const first = await request('/orders', { method: 'POST', body: payload });
  assert.equal(first.response.status, 201, JSON.stringify(first.data));
  assert.equal(first.data.order.pricing.total, 285);
  assert.equal(first.data.order.pricing.discount, 45);

  const second = await request('/orders', { method: 'POST', body: payload });
  assert.equal(second.response.status, 200, JSON.stringify(second.data));
  assert.equal(second.data.duplicate, true);
  assert.equal(second.data.order.orderNumber, first.data.order.orderNumber);

  const product = await Product.findOne({ slug: 'vetiver' });
  assert.equal(product.stockQuantity, 17);
  const inventory = await Inventory.findOne({ productId: product._id });
  assert.equal(inventory.availableStock, 17);

  const lookup = await request(`/orders/${first.data.order.orderNumber}`, {
    headers: { 'X-Order-Phone': '9876500001' },
  });
  assert.equal(lookup.response.status, 200, JSON.stringify(lookup.data));
  assert.equal(lookup.data.order.orderNumber, first.data.order.orderNumber);
});

test('customer registration, session cookie, profile and order history work', async () => {
  const registration = await request('/auth/register', {
    method: 'POST',
    body: {
      fullName: 'Janani Hariharan',
      email: 'janani@example.com',
      phone: '9876500002',
      password: 'a strong password',
    },
  });
  assert.equal(registration.response.status, 201, JSON.stringify(registration.data));
  assert.equal(registration.data.session.user.email, 'janani@example.com');
  const cookie = cookieFrom(registration.response);
  assert.ok(cookie);

  const profile = await request('/me', { cookie });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.data));
  assert.equal(profile.data.profile.fullName, 'Janani Hariharan');

  const order = await request('/orders', {
    method: 'POST',
    cookie,
    body: {
      customer: {
        fullName: 'Janani Hariharan',
        mobile: '9876500002',
        address: '2 Test Street',
        area: 'Test Area',
        city: 'Coimbatore',
        district: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
      },
      items: [{ id: 'vetiver', qty: 3 }],
    },
  });
  assert.equal(order.response.status, 201, JSON.stringify(order.data));

  const history = await request('/me/orders', { cookie });
  assert.equal(history.response.status, 200, JSON.stringify(history.data));
  assert.equal(history.data.orders.length, 1);
  assert.equal(history.data.orders[0].customer.mobile, '9876500002');

  const logout = await request('/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.response.status, 204, JSON.stringify(logout.data));
});

test('admin login can create products, manage coupons and cancel orders', async () => {
  const admin = await Admin.create({
    name: 'Test Admin',
    email: 'admin@example.com',
    passwordHash: await hashPassword('admin password 123'),
    role: 'super_admin',
  });
  assert.ok(admin._id);

  const login = await request('/auth/admin/login', {
    method: 'POST',
    body: { email: 'admin@example.com', password: 'admin password 123' },
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  const cookie = cookieFrom(login.response);

  const dashboard = await request('/admin/dashboard', { cookie });
  assert.equal(dashboard.response.status, 200, JSON.stringify(dashboard.data));
  assert.ok(dashboard.data.totalOrders > 0);

  const created = await request('/products', {
    method: 'POST',
    cookie,
    body: {
      name: 'Neem Soap',
      price: 150,
      category: 'Herbal',
      stockQuantity: 5,
    },
  });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  assert.equal(created.data.product.slug, 'neem-soap');

  const coupon = await request('/admin/coupons', {
    method: 'POST',
    cookie,
    body: { code: 'SAVE10', discountType: 'percentage', discountValue: 10 },
  });
  assert.equal(coupon.response.status, 201, JSON.stringify(coupon.data));

  const pending = await Order.findOne({ orderStatus: 'received', paymentStatus: 'pending' });
  const cancelled = await request(`/admin/orders/${pending._id}/status`, {
    method: 'PATCH',
    cookie,
    body: { orderStatus: 'cancelled', note: 'Integration cancellation' },
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.order.status, 'cancelled');

  const vetiver = await Product.findOne({ slug: 'vetiver' });
  assert.equal(vetiver.stockQuantity, 17);
});

test('admin uploads an image and attaches it to the existing product', async () => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64',
  );

  const anonymous = await fetch(`${baseUrl}/admin/uploads`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'image/png' },
    body: png,
  });
  assert.equal(anonymous.status, 401);

  const login = await request('/auth/admin/login', {
    method: 'POST',
    body: { email: 'admin@example.com', password: 'admin password 123' },
  });
  const cookie = cookieFrom(login.response);

  const uploadResponse = await fetch(`${baseUrl}/admin/uploads`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'image/png',
      Cookie: cookie,
    },
    body: png,
  });
  const uploaded = await uploadResponse.json();
  assert.equal(uploadResponse.status, 201, JSON.stringify(uploaded));
  assert.match(uploaded.url, /^\/uploads\/.+\.png$/);

  const updated = await request('/products/vetiver', {
    method: 'PUT',
    cookie,
    body: { images: [uploaded.url] },
  });
  assert.equal(updated.response.status, 200, JSON.stringify(updated.data));
  assert.equal(updated.data.product.imageUrl, uploaded.url);

  const catalog = await request('/products');
  const vetiver = catalog.data.products.find((product) => product.slug === 'vetiver');
  assert.equal(vetiver.imageUrl, uploaded.url);

  const adminList = await request('/admin/products?q=vetiver', { cookie });
  assert.equal(adminList.response.status, 200, JSON.stringify(adminList.data));
  assert.equal(adminList.data.products[0].imageUrl, uploaded.url);
  assert.equal(adminList.data.products[0].productId, updated.data.product.productId);

  await unlink(new URL(`../uploads/${uploaded.url.split('/').pop()}`, import.meta.url)).catch(
    () => {},
  );
});

test('hero content is public to read, admin-only to edit, and restorable', async () => {
  const initial = await request('/hero');
  assert.equal(initial.response.status, 200, JSON.stringify(initial.data));
  assert.equal(initial.data.hero.isVisible, true);
  assert.equal(initial.data.hero.heading, '');

  const anonymousSave = await request('/admin/hero', {
    method: 'PUT',
    body: { heading: 'Unauthorised' },
  });
  assert.equal(anonymousSave.response.status, 401);

  const login = await request('/auth/admin/login', {
    method: 'POST',
    body: { email: 'admin@example.com', password: 'admin password 123' },
  });
  const cookie = cookieFrom(login.response);

  const saved = await request('/admin/hero', {
    method: 'PUT',
    cookie,
    body: {
      heading: 'Pure Botanicals',
      headingHighlight: 'Handmade Soaps',
      subtitle: 'HERBS FROM NATURE',
      description: 'A fresh hero description managed from the admin dashboard.',
      backgroundImage: '/uploads/background.webp',
      productImage: '/uploads/product.webp',
      desktopBannerImage: '/uploads/desktop.webp',
      mobileBannerImage: '/uploads/mobile.webp',
      primaryButtonText: 'Shop the range',
      primaryButtonLink: '#shop',
      secondaryButtonText: 'Chat with us',
      secondaryButtonLink: 'https://wa.me/919876543210',
      textAlign: 'center',
      isVisible: true,
    },
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.hero.heading, 'Pure Botanicals');
  assert.equal(saved.data.hero.textAlign, 'center');

  const published = await request('/hero');
  assert.equal(published.response.status, 200, JSON.stringify(published.data));
  assert.equal(published.data.hero.headingHighlight, 'Handmade Soaps');
  assert.equal(published.data.hero.mobileBannerImage, '/uploads/mobile.webp');

  const hidden = await request('/admin/hero', {
    method: 'PUT',
    cookie,
    body: { isVisible: false },
  });
  assert.equal(hidden.response.status, 200, JSON.stringify(hidden.data));
  assert.equal(hidden.data.hero.isVisible, false);
  const hiddenPublic = await request('/hero');
  assert.equal(hiddenPublic.data.hero.isVisible, false);

  const invalid = await request('/admin/hero', {
    method: 'PUT',
    cookie,
    body: { primaryButtonLink: 'javascript:alert(1)' },
  });
  assert.equal(invalid.response.status, 400, JSON.stringify(invalid.data));

  const reset = await request('/admin/hero/reset', { method: 'POST', cookie });
  assert.equal(reset.response.status, 200, JSON.stringify(reset.data));
  assert.equal(reset.data.hero.heading, 'Ayurvedic');
  assert.equal(reset.data.hero.textAlign, 'left');
  assert.equal(reset.data.hero.productImage, '');
  assert.equal(reset.data.hero.isVisible, true);
});

test('admin payment ledger and sales reports are protected and aggregated', async () => {
  const anonymous = await request('/admin/payments');
  assert.equal(anonymous.response.status, 401);

  const login = await request('/auth/admin/login', {
    method: 'POST',
    body: { email: 'admin@example.com', password: 'admin password 123' },
  });
  assert.equal(login.response.status, 200, JSON.stringify(login.data));
  const cookie = cookieFrom(login.response);

  const payments = await request('/admin/payments', { cookie });
  assert.equal(payments.response.status, 200, JSON.stringify(payments.data));
  assert.ok(Array.isArray(payments.data.payments));
  assert.ok(payments.data.totalTransactions > 0);
  assert.ok(payments.data.summary.pending);

  const filtered = await request('/admin/payments?status=pending', { cookie });
  assert.equal(filtered.response.status, 200, JSON.stringify(filtered.data));
  assert.ok(filtered.data.payments.every((payment) => payment.status === 'pending'));

  const invalidFilter = await request('/admin/payments?status=unknown', { cookie });
  assert.equal(invalidFilter.response.status, 400);

  const report = await request('/admin/reports?period=daily&days=30', { cookie });
  assert.equal(report.response.status, 200, JSON.stringify(report.data));
  assert.equal(report.data.period, 'daily');
  assert.ok(report.data.summary.totalOrders > 0);
  assert.ok(Array.isArray(report.data.series));
  assert.ok(Array.isArray(report.data.bestSellers));
  assert.ok(Array.isArray(report.data.paymentBreakdown));

  const monthly = await request('/admin/reports?period=monthly&days=365', { cookie });
  assert.equal(monthly.response.status, 200, JSON.stringify(monthly.data));
  assert.equal(monthly.data.period, 'monthly');

  const invalidPeriod = await request('/admin/reports?period=yearly', { cookie });
  assert.equal(invalidPeriod.response.status, 400);
});

test('invalid coupon is rejected at checkout', async () => {
  const payload = {
    customer: {
      fullName: 'Coupon Buyer',
      mobile: '9876500003',
      address: '3 Test Street',
      area: 'Test Area',
      city: 'Coimbatore',
      district: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641001',
    },
    items: [{ id: 'redwine', qty: 3 }],
    couponCode: 'NOT-A-COUPON',
  };
  const { response, data } = await request('/orders', { method: 'POST', body: payload });
  assert.equal(response.status, 400);
  assert.equal(data.error, 'Coupon code is not valid.');
});

