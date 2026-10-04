import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from './browser';

afterEach(() => vi.unstubAllGlobals());

describe('browser request deadline', () => {
  it('keeps the request deadline when a consumer supplies a cancellation signal', async () => {
    const owner = new AbortController();
    const deadline = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(deadline.signal);
    const fetcher = vi.fn(
      (_path: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Timed out', 'TimeoutError')),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    const result = request('/me/cart/checkout', {
      method: 'POST',
      body: '{"paymentType":"CASH"}',
      signal: owner.signal,
    });
    deadline.abort();
    await expect(result).rejects.toMatchObject({ status: 503, code: 'API_UNAVAILABLE' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(owner.signal.aborted).toBe(false);
    vi.restoreAllMocks();
  });
  it('preserves caller cancellation instead of reporting a network error', async () => {
    const owner = new AbortController();
    const cancellation = new DOMException('Cancelled', 'AbortError');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_path: string, options: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            options.signal?.addEventListener('abort', () => reject(cancellation), { once: true });
          }),
      ),
    );
    const result = request('/me/orders', { signal: owner.signal });
    owner.abort();
    await expect(result).rejects.toBe(cancellation);
  });
});
