import { expect, type Page, test } from '@playwright/test';

const categoryId = '123e4567-e89b-42d3-a456-426614174100';
const courseId = '123e4567-e89b-42d3-a456-426614174200';
const unitId = (index: number) => `123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`;
type Unit = {
  id: string;
  unitNumber: number;
  title: string;
  description: string | null;
  requiredScorePercent: number;
};

async function mockCatalog(
  page: Page,
  options: { role?: string; units?: number; conflict?: boolean; title?: string } = {},
) {
  const role = options.role ?? 'ADMIN';
  const categories = [
    {
      id: categoryId,
      name: 'Lập trình',
      slug: 'lap-trinh',
      description: null as string | null,
      isActive: true,
    },
  ];
  let course = {
    id: courseId,
    code: 'WEB101',
    imgUrl: null,
    title: options.title ?? 'Lập trình Web',
    description: 'Mô tả khóa học' as string | null,
    priceAmount: 2500000,
    category: { id: categoryId, name: 'Lập trình', slug: 'lap-trinh' },
    isActive: false,
    createdAt: '2026-10-02T00:00:00Z',
    updatedAt: '2026-10-02T00:00:00Z',
    units: Array.from(
      { length: options.units ?? 0 },
      (_, index): Unit => ({
        id: unitId(index + 1),
        unitNumber: index + 1,
        title: `Bài ${index + 1}`,
        description: Array.from({ length: 80 }, (_, line) => `Nội dung dòng ${line + 1}`).join(
          '\n',
        ),
        requiredScorePercent: 80,
      }),
    ),
  };
  let conflict = options.conflict ?? false;
  const mutations: { path: string; method: string; body: unknown }[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace('/api/v1', '');
    const method = request.method();
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          id: categoryId,
          email: 'admin@example.com',
          displayName: 'Minh Anh',
          phone: null,
          role,
          status: 'ACTIVE',
          lastLoginAt: null,
          createdAt: '2026-10-02T00:00:00Z',
        },
      });
    if (path === '/course-categories')
      return route.fulfill({
        json: {
          items: categories,
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
          total: categories.length,
        },
      });
    if (role !== 'ADMIN')
      return route.fulfill({
        status: 403,
        json: { code: 'INSUFFICIENT_ROLE', message: 'Forbidden' },
      });
    if (method !== 'GET')
      mutations.push({
        path,
        method,
        body: request.postData() ? request.postDataJSON() : undefined,
      });
    if (path === '/admin/course-categories') {
      const input = request.postDataJSON();
      const category = {
        id: categoryId,
        name: input.name,
        slug: input.slug ?? 'lap-trinh-web',
        description: input.description ?? null,
        isActive: true,
      };
      categories.splice(0, categories.length, category);
      return route.fulfill({ status: 201, json: category });
    }
    if (path === '/admin/courses' && method === 'POST') {
      const input = request.postDataJSON();
      course = {
        ...course,
        ...input,
        description: input.description ?? null,
        category: {
          id: categoryId,
          name: categories[0]?.name ?? '',
          slug: categories[0]?.slug ?? '',
        },
        units: [],
        isActive: false,
      };
      return route.fulfill({ status: 201, json: course });
    }
    if (path === '/admin/courses') {
      const matches = url.searchParams.get('isActive');
      const items = !matches || String(course.isActive) === matches ? [course] : [];
      return route.fulfill({
        json: {
          items,
          total: items.length,
          page: Number(url.searchParams.get('page') ?? 1),
          pageSize: Number(url.searchParams.get('pageSize') ?? 20),
        },
      });
    }
    if (path === `/admin/courses/${courseId}` && method === 'PATCH') {
      course = { ...course, ...request.postDataJSON() };
      return route.fulfill({ json: course });
    }
    if (path === `/admin/courses/${courseId}/units`) {
      const input = request.postDataJSON();
      const unit = {
        id: unitId(course.units.length + 1),
        unitNumber: course.units.length + 1,
        ...input,
        description: input.description ?? null,
      } as Unit;
      course.units.push(unit);
      return route.fulfill({ status: 201, json: unit });
    }
    if (path.endsWith('/units/order')) {
      if (conflict) {
        conflict = false;
        course.units.push({
          id: unitId(course.units.length + 1),
          unitNumber: course.units.length + 1,
          title: 'Học phần mới từ quản trị viên khác',
          description: null,
          requiredScorePercent: 80,
        });
        return route.fulfill({
          status: 409,
          json: { code: 'COURSE_UNIT_ORDER_MISMATCH', message: 'Changed concurrently' },
        });
      }
      const input = request.postDataJSON();
      const units = course.units;
      expect(input.unitIds).toHaveLength(units.length);
      course.units = input.unitIds.map((id: string, index: number) => ({
        ...units.find((unit) => unit.id === id),
        unitNumber: index + 1,
      }));
      return route.fulfill({ json: course });
    }
    if (path.endsWith('/activate')) {
      course.isActive = true;
      return route.fulfill({ json: course });
    }
    if (path === `/admin/courses/${courseId}`) return route.fulfill({ json: course });
    return route.fulfill({ status: 404, json: { code: 'COURSE_NOT_FOUND', message: 'Not found' } });
  });
  return { mutations };
}

