/* biome-ignore-all lint/a11y/noNoninteractiveTabindex: Both labeled regions are independently scrollable and need keyboard scrolling. */
'use client';

import Link from 'next/link';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import styles from './unit-workspace.module.css';

export type UnitWorkspaceProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  railLabel?: string;
  rail: ReactNode;
  children: ReactNode;
  selectionKey?: string;
};

export function UnitWorkspace({
  title,
  backHref,
  backLabel = 'Quay lại danh sách',
  railLabel = 'Nội dung khóa học',
  rail,
  children,
  selectionKey,
}: UnitWorkspaceProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(false);
  const [height, setHeight] = useState<number>();
  useEffect(() => {
    const measure = () => {
      if (workspace.current)
        setHeight(
          Math.max(280, window.innerHeight - workspace.current.getBoundingClientRect().top - 24),
        );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (workspace.current?.parentElement) observer.observe(workspace.current.parentElement);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 850px)');
    const update = () => {
      const compact = query.matches || (workspace.current?.clientWidth ?? 1000) <= 640;
      setMobile(compact);
      if (!compact) dialog.current?.close();
    };
    const observer = new ResizeObserver(update);
    if (workspace.current) observer.observe(workspace.current);
    update();
    query.addEventListener('change', update);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', update);
    };
  }, []);
  useEffect(() => {
    void selectionKey;
    void mobile;
    dialog.current?.close();
    contentRef.current?.scrollTo({ top: 0 });
    const container = railRef.current;
    const selected = container?.querySelector<HTMLElement>(
      '[aria-current="page"], [aria-current="true"]',
    );
    if (selected && container) {
      const difference =
        selected.getBoundingClientRect().top - container.getBoundingClientRect().top;
      if (difference < 0 || difference + selected.offsetHeight > container.clientHeight)
        container.scrollTop += difference - 16;
    }
  }, [selectionKey, mobile]);
  const railContent = (
    <>
      <div className={styles.railHeading}>
        {backHref && (
          <Link href={backHref} className="back-link">
            ← {backLabel}
          </Link>
        )}
        <h2>{title}</h2>
        <p>{railLabel}</p>
      </div>
      <section
        ref={railRef}
        className={styles.railScroll}
        tabIndex={0}
        aria-label={railLabel}
        data-unit-rail
      >
        {rail}
      </section>
    </>
  );
  return (
    <div
      ref={workspace}
      style={height === undefined ? undefined : { height }}
      className={styles.workspace}
      data-unit-workspace
      data-compact={mobile}
    >
      <button
        ref={trigger}
        type="button"
        className={`button button-secondary ${styles.mobileTrigger}`}
        aria-haspopup="dialog"
        onClick={() => {
          dialog.current?.showModal();
          requestAnimationFrame(() => {
            const container = railRef.current;
            const selected = container?.querySelector<HTMLElement>(
              '[aria-current="page"], [aria-current="true"]',
            );
            if (selected && container)
              container.scrollTop +=
                selected.getBoundingClientRect().top - container.getBoundingClientRect().top - 16;
          });
        }}
      >
        <Icon name="book" />
        {railLabel}
      </button>
      {!mobile && <aside className={styles.rail}>{railContent}</aside>}
      <section
        ref={contentRef}
        className={styles.content}
        tabIndex={0}
        aria-label="Chi tiết nội dung đã chọn"
        data-unit-content
      >
        {children}
      </section>
      {mobile && (
        <dialog
          ref={dialog}
          className={styles.drawer}
          aria-label={railLabel}
          onClose={() => trigger.current?.focus()}
        >
          <div className={styles.drawerHeader}>
            <span>{railLabel}</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Đóng nội dung khóa học"
              onClick={() => dialog.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          {railContent}
        </dialog>
      )}
    </div>
  );
}
