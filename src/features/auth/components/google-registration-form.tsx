'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ErrorPanel, FormError, LoadingState } from '@/shared/components/feedback';
import { formatDate } from '@/shared/lib/date';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { Avatar } from '@/shared/ui/user-display';
import { registrationContext } from '../api/auth.browser';
import { homeForRole } from '../permissions/access-policy';
import {
  type GoogleRegistrationInput,
  googleAvatarUrl,
  googleRegistrationSchema,
  type RegistrationContext,
} from '../schemas/google-registration.schema';
import { useSession } from '../session/session-provider';

export function GoogleRegistrationForm() {
  const { completeRegistration } = useSession();
  const router = useRouter();
  const [context, setContext] = useState<RegistrationContext>();
  const [error, setError] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [revision, setRevision] = useState(0);
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoogleRegistrationInput>({
    resolver: zodResolver(googleRegistrationSchema),
    defaultValues: { displayName: '', phone: '' },
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers an explicit retry.
  useEffect(() => {
    const controller = new AbortController();
    setError(undefined);
    setExpired(false);
    void registrationContext(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setContext(result);
        reset({ displayName: result.displayName ?? '', phone: '' });
        if (Date.parse(result.expiresAt) <= Date.now()) setExpired(true);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof ApiError && cause.code === 'INVALID_REGISTRATION_INTENT')
          setExpired(true);
        else setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [revision, reset]);

  useEffect(() => {
    if (!context) return;
    const remaining = Date.parse(context.expiresAt) - Date.now();
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [context]);

  async function submit(input: GoogleRegistrationInput) {
    setError(undefined);
    try {
      const identity = await completeRegistration(input);
      router.replace(homeForRole(identity.role));
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === 'INVALID_REGISTRATION_INTENT')
        setExpired(true);
      else setError(errorMessage(cause));
    }
  }
  if (expired)
    return (
      <div className="form-stack">
        <p className="inline-error" role="alert">
          Phiên đăng ký Google đã hết hạn hoặc đã được sử dụng. Vui lòng bắt đầu lại.
        </p>
        <a
          className="button button-primary button-full"
          href="/api/v1/auth/google?returnTo=%2Faccount"
        >
          Tiếp tục với Google
        </a>
        <Link href="/login">Về trang đăng nhập</Link>
      </div>
    );
  if (!context) {
    if (error)
      return <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />;
    return <LoadingState label="Đang tải hồ sơ Google…" />;
  }
  const avatarUrl = googleAvatarUrl(context.avatarUrl);
  return (
    <form className="form-stack" noValidate onSubmit={handleSubmit(submit)}>
      <div className="profile-identity">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Ảnh đại diện từ Google"
            width={56}
            height={56}
            referrerPolicy="no-referrer"
            className="avatar"
            unoptimized
          />
        ) : (
          <Avatar name={context.displayName ?? context.email} />
        )}
        <p className="muted small">
          Google đã xác thực email của bạn. Hoàn tất hồ sơ để sử dụng Mindy.
        </p>
      </div>
      <div className="field">
        <label htmlFor="google-email">Email đã xác thực</label>
        <input id="google-email" type="email" value={context.email} readOnly />
      </div>
      {(
        [
          ['displayName', 'Họ tên', 'text', 'name'],
          ['phone', 'Số điện thoại (tùy chọn)', 'tel', 'tel'],
        ] as const
      ).map(([name, label, type, autoComplete]) => (
        <div className="field" key={name}>
          <label htmlFor={`google-${name}`}>{label}</label>
          <input
            id={`google-${name}`}
            type={type}
            autoComplete={autoComplete}
            aria-invalid={Boolean(errors[name])}
            aria-describedby={`google-${name}-error`}
            {...register(name)}
          />
          <div id={`google-${name}-error`}>
            <FormError message={errors[name]?.message} />
          </div>
        </div>
      ))}
      <p className="form-help">
        Phiên đăng ký có hiệu lực đến {formatDate(context.expiresAt, true)}.
      </p>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      <button className="button button-primary button-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang hoàn tất…' : 'Hoàn tất đăng ký'}
      </button>
      <Link className="form-help" href="/login">
        Dùng tài khoản khác
      </Link>
    </form>
  );
}
