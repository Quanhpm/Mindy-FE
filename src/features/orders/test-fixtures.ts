import type { Cart } from '@/features/cart/client';
import type { Order, OrderPage } from './schemas/order.schema';

export const classIds = [
  '123e4567-e89b-42d3-a456-426614174001',
  '123e4567-e89b-42d3-a456-426614174002',
] as const;
export const orderIds = [
  '223e4567-e89b-42d3-a456-426614174001',
  '223e4567-e89b-42d3-a456-426614174002',
] as const;
export const cartFixture: Cart = {
  items: classIds.map((classId, index) => ({
    classId,
    classCode: `CLASS-${index + 1}`,
    className: `Lớp ${index + 1}`,
    courseId: '323e4567-e89b-42d3-a456-426614174001',
    courseTitle: 'Khóa học thật',
    deliveryMode: 'ONLINE',
    startDate: '2026-11-01',
    endDate: '2026-12-01',
    priceSnapshot: 500_000,
    currentPriceAmount: 600_000,
    isPurchasable: true,
    addedAt: '2026-10-02T00:00:00Z',
  })),
  totalAmount: 1_200_000,
};
export const ordersFixture: Order[] = classIds.map((classId, index) => ({
  id: orderIds[index] ?? orderIds[0],
  orderCode: `MD-MENTOR-${index + 1}`,
  paymentType: 'CASH',
  status: 'PENDING',
  totalAmount: 600_000,
  expiresAt: '2026-10-04T00:00:00Z',
  paidAt: null,
  mentorId: '423e4567-e89b-42d3-a456-426614174001',
  createdAt: '2026-10-02T00:00:00Z',
  details: [
    {
      id: classId,
      classId,
      courseTitle: 'Khóa học thật',
      className: `Lớp ${index + 1}`,
      priceAmount: 600_000,
      quantity: 1,
      totalAmount: 600_000,
    },
  ],
}));
export const orderPageFixture = (items: Order[]): OrderPage => ({
  items,
  page: 1,
  pageSize: 100,
  total: items.length,
});
