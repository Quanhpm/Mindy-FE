import { describe, expect, it } from 'vitest';
import {
  createClassSchema,
  type ManagementClassDetail,
  managementClassDetailSchema,
  publicClassDetailSchema,
} from '../schemas/class.schema';
import {
  classCommands,
  formatCalendarDate,
  hasReadySchedule,
  scheduleSessionPayload,
  updateClassPayload,
} from './class-rules';

const classId = '00000000-0000-4000-8000-000000000001';
const unitId = '00000000-0000-4000-8000-000000000002';
const courseUnitId = '00000000-0000-4000-8000-000000000003';
const sessionId = '00000000-0000-4000-8000-000000000004';
const fields = {
  courseId: classId,
  code: 'WEB-01',
  name: 'Lớp Web',
  mentorId: classId,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  maxStudents: 20,
  deliveryMode: 'ONLINE' as const,
  meetingUrl: '',
};
const session = {
  id: sessionId,
  classUnitId: unitId,
  sessionNumber: 1,
  title: 'Buổi 1',
  startsAt: '2026-11-02T19:00:00+07:00',
  endsAt: '2026-11-02T21:00:00+07:00',
  roomName: null,
  meetingUrl: 'https://meet.example.com/one',
  status: 'SCHEDULED' as const,
};
const unit: ManagementClassDetail['units'][number] = {
  id: unitId,
  courseUnitId,
  position: 1,
  title: 'Web',
  status: 'LOCKED',
  unlockAt: null,
  sessions: [session],
};
const detail: ManagementClassDetail = {
  id: classId,
  courseId: classId,
  code: fields.code,
  name: fields.name,
  mentor: { id: classId, displayName: 'Mentor' },
  startDate: fields.startDate,
  endDate: fields.endDate,
  maxStudents: 20,
  availableSeats: 19,
  deliveryMode: 'ONLINE',
  status: 'DRAFT',
  meetingUrl: 'https://meet.example.com/class',
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
  units: [unit],
};
const sessionFields = {
  title: 'Buổi mới',
  startsAt: '2026-11-03T19:00',
  endsAt: '2026-11-03T21:00',
  roomName: '',
  meetingUrl: '',
};

describe('class management contracts and lifecycle', () => {
  it('validates management details and strips private data from the public contract', () => {
    expect(managementClassDetailSchema.parse(detail).units[0]?.sessions[0]?.classUnitId).toBe(
      unitId,
    );
    const publicDetail = publicClassDetailSchema.parse(detail);
    expect(publicDetail).not.toHaveProperty('meetingUrl');
    expect(publicDetail).not.toHaveProperty('status');
    expect(publicDetail.units[0]).not.toHaveProperty('courseUnitId');
    expect(publicDetail.units[0]?.sessions[0]).not.toHaveProperty('meetingUrl');
    expect(managementClassDetailSchema.safeParse({ ...detail, status: 'APPROVED' }).success).toBe(
      false,
    );
  });
  it('allows exact lifecycle commands, with terminal classes read only', () => {
    expect(classCommands('DRAFT')).toEqual(['open', 'cancel']);
    expect(classCommands('OPEN')).toEqual(['start', 'cancel']);
    expect(classCommands('IN_PROGRESS')).toEqual(['complete', 'cancel']);
    expect(classCommands('COMPLETED')).toEqual([]);
    expect(classCommands('CANCELLED')).toEqual([]);
    expect(() => updateClassPayload('COMPLETED', fields)).toThrow();
  });
  it('whitelists update fields by lifecycle and clears meeting URL with null', () => {
    expect(updateClassPayload('OPEN', fields)).toEqual({
      name: 'Lớp Web',
      mentorId: classId,
      meetingUrl: null,
    });
    expect(updateClassPayload('DRAFT', fields)).toMatchObject({
      startDate: fields.startDate,
      maxStudents: 20,
    });
    expect(updateClassPayload('DRAFT', fields)).not.toHaveProperty('courseId');
    expect(updateClassPayload('DRAFT', fields)).not.toHaveProperty('code');
    expect(updateClassPayload('DRAFT', fields)).not.toHaveProperty('status');
  });
  it('rejects invalid period, invalid dates, capacity and unsupported code', () => {
    expect(createClassSchema.safeParse({ ...fields, endDate: '2026-10-30' }).success).toBe(false);
    expect(createClassSchema.safeParse({ ...fields, startDate: '2026-02-30' }).success).toBe(false);
    expect(createClassSchema.safeParse({ ...fields, maxStudents: 1001 }).success).toBe(false);
    expect(createClassSchema.safeParse({ ...fields, code: 'WEB 01' }).success).toBe(false);
    expect(formatCalendarDate('2026-11-01')).toBe('01/11/2026');
  });
});

describe('center calendar and scheduling', () => {
  it('uses a class unit snapshot ID and explicit Vietnam offset, omitting empty optional fields', () => {
    expect(scheduleSessionPayload(sessionFields, unitId, detail)).toEqual({
      classUnitId: unitId,
      title: 'Buổi mới',
      startsAt: '2026-11-03T19:00:00+07:00',
      endsAt: '2026-11-03T21:00:00+07:00',
    });
    expect(() => scheduleSessionPayload(sessionFields, courseUnitId, detail)).toThrow(
      'Học phần này không thuộc lớp.',
    );
  });
  it('rejects overlaps across units but permits adjacent sessions', () => {
    expect(() =>
      scheduleSessionPayload(
        { ...sessionFields, startsAt: '2026-11-02T20:00', endsAt: '2026-11-02T22:00' },
        unitId,
        detail,
      ),
    ).toThrow('trùng giờ');
    expect(
      scheduleSessionPayload(
        { ...sessionFields, startsAt: '2026-11-02T21:00', endsAt: '2026-11-02T22:00' },
        unitId,
        detail,
      ).startsAt,
    ).toContain('21:00');
  });
  it('rejects periods outside class dates and invalid instants', () => {
    expect(() =>
      scheduleSessionPayload(
        { ...sessionFields, startsAt: '2026-10-31T23:00', endsAt: '2026-11-01T00:00' },
        unitId,
        detail,
      ),
    ).toThrow('thời gian của lớp');
    expect(() =>
      scheduleSessionPayload({ ...sessionFields, startsAt: '2026-11-03T22:00' }, unitId, detail),
    ).toThrow();
    expect(() =>
      scheduleSessionPayload(
        { ...sessionFields, startsAt: '2026-02-30T19:00', endsAt: '2026-02-30T21:00' },
        unitId,
        detail,
      ),
    ).toThrow();
  });
  it('checks readiness on center dates, even when UTC falls on the previous day', () => {
    const midnight = {
      ...session,
      startsAt: '2026-10-31T17:15:00Z',
      endsAt: '2026-10-31T18:00:00Z',
    };
    expect(hasReadySchedule({ ...detail, units: [{ ...unit, sessions: [midnight] }] })).toBe(true);
    expect(hasReadySchedule({ ...detail, units: [] })).toBe(false);
    expect(hasReadySchedule({ ...detail, units: [{ ...unit, sessions: [] }] })).toBe(false);
    expect(
      hasReadySchedule({
        ...detail,
        units: [
          {
            ...unit,
            sessions: [
              {
                ...session,
                startsAt: '2026-12-01T19:00:00+07:00',
                endsAt: '2026-12-01T21:00:00+07:00',
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });
});
