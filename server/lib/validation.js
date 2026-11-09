import {
  MAX_DISTINCT_ITEMS,
  MAX_ITEM_QTY,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
} from './constants.js';

export const clean = (value) => (typeof value === 'string' ? value.trim() : '');
export const MOBILE_RE = /^[6-9]\d{9}$/;
export const PIN_RE = /^[1-9]\d{5}$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function normalizePhone(value) {
  let digits = clean(value).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const pick = (input, ...keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) return input[key];
  }
  return undefined;
};

const has = (input, ...keys) => pick(input, ...keys) !== undefined;

/**
 * Validates and normalises a customer order payload. Messages match the
 * checkout UI so the client can highlight the offending field.
 */
export function validateOrderPayload(body) {
  const errors = {};
  const rawCustomer =
    body && typeof body.customer === 'object' && body.customer ? body.customer : {};

  const customer = {
    fullName: clean(rawCustomer.fullName).slice(0, 120),
    mobile: normalizePhone(rawCustomer.mobile),
    alternateMobile: normalizePhone(rawCustomer.alternateMobile),
    email: clean(rawCustomer.email).toLowerCase().slice(0, 200),
    address: clean(rawCustomer.address).slice(0, 300),
    area: clean(rawCustomer.area).slice(0, 120),
    city: clean(rawCustomer.city).slice(0, 120),
    district: clean(rawCustomer.district).slice(0, 120),
    state: clean(rawCustomer.state).slice(0, 120),
    pincode: clean(rawCustomer.pincode),
    landmark: clean(rawCustomer.landmark).slice(0, 200),
    notes: clean(rawCustomer.notes).slice(0, 500),
  };

  if (customer.fullName.length < 2) errors.fullName = 'Full name is required.';
  if (!MOBILE_RE.test(customer.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if (customer.alternateMobile && !MOBILE_RE.test(customer.alternateMobile)) {
    errors.alternateMobile = 'Enter a valid 10-digit number or leave it blank.';
  }
  if (customer.email && !EMAIL_RE.test(customer.email)) errors.email = 'Enter a valid email address.';
  if (!customer.address) errors.address = 'House no. / street address is required.';
  if (!customer.area) errors.area = 'Area / locality is required.';
  if (!customer.city) errors.city = 'City is required.';
  if (!customer.district) errors.district = 'District is required.';
  if (!customer.state) errors.state = 'State is required.';
  if (!PIN_RE.test(customer.pincode)) errors.pincode = 'Enter a valid 6-digit PIN code.';

  const rawItems = Array.isArray(body?.items) ? body.items : [];
  const items = [];
  const seen = new Set();
  for (const item of rawItems) {
    const id = clean(item?.id) || clean(item?.slug) || clean(item?.productId);
    const qty = Number(item?.qty ?? item?.quantity);
    if (!id) continue;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({ id, qty });
  }
  if (items.length === 0) errors.items = 'Your cart is empty.';
  if (items.length > MAX_DISTINCT_ITEMS) errors.items = 'Too many different items in the cart.';

  return { errors, customer, items };
}

/**
 * Validates a product create/update payload. When `partial` is true only the
 * supplied fields are validated (used for PATCH/PUT-style updates).
 */
export function validateProductPayload(body, { partial = false, existing = null } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};

  if (has(input, 'name')) {
    const name = clean(input.name).slice(0, 120);
    if (name.length < 1) errors.name = 'Product name is required.';
    else values.name = name;
  } else if (!partial) {
    errors.name = 'Product name is required.';
  }

  const rawSlug = has(input, 'slug') ? clean(input.slug) : '';
  if (rawSlug) {
    const slug = slugify(rawSlug);
    if (!SLUG_RE.test(slug)) errors.slug = 'Slug may only contain lowercase letters, numbers and dashes.';
    else values.slug = slug;
  } else if (!partial) {
    const base = values.name || existing?.name;
    if (base) values.slug = slugify(base);
    else errors.slug = 'A slug is required.';
  }

  if (has(input, 'description')) {
    values.description = clean(input.description).slice(0, 2000);
  } else if (!partial) {
    values.description = '';
  }

  if (has(input, 'regularPrice', 'regular_price', 'price')) {
    const price = Number(pick(input, 'regularPrice', 'regular_price', 'price'));
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) {
      errors.price = 'Price must be a number between 0 and 1,000,000.';
    } else {
      values.regularPrice = Math.round(price * 100) / 100;
    }
  } else if (!partial) {
    errors.price = 'Price is required.';
  }

  if (has(input, 'offerPrice', 'offer_price')) {
    const raw = pick(input, 'offerPrice', 'offer_price');
    if (raw === null || raw === '' || raw === undefined) {
      values.offerPrice = undefined;
    } else {
      const offerPrice = Number(raw);
      const regularPrice = values.regularPrice ?? Number(existing?.regularPrice ?? 0);
      if (!Number.isFinite(offerPrice) || offerPrice < 0 || offerPrice > 1_000_000) {
        errors.offerPrice = 'Offer price must be a number between 0 and 1,000,000.';
      } else if (regularPrice && offerPrice > regularPrice) {
        errors.offerPrice = 'Offer price cannot be greater than the regular price.';
      } else {
        values.offerPrice = Math.round(offerPrice * 100) / 100;
      }
    }
  }

  const imageUrl = pick(input, 'image_url', 'imageUrl');
  if (has(input, 'images') || imageUrl !== undefined) {
    const rawImages = has(input, 'images') ? input.images : imageUrl ? [imageUrl] : [];
    const images = (Array.isArray(rawImages) ? rawImages : [])
      .map((image) => clean(image))
      .filter(Boolean);
    if (images.some((image) => !/^(https?:\/\/|\/)/i.test(image))) {
      errors.images = 'Image URLs must start with http(s):// or "/".';
    } else {
      values.images = images.slice(0, 8);
    }
  } else if (!partial) {
    values.images = [];
  }

  if (has(input, 'category')) {
    const category = clean(input.category).slice(0, 60);
    if (!category) errors.category = 'Category is required.';
    else values.category = category;
  } else if (!partial) {
    values.category = 'Herbal';
  }

  if (has(input, 'stockQuantity', 'stock_quantity')) {
    const stock = Number(pick(input, 'stockQuantity', 'stock_quantity'));
    if (!Number.isInteger(stock) || stock < 0) {
      errors.stockQuantity = 'Stock quantity must be a non-negative whole number.';
    } else {
      values.stockQuantity = stock;
    }
  } else if (!partial) {
    values.stockQuantity = 0;
  }

  if (has(input, 'sku')) {
    const sku = clean(input.sku).toUpperCase().slice(0, 60);
    values.sku = sku || undefined;
  } else if (!partial) {
    values.sku = undefined;
  }

  if (has(input, 'isActive', 'is_active')) {
    const active = pick(input, 'isActive', 'is_active');
    if (typeof active !== 'boolean') errors.isActive = 'isActive must be a boolean.';
    else values.isActive = active;
  } else if (!partial) {
    values.isActive = true;
  }

  return { errors, values };
}

