'use client';

import Link from 'next/link';
import type { useUiMutation } from '@/shared/hooks/use-ui-mutation';
import { ErrorPanel } from './feedback';

export function MutationFeedback({
  mutation,
  onCheck,
  reviewHref,
  reviewLabel = 'Xem dữ liệu hiện tại',
}: {
  mutation: ReturnType<typeof useUiMutation>;
  onCheck: () => void;
  reviewHref?: string;
  reviewLabel?: string;
}) {
  return (
    <>
      {mutation.error && <ErrorPanel message={mutation.error} />}
      {mutation.uncertain && (
        <section className="inline-notice" aria-label="Kiểm tra kết quả thao tác">
          <p>
            Đọc lại dữ liệu và kiểm tra kết quả trước khi gửi lại. Thông tin đã nhập được giữ
            nguyên.
          </p>
          {mutation.verification && <p role="status">{mutation.verification}</p>}
          <div className="form-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={mutation.busy}
              onClick={onCheck}
            >
              {mutation.busy ? 'Đang kiểm tra…' : 'Kiểm tra kết quả'}
            </button>
            {reviewHref && (
              <Link className="button button-secondary" href={reviewHref}>
                {reviewLabel}
              </Link>
            )}
            {mutation.verification && (
              <button
                type="button"
                className="button button-secondary"
                disabled={mutation.busy}
                onClick={mutation.acknowledge}
              >
                Đã kiểm tra, cho phép thử lại
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
