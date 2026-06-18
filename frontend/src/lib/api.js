const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Récupérer le token JWT stocké dans localStorage
 */
const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('foodloop_token');
  }
  return null;
};

/**
 * Client HTTP générique pour l'API FoodLoop
 */
const apiClient = async (endpoint, options = {}) => {
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Erreur réseau' }));
    throw new Error(error.error || `Erreur ${response.status}`);
  }

  return response.json();
};

// ============================================
// AUTH
// ============================================
export const authApi = {
  register: (data) => apiClient('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => apiClient('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiClient('/auth/me'),
};

// ============================================
// PRODUITS
// ============================================
export const productsApi = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiClient(`/products${qs ? `?${qs}` : ''}`);
  },
  getOne: (id) => apiClient(`/products/${id}`),
  create: (data) => apiClient('/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiClient(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiClient(`/products/${id}`, { method: 'DELETE' }),
};

// ============================================
// COMMANDES
// ============================================
export const ordersApi = {
  create: (data) => apiClient('/orders', { method: 'POST', body: JSON.stringify(data) }),
  getMine: () => apiClient('/orders/mine'),
  getOne: (id) => apiClient(`/orders/${id}`),
  updateStatus: (id, status) => apiClient(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getProducerOrders: () => apiClient('/orders/producer'),
};