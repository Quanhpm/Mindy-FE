'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { roleLabels, roles } from '@/shared/api/contracts/identity';
import { FormError } from '@/shared/components/feedback';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Icon } from '@/shared/ui/icon';
import { createUser } from '../api/users.browser';
import { type CreateUserInput, createUserSchema } from '../schemas/user.schema';

export function CreateUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { displayName: '', email: '', phone: '', password: '', role: 'STUDENT' },
  });
  async function submit(input: CreateUserInput): Promise<void> {
    setError(undefined);
    try {
      const user = await createUser(input);
      router.replace(`/management/users/${user.id}?created=1`);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }
  return (
    <>
      <Link className="back-link" href="/management/users">
        ← Danh sách người dùng
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THÀNH VIÊN MỚI</p>
          <h1>Thêm người dùng</h1>
          <p className="page-description">Tạo tài khoản và phân quyền truy cập vào trung tâm.</p>
        </div>
      </div>
      <div className="form-layout">
        <form className="card form-card form-stack" onSubmit={handleSubmit(submit)} noValidate>
          <div>
            <h2>Thông tin tài khoản</h2>
            <p className="muted small">Các mục có dấu * là bắt buộc.</p>
          </div>
          <div className="field">
            <label htmlFor="displayName">Họ và tên *</label>
            <input
              id="displayName"
              autoComplete="name"
              placeholder="Nguyễn Minh Anh"
              aria-invalid={Boolean(errors.displayName)}
              aria-describedby="name-error"
              {...register('displayName')}
            />
            <div id="name-error">
              <FormError message={errors.displayName?.message} />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                autoComplete="off"
                placeholder="minhanh@example.com"
                aria-invalid={Boolean(errors.email)}
                aria-describedby="email-error"
                {...register('email')}
              />
              <div id="email-error">
                <FormError message={errors.email?.message} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="phone">Số điện thoại</label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="090 123 4567"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby="phone-error"
                {...register('phone')}
              />
              <div id="phone-error">
                <FormError message={errors.phone?.message} />
              </div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="role">Vai trò *</label>
            <select id="role" {...register('role')}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <FormError message={errors.role?.message} />
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu ban đầu *</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-error"
              {...register('password')}
            />
            <span className="muted small">Từ 7 đến 32 ký tự theo quy tắc kiểm tra hiện tại.</span>
            <div id="password-error">
              <FormError message={errors.password?.message} />
            </div>
          </div>
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions">
            <Link className="button button-secondary" href="/management/users">
              Hủy
            </Link>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo…' : 'Tạo tài khoản'}
              <Icon name="plus" size={18} />
            </button>
          </div>
        </form>
        <aside className="help-card">
          <span className="help-icon">
            <Icon name="shield" size={25} />
          </span>
          <h3>Đúng người, đúng quyền</h3>
          <p>Chọn vai trò phù hợp với trách nhiệm của thành viên trong trung tâm.</p>
          <ul>
            <li>
              <strong>Học viên</strong>
              <span>Tham gia hành trình học tập.</span>
            </li>
            <li>
              <strong>Mentor</strong>
              <span>Đồng hành và giảng dạy.</span>
            </li>
            <li>
              <strong>Quản lý / Quản trị viên</strong>
              <span>Quản lý tài khoản và vận hành.</span>
            </li>
          </ul>
          <p className="small">
            Tài khoản mới được kích hoạt ngay. Hãy chuyển thông tin đăng nhập qua kênh riêng phù
            hợp.
          </p>
        </aside>
      </div>
    </>
  );
}
