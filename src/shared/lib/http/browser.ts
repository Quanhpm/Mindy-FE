import { ApiError } from './api-error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('Expected a relative API path');
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: options.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(503, 'API_UNAVAILABLE', 'Không thể kết nối hệ thống.');
  }
  if (response.status === 204) return undefined;
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const data = isRecord(body) ? body : {};
    const message = Array.isArray(data.message)
      ? data.message.filter((item): item is string => typeof item === 'string').join(' ')
      : typeof data.message === 'string'
        ? data.message
        : 'Yêu cầu thất bại.';
    throw new ApiError(
      response.status,
      typeof data.code === 'string' ? data.code : 'HTTP_ERROR',
      message,
      typeof data.requestId === 'string' ? data.requestId : undefined,
    );
  }
  return body;
}
