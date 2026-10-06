'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import Link from 'next/link';
import { type ReactNode, useRef } from 'react';
import { Icon } from '@/shared/ui/icon';
import s from './home-content.module.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);
const steps = [
  {
    title: 'Tìm điều bạn muốn học',
    text: 'Khám phá đề cương và chọn khóa học phù hợp với mục tiêu của bạn.',
    icon: 'book',
  },
  {
    title: 'Chọn lớp, gặp mentor',
    text: 'Xem lịch, hình thức học và người đồng hành trước khi đăng ký.',
    icon: 'clock',
  },
  {
    title: 'Bắt đầu và thực hành',
    text: 'Theo dõi đơn đăng ký, vào lớp và tiếp tục hành trình của bạn.',
    icon: 'check',
  },
] as const;

export function HomeContent({ courses }: { courses: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-hero-reveal]', {
          y: 22,
          opacity: 0,
          duration: 0.9,
          stagger: 0.1,
          ease: 'power3.out',
        });
        for (const element of gsap.utils.toArray<HTMLElement>('[data-reveal]', scope.current)) {
          gsap.from(element, {
            y: 24,
            opacity: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: element, start: 'top 94%', once: true },
          });
        }
      });
      media.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-mascot]',
          { scale: 0.96 },
          {
            scale: 1.04,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-hero]',
              start: 'top top',
              end: 'bottom top',
              scrub: 1,
            },
          },
        );
        gsap.fromTo(
          '[data-word]',
          { opacity: 0.8 },
          {
            opacity: 1,
            stagger: 0.12,
            ease: 'none',
            scrollTrigger: { trigger: '#hanh-trinh', start: 'top 85%', end: 'top 35%', scrub: 1 },
          },
        );
      });
      return () => media.revert();
    },
    { scope },
  );
  return (
    <div ref={scope} className={s.content}>
      <section className={s.hero} data-hero>
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <p className={s.intro} data-hero-reveal>
              <span /> Khởi đầu ở Min - bùng nổ ở Max.
            </p>
            <h1 data-hero-reveal>
              Học code.
              <br />
              Mở thế giới của bạn.
            </h1>
            <p className={s.description} data-hero-reveal>
              Từ dòng code đầu tiên đến điều bạn muốn tạo ra. Khám phá, thực hành và từng bước tiến
              bộ cùng Mindy.
            </p>
            <div className={s.heroActions} data-hero-reveal>
              <Link href="/courses" className={s.primary}>
                Khám phá khóa học{' '}
                <span>
                  <Icon name="arrow" />
                </span>
              </Link>
              <Link href="/compiler" className={s.textLink}>
                Thử viết code <Icon name="chevron" size={16} />
              </Link>
            </div>
            <p className={s.heroNote} data-hero-reveal>
              <Icon name="book" size={18} /> Học có lộ trình. Thực hành có không gian.
            </p>
          </div>
          <div className={s.visual} data-hero-reveal>
            <Image
              data-mascot
              className={s.mascot}
              src="/mindy/coding-mascot.png"
              alt="Bạn ếch Mindy đang khám phá lập trình trên laptop"
              width={1280}
              height={1280}
              sizes="(max-width: 800px) 90vw, 48vw"
              preload
            />
            <span className={s.visualCaption}>Cứ thử. Bạn sẽ làm được.</span>
          </div>
        </div>
      </section>
      <section className={`${s.section} ${s.startSection}`}>
        <div className={s.sectionHeading} data-reveal>
          <h2>
            Có nhiều cách
            <br />
            để bắt đầu.
          </h2>
          <p>
            Một khóa học mới, một ý tưởng nhỏ.
            <br />
            Chọn điều khiến bạn tò mò hôm nay.
          </p>
        </div>
        <div className={s.bento}>
          <Link href="/courses" className={s.mainCard} data-reveal>
            <span className={s.cardIcon}>
              <Icon name="book" size={24} />
            </span>
            <h3>
              Tìm khóa học
              <br />
              hợp với bạn.
            </h3>
            <p>
              Lộ trình, lịch học và mentor.
              <br />
              Mọi điều cần biết trước khi bắt đầu.
            </p>
            <span className={s.cardLink}>
              Xem khóa học <Icon name="arrow" size={19} />
            </span>
            <span className={s.codeGlyph} aria-hidden="true">
              &lt;/&gt;
            </span>
          </Link>
          <Link href="/compiler" className={s.practiceCard} data-reveal>
            <span className={s.cardIcon}>
              <Icon name="chevron" size={24} />
            </span>
            <h3>
              Học bằng
              <br />
              cách thử.
            </h3>
            <p>Viết JavaScript ngay trong trình duyệt của bạn.</p>
            <span className={s.cardLink}>
              Thử ngay <Icon name="arrow" size={19} />
            </span>
          </Link>
          <Link href="/register" className={s.accountCard} data-reveal>
            <span className={s.cardIcon}>
              <Icon name="user" size={24} />
            </span>
            <h3>
              Khởi đầu
              <br />
              của riêng bạn.
            </h3>
            <p>Một tài khoản để kết nối hành trình học tập.</p>
            <span className={s.cardLink}>
              Tạo tài khoản <Icon name="arrow" size={19} />
            </span>
          </Link>
        </div>
      </section>
      <section className={s.section}>
        <div className={s.sectionHeading} data-reveal>
          <h2>
            Điểm bắt đầu cho
            <br />ý tưởng tiếp theo.
          </h2>
          <Link href="/courses" className={s.textLink}>
            Tất cả khóa học <Icon name="arrow" size={18} />
          </Link>
        </div>
        {courses}
      </section>
      <section id="hanh-trinh" className={s.journey}>
        <div data-reveal>
          <p className={s.kicker}>HÀNH TRÌNH CÙNG MINDY</p>
          <h2>
            <span data-word>Một bước nhỏ.</span>
            <br />
            <span data-word>Một điều mới.</span>
            <br />
            <span data-word>Mỗi ngày.</span>
          </h2>
          <p className={s.description}>
            Bạn không cần biết tất cả để bắt đầu. Chỉ cần một điểm xuất phát và sự tò mò.
          </p>
        </div>
        <ol className={s.steps}>
          {steps.map((step, index) => (
            <li key={step.title} data-reveal>
              <span className={s.stepNumber}>0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <Icon name={step.icon} size={22} />
            </li>
          ))}
        </ol>
      </section>
      <section className={s.practice} data-reveal>
        <div>
          <p className={s.kicker}>KHÔNG GIAN THỰC HÀNH</p>
          <h2>
            Thử ngay.
            <br />
            Hiểu thêm một chút.
          </h2>
          <p>
            Đôi khi, cách tốt nhất để hiểu một điều là tự tay làm thử. Mở trình soạn thảo và viết
            dòng code của bạn.
          </p>
          <Link href="/compiler" className={s.primary}>
            Mở không gian code{' '}
            <span>
              <Icon name="arrow" />
            </span>
          </Link>
        </div>
        <div className={s.codeWindow}>
          <div className={s.codeBar}>
            <span />
            <span />
            <span />
            <p>hello-mindy.js</p>
          </div>
          <pre>
            <code>
              <span className={s.codeComment}>{'// Mọi hành trình đều có dòng đầu tiên.'}</span>
              {'\n\n'}
              <span className={s.codeKeyword}>const</span>
              {' hello = "Xin chào, Mindy!";\n\nconsole.log(hello);'}
            </code>
          </pre>
          <div className={s.codeOutput}>
            <small>Kết quả minh họa</small>
            <p>Xin chào, Mindy!</p>
            <Icon name="check" size={17} />
          </div>
        </div>
      </section>
      <section className={s.closing} data-reveal>
        <div>
          <p className={s.kicker}>HẸN GẶP BẠN Ở DÒNG CODE ĐẦU TIÊN</p>
          <h2>
            Sẵn sàng học
            <br />
            một điều mới?
          </h2>
        </div>
        <Link href="/register" className={s.primary}>
          Bắt đầu cùng Mindy{' '}
          <span>
            <Icon name="arrow" />
          </span>
        </Link>
      </section>
    </div>
  );
}
