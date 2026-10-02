'use client';

import { useState } from 'react';
import { z } from 'zod';
import { request } from '@/shared/lib/http/browser';

const healthSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.iso.datetime(),
});

export function HealthCheck() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function checkHealth(): Promise<void> {
    setLoading(true);
    setMessage('');
    try {
      const health = healthSchema.parse(await request('/health/live'));
      setMessage(`Backend đang hoạt động · ${new Date(health.timestamp).toLocaleString('vi-VN')}`);
    } catch {
      setMessage('Không thể kiểm tra backend. Vui lòng thử lại.');
    } finally {
      setLoading(false);
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
        {loading ? 'Đang kiểm tra…' : 'Kiểm tra backend'}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
