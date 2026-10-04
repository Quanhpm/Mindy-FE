import Link from 'next/link';
import { PreviewForm } from '../components/preview-form';
import { PreviewBrand } from '../components/visuals';
import { type PreviewState, previewHref, type VariantId } from '../data/variants';
import s from '../styles/ocean.module.css';

type AuthProps = { variant: VariantId; registerMode: boolean; state: PreviewState };

function EntryForm({ variant, registerMode, state }: AuthProps) {
  return (
    <section className={s.entryForm}>
      <p className={s.sectionIndex}>
        {registerMode ? 'YOUR NEXT CHAPTER' : 'WELCOME BACK TO MINDY'}
      </p>
      <h1 className={s.entryTitle}>{registerMode ? 'Một khởi đầu mới.' : 'Chào mừng trở lại.'}</h1>
      <p className={s.entrySubtitle}>
        {registerMode
          ? 'Tạo tài khoản để bắt đầu hành trình của bạn.'
          : 'Tiếp tục học hỏi, theo nhịp của chính bạn.'}
      </p>
      <PreviewForm variant={variant} registerMode={registerMode} state={state} />
      <p className={s.entryFoot}>Cùng nhau tiến bộ mỗi ngày.</p>
    </section>
  );
}

function Back({ variant }: { variant: VariantId }) {
  return (
    <Link className={s.authBack} href={previewHref(variant, 'home')}>
      ← Về trang chủ
    </Link>
  );
}

export function AuthVariant(props: AuthProps) {
  const { variant } = props;
  return (
    <main id="main-content" className={`${s.expandedAuth} ${s.editorialAuth}`}>
      <header className={s.newAuthHeader}>
        <PreviewBrand variant={variant} />
        <span className={s.sectionIndex}>THE MINDY JOURNAL / MEMBERS</span>
        <Back variant={variant} />
      </header>
      <div className={s.editorialEntry}>
        <aside>
          <span className={s.sectionIndex}>MỘT CHƯƠNG MỚI</span>
          <h2>
            Học hỏi. <br />
            Thực hành. <br />
            <em>Trưởng thành.</em>
          </h2>
          <p>
            Viết tiếp hành trình của bạn,
            <br />
            mỗi ngày một điều mới.
          </p>
          <span className={s.editorialEntryNumber} aria-hidden="true">
            01<span>LEARN / CONNECT / GROW</span>
          </span>
        </aside>
        <EntryForm {...props} />
      </div>
      <footer className={s.entryMagazineFoot}>
        <span>MINDY CENTER — LEARNING IS A JOURNEY</span>
        <span>HÀNH TRÌNH BẮT ĐẦU TỪ BẠN ↗</span>
      </footer>
    </main>
  );
}
