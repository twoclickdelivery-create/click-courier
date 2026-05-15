import { Order } from '../types';
import { mockRestaurants } from './mockRestaurants';

const now = Date.now();
const min = 60_000;
const hour = 60 * min;
const day = 24 * hour;

const clientAddresses: Array<{
  address: string;
  apartment?: string;
  comment?: string;
  coordinates: { latitude: number; longitude: number };
}> = [
  { address: 'ул. Коркмасова, 12',        apartment: 'кв. 34',  comment: 'Домофон 34К, 3 этаж',             coordinates: { latitude: 42.978, longitude: 47.498 } },
  { address: 'пр. Гамидова, 7',           apartment: 'кв. 102', comment: 'Подъезд 2, код 1234',             coordinates: { latitude: 42.991, longitude: 47.512 } },
  { address: 'ул. Батырая, 142',          apartment: 'кв. 56',  comment: 'Позвонить, домофон не работает', coordinates: { latitude: 42.965, longitude: 47.492 } },
  { address: 'ул. Гагарина, 25',          apartment: 'кв. 8',   comment: 'Оставить у двери',                coordinates: { latitude: 42.972, longitude: 47.486 } },
  { address: 'пр. Шамиля, 90',            apartment: 'кв. 211',                                             coordinates: { latitude: 42.983, longitude: 47.522 } },
  { address: 'ул. Дзержинского, 15',      apartment: 'кв. 3',   comment: 'Частный дом, ворота открыты',    coordinates: { latitude: 42.969, longitude: 47.504 } },
  { address: 'ул. Магомеда Ярагского, 60',apartment: 'кв. 78',                                             coordinates: { latitude: 42.985, longitude: 47.508 } },
  { address: 'пр. Акушинского, 14',       apartment: 'кв. 144', comment: 'Этаж 12',                        coordinates: { latitude: 42.999, longitude: 47.487 } },
  { address: 'ул. Лаптиева, 41',          apartment: 'кв. 6',                                              coordinates: { latitude: 42.994, longitude: 47.521 } },
  { address: 'ул. Танкаева, 7',           apartment: 'кв. 22',  comment: 'Постучать',                      coordinates: { latitude: 42.989, longitude: 47.499 } },
  { address: 'ул. Абубакара Тахо-Годи, 3',apartment: 'кв. 17',  comment: 'Код домофона 17',                coordinates: { latitude: 42.975, longitude: 47.503 } },
  { address: 'пр. Имама Шамиля, 55',      apartment: 'кв. 88',                                             coordinates: { latitude: 42.996, longitude: 47.495 } },
  { address: 'ул. Буйнакского, 28',       apartment: 'кв. 5',   comment: '1 этаж, левая дверь',            coordinates: { latitude: 42.981, longitude: 47.516 } },
  { address: 'ул. Гоголя, 11',            apartment: 'кв. 49',  comment: 'Не звонить, спит ребёнок',       coordinates: { latitude: 42.988, longitude: 47.491 } },
  { address: 'пр. Петра I, 63',           apartment: 'кв. 200', comment: 'Лифт не работает, 5 этаж',       coordinates: { latitude: 42.971, longitude: 47.510 } },
  { address: 'ул. Казбекова, 19',         apartment: 'кв. 33',                                             coordinates: { latitude: 42.977, longitude: 47.484 } },
  { address: 'ул. Абубакарова, 44',       apartment: 'кв. 71',  comment: 'Подъезд 3',                      coordinates: { latitude: 42.993, longitude: 47.519 } },
  { address: 'ул. Омарова, 8',            apartment: 'кв. 12',                                             coordinates: { latitude: 42.968, longitude: 47.497 } },
  { address: 'пр. Расула Гамзатова, 16',  apartment: 'кв. 155', comment: 'Этаж 9, домофон 155',            coordinates: { latitude: 43.001, longitude: 47.489 } },
  { address: 'ул. Ахульго, 31',           apartment: 'кв. 27',  comment: 'Частный сектор',                 coordinates: { latitude: 42.963, longitude: 47.507 } },
];

