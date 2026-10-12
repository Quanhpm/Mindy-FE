'use client';

import { useEffect, useRef, useState } from 'react';
import { runCode } from '../api/compiler.browser';
import { type RunResult, runInputSchema } from '../schemas/compiler.schema';
import styles from './compiler-playground.module.css';

const examples = {
  hello: 'console.log("Xin chào, Mindy!");',
  stdin:
    "const fs = require('node:fs');\nconst numbers = fs.readFileSync(0, 'utf8').trim().split(/\\s+/).map(Number);\nconsole.log(numbers.reduce((sum, n) => sum + n, 0));",
  error: 'throw new Error("Lỗi khi chạy thử");',
};
const statusLabels: Record<RunResult['status'], string> = {
  success: 'Thành công',
  user_error: 'Lỗi chương trình',
  timeout: 'Hết thời gian',
  output_limit: 'Vượt giới hạn đầu ra',
  infrastructure_error: 'Hệ thống chạy mã chưa sẵn sàng',
  busy: 'Hệ thống chạy mã đang bận',
  rejected: 'Yêu cầu không hợp lệ',
};

export function CompilerPlayground() {
  const [code, setCode] = useState(examples.hello);
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
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
    const active = new AbortController();
    controller.current = active;
    lock.current = true;
    setRunning(true);
    setResult(null);
    try {
      const output = await runCode(parsed.data, active.signal);
      if (!active.signal.aborted) setResult(output);
    } catch {
      if (active.signal.aborted) return;
      setResult({
        ok: false,
        status: 'infrastructure_error',
        error: 'Không nhận được kết quả từ trình chạy mã. Vui lòng thử lại.',
      });
    } finally {
      lock.current = false;
      if (!active.signal.aborted) setRunning(false);
    }
  }
  return (
    <div className={styles.playground}>
      <div className={styles.toolbar}>
        <label htmlFor="compiler-example">Mã nguồn mẫu</label>
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
          <option value="hello">Xin chào Mindy</option>
          <option value="stdin">Tính tổng từ dữ liệu đầu vào</option>
          <option value="error">Lỗi khi chạy</option>
        </select>
        <span>JavaScript · Node 22 · CommonJS</span>
      </div>
      <div className={styles.editors}>
        <section className={styles.panel}>
          <label htmlFor="compiler-code">Mã nguồn JavaScript</label>
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
          <small>{codeBytes.toLocaleString('vi-VN')} / 65.536 byte</small>
        </section>
        <section className={styles.panel}>
          <label htmlFor="compiler-stdin">Dữ liệu đầu vào (tùy chọn)</label>
          <textarea
            id="compiler-stdin"
            spellCheck={false}
            value={stdin}
            onChange={(event) => setStdin(event.target.value)}
            placeholder="Nhập dữ liệu đầu vào…"
          />
          <small>{stdinBytes.toLocaleString('vi-VN')} / 32.768 byte</small>
        </section>
      </div>
      <div className={styles.toolbar}>
        <button
          type="button"
          className="button button-primary"
          disabled={running}
          onClick={() => void run()}
        >
          {running ? 'Đang chạy…' : 'Chạy mã nguồn'}
        </button>
        <span>Ctrl / Cmd + Enter · Giới hạn 4 giây</span>
      </div>
      <section className={styles.result} aria-label="Kết quả trình chạy mã" aria-busy={running}>
        <h2>Kết quả</h2>
        <p role="status">
          {running
            ? 'Đang chờ trình chạy mã…'
            : result
              ? statusLabels[result.status]
              : 'Chạy mã nguồn để xem kết quả.'}
        </p>
        {result && (
          <>
            {(result.error || result.errors?.length) && (
              <p role="alert">{result.error || result.errors?.join(' ')}</p>
            )}
            <div className={styles.editors}>
              <div>
                <h3>Kết quả đầu ra</h3>
                <pre>{result.stdout || '(không có đầu ra)'}</pre>
              </div>
              <div>
                <h3>Thông báo lỗi</h3>
                <pre>{result.stderr || '(không có lỗi)'}</pre>
              </div>
            </div>
            <p>
              Mã thoát: {result.exitCode ?? '—'} · Thời gian:{' '}
              {result.durationMs === undefined ? '—' : `${result.durationMs} ms`}
            </p>
            {result.truncated && (
              <p role="alert">Kết quả đầu ra đã bị cắt vì vượt giới hạn 64 KiB mỗi luồng.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
