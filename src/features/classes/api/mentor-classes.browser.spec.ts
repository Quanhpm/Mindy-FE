import { afterEach, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { isAllowedEndpoint } from '@/shared/lib/http/proxy-policy';
import {
  listManagerClasses,
  listMentorClasses,
  listMentorStudents,
} from './mentor-classes.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
afterEach(() => vi.mocked(authenticatedRequest).mockReset());
const id = '123e4567-e89b-42d3-a456-426614174000';
const page = { page: 1, pageSize: 20, total: 0, items: [] };
const classData = {
  id,
  courseId: id,
  code: 'WEB-A',
  name: 'Lớp',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 5,
  mentor: { id, displayName: 'Giảng viên' },
  status: 'OPEN',
};
it('uses only supported query fields and forwards cancellation', async () => {
  vi.mocked(authenticatedRequest).mockResolvedValue(page);
  const signal = new AbortController().signal;
  await listMentorClasses('page=2&status=OPEN&mentorId=someone&pageSize=100', id, signal);
  expect(authenticatedRequest).toHaveBeenLastCalledWith(
    '/mentor/classes?pageSize=20&page=2&status=OPEN',
    { signal },
  );
  await listMentorStudents(
    id,
    'page=-2&paymentType=CASH&orderStatus=PENDING&studentId=someone',
    signal,
  );
  expect(authenticatedRequest).toHaveBeenLastCalledWith(
    `/mentor/classes/${id}/students?pageSize=20&page=1&paymentType=CASH&orderStatus=PENDING`,
    { signal },
  );
});
it('rejects foreign mentor data and malformed responses', async () => {
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...page, items: [classData] });
  await expect(listMentorClasses('', '123e4567-e89b-42d3-a456-426614174001')).rejects.toMatchObject(
    { code: 'INVALID_RESPONSE' },
  );
  vi.mocked(authenticatedRequest).mockResolvedValue({
    ...page,
    items: [{ studentName: 'Incomplete' }],
  });
  await expect(listMentorStudents(id, '')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
});
it('validates class IDs before requests and propagates denied ownership', async () => {
  await expect(listMentorStudents('../admin/users', '')).rejects.toThrow();
  expect(authenticatedRequest).not.toHaveBeenCalled();
  vi.mocked(authenticatedRequest).mockRejectedValue({ status: 403, code: 'CLASS_ACCESS_DENIED' });
  await expect(listMentorStudents(id, '')).rejects.toMatchObject({ status: 403 });
  expect(authenticatedRequest).toHaveBeenCalledOnce();
});
it('preserves the whole order amount separately from the class amount', async () => {
  const row = {
    enrollmentId: id,
    studentId: id,
    studentName: 'Học viên',
    enrollmentStatus: 'PENDING_PAYMENT',
    orderId: id,
    orderCode: 'MD-TEST',
    orderStatus: 'PENDING',
    paymentType: 'CASH',
    classAmount: 100000,
    orderTotalAmount: 300000,
    orderClassCount: 2,
    expiresAt: '2099-11-01T00:00:00Z',
    paidAt: null,
    canConfirmCash: true,
  };
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...page, items: [row] });
  expect((await listMentorStudents(id, '')).items[0]).toEqual(row);
});
it('allows only GET and UUID roster paths in the adapter', () => {
  expect(isAllowedEndpoint('GET', 'mentor/classes')).toBe(true);
  expect(isAllowedEndpoint('GET', `mentor/classes/${id}/students`)).toBe(true);
  expect(isAllowedEndpoint('POST', 'mentor/classes')).toBe(false);
  expect(isAllowedEndpoint('GET', 'mentor/classes/not-a-uuid/students')).toBe(false);
  expect(isAllowedEndpoint('PATCH', `mentor/classes/${id}/students`)).toBe(false);
});

it('manager class list accepts classes assigned to other mentors', async () => {
  vi.mocked(authenticatedRequest).mockResolvedValue({ ...page, items: [classData] });
  expect((await listManagerClasses('status=OPEN')).items).toEqual([classData]);
  expect(authenticatedRequest).toHaveBeenCalledWith(
    '/mentor/classes?pageSize=20&page=1&status=OPEN',
    { signal: undefined },
  );
});
