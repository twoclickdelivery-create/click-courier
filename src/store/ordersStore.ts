import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, OrderStatus, CancelReason, ChatMessage, EarningsBreakdown } from '../types';
import { generateInitialOrders, generateAutoOrder } from '../data/mockOrders';

// Статусы, из которых можно перейти в следующий (защита от невалидных переходов)
const VALID_NEXT_STATUSES: Partial<Record<OrderStatus, OrderStatus[]>> = {
  new:                 ['going_to_restaurant', 'cancelled'],
  going_to_restaurant: ['at_restaurant',       'cancelled'],
  // at_restaurant → picked_up (explicit pickup) OR going_to_client (direct)
  at_restaurant:       ['picked_up', 'going_to_client', 'cancelled'],
  // picked_up → going_to_client OR at_client
  picked_up:           ['going_to_client', 'at_client'],
  going_to_client:     ['at_client'],
  at_client:           ['delivered'],
};

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_NEXT_STATUSES[from]?.includes(to) ?? false;
}

interface OrdersStore {
  orders: Order[];
  activeOrderId: string | null;
  todayEarnings: number;
  todayCount: number;
  chatMessages: ChatMessage[];

  hydrate: () => void;
  /** Принять заказ — атомарно устанавливает статус + courierId. Возвращает false если заказ уже не new. */
  acceptOrder: (id: string, courierId?: string) => boolean;
  /** Отклонить заказ — только если status === 'new', переводит в 'cancelled' */
  declineOrder: (id: string) => boolean;
  setOrderStatus: (id: string, status: OrderStatus) => void;
  attachProofPhoto: (id: string, uri: string) => void;
  completeOrder: (id: string) => void;
  cancelOrder: (id: string, reason: CancelReason) => void;
  rateOrder: (id: string, rating: number) => void;
  computeEarnings: (order: Order) => EarningsBreakdown;

  addChatMessage: (msg: Omit<ChatMessage, 'id'>) => void;
  markChatRead: () => void;
  getUnreadCount: () => number;

  setOrderCourierId: (id: string, courierId: string) => void;

  dispatchCounter: number;
  addAutoOrder: () => void;

  getNewOrders: () => Order[];
  getInProgressOrders: () => Order[];
  getHistoryOrders: () => Order[];
  getOrderById: (id: string) => Order | undefined;
}

