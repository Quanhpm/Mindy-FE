import { authenticatedRequest } from '@/features/auth/client';
import { ApiError } from '@/shared/lib/http/api-error';
import { addCartItemSchema, type Cart, cartSchema } from '../schemas/cart.schema';

function validatedCart(value: unknown): Cart {
  const result = cartSchema.safeParse(value);
  if (!result.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu giỏ hàng chưa đúng định dạng.');
  return result.data;
}
// No browser cache or owner state: every consumer reads the current authenticated cart.
export async function getCart(signal?: AbortSignal): Promise<Cart> {
  return validatedCart(await authenticatedRequest('/me/cart', { signal }));
}
export async function addCartItem(classId: string, signal?: AbortSignal): Promise<Cart> {
  const payload = addCartItemSchema.parse({ classId });
  return validatedCart(
    await authenticatedRequest('/me/cart/items', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    }),
  );
}
export async function removeCartItem(classId: string, signal?: AbortSignal): Promise<void> {
  const payload = addCartItemSchema.parse({ classId });
  await authenticatedRequest(`/me/cart/items/${encodeURIComponent(payload.classId)}`, {
    method: 'DELETE',
    signal,
  });
}
export function announceCartChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('mindy:cart-changed'));
}
