'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Icon } from '@/shared/ui/icon';
import { usePreviewCart } from '../components/cart-provider';
import { CourseArt } from '../components/course-art';
import { courses, formatPrice } from '../data/courses';
import { previewHref } from '../data/variants';
import s from '../styles/commerce.module.css';
import base from '../styles/exploration.module.css';

export function CartPage() {
  const { items, ready, removeCourse, addCourse } = usePreviewCart();
  const [notice, setNotice] = useState('');
  const review = useRef<HTMLDialogElement>(null);
  const reviewTrigger = useRef<HTMLButtonElement>(null);
  const total = items.reduce((sum, course) => sum + course.price, 0);
  const suggestions = courses
    .filter((course) => !items.some((item) => item.id === course.id))
    .slice(0, 2);
  return (
    <main id="main-content" className={s.commerce}>
      <div className={s.masthead}>
        <span>THE MINDY JOURNAL / GIỎ HÀNG</span>
        <span>MANG THEO MỘT KHỞI ĐẦU MỚI.</span>
        <span>VOL. 03 / 2026</span>
      </div>
      <div className={s.cartHeading}>
        <div>
          <p className={s.eyebrow}>HÀNH TRÌNH BẠN ĐÃ CHỌN</p>
          <h1 className={s.pageTitle}>
            Một giỏ nhỏ.
            <br />
            <em>Nhiều khả năng mới.</em>
          </h1>
        </div>
        <Link className={s.textLink} href={previewHref('ocean-editorial', 'courses')}>
          Tiếp tục khám phá <Icon name="arrow" size={20} />
        </Link>
      </div>
      <p className={s.liveNotice} role="status">
        {notice}
      </p>
      {!ready ? (
        <p className={s.loading} role="status">
          Đang mở giỏ hàng của bạn…
        </p>
      ) : items.length ? (
        <div className={s.cartLayout}>
          <section className={s.cartList} aria-label="Khóa học trong giỏ">
            <div className={s.cartListHeading}>
              <span>KHÓA HỌC ĐÃ CHỌN</span>
              <span>{items.length} khóa học</span>
            </div>
            {items.map((course) => (
              <article className={s.cartItem} key={course.id} aria-label={course.title}>
                <CourseArt course={course} compact />
                <div className={s.cartItemInfo}>
                  <span className={s.itemCategory}>
                    {course.category} / {course.level}
                  </span>
                  <h2>{course.title}</h2>
                  <p>Mentor {course.mentor}</p>
                  <div className={s.courseMeta}>
                    <span>
                      <Icon name="clock" size={15} /> {course.duration}
                    </span>
                    <span>
                      <Icon name="book" size={15} /> {course.lessons} buổi học
                    </span>
                  </div>
                  <button
                    className={s.removeButton}
                    type="button"
                    aria-label={`Xóa ${course.title} khỏi giỏ`}
                    onClick={() => {
                      removeCourse(course.id);
                      setNotice(`Đã xóa ${course.title} khỏi giỏ hàng.`);
                    }}
                  >
                    <Icon name="trash" size={15} /> Xóa khỏi giỏ
                  </button>
                </div>
                <div className={s.itemPrice}>
                  <strong>{formatPrice(course.price)}</strong>
                  <span>1 suất học · Trọn khóa</span>
                </div>
              </article>
            ))}
            <div className={s.cartFootnote}>
              <Icon name="book" size={20} />
              <p>
                Mỗi khóa học là một suất học dành cho bạn.
                <br />
                Bạn có thể chọn nhiều kỹ năng cho cùng một hành trình.
              </p>
            </div>
          </section>
          <aside className={s.orderAside} aria-label="Tóm tắt giỏ hàng">
            <section className={s.orderSummary}>
              <p className={s.eyebrow}>YOUR NEXT CHAPTER</p>
              <h2>Khởi đầu của bạn.</h2>
              <div className={s.summaryRow}>
                <span>{items.length} khóa học</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <div className={s.summaryTotal}>
                <span>Tổng học phí</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button
                ref={reviewTrigger}
                type="button"
                className={base.primaryButton}
                onClick={() => review.current?.showModal()}
              >
                Xem lại đăng ký <Icon name="arrow" size={19} />
              </button>
              <p className={s.previewNote}>Bản xem thử giỏ hàng · Chưa mở thanh toán.</p>
            </section>
            <div className={s.promiseNote}>
              <Icon name="check" size={19} />
              <div>
                <strong>Một lộ trình. Người đồng hành.</strong>
                <p>Thực hành cùng mentor, nhận phản hồi và tiến bộ từng bước.</p>
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <section className={s.emptyCart} aria-label="Giỏ hàng trống">
          <div className={s.emptyArtwork} aria-hidden="true">
            <span>{'{ }'}</span>
            <i>↗</i>
          </div>
          <p className={s.eyebrow}>MỘT KHOẢNG TRỐNG CHO ĐIỀU MỚI</p>
          <h2>
            Giỏ hàng đang chờ
            <br />
            một khởi đầu của bạn.
          </h2>
          <p>
            Chọn một điều bạn muốn học.
            <br />
            Thêm vào giỏ và bắt đầu viết chương tiếp theo.
          </p>
          <Link className={base.primaryButton} href={previewHref('ocean-editorial', 'courses')}>
            Khám phá khóa học <Icon name="arrow" size={19} />
          </Link>
        </section>
      )}
      {ready && suggestions.length > 0 && (
        <section className={s.suggestions}>
          <div className={s.sectionHeading}>
            <div>
              <p className={s.eyebrow}>MỞ THÊM MỘT LỐI ĐI</p>
              <h2>Có thể bạn cũng muốn học.</h2>
            </div>
            <Link className={s.textLink} href={previewHref('ocean-editorial', 'courses')}>
              Tất cả khóa học <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className={s.suggestionGrid}>
            {suggestions.map((course) => (
              <article className={s.suggestionCard} key={course.id}>
                <CourseArt course={course} compact />
                <div>
                  <span className={s.itemCategory}>
                    {course.category} / {course.duration}
                  </span>
                  <h3>{course.title}</h3>
                  <strong>{formatPrice(course.price)}</strong>
                </div>
                <button
                  type="button"
                  className={s.suggestionAdd}
                  aria-label={`Thêm ${course.title} vào giỏ`}
                  onClick={() => {
                    addCourse(course.id);
                    setNotice(`Đã thêm ${course.title} vào giỏ hàng.`);
                  }}
                >
                  <Icon name="plus" size={22} />
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      <dialog
        ref={review}
        className={s.dialog}
        aria-labelledby="cart-review-title"
        onClose={() => reviewTrigger.current?.focus()}
      >
        <button
          type="button"
          className={s.closeDialog}
          aria-label="Đóng đăng ký"
          onClick={() => review.current?.close()}
        >
          <Icon name="close" />
        </button>
        <p className={s.eyebrow}>HÀNH TRÌNH SẮP TỚI</p>
        <h2 className={s.dialogTitle} id="cart-review-title">
          Những điều bạn sẽ học.
        </h2>
        <ul className={s.reviewItems}>
          {items.map((course) => (
            <li key={course.id}>
              <span>{course.title}</span>
              <strong>{formatPrice(course.price)}</strong>
            </li>
          ))}
        </ul>
        <div className={s.summaryTotal}>
          <span>Tổng học phí</span>
          <strong>{formatPrice(total)}</strong>
        </div>
        <p className={s.dialogCopy}>
          Bạn đang xem thử trải nghiệm đăng ký. Thanh toán và ghi danh chưa được mở.
        </p>
        <button
          type="button"
          className={base.outlineButton}
          onClick={() => review.current?.close()}
        >
          Quay lại giỏ hàng
        </button>
      </dialog>
    </main>
  );
}
