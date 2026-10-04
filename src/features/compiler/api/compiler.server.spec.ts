import { afterEach, describe, expect, it, vi } from 'vitest';
import { forwardCompiler } from './compiler.server';

vi.mock('server-only', () => ({}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
function request(body: unknown, origin = 'http://localhost:3001') {
  return new Request('http://localhost:3001/api/v1/compiler/run', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
describe('compiler adapter', () => {
  it('forwards code and stdin without credentials and preserves runtime errors', async () => {
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3001');
    vi.stubEnv('COMPILER_API_URL', 'http://127.0.0.1:4000');
    const result = {
      ok: false,
      status: 'user_error',
      stdout: '',
      stderr: 'SyntaxError',
      exitCode: 1,
      durationMs: 90,
      truncated: false,
    };
    const fetch = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal('fetch', fetch);
    const response = await forwardCompiler(request({ code: 'invalid code', stdin: 'input' }));
    expect(await response.json()).toEqual(result);
    const [url, options] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe('http://127.0.0.1:4000/api/code/run');
    expect(options.body).toBe(JSON.stringify({ code: 'invalid code', stdin: 'input' }));
    expect(options.headers).toEqual({ 'content-type': 'application/json' });
  });
  it('rejects foreign origins and requests exceeding UTF-8 input limits', async () => {
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3001');
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect((await forwardCompiler(request({ code: '1' }, 'https://other.example'))).status).toBe(
      403,
    );
    expect((await forwardCompiler(request({ code: 'é'.repeat(32769) }))).status).toBe(400);
    expect((await forwardCompiler(request({ code: '1', stdin: 'x'.repeat(32769) }))).status).toBe(
      400,
    );
    expect((await forwardCompiler(request({ code: 'x'.repeat(131073) }))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports unavailable or malformed runner responses', async () => {
    vi.stubEnv('APP_ORIGIN', 'http://localhost:3001');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const response = await forwardCompiler(request({ code: 'console.log(1)' }));
    expect(response.status).toBe(503);
    expect((await response.json()).status).toBe('infrastructure_error');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ unexpected: true })));
    expect((await forwardCompiler(request({ code: '1' }))).status).toBe(503);
  });
  it('allows anonymous requests on production public hosts without an identity lookup', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ORIGIN', 'https://example.com');
    vi.stubEnv('COMPILER_API_URL', 'http://compiler-runner:4000');
    const result = {
      ok: true,
      status: 'success',
      stdout: '1\n',
      stderr: '',
      exitCode: 0,
      durationMs: 10,
      truncated: false,
    };
    const fetch = vi.fn().mockResolvedValue(Response.json(result));
    vi.stubGlobal('fetch', fetch);
    const response = await forwardCompiler(
      new Request('https://example.com/api/v1/compiler/run', {
        method: 'POST',
        headers: { origin: 'https://example.com', 'content-type': 'application/json' },
        body: JSON.stringify({ code: 'console.log(1)' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(result);
    expect(fetch).toHaveBeenCalledOnce();
    expect(String(fetch.mock.calls[0]?.[0])).toBe('http://compiler-runner:4000/api/code/run');
  });
});
