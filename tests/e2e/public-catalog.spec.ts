import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

const categoryId = '123e4567-e89b-42d3-a456-426614174100';
const courseId = '123e4567-e89b-42d3-a456-426614174200';
const secondCourseId = '123e4567-e89b-42d3-a456-426614174201';
const classId = '123e4567-e89b-42d3-a456-426614174300';
const secondClassId = '123e4567-e89b-42d3-a456-426614174301';
const unitId = (index: number) => `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`;

async function mockPublicCatalog(
  page: Page,
  options: { role?: string; full?: boolean; unavailableCourse?: boolean } = {},
) {
  let signedIn = Boolean(options.role);
  let role = options.role ?? 'STUDENT';
  let added = false;
  const reads: string[] = [];
  const adds: unknown[] = [];
  const identity = () => ({
    id: categoryId,
    email: 'student@example.com',
    displayName: 'Hải An',
    phone: null,
    role,
    status: 'ACTIVE',
    lastLoginAt: null,
    createdAt: '2026-10-02T00:00:00Z',
  });
  const category = {
    id: categoryId,
    name: 'Lập trình',
    slug: 'lap-trinh',
    description: null,
    isActive: true,
  };
  const course = {
    id: courseId,
    code: 'WEB101',
    imgUrl: null,
    title: 'Lập trình Web',
    description: 'Học cách xây dựng giao diện web từ nền tảng.',
    priceAmount: 2500000,
    category: { id: categoryId, name: 'Lập trình', slug: 'lap-trinh' },
  };
  const classItem = {
    id: classId,
    courseId,
    code: 'WEB101-A',
    name: 'Lớp Web buổi tối',
    startDate: '2026-11-02',
    endDate: '2026-12-02',
    deliveryMode: 'ONLINE',
    maxStudents: 20,
    availableSeats: options.full ? 0 : 5,
    mentor: { id: categoryId, displayName: 'Mentor Minh Anh' },
  };
  const units = Array.from({ length: 40 }, (_, index) => ({
    id: unitId(index + 1),
    unitNumber: index + 1,
    title: `Bài ${index + 1}`,
    description:
      index === 1
        ? null
        : Array.from({ length: 80 }, (_, line) => `Nội dung đề cương dòng ${line + 1}`).join('\n'),
    requiredScorePercent: 80,
  }));
  const cart = () => ({
    items: added
      ? [
          {
            classId,
            classCode: 'WEB101-A',
            className: classItem.name,
            courseId,
            courseTitle: course.title,
            deliveryMode: 'ONLINE',
            startDate: classItem.startDate,
            endDate: classItem.endDate,
            priceSnapshot: 2500000,
            currentPriceAmount: 2500000,
            isPurchasable: true,
            addedAt: '2026-10-02T00:00:00Z',
          },
        ]
      : [],
    totalAmount: added ? 2500000 : 0,
  });
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    if (request.method() === 'GET') reads.push(`${path}${url.search}`);
    if (path === '/auth/login') {
      signedIn = true;
      role = 'STUDENT';
      return route.fulfill({
        json: { user: identity(), accessTokenExpiresAt: '2026-10-02T23:00:00Z' },
      });
    }
    if (path === '/auth/me')
      return signedIn
        ? route.fulfill({ json: identity() })
        : route.fulfill({
            status: 401,
            json: { code: 'AUTHENTICATION_REQUIRED', message: 'Unauthorized' },
          });
    if (path === '/auth/refresh')
      return route.fulfill({
        status: 401,
        json: { code: 'INVALID_REFRESH_TOKEN', message: 'Unauthorized' },
      });
    if (path === '/course-categories')
      return route.fulfill({
        json: {
          items: [category],
          page: 1,
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
          total: 1,
        },
      });
    if (path === '/courses') {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      return route.fulfill({
        json: {
          items:
            pageNumber === 2
              ? [{ ...course, id: secondCourseId, code: 'WEB102', title: 'Web nâng cao' }]
              : [course],
          total: 25,
          page: pageNumber,
          pageSize: Number(url.searchParams.get('pageSize') ?? 12),
        },
      });
    }
    if (path === `/courses/${courseId}`)
      return options.unavailableCourse
        ? route.fulfill({ status: 404, json: { code: 'COURSE_NOT_FOUND', message: 'Not found' } })
        : route.fulfill({ json: { ...course, units, openClasses: [classItem] } });
    if (path === `/courses/${courseId}/classes`) {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const items =
        url.searchParams.get('deliveryMode') === 'OFFLINE'
          ? []
          : [
              pageNumber === 2
                ? { ...classItem, id: secondClassId, code: 'WEB101-B', name: 'Lớp Web cuối tuần' }
                : classItem,
            ];
      return route.fulfill({
        json: {
          items,
          total: items.length ? 21 : 0,
          page: pageNumber,
          pageSize: Number(url.searchParams.get('pageSize') ?? 12),
        },
      });
    }
    if (path === `/classes/${classId}`)
      return route.fulfill({
        json: {
          ...classItem,
          priceAmount: 1,
          status: 'OPEN',
          meetingUrl: 'https://private-meeting.example/class',
          units: [
            {
              id: unitId(101),
              position: 1,
              title: 'HTML và CSS',
              status: 'OPEN',
              unlockAt: null,
              courseUnitId: unitId(1),
              sessions: [
                {
                  id: unitId(201),
                  sessionNumber: 1,
                  title: 'Khởi động HTML',
                  startsAt: '2026-11-02T19:00:00+07:00',
                  endsAt: '2026-11-02T21:00:00+07:00',
                  roomName: null,
                  status: 'SCHEDULED',
                  meetingUrl: 'https://private-meeting.example/session',
                  classUnitId: unitId(101),
                },
              ],
            },
            { id: unitId(102), position: 2, title: 'Thực hành CSS', sessions: [] },
          ],
        },
      });
    if (path === '/me/cart') return route.fulfill({ json: cart() });
    if (path === '/me/cart/items') {
      adds.push(request.postDataJSON());
      added = true;
      return route.fulfill({ status: 201, json: cart() });
    }
    return route.fulfill({ status: 404, json: { code: 'COURSE_NOT_FOUND', message: 'Not found' } });
  });
  return { reads, adds };
}

