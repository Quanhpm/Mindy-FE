'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LoadingState } from '@/shared/components/feedback';
import { errorMessage } from '@/shared/lib/http/api-error';
import { finalizeGoogleCallback } from '../api/auth.browser';
import { googleCallbackQuery } from '../api/google-policy';
import { googleCallbackInputSchema } from '../schemas/google-callback.schema';

export function GoogleCallbackForm() {
  const exchange = useRef<Promise<string> | null>(null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    if (!exchange.current) {
      const url = new URL(window.location.href);
      const params = googleCallbackQuery(url.searchParams);
      const input = params ? googleCallbackInputSchema.safeParse(Object.fromEntries(params)) : null;
      // Keep the one-use authorization code only in this operation's memory.
      // Strict Mode reuses the same Promise instead of exchanging it twice.
      for (const key of ['code', 'state', 'error']) url.searchParams.delete(key);
      window.history.replaceState(
        window.history.state,
        '',
        `${url.pathname}${url.search}${url.hash}`,
      );
      exchange.current = input?.success
        ? finalizeGoogleCallback(input.data)
        : Promise.reject(new Error('Invalid Google callback'));
    }
    void exchange.current
      .then((destination) => {
        if (active) window.location.replace(destination);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause));
      });
    return () => {
      active = false;
    };
  }, []);

  if (!error) return <LoadingState label="Đang hoàn tất đăng nhập Google…" />;
  return (
    <div className="form-stack">
      <p className="inline-error" role="alert">
        {error}
      </p>
      <p className="muted">Vui lòng bắt đầu lại để nhận liên kết Google mới.</p>
      <a
        className="button button-primary button-full"
        href="/api/v1/auth/google?returnTo=%2Faccount"
      >
        Tiếp tục với Google
      </a>
      <Link href="/login">Về trang đăng nhập</Link>
    </div>
  );
}
