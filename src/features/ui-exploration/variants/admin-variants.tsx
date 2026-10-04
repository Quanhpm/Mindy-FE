'use client';

import { useRef } from 'react';
import { Icon } from '@/shared/ui/icon';
import {
  AdminNavigation,
  AdminSchedule,
  AdminStats,
  AdminTable,
} from '../components/admin-content';
import { PreviewBrand } from '../components/visuals';
import type { PreviewState, VariantId } from '../data/variants';
import base from '../styles/exploration.module.css';
import s from '../styles/ocean.module.css';

function Heading() {
  return (
    <div className={s.newAdminHeading}>
      <p className={s.sectionIndex}>MỘT NGÀY MỚI Ở MINDY</p>
      <h1 className={s.adminTitle}>
        Tổng quan
        <br className={s.adminTitleBreak} /> quản trị.
      </h1>
      <p>Chào Minh Anh, cùng nhìn lại không gian học tập hôm nay.</p>
    </div>
  );
}

function Metrics() {
  return (
    <div className={s.metricStrip}>
      <AdminStats />
    </div>
  );
}

function Footer() {
  return (
    <footer className={s.newAdminFooter}>
      <span>Dữ liệu và thao tác minh họa · Mindy Center</span>
      <span>02.10.2026 / LEARN. CONNECT. GROW.</span>
    </footer>
  );
}

export function AdminVariant({ variant, state }: { variant: VariantId; state: PreviewState }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const header = (
    <header className={s.newAdminHeader}>
      <div>
        <button
          className={s.newAdminMenu}
          ref={trigger}
          type="button"
          aria-label="Mở menu quản trị"
          aria-haspopup="dialog"
          onClick={() => dialog.current?.showModal()}
        >
          <Icon name="menu" size={23} />
        </button>
        <PreviewBrand variant={variant} />
      </div>
      <span className={s.adminWorkspaceLabel}>KHÔNG GIAN QUẢN TRỊ / TỔNG QUAN</span>
      <div className={s.newAdminProfile}>
        <span>
          Minh Anh<small>Quản trị viên · Minh họa</small>
        </span>
        <b>MA</b>
      </div>
    </header>
  );
  const content = (
    <div className={s.editorialAdminFrame}>
      {header}
      <div className={s.newAdminTopnav}>
        <AdminNavigation />
        <span>OPERATIONS JOURNAL / VOL. 01</span>
      </div>
      <main id="main-content" className={s.editorialAdminColumns}>
        <section className={s.editorialAdminIntro}>
          <Heading />
          <Metrics />
          <span className={s.editorialAdminDate}>
            THỨ SÁU
            <br />
            <strong>02</strong>THÁNG 10, 2026
          </span>
        </section>
        <div className={s.newAdminTable}>
          <AdminTable state={state} />
        </div>
        <aside className={s.editorialAdminAgenda}>
          <AdminSchedule />
        </aside>
      </main>
      <Footer />
    </div>
  );
  return (
    <div className={s.expandedAdmin} data-admin-layout={variant}>
      {content}
      <dialog
        ref={dialog}
        className={base.drawer}
        aria-label="Menu quản trị mẫu"
        onClose={() => trigger.current?.focus()}
      >
        <div className={base.drawerHeading}>
          <PreviewBrand variant={variant} />
          <button
            type="button"
            className={base.iconButton}
            aria-label="Đóng menu quản trị"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" size={22} />
          </button>
        </div>
        <AdminNavigation close={() => dialog.current?.close()} />
        <p className={base.drawerNote}>Bản xem thử · Dữ liệu minh họa</p>
      </dialog>
    </div>
  );
}