export function validateStatusUpdate(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};

  if (has(input, 'orderStatus', 'order_status')) {
    const status = clean(pick(input, 'orderStatus', 'order_status'));
    if (!ORDER_STATUSES.includes(status)) {
      errors.orderStatus = `orderStatus must be one of: ${ORDER_STATUSES.join(', ')}.`;
    } else {
      values.orderStatus = status;
    }
  }

  if (has(input, 'paymentStatus', 'payment_status')) {
    const status = clean(pick(input, 'paymentStatus', 'payment_status'));
    if (!PAYMENT_STATUSES.includes(status)) {
      errors.paymentStatus = `paymentStatus must be one of: ${PAYMENT_STATUSES.join(', ')}.`;
    } else {
      values.paymentStatus = status;
    }
  }

  if (has(input, 'paymentReference', 'payment_reference')) {
    values.paymentReference =
      clean(pick(input, 'paymentReference', 'payment_reference')).slice(0, 200) || null;
  }

  if (Object.keys(values).length === 0 && Object.keys(errors).length === 0) {
    errors.body = 'Provide at least one of orderStatus or paymentStatus.';
  }

  if (values.paymentStatus === 'paid' && !values.paymentReference) {
    errors.paymentReference = 'paymentReference is required when marking an order as paid.';
  }

  return { errors, values };
}

/**
 * Validates a customer profile update. Only customer-editable fields are
 * whitelisted; email is managed through the auth flow.
 */
export function validateProfileUpdate(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};

  const fullName = pick(input, 'fullName', 'full_name', 'name');
  if (fullName !== undefined) {
    const name = clean(fullName).slice(0, 120);
    if (name.length < 1) errors.fullName = 'Please enter your full name.';
    else values.name = name;
  }

  if (has(input, 'phone')) {
    const raw = clean(input.phone);
    if (!raw) {
      values.phone = undefined;
    } else {
      const digits = normalizePhone(raw);
      if (!MOBILE_RE.test(digits)) errors.phone = 'Enter a valid 10-digit mobile number.';
      else values.phone = digits;
    }
  }

  const avatarUrl = pick(input, 'avatarUrl', 'avatar_url');
  if (avatarUrl !== undefined) {
    const url = clean(avatarUrl);
    if (!url) values.avatarUrl = null;
    else if (!/^(https?:\/\/|\/)/i.test(url)) {
      errors.avatarUrl = 'Avatar URL must start with http(s):// or "/".';
    } else {
      values.avatarUrl = url.slice(0, 500);
    }
  }

  return { errors, values };
}

