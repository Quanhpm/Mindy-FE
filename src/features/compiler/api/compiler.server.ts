import 'server-only';
import { runInputSchema, runResultSchema } from '../schemas/compiler.schema';

export async function forwardCompiler(request: Request): Promise<Response> {
  const failure = (status: number, message: string) =>
    Response.json(
      { ok: false, status: 'rejected', error: message },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  const origin = process.env.APP_ORIGIN || new URL(request.url).origin;
  if (request.headers.get('origin') !== origin)
    return failure(403, 'Nguồn gửi yêu cầu không được phép.');

  if (
    request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json'
  )
    return failure(415, 'Yêu cầu phải có định dạng JSON.');

  let payload: unknown;
  const reader = request.body?.getReader();
  try {
    if (!reader) return failure(400, 'Thiếu nội dung yêu cầu.');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 128 * 1024) {
        await reader.cancel();
        return failure(413, 'Nội dung yêu cầu vượt quá 128 KiB.');
      }
      chunks.push(chunk.value);
    }
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return failure(400, 'Nội dung yêu cầu phải là JSON hợp lệ.');
  } finally {
    reader?.releaseLock();
  }
  const input = runInputSchema.safeParse(payload);
  if (!input.success)
    return failure(400, input.error.issues.map((issue) => issue.message).join(' '));
  try {
    const base = new URL(process.env.COMPILER_API_URL || 'http://127.0.0.1:4000');
    if (
      !['http:', 'https:'].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    )
      throw new Error('Invalid runner configuration');
    const upstream = await fetch(new URL('/api/code/run', base), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input.data),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    });
    const result = runResultSchema.parse(await upstream.json());
    return Response.json(result, {
      status: upstream.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        status: 'infrastructure_error',
        error: 'Không thể kết nối hệ thống chạy mã. Vui lòng thử lại sau.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
