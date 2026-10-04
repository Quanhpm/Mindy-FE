'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { User } from '@/shared/api/contracts/identity';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { formatDate } from '@/shared/lib/date';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Avatar, RoleBadge, StatusBadge } from '@/shared/ui/user-display';
import { getUser, updateUserStatus } from '../api/users.browser';

export function UserDetail({ id }: { id: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
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
    if (!user) return;
    setSaving(true);
    setMutationError(null);
    setMessage(null);
    try {
      setUser(await updateUserStatus(user.id, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'));
      setOpen(false);
      setMessage('Đã cập nhật trạng thái tài khoản.');
    } catch (cause) {
      setMutationError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
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
            onClick={() => {
              setMutationError(null);
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
        onCancel={(event) => {
          if (saving) event.preventDefault();
          else setOpen(false);
        }}
      >
        <h2 id="confirm-title">{action}?</h2>
        <p>
          {user.status === 'ACTIVE'
            ? `${user.displayName} sẽ không thể tiếp tục đăng nhập và sử dụng tài khoản.`
            : user.status === 'PENDING_VERIFICATION'
              ? `Quản trị viên sẽ kích hoạt tài khoản của ${user.displayName} bằng thao tác này. Đây là thay đổi trạng thái tài khoản, không phải xác thực email.`
              : `${user.displayName} có thể đăng nhập và sử dụng lại tài khoản.`}
        </p>
        {mutationError && (
          <p className="inline-error" role="alert">
            {mutationError}
          </p>
        )}
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
            disabled={saving}
            onClick={() => void confirm()}
          >
            {saving ? 'Đang cập nhật…' : 'Xác nhận'}
          </button>
        </div>
      </dialog>
    </>
  );
}