const recomputeTodayStats = (orders: Order[]) => {
  const todayStr = new Date().toDateString();
  const todays = orders.filter(
    (o) =>
      o.status === 'delivered' &&
      o.deliveredAt !== undefined &&
      new Date(o.deliveredAt).toDateString() === todayStr
  );
  return {
    todayEarnings: todays.reduce((s, o) => s + (isFinite(o.payment) ? o.payment : 0), 0),
    todayCount: todays.length,
  };
};

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],
      activeOrderId: null,
      todayEarnings: 0,
      todayCount: 0,
      chatMessages: [],
      dispatchCounter: 0,

      hydrate: () => {
        const current = get().orders;
        const hasNew = current.some((o) => o.status === 'new');
        if (current.length === 0 || !hasNew) {
          const seed = generateInitialOrders();
          const inProgress = current.filter(
            (o) => o.status !== 'new' && o.status !== 'delivered' && o.status !== 'cancelled'
          );
          const history = current.filter(
            (o) => o.status === 'delivered' || o.status === 'cancelled'
          );
          const newOnes = seed.filter((o) => o.status === 'new');
          const merged = [...newOnes, ...inProgress, ...history];
          const stats = recomputeTodayStats(merged);
          set({ orders: merged, ...stats });
        } else {
          set(recomputeTodayStats(current));
        }
      },

      // ── Атомарное принятие: статус + courierId в одном set() ────────────────
      acceptOrder: (id, courierId) => {
        const target = get().orders.find((o) => o.id === id);
        if (!target || target.status !== 'new') return false;

        const orders = get().orders.map((o) =>
          o.id === id
            ? {
                ...o,
                status: 'going_to_restaurant' as OrderStatus,
                acceptedAt: Date.now(),
                ...(courierId !== undefined ? { courierId } : {}),
              }
            : o
        );
        set({ orders, activeOrderId: id });
        return true;
      },

      // ── Отклонить только 'new' заказ → 'cancelled' (не удалять из истории) ──
      declineOrder: (id) => {
        const target = get().orders.find((o) => o.id === id);
        if (!target || target.status !== 'new') return false;

        const orders = get().orders.map((o) =>
          o.id === id ? { ...o, status: 'cancelled' as OrderStatus } : o
        );
        set({ orders });
        return true;
      },

      // ── Переход статуса с валидацией ─────────────────────────────────────────
      setOrderStatus: (id, status) => {
        const target = get().orders.find((o) => o.id === id);
        if (!target) return;
        if (!canTransition(target.status, status)) return; // невалидный переход — игнор

        const orders = get().orders.map((o) => {
          if (o.id !== id) return o;
          const updates: Partial<Order> = { status };
          if (status === 'picked_up' || status === 'going_to_client') {
            updates.pickedUpAt = Date.now();
          }
          // acceptedAt никогда не перетирается
          return { ...o, ...updates };
        });
        set({ orders });
      },

      attachProofPhoto: (id, uri) => {
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, proofPhotoUri: uri } : o
          ),
        });
      },

      // ── Идемпотентное завершение: повторный вызов игнорируется ───────────────
      completeOrder: (id) => {
        const target = get().orders.find((o) => o.id === id);
        if (!target || target.status === 'delivered') return; // уже завершён

        const orders = get().orders.map((o) =>
          o.id === id
            ? { ...o, status: 'delivered' as OrderStatus, deliveredAt: Date.now() }
            : o
        );
        const stats = recomputeTodayStats(orders);
        set({ orders, activeOrderId: null, ...stats });
      },

      cancelOrder: (id, reason) => {
        const orders = get().orders.map((o) =>
          o.id === id
            ? { ...o, status: 'cancelled' as OrderStatus, cancelReason: reason }
            : o
        );
        set({ orders, activeOrderId: get().activeOrderId === id ? null : get().activeOrderId });
      },

      rateOrder: (id, rating) => {
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, rating } : o
          ),
        });
      },

      computeEarnings: (order) => {
        const base = 80;
        const distanceBonus = order.distanceKm * 15;
        let timeBonus = 0;
        if (
          order.acceptedAt !== undefined &&
          order.deliveredAt !== undefined &&
          order.deliveredAt < order.acceptedAt + order.estimatedTimeMin * 60000 + 300000
        ) {
          timeBonus = 20;
        }
        return { base, distanceBonus, timeBonus, total: base + distanceBonus + timeBonus };
      },

      addChatMessage: (msg) => {
        const message: ChatMessage = { ...msg, id: Date.now().toString() };
        set({ chatMessages: [...get().chatMessages, message] });
      },

      markChatRead: () => {
        set({
          chatMessages: get().chatMessages.map((m) => ({ ...m, read: true })),
        });
      },

      getUnreadCount: () => get().chatMessages.filter((m) => !m.read).length,

      addAutoOrder: () => {
        const counter = get().dispatchCounter;
        const newOrder = generateAutoOrder(counter);
        set({
          orders: [newOrder, ...get().orders],
          dispatchCounter: counter + 1,
        });
      },

      setOrderCourierId: (id, courierId) => {
        set({
          orders: get().orders.map((o) =>
            o.id === id ? { ...o, courierId } : o
          ),
        });
      },

      getNewOrders: () => get().orders.filter((o) => o.status === 'new'),

      getInProgressOrders: () =>
        get().orders.filter(
          (o) =>
            o.status !== 'new' &&
            o.status !== 'delivered' &&
            o.status !== 'cancelled'
        ),

      getHistoryOrders: () =>
        get()
          .orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled')
          .sort((a, b) => (b.deliveredAt ?? 0) - (a.deliveredAt ?? 0)),

      getOrderById: (id) => get().orders.find((o) => o.id === id),
    }),
    {
      name: 'click-courier-orders',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        orders: state.orders,
        activeOrderId: state.activeOrderId,
      }),
    }
  )
);
