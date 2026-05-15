import { Restaurant } from '../types';

export const mockRestaurants: Restaurant[] = [
  {
    id: 'r1',
    name: 'Кофейня Марша',
    address: 'ул. Ярагского, 45',
    phone: '+7 8722 11 22 33',
    coordinates: { latitude: 42.9831, longitude: 47.5044 },
  },
  {
    id: 'r2',
    name: 'Hinkal Brothers',
    address: 'пр. Имама Шамиля, 32',
    phone: '+7 8722 22 33 44',
    coordinates: { latitude: 42.9745, longitude: 47.5105 },
  },
  {
    id: 'r3',
    name: 'Ringo',
    address: 'ул. Магомеда Гаджиева, 8',
    phone: '+7 8722 33 44 55',
    coordinates: { latitude: 42.9698, longitude: 47.4972 },
  },
  {
    id: 'r4',
    name: 'Café Time',
    address: 'пр. Расула Гамзатова, 75',
    phone: '+7 8722 44 55 66',
    coordinates: { latitude: 42.9812, longitude: 47.5167 },
  },
  {
    id: 'r5',
    name: 'Шашлычная Дагестан',
    address: 'ул. Коркмасова, 22',
    phone: '+7 8722 55 66 77',
    coordinates: { latitude: 42.976, longitude: 47.494 },
  },
  {
    id: 'r6',
    name: 'Pizza House',
    address: 'пр. Петра I, 56',
    phone: '+7 8722 66 77 88',
    coordinates: { latitude: 42.985, longitude: 47.519 },
  },
  {
    id: 'r7',
    name: 'Sushi Master',
    address: 'ул. Танкаева, 12',
    phone: '+7 8722 77 88 99',
    coordinates: { latitude: 42.9905, longitude: 47.5012 },
  },
  {
    id: 'r8',
    name: 'Бургерная №1',
    address: 'ул. Ермошкина, 45',
    phone: '+7 8722 88 99 00',
    coordinates: { latitude: 42.967, longitude: 47.501 },
  },
  {
    id: 'r9',
    name: 'Хинкальная у Мага',
    address: 'ул. Лаптиева, 70',
    phone: '+7 8722 99 00 11',
    coordinates: { latitude: 42.9915, longitude: 47.5275 },
  },
  {
    id: 'r10',
    name: 'Восточная кухня',
    address: 'пр. Акушинского, 28',
    phone: '+7 8722 00 11 22',
    coordinates: { latitude: 42.997, longitude: 47.485 },
  },
];

export const restaurantById = (id: string) =>
  mockRestaurants.find((r) => r.id === id) ?? mockRestaurants[0];
