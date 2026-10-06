import { expect, type Page, test } from '@playwright/test';

const id = '123e4567-e89b-42d3-a456-426614174000';
const category = { id, name: 'Web', slug: 'web', description: null, isActive: true };
const image = 'https://cdn.example.com/course.svg';
async function catalog(page: Page, initialImage: string | null = image) {
  let course = {
    id,
    code: 'WEB101',
    title: 'Web Image',
    description: null as string | null,
    imgUrl: initialImage,
    priceAmount: 5000,
    category: { id, name: 'Web', slug: 'web' },
    isActive: false,
    createdAt: '2026-10-05T00:00:00Z',
    updatedAt: '2026-10-05T00:00:00Z',
    units: [],
    openClasses: [],
  };
  const writes: Array<{ method: string; body: Record<string, unknown> }> = [];
  await page.route('https://cdn.example.com/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240"><rect width="600" height="240" fill="#eaf4fb"/></svg>',
    }),
  );
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    if (path === '/auth/me')
      return route.fulfill({
        json: {
          id,
          email: 'admin@example.com',
          displayName: 'Admin',
          phone: null,
          role: 'ADMIN',
          status: 'ACTIVE',
          lastLoginAt: null,
          createdAt: '2026-10-05T00:00:00Z',
        },
      });
    if (path === '/course-categories')
      return route.fulfill({ json: { items: [category], total: 1, page: 1, pageSize: 100 } });
    if (request.method() === 'POST' && path === '/admin/courses') {
      const body = request.postDataJSON();
      writes.push({ method: 'POST', body });
      course = { ...course, ...body, imgUrl: body.imgUrl ?? null };
      return route.fulfill({ status: 201, json: course });
    }
    if (request.method() === 'PATCH' && path === `/admin/courses/${id}`) {
      const body = request.postDataJSON();
      writes.push({ method: 'PATCH', body });
      course = { ...course, ...body };
      return route.fulfill({ json: course });
    }
    if (path === `/admin/courses/${id}` || path === `/courses/${id}`)
      return route.fulfill({ json: course });
    if (path === `/courses/${id}/classes`)
      return route.fulfill({ json: { items: [], page: 1, pageSize: 12, total: 0 } });
    if (path === '/courses' || path === '/admin/courses')
      return route.fulfill({ json: { items: [course], page: 1, pageSize: 12, total: 1 } });
    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Not found' } });
  });
  return writes;
}
test('admin creates course image, omits unchanged PATCH image, changes URL and clears with null', async ({
  page,
}) => {
  const writes = await catalog(page, null);
  await page.goto('/management/courses/new');
  await page.getByLabel('Mã khóa học').fill('WEB101');
  await page.getByLabel('Danh mục').selectOption(id);
  await page.getByLabel('Tên khóa học').fill('Web Image');
  await page.getByLabel('Học phí').fill('5000');
  await page.getByLabel('URL ảnh khóa học').fill(image);
  await page.getByRole('button', { name: 'Tạo khóa học', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/management/courses/${id}`));
  expect(writes[0]?.body.imgUrl).toBe(image);
  await page.getByRole('link', { name: 'Thông tin khóa học', exact: true }).click();
  await expect(page.getByLabel('URL ảnh khóa học')).toHaveValue(image);
  await page.getByRole('button', { name: 'Lưu thông tin khóa học' }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1]?.body).not.toHaveProperty('imgUrl');
  const changed = 'https://cdn.example.com/new.svg';
  await page.getByLabel('URL ảnh khóa học').fill(changed);
  await page.getByRole('button', { name: 'Lưu thông tin khóa học' }).click();
  await expect.poll(() => writes.length).toBe(3);
  expect(writes[2]?.body.imgUrl).toBe(changed);
  await page.getByLabel('URL ảnh khóa học').fill('');
  await page.getByRole('button', { name: 'Lưu thông tin khóa học' }).click();
  await expect.poll(() => writes.length).toBe(4);
  expect(writes[3]?.body.imgUrl).toBeNull();
});
test('admin rejects unsafe image URL before writing', async ({ page }) => {
  const writes = await catalog(page);
  await page.goto(`/management/courses/${id}?tab=fields`);
  await page.getByLabel('URL ảnh khóa học').fill('https://user:pass@cdn.example.com/image.png');
  await page.getByRole('button', { name: 'Lưu thông tin khóa học' }).click();
  await expect(page.getByLabel('URL ảnh khóa học')).toHaveAttribute('aria-invalid', 'true');
  expect(writes).toHaveLength(0);
});
test('public cards/detail render image and use fallback after image failure', async ({ page }) => {
  await catalog(page);
  await page.goto('/courses');
  await expect(page.getByRole('img', { name: 'Ảnh khóa học Web Image' })).toBeVisible();
  await page.getByRole('link', { name: 'Web Image', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Ảnh khóa học Web Image' })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.route('https://cdn.example.com/**', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('img', { name: 'Ảnh khóa học Web Image' })).toHaveCount(0);
  await expect(page.locator('strong').filter({ hasText: 'WEB101' })).toBeVisible();
});