// ── 45 уникальных клиентов ────────────────────────────────────────────────────
const clientNames = [
  'Патимат', 'Заира', 'Аслан', 'Магомед', 'Хадижат',
  'Рустам', 'Аминат', 'Ибрагим', 'Зарема', 'Муслим',
  'Анна', 'Сергей', 'Тимур', 'Мария', 'Эльвира',
  'Саида', 'Арслан', 'Нурият', 'Камиль', 'Джамиля',
  'Алибек', 'Мадина', 'Шамиль', 'Зульфия', 'Гаджи',
  'Карина', 'Расул', 'Айшат', 'Даниял', 'Фатима',
  'Юсуп', 'Барият', 'Элдар', 'Написат', 'Омар',
  'Залина', 'Абдулла', 'Хава', 'Назир', 'Светлана',
  'Алиса', 'Курбан', 'Сабина', 'Махач', 'Раисат',
];

const clientPhones = [
  '+7 988 555 33 22', '+7 928 111 22 33', '+7 963 222 33 44',
  '+7 960 333 44 55', '+7 989 444 55 66', '+7 962 555 66 77',
  '+7 996 666 77 88', '+7 988 777 88 99', '+7 928 888 99 00',
  '+7 963 999 00 11', '+7 989 101 11 22', '+7 928 202 22 33',
  '+7 960 303 33 44', '+7 962 404 44 55', '+7 988 505 55 66',
  '+7 996 606 66 77', '+7 963 707 77 88', '+7 989 808 88 99',
  '+7 928 909 90 01', '+7 960 010 00 12', '+7 962 111 12 23',
  '+7 988 212 23 34', '+7 963 313 34 45', '+7 996 414 45 56',
  '+7 989 515 56 67', '+7 928 616 67 78', '+7 960 717 78 89',
  '+7 962 818 89 90', '+7 988 919 90 01', '+7 963 020 01 12',
  '+7 996 121 11 22', '+7 989 222 22 33', '+7 928 323 33 44',
  '+7 960 424 44 55', '+7 962 525 55 66', '+7 988 626 66 77',
  '+7 963 727 77 88', '+7 996 828 88 99', '+7 989 929 90 00',
  '+7 928 030 00 11', '+7 960 131 11 22', '+7 962 232 22 33',
  '+7 988 333 33 44', '+7 963 434 44 55', '+7 996 535 55 66',
];

const itemSets = [
  [{ id: 'i1', name: 'Капучино', quantity: 2 }, { id: 'i2', name: 'Чизкейк', quantity: 1 }],
  [{ id: 'i3', name: 'Хинкал', quantity: 4 }, { id: 'i4', name: 'Чай чёрный', quantity: 2 }],
  [{ id: 'i5', name: 'Бургер классик', quantity: 1 }, { id: 'i6', name: 'Картофель фри', quantity: 1 }, { id: 'i7', name: 'Кола 0.5', quantity: 1 }],
  [{ id: 'i8', name: 'Пицца Маргарита 30см', quantity: 1 }],
  [{ id: 'i9', name: 'Сет Филадельфия', quantity: 1 }, { id: 'i10', name: 'Мисо суп', quantity: 2 }],
  [{ id: 'i11', name: 'Шашлык бараний', quantity: 3 }, { id: 'i12', name: 'Лаваш', quantity: 2 }],
  [{ id: 'i13', name: 'Латте', quantity: 1 }, { id: 'i14', name: 'Круассан', quantity: 2 }],
  [{ id: 'i15', name: 'Плов', quantity: 2 }, { id: 'i16', name: 'Салат овощной', quantity: 1 }],
];

