import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/lib/http/api-error';
import { cartErrorMessage, formatCartDate } from '../domain/cart-display';
import { addCartItemSchema, CART_MAX_ITEMS, cartSchema } from './cart.schema';

const id = '00000000-0000-4000-8000-000000000001';
const item = {
  classId: id,
  classCode: 'WEB-01',
  className: 'Lớp Web',
  courseId: id,
  courseTitle: 'Web',
  deliveryMode: 'ONLINE',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  priceSnapshot: 1500000,
  currentPriceAmount: 1800000,
  isPurchasable: true,
  addedAt: '2026-10-02T12:00:00+07:00',
};

describe('cart contract', () => {
  it('accepts snapshot/current price and the server total without deriving a client total', () => {
    const cart = cartSchema.parse({ items: [item], totalAmount: 1800000 });
    expect(cart.totalAmount).toBe(1800000);
    expect(cart.items[0]?.priceSnapshot).toBe(1500000);
    expect(cart.items[0]?.currentPriceAmount).toBe(1800000);
    expect(cartSchema.parse({ items: [], totalAmount: 0 }).items).toEqual([]);
  });
  it('limits cart to twenty distinct class IDs and rejects malformed prices/dates', () => {
    expect(CART_MAX_ITEMS).toBe(20);
    expect(cartSchema.safeParse({ items: [item, item], totalAmount: 3600000 }).success).toBe(false);
    expect(
      cartSchema.safeParse({
        items: Array.from({ length: 21 }, (_, index) => ({
          ...item,
          classId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        })),
        totalAmount: 0,
      }).success,
    ).toBe(false);
    expect(
      cartSchema.safeParse({ items: [{ ...item, currentPriceAmount: -1 }], totalAmount: 0 })
        .success,
    ).toBe(false);
    expect(
      cartSchema.safeParse({ items: [{ ...item, startDate: '2026-02-30' }], totalAmount: 0 })
        .success,
    ).toBe(false);
    expect(
      cartSchema.safeParse({ items: [{ ...item, addedAt: '2026-10-02T12:00:00' }], totalAmount: 0 })
        .success,
    ).toBe(false);
    expect(formatCartDate('2026-11-01')).toBe('01/11/2026');
  });
  it('accepts only classId in add payload, without quantity, owner or price', () => {
    expect(addCartItemSchema.parse({ classId: id })).toEqual({ classId: id });
    for (const extra of [{ quantity: 1 }, { priceAmount: 1 }, { studentId: id }])
      expect(addCartItemSchema.safeParse({ classId: id, ...extra }).success).toBe(false);
    expect(addCartItemSchema.safeParse({ classId: 'invalid' }).success).toBe(false);
  });
  it('uses actual availability without inferring capacity or enrollment and localizes backend conflicts', () => {
    expect(
      cartSchema.parse({ items: [{ ...item, isPurchasable: false }], totalAmount: 1800000 })
        .items[0]?.isPurchasable,
    ).toBe(false);
    expect(cartErrorMessage(new ApiError(409, 'CLASS_FULL', 'full'))).toContain('hết chỗ');
    expect(cartErrorMessage(new ApiError(409, 'CLASS_ALREADY_ENROLLED', 'duplicate'))).toContain(
      'giữ chỗ',
    );
    expect(cartErrorMessage(new ApiError(409, 'CART_LIMIT_EXCEEDED', 'limit'))).toContain('20 lớp');
  });
});
