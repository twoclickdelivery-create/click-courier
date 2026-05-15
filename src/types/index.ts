export type TransportType = 'foot' | 'bike' | 'car';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Courier {
  id: string;
  name: string;
  phone: string;
  avatar?: string;
  transport: TransportType;
  totalOrders: number;
  rating: number;
  monthEarnings: number;
  shiftStartedAt?: number;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone: string;
  coordinates: Coordinates;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
}

export type OrderStatus =
  | 'new'
  | 'accepted'
  | 'going_to_restaurant'
  | 'at_restaurant'
  | 'picked_up'
  | 'going_to_client'
  | 'at_client'
  | 'delivered'
  | 'cancelled';

export interface ClientInfo {
  name: string;
  phone: string;
  address: string;
  apartment?: string;
  comment?: string;
  coordinates: Coordinates;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  restaurant: Restaurant;
  client: ClientInfo;
  items: OrderItem[];
  payment: number;
  total: number;
  distanceKm: number;
  estimatedTimeMin: number;
  needsThermoBag: boolean;
  createdAt: number;
  acceptedAt?: number;
  pickedUpAt?: number;
  deliveredAt?: number;
  rating?: number;
  proofPhotoUri?: string;
  courierId?: string;
  cancelReason?: CancelReason;
}

export interface AuthState {
  isAuthenticated: boolean;
  courier: Courier | null;
  isOnShift: boolean;
}

export interface ChatMessage {
  id: string;
  fromDispatcher: boolean;
  text: string;
  createdAt: number;
  read: boolean;
}

export type CancelReason =
  | 'client_not_answering'
  | 'address_not_found'
  | 'restaurant_closed'
  | 'other';

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  client_not_answering: 'Клиент не отвечает',
  address_not_found: 'Не нашёл адрес',
  restaurant_closed: 'Ресторан закрыт',
  other: 'Другая причина',
};

// Earnings breakdown per order
export interface EarningsBreakdown {
  base: number;        // base rate (flat)
  distanceBonus: number; // per km bonus
  timeBonus: number;   // on-time delivery bonus
  total: number;
}

// ── Client profile (built from order history, keyed by phone) ──────────────
export type ClientTag = 'vip' | 'frequent' | 'new' | 'returning' | 'lost';

export interface SavedAddress {
  address: string;
  apartment?: string;
  comment?: string;
  coordinates: Coordinates;
  useCount: number;
  lastUsedAt: number;
}

export interface FavRestaurant {
  id: string;
  name: string;
  orderCount: number;
}

export interface ClientProfile {
  phone: string;               // primary key
  name: string;
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  firstOrderAt: number;
  lastOrderAt: number;
  tags: ClientTag[];
  addresses: SavedAddress[];   // sorted by useCount desc
  favoriteRestaurants: FavRestaurant[];
  orderIds: string[];
}