async function screenshot(page: Page, name: string) {
  const folder = resolve('docs/implement_phase/screenshots');
  await mkdir(folder, { recursive: true });
  await page.screenshot({ path: resolve(folder, name), fullPage: true });
}

test('public browse forwards real filters and paginates courses and course classes', async ({
  page,
}) => {
  const { reads } = await mockPublicCatalog(page);
  await page.goto('/courses?search=ignored&level=ignored&sort=price');
  await expect(page.getByRole('heading', { name: 'Lập trình Web', exact: true })).toBeVisible();
  await page.getByLabel('Danh mục', { exact: true }).selectOption(categoryId);
  await page.getByLabel('Hình thức học', { exact: true }).selectOption('ONLINE');
  await page.getByLabel('Ngày bắt đầu lớp từ').fill('2026-11-01');
  await page.getByLabel('Ngày bắt đầu lớp đến').fill('2026-12-01');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  await expect(page).toHaveURL(
    /categoryId=.*deliveryMode=ONLINE.*startsFrom=2026-11-01.*startsTo=2026-12-01/,
  );
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Web nâng cao', exact: true })).toBeVisible();
  expect(
    reads
      .filter((path) => path.startsWith('/courses?'))
      .every((path) => {
        const keys = [...new URL(path, 'http://mock').searchParams.keys()];
        return keys.every((key) =>
          ['page', 'pageSize', 'categoryId', 'deliveryMode', 'startsFrom', 'startsTo'].includes(
            key,
          ),
        );
      }),
  ).toBe(true);
  await page.goto(`/courses/${courseId}?categoryId=${categoryId}`);
  await expect(page.getByRole('heading', { name: 'Đề cương khóa học', exact: true })).toBeVisible();
  await page.getByLabel('Hình thức học', { exact: true }).selectOption('OFFLINE');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  await expect(page.getByText('Chưa có lớp đang mở phù hợp.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bộ lọc', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Lớp Web buổi tối', exact: true, level: 3 }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lớp Web cuối tuần', exact: true })).toBeVisible();
  expect(
    reads
      .filter((path) => path.startsWith(`/courses/${courseId}/classes?`))
      .every((path) => !new URL(path, 'http://mock').searchParams.has('categoryId')),
  ).toBe(true);
});

