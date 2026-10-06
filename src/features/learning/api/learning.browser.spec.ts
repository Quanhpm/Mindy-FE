import { afterEach, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { getStudentClass } from './learning.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
afterEach(() => vi.mocked(authenticatedRequest).mockReset());
const id = '123e4567-e89b-42d3-a456-426614174000';
const data = {
  id,
  courseId: id,
  code: 'WEB-A',
  name: 'Lớp',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 5,
  mentor: { id, displayName: null },
  meetingUrl: 'https://meet.example.com/private',
  units: [
    {
      id,
      position: 1,
      title: 'Unit',
      sessions: [
        {
          id,
          sessionNumber: 1,
          title: 'Buổi',
          startsAt: '2026-11-01T00:00:00Z',
          endsAt: '2026-11-01T01:00:00Z',
          roomName: null,
          status: 'SCHEDULED',
          meetingUrl: 'https://meet.example.com/session',
        },
      ],
    },
  ],
};
it('reads only private class endpoint and preserves authorized meeting links', async () => {
  vi.mocked(authenticatedRequest).mockResolvedValue(data);
  const signal = new AbortController().signal;
  expect(await getStudentClass(id, signal)).toEqual(data);
  expect(authenticatedRequest).toHaveBeenCalledExactlyOnceWith(`/me/classes/${id}`, { signal });
});
it('propagates pending/foreign/cancelled access denial without a public fallback', async () => {
  vi.mocked(authenticatedRequest).mockRejectedValue({ status: 403, code: 'CLASS_ACCESS_DENIED' });
  await expect(getStudentClass(id)).rejects.toMatchObject({ code: 'CLASS_ACCESS_DENIED' });
  expect(authenticatedRequest).toHaveBeenCalledOnce();
});
it('rejects mismatched class and unsafe private links', async () => {
  for (const value of [
    { ...data, id: '123e4567-e89b-42d3-a456-426614174001' },
    { ...data, meetingUrl: 'javascript:alert(1)' },
  ]) {
    vi.mocked(authenticatedRequest).mockResolvedValue(value);
    await expect(getStudentClass(id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  }
});
