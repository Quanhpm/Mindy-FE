'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { statusLabels, type User } from '@/shared/api/contracts/identity';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { useUiMutation } from '@/shared/hooks/use-ui-mutation';
import { formatDate } from '@/shared/lib/date';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { Avatar, RoleBadge, StatusBadge } from '@/shared/ui/user-display';
import { getUser, updateUserStatus } from '../api/users.browser';

export function UserDetail({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [requested, setRequested] = useState<{ status: 'ACTIVE' | 'SUSPENDED'; label: string }>();
  const mutation = useUiMutation();
  const saving = mutation.busy;
  const [message, setMessage] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers an explicit user retry.
  useEffect(() => {
    const controller = new AbortController();
    setUser(null);
    setError(null);
    void getUser(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setUser(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  async function confirm(): Promise<void> {
    if (!user || !requested || user.status === requested.status) return;
    setMessage(null);
    await mutation.run(
      (signal) => updateUserStatus(user.id, requested.status, signal),
      (updated) => {
        setUser(updated);
        setOpen(false);
        setMessage('Đã cập nhật trạng thái tài khoản.');
      },
      async (cause, signal) => {
        if (cause instanceof ApiError && cause.status === 409) {
          const current = await getUser(id, signal);
          if (!signal.aborted) setUser(current);
        }
      },
    );
  }
  async function checkResult() {
    await mutation.check(async (signal) => {
      const current = await getUser(id, signal);
      if (!signal.aborted) setUser(current);
      return `Trạng thái hiện tại của ${current.displayName}: ${statusLabels[current.status]}. Kiểm tra trước khi thay đổi tiếp.`;
    });
  }
  if (error) return <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />;
  if (!user) return <LoadingState />;
  const action =
    user.status === 'ACTIVE'
      ? 'Tạm khóa tài khoản'
      : user.status === 'PENDING_VERIFICATION'
        ? 'Kích hoạt thủ công'
        : 'Kích hoạt tài khoản';
  return (
    <>
      <Link className="back-link" href="/management/users">
        ← Danh sách người dùng
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HỒ SƠ THÀNH VIÊN</p>
          <h1>Thông tin người dùng</h1>
          <p className="page-description">Thông tin tài khoản và trạng thái truy cập.</p>
        </div>
      </div>
      {message && (
        <p className="success-notice" role="status">
          {message}
        </p>
      )}
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
          <div>
            <dt>Mã người dùng</dt>
            <dd className="mono small">{user.id}</dd>
          </div>
        </dl>
        <div className="profile-footer">
          <p className="muted small">
            {user.status === 'PENDING_VERIFICATION'
              ? 'Tài khoản đang chờ xác thực email. Kích hoạt thủ công sẽ cho phép tài khoản đăng nhập.'
              : 'Tạm khóa sẽ ngăn tài khoản tiếp tục truy cập hệ thống.'}
          </p>
          <button
            type="button"
            className={`button ${user.status === 'ACTIVE' ? 'button-danger' : 'button-primary'}`}
            ref={trigger}
            disabled={saving}
            onClick={() => {
              setRequested({
                status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                label: action,
              });
              setOpen(true);
            }}
          >
            {action}
          </button>
        </div>
      </section>
      <dialog
        ref={dialog}
        className="confirm-dialog"
        aria-labelledby="confirm-title"
        onClose={() => {
          setOpen(false);
          trigger.current?.focus();
        }}
        onCancel={(event) => {
          if (saving) event.preventDefault();
          else setOpen(false);
        }}
      >
        <h2 id="confirm-title">{requested?.label}?</h2>
        <p>
          {requested?.status === 'SUSPENDED'
            ? `${user.displayName} sẽ không thể tiếp tục đăng nhập và sử dụng tài khoản.`
            : user.status === 'PENDING_VERIFICATION'
              ? `Quản trị viên sẽ kích hoạt tài khoản của ${user.displayName} bằng thao tác này. Đây là thay đổi trạng thái tài khoản, không phải xác thực email.`
              : `${user.displayName} có thể đăng nhập và sử dụng lại tài khoản.`}
        </p>
        {requested && user.status === requested.status && (
          <p role="status">Tài khoản đã ở trạng thái yêu cầu. Bạn có thể đóng xác nhận.</p>
        )}
        <MutationFeedback mutation={mutation} onCheck={() => void checkResult()} />
        <div className="form-actions">
          <button
            className="button button-secondary"
            type="button"
            disabled={saving}
            onClick={() => setOpen(false)}
          >
            Hủy
          </button>
          <button
            className="button button-primary"
            type="button"
            disabled={mutation.blocked || user.status === requested?.status}
            onClick={() => void confirm()}
          >
            {saving ? 'Đang cập nhật…' : 'Xác nhận'}
          </button>
        </div>
      </dialog>
    </>
  );
}
