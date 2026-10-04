import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticatedRequest } from '@/features/auth/client';
import { request } from '@/shared/lib/http/browser';
import {
  activateCourse,
  addCourseUnit,
  createCategory,
  createCourse,
  getAdminCourse,
  listActiveAdminCourses,
  listAllCategories,
  reorderCourseUnits,
  updateCourse,
} from './catalog.browser';

vi.mock('@/features/auth/client', () => ({ authenticatedRequest: vi.fn() }));
vi.mock('@/shared/lib/http/browser', () => ({ request: vi.fn() }));
const id = '123e4567-e89b-42d3-a456-426614174000';
const unitId = '123e4567-e89b-42d3-a456-426614174001';
const category = { id, name: 'Web', slug: 'web', description: null, isActive: true };
const course = {
  id,
  code: 'WEB101',
  title: 'Web',
  description: null,
  priceAmount: 2500000,
  category: { id, name: 'Web', slug: 'web' },
  isActive: false,
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  units: [],
};
beforeEach(() => {
  vi.mocked(authenticatedRequest).mockReset();
  vi.mocked(request).mockReset();
});

describe('catalog adapter contracts', () => {
  it('sends creation only with DTO fields and creates no activation command', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue(course);
    await createCourse({
      categoryId: id,
      code: 'WEB101',
      title: 'Web',
      description: '',
      priceAmount: 2500000,
    });
    expect(authenticatedRequest).toHaveBeenCalledOnce();
    const [path, options] = vi.mocked(authenticatedRequest).mock.calls[0] ?? [];
    expect(path).toBe('/admin/courses');
    expect(options?.method).toBe('POST');
    expect(JSON.parse(String(options?.body))).toEqual({
      categoryId: id,
      code: 'WEB101',
      title: 'Web',
      priceAmount: 2500000,
    });
  });
  it('omits optional slug/description and clears course description with null', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValueOnce(category).mockResolvedValueOnce(course);
    await createCategory({ name: 'Web', slug: '', description: '' });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, '/admin/course-categories', {
      method: 'POST',
      body: JSON.stringify({ name: 'Web' }),
    });
    await updateCourse(id, { categoryId: id, title: 'Web', description: '', priceAmount: 2500000 });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, `/admin/courses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        categoryId: id,
        title: 'Web',
        description: null,
        priceAmount: 2500000,
      }),
    });
  });
  it('uses PUT with every unit and a separate bodyless activation command', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue(course);
    await reorderCourseUnits(id, [id, unitId], [unitId, id]);
    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, `/admin/courses/${id}/units/order`, {
      method: 'PUT',
      body: JSON.stringify({ unitIds: [unitId, id] }),
    });
    await activateCourse(id);
    expect(authenticatedRequest).toHaveBeenNthCalledWith(2, `/admin/courses/${id}/activate`, {
      method: 'POST',
    });
    await expect(reorderCourseUnits(id, [id, unitId], [id])).rejects.toThrow();
    expect(authenticatedRequest).toHaveBeenCalledTimes(2);
  });
  it('appends units with decimal requirement and no invented learning fields', async () => {
    const unit = {
      id: unitId,
      unitNumber: 1,
      title: 'HTML',
      description: null,
      requiredScorePercent: 80.25,
    };
    vi.mocked(authenticatedRequest).mockResolvedValue(unit);
    await expect(
      addCourseUnit(id, { title: 'HTML', description: '', requiredScorePercent: 80.25 }),
    ).resolves.toEqual(unit);
    expect(authenticatedRequest).toHaveBeenCalledWith(`/admin/courses/${id}/units`, {
      method: 'POST',
      body: JSON.stringify({ title: 'HTML', requiredScorePercent: 80.25 }),
    });
  });
  it('rejects malformed successful responses at the API boundary', async () => {
    vi.mocked(authenticatedRequest).mockResolvedValue({ ...course, priceAmount: '2500000' });
    await expect(getAdminCourse(id)).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });
  it('reads every category and active admin course page for pickers', async () => {
    vi.mocked(request)
      .mockResolvedValueOnce({ items: [category], page: 1, pageSize: 100, total: 101 })
      .mockResolvedValueOnce({
        items: [{ ...category, id: unitId }],
        page: 2,
        pageSize: 100,
        total: 101,
      });
    expect(await listAllCategories()).toHaveLength(2);
    expect(request).toHaveBeenNthCalledWith(2, '/course-categories?page=2&pageSize=100', {
      signal: undefined,
    });
    vi.mocked(authenticatedRequest)
      .mockResolvedValueOnce({
        items: [{ ...course, isActive: true }],
        page: 1,
        pageSize: 100,
        total: 101,
      })
      .mockResolvedValueOnce({
        items: [{ ...course, id: unitId, isActive: true }],
        page: 2,
        pageSize: 100,
        total: 101,
      });
    expect(await listActiveAdminCourses()).toHaveLength(2);
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      '/admin/courses?page=2&pageSize=100&isActive=true',
      { signal: undefined },
    );
  });
  it('preserves backend conflicts for refetch recovery', async () => {
    const failure = { status: 409, code: 'COURSE_UNIT_ORDER_MISMATCH' };
    vi.mocked(authenticatedRequest).mockRejectedValue(failure);
    await expect(reorderCourseUnits(id, [id], [id])).rejects.toBe(failure);
    expect(authenticatedRequest).toHaveBeenCalledOnce();
  });
});
