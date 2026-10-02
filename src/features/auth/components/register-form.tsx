'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/shared/components/feedback';
import { errorMessage } from '@/shared/lib/http/api-error';
import { registerAccount, resendVerification } from '../api/auth.browser';
import { type RegisterInput, registerSchema } from '../schemas/register.schema';

export function RegisterForm() {
  const [email, setEmail] = useState<string>();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [sending, setSending] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });
  async function submit(input: RegisterInput) {
    setError(undefined);
    try {
      await registerAccount(input);
      setEmail(input.email);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  async function resend() {
    if (!email) return;
    setSending(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await resendVerification(email);
      setNotice('Đã yêu cầu gửi lại email. Vui lòng kiểm tra cả thư rác.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSending(false);
    }
  }
  if (email)
    return (
      <div className="form-stack">
        <p role="status">
          Nếu địa chỉ {email} có thể đăng ký, hệ thống đã gửi email xác thực. Hãy mở liên kết trong
          email để hoàn tất.
        </p>
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div className="inline-error" role="alert">
            {error}
          </div>
        )}
        <button type="button" className="button button-primary" disabled={sending} onClick={resend}>
          {sending ? 'Đang gửi…' : 'Gửi lại email xác thực'}
        </button>
        <Link href="/login">Về trang đăng nhập</Link>
      </div>
    );
  return (
    <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
      {(
        [
          ['displayName', 'Họ tên', 'text', 'name'],
          ['email', 'Email', 'email', 'email'],
          ['phone', 'Số điện thoại (tùy chọn)', 'tel', 'tel'],
          ['password', 'Mật khẩu', 'password', 'new-password'],
        ] as const
      ).map(([name, label, type, autoComplete]) => (
        <div className="field" key={name}>
          <label htmlFor={name}>{label}</label>
          <input
            id={name}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={`${name}-error`}
            {...register(name)}
          />
          <div id={`${name}-error`}>
            <FormError message={errors[name]?.message} />
          </div>
        </div>
      ))}
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      <button className="button button-primary button-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Đang đăng ký…' : 'Đăng ký'}
      </button>
      <p className="form-help">
        Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
      </p>
    </form>
  );
}
