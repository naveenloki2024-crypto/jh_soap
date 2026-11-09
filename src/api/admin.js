import { API_BASE, apiRequest } from './client';

const signalAuthFailure = (error) => {
  if (error?.status === 401 || error?.status === 403) {
    window.dispatchEvent(new Event('admin:unauthorized'));
  }
  throw error;
};

async function adminRequest(path, options) {
  try {
    return await apiRequest(path, options);
  } catch (error) {
    return signalAuthFailure(error);
  }
}

function withQuery(path, params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') query.set(key, value);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export const adminLogin = (payload) =>
  adminRequest('/auth/admin/login', { method: 'POST', body: payload });

export const getAdminDashboard = () => adminRequest('/admin/dashboard');

export const getAdminProducts = (params) =>
  adminRequest(withQuery('/admin/products', params));

export const createAdminProduct = (payload) =>
  adminRequest('/products', { method: 'POST', body: payload });

export const updateAdminProduct = (id, payload) =>
  adminRequest(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });

export const deactivateAdminProduct = (id) =>
  adminRequest(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getAdminOrders = (params) =>
  adminRequest(withQuery('/admin/orders', params));

export const getAdminOrder = (id) =>
  adminRequest(`/admin/orders/${encodeURIComponent(id)}`);

export const updateAdminOrderStatus = (id, payload) =>
  adminRequest(`/admin/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: payload,
  });

export const deleteAdminOrder = (id) =>
  adminRequest(`/admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getAdminCustomers = (params) =>
  adminRequest(withQuery('/admin/customers', params));

export const getAdminCustomer = (id) =>
  adminRequest(`/admin/customers/${encodeURIComponent(id)}`);

export const updateAdminCustomer = (id, payload) =>
  adminRequest(`/admin/customers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });

export const deleteAdminCustomer = (id) =>
  adminRequest(`/admin/customers/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const getAdminInventory = (params) =>
  adminRequest(withQuery('/admin/inventory', params));

export const adjustAdminInventory = (productId, payload) =>
  adminRequest(`/admin/inventory/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: payload,
  });

export const getAdminPayments = (params) =>
  adminRequest(withQuery('/admin/payments', params));

export const getAdminReports = (params) =>
  adminRequest(withQuery('/admin/reports', params));

export const getAdminHero = () => adminRequest('/admin/hero');

export const saveAdminHero = (payload) =>
  adminRequest('/admin/hero', { method: 'PUT', body: payload });

export const resetAdminHero = () =>
  adminRequest('/admin/hero/reset', { method: 'POST' });

export async function uploadProductImage(file) {
  let response;
  try {
    response = await fetch(`${API_BASE}/admin/uploads`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json', 'Content-Type': file.type },
      body: file,
    });
  } catch {
    throw new Error('Image upload failed. Please check your connection.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Image upload failed.');
    error.status = response.status;
    error.fieldErrors = data.errors || null;
    return signalAuthFailure(error);
  }

  return data;
}

/** Shared upload helper for product and hero images. */
export const uploadAdminImage = uploadProductImage;
