/**
 * lib/api-client.ts
 * Centralized, type-safe API client for all backend operations.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Shared helpers ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, json.error ?? `HTTP ${res.status}`, json);
  return json as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: Meta;
}

// Vendor
export interface Vendor {
  id: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  pubkey: string;
  createdAt: string;
  updatedAt: string;
  _count?: { products: number; orders: number };
}
export interface VendorInput {
  name: string;
  pubkey: string;
  description?: string;
  logoUrl?: string;
}

// Category
export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: Pick<Category, 'id' | 'name'> | null;
  children?: Category[];
  _count?: { products: number };
}
export interface CategoryInput {
  name: string;
  slug: string;
  parentId?: string | null;
}

// Product
export type Availability = 'IN_STOCK' | 'OUT_OF_STOCK' | 'PRE_ORDER' | 'DISCONTINUED';
export type Condition = 'NEW' | 'USED' | 'REFURBISHED';

export interface Product {
  id: string;
  productID: string;
  sku: string;
  gtin?: string | null;
  mpn?: string | null;
  name: string;
  description: string;
  images: string[];
  price: string;
  currency: string;
  stockQuantity: number;
  availability: Availability;
  condition: Condition;
  vendorId: string;
  vendor: Pick<Vendor, 'id' | 'name' | 'logoUrl'>;
  categoryId: string;
  category: Pick<Category, 'id' | 'name' | 'slug'> & { parent?: Pick<Category, 'name'> | null };
  createdAt: string;
  updatedAt: string;
}
export interface ProductInput {
  productID: string;
  sku: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  stockQuantity?: number;
  availability?: Availability;
  condition?: Condition;
  vendorId: string;
  categoryId: string;
  images?: string[];
  gtin?: string;
  mpn?: string;
}

// Order
export type OrderStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  productId: string;
  product: Pick<Product, 'id' | 'name' | 'sku' | 'images'>;
  vendorId: string;
  vendor: Pick<Vendor, 'id' | 'name' | 'logoUrl'>;
  orderId?: string;
  order?: Pick<Order, 'id' | 'status' | 'totalAmount'>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  totalAmount: string;
  userWallet?: string | null;
  txHash?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}
export interface OrderInput {
  items: Array<{ productId: string; quantity: number }>;
  userWallet?: string;
  txHash?: string;
}

// Chat
export interface ChatPreview {
  id: string;
  name: string;
  startTime: string;
  lastUpdated: string;
  _count: { userRequests: number; agentResponses: number };
  userRequests: Array<{ id: string; type: string; text: string; timestamp: string }>;
}

export interface TimelineItem {
  role: 'user' | 'agent';
  id: string;
  type: string;
  text: string;
  timestamp: Date;
  linkedResponseId?: string | null;
  linkedRequestId?: string | null;
}

export interface ChatDetail {
  id: string;
  name: string;
  startTime: string;
  lastUpdated: string;
  userRequests: unknown[];
  agentResponses: unknown[];
  timeline: TimelineItem[];
}

// Smart Wallet
export interface SmartWalletRecord {
  id: string;
  ownerEoa: string;
  smartWalletAddress: string;
  sessionKeyPublic: string;
  spendLimitUsdc: string;
  expiresAt: string;
  fundingAsset?: string | null;
  chatId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Vendors API ───────────────────────────────────────────────────────────────

export const vendorsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }) =>
    request<Paginated<Vendor>>(`/api/vendors${qs({ page: 1, limit: 20, ...params })}`),

  get: (id: string) => request<{ data: Vendor }>(`/api/vendors/${id}`),

  create: (body: VendorInput) =>
    request<{ data: Vendor }>('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<VendorInput>) =>
    request<{ data: Vendor }>(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/vendors/${id}`, { method: 'DELETE' }),
};

// ─── Categories API ────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: (params?: { flat?: boolean; parentId?: string }) =>
    request<{ data: Category[] }>(`/api/categories${qs(params ?? {})}`),

  get: (id: string) => request<{ data: Category }>(`/api/categories/${id}`),

  create: (body: CategoryInput) =>
    request<{ data: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<CategoryInput>) =>
    request<{ data: Category }>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/categories/${id}`, { method: 'DELETE' }),
};

// ─── Products API ──────────────────────────────────────────────────────────────

export const productsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    vendorId?: string;
    categoryId?: string;
    availability?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) =>
    request<Paginated<Product>>(`/api/products${qs({ page: 1, limit: 20, ...params })}`),

  get: (id: string) => request<{ data: Product }>(`/api/products/${id}`),

  create: (body: ProductInput) =>
    request<{ data: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Partial<ProductInput>) =>
    request<{ data: Product }>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/products/${id}`, { method: 'DELETE' }),
};

// ─── Orders API ────────────────────────────────────────────────────────────────

export const ordersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    userWallet?: string;
    txHash?: string;
    vendorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) =>
    request<Paginated<Order>>(`/api/orders${qs({ page: 1, limit: 20, ...params })}`),

  get: (id: string) => request<{ data: Order }>(`/api/orders/${id}`),

  create: (body: OrderInput) =>
    request<{ data: Order }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  update: (id: string, body: { status?: OrderStatus; txHash?: string; userWallet?: string }) =>
    request<{ data: Order }>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/orders/${id}`, { method: 'DELETE' }),
};

// ─── Order Items API ───────────────────────────────────────────────────────────

export const orderItemsApi = {
  get: (id: string) => request<{ data: OrderItem }>(`/api/order-items/${id}`),

  update: (id: string, body: { quantity: number }) =>
    request<{ data: OrderItem }>(`/api/order-items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/order-items/${id}`, { method: 'DELETE' }),
};

// ─── Chats API ─────────────────────────────────────────────────────────────────

export const chatsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    request<Paginated<ChatPreview>>(`/api/chats${qs({ page: 1, limit: 20, ...params })}`),

  get: (id: string) => request<{ data: ChatDetail }>(`/api/chats/${id}`),

  create: (body?: { id?: string; name?: string }) =>
    request<{ data: { id: string; name: string; startTime: string } }>('/api/chats', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/chats/${id}`, { method: 'DELETE' }),

  addMessage: (
    chatId: string,
    body: {
      userMessage: { type: string; text: string };
      agentMessage: { type: string; text: string; agentName?: string };
    },
  ) =>
    request<{ data: unknown }>(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ─── Wallet API ────────────────────────────────────────────────────────────────

export const walletApi = {
  getSession: (params?: { ownerEoa?: string; chatId?: string }) =>
    request<{ data: SmartWalletRecord | null }>(
      `/api/wallet/session-key${qs(params ?? {})}`,
    ),

  saveSession: (body: {
    smartWalletAddress: string;
    sessionKeyPublic: string;
    sessionKeyEncryptedPrivate: string;
    spendLimitUsdc: number;
    expiresAt: string;
    ownerEoa: string;
    chatId?: string;
    fundingAsset?: string;
  }) =>
    request<{ data: SmartWalletRecord }>('/api/wallet/session-key', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};