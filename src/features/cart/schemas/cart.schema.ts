import { z } from 'zod';

export const CART_MAX_ITEMS = 20;
const amountSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const addCartItemSchema = z.strictObject({ classId: z.uuid({ version: 'v4' }) });
export const cartItemSchema = z.object({
  classId: z.uuid(),
  classCode: z.string(),
  className: z.string(),
  courseId: z.uuid(),
  courseTitle: z.string(),
  deliveryMode: z.enum(['ONLINE', 'OFFLINE']),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  priceSnapshot: amountSchema,
  currentPriceAmount: amountSchema,
  isPurchasable: z.boolean(),
  addedAt: z.iso.datetime({ offset: true }),
});
export const cartSchema = z
  .object({
    items: z.array(cartItemSchema).max(CART_MAX_ITEMS),
    totalAmount: amountSchema,
  })
  .refine((cart) => new Set(cart.items.map((item) => item.classId)).size === cart.items.length, {
    path: ['items'],
    error: 'Giỏ hàng chứa lớp bị trùng.',
  });
export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
