'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { formatDate } from '@/shared/lib/date';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Icon } from '@/shared/ui/icon';
import { Avatar, RoleBadge, StatusBadge } from '@/shared/ui/user-display';
import { useSession } from '../session/session-provider';

export function AccountPanel() {
  const { user, signOut } = useSession();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!user) return null;
  async function logoutAll(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await signOut(true);
      router.replace('/login');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">KHÔNG GIAN CỦA BẠN</p>
          <h1>Tài khoản của tôi</h1>
          <p className="page-description">
            Xin chào, {user.displayName}. Chào mừng bạn trở lại Mindy.
          </p>
        </div>
      </div>
      <section className="card profile-card">
        <div className="profile-identity">
          <Avatar name={user.displayName} large />
          <div>
            <h2>{user.displayName}</h2>
            <p className="muted">{user.email}</p>
            <div className="badge-row">
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </div>
          </div>
        </div>
        <dl className="details-grid">
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{user.phone ?? 'Chưa cập nhật'}</dd>
          </div>
          <div>
            <dt>Ngày tham gia</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
          <div>
            <dt>Đăng nhập gần nhất</dt>
            <dd>{formatDate(user.lastLoginAt, true)}</dd>
          </div>
        </dl>
      </section>
      <section className="card security-card">
        <span className="help-icon">
          <Icon name="shield" size={25} />
        </span>
        <div>
          <h2>Bảo vệ tài khoản của bạn</h2>
          <p className="muted">
            Đăng xuất khỏi tất cả thiết bị nếu bạn đã sử dụng máy tính dùng chung.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => dialog.current?.showModal()}
        >
          Đăng xuất mọi thiết bị
        </button>
      </section>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby="logout-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id="logout-title">Đăng xuất mọi thiết bị?</h2>
        <p>Bạn sẽ cần đăng nhập lại trên tất cả thiết bị, bao gồm thiết bị hiện tại.</p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={busy}
            onClick={() => dialog.current?.close()}
          >
            Hủy
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={busy}
            onClick={() => void logoutAll()}
          >
            {busy ? 'Đang đăng xuất…' : 'Xác nhận đăng xuất'}
          </button>
        </div>
      </dialog>
    </>
  );
}
