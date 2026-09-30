'use client';

export function LoadingState({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}

export function ErrorPanel({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-panel" role="alert">
      <p>{message}</p>
      {retry && (
        <button type="button" className="button button-secondary" onClick={retry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }) {
  return message ? (
    <p className="field-error" role="alert">
      {message}
    </p>
  ) : null;
}
