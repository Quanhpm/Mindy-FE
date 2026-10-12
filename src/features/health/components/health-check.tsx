'use client';

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { request } from '@/shared/lib/http/browser';

const healthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.iso.datetime(),
});

export function HealthCheck() {
  const locked = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function checkHealth(): Promise<void> {
    if (locked.current) return;
    const active = new AbortController();
    controller.current = active;
    locked.current = true;
    setLoading(true);
    setMessage('');
    try {
      const health = healthSchema.parse(await request('/health/live', { signal: active.signal }));
      if (active.signal.aborted) return;
      setMessage(`Backend đang hoạt động · ${new Date(health.timestamp).toLocaleString('vi-VN')}`);
    } catch {
      if (active.signal.aborted) return;
      setMessage('Không thể kiểm tra hệ thống. Vui lòng thử lại.');
    } finally {
      locked.current = false;
      if (!active.signal.aborted) setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="button button-secondary"
        disabled={loading}
        onClick={checkHealth}
      >
        {loading ? 'Đang kiểm tra…' : 'Kiểm tra hệ thống'}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