test('public unit keeps independent scroll, history, invalid/empty descriptions and mobile keyboard', async ({
  page,
}) => {
  await mockPublicCatalog(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/courses/${courseId}/units/${unitId(1)}`);
  await expect(page.getByRole('heading', { name: 'Bài 1', exact: true })).toBeVisible();
  const rail = page.locator('[data-unit-rail]:visible');
  const content = page.locator('[data-unit-content]');
  const railWidth = await rail.evaluate((element) => element.getBoundingClientRect().width);
  expect(railWidth).toBeGreaterThanOrEqual(280);
  expect(railWidth).toBeLessThanOrEqual(320);
  expect(
    await rail.evaluate(
      (element) =>
        element.scrollHeight > element.clientHeight &&
        getComputedStyle(element).overflowY === 'auto',
    ),
  ).toBe(true);
  await rail.evaluate((element) => {
    element.scrollTop = 300;
  });
  const railPosition = await rail.evaluate((element) => element.scrollTop);
  await content.evaluate((element) => {
    element.scrollTop = 400;
  });
  expect(await content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await rail.evaluate((element) => element.scrollTop)).toBe(railPosition);
  await rail.getByRole('link', { name: '02 Bài 2', exact: true }).click();
  await expect(page.getByText('Học phần chưa có mô tả.', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Bài 1', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Bài 2', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bài 2', exact: true })).toBeVisible();
  await page.goto(`/courses/${courseId}/units/${unitId(999)}`);
  await expect(page.locator('.error-panel[role="alert"]')).toContainText(
    'Học phần không thuộc khóa học',
  );
  await page.goto(`/courses/${courseId}/units/${unitId(1)}`);
  await expect(page.getByRole('heading', { name: 'Bài 1', exact: true })).toBeVisible();
  await screenshot(page, 'mock-public-unit-1440.png');
  for (const width of [768, 390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const trigger = page.getByRole('button', { name: 'Nội dung khóa học', exact: true });
    await trigger.click();
    await expect(
      page.getByRole('dialog', { name: 'Nội dung khóa học', exact: true }),
    ).toBeVisible();
    if (width === 390) await screenshot(page, 'mock-public-unit-drawer-390.png');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Nội dung khóa học', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: 'Nội dung khóa học', exact: true });
  await drawer.getByRole('link', { name: '02 Bài 2', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bài 2', exact: true })).toBeVisible();
  await screenshot(page, 'mock-public-unit-390.png');
});

test('class price comes from course and student cart sends only classId', async ({ page }) => {
  const { adds, reads } = await mockPublicCatalog(page, { role: 'STUDENT' });
  await page.goto(`/classes/${classId}`);
  await expect(
    page.getByRole('heading', { name: 'Lớp Web buổi tối', exact: true, level: 1 }),
  ).toBeVisible();
  await expect(page.getByText('2.500.000 ₫', { exact: true })).toBeVisible();
  await expect(page.getByText('Buổi 1: Khởi động HTML', { exact: true })).toBeVisible();
  await expect(page.getByText(/19:00/)).toBeVisible();
  expect(reads).toContain(`/courses/${courseId}`);
  await expect(page.getByRole('link', { name: /private-meeting/ })).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toContain('private-meeting');
  await page.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Đã thêm lớp vào giỏ hàng.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Đã có trong giỏ · Xem giỏ', exact: true }),
  ).toBeVisible();
  expect(adds).toEqual([{ classId }]);
  await page.getByRole('link', { name: '02 Thực hành CSS', exact: true }).click();
  await expect(
    page.getByText('Học phần chưa có buổi học trong lịch công khai.', { exact: true }),
  ).toBeVisible();
});

test('anonymous add requires login and preserves public class return path', async ({ page }) => {
  const { adds } = await mockPublicCatalog(page);
  await page.goto(`/classes/${classId}`);
  await page.getByRole('link', { name: 'Đăng nhập để thêm vào giỏ', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  const next = new URL(page.url()).searchParams.get('next');
  expect(next).toMatch(new RegExp(`^/classes/${classId}`));
  await page.getByLabel('Email', { exact: true }).fill('student@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('correct-password');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/classes/${classId}`));
  await expect(page.getByRole('button', { name: 'Thêm vào giỏ', exact: true })).toBeVisible();
  expect(adds).toHaveLength(0);
});

test('full or non-student classes cannot add, course 404 and invalid dates recover', async ({
  page,
}) => {
  const full = await mockPublicCatalog(page, { role: 'STUDENT', full: true });
  await page.goto(`/classes/${classId}`);
  await expect(page.getByRole('button', { name: 'Thêm vào giỏ', exact: true })).toBeDisabled();
  expect(full.adds).toHaveLength(0);
  await page.unroute('**/api/v1/**');
  const admin = await mockPublicCatalog(page, { role: 'ADMIN', unavailableCourse: true });
  await page.goto(`/courses/${courseId}`);
  await expect(
    page.getByRole('heading', { name: 'Khóa học chưa khả dụng', exact: true }),
  ).toBeVisible();
  expect(admin.adds).toHaveLength(0);
  await page.unroute('**/api/v1/**');
  await mockPublicCatalog(page, { role: 'ADMIN' });
  await page.goto(`/classes/${classId}`);
  await expect(
    page.getByText('Đăng ký lớp dành cho tài khoản học viên.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thêm vào giỏ', exact: true })).toHaveCount(0);
  await page.goto('/courses');
  await page.getByLabel('Ngày bắt đầu lớp từ').fill('2026-12-01');
  await page.getByLabel('Ngày bắt đầu lớp đến').fill('2026-11-01');
  await page.getByRole('button', { name: 'Áp dụng bộ lọc', exact: true }).click();
  await expect(page.locator('#browse-to-error')).toContainText('Ngày kết thúc bộ lọc');
});

test('Ocean public courses and details fit responsive widths with saved mock captures', async ({
  page,
}) => {
  await mockPublicCatalog(page);
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: 'Lập trình Web', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    if (width === 1440 || width === 390) await screenshot(page, `mock-public-courses-${width}.png`);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/courses/${courseId}`);
    await expect(page.getByRole('heading', { name: 'Lập trình Web', exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await screenshot(page, `mock-public-course-detail-${width}.png`);
    await page.goto(`/classes/${classId}`);
    await expect(
      page.getByRole('heading', { name: 'Lớp Web buổi tối', exact: true, level: 1 }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await screenshot(page, `mock-public-class-${width}.png`);
  }
});
