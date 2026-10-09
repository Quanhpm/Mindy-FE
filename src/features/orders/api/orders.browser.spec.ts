import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { announceCartChanged } from '@/features/cart/client';
import { ApiError } from '@/shared/lib/http/api-error';
import { orderIds, orderPageFixture, ordersFixture } from '../test-fixtures';
import {
  checkout,
  confirmCashOrder,
  getOrder,
  listMentorCashOrders,
  listMentorClasses,
  listMentorClassStudents,
  listOrders,
  providerOrderCodeSchema,
  resolvePaymentResult,
} from './orders.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
vi.mock('@/features/cart/client', () => ({ announceCartChanged: vi.fn() }));
beforeEach(() => {
  vi.mocked(authenticatedRequest).mockReset();
  vi.mocked(announceCartChanged).mockReset();
});

describe('own orders API contract', () => {
  it('sends only paymentType and preserves the entire multi-order response', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue({ orders: ordersFixture });
    expect(await checkout('CASH')).toEqual(ordersFixture);
    expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith('/me/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ paymentType: 'CASH' }),
      signal: undefined,
    });
    expect(announceCartChanged).toHaveBeenCalledOnce();
  });
  it('classifies malformed or empty checkout responses as unknown, without mutation replay', async () => {
    for (const response of [{ order: ordersFixture[0] }, { orders: [] }]) {
      vi.mocked(authenticatedRequest).mockResolvedValue(response);
      await expect(checkout('PAYOS')).rejects.toMatchObject({
        status: 502,
        code: 'INVALID_RESPONSE',
      });
    }
    expect(authenticatedRequest).toHaveBeenCalledTimes(2);
    expect(announceCartChanged).not.toHaveBeenCalled();
  });
  it('propagates server ownership denial and uses only own-order paths', async () => {
    vi.mocked(authenticatedRequest).mockRejectedValue(
      new ApiError(403, 'ORDER_ACCESS_DENIED', 'Denied'),
    );
    await expect(getOrder(orderIds[0])).rejects.toMatchObject({ code: 'ORDER_ACCESS_DENIED' });
    expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(`/me/orders/${orderIds[0]}`, {
      signal: undefined,
    });
  });
  it('validates list responses and preserves filter/pagination and cancellation', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue(orderPageFixture(ordersFixture));
    const signal = new AbortController().signal;
    expect(await listOrders('page=2&pageSize=10&status=PENDING', signal)).toEqual(
      orderPageFixture(ordersFixture),
    );
    expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(
      '/me/orders?page=2&pageSize=10&status=PENDING',
      { signal },
    );
  });
});

it('keeps payment in detail, accepts null, and keeps list/checkout DTOs separate', async () => {
  const order = ordersFixture[0];
  if (!order) throw new Error('Missing fixture');
  for (const payment of [
    null,
    {
      paymentId: order.id,
      orderId: order.id,
      providerOrderCode: null,
      status: 'CREATING',
      checkoutUrl: null,
      qrCode: null,
      amount: order.totalAmount,
      expiresAt: order.expiresAt,
    },
  ]) {
    vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, payment });
    expect(await getOrder(order.id)).toEqual({ ...order, payment });
  }
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, payment: {} });
  await expect(getOrder(order.id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});

it('maps numeric provider codes, rejects invalid code and mismatched payment without replay', async () => {
  const order = ordersFixture[0];
  if (!order) throw new Error('Missing fixture');
  const payment = {
    paymentId: order.id,
    orderId: order.id,
    providerOrderCode: 123456,
    status: 'PENDING',
    checkoutUrl: null,
    qrCode: null,
    amount: order.totalAmount,
    expiresAt: order.expiresAt,
  };
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, paymentType: 'PAYOS', payment });
  expect((await resolvePaymentResult('123456')).id).toBe(order.id);
  expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(
    '/me/orders/payment-result?orderCode=123456',
    { signal: undefined },
  );
  for (const code of ['0', '-1', 'MD-123', '1e5', '01', '9007199254740992'])
    expect(providerOrderCodeSchema.safeParse(code).success).toBe(false);
  vi.mocked(authenticatedRequest).mockResolvedValue({
    ...order,
    paymentType: 'PAYOS',
    payment: { ...payment, providerOrderCode: 999 },
  });
  await expect(resolvePaymentResult('123456')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
it('mentor list uses pagination and confirmation sends only the received integer amount', async () => {
  const order = ordersFixture[0];
  if (!order) throw new Error('Missing fixture');
  vi.mocked(authenticatedRequest).mockResolvedValue(orderPageFixture([order]));
  await listMentorCashOrders(2);
  expect(authenticatedRequest).toHaveBeenLastCalledWith('/mentor/cash-orders?page=2&pageSize=20', {
    signal: undefined,
  });
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, status: 'PAID' });
  await confirmCashOrder(order.id, order.totalAmount);
  expect(authenticatedRequest).toHaveBeenLastCalledWith(`/mentor/cash-orders/${order.id}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ receivedAmount: order.totalAmount }),
    signal: undefined,
  });
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...order, status: 'PENDING' });
  await expect(confirmCashOrder(order.id, order.totalAmount)).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  });
});

it('reads assigned mentor classes and CASH students with the order id used for confirmation', async () => {
  const classId = orderIds[0];
  const mentorId = '423e4567-e89b-42d3-a456-426614174001';
  const assignedClass = {
    id: classId,
    courseId: '323e4567-e89b-42d3-a456-426614174001',
    code: 'WEB-01',
    name: 'Web buổi tối',
    startDate: '2026-10-12',
    endDate: '2026-11-15',
    deliveryMode: 'ONLINE',
    maxStudents: 20,
    availableSeats: 18,
    mentor: { id: mentorId, displayName: 'Mentor Minh' },
    status: 'OPEN',
  };
  vi.mocked(authenticatedRequest).mockResolvedValue({
    items: [assignedClass],
    page: 2,
    pageSize: 6,
    total: 21,
  });
  expect((await listMentorClasses(2)).items).toEqual([assignedClass]);
  expect(authenticatedRequest).toHaveBeenLastCalledWith('/mentor/classes?page=2&pageSize=6', {
    signal: undefined,
  });

  const rosterStudent = {
    enrollmentId: '523e4567-e89b-42d3-a456-426614174001',
    enrollmentStatus: 'PENDING_PAYMENT',
    studentId: '623e4567-e89b-42d3-a456-426614174001',
    studentName: 'Hào',
    orderId: orderIds[1],
    orderCode: 'MD-CASH-STUDENT',
    orderStatus: 'PENDING',
    paymentType: 'CASH',
    classAmount: 2000,
    orderTotalAmount: 5000,
    orderClassCount: 2,
    expiresAt: '2026-10-10T10:59:44.567Z',
    paidAt: null,
    canConfirmCash: true,
  };
  vi.mocked(authenticatedRequest).mockResolvedValue({
    items: [rosterStudent],
    page: 1,
    pageSize: 20,
    total: 1,
  });
  expect((await listMentorClassStudents(classId, 1, 'PENDING')).items).toEqual([rosterStudent]);
  expect(authenticatedRequest).toHaveBeenLastCalledWith(
    `/mentor/classes/${classId}/students?page=1&pageSize=20&paymentType=CASH&orderStatus=PENDING`,
    { signal: undefined },
  );
});
