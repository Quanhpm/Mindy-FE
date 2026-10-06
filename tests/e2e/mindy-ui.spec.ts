import { expect, type Page, test } from '@playwright/test';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = {
  id: id(1),
  email: 'qa@example.com',
  displayName: 'Nguyễn Minh Anh',
  phone: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00Z',
};
const category = {
  id: id(2),
  name: 'Lập trình',
  slug: 'lap-trinh',
  description: 'Các khóa học lập trình',
  isActive: true,
};
const units = [
  {
    id: id(4),
    unitNumber: 1,
    title: 'Nền tảng và tư duy lập trình',
    description: 'Nội dung học phần.\n'.repeat(60),
    requiredScorePercent: 80,
  },
];
const course = {
  id: id(3),
  code: 'WEB101',
  title: 'Lập trình Web từ nền tảng đến thực hành',
  description: 'Khám phá cách xây dựng ứng dụng web cùng mentor.',
  priceAmount: 1500000,
  imgUrl: null,
  category,
  isActive: true,
  createdAt: user.createdAt,
  updatedAt: user.createdAt,
  units,
};
const classItem = {
  id: id(5),
  courseId: id(3),
  code: 'WEB101-A',
  name: 'Lớp Web buổi tối',
  startDate: '2026-11-01',
  endDate: '2026-12-01',
  deliveryMode: 'ONLINE',
  maxStudents: 20,
  availableSeats: 10,
  mentor: { id: id(6), displayName: 'Mentor Minh' },
  status: 'DRAFT',
  meetingUrl: null,
  createdAt: user.createdAt,
  updatedAt: user.createdAt,
  units: [
    {
      id: id(7),
      courseUnitId: id(4),
      position: 1,
      title: units[0]?.title,
      status: 'LOCKED',
      unlockAt: null,
      sessions: [],
    },
  ],
};
const cartItem = {
  classId: id(5),
  classCode: 'WEB101-A',
  className: classItem.name,
  courseId: id(3),
  courseTitle: course.title,
  deliveryMode: 'ONLINE',
  startDate: classItem.startDate,
  endDate: classItem.endDate,
  priceSnapshot: 1500000,
  currentPriceAmount: 1500000,
  isPurchasable: true,
  addedAt: user.createdAt,
};
const order = {
  id: id(8),
  orderCode: 'MD-QA-001',
  paymentType: 'CASH',
  status: 'PENDING',
  totalAmount: 1500000,
  expiresAt: '2099-10-07T00:00:00Z',
  paidAt: null,
  mentorId: id(6),
  createdAt: user.createdAt,
  payment: null,
  details: [
    {
      id: id(9),
      classId: id(5),
      courseTitle: course.title,
      className: classItem.name,
      priceAmount: 1500000,
      quantity: 1,
      totalAmount: 1500000,
    },
  ],
};

