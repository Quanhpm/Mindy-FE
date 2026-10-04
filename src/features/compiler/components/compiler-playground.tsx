'use client';

import { useRef, useState } from 'react';
import { runCode } from '../api/compiler.browser';
import { type RunResult, runInputSchema } from '../schemas/compiler.schema';
import styles from './compiler-playground.module.css';

const examples = {
  hello: 'console.log("Hello, Mindy!");',
  stdin:
    "const fs = require('node:fs');\nconst numbers = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(numbers.reduce((sum, n) => sum + n, 0));",
  error: 'throw new Error("Test runtime error");',
};
const statusLabels: Record<RunResult['status'], string> = {
  success: 'Thành công',
  user_error: 'Lỗi chương trình',
  timeout: 'Hết thời gian',
  output_limit: 'Vượt giới hạn output',
  infrastructure_error: 'Runner chưa sẵn sàng',
  busy: 'Runner đang bận',
  rejected: 'Yêu cầu không hợp lệ',
};

export function CompilerPlayground() {
  const [code, setCode] = useState(examples.hello);
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const lock = useRef(false);
  const codeBytes = new TextEncoder().encode(code).length;
  const stdinBytes = new TextEncoder().encode(stdin).length;
  async function run() {
    if (lock.current) return;
    const parsed = runInputSchema.safeParse({ code, stdin });
    if (!parsed.success) {
      setResult({
        ok: false,
        status: 'rejected',
        errors: parsed.error.issues.map((issue) => issue.message),
      });
      return;
    }
    lock.current = true;
    setRunning(true);
    setResult(null);
    try {
      setResult(await runCode(parsed.data));
    } catch {
      setResult({
        ok: false,
        status: 'infrastructure_error',
        error: 'Không nhận được kết quả từ compiler. Vui lòng thử lại.',
      });
    } finally {
      lock.current = false;
      setRunning(false);
    }
  }
  return (
    <div className={styles.playground}>
      <div className={styles.toolbar}>
        <label htmlFor="compiler-example">Code mẫu</label>
        <select
          id="compiler-example"
          disabled={running}
          defaultValue="hello"
          onChange={(event) => {
            const name = event.target.value as keyof typeof examples;
            setCode(examples[name]);
            setStdin(name === 'stdin' ? '2 3 5' : '');
            setResult(null);
          }}
        >
          <option value="hello">Hello Mindy</option>
          <option value="stdin">Tính tổng từ stdin</option>
          <option value="error">Lỗi runtime</option>
        </select>
        <span>JavaScript · Node 22 · CommonJS</span>
      </div>
      <div className={styles.editors}>
        <section className={styles.panel}>
          <label htmlFor="compiler-code">Code JavaScript</label>
          <textarea
            id="compiler-code"
            spellCheck={false}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                void run();
              }
            }}
          />
          <small>{codeBytes.toLocaleString()} / 65,536 bytes</small>
        </section>
        <section className={styles.panel}>
          <label htmlFor="compiler-stdin">stdin (tùy chọn)</label>
          <textarea
            id="compiler-stdin"
            spellCheck={false}
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            placeholder="Nhập dữ liệu đầu vào…"
          />
          <small>{stdinBytes.toLocaleString()} / 32,768 bytes</small>
        </section>
      </div>
      <div className={styles.toolbar}>
        <button
          type="button"
          className="button button-primary"
          disabled={running}
          onClick={() => void run()}
        >
          {running ? 'Đang chạy…' : 'Chạy code'}
        </button>
        <span>Ctrl / Cmd + Enter · Giới hạn 4 giây</span>
      </div>
      <section className={styles.result} aria-label="Kết quả compiler" aria-busy={running}>
        <h2>Kết quả</h2>
        <p role="status">
          {running
            ? 'Đang chờ compiler…'
            : result
              ? statusLabels[result.status]
              : 'Chạy code để xem kết quả.'}
        </p>
        {result && (
          <>
            {(result.error || result.errors?.length) && (
              <p role="alert">{result.error || result.errors?.join(' ')}</p>
            )}
            <div className={styles.editors}>
              <div>
                <h3>stdout</h3>
                <pre>{result.stdout || '(không có output)'}</pre>
              </div>
              <div>
                <h3>stderr</h3>
                <pre>{result.stderr || '(không có lỗi)'}</pre>
              </div>
            </div>
            <p>
              Exit code: {result.exitCode ?? '—'} · Thời gian:{' '}
              {result.durationMs === undefined ? '—' : `${result.durationMs} ms`}
            </p>
            {result.truncated && (
              <p role="alert">Output đã bị cắt vì vượt giới hạn 64 KiB mỗi luồng.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