test('admin creates category/course, adds and reorders units, updates fields and activates', async ({
  page,
}) => {
  const { mutations } = await mockCatalog(page);
  await page.goto('/management/course-categories');
  await page.getByRole('button', { name: 'Tạo danh mục', exact: true }).click();
  const categoryDialog = page.getByRole('dialog', { name: 'Tạo danh mục', exact: true });
  await categoryDialog.getByLabel('Tên danh mục').fill('Lập trình Web');
  await categoryDialog.getByRole('button', { name: 'Tạo danh mục', exact: true }).click();
  await expect(categoryDialog).not.toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Đã tạo danh mục' })).toBeVisible();
  await page.getByRole('link', { name: 'Quản lý khóa học', exact: true }).click();
  await page.getByRole('link', { name: 'Tạo khóa học', exact: true }).click();
  await page.getByLabel('Mã khóa học').fill('WEB101');
  await page.getByLabel('Danh mục', { exact: false }).selectOption(categoryId);
  await page.getByLabel('Tên khóa học').fill('Lập trình Web');
  await page.getByLabel('Học phí').fill('2500000');
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/management/courses/${courseId}`));
  await expect(
    page.getByRole('button', { name: 'Kích hoạt khóa học', exact: true }),
  ).toBeDisabled();
  for (const title of ['HTML cơ bản', 'CSS cơ bản']) {
    await page.getByRole('link', { name: 'Thêm học phần', exact: true }).click();
    await page.getByLabel('Tên học phần').fill(title);
    await page.getByLabel('Mô tả', { exact: true }).fill(`Giới thiệu ${title}`);
    await page.getByRole('button', { name: 'Thêm học phần', exact: true }).click();
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Đưa CSS cơ bản lên', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu thứ tự');
  await expect(
    page.locator('[aria-current="true"]').filter({ hasText: 'CSS cơ bản' }),
  ).toContainText('Học phần 1');
  await page.getByRole('link', { name: 'Học phần 2 HTML cơ bản' }).click();
  await expect(page).toHaveURL(new RegExp(`unitId=${unitId(1)}`));
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'CSS cơ bản', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'CSS cơ bản', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Thông tin khóa học', exact: true }).click();
  await page.getByLabel('Mô tả', { exact: true }).fill('');
  await page.getByLabel('Học phí').fill('3000000');
  await page.getByRole('button', { name: 'Lưu thông tin khóa học', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu thông tin');
  await page.getByRole('button', { name: 'Kích hoạt khóa học', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Đã kích hoạt');
  await expect(page.getByRole('button', { name: 'Kích hoạt khóa học', exact: true })).toHaveCount(
    0,
  );
  const created = mutations.find(
    (mutation) => mutation.path === '/admin/courses' && mutation.method === 'POST',
  );
  expect(created?.body).toEqual({
    categoryId,
    code: 'WEB101',
    title: 'Lập trình Web',
    priceAmount: 2500000,
  });
  const edited = mutations.find((mutation) => mutation.method === 'PATCH');
  expect(edited?.body).toEqual({
    categoryId,
    title: 'Lập trình Web',
    description: null,
    priceAmount: 3000000,
  });
  expect(mutations.filter((mutation) => mutation.method === 'PUT')).toHaveLength(1);
});

test('unit conflict refetches latest server units and invalid selection is unavailable', async ({
  page,
}) => {
  await mockCatalog(page, { units: 2, conflict: true });
  await page.goto(`/management/courses/${courseId}?unitId=${unitId(2)}`);
  await page.getByRole('button', { name: 'Đưa Bài 2 lên', exact: true }).click();
  await expect(page.locator('.error-panel[role="alert"]')).toContainText(
    'Danh sách học phần đã thay đổi',
  );
  await expect(
    page.getByRole('link', { name: 'Học phần 3 Học phần mới từ quản trị viên khác' }),
  ).toBeVisible();
  await page.goto(`/management/courses/${courseId}?unitId=${unitId(999)}`);
  await expect(page.locator('.error-panel[role="alert"]')).toContainText(
    'Học phần không thuộc khóa học',
  );
});

test('desktop workspace has independent scrolling and mobile drawer keeps deep-link selection', async ({
  page,
}) => {
  await mockCatalog(page, { units: 40 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/management/courses/${courseId}?unitId=${unitId(1)}`);
  await expect(page.getByRole('heading', { name: 'Bài 1', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/implement_phase/screenshots/mock-course-units-1440.png' });
  const rail = page.locator('[data-unit-rail]:visible');
  const content = page.locator('[data-unit-content]');
  const scrollable = await rail.evaluate(
    (element) =>
      element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === 'auto',
  );
  expect(scrollable).toBe(true);
  await rail.evaluate((element) => {
    element.scrollTop = 500;
  });
  const railPosition = await rail.evaluate((element) => element.scrollTop);
  await content.evaluate((element) => {
    element.scrollTop = 600;
  });
  expect(await rail.evaluate((element) => element.scrollTop)).toBe(railPosition);
  expect(await content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  for (const width of [768, 390, 375]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const trigger = page.getByRole('button', { name: 'Nội dung khóa học', exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Tab');
    expect(
      await page
        .getByRole('dialog')
        .evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);
    if (width === 390)
      await page.screenshot({
        path: 'docs/implement_phase/screenshots/mock-course-drawer-390.png',
      });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(trigger).toBeFocused();
  }
  await page.getByRole('button', { name: 'Nội dung khóa học', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Học phần 2 Bài 2' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bài 2', exact: true })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`unitId=${unitId(2)}`));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bài 2', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Bài 1', exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('heading', { name: 'Bài 2', exact: true })).toBeVisible();
});

test('course detail omits the large header and keeps a long title inside the bounded workspace', async ({
  page,
}) => {
  await mockCatalog(page, {
    units: 40,
    title:
      'Lập trình Web và thiết kế ứng dụng với nền tảng JavaScript hiện đại, thực hành xây dựng sản phẩm, kiểm thử và tổ chức dự án cho người mới bắt đầu',
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/management/courses/${courseId}?unitId=${unitId(1)}`);
  const workspace = page.locator('[data-unit-workspace]');
  await expect(workspace).toBeVisible();
  await expect(page.getByText('MINDY / QUẢN LÝ KHÓA HỌC', { exact: true })).toHaveCount(0);
  await expect
    .poll(() => workspace.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(250);
  await expect
    .poll(() => workspace.evaluate((element) => element.getBoundingClientRect().bottom))
    .toBeLessThanOrEqual(901);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const rail = page.locator('[data-unit-rail]');
  await rail.focus();
  await page.keyboard.press('PageDown');
  await expect.poll(() => rail.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('student cannot open catalog management', async ({ page }) => {
  const { mutations } = await mockCatalog(page, { role: 'STUDENT' });
  await page.goto('/management/courses');
  await expect(page.getByRole('heading', { name: 'Bạn chưa có quyền truy cập' })).toBeVisible();
  expect(mutations).toHaveLength(0);
});

test('category modal keeps the list clear, supports keyboard cancellation and fits desktop/mobile', async ({
  page,
}, info) => {
  const { mutations } = await mockCatalog(page);
  await page.goto('/management/course-categories');
  const trigger = page.getByRole('button', { name: 'Tạo danh mục', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Tạo danh mục', exact: true });
  await expect(page.getByRole('table', { name: 'Danh mục khóa học' })).toBeVisible();
  await expect(page.getByLabel('Tên danh mục')).not.toBeVisible();
  await page.getByLabel('Số mục mỗi trang').selectOption('10');
  await expect(page).toHaveURL(/page=1&pageSize=10/);
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: info.outputPath(`categories-list-${width}.png`) });
    await trigger.click();
    await expect(dialog.getByLabel('Tên danh mục')).toBeFocused();
    await dialog.getByRole('button', { name: 'Tạo danh mục', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Vui lòng nhập tên danh mục.');
    await dialog.getByLabel('Tên danh mục').fill('Danh mục bản nháp');
    await page.keyboard.press('Shift+Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const bounds = await dialog.boundingBox();
    expect(bounds?.width).toBeLessThanOrEqual(width - 32);
    await page.screenshot({ path: info.outputPath(`categories-modal-${width}.png`) });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(dialog.getByLabel('Tên danh mục')).toHaveValue('Danh mục bản nháp');
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(trigger).toBeFocused();
    // Leave the name empty for the next validation check.
    await trigger.click();
    await dialog.getByLabel('Tên danh mục').fill('');
    await dialog.getByRole('button', { name: 'Đóng tạo danh mục' }).click();
  }
  expect(mutations).toHaveLength(0);
});

test('category modal blocks closing during creation and keeps unknown-result recovery after reopening', async ({
  page,
}) => {
  await mockCatalog(page);
  let release = () => {};
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  let attempts = 0;
  let fail = true;
  await page.route('**/api/v1/admin/course-categories', async (route) => {
    if (!fail) return route.fallback();
    attempts++;
    await pending;
    return route.fulfill({ status: 503, json: { code: 'API_UNAVAILABLE' } });
  });
  await page.goto('/management/course-categories');
  const trigger = page.getByRole('button', { name: 'Tạo danh mục', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Tạo danh mục', exact: true });
  const submit = dialog.getByRole('button', { name: 'Tạo danh mục', exact: true });
  await dialog.getByLabel('Tên danh mục').fill('Danh mục thử nghiệm');
  await submit.click();
  await expect.poll(() => attempts).toBe(1);
  await expect(dialog.getByRole('button', { name: 'Hủy', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  release();
  await expect(dialog.getByRole('alert')).toContainText('Kết quả thao tác chưa rõ.');
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click();
  await trigger.click();
  await expect(dialog.getByLabel('Tên danh mục')).toHaveValue('Danh mục thử nghiệm');
  await expect(submit).toBeDisabled();
  await dialog.getByRole('button', { name: 'Kiểm tra kết quả', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Đã đọc 1 danh mục.');
  await dialog.getByRole('button', { name: 'Đã kiểm tra, cho phép thử lại' }).click();
  fail = false;
  await submit.click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('table')).toContainText('Danh mục thử nghiệm');
  await expect(trigger).toBeFocused();
});
