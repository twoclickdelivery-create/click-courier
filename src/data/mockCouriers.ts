import { Coordinates, Courier } from '../types';

export const courierLocations: Record<string, Coordinates> = {
  c1: { latitude: 42.9756, longitude: 47.5012 },
  c2: { latitude: 42.9912, longitude: 47.5180 },
  c3: { latitude: 42.9684, longitude: 47.4925 },
  c4: { latitude: 42.9871, longitude: 47.4988 },
  c5: { latitude: 42.9802, longitude: 47.5210 },
};

export const mockCouriers: Courier[] = [
  {
    id: 'c1',
    name: 'Магомед Алиев',
    phone: '+7 928 123 45 67',
    transport: 'bike',
    totalOrders: 247,
    rating: 4.8,
    monthEarnings: 48200,
  },
  {
    id: 'c2',
    name: 'Шамиль Гаджиев',
    phone: '+7 928 234 56 78',
    transport: 'car',
    totalOrders: 412,
    rating: 4.9,
    monthEarnings: 72500,
  },
  {
    id: 'c3',
    name: 'Расул Магомедов',
    phone: '+7 928 345 67 89',
    transport: 'foot',
    totalOrders: 89,
    rating: 4.6,
    monthEarnings: 18400,
  },
  {
    id: 'c4',
    name: 'Артур Идрисов',
    phone: '+7 928 456 78 90',
    transport: 'bike',
    totalOrders: 198,
    rating: 4.7,
    monthEarnings: 39800,
  },
  {
    id: 'c5',
    name: 'Камиль Османов',
    phone: '+7 928 567 89 01',
    transport: 'car',
    totalOrders: 305,
    rating: 4.85,
    monthEarnings: 61300,
  },
];

export const defaultCourier: Courier = mockCouriers[0];
