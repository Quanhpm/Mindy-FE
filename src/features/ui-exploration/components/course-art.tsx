import type { Course } from '../data/courses';
import s from '../styles/commerce.module.css';

export function CourseArt({ course, compact = false }: { course: Course; compact?: boolean }) {
  return (
    <div
      className={`${s.courseArt} ${compact ? s.compactArt : ''}`}
      data-tone={course.tone}
      aria-hidden="true"
    >
      <div className={s.artMeta}>
        <span>MINDY / LEARNING SERIES</span>
        <span>{course.issue}</span>
      </div>
      <div className={s.artSheet}>
        <span className={s.artSymbol}>{course.symbol}</span>
        <span className={s.artLines}>
          <i />
          <i />
          <i />
        </span>
        <span className={s.artArrow}>↗</span>
      </div>
      <span className={s.artCaption}>LEARN SOMETHING. BUILD SOMETHING.</span>
    </div>
  );
}
