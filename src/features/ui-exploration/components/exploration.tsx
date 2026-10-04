'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@/shared/ui/icon';
import {
  allowedStates,
  type PreviewState,
  type PreviewView,
  previewHref,
  type VariantId,
  viewLabels,
  views,
} from '../data/variants';
import commerce from '../styles/commerce.module.css';
import s from '../styles/exploration.module.css';
import { AdminVariant } from '../variants/admin-variants';
import { AuthVariant } from '../variants/auth-variants';
import { CartPage } from '../variants/cart-page';
import { CoursesPage } from '../variants/courses-page';
import { HomeVariant } from '../variants/home-variants';
import { usePreviewCart } from './cart-provider';
import { PreviewBrand } from './visuals';

const stateLabels: Record<PreviewState, string> = {
  default: 'Mặc định',
  error: 'Lỗi',
  submitting: 'Đang gửi',
  notice: 'Thông báo',
  loading: 'Đang tải',
  empty: 'Trống',
};
function ReviewToolbar({
  variant,
  view,
  state,
}: {
  variant: VariantId;
  view: PreviewView;
  state: PreviewState;
}) {
  const router = useRouter();
  return (
    <div className={s.reviewBar} data-review-toolbar>
      <div className={s.reviewTitle}>
        <Link href="/ui-lab">07 · OCEAN EDITORIAL</Link>
        <span className={s.reviewSeparator} />
        <span className={s.reviewNotice}>Giao diện đã chọn · Dữ liệu minh họa</span>
      </div>
      <div className={s.reviewControls}>
        <label className={s.visuallyHidden} htmlFor="preview-view">
          Màn hình
        </label>
        <select
          id="preview-view"
          value={view}
          onChange={(event) => router.push(previewHref(variant, event.target.value as PreviewView))}
        >
          {views.map((item) => (
            <option key={item} value={item}>
              {viewLabels[item]}
            </option>
          ))}
        </select>
        {allowedStates(view).length > 1 && (
          <>
            <label className={s.visuallyHidden} htmlFor="preview-state">
              Trạng thái UI
            </label>
            <select
              id="preview-state"
              value={state}
              onChange={(event) =>
                router.replace(
                  `${previewHref(variant, view)}${event.target.value === 'default' ? '' : `?state=${event.target.value}`}`,
                )
              }
            >
              {allowedStates(view).map((item) => (
                <option key={item} value={item}>
                  {stateLabels[item]}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
function HomeHeader({ variant, view }: { variant: VariantId; view: PreviewView }) {
  const { items } = usePreviewCart();
  return (
    <header className={s.homeHeader}>
      <PreviewBrand variant={variant} />
      <nav className={commerce.shopNav} aria-label="Điều hướng trang chủ">
        <a
          className={commerce.navHow}
          href={view === 'home' ? '#cach-hoc' : `${previewHref(variant, 'home')}#cach-hoc`}
        >
          Cách học cùng Mindy
        </a>
        <Link
          href={previewHref(variant, 'courses')}
          aria-current={view === 'courses' ? 'page' : undefined}
        >
          Khóa học
        </Link>
        <Link
          className={commerce.navCart}
          href={previewHref(variant, 'cart')}
          aria-label={`Giỏ hàng, ${items.length} khóa học`}
          aria-current={view === 'cart' ? 'page' : undefined}
        >
          <Icon name="cart" size={19} />
          <span>Giỏ hàng</span>
          <span className={commerce.cartBadge}>{items.length}</span>
        </Link>
        <Link className={commerce.navLogin} href={previewHref(variant, 'login')}>
          Đăng nhập
        </Link>
        <Link className={s.headerCta} href={previewHref(variant, 'register')}>
          Bắt đầu <Icon name="arrow" size={16} />
        </Link>
      </nav>
    </header>
  );
}
export function ExplorationPreview({
  variant,
  view,
  state,
}: {
  variant: VariantId;
  view: PreviewView;
  state: PreviewState;
}) {
  return (
    <div className={s.root} data-variant={variant} data-view={view}>
      <ReviewToolbar variant={variant} view={view} state={state} />
      {view === 'home' || view === 'courses' || view === 'cart' ? (
        <>
          <HomeHeader variant={variant} view={view} />
          {view === 'courses' ? (
            <CoursesPage />
          ) : view === 'cart' ? (
            <CartPage />
          ) : (
            <main id="main-content">
              <HomeVariant />
            </main>
          )}
          <footer className={s.homeFooter}>
            <PreviewBrand variant={variant} />
            <p>© 2026 Mindy Center</p>
            <span>LEARN. CONNECT. GROW.</span>
          </footer>
        </>
      ) : view === 'admin' ? (
        <AdminVariant key={`${variant}-${state}`} variant={variant} state={state} />
      ) : (
        <AuthVariant
          key={`${variant}-${view}-${state}`}
          variant={variant}
          registerMode={view === 'register'}
          state={state}
        />
      )}
    </div>
  );
}
