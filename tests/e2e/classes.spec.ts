import { expect, type Page, test } from '@playwright/test';

const uuid = (value: number) => `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
const classId = uuid(1);
const unitId = uuid(2);
const courseUnitId = uuid(3);
const courseId = uuid(1101);
const mentorId = uuid(2101);
const user = {
  id: uuid(900),
  email: 'admin@example.com',
  displayName: 'Quản trị viên',
  phone: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-10-02T00:00:00Z',
};
const course = (index: number) => ({
  id: uuid(1000 + index),
  code: `WEB${index}`,
  imgUrl: null,
  title: `Khóa học ${index}`,
  description: null,
  priceAmount: 1000000,
  category: { id: uuid(100), name: 'Lập trình', slug: 'lap-trinh' },
  isActive: true,
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T00:00:00Z',
});
const mentor = (index: number) => ({
  ...user,
  id: uuid(2000 + index),
  role: 'MENTOR',
  email: `mentor${index}@example.com`,
  displayName: `Mentor ${index}`,
});
function initialDetail(unitCount = 2) {
  return {
    id: classId,
    courseId,
    code: 'WEB-2026',
    name: 'Lớp Web tối',
    mentor: { id: mentorId, displayName: 'Mentor 101' },
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    maxStudents: 20,
    availableSeats: 20,
    deliveryMode: 'ONLINE',
    status: 'DRAFT',
    meetingUrl: null as string | null,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    units: Array.from({ length: unitCount }, (_, index) => ({
      id: index === 0 ? unitId : uuid(10 + index),
      courseUnitId: index === 0 ? courseUnitId : uuid(100 + index),
      position: index + 1,
      title: `Học phần ${index + 1}`,
      status: 'LOCKED',
      unlockAt: null,
      sessions: [] as {
        id: string;
        classUnitId: string;
        sessionNumber: number;
        title: string;
        startsAt: string;
        endsAt: string;
        roomName: string | null;
        meetingUrl: string | null;
        status: string;
      }[],
    })),
  };
}
async function mockClasses(
  page: Page,
  options: {
    role?: string;
    unitCount?: number;
    sessionConflict?: boolean;
    longSchedule?: boolean;
  } = {},
) {
  let detail = initialDetail(options.unitCount);
  const firstUnit = detail.units[0];
  if (options.longSchedule && firstUnit) {
    firstUnit.sessions = Array.from({ length: 25 }, (_, index) => ({
      id: uuid(500 + index),
      classUnitId: firstUnit.id,
      sessionNumber: index + 1,
      title: `Buổi học ${index + 1}`,
      startsAt: `2026-11-${String(index + 1).padStart(2, '0')}T19:00:00+07:00`,
      endsAt: `2026-11-${String(index + 1).padStart(2, '0')}T21:00:00+07:00`,
      roomName: null,
      meetingUrl: null,
      status: 'SCHEDULED',
    }));
  }
  const bodies: {
    create?: Record<string, unknown>;
    session?: Record<string, unknown>;
    update?: Record<string, unknown>;
  } = {};
  let reads = 0;
  const queries: string[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me')
      return route.fulfill({ json: { ...user, role: options.role ?? 'ADMIN' } });
    if (path === '/admin/courses' || path === '/admin/users') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      expect(url.searchParams.get('pageSize')).toBe('100');
      if (path === '/admin/courses') expect(url.searchParams.get('isActive')).toBe('true');
      else {
        expect(url.searchParams.get('role')).toBe('MENTOR');
        expect(url.searchParams.get('status')).toBe('ACTIVE');
      }
      return route.fulfill({
        json: {
          items: Array.from({ length: pageNumber === 1 ? 100 : 1 }, (_, index) =>
            path === '/admin/courses'
              ? course(pageNumber === 1 ? index + 1 : 101)
              : mentor(pageNumber === 1 ? index + 1 : 101),
          ),
          page: pageNumber,
          pageSize: 100,
          total: 101,
        },
      });
    }
    if (path === '/admin/classes' && request.method() === 'POST') {
      bodies.create = request.postDataJSON();
      const input = request.postDataJSON();
      detail = {
        ...detail,
        name: input.name,
        code: input.code,
        courseId: input.courseId,
        mentor: { id: input.mentorId, displayName: 'Mentor 101' },
        startDate: input.startDate,
        endDate: input.endDate,
        maxStudents: input.maxStudents,
        availableSeats: input.maxStudents,
        deliveryMode: input.deliveryMode,
        meetingUrl: input.meetingUrl ?? null,
      };
      return route.fulfill({ status: 201, json: detail });
    }
    if (path === '/admin/classes') {
      queries.push(url.search);
      return route.fulfill({ json: { items: [detail], page: 1, pageSize: 20, total: 1 } });
    }
    if (path === `/admin/classes/${classId}` && request.method() === 'GET') {
      reads += 1;
      return route.fulfill({ json: detail });
    }
    if (path === `/admin/classes/${classId}` && request.method() === 'PATCH') {
      bodies.update = request.postDataJSON();
      const input = request.postDataJSON();
      detail = { ...detail, ...input };
      return route.fulfill({ json: detail });
    }
    if (path === `/admin/classes/${classId}/sessions`) {
      bodies.session = request.postDataJSON();
      if (options.sessionConflict) {
        detail = { ...detail, status: 'OPEN' };
        return route.fulfill({
          status: 409,
          json: { code: 'CLASS_MENTOR_SCHEDULE_CONFLICT', message: 'Mentor conflict' },
        });
      }
      const input = request.postDataJSON();
      const unit = detail.units.find((item) => item.id === input.classUnitId);
      if (!unit)
        return route.fulfill({
          status: 422,
          json: { code: 'CLASS_UNIT_NOT_FOUND', message: 'Wrong class unit' },
        });
      unit.sessions.push({
        id: uuid(500),
        classUnitId: input.classUnitId,
        sessionNumber: unit.sessions.length + 1,
        title: input.title,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        roomName: input.roomName ?? null,
        meetingUrl: input.meetingUrl ?? null,
        status: 'SCHEDULED',
      });
      return route.fulfill({ status: 201, json: detail });
    }
    const command = path.split('/').at(-1);
    if (command && ['open', 'start', 'complete', 'cancel'].includes(command)) {
      detail = {
        ...detail,
        status:
          (
            {
              open: 'OPEN',
              start: 'IN_PROGRESS',
              complete: 'COMPLETED',
              cancel: 'CANCELLED',
            } as Record<string, string>
          )[command] ?? detail.status,
      };
      return route.fulfill({ json: detail });
    }
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: path } });
  });
  return { bodies, queries, reads: () => reads };
}
async function fillSession(page: Page) {
  await page.getByLabel('Tiêu đề buổi học').fill('Buổi giới thiệu');
  await page.getByLabel('Bắt đầu buổi học').fill('2026-11-02T19:00');
  await page.getByLabel('Kết thúc buổi học').fill('2026-11-02T21:00');
}

async function mockCreationRecovery(page: Page, rejectionStatus: 409 | 422) {
  let activeMentors = [mentor(101)];
  let rejectCreate = true;
  let rejectMentorRead = false;
  let heldMentorRead: Promise<void> | undefined;
  const creations: Record<string, unknown>[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/auth/me') return route.fulfill({ json: user });
    if (path === '/admin/courses' || path === '/admin/users') {
      if (path === '/admin/users') {
        const held = heldMentorRead;
        heldMentorRead = undefined;
        await held;
        if (rejectMentorRead) {
          rejectMentorRead = false;
          return route.fulfill({
            status: 503,
            json: { code: 'API_UNAVAILABLE', message: 'Unavailable' },
          });
        }
      }
      const items = path === '/admin/courses' ? [course(101)] : activeMentors;
      return route.fulfill({ json: { items, page: 1, pageSize: 100, total: items.length } });
    }
    if (path === '/admin/classes' && request.method() === 'POST') {
      const input = request.postDataJSON();
      creations.push(input);
      if (rejectCreate) {
        rejectCreate = false;
        return route.fulfill({
          status: rejectionStatus,
          json: {
            code:
              rejectionStatus === 422 ? 'CLASS_MENTOR_NOT_ELIGIBLE' : 'CLASS_CODE_ALREADY_EXISTS',
            message: 'Changed while entering draft',
          },
        });
      }
      return route.fulfill({
        status: 201,
        json: {
          ...initialDetail(),
          ...input,
          mentor: { id: input.mentorId, displayName: 'Mentor đang hoạt động' },
        },
      });
    }
    if (path === `/admin/classes/${classId}`) return route.fulfill({ json: initialDetail() });
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: path } });
  });
  return {
    creations,
    setMentors: (indices: number[]) => {
      activeMentors = indices.map(mentor);
    },
    failNextMentorRead: () => {
      rejectMentorRead = true;
    },
    holdNextMentorRead: () => {
      let release = () => {};
      heldMentorRead = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => release();
    },
  };
}

async function fillClassDraft(page: Page) {
  await expect(page.getByLabel('Mentor đang hoạt động')).toContainText('Mentor 101');
  await page.getByLabel('Khóa học đang hoạt động').selectOption(courseId);
  await page.getByLabel('Mentor đang hoạt động').selectOption(mentorId);
  await page.getByLabel('Mã lớp', { exact: true }).fill('WEB-DRAFT');
  await page.getByLabel('Tên lớp', { exact: true }).fill('Lớp giữ nguyên bản nháp');
  await page.getByLabel('Ngày bắt đầu').fill('2026-11-01');
  await page.getByLabel('Ngày kết thúc').fill('2026-11-30');
  await page.getByLabel('Số chỗ tối đa').fill('35');
  await page.getByLabel('Hình thức học').selectOption('OFFLINE');
  await page.getByLabel('Liên kết lớp trực tuyến').fill('https://meet.example.com/draft');
}

async function expectClassDraft(page: Page) {
  await expect(page.getByLabel('Khóa học đang hoạt động')).toHaveValue(courseId);
  await expect(page.getByLabel('Mentor đang hoạt động')).toHaveValue(mentorId);
  await expect(page.getByLabel('Mã lớp', { exact: true })).toHaveValue('WEB-DRAFT');
  await expect(page.getByLabel('Tên lớp', { exact: true })).toHaveValue('Lớp giữ nguyên bản nháp');
  await expect(page.getByLabel('Ngày bắt đầu')).toHaveValue('2026-11-01');
  await expect(page.getByLabel('Ngày kết thúc')).toHaveValue('2026-11-30');
  await expect(page.getByLabel('Số chỗ tối đa')).toHaveValue('35');
  await expect(page.getByLabel('Hình thức học')).toHaveValue('OFFLINE');
  await expect(page.getByLabel('Liên kết lớp trực tuyến')).toHaveValue(
    'https://meet.example.com/draft',
  );
}

test('creation draft survives 409 picker loading, no active mentor, failed refresh and reactivation', async ({
  page,
}) => {
  const state = await mockCreationRecovery(page, 409);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/management/classes/new');
  await fillClassDraft(page);
  state.setMentors([]);
  const release = state.holdNextMentorRead();
  await page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true }).click();
  await expect(page.getByText('Đang tải khóa học và mentor…')).toBeVisible();
  await expectClassDraft(page);
  release();
  await expect(page.getByText('Chưa có mentor đang hoạt động.', { exact: true })).toBeVisible();
  await expectClassDraft(page);
  await expect(page.getByLabel('Mentor đang hoạt động')).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByText('Mentor đã chọn không còn hoạt động. Chọn mentor khác.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true })).toBeDisabled();
  state.setMentors([101]);
  state.failNextMentorRead();
  await page.getByRole('button', { name: 'Tải lại lựa chọn', exact: true }).click();
  await expect(
    page
      .locator('.error-panel[role="alert"]')
      .filter({ hasText: 'Không thể tải danh sách lựa chọn.' }),
  ).toBeVisible();
  await expectClassDraft(page);
  await page.getByRole('button', { name: 'Tải lại lựa chọn', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true })).toBeEnabled();
  await expectClassDraft(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByLabel('Mã lớp', { exact: true }).fill('WEB-RECOVERED');
  await page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true }).click();
  await expect(page).toHaveURL(`/management/classes/${classId}`);
  expect(state.creations).toHaveLength(2);
  expect(state.creations[1]).toEqual({ ...state.creations[0], code: 'WEB-RECOVERED' });
});

test('422 ineligible mentor refreshes choices and manual refresh exposes a replacement without changing draft', async ({
  page,
}) => {
  const state = await mockCreationRecovery(page, 422);
  await page.goto('/management/classes/new');
  await fillClassDraft(page);
  state.setMentors([]);
  await page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true }).click();
  await expect(page.getByText('Chưa có mentor đang hoạt động.', { exact: true })).toBeVisible();
  await expect(
    page
      .locator('.error-panel[role="alert"]')
      .filter({ hasText: 'Mentor phải có tài khoản đang hoạt động.' }),
  ).toBeVisible();
  await expectClassDraft(page);
  state.setMentors([102]);
  await page.getByRole('button', { name: 'Tải lại lựa chọn', exact: true }).click();
  await expect(page.getByLabel('Mentor đang hoạt động')).toContainText('Mentor 102');
  await expectClassDraft(page);
  await expect(
    page.getByText('Mentor đã chọn không còn hoạt động. Chọn mentor khác.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true })).toBeDisabled();
  await page.getByLabel('Mentor đang hoạt động').selectOption(uuid(2102));
  await expect(page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Tạo lớp bản nháp', exact: true }).click();
  await expect(page).toHaveURL(`/management/classes/${classId}`);
  expect(state.creations).toHaveLength(2);
  expect(state.creations[1]).toEqual({ ...state.creations[0], mentorId: uuid(2102) });
});

test('admin creates class from fully paginated pickers, schedules snapshot unit and runs lifecycle', async ({
  page,
}) => {
  const state = await mockClasses(page);
  const staleCourse = uuid(7777);
  const staleMentor = uuid(8888);
  await page.goto(`/management/classes?page=2&courseId=${staleCourse}&mentorId=${staleMentor}`);
  await expect(page.getByLabel('Khóa học', { exact: true })).toHaveValue(staleCourse);
  await expect(page.getByLabel('Mentor', { exact: true })).toHaveValue(staleMentor);
  await expect(page.getByLabel('Khóa học', { exact: true })).toContainText('Khóa học 101');
  await expect(page.getByLabel('Mentor', { exact: true })).toContainText('Mentor 101');
  await page.getByLabel('Khóa học', { exact: true }).selectOption(courseId);
  await expect(page).toHaveURL(new RegExp(`page=1.*courseId=${courseId}`));
  await page.getByLabel('Mentor', { exact: true }).selectOption(mentorId);
  await expect(page).toHaveURL(new RegExp(`mentorId=${mentorId}`));
  await expect.poll(() => new URLSearchParams(state.queries.at(-1)).get('courseId')).toBe(courseId);
  await expect.poll(() => new URLSearchParams(state.queries.at(-1)).get('mentorId')).toBe(mentorId);
  await page.getByLabel('Khóa học', { exact: true }).selectOption('');
  await expect.poll(() => new URL(page.url()).searchParams.has('courseId')).toBe(false);
  await page.getByLabel('Mentor', { exact: true }).selectOption('');
  await expect.poll(() => new URL(page.url()).searchParams.has('mentorId')).toBe(false);
  await page.goto('/management/classes/new');
  await expect(page.getByLabel('Khóa học đang hoạt động')).toContainText('Khóa học 101');
  await expect(page.getByLabel('Mentor đang hoạt động')).toContainText('Mentor 101');
  await page.getByLabel('Khóa học đang hoạt động').selectOption(courseId);
  await page.getByLabel('Mentor đang hoạt động').selectOption(mentorId);
  await page.getByLabel('Mã lớp', { exact: true }).fill('WEB-NEW');
  await page.getByLabel('Tên lớp', { exact: true }).fill('Lớp Web mới');
  await page.getByLabel('Ngày bắt đầu').fill('2026-11-01');
  await page.getByLabel('Ngày kết thúc').fill('2026-11-30');
  await page.getByRole('button', { name: 'Tạo lớp bản nháp' }).click();
  await expect(page).toHaveURL(`/management/classes/${classId}`);
  expect(state.bodies.create).toMatchObject({
    courseId,
    mentorId,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
  });
  expect(state.bodies.create).not.toHaveProperty('status');
  await expect(page.getByRole('button', { name: 'Mở tuyển sinh', exact: true })).toBeDisabled();
  await fillSession(page);
  await page.getByRole('button', { name: 'Thêm buổi học', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã thêm buổi học.');
  expect(state.bodies.session).toEqual({
    classUnitId: unitId,
    title: 'Buổi giới thiệu',
    startsAt: '2026-11-02T19:00:00+07:00',
    endsAt: '2026-11-02T21:00:00+07:00',
  });
  await page.getByRole('button', { name: 'Mở tuyển sinh', exact: true }).click();
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bắt đầu lớp', exact: true })).toBeVisible();
  await page.locator('summary').filter({ hasText: 'Thông tin lớp' }).click();
  await expect(page.getByLabel('Hình thức học', { exact: true })).toBeDisabled();
  await page.getByLabel('Tên lớp', { exact: true }).fill('Lớp Web đã mở');
  await page.getByRole('button', { name: 'Lưu thông tin lớp', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu thông tin lớp.');
  expect(state.bodies.update).toEqual({ name: 'Lớp Web đã mở', mentorId, meetingUrl: null });
  for (const label of ['Bắt đầu lớp', 'Kết thúc lớp']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận', exact: true }).click();
  }
  await expect(page.getByText('Lớp đã kết thúc hoặc đã hủy; thông tin chỉ đọc.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thêm buổi học', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hủy lớp', exact: true })).toHaveCount(0);
});

test('409 mentor calendar conflict refetches lifecycle and preserves entered session fields', async ({
  page,
}) => {
  const state = await mockClasses(page, { sessionConflict: true });
  await page.goto(`/management/classes/${classId}`);
  await fillSession(page);
  await page.getByRole('button', { name: 'Thêm buổi học', exact: true }).click();
  const conflict = page.locator('.error-panel[role="alert"]');
  await expect(conflict).toContainText('Mentor đã có lịch dạy lớp khác');
  await expect(conflict).toContainText('Đã tải lại trạng thái lớp');
  await expect(page.getByLabel('Tiêu đề buổi học')).toHaveValue('Buổi giới thiệu');
  await expect(page.getByRole('button', { name: 'Bắt đầu lớp', exact: true })).toBeVisible();
  expect(state.reads()).toBeGreaterThanOrEqual(2);
});

test('class unit URL, independent rail, mobile drawer and invalid selection', async ({ page }) => {
  await mockClasses(page, { unitCount: 45, longSchedule: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/management/classes/${classId}?unitId=${unitId}`);
  const rail = page.locator('[data-unit-rail]');
  await expect(rail).toBeVisible();
  await page.screenshot({ path: 'docs/implement_phase/screenshots/mock-class-schedule-1440.png' });
  expect(await rail.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  const content = page.locator('[data-unit-content]');
  expect(await content.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(
    true,
  );
  const contentTop = await content.evaluate((element) => element.getBoundingClientRect().top);
  await rail.evaluate((element) => {
    element.scrollTop = 200;
  });
  expect(await content.evaluate((element) => element.getBoundingClientRect().top)).toBe(contentTop);
  await content.evaluate((element) => {
    element.scrollTop = 500;
  });
  expect(await rail.evaluate((element) => element.scrollTop)).toBe(200);
  await page.getByRole('link', { name: /^2\. Học phần 2 / }).click();
  await expect(page).toHaveURL(new RegExp(`unitId=${uuid(11)}`));
  await expect(page.getByRole('heading', { name: 'Học phần 2', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Học phần 2', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Học phần 1', exact: true })).toBeVisible();
  for (const width of [768, 390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    const trigger = page.getByRole('button', { name: 'Học phần và lịch học', exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    if (width === 390)
      await page.screenshot({ path: 'docs/implement_phase/screenshots/mock-class-drawer-390.png' });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.goto(`/management/classes/${classId}?unitId=${uuid(9999)}`);
  await expect(page.getByText('Học phần không thuộc lớp hoặc không còn khả dụng.')).toBeVisible();
});

test('student cannot read class management data', async ({ page }) => {
  const state = await mockClasses(page, { role: 'STUDENT' });
  await page.goto(`/management/classes/${classId}`);
  await expect(page.getByRole('heading', { name: 'Bạn chưa có quyền truy cập' })).toBeVisible();
  await expect(page.getByLabel('Tên lớp', { exact: true })).toHaveCount(0);
  expect(state.reads()).toBe(0);
});
