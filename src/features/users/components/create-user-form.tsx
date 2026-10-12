'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { roleLabels, roles } from '@/shared/api/contracts/identity';
import { FormError } from '@/shared/components/feedback';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { useUiMutation } from '@/shared/hooks/use-ui-mutation';
import { Icon } from '@/shared/ui/icon';
import { createUser, listUsers } from '../api/users.browser';
import { type CreateUserInput, createUserSchema } from '../schemas/user.schema';

export function CreateUserForm() {
  const router = useRouter();
  const mutation = useUiMutation();
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { displayName: '', email: '', phone: '', password: '', role: 'STUDENT' },
  });
  async function submit(input: CreateUserInput): Promise<void> {
    await mutation.run(
      (signal) => createUser(input, signal),
      (user) => router.replace(`/management/users/${user.id}?created=1`),
    );
  }
  async function checkResult() {
    await mutation.check(async (signal) => {
      const result = await listUsers('page=1&pageSize=100', signal);
      const email = getValues('email').trim().toLowerCase();
      const found = result.items.find((user) => user.email.toLowerCase() === email);
      return found
        ? `Đã tìm thấy ${found.displayName} (${found.email}) trong danh sách. Kiểm tra tài khoản trước khi tạo lại.`
        : `Đã đọc ${result.items.length} tài khoản mới nhất. Kiểm tra danh sách người dùng trước khi tạo lại.`;
    });
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
              disabled={mutation.busy}
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
                disabled={mutation.busy}
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
                disabled={mutation.busy}
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
            <select
              disabled={mutation.busy}
              id="role"
              aria-invalid={Boolean(errors.role)}
              aria-describedby="role-error"
              {...register('role')}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
            <div id="role-error">
              <FormError message={errors.role?.message} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="password">Mật khẩu ban đầu *</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              disabled={mutation.busy}
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-error"
              {...register('password')}
            />
            <span className="muted small">Mật khẩu từ 12 đến 128 ký tự.</span>
            <div id="password-error">
              <FormError message={errors.password?.message} />
            </div>
          </div>
          <MutationFeedback
            mutation={mutation}
            onCheck={() => void checkResult()}
            reviewHref="/management/users"
          />
          <div className="form-actions">
            <Link className="button button-secondary" href="/management/users">
              Hủy
            </Link>
            <button
              type="submit"
              className="button button-primary"
              disabled={isSubmitting || mutation.blocked}
            >
              {isSubmitting || mutation.busy ? 'Đang tạo…' : 'Tạo tài khoản'}
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
              <strong>Giảng viên</strong>
              <span>Đồng hành và giảng dạy.</span>
            </li>
            <li>
              <strong>Quản trị viên</strong>
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
