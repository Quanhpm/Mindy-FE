'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { errorMessage } from '@/shared/lib/http/api-error';
import { homeForRole } from '../permissions/access-policy';
import { useSession } from '../session/session-provider';

export function VerifyEmailForm({ token }: { token: string | null }) {
  const { confirmEmail } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string>();
  const valid = token !== null && token.length >= 32 && token.length <= 512;
  async function verify() {
    if (!valid || pending || success) return;
    setPending(true);
    setError(undefined);
    try {
      const user = await confirmEmail(token);
      setSuccess(true);
      router.replace(homeForRole(user.role));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="form-stack">
      <p>
        {valid
          ? 'Nhấn xác thực để kích hoạt tài khoản và đăng nhập.'
          : 'Liên kết xác thực thiếu token hoặc không hợp lệ. Vui lòng mở đầy đủ liên kết trong email.'}
      </p>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {success && <p role="status">Email đã được xác thực. Đang chuyển trang…</p>}
      {valid && (
        <button
          className="button button-primary button-full"
          type="button"
          onClick={verify}
          disabled={pending || success}
        >
          {pending ? 'Đang xác thực…' : 'Xác thực email'}
        </button>
      )}
      <Link href="/register">Đăng ký / gửi lại email xác thực</Link>
      <Link href="/login">Về trang đăng nhập</Link>
    </div>
  );
}
