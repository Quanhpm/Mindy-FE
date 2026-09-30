'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { roleLabels, roles, statuses, statusLabels } from '@/shared/api/contracts/identity';
import { ErrorPanel, LoadingState } from '@/shared/components/feedback';
import { formatDate } from '@/shared/lib/date';
import { errorMessage } from '@/shared/lib/http/api-error';
import { Icon } from '@/shared/ui/icon';
import { Avatar, RoleBadge, StatusBadge } from '@/shared/ui/user-display';
import { listUsers } from '../api/users.browser';
import { type UserPage, userFiltersSchema } from '../schemas/user.schema';

export function UsersList() {
  const params = useSearchParams();
  const router = useRouter();
  const filters = userFiltersSchema.parse({
    page: params.get('page') ?? 1,
    pageSize: params.get('pageSize') ?? 20,
    role: params.get('role') ?? undefined,
    status: params.get('status') ?? undefined,
  });
  const query = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }).toString();
  const [data, setData] = useState<UserPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: revision triggers an explicit user retry.
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(null);
    void listUsers(query, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [query, revision]);

  function change(key: string, value: string): void {
    const next = new URLSearchParams(query);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    router.replace(`/management/users?${next.toString()}`, { scroll: false });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">QUẢN TRỊ TRUNG TÂM</p>
          <h1>Người dùng</h1>
          <p className="page-description">Quản lý tài khoản và kết nối mọi người tại Mindy.</p>
        </div>
        <Link className="button button-primary" href="/management/users/new">
          <Icon name="plus" size={18} />
          Thêm người dùng
        </Link>
      </div>
      <div className="info-strip">
        <span className="info-icon">
          <Icon name="users" size={25} />
        </span>
        <div>
          <strong>Mỗi tài khoản, một hành trình học tập.</strong>
          <p>Phân quyền phù hợp để học viên và đội ngũ bắt đầu cùng nhau.</p>
        </div>
        <span className="strip-label">MINDY COMMUNITY</span>
      </div>
      <section className="card users-card" aria-labelledby="users-title">
        <div className="card-heading">
          <div className="inline-heading">
            <h2 id="users-title">Danh sách người dùng</h2>
            {data && <span className="count-badge">{data.total}</span>}
          </div>
          <span className="muted small">Mới nhất trước</span>
        </div>
        <div className="filters">
          <div className="field">
            <label htmlFor="role-filter">Vai trò</label>
            <select
              id="role-filter"
              value={filters.role ?? ''}
              onChange={(event) => change('role', event.target.value)}
            >
              <option value="">Tất cả vai trò</option>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status-filter">Trạng thái</label>
            <select
              id="status-filter"
              value={filters.status ?? ''}
              onChange={(event) => change('status', event.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-note">
            <span className="live-dot" />
            Dữ liệu từ trung tâm
          </div>
        </div>
        {error ? (
          <ErrorPanel message={error} retry={() => setRevision((value) => value + 1)} />
        ) : !data ? (
          <LoadingState />
        ) : data.items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="users" size={32} />
            </span>
            <h3>Chưa có người dùng phù hợp</h3>
            <p>Thử thay đổi bộ lọc hoặc thêm tài khoản mới.</p>
            <Link className="button button-secondary" href="/management/users/new">
              Thêm người dùng
            </Link>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Người dùng</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Ngày tham gia</th>
                  <th scope="col">
                    <span className="sr-only">Chi tiết</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link href={`/management/users/${user.id}`} className="user-cell">
                        <Avatar name={user.displayName} />
                        <span>
                          <strong>{user.displayName}</strong>
                          <span className="muted small">{user.email}</span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <RoleBadge role={user.role} />
                    </td>
                    <td>
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="muted">{formatDate(user.createdAt)}</td>
                    <td>
                      <Link
                        className="icon-button"
                        href={`/management/users/${user.id}`}
                        aria-label={`Xem ${user.displayName}`}
                      >
                        <Icon name="chevron" size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="pagination">
            <span className="muted small">
              {data.total === 0 || data.items.length === 0
                ? '0'
                : `${(data.page - 1) * data.pageSize + 1}–${(data.page - 1) * data.pageSize + data.items.length}`}{' '}
              / {data.total} người dùng
            </span>
            <div>
              <button
                className="button button-secondary button-small"
                type="button"
                disabled={filters.page <= 1}
                onClick={() => change('page', String(filters.page - 1))}
              >
                Trước
              </button>
              <span className="page-number">Trang {filters.page}</span>
              <button
                className="button button-secondary button-small"
                type="button"
                disabled={filters.page * filters.pageSize >= data.total}
                onClick={() => change('page', String(filters.page + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
