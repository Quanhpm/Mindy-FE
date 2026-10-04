/**
 * Live, additive smoke against an isolated local *_test database owned by the operator.
 * No request mocking, database access/reset, token logging, or persisted browser state.
 *
 * Run after FE/BE are ready:
 * LIVE_SMOKE_ISOLATED_TEST=1 LIVE_MAILPIT_URL=http://127.0.0.1:8025 \
 *   node scripts/live-integration-smoke.mjs
 * Optional: LIVE_SMOKE_BASE_URL (default http://127.0.0.1:3103),
 * LIVE_ADMIN_EMAIL / LIVE_ADMIN_PASSWORD (seeded test fixture defaults below).
 * LIVE_SMOKE_VERIFY_EXPIRY=1 requires PAYOS hold TTL 60–120s and expiry worker enabled;
 * use a longer CASH hold (at least 600s) for the preceding pending-order assertions.
 * LIVE_MAILPIT_URL accepts a local SMTP capture service with Mailpit-compatible message APIs.
 * Without it, main STUDENT is admin-created: registration/email is skipped.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'docs/implement_phase/screenshots');
const baseUrl = localOrigin(process.env.LIVE_SMOKE_BASE_URL ?? 'http://127.0.0.1:3103');
const mailpitUrl = process.env.LIVE_MAILPIT_URL ? localOrigin(process.env.LIVE_MAILPIT_URL) : null;
const adminEmail = process.env.LIVE_ADMIN_EMAIL ?? 'audit-admin@example.test';
const adminPassword = process.env.LIVE_ADMIN_PASSWORD ?? 'AuditAdmin123!';
const fixturePassword = 'LiveAuditStudent123!';
const verifyExpiry = process.env.LIVE_SMOKE_VERIFY_EXPIRY === '1';
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const summary = {
  kind: 'live-local',
  mockedRequests: false,
  isolatedTestEnvironmentAcknowledged: process.env.LIVE_SMOKE_ISOLATED_TEST === '1',
  runId,
  baseUrl,
  startedAt: new Date().toISOString(),
  status: 'running',
  registration: mailpitUrl
    ? 'Local SMTP capture + UI verification'
    : 'admin-created STUDENT fixture',
  passed: [],
  fixtures: {},
  screenshots: [],
  notVerified: [
    'Google OAuth with a real provider account',
    'PayOS payment link/webhook or cash payment confirmation (backend has no such APIs)',
    'Learning access/progress after payment',
    'Timeout/unknown-result fault injection (covered separately by mock QA)',
  ],
};
if (!mailpitUrl) summary.notVerified.push('Public registration and SMTP email verification');
if (!verifyExpiry)
  summary.notVerified.push('Live order expiry lifecycle (requires a short test PAYOS hold TTL)');

function localOrigin(value) {
  const url = new URL(value);
  assert(
    url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
    'Live smoke targets must be local HTTP origins.',
  );
  assert(!url.username && !url.password && url.pathname === '/' && !url.search && !url.hash);
  return url.origin;
}

function safeFailure(error) {
  return String(error instanceof Error ? error.message : error)
    .replaceAll(adminPassword, '[redacted]')
    .replaceAll(fixturePassword, '[redacted]')
    .replace(/([?&]token=)[^\s&"']+/gi, '$1[redacted]')
    .slice(0, 1800);
}

async function step(label, operation) {
  console.log(`LIVE ${label}`);
  await operation();
  summary.passed.push(label);
}

async function api(context, method, endpoint, data, expectedStatus = 200) {
  // BrowserContext request storage shares the browser's HttpOnly cookies. They are never read.
  const response = await context.request.fetch(`${baseUrl}/api/v1${endpoint}`, {
    method,
    headers: { Origin: baseUrl },
    ...(data === undefined ? {} : { data }),
    timeout: 20_000,
    maxRedirects: 0,
  });
  const body = response.status() === 204 ? undefined : await response.json().catch(() => null);
  assert.equal(
    response.status(),
    expectedStatus,
    `${method} ${endpoint.split('?')[0]} returned ${response.status()} (${body?.code ?? 'no code'})`,
  );
  return body;
}

function realId(value) {
  assert.match(value, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);
  return value;
}

async function loginUi(page, email, password, destination = '/account') {
  await page.goto(`${baseUrl}/login?next=${encodeURIComponent(destination)}`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(`${baseUrl}${destination}`, { timeout: 20_000 });
}

async function capture(page, label) {
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    if (width === 1440 || width === 390) {
      const filename = `live-local-${label}-${width}.png`;
      await page.screenshot({ path: path.join(outputDirectory, filename), fullPage: true });
      summary.screenshots.push(filename);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

async function verificationLink(email) {
  // Search only this run's unique recipient; do not log message text or the bearer token.
  let messageId;
  await expect
    .poll(
      async () => {
        const url = new URL('/api/v1/messages', mailpitUrl);
        const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        assert.equal(response.status, 200, 'Local SMTP message listing unavailable.');
        const body = await response.json();
        messageId = body.messages?.find((message) =>
          message.To?.some((recipient) => recipient.Address?.toLowerCase() === email.toLowerCase()),
        )?.ID;
        return Boolean(messageId);
      },
      { timeout: 30_000, intervals: [250, 500, 1000] },
    )
    .toBe(true);
  const response = await fetch(
    new URL(`/api/v1/message/${encodeURIComponent(messageId)}`, mailpitUrl),
    {
      signal: AbortSignal.timeout(10_000),
    },
  );
  assert.equal(response.status, 200, 'Local SMTP message unavailable.');
  const message = await response.json();
  const link = message.Text?.match(/https?:\/\/[^\s]+\/verify-email\?token=[^\s]+/)?.[0];
  assert(link, 'Verification link missing from this test recipient message.');
  const url = new URL(link);
  assert.equal(url.origin, baseUrl, 'Verification link must return to the isolated FE origin.');
  assert.equal(url.pathname, '/verify-email');
  assert(url.searchParams.get('token')?.length >= 32, 'Verification token is malformed.');
  return url.toString();
}

async function main() {
  assert(
    summary.isolatedTestEnvironmentAcknowledged,
    'Set LIVE_SMOKE_ISOLATED_TEST=1 only after confirming the local backend uses a fresh *_test database.',
  );
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const otherContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const publicContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const adminPage = await adminContext.newPage();
  const studentPage = await studentContext.newPage();
  const otherPage = await otherContext.newPage();
  const publicPage = await publicContext.newPage();
  for (const page of [adminPage, studentPage, otherPage, publicPage])
    page.setDefaultTimeout(20_000);
  const label = `Live audit ${runId}`;
  const studentEmail = `live-student-${runId}@example.test`;
  const otherEmail = `live-other-${runId}@example.test`;
  let course;
  let category;
  let mentors;
  let classItems;
  let cashOrders;
  let payosOrders;
  try {
    await step('BFF health and admin UI login', async () => {
      const health = await api(publicContext, 'GET', '/health/live');
      assert.equal(health.status, 'ok');
      await loginUi(adminPage, adminEmail, adminPassword, '/management/courses');
      const identity = await api(adminContext, 'GET', '/auth/me');
      assert.equal(identity.role, 'ADMIN');
    });
    await step(
      'Create two active mentors and ownership student through admin users API',
      async () => {
        mentors = [];
        for (const index of [1, 2]) {
          const mentor = await api(
            adminContext,
            'POST',
            '/admin/users',
            {
              email: `live-mentor-${index}-${runId}@example.test`,
              password: fixturePassword,
              displayName: `${label} mentor ${index}`,
              role: 'MENTOR',
            },
            201,
          );
          realId(mentor.id);
          assert.equal(mentor.status, 'ACTIVE');
          mentors.push(mentor);
        }
        const other = await api(
          adminContext,
          'POST',
          '/admin/users',
          {
            email: otherEmail,
            password: fixturePassword,
            displayName: `${label} other`,
            role: 'STUDENT',
          },
          201,
        );
        summary.fixtures.mentors = mentors.map((mentor) => mentor.id);
        summary.fixtures.otherStudent = realId(other.id);
      },
    );
    await step(
      'Create category, inactive course, units, reorder and activate using real UUIDs',
      async () => {
        category = await api(
          adminContext,
          'POST',
          '/admin/course-categories',
          { name: label, slug: `live-audit-${runId}` },
          201,
        );
        course = await api(
          adminContext,
          'POST',
          '/admin/courses',
          {
            categoryId: realId(category.id),
            code: `LIVE-${runId}`,
            title: `${label} course`,
            description: 'Live isolated backend integration course.',
            priceAmount: 900_000,
          },
          201,
        );
        assert.equal(course.isActive, false);
        const units = [];
        for (const index of [1, 2, 3])
          units.push(
            await api(
              adminContext,
              'POST',
              `/admin/courses/${realId(course.id)}/units`,
              {
                title: `${label} unit ${index}`,
                description: index === 2 ? 'Live syllabus content.\n'.repeat(100) : '',
                requiredScorePercent: 80,
              },
              201,
            ),
          );
        const unitIds = [realId(units[1].id), realId(units[0].id), realId(units[2].id)];
        course = await api(adminContext, 'PUT', `/admin/courses/${course.id}/units/order`, {
          unitIds,
        });
        assert.deepEqual(
          course.units.map((unit) => unit.id),
          unitIds,
        );
        course = await api(adminContext, 'POST', `/admin/courses/${course.id}/activate`);
        assert.equal(course.isActive, true);
        summary.fixtures.category = category.id;
        summary.fixtures.course = course.id;
        summary.fixtures.courseUnits = course.units.map((unit) => unit.id);
        await adminPage.goto(
          `${baseUrl}/management/courses/${course.id}?unitId=${course.units[0].id}`,
        );
        await expect(
          adminPage.getByRole('heading', { name: course.units[0].title, exact: true }),
        ).toBeVisible();
        await capture(adminPage, 'admin-course-unit');
      },
    );
    await step('Create four classes, schedule using class-unit UUIDs, and open', async () => {
      const calendar = (days) =>
        new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
      classItems = [];
      for (const index of [0, 1, 2, 3]) {
        let item = await api(
          adminContext,
          'POST',
          '/admin/classes',
          {
            courseId: course.id,
            mentorId: mentors[index % 2].id,
            code: `LIVE-${runId}-${index + 1}`,
            name: `${label} class ${index + 1}`,
            startDate: calendar(30),
            endDate: calendar(60),
            deliveryMode: index % 2 === 0 ? 'ONLINE' : 'OFFLINE',
            maxStudents: 8,
            ...(index % 2 === 0 ? { meetingUrl: 'https://example.test/live-private-meeting' } : {}),
          },
          201,
        );
        realId(item.id);
        assert.equal(item.status, 'DRAFT');
        assert.notEqual(item.units[0].id, course.units[0].id);
        item = await api(
          adminContext,
          'POST',
          `/admin/classes/${item.id}/sessions`,
          {
            classUnitId: realId(item.units[0].id),
            title: `${label} scheduled session ${index + 1}`,
            startsAt: `${calendar(31 + Math.floor(index / 2))}T19:00:00+07:00`,
            endsAt: `${calendar(31 + Math.floor(index / 2))}T20:00:00+07:00`,
            roomName: index % 2 ? 'Live room' : undefined,
            meetingUrl: index % 2 === 0 ? 'https://example.test/live-private-session' : undefined,
          },
          201,
        );
        item = await api(adminContext, 'POST', `/admin/classes/${item.id}/open`);
        assert.equal(item.status, 'OPEN');
        classItems.push(item);
      }
      summary.fixtures.classes = classItems.map((item) => item.id);
      await adminPage.goto(
        `${baseUrl}/management/classes/${classItems[0].id}?unitId=${classItems[0].units[0].id}`,
      );
      await expect(
        adminPage.getByRole('heading', { name: classItems[0].name, exact: true, level: 1 }),
      ).toBeVisible();
      await expect(
        adminPage.getByText(`${label} scheduled session 1`, { exact: false }),
      ).toBeVisible();
      await capture(adminPage, 'admin-class');
    });
    await step(
      mailpitUrl
        ? 'Public register, SMTP delivery, explicit UI verification and session'
        : 'Create main STUDENT fixture (registration/SMTP skipped)',
      async () => {
        if (mailpitUrl) {
          await studentPage.goto(`${baseUrl}/register`);
          await studentPage.getByLabel('Họ tên', { exact: true }).fill(`${label} student`);
          await studentPage.getByLabel('Email', { exact: true }).fill(studentEmail);
          await studentPage.getByLabel('Mật khẩu', { exact: true }).fill(fixturePassword);
          await studentPage.getByRole('button', { name: 'Đăng ký', exact: true }).click();
          await expect(studentPage.getByRole('status')).toContainText(studentEmail);
          const link = await verificationLink(studentEmail);
          await studentPage.goto(link);
          await expect(
            studentPage.getByRole('button', { name: 'Xác thực email', exact: true }),
          ).toBeVisible();
          await api(studentContext, 'GET', '/auth/me', undefined, 401);
          await studentPage.getByRole('button', { name: 'Xác thực email', exact: true }).click();
          await expect(studentPage).toHaveURL(`${baseUrl}/account`);
          const identity = await api(studentContext, 'GET', '/auth/me');
          assert.equal(identity.status, 'ACTIVE');
          assert.equal(identity.role, 'STUDENT');
          summary.fixtures.student = realId(identity.id);
          await capture(studentPage, 'verified-account');
          await api(studentContext, 'POST', '/auth/logout', undefined, 204);
        } else {
          const identity = await api(
            adminContext,
            'POST',
            '/admin/users',
            {
              email: studentEmail,
              password: fixturePassword,
              displayName: `${label} student`,
              role: 'STUDENT',
            },
            201,
          );
          summary.fixtures.student = realId(identity.id);
        }
      },
    );
    await step(
      'Anonymous public filters, course syllabus, class timetable and private-field omission',
      async () => {
        const publicCourse = await api(publicContext, 'GET', `/courses/${course.id}`);
        assert.equal(publicCourse.priceAmount, course.priceAmount);
        assert.equal(publicCourse.units.length, 3);
        const publicClass = await api(publicContext, 'GET', `/classes/${classItems[0].id}`);
        const payload = JSON.stringify(publicClass);
        assert(
          !payload.includes('meetingUrl') &&
            !payload.includes('live-private') &&
            !payload.includes('unlockAt'),
        );
        const filter = `categoryId=${category.id}&deliveryMode=ONLINE&page=1&pageSize=1`;
        await publicPage.goto(`${baseUrl}/courses?${filter}`);
        await expect(
          publicPage.getByRole('heading', { name: course.title, exact: true, level: 3 }),
        ).toBeVisible();
        await capture(publicPage, 'courses');
        await publicPage.goto(`${baseUrl}/courses/${course.id}/units/${course.units[0].id}`);
        await expect(
          publicPage.getByRole('heading', { name: course.units[0].title, exact: true }),
        ).toBeVisible();
        await expect(publicPage.locator('[data-unit-content]')).toContainText(
          'Live syllabus content.',
        );
        await capture(publicPage, 'public-unit');
        await expect
          .poll(() =>
            publicPage
              .locator('[data-unit-content]')
              .evaluate((element) => element.scrollHeight > element.clientHeight),
          )
          .toBe(true);
        await publicPage.locator('[data-unit-content]').focus();
        await publicPage.keyboard.press('PageDown');
        await expect
          .poll(() =>
            publicPage.locator('[data-unit-content]').evaluate((element) => element.scrollTop),
          )
          .toBeGreaterThan(0);
        await publicPage.setViewportSize({ width: 390, height: 1000 });
        const syllabusTrigger = publicPage.getByRole('button', {
          name: 'Nội dung khóa học',
          exact: true,
        });
        await syllabusTrigger.click();
        await expect(
          publicPage.getByRole('dialog', { name: 'Nội dung khóa học', exact: true }),
        ).toBeVisible();
        const drawerFilename = 'live-local-public-unit-drawer-390.png';
        await publicPage.screenshot({
          path: path.join(outputDirectory, drawerFilename),
          fullPage: true,
        });
        summary.screenshots.push(drawerFilename);
        await publicPage.keyboard.press('Escape');
        await expect(publicPage.getByRole('dialog')).toHaveCount(0);
        await expect(syllabusTrigger).toBeFocused();
        await publicPage.setViewportSize({ width: 1440, height: 1000 });
        await publicPage.goto(
          `${baseUrl}/classes/${classItems[0].id}?unitId=${classItems[0].units[0].id}`,
        );
        await expect(
          publicPage.getByRole('heading', { name: classItems[0].name, exact: true, level: 1 }),
        ).toBeVisible();
        await expect(publicPage.locator('[data-unit-content]')).toContainText(
          `${label} scheduled session 1`,
        );
        await capture(publicPage, 'public-class');
      },
    );
    await step(
      'Anonymous login return preserves unit, access-cookie loss recovers same student, then add/remove/cart',
      async () => {
        const destination = `/classes/${classItems[0].id}?unitId=${classItems[0].units[0].id}`;
        await studentPage.goto(`${baseUrl}${destination}`);
        await studentPage
          .getByRole('link', { name: 'Đăng nhập để thêm vào giỏ', exact: true })
          .click();
        await expect(studentPage).toHaveURL(/\/login\?next=/);
        assert.equal(new URL(studentPage.url()).searchParams.get('next'), destination);
        await studentPage.getByLabel('Email', { exact: true }).fill(studentEmail);
        await studentPage.getByLabel('Mật khẩu', { exact: true }).fill(fixturePassword);
        await studentPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await expect(studentPage).toHaveURL(`${baseUrl}${destination}`);
        // Delete only the test context's access cookie; HttpOnly refresh credentials stay unread.
        await studentContext.clearCookies({ name: 'access_token' });
        await api(studentContext, 'GET', '/auth/me', undefined, 401);
        const refresh = studentPage.waitForResponse(
          (response) =>
            response.url().endsWith('/api/v1/auth/refresh') &&
            response.request().method() === 'POST',
        );
        await studentPage.reload();
        assert.equal((await refresh).status(), 200);
        await expect(
          studentPage.getByRole('button', { name: 'Thêm vào giỏ', exact: true }),
        ).toBeEnabled();
        assert.equal((await api(studentContext, 'GET', '/auth/me')).id, summary.fixtures.student);
        await studentPage.getByRole('button', { name: 'Thêm vào giỏ', exact: true }).click();
        await expect(
          studentPage.getByRole('link', { name: 'Đã có trong giỏ · Xem giỏ', exact: true }),
        ).toBeVisible();
        let cart = await api(studentContext, 'GET', '/me/cart');
        assert.deepEqual(
          cart.items.map((item) => item.classId),
          [classItems[0].id],
        );
        await studentPage.goto(`${baseUrl}/cart`);
        await expect(
          studentPage.getByRole('article', { name: classItems[0].name, exact: true }),
        ).toBeVisible();
        await capture(studentPage, 'cart');
        await studentPage
          .getByRole('button', { name: `Xóa ${classItems[0].name} khỏi giỏ`, exact: true })
          .click();
        await expect(
          studentPage.getByRole('heading', { name: 'Chọn một lớp để bắt đầu.', exact: true }),
        ).toBeVisible();
        cart = await api(studentContext, 'GET', '/me/cart');
        assert.equal(cart.items.length, 0);
      },
    );
    await step(
      'CASH UI checkout creates every mentor split order with server snapshots',
      async () => {
        for (const item of classItems.slice(0, 2))
          await api(studentContext, 'POST', '/me/cart/items', { classId: item.id }, 201);
        await studentPage.goto(`${baseUrl}/checkout`);
        await expect(
          studentPage.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }),
        ).toBeEnabled();
        await capture(studentPage, 'checkout');
        const receipt = studentPage.waitForResponse(
          (response) =>
            response.url().endsWith('/api/v1/me/cart/checkout') &&
            response.request().method() === 'POST',
        );
        await studentPage.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
        const response = await receipt;
        assert.equal(response.status(), 201);
        cashOrders = (await response.json()).orders;
        assert.equal(cashOrders.length, 2);
        assert.deepEqual(
          new Set(cashOrders.map((order) => order.mentorId)),
          new Set(mentors.map((mentor) => mentor.id)),
        );
        for (const order of cashOrders) {
          assert.equal(order.status, 'PENDING');
          assert.equal(order.paymentType, 'CASH');
          assert.equal(order.totalAmount, course.priceAmount);
          await expect(
            studentPage.getByRole('article', { name: `Đơn ${order.orderCode}`, exact: true }),
          ).toBeVisible();
        }
        assert.equal((await api(studentContext, 'GET', '/me/cart')).items.length, 0);
        summary.fixtures.cashOrders = cashOrders.map((order) => realId(order.id));
        await capture(studentPage, 'cash-receipts');
      },
    );
    await step('PAYOS UI checkout returns one pending order for two other classes', async () => {
      for (const item of classItems.slice(2))
        await api(studentContext, 'POST', '/me/cart/items', { classId: item.id }, 201);
      await studentPage.goto(`${baseUrl}/checkout`);
      await studentPage.getByRole('radio', { name: /PayOS/ }).check();
      const receipt = studentPage.waitForResponse(
        (response) =>
          response.url().endsWith('/api/v1/me/cart/checkout') &&
          response.request().method() === 'POST',
      );
      await studentPage.getByRole('button', { name: 'Tạo đơn giữ chỗ', exact: true }).click();
      const response = await receipt;
      assert.equal(response.status(), 201);
      payosOrders = (await response.json()).orders;
      assert.equal(payosOrders.length, 1);
      assert.equal(payosOrders[0].paymentType, 'PAYOS');
      assert.equal(payosOrders[0].status, 'PENDING');
      assert.equal(payosOrders[0].mentorId, null);
      assert.equal(payosOrders[0].details.length, 2);
      assert.equal(payosOrders[0].totalAmount, course.priceAmount * 2);
      await expect(
        studentPage.getByRole('article', { name: `Đơn ${payosOrders[0].orderCode}`, exact: true }),
      ).toBeVisible();
      await expect(
        studentPage.getByRole('link', { name: /Thanh toán ngay|Mở PayOS|Hủy đơn/ }),
      ).toHaveCount(0);
      assert.equal((await api(studentContext, 'GET', '/me/cart')).items.length, 0);
      summary.fixtures.payosOrders = payosOrders.map((order) => realId(order.id));
      await capture(studentPage, 'payos-receipt');
    });
    await step('Own order list/status pagination/detail and backend ownership 403', async () => {
      const orders = await api(
        studentContext,
        'GET',
        '/me/orders?status=PENDING&page=1&pageSize=1',
      );
      assert.equal(orders.total, 3);
      assert.equal(orders.items.length, 1);
      await studentPage.goto(`${baseUrl}/orders?status=PENDING&pageSize=1&page=1`);
      await expect(studentPage.getByRole('article')).toHaveCount(1);
      await studentPage.getByRole('button', { name: 'Sau', exact: true }).click();
      await expect(studentPage).toHaveURL(/page=2/);
      await expect(studentPage.getByRole('article')).toHaveCount(1);
      await capture(studentPage, 'orders');
      await studentPage.goto(`${baseUrl}/orders/${cashOrders[0].id}`);
      await expect(
        studentPage.getByRole('article', { name: `Đơn ${cashOrders[0].orderCode}`, exact: true }),
      ).toBeVisible();
      await expect(studentPage.getByRole('timer')).toBeVisible();
      await capture(studentPage, 'order-detail');
      await loginUi(otherPage, otherEmail, fixturePassword);
      const denied = await api(
        otherContext,
        'GET',
        `/me/orders/${cashOrders[0].id}`,
        undefined,
        403,
      );
      assert.equal(denied.code, 'ORDER_ACCESS_DENIED');
      await otherPage.goto(`${baseUrl}/orders/${cashOrders[0].id}`);
      await expect(otherPage.locator('.error-panel[role="alert"]')).toContainText(
        'Bạn không có quyền xem đơn đăng ký này.',
      );
      await expect(otherPage.getByRole('article')).toHaveCount(0);
      await api(studentContext, 'GET', '/admin/users', undefined, 403);
    });
    if (verifyExpiry) {
      await step(
        'Live PayOS deadline becomes server EXPIRED, releases seats and permits adding again',
        async () => {
          const order = payosOrders[0];
          assert(
            Date.parse(order.expiresAt) - Date.parse(order.createdAt) <= 120_000,
            'Expiry smoke requires ORDER_PAYOS_HOLD_TTL_SECONDS between 60 and 120.',
          );
          await studentPage.goto(`${baseUrl}/orders/${order.id}`);
          await expect(
            studentPage.getByRole('article', { name: `Đơn ${order.orderCode}`, exact: true }),
          ).toBeVisible();
          await expect
            .poll(async () => (await api(studentContext, 'GET', `/me/orders/${order.id}`)).status, {
              timeout: 140_000,
              intervals: [1000, 2000, 5000],
            })
            .toBe('EXPIRED');
          // UI polls the backend after the deadline rather than changing status from its own clock.
          await expect(studentPage.getByRole('status')).toContainText(
            'Đơn đã hết hạn theo hệ thống.',
            { timeout: 40_000 },
          );
          await expect(studentPage.getByRole('timer')).toHaveCount(0);
          for (const item of classItems.slice(2)) {
            const refreshed = await api(publicContext, 'GET', `/classes/${item.id}`);
            assert.equal(refreshed.availableSeats, item.maxStudents);
          }
          await api(studentContext, 'POST', '/me/cart/items', { classId: classItems[2].id }, 201);
          assert.deepEqual(
            (await api(studentContext, 'GET', '/me/cart')).items.map((item) => item.classId),
            [classItems[2].id],
          );
          await api(studentContext, 'DELETE', `/me/cart/items/${classItems[2].id}`, undefined, 204);
          summary.fixtures.expiredOrder = order.id;
          await capture(studentPage, 'expired-order');
        },
      );
    }
    await step(
      'UI logout clears session and protected order/cart return requires login',
      async () => {
        await studentPage.getByRole('button', { name: 'Đăng xuất', exact: true }).first().click();
        await expect(studentPage).toHaveURL(`${baseUrl}/login`);
        await api(studentContext, 'GET', '/auth/me', undefined, 401);
        await studentPage.goto(`${baseUrl}/orders/${cashOrders[0].id}`);
        await expect(studentPage).toHaveURL(/\/login\?next=/);
        await expect(studentPage.getByRole('article')).toHaveCount(0);
        await studentPage.goto(`${baseUrl}/cart`);
        await expect(studentPage).toHaveURL(/\/login\?next=/);
        await expect(studentPage.getByRole('article')).toHaveCount(0);
      },
    );
    summary.status = 'passed';
  } finally {
    await browser.close();
  }
}

function formatSummary(outputFile) {
  const formatted = spawnSync(
    process.execPath,
    [
      fileURLToPath(import.meta.resolve('@biomejs/biome/bin/biome')),
      'format',
      '--stdin-file-path',
      path.relative(projectRoot, outputFile),
    ],
    {
      cwd: projectRoot,
      input: `${JSON.stringify(summary, null, 2)}\n`,
      encoding: 'utf8',
      timeout: 10_000,
      maxBuffer: 1_048_576,
    },
  );
  if (formatted.error || formatted.status !== 0 || !formatted.stdout.trim()) {
    throw new Error(
      `Could not format the live summary with installed Biome: ${safeFailure(formatted.error ?? formatted.stderr ?? `exit ${formatted.status}`)}`,
    );
  }
  return formatted.stdout;
}

try {
  await main();
} catch (error) {
  summary.status = 'failed';
  summary.failure = safeFailure(error);
  process.exitCode = 1;
} finally {
  summary.finishedAt = new Date().toISOString();
  await mkdir(outputDirectory, { recursive: true });
  const outputFile = path.join(outputDirectory, 'live-local-smoke-summary.json');
  await writeFile(outputFile, formatSummary(outputFile));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Live summary: ${outputFile}`);
}
