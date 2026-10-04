import {
  type RunInput,
  type RunResult,
  runInputSchema,
  runResultSchema,
} from '../schemas/compiler.schema';

export async function runCode(input: RunInput): Promise<RunResult> {
  const payload = runInputSchema.parse(input);
  const response = await fetch('/api/v1/compiler/run', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  });
  // Runner failures (including busy/validation) have their own result contract.
  return runResultSchema.parse(await response.json());
}
