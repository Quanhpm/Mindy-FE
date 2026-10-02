'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FormError } from '@/shared/components/feedback';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Icon } from '@/shared/ui/icon';
import { homeForRole, safeReturnTo } from '../permissions/access-policy';
import { type LoginInput, loginSchema } from '../schemas/login.schema';
import { useSession } from '../session/session-provider';

export function LoginForm() {
  const { signIn, user, state } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    if (state === 'authenticated' && user) {
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(safeReturnTo(next, homeForRole(user.role)));
    }
  }, [user, state, router]);

  async function submit(values: LoginInput): Promise<void> {
    setError(undefined);
    try {
      await signIn(values);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="form-stack" noValidate>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="ban@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby="email-error"
          {...register('email')}
        />
        <div id="email-error">
          <FormError message={errors.email?.message} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="password">Mật khẩu</label>
        <div className="password-field">
          <input
            id="password"
            type={visible ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Nhập mật khẩu của bạn"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-error"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
        <div id="password-error">
          <FormError message={errors.password?.message} />
        </div>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        <Icon name="arrow" size={18} />
      </button>
      <p className="form-help">
        Chưa có tài khoản? <Link href="/register">Đăng ký ngay</Link>
      </p>
    </form>
  );
}
