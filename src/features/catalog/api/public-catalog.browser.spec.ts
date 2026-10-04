import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/shared/lib/http/browser';
import {
  getPublicClass,
  getPublicCourse,
  listPublicCourseClasses,
  listPublicCourses,
} from './public-catalog.browser';

vi.mock('@/shared/lib/http/browser', () => ({ request: vi.fn() }));
const id = '123e4567-e89b-42d3-a456-426614174000';
const course = {
  id,
  code: 'WEB101',
  title: 'Web',
  description: null,
  priceAmount: 2500000,
  category: { id, name: 'Web', slug: 'web' },
};
const classItem = {
  id,
  courseId: id,
  code: 'WEB101-A',
  name: 'Web A',
  startDate: '2026-11-02',
  endDate: '2026-12-02',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 5,
  mentor: { id, displayName: 'Mentor' },
};
beforeEach(() => vi.mocked(request).mockReset());
describe('public API reads', () => {
  it('uses unauthenticated same-origin course/class endpoints with abort signals', async () => {
    const controller = new AbortController();
    vi.mocked(request)
      .mockResolvedValueOnce({ items: [course], page: 1, pageSize: 12, total: 1 })
      .mockResolvedValueOnce({ ...course, units: [], openClasses: [classItem] })
      .mockResolvedValueOnce({ items: [classItem], page: 2, pageSize: 12, total: 1 })
      .mockResolvedValueOnce({ ...classItem, units: [] });
    await listPublicCourses('page=1&pageSize=12', controller.signal);
    await getPublicCourse(id, controller.signal);
    await listPublicCourseClasses(id, 'page=2&pageSize=12&deliveryMode=ONLINE', controller.signal);
    await getPublicClass(id, controller.signal);
    expect(request).toHaveBeenNthCalledWith(1, '/courses?page=1&pageSize=12', {
      signal: controller.signal,
    });
    expect(request).toHaveBeenNthCalledWith(2, `/courses/${id}`, { signal: controller.signal });
    expect(request).toHaveBeenNthCalledWith(
      3,
      `/courses/${id}/classes?page=2&pageSize=12&deliveryMode=ONLINE`,
      { signal: controller.signal },
    );
    expect(request).toHaveBeenNthCalledWith(4, `/classes/${id}`, { signal: controller.signal });
  });
  it('turns invalid successful data into an invalid-response error and preserves 404', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockRejectedValueOnce({ status: 404, code: 'COURSE_NOT_FOUND' });
    await expect(listPublicCourses('page=1')).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
    await expect(getPublicCourse(id)).rejects.toMatchObject({
      status: 404,
      code: 'COURSE_NOT_FOUND',
    });
  });
});
