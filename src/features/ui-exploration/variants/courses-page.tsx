'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import { usePreviewCart } from '../components/cart-provider';
import { CourseArt } from '../components/course-art';
import { type Course, courses, formatPrice } from '../data/courses';
import { previewHref } from '../data/variants';
import s from '../styles/commerce.module.css';
import base from '../styles/exploration.module.css';

const categories = ['Tất cả', 'Frontend', 'Backend', 'Dữ liệu'] as const;
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll('đ', 'd');
}

function CartAction({ course, onAdd }: { course: Course; onAdd: (course: Course) => void }) {
  const { items, ready } = usePreviewCart();
  return items.some((item) => item.id === course.id) ? (
    <Link className={s.addedButton} href={previewHref('ocean-editorial', 'cart')}>
      <Icon name="check" size={17} /> Trong giỏ hàng <Icon name="arrow" size={17} />
    </Link>
  ) : (
    <button
      className={s.addButton}
      type="button"
      disabled={!ready}
      aria-label={`Thêm ${course.title} vào giỏ`}
      onClick={() => onAdd(course)}
    >
      Thêm vào giỏ <Icon name="plus" size={18} />
    </button>
  );
}

export function CoursesPage() {
  const { addCourse } = usePreviewCart();
  const [category, setCategory] = useState<string>('Tất cả');
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('Tất cả trình độ');
  const [sort, setSort] = useState('recommended');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Course | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const detailTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  const filtered = courses
    .filter(
      (course) =>
        (category === 'Tất cả' || course.category === category) &&
        (level === 'Tất cả trình độ' || course.level === level) &&
        normalize(`${course.title} ${course.description}`).includes(normalize(search.trim())),
    )
    .sort((a, b) =>
      sort === 'price-asc' ? a.price - b.price : sort === 'price-desc' ? b.price - a.price : 0,
    );
  const featured = courses[0];
  function add(course: Course) {
    addCourse(course.id);
    setNotice(`Đã thêm ${course.title} vào giỏ hàng.`);
  }
  return (
    <main id="main-content" className={s.commerce}>
      <div className={s.masthead}>
        <span>THE MINDY JOURNAL / KHÓA HỌC</span>
        <span>MỘT KỸ NĂNG. NHIỀU KHẢ NĂNG.</span>
        <span>VOL. 02 / 2026</span>
      </div>
      <section className={s.catalogHero}>
        <div className={s.catalogIntro}>
          <p className={s.eyebrow}>CHỌN ĐIỀU BẠN MUỐN HỌC</p>
          <h1 className={s.pageTitle}>
            Học điều mới.
            <br />
            <em>Mở thêm một lối đi.</em>
          </h1>
          <p className={s.introCopy}>
            Từ dòng code đầu tiên đến sản phẩm của riêng bạn. <br />
            Một lộ trình rõ ràng, cùng người đồng hành phù hợp.
          </p>
          <a href="#danh-sach-khoa-hoc" className={s.textLink}>
            Khám phá các khóa học <Icon name="arrow" size={20} />
          </a>
          <div className={s.introFoot}>
            <span>01 — KHÁM PHÁ</span>
            <span>02 — THỰC HÀNH</span>
            <span>03 — TRƯỞNG THÀNH</span>
          </div>
        </div>
        <article className={s.featured}>
          <div className={s.featuredLabel}>
            <span>ĐIỂM BẮT ĐẦU GỢI Ý</span>
            <Icon name="arrow" size={22} />
          </div>
          <CourseArt course={featured} />
          <div className={s.featuredInfo}>
            <div>
              <span>
                {featured.level} · {featured.duration}
              </span>
              <h2>{featured.title}</h2>
            </div>
            <strong>{formatPrice(featured.price)}</strong>
          </div>
          <CartAction course={featured} onAdd={add} />
        </article>
      </section>

      <section id="danh-sach-khoa-hoc" className={s.catalog} aria-label="Danh sách khóa học">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.eyebrow}>MỖI KHÓA HỌC, MỘT CHƯƠNG MỚI</p>
            <h2>Tìm điểm bắt đầu của bạn.</h2>
          </div>
          <span>{courses.length} khóa học được tuyển chọn</span>
        </div>
        <div className={s.filters}>
          <fieldset className={s.categoryTabs}>
            <legend className={base.visuallyHidden}>Lọc theo chủ đề</legend>
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </fieldset>
          <label className={s.search}>
            <Icon name="search" size={18} />
            <span className={base.visuallyHidden}>Tìm khóa học</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Bạn muốn học gì?"
            />
          </label>
        </div>
        <div className={s.catalogTools}>
          <p aria-live="polite">{filtered.length} khóa học phù hợp</p>
          <div>
            <label>
              <span id="course-level-label" className={base.visuallyHidden}>
                Trình độ
              </span>
              <select
                aria-labelledby="course-level-label"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option>Tất cả trình độ</option>
                <option>Bắt đầu</option>
                <option>Có nền tảng</option>
              </select>
            </label>
            <label>
              <span id="course-sort-label" className={base.visuallyHidden}>
                Sắp xếp khóa học
              </span>
              <select
                aria-labelledby="course-sort-label"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="recommended">Gợi ý cho bạn</option>
                <option value="price-asc">Học phí tăng dần</option>
                <option value="price-desc">Học phí giảm dần</option>
              </select>
            </label>
          </div>
        </div>
        <p className={s.liveNotice} role="status">
          {notice}
        </p>
        {filtered.length ? (
          <div className={s.courseGrid}>
            {filtered.map((course) => (
              <article className={s.courseCard} key={course.id} aria-label={course.title}>
                <CourseArt course={course} />
                <div className={s.courseBody}>
                  <div className={s.courseTags}>
                    <span>{course.category}</span>
                    <span>{course.level}</span>
                  </div>
                  <h3>
                    <button
                      type="button"
                      onClick={(event) => {
                        detailTrigger.current = event.currentTarget;
                        setSelected(course);
                      }}
                    >
                      {course.title}
                    </button>
                  </h3>
                  <p className={s.courseDescription}>{course.description}</p>
                  <div className={s.courseMeta}>
                    <span>
                      <Icon name="clock" size={16} /> {course.duration}
                    </span>
                    <span>
                      <Icon name="book" size={16} /> {course.lessons} buổi học
                    </span>
                  </div>
                  <div className={s.coursePrice}>
                    <strong>{formatPrice(course.price)}</strong>
                    <span>Trọn khóa</span>
                  </div>
                  <CartAction course={course} onAdd={add} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={s.noResults}>
            <Icon name="search" size={32} />
            <h3>Chưa tìm thấy khóa học phù hợp.</h3>
            <p>Thử một từ khóa khác hoặc mở rộng chủ đề bạn chọn.</p>
            <button
              type="button"
              className={base.outlineButton}
              onClick={() => {
                setSearch('');
                setCategory('Tất cả');
                setLevel('Tất cả trình độ');
              }}
            >
              Xem tất cả khóa học
            </button>
          </div>
        )}
      </section>
      <section className={s.learningNote}>
        <span className={s.noteSymbol}>↗</span>
        <div>
          <p className={s.eyebrow}>THE MINDY WAY</p>
          <h2>
            Không cần biết hết.
            <br />
            Chỉ cần sẵn sàng bắt đầu.
          </h2>
        </div>
        <p>
          Học từng bước, thực hành từng chút.
          <br />
          Mindy đồng hành để bạn đi xa hơn.
        </p>
      </section>

      <dialog
        ref={dialog}
        className={s.dialog}
        aria-labelledby="course-dialog-title"
        onClose={() => {
          setSelected(null);
          detailTrigger.current?.focus();
        }}
      >
        <button
          type="button"
          className={s.closeDialog}
          aria-label="Đóng nội dung khóa học"
          onClick={() => dialog.current?.close()}
        >
          <Icon name="close" />
        </button>
        {selected && (
          <>
            <p className={s.eyebrow}>
              {selected.category} / {selected.level}
            </p>
            <h2 id="course-dialog-title" className={s.dialogTitle}>
              {selected.title}
            </h2>
            <p className={s.dialogCopy}>{selected.description}</p>
            <div className={s.dialogMeta}>
              <span>
                {selected.duration} · {selected.lessons} buổi học
              </span>
              <span>Mentor {selected.mentor}</span>
            </div>
            <h3>Bạn sẽ học gì?</h3>
            <ol className={s.syllabus}>
              {selected.syllabus.map((module) => (
                <li key={module}>{module}</li>
              ))}
            </ol>
            <p className={s.projectNote}>
              <Icon name="book" size={20} /> Dự án cuối khóa: {selected.project}
            </p>
            <div className={s.dialogPrice}>
              <strong>{formatPrice(selected.price)}</strong>
              <CartAction course={selected} onAdd={add} />
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
