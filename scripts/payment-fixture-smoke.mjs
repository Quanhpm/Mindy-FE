import assert from 'node:assert/strict';
import { fork, spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const feRoot = fileURLToPath(new URL('../', import.meta.url));
const beRoot = fileURLToPath(new URL('../../Mindy-BE/', import.meta.url));
const requireBackend = createRequire(`${beRoot}package.json`);
const { DataSource } = requireBackend('typeorm');
const { PayOS } = requireBackend('@payos/node');
const testUrl = process.env.TEST_DATABASE_URL;
if (
  !testUrl ||
  !/^mindy_fe_phase22_\w*_?test$/.test(new URL(testUrl).pathname.slice(1)) ||
  !['127.0.0.1', 'localhost'].includes(new URL(testUrl).hostname)
)
  throw new Error(
    'Use a dedicated local mindy_fe_phase22_*test database in a disposable container.',
  );
const dbUrl = new URL(testUrl);
dbUrl.pathname = dbUrl.pathname.replace(/_test$/, '_http_test');
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
let backend, frontend, db;
let serverOutput = '';
try {
  backend = fork(`${beRoot}test/http/payment-server.mjs`, [], {
    cwd: beRoot,
    silent: true,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      TEST_DATABASE_URL: testUrl,
      DATABASE_URL: dbUrl.toString(),
      DATABASE_LOGGING: 'false',
      COOKIE_SECURE: 'false',
      CORS_ORIGINS: 'http://localhost:3187',
      SWAGGER_ENABLED: 'false',
      GOOGLE_AUTH_ENABLED: 'false',
      MAIL_ENABLED: 'false',
      JWT_PRIVATE_KEY_BASE64: Buffer.from(
        keys.privateKey.export({ type: 'pkcs8', format: 'pem' }),
      ).toString('base64'),
      JWT_PUBLIC_KEY_BASE64: Buffer.from(
        keys.publicKey.export({ type: 'spki', format: 'pem' }),
      ).toString('base64'),
      ORDER_EXPIRY_JOB_ENABLED: 'false',
      PAYMENT_MAIL_JOB_ENABLED: 'false',
      PAYOS_ENABLED: 'true',
      PAYOS_CREATE_LINK_ENABLED: 'true',
      PAYOS_CLIENT_ID: 'http-client',
      PAYOS_API_KEY: 'http-key',
      PAYOS_CHECKSUM_KEY: 'http-checksum',
      PAYOS_RETURN_URL: 'https://example.test/paid',
      PAYOS_CANCEL_URL: 'https://example.test/cancel',
      PAYOS_WEBHOOK_URL: 'https://example.test/webhook',
    },
  });
  backend.stdout.on('data', (chunk) => {
    serverOutput += String(chunk);
  });
  backend.stderr.on('data', (chunk) => {
    serverOutput += String(chunk);
  });
  const ready = await Promise.race([
    once(backend, 'message').then(([value]) => value),
    once(backend, 'exit').then(([code]) => {
      throw new Error(`Fixture exited ${code}: ${serverOutput}`);
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Fixture startup timed out')), 30000);
      timer.unref();
    }),
  ]);
  const origin = 'http://localhost:3187';
  frontend = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--port', '3187'],
    {
      cwd: feRoot,
      env: { ...process.env, APP_ORIGIN: origin, API_BASE_URL: `${ready.url}/api/v1` },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  frontend.stdout.on('data', (chunk) => {
    serverOutput += String(chunk);
  });
  frontend.stderr.on('data', (chunk) => {
    serverOutput += String(chunk);
  });
  let healthy = false;
  for (let count = 0; count < 100; count++) {
    try {
      healthy = (await fetch(`${origin}/api/v1/health/live`, { signal: AbortSignal.timeout(500) }))
        .ok;
    } catch {}
    if (healthy) break;
    if (frontend.exitCode !== null) throw new Error(serverOutput);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(healthy, 'FE BFF did not become ready');
  const request = (path, cookie, body) =>
    fetch(`${origin}/api/v1${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const login = async (email) => {
    const response = await request('/auth/login', undefined, {
      email,
      password: 'Http-test-password1!',
    });
    assert.equal(response.status, 200);
    const identity = await response.json();
    assert(identity.user);
    return response.headers
      .getSetCookie()
      .map((value) => value.split(';')[0])
      .join('; ');
  };
  const student = await login('student@http.test'),
    other = await login('other@http.test'),
    admin = await login('admin@http.test');
  const denied = await request(`/me/classes/${ready.classId}`, student);
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).code, 'CLASS_ACCESS_DENIED');
  assert.equal((await request('/me/cart/items', student, { classId: ready.classId })).status, 201);
  const checkout = await request('/me/cart/checkout', student, { paymentType: 'PAYOS' });
  assert.equal(checkout.status, 201);
  const { orders } = await checkout.json();
  const order = orders[0];
  assert.equal(order.status, 'PENDING');
  assert(!('payment' in order));
  const initial = await request(`/me/orders/${order.id}`, student);
  assert.equal((await initial.json()).payment, null);
  const path = `/me/orders/${order.id}/payments/payos`;
  assert.equal((await request(path, other, {})).status, 403);
  const create = await request(path, student, {});
  assert.equal(create.status, 201);
  const payment = await create.json();
  assert.equal(payment.status, 'PENDING');
  assert.equal(payment.orderId, order.id);
  const reuse = await request(path, student, {});
  assert.equal((await reuse.json()).paymentId, payment.paymentId);
  const detail = await request(`/me/orders/${order.id}`, student);
  assert.equal((await detail.json()).payment.paymentId, payment.paymentId);
  db = new DataSource({ type: 'postgres', url: dbUrl.toString() });
  await db.initialize();
  const [mapping] = await db.query(
    'SELECT payos_order_code, payment_link_id FROM payos_payment_details WHERE payment_transaction_id=$1',
    [payment.paymentId],
  );
  const sdk = new PayOS({
    clientId: 'http-client',
    apiKey: 'http-key',
    checksumKey: 'http-checksum',
    logLevel: 'off',
    logger: null,
  });
  const data = {
    orderCode: Number(mapping.payos_order_code),
    amount: 5000,
    description: 'HTTP',
    accountNumber: 'test-account',
    reference: `fe-${order.id}`,
    transactionDateTime: '2026-10-06 00:00:00',
    currency: 'VND',
    paymentLinkId: mapping.payment_link_id,
    code: '00',
    desc: 'success',
  };
  const signature = await sdk.crypto.createSignatureFromObj(data, 'http-checksum');
  const webhook = await fetch(`${ready.url}/api/v1/payment-callbacks/payos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: '00', desc: 'success', success: true, data, signature }),
  });
  assert.equal(webhook.status, 200);
  const settled = await request(`/me/orders/${order.id}`, student);
  const paid = await settled.json();
  assert.equal(paid.status, 'PAID');
  assert.equal(paid.payment.status, 'SUCCEEDED');
  assert.equal(paid.payment.checkoutUrl, null);
  const learning = await request(`/me/classes/${ready.classId}`, student);
  assert.equal(learning.status, 200);
  const privateClass = await learning.json();
  assert(privateClass.meetingUrl);
  assert(privateClass.units[0].sessions[0].meetingUrl);
  assert.equal((await request(`/me/classes/${ready.classId}`, other)).status, 403);
  assert.equal((await request('/admin/payments/reconciliation', student)).status, 403);
  assert.equal((await request('/admin/payments/reconciliation', admin)).status, 200);
  const reconcile = await request(`/admin/payments/${payment.paymentId}/reconcile`, admin, {});
  assert.equal(reconcile.status, 200);
  assert.equal((await reconcile.json()).status, 'PENDING');
  // Fake provider remains PENDING; browser/redirect cannot manufacture provider settlement.
  assert.equal((await request('/payment-callbacks/payos', student, {})).status, 404);
  console.log(
    'PASS FE BFF + real cookie guards + isolated PostgreSQL + fake PayOS: pending denial, checkout, create/reuse/ownership, signed settlement, ACTIVE private access and ADMIN reconciliation.',
  );
} finally {
  if (db?.isInitialized) await db.destroy();
  for (const child of [frontend, backend])
    if (child && child.exitCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await Promise.race([
        exited,
        new Promise((resolve) => {
          const timer = setTimeout(() => {
            child.kill('SIGKILL');
            resolve();
          }, 3000);
          timer.unref();
        }),
      ]);
    }
}
