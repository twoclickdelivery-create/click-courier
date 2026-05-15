import { create } from 'zustand';
import { Order, ClientProfile, SavedAddress, FavRestaurant, ClientTag } from '../types';

// ── Tag logic ─────────────────────────────────────────────────────────────────
function computeTags(profile: Omit<ClientProfile, 'tags'>): ClientTag[] {
  const tags: ClientTag[] = [];
  const dayMs = 86_400_000;
  const now = Date.now();
  const daysSinceLast = (now - profile.lastOrderAt) / dayMs;
  const daysSinceFirst = (now - profile.firstOrderAt) / dayMs;

  // Lost: last order 30+ days ago
  if (daysSinceLast >= 30) {
    tags.push('lost');
    return tags; // lost clients don't get other tags
  }

  // VIP: 10+ orders OR 5000+ ₽ total
  if (profile.totalOrders >= 10 || profile.totalSpent >= 5000) tags.push('vip');

  // Frequent: 3+ orders
  if (profile.totalOrders >= 3) tags.push('frequent');

  // New: first order within last 3 days
  if (daysSinceFirst <= 3 && profile.totalOrders === 1) tags.push('new');

  // Returning: gap of 7+ days then new order in last 3 days
  if (
    profile.totalOrders > 1 &&
    daysSinceFirst > 10 &&
    daysSinceLast <= 3
  ) {
    tags.push('returning');
  }

  return tags;
}

// ── Build addresses list from orders ─────────────────────────────────────────
function extractAddresses(orders: Order[]): SavedAddress[] {
  const map = new Map<string, SavedAddress>();

  orders.forEach((order) => {
    const key = `${order.client.address}|${order.client.apartment ?? ''}`;
    const existing = map.get(key);
    if (existing) {
      existing.useCount += 1;
      if (order.createdAt > existing.lastUsedAt) {
        existing.lastUsedAt = order.createdAt;
      }
    } else {
      map.set(key, {
        address: order.client.address,
        apartment: order.client.apartment,
        comment: order.client.comment,
        coordinates: order.client.coordinates,
        useCount: 1,
        lastUsedAt: order.createdAt,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.useCount - a.useCount);
}

// ── Build favourite restaurants ───────────────────────────────────────────────
function extractFavRestaurants(orders: Order[]): FavRestaurant[] {
  const map = new Map<string, FavRestaurant>();

  orders.forEach((order) => {
    const existing = map.get(order.restaurant.id);
    if (existing) {
      existing.orderCount += 1;
    } else {
      map.set(order.restaurant.id, {
        id: order.restaurant.id,
        name: order.restaurant.name,
        orderCount: 1,
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => b.orderCount - a.orderCount);
}

// ── Build a single ClientProfile from its orders ──────────────────────────────
function buildProfile(phone: string, orders: Order[]): ClientProfile {
  const delivered = orders.filter((o) => o.status === 'delivered');
  const totalSpent = delivered.reduce((s, o) => s + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / Math.max(delivered.length, 1)) : 0;
  const firstOrderAt = Math.min(...orders.map((o) => o.createdAt));
  const lastOrderAt  = Math.max(...orders.map((o) => o.createdAt));

  const base = {
    phone,
    name: orders[0].client.name,
    totalOrders,
    totalSpent,
    avgOrderValue,
    firstOrderAt,
    lastOrderAt,
    addresses: extractAddresses(orders),
    favoriteRestaurants: extractFavRestaurants(orders),
    orderIds: orders.map((o) => o.id),
  };

  return { ...base, tags: computeTags(base) };
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface ClientsStore {
  /** Rebuild all client profiles from current orders snapshot */
  buildFromOrders: (orders: Order[]) => void;
  clients: ClientProfile[];
  /** Convenience selectors */
  getByPhone: (phone: string) => ClientProfile | undefined;
  stats: {
    total: number;
    totalOrders: number;
    repeatRate: number; // 0–1
  };
}

export const useClientsStore = create<ClientsStore>()((set, get) => ({
  clients: [],
  stats: { total: 0, totalOrders: 0, repeatRate: 0 },

  buildFromOrders: (orders: Order[]) => {
    // Group orders by client phone
    const byPhone = new Map<string, Order[]>();
    orders.forEach((order) => {
      const phone = order.client.phone;
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      byPhone.get(phone)!.push(order);
    });

    const clients: ClientProfile[] = [];
    byPhone.forEach((clientOrders, phone) => {
      clients.push(buildProfile(phone, clientOrders));
    });

    // Sort by totalOrders desc
    clients.sort((a, b) => b.totalOrders - a.totalOrders);

    const total = clients.length;
    const totalOrders = clients.reduce((s, c) => s + c.totalOrders, 0);
    const repeating = clients.filter((c) => c.totalOrders > 1).length;
    const repeatRate = total > 0 ? repeating / total : 0;

    set({ clients, stats: { total, totalOrders, repeatRate } });
  },

  getByPhone: (phone) => get().clients.find((c) => c.phone === phone),
}));
