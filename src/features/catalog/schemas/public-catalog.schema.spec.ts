import { describe, expect, it } from 'vitest';
import {
  browseFilterFormSchema,
  browseQuery,
  formatCourseDate,
  isBrowseRangeValid,
  publicBrowseFiltersSchema,
  publicClassDetailSchema,
  publicCourseDetailSchema,
} from './public-catalog.schema';

const id = '123e4567-e89b-42d3-a456-426614174000';
const session = {
  id,
  sessionNumber: 1,
  title: 'HTML',
  startsAt: '2026-11-02T19:00:00+07:00',
  endsAt: '2026-11-02T21:00:00+07:00',
  roomName: null,
  status: 'SCHEDULED',
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
  mentor: { id, displayName: null },
  units: [{ id, position: 1, title: 'HTML', sessions: [session] }],
};

describe('public catalog boundaries', () => {
  it('never exposes private meeting URLs or unit lifecycle state', () => {
    const parsed = publicClassDetailSchema.parse({
      ...classItem,
      meetingUrl: 'https://private.example',
      status: 'OPEN',
      priceAmount: 1,
      units: [
        {
          ...classItem.units[0],
          courseUnitId: id,
          unlockAt: null,
          status: 'OPEN',
          sessions: [{ ...session, meetingUrl: 'https://private.example', classUnitId: id }],
        },
      ],
    });
    expect(parsed).toEqual(classItem);
    expect('priceAmount' in parsed).toBe(false);
  });
  it('reads course price/units/classes separately and rejects fake price types or missing arrays', () => {
    const course = {
      id,
      code: 'WEB101',
      title: 'Web',
      description: null,
      priceAmount: 2500000,
      category: { id, name: 'Web', slug: 'web' },
      units: [],
      openClasses: [],
    };
    expect(publicCourseDetailSchema.parse({ ...course, isActive: true })).toEqual(course);
    expect(publicCourseDetailSchema.safeParse({ ...course, priceAmount: '2500000' }).success).toBe(
      false,
    );
    expect(publicCourseDetailSchema.safeParse({ ...course, openClasses: undefined }).success).toBe(
      false,
    );
  });
  it('requires date-only calendar values and timezone-bearing session instants', () => {
    expect(
      publicClassDetailSchema.safeParse({ ...classItem, startDate: '2026-02-30' }).success,
    ).toBe(false);
    expect(
      publicClassDetailSchema.safeParse({
        ...classItem,
        units: [
          { ...classItem.units[0], sessions: [{ ...session, startsAt: '2026-11-02T19:00:00' }] },
        ],
      }).success,
    ).toBe(false);
    expect(formatCourseDate('2027-01-01')).toBe('01/01/2027');
  });
});

describe('public browse query', () => {
  it('only forwards real DTO filters and excludes category on course classes', () => {
    const filters = publicBrowseFiltersSchema.parse({
      page: '2',
      pageSize: '20',
      categoryId: id,
      deliveryMode: 'ONLINE',
      startsFrom: '2026-11-01',
      startsTo: '2026-12-01',
      search: 'fake',
      level: 'beginner',
      sort: 'price',
    });
    const courseQuery = new URLSearchParams(browseQuery(filters, true));
    expect([...courseQuery.keys()]).toEqual([
      'page',
      'pageSize',
      'categoryId',
      'deliveryMode',
      'startsFrom',
      'startsTo',
    ]);
    expect(new URLSearchParams(browseQuery(filters, false)).has('categoryId')).toBe(false);
    expect(courseQuery.get('startsFrom')).toBe('2026-11-01');
  });
  it('sanitizes malformed URL filters and reports inverted date ranges', () => {
    expect(
      publicBrowseFiltersSchema.parse({
        page: '-2',
        pageSize: '101',
        categoryId: 'bad',
        deliveryMode: 'LIVE',
        startsFrom: 'invalid',
      }),
    ).toEqual({
      page: 1,
      pageSize: 12,
      categoryId: undefined,
      deliveryMode: undefined,
      startsFrom: undefined,
    });
    expect(
      isBrowseRangeValid(
        publicBrowseFiltersSchema.parse({ startsFrom: '2026-12-01', startsTo: '2026-11-01' }),
      ),
    ).toBe(false);
    expect(
      browseFilterFormSchema.safeParse({
        categoryId: '',
        deliveryMode: '',
        startsFrom: '2026-12-01',
        startsTo: '2026-11-01',
      }).success,
    ).toBe(false);
  });
});
