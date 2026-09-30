import { getServerEnv } from '@/shared/config/env.server';
import { authCookies, isAllowedEndpoint, isAllowedOrigin } from '@/shared/lib/http/proxy-policy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };

async function forward(request: Request, context: Context): Promise<Response> {
  const { path: segments } = await context.params;
  const path = segments.join('/');
  const requestId = crypto.randomUUID();
  const failure = (status: number, code: string, message: string) =>
    Response.json(
      { statusCode: status, code, message, requestId },
      { status, headers: { 'Cache-Control': 'no-store', 'x-request-id': requestId } },
    );
  if (!isAllowedEndpoint(request.method, path))
    return failure(404, 'NOT_FOUND', 'Endpoint not available');
  let env: ReturnType<typeof getServerEnv>;
  try {
    env = getServerEnv();
  } catch {
    return failure(503, 'API_UNAVAILABLE', 'API configuration unavailable');
  }
  if (!isAllowedOrigin(request.method, request.headers.get('origin'), env.APP_ORIGIN)) {
    return failure(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed');
  }
  const headers = new Headers({ 'x-request-id': requestId, accept: 'application/json' });
  const cookie = authCookies(request.headers.get('cookie'), path);
  if (cookie) headers.set('cookie', cookie);
  const agent = request.headers.get('user-agent');
  if (agent) headers.set('user-agent', agent);
  let body: string | undefined;
  if (request.method !== 'GET') {
    if (Number(request.headers.get('content-length')) > 32_768)
      return failure(413, 'PAYLOAD_TOO_LARGE', 'Payload too large');
    // Enforce the limit for streaming/chunked requests as well.
    const reader = request.body?.getReader();
    if (reader) {
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > 32_768) {
          await reader.cancel();
          return failure(413, 'PAYLOAD_TOO_LARGE', 'Payload too large');
        }
        chunks.push(result.value);
      }
      body = Buffer.concat(chunks).toString('utf8') || undefined;
      if (body) headers.set('content-type', 'application/json');
    }
  }
  try {
    const url = `${env.API_BASE_URL.replace(/\/$/, '')}/${path}${new URL(request.url).search}`;
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (upstream.status >= 300 && upstream.status < 400)
      return failure(502, 'API_UNAVAILABLE', 'Unexpected API redirect');
    const responseHeaders = new Headers({
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie',
      'x-request-id': requestId,
    });
    const contentType = upstream.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);
    for (const cookieValue of upstream.headers.getSetCookie())
      responseHeaders.append('set-cookie', cookieValue);
    return new Response(upstream.status === 204 ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return failure(502, 'API_UNAVAILABLE', 'Backend is unavailable');
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