const buildOrder = (i: number, status: Order['status'], offsetMs: number): Order => {
  const restaurant = mockRestaurants[i % mockRestaurants.length];
  const addr = clientAddresses[i % clientAddresses.length];
  const number = String(1240 + i);
  const items = itemSets[i % itemSets.length];
  const distance = Number((1.5 + (i % 5) * 0.6).toFixed(1));
  const time = 6 + (i % 7) * 2;
  const payment = 150 + (i % 6) * 30;
  const total = 480 + (i % 9) * 95;

  return {
    id: `o${i + 1}`,
    number: `#${number}`,
    status,
    restaurant,
    client: {
      name: clientNames[i % clientNames.length],
      phone: clientPhones[i % clientPhones.length],
      address: addr.address,
      apartment: addr.apartment,
      comment: addr.comment,
      coordinates: addr.coordinates,
    },
    items,
    payment,
    total,
    distanceKm: distance,
    estimatedTimeMin: time,
    needsThermoBag: i % 2 === 0,
    createdAt: now - offsetMs,
    rating: status === 'delivered' ? 4 + Math.round(Math.random()) : undefined,
    deliveredAt: status === 'delivered' ? now - offsetMs + 35 * min : undefined,
    acceptedAt: status !== 'new' ? now - offsetMs + 30_000 : undefined,
    pickedUpAt:
      status === 'going_to_client' || status === 'at_client' || status === 'delivered'
        ? now - offsetMs + 10 * min
        : undefined,
  };
};

// ── Auto-dispatch: generates one fresh "new" order from the cycling pool ──────
export const generateAutoOrder = (counter: number): Order => {
  // Use a high index offset so IDs never clash with initial orders
  const idx = 50 + counter;
  const base = buildOrder(idx, 'new', 0);
  return {
    ...base,
    id: `auto_${Date.now()}_${counter}`,
    number: `#${1500 + counter}`,
    createdAt: Date.now(),
    acceptedAt: undefined,
    pickedUpAt: undefined,
    deliveredAt: undefined,
    rating: undefined,
    proofPhotoUri: undefined,
    courierId: undefined,
  };
};

export const generateInitialOrders = (): Order[] => {
  const orders: Order[] = [];

  // ── Активные заказы (новые / в пути) ────────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    orders.push(buildOrder(i, 'new', i * 30_000));
  }
  orders.push(buildOrder(4, 'going_to_restaurant', 5 * min));
  orders.push(buildOrder(5, 'going_to_client', 12 * min));

  // ── Доставленные за последние 7 дней (активные клиенты) ─────────────────────
  for (let i = 0; i < 30; i++) {
    const offset = (i + 1) * 4 * hour + (i % 7) * day;
    orders.push(buildOrder(6 + i, 'delivered', offset));
  }

  // ── Повторные заказы VIP-клиентов (много заказов) ───────────────────────────
  for (let i = 0; i < 15; i++) {
    const clientIdx = i % 5; // первые 5 клиентов — VIP
    const offset = (i + 1) * 6 * hour + i * day;
    const o = buildOrder(clientIdx, 'delivered', offset);
    orders.push({ ...o, id: `vip_${i}`, number: `#${1600 + i}` });
  }

  // ── Потерянные клиенты — последний заказ 35–90 дней назад ───────────────────
  const lostClientIndices = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44];
  lostClientIndices.forEach((clientIdx, i) => {
    const daysAgo = 35 + i * 6; // 35, 41, 47 ... 89 дней назад
    const offset = daysAgo * day;
    const o = buildOrder(clientIdx, 'delivered', offset);
    orders.push({ ...o, id: `lost_${i}`, number: `#${1700 + i}` });
    // Некоторые потерянные имеют 2 заказа
    if (i % 3 === 0) {
      const o2 = buildOrder(clientIdx, 'delivered', offset + 5 * day);
      orders.push({ ...o2, id: `lost_${i}_2`, number: `#${1800 + i}` });
    }
  });

  return orders;
};
