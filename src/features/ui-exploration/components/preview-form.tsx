'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Icon } from '@/shared/ui/icon';
import { type PreviewState, previewHref, type VariantId } from '../data/variants';
import s from '../styles/exploration.module.css';

const loginSchema = z.object({
  email: z.email('Email chưa hợp lệ.').max(320),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.').max(128),
  displayName: z.string().optional(),
  phone: z.string().optional(),
});
const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, 'Vui lòng nhập họ tên.').max(150),
  phone: z.union([z.literal(''), z.string().min(7, 'Số điện thoại cần ít nhất 7 ký tự.').max(32)]),
  password: z.string().min(6, 'Mật khẩu cần ít nhất 6 ký tự.').max(128),
});
type FormValues = z.infer<typeof loginSchema>;
const demoNotice =
  'Đây là bản xem thử, chưa gửi dữ liệu. Bạn có thể tiếp tục khám phá các giao diện.';
export function PreviewForm({
  variant,
  registerMode,
  state,
}: {
  variant: VariantId;
  registerMode: boolean;
  state: PreviewState;
}) {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState(state === 'notice');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerMode ? registerSchema : loginSchema),
    defaultValues: { email: '', password: '', phone: '', displayName: '' },
  });
  useEffect(() => {
    if (state === 'error')
      setError('email', { message: 'Email chưa hợp lệ. Vui lòng kiểm tra lại.' });
    return () => clearTimeout(timer.current);
  }, [setError, state]);
  function submit() {
    setNotice(false);
    setPending(true);
    timer.current = setTimeout(() => {
      setPending(false);
      setNotice(true);
    }, 650);
  }
  const busy = pending || state === 'submitting';
  const fields = registerMode
    ? [
        {
          name: 'displayName' as const,
          label: 'Họ tên',
          type: 'text',
          autocomplete: 'name',
          placeholder: 'Tên bạn muốn Mindy gọi',
        },
        {
          name: 'email' as const,
          label: 'Email',
          type: 'email',
          autocomplete: 'email',
          placeholder: 'ban@example.com',
        },
        {
          name: 'phone' as const,
          label: 'Số điện thoại',
          type: 'tel',
          autocomplete: 'tel',
          placeholder: 'Số điện thoại của bạn',
          optional: true,
        },
      ]
    : [
        {
          name: 'email' as const,
          label: 'Email',
          type: 'email',
          autocomplete: 'username',
          placeholder: 'ban@example.com',
        },
      ];
  return (
    <form className={s.form} onSubmit={handleSubmit(submit)} noValidate>
      {fields.map((field) => (
        <div className={s.field} key={field.name}>
          <label htmlFor={`preview-${field.name}`}>
            {field.label} {'optional' in field && <span>(tùy chọn)</span>}
          </label>
          <input
            id={`preview-${field.name}`}
            type={field.type}
            autoComplete={field.autocomplete}
            placeholder={field.placeholder}
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={errors[field.name] ? `preview-${field.name}-error` : undefined}
            {...register(field.name)}
          />
          {errors[field.name] && (
            <p className={s.fieldError} id={`preview-${field.name}-error`} role="alert">
              {errors[field.name]?.message}
            </p>
          )}
        </div>
      ))}
      <div className={s.field}>
        <label htmlFor="preview-password">Mật khẩu</label>
        <div className={s.passwordField}>
          <input
            id="preview-password"
            type={visible ? 'text' : 'password'}
            autoComplete={registerMode ? 'new-password' : 'current-password'}
            placeholder={registerMode ? 'Tạo mật khẩu của bạn' : 'Nhập mật khẩu'}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'preview-password-error' : undefined}
            {...register('password')}
          />
          <button
            type="button"
            aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? 'Ẩn' : 'Hiện'}
          </button>
        </div>
        {errors.password ? (
          <p className={s.fieldError} id="preview-password-error" role="alert">
            {errors.password.message}
          </p>
        ) : (
          registerMode && (
            <small className={s.fieldHint}>
              Ít nhất 6 ký tự. Đừng dùng mật khẩu thật trong bản xem thử.
            </small>
          )
        )}
      </div>
      {notice && (
        <div className={s.notice} role="status">
          <Icon name="check" size={20} />
          <span>{demoNotice}</span>
        </div>
      )}
      <button className={`${s.primaryButton} ${s.submitButton}`} type="submit" disabled={busy}>
        {busy ? (
          <>
            <span className={s.spinner} />{' '}
            {registerMode ? 'Đang tạo tài khoản…' : 'Đang đăng nhập…'}
          </>
        ) : (
          <>
            {registerMode ? 'Tạo tài khoản' : 'Đăng nhập'}
            <Icon name="arrow" size={18} />
          </>
        )}
      </button>
      <p className={s.formSwitch}>
        {registerMode ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
        <Link href={previewHref(variant, registerMode ? 'login' : 'register')}>
          {registerMode ? 'Đăng nhập' : 'Đăng ký ngay'} <span>↗</span>
        </Link>
      </p>
    </form>
  );
}
