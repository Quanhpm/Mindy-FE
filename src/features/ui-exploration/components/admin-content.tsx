'use client';

import { useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import {
  type DemoRole,
  type DemoStatus,
  demoUsers,
  roleLabels,
  schedule,
  statusLabels,
  summaries,
} from '../data/fixtures';
import type { PreviewState } from '../data/variants';
import s from '../styles/exploration.module.css';

export function AdminNavigation({ close }: { close?: () => void }) {
  return (
    <nav className={s.adminNav} aria-label="Điều hướng quản trị mẫu">
      <span className={s.navGroupLabel}>KHÔNG GIAN LÀM VIỆC</span>
      <button type="button" aria-current="page" className={s.navSelected} onClick={close}>
        <Icon name="book" size={19} />
        <span>Tổng quan</span>
        <span className={s.navArrow}>↗</span>
      </button>
      <button type="button" disabled title="Chỉ minh họa navigation">
        <Icon name="users" size={19} />
        <span>Người dùng</span>
      </button>
      <button type="button" disabled title="Chỉ minh họa navigation">
        <Icon name="clock" size={19} />
        <span>Lịch học</span>
      </button>
      <button type="button" disabled title="Chỉ minh họa navigation">
        <Icon name="shield" size={19} />
        <span>Quản lý lớp</span>
      </button>
    </nav>
  );
}
export function AdminStats() {
  return (
    <div className={s.adminStats}>
      {summaries.map((stat) => (
        <article key={stat.title}>
          <div>
            <span>{stat.title}</span>
            <Icon name={stat.icon} size={20} />
          </div>
          <strong>{stat.value}</strong>
          <small>{stat.hint}</small>
        </article>
      ))}
    </div>
  );
}
export function AdminTable({ state }: { state: PreviewState }) {
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [recovered, setRecovered] = useState(false);
  const users = demoUsers.filter(
    (user) =>
      (role === 'ALL' || role === user.role) && (status === 'ALL' || status === user.status),
  );
  const totalPages = Math.max(1, Math.ceil(users.length / 5));
  const visible = users.slice((page - 1) * 5, page * 5);
  const empty = state === 'empty' || users.length === 0;
  return (
    <section className={s.tablePanel}>
      <div className={s.panelHeading}>
        <div>
          <h2>Người dùng gần đây</h2>
          <p>Một góc nhìn về cộng đồng Mindy.</p>
        </div>
        <span className={s.demoBadge}>Dữ liệu minh họa</span>
      </div>
      <div className={s.tableFilters}>
        <label>
          Vai trò
          <select
            aria-label="Vai trò"
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả vai trò</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trạng thái
          <select
            aria-label="Trạng thái"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <span>{empty ? 0 : users.length} người dùng</span>
      </div>
      {state === 'loading' ? (
        <div className={s.tableSkeleton} role="status" aria-label="Đang tải bảng minh họa">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row}>
              <i />
              <span />
              <b />
            </div>
          ))}
        </div>
      ) : state === 'error' && !recovered ? (
        <div className={s.tableFeedback} role="alert">
          <Icon name="shield" size={28} />
          <h3>Chưa tải được danh sách</h3>
          <p>Thử lại để xem dữ liệu minh họa.</p>
          <button className={s.outlineButton} type="button" onClick={() => setRecovered(true)}>
            Thử lại
          </button>
        </div>
      ) : empty ? (
        <div className={s.tableFeedback} role="status">
          <Icon name="users" size={30} />
          <h3>Chưa có người dùng phù hợp</h3>
          <p>Thử thay đổi bộ lọc hoặc quay lại trạng thái mặc định.</p>
        </div>
      ) : (
        <>
          <section className={s.tableScroll} aria-label="Bảng người dùng minh họa có thể cuộn">
            <table className={s.usersTable}>
              <thead>
                <tr>
                  <th scope="col">NGƯỜI DÙNG</th>
                  <th scope="col">VAI TRÒ</th>
                  <th scope="col">TRẠNG THÁI</th>
                  <th scope="col">NGÀY TẠO</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user, index) => (
                  <tr key={user.id}>
                    <td>
                      <div className={s.userCell}>
                        <span className={s.avatar} data-tone={index % 3}>
                          {user.name
                            .split(' ')
                            .slice(-2)
                            .map((word) => word[0])
                            .join('')}
                        </span>
                        <div>
                          <strong>{user.name}</strong>
                          <small>{user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{roleLabels[user.role as DemoRole]}</td>
                    <td>
                      <span
                        className={`${s.statusBadge} ${user.status === 'SUSPENDED' ? s.statusSuspended : ''}`}
                      >
                        <i />
                        {statusLabels[user.status as DemoStatus]}
                      </span>
                    </td>
                    <td>{user.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <div className={s.pagination}>
            <span>
              Hiển thị {(page - 1) * 5 + 1}–{Math.min(page * 5, users.length)} / {users.length}
            </span>
            <div>
              <button
                type="button"
                aria-label="Trang trước"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                ←
              </button>
              <span aria-live="polite">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                aria-label="Trang tiếp"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
export function AdminSchedule() {
  return (
    <section className={s.schedulePanel}>
      <div className={s.panelHeading}>
        <div>
          <h2>Lịch học hôm nay</h2>
          <p>Thứ Sáu, 02 tháng 10</p>
        </div>
        <Icon name="clock" size={20} />
      </div>
      <div className={s.scheduleList}>
        {schedule.map((session, index) => (
          <article key={session.time}>
            <div className={s.scheduleTime}>
              <strong>{session.time}</strong>
              <i data-order={index} />
            </div>
            <div>
              <small>
                {session.mode} <span>· {session.length}</span>
              </small>
              <h3>{session.title}</h3>
              <p>{session.mentor}</p>
            </div>
          </article>
        ))}
      </div>
      <div className={s.scheduleFooter}>
        <span className={s.liveDot} /> Một ngày mới, những bước tiến mới.
      </div>
    </section>
  );
}
