'use client';
import { useState } from 'react';
import styles from './public-catalog.module.css';
export function CourseImage({
  src,
  title,
  code,
}: {
  src: string | null;
  title: string;
  code: string;
}) {
  return <CourseImageContent key={src ?? 'no-image'} src={src} title={title} code={code} />;
}
function CourseImageContent({
  src,
  title,
  code,
}: {
  src: string | null;
  title: string;
  code: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div className={styles.art} aria-hidden="true">
        <span>MINDY / LEARNING SERIES</span>
        <strong>{code}</strong>
      </div>
    );
  // External course URLs are rendered directly; no server-side image proxy or arbitrary remotePatterns.
  return (
    // biome-ignore lint/performance/noImgElement: Backend supplies arbitrary validated HTTP/HTTPS image URLs.
    <img
      src={src}
      alt={`Ảnh khóa học ${title}`}
      className={styles.courseImage}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
