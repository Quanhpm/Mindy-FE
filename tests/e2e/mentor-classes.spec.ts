import { expect, type Page, test } from '@playwright/test';

const id = '123e4567-e89b-42d3-a456-426614174000';
const mentorId = '123e4567-e89b-42d3-a456-426614174001';
const managerId = '123e4567-e89b-42d3-a456-426614174002';
async function mock(page: Page, role = 'MENTOR') {
  const requests: string[] = [];
  let fail = false;
  let empty = false;
  await page.route('**/api/v1/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me'))
      return route.fulfill({
        json: {
          id: role === 'MANAGER' ? managerId : mentorId,
          email: 'mentor@example.com',
          phone: null,
          displayName: 'Giảng viên thử nghiệm',
          role,
          status: 'ACTIVE',
          lastLoginAt: null,
          createdAt: '2026-10-01T00:00:00Z',
        },
      });
    if (url.pathname.includes('/mentor/classes')) {
      requests.push(url.pathname + url.search);
      if (fail) return route.fulfill({ status: 503, json: { code: 'API_UNAVAILABLE' } });
      const students = url.pathname.endsWith('/students');
      return route.fulfill({
        json: {
          page: Number(url.searchParams.get('page')),
          pageSize: 20,
          total: empty ? 0 : 21,
          items: empty
            ? []
            : students
              ? [
                  {
                    enrollmentId: id,
                    studentId: id,
                    studentName: 'Học viên Nguyễn Minh',
                    enrollmentStatus: 'PENDING_PAYMENT',
                    orderId: id,
                    orderCode: 'MD-MULTI-CLASS',
                    orderStatus: 'PENDING',
                    paymentType: 'CASH',
                    classAmount: 100000,
                    orderTotalAmount: 300000,
                    orderClassCount: 2,
                    expiresAt: '2099-11-01T00:00:00Z',
                    paidAt: null,
                    canConfirmCash: true,
                  },
                ]
              : [
                  {
                    id,
                    courseId: id,
                    code: 'WEB-A',
                    name: 'Lớp lập trình Web',
                    startDate: '2026-11-01',
                    endDate: '2026-12-01',
                    deliveryMode: 'ONLINE',
                    maxStudents: 20,
                    availableSeats: 5,
                    mentor: { id: mentorId, displayName: 'Giảng viên thử nghiệm' },
                    status: 'OPEN',
                  },
                ],
        },
      });
    }
    return route.fulfill({ status: 404, json: {} });
  });
  return {
    requests,
    fail: () => {
      fail = true;
    },
    recover: () => {
      fail = false;
    },
    empty: () => {
      empty = true;
    },
  };
}
test('mentor follows assigned classes to roster; filters and pages survive reload; responsive tables', async ({
  page,
}, info) => {
  const api = await mock(page);
  await page.goto('/mentor/classes');
  await expect(page.getByText('Lớp lập trình Web', { exact: true })).toBeVisible();
  await page.getByLabel('Trạng thái lớp').selectOption('OPEN');
  await expect(page).toHaveURL(/status=OPEN/);
  await page.getByRole('button', { name: 'Trang sau' }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page.getByLabel('Trạng thái lớp')).toHaveValue('OPEN');
  await expect(page.getByText('Trang 2 · 21 lớp')).toBeVisible();
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`classes-${width}.png`), fullPage: true });
  }
  await page.getByRole('link', { name: 'Xem học viên', exact: true }).click();
  await expect(page).toHaveURL(`/mentor/classes/${id}/students`);
  await expect(page.getByText('Học viên Nguyễn Minh')).toBeVisible();
  await expect(page.getByText('100.000', { exact: false })).toBeVisible();
  await expect(page.getByText('300.000', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở thu tiền mặt' })).toHaveAttribute(
    'href',
    '/mentor/cash-orders',
  );
  await page.getByLabel('Thanh toán', { exact: true }).selectOption('CASH');
  await page.getByLabel('Trạng thái đơn').selectOption('PENDING');
  await expect.poll(() => api.requests.at(-1)).toContain('paymentType=CASH&orderStatus=PENDING');
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`students-${width}.png`), fullPage: true });
  }
  api.fail();
  await page.getByRole('button', { name: 'Cập nhật danh sách' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Học viên Nguyễn Minh')).toHaveCount(0);
  api.recover();
  api.empty();
  await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await expect(page.getByText('Chưa có học viên phù hợp.')).toBeVisible();
});
for (const role of ['ADMIN', 'STUDENT'])
  test(`${role} cannot request mentor class or roster data`, async ({ page }) => {
    const api = await mock(page, role);
    for (const path of ['/mentor/classes', `/mentor/classes/${id}/students`]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: 'Khu vực dành cho giảng viên' }),
      ).toBeVisible();
    }
    expect(api.requests).toHaveLength(0);
  });

test('manager reads all classes and roster with no mentor cash actions; materials is a route only', async ({
  page,
}, info) => {
  const api = await mock(page, 'MANAGER');
  await page.goto('/manager/classes');
  await expect(page.getByRole('heading', { name: 'Lớp học', exact: true })).toBeVisible();
  await expect(page.getByText('Lớp lập trình Web', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Thu tiền mặt', exact: true })).toHaveCount(0);
  await expect(page.locator('a[href="/management/users"]')).toHaveCount(0);
  await page.getByLabel('Trạng thái lớp').selectOption('OPEN');
  await expect.poll(() => api.requests.at(-1)).toContain('status=OPEN');
  await page.getByRole('link', { name: 'Xem học viên', exact: true }).click();
  await expect(page).toHaveURL(`/manager/classes/${id}/students`);
  await expect(page.getByText('Học viên Nguyễn Minh')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở thu tiền mặt' })).toHaveCount(0);
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`manager-students-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('link', { name: 'Tài liệu môn học', exact: true }).click();
  await expect(page).toHaveURL('/manager/materials');
  await expect(page.getByRole('heading', { name: 'Tài liệu môn học', exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('manager-materials.png'), fullPage: true });
});
for (const role of ['MENTOR', 'STUDENT', 'ADMIN'])
  test(`${role} cannot fetch manager classes or roster`, async ({ page }) => {
    const api = await mock(page, role);
    for (const path of [
      '/manager/classes',
      `/manager/classes/${id}/students`,
      '/manager/materials',
    ]) {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: 'Khu vực dành cho quản lý', exact: true }),
      ).toBeVisible();
    }
    expect(api.requests).toHaveLength(0);
  });
test('manager sees a live permission error with retry instead of a fabricated list', async ({
  page,
}) => {
  const api = await mock(page, 'MANAGER');
  await page.route('**/api/v1/mentor/classes?**', (route) =>
    route.fulfill({ status: 403, json: { code: 'INSUFFICIENT_ROLE' } }),
  );
  await page.goto('/manager/classes');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('Lớp lập trình Web', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thử lại', exact: true })).toBeVisible();
  expect(api.requests).toHaveLength(0);
});