export function validateRegisterPayload(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const fullName = clean(input.fullName ?? input.full_name ?? input.name).slice(0, 120);
  const email = clean(input.email).toLowerCase().slice(0, 200);
  const phone = normalizePhone(input.phone);
  const password = typeof input.password === 'string' ? input.password : '';

  if (fullName.length < 2) errors.fullName = 'Please enter your full name.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (phone && !MOBILE_RE.test(phone)) errors.phone = 'Enter a valid 10-digit mobile number.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (password.length > 128) errors.password = 'Password must be 128 characters or fewer.';

  return { errors, values: { name: fullName, email, phone: phone || undefined, password } };
}

export function validateLoginPayload(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const email = clean(input.email).toLowerCase().slice(0, 200);
  const password = typeof input.password === 'string' ? input.password : '';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return { errors, values: { email, password, remember: Boolean(input.remember) } };
}

export function validatePhoneRequest(body) {
  const phone = normalizePhone(body?.phone);
  if (!MOBILE_RE.test(phone)) {
    return { errors: { phone: 'Enter a valid 10-digit Indian mobile number.' }, phone };
  }
  return { errors: {}, phone };
}

export function validateOtpVerify(body) {
  const phone = normalizePhone(body?.phone);
  const token = clean(body?.token ?? body?.otp);
  const errors = {};
  if (!MOBILE_RE.test(phone)) errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  if (!/^\d{6}$/.test(token)) errors.token = 'Enter the 6-digit code.';
  return { errors, values: { phone, token, remember: Boolean(body?.remember) } };
}

export function validatePasswordResetRequest(body) {
  const email = clean(body?.email).toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) {
    return { errors: { email: 'Enter a valid email address.' }, email };
  }
  return { errors: {}, email };
}

export function validatePasswordReset(body) {
  const token = clean(body?.token);
  const password = typeof body?.password === 'string' ? body?.password : '';
  const errors = {};
  if (!token) errors.token = 'This reset link is invalid.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (password.length > 128) errors.password = 'Password must be 128 characters or fewer.';
  return { errors, values: { token, password } };
}

export function validatePasswordChange(body) {
  const password = typeof body?.password === 'string' ? body?.password : '';
  if (password.length < 8 || password.length > 128) {
    return { errors: { password: 'Password must be between 8 and 128 characters.' } };
  }
  return { errors: {}, values: { password } };
}

export function validateCouponPayload(body, { partial = false } = {}) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};

  if (has(input, 'code')) {
    const code = clean(input.code).toUpperCase().slice(0, 40);
    if (!code) errors.code = 'Coupon code is required.';
    else values.code = code;
  } else if (!partial) {
    errors.code = 'Coupon code is required.';
  }

  if (has(input, 'discountType', 'discount_type')) {
    const discountType = clean(pick(input, 'discountType', 'discount_type'));
    if (!['percentage', 'fixed'].includes(discountType)) {
      errors.discountType = 'discountType must be percentage or fixed.';
    } else {
      values.discountType = discountType;
    }
  } else if (!partial) {
    errors.discountType = 'discountType is required.';
  }

  if (has(input, 'discountValue', 'discount_value')) {
    const value = Number(pick(input, 'discountValue', 'discount_value'));
    if (!Number.isFinite(value) || value <= 0) {
      errors.discountValue = 'Discount value must be greater than zero.';
    } else {
      values.discountValue = Math.round(value * 100) / 100;
    }
  } else if (!partial) {
    errors.discountValue = 'discountValue is required.';
  }

  if (has(input, 'minOrderAmount', 'min_order_amount')) {
    const amount = Number(pick(input, 'minOrderAmount', 'min_order_amount'));
    if (!Number.isFinite(amount) || amount < 0) {
      errors.minOrderAmount = 'Minimum order amount must be zero or greater.';
    } else {
      values.minOrderAmount = amount;
    }
  } else if (!partial) {
    values.minOrderAmount = 0;
  }

  if (has(input, 'expiresAt', 'expires_at')) {
    const raw = pick(input, 'expiresAt', 'expires_at');
    if (!raw) values.expiresAt = null;
    else {
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) errors.expiresAt = 'Expiry date is invalid.';
      else values.expiresAt = date;
    }
  }

  if (has(input, 'usageLimit', 'usage_limit')) {
    const raw = pick(input, 'usageLimit', 'usage_limit');
    if (raw === null || raw === '') values.usageLimit = null;
    else {
      const limit = Number(raw);
      if (!Number.isInteger(limit) || limit < 1) errors.usageLimit = 'Usage limit must be a positive whole number.';
      else values.usageLimit = limit;
    }
  }

  if (has(input, 'isActive', 'is_active')) {
    const active = pick(input, 'isActive', 'is_active');
    if (typeof active !== 'boolean') errors.isActive = 'isActive must be a boolean.';
    else values.isActive = active;
  } else if (!partial) {
    values.isActive = true;
  }

  if (has(input, 'description')) values.description = clean(input.description).slice(0, 300);

  if (values.discountType === 'percentage' && values.discountValue > 100) {
    errors.discountValue = 'Percentage discount cannot exceed 100.';
  }

  return { errors, values };
}

