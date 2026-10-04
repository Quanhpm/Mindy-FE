import s from '@/shared/components/management.module.css';

export function CatalogPagination({
  page,
  pageSize,
  total,
  count,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  count: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className={s.pagination}>
      <span>
        {count ? `${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + count}` : '0'} / {total}
      </span>
      <div className={s.actions}>
        <button
          type="button"
          className={s.secondaryButton}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Trước
        </button>
        <span>Trang {page}</span>
        <button
          type="button"
          className={s.secondaryButton}
          disabled={page * pageSize >= total}
          onClick={() => onPage(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