async function mockScreens(page: Page, role: 'ADMIN' | 'STUDENT' | null) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    const identity = { ...user, role: role ?? 'STUDENT' };
    const list = (items: unknown[]) => ({
      items,
      total: items.length,
      page: 1,
      pageSize: Number(url.searchParams.get('pageSize') ?? 20),
    });
    let json: unknown;
    if (path === '/auth/me') {
      if (!role)
        return route.fulfill({
          status: 401,
          json: { code: 'AUTHENTICATION_REQUIRED', message: 'Unauthorized' },
        });
      json = identity;
    } else if (path === '/auth/refresh')
      return route.fulfill({
        status: 401,
        json: { code: 'INVALID_REFRESH_TOKEN', message: 'Unauthorized' },
      });
    else if (path === '/auth/registration-context')
      json = {
        email: user.email,
        displayName: user.displayName,
        avatarUrl: null,
        expiresAt: '2099-10-07T00:00:00Z',
      };
    else if (path === '/course-categories') json = list([category]);
    else if (path === '/admin/users')
      json = list([{ ...identity, role: url.searchParams.get('role') ?? 'MENTOR' }]);
    else if (path.startsWith('/admin/users/')) json = { ...identity, id: id(6), role: 'MENTOR' };
    else if (path === '/courses' || path === '/admin/courses') json = list([course]);
    else if (path === `/courses/${id(3)}/classes`) json = list([classItem]);
    else if (path === `/courses/${id(3)}`) json = { ...course, openClasses: [classItem] };
    else if (path === `/admin/courses/${id(3)}`) json = course;
    else if (path === '/admin/classes') json = list([classItem]);
    else if (path === `/classes/${id(5)}` || path === `/admin/classes/${id(5)}`) json = classItem;
    else if (path === `/me/classes/${id(5)}`) json = classItem;
    else if (path === '/admin/payments/reconciliation')
      json = list([
        {
          id: id(10),
          paymentId: id(11),
          providerOrderCode: 102,
          referenceCode: 'QA-REVIEW',
          amount: 1500000,
          currency: 'VND',
          reason: 'Cần kiểm tra giao dịch',
          source: 'PAYOS',
          actorId: null,
          createdAt: user.createdAt,
        },
      ]);
    else if (path === '/me/cart') json = { items: [cartItem], totalAmount: 1500000 };
    else if (path === '/me/orders') json = list([order]);
    else if (path === `/me/orders/${id(8)}`) json = order;
    else
      return route.fulfill({
        status: 404,
        json: { code: 'NOT_FOUND', message: 'Not available in this UI test' },
      });
    return route.fulfill({ json });
  });
}

async function verifyScreens(page: Page, routes: string[], screenshot: (name: string) => string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: screenshot(`${route.replaceAll(/[^a-z0-9]/gi, '-')}-${width}.png`),
          fullPage: true,
        });
    }
  }
  expect(errors).toEqual([]);
}

test('Mindy auth and compiler pages keep controls readable at all supported widths', async ({
  page,
}, info) => {
  await mockScreens(page, null);
  await verifyScreens(
    page,
    [
      '/login',
      '/register',
      '/register/complete',
      `/verify-email?token=${'a'.repeat(40)}`,
      '/compiler',
    ],
    (name) => info.outputPath(name),
  );
});

test('Mindy public catalog, class and syllabus layouts fit every viewport', async ({
  page,
}, info) => {
  await mockScreens(page, null);
  await verifyScreens(
    page,
    ['/courses', `/courses/${id(3)}`, `/classes/${id(5)}`, `/courses/${id(3)}/units/${id(4)}`],
    (name) => info.outputPath(name),
  );
});

test('Mindy student account, cart and order layouts preserve their page structure', async ({
  page,
}, info) => {
  await mockScreens(page, 'STUDENT');
  await verifyScreens(
    page,
    ['/account', '/cart', '/checkout', '/orders', `/orders/${id(8)}`, `/learning/classes/${id(5)}`],
    (name) => info.outputPath(name),
  );
});

test('Mindy admin pages and narrow workspaces keep mobile navigation and focus', async ({
  page,
}, info) => {
  await mockScreens(page, 'ADMIN');
  await verifyScreens(
    page,
    [
      '/management/users',
      '/management/users/new',
      `/management/users/${id(6)}`,
      '/management/course-categories',
      '/management/courses',
      '/management/courses/new',
      `/management/courses/${id(3)}?unitId=${id(4)}`,
      '/management/classes',
      '/management/payments/reconciliation',
      '/management/classes/new',
      `/management/classes/${id(5)}?unitId=${id(7)}`,
    ],
    (name) => info.outputPath(name),
  );
  const trigger = page.getByRole('button', { name: 'Mở menu', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog', { name: 'Menu Mindy' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 901, height: 900 });
  await expect(page.locator('[data-unit-workspace]')).toHaveAttribute('data-compact', 'true');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator('[data-unit-workspace]')).toHaveAttribute('data-compact', 'false');
});