export function validateInventoryAdjustment(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};
  const delta = Number(input.delta ?? input.quantity);
  if (!Number.isInteger(delta) || delta === 0) {
    errors.delta = 'Adjustment must be a non-zero whole number.';
  } else {
    values.delta = delta;
  }
  if (has(input, 'lowStockThreshold', 'low_stock_threshold')) {
    const threshold = Number(pick(input, 'lowStockThreshold', 'low_stock_threshold'));
    if (!Number.isInteger(threshold) || threshold < 0) {
      errors.lowStockThreshold = 'Low stock threshold must be a non-negative whole number.';
    } else {
      values.lowStockThreshold = threshold;
    }
  }
  values.note = clean(input.note).slice(0, 500);
  values.reference = clean(input.reference).slice(0, 120);
  return { errors, values };
}

const HERO_IMAGE_FIELDS = [
  'backgroundImage',
  'productImage',
  'desktopBannerImage',
  'mobileBannerImage',
];

const HERO_LINK_FIELDS = ['primaryButtonLink', 'secondaryButtonLink'];

const HERO_TEXT_FIELDS = {
  heading: 160,
  headingHighlight: 160,
  subtitle: 240,
  description: 800,
  primaryButtonText: 60,
  secondaryButtonText: 60,
};

const HERO_LOCALES = ['en', 'ta'];

const isSafeImageUrl = (value) => /^(https?:\/\/|\/)/i.test(value);
const isSafeLink = (value) => /^(https?:\/\/|\/|#|mailto:|tel:)/i.test(value);

/** Validates a Homepage Hero create/update payload. */
export function validateHeroPayload(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};
  const values = {};

  for (const [field, maxLength] of Object.entries(HERO_TEXT_FIELDS)) {
    if (has(input, field)) {
      values[field] = clean(input[field]).slice(0, maxLength);
    }
  }

  if (has(input, 'locales')) {
    const rawLocales = input.locales;
    if (!rawLocales || typeof rawLocales !== 'object' || Array.isArray(rawLocales)) {
      errors.locales = 'locales must be an object containing en and ta content.';
    } else {
      const locales = {};
      for (const [lang, content] of Object.entries(rawLocales)) {
        if (!HERO_LOCALES.includes(lang)) {
          errors[`locales.${lang}`] = `Unsupported hero language "${lang}".`;
          continue;
        }
        if (!content || typeof content !== 'object' || Array.isArray(content)) {
          errors[`locales.${lang}`] = 'Language content must be an object.';
          continue;
        }
        const localeValues = {};
        for (const [field, maxLength] of Object.entries(HERO_TEXT_FIELDS)) {
          if (has(content, field)) {
            localeValues[field] = clean(content[field]).slice(0, maxLength);
          }
        }
        if (Object.keys(localeValues).length) locales[lang] = localeValues;
      }
      if (Object.keys(locales).length) values.locales = locales;
    }
  }

  for (const field of HERO_IMAGE_FIELDS) {
    if (!has(input, field)) continue;
    const url = clean(input[field]).slice(0, 1000);
    if (url && !isSafeImageUrl(url)) {
      errors[field] = 'Image URLs must start with http(s):// or "/".';
    } else {
      values[field] = url;
    }
  }

  for (const field of HERO_LINK_FIELDS) {
    if (!has(input, field)) continue;
    const link = clean(input[field]).slice(0, 500);
    if (link && !isSafeLink(link)) {
      errors[field] = 'Links must start with http(s)://, "/", "#", mailto: or tel:.';
    } else {
      values[field] = link;
    }
  }

  if (has(input, 'textAlign')) {
    const textAlign = clean(input.textAlign).toLowerCase();
    if (!['left', 'center', 'right'].includes(textAlign)) {
      errors.textAlign = 'Text alignment must be left, center or right.';
    } else {
      values.textAlign = textAlign;
    }
  }

  if (has(input, 'isVisible')) {
    if (typeof input.isVisible !== 'boolean') {
      errors.isVisible = 'isVisible must be a boolean.';
    } else {
      values.isVisible = input.isVisible;
    }
  }

  return { errors, values };
}

export function parsePagination(query) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  const rawLimit = Math.floor(Number(query.limit)) || DEFAULT_PAGE_SIZE;
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
