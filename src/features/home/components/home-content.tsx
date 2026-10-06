import Link from 'next/link';
import { Icon } from '@/shared/ui/icon';
import s from './home-content.module.css';

const shortcuts = [
  {
    title: 'Khám phá khóa học',
    subtitle: 'Tìm điều bạn muốn học',
    icon: 'book',
    href: '/courses',
    tone: 'blue',
    label: 'Xem khóa học',
  },
  {
    title: 'Thực hành code',
    subtitle: 'Biến ý tưởng thành kết quả',
    icon: 'chevron',
    href: '/compiler',
    tone: 'lavender',
    label: 'Thử ngay',
  },
  {
    title: 'Bắt đầu hành trình',
    subtitle: 'Tạo không gian của riêng bạn',
    icon: 'users',
    href: '/register',
    tone: 'pink',
    label: 'Tạo tài khoản',
  },
] as const;
const steps = [
  {
    title: 'Khám phá điều bạn thích',
    text: 'Đọc đề cương, xem nội dung và chọn khóa học phù hợp với mục tiêu của bạn.',
    icon: 'book',
  },
  {
    title: 'Chọn lớp phù hợp',
    text: 'Tìm hiểu mentor, thời gian và hình thức học trước khi đăng ký.',
    icon: 'clock',
  },
  {
    title: 'Sẵn sàng cho chương mới',
    text: 'Tạo tài khoản, thêm lớp vào giỏ và theo dõi đơn đăng ký của bạn.',
    icon: 'user',
  },
] as const;

function BooksArt() {
  return (
    <svg className={s.books} viewBox="0 0 260 220" aria-hidden="true">
      <ellipse cx="136" cy="199" rx="100" ry="12" fill="#dde3ec" />
      <path d="m26 125 80-40 140 70-82 49Z" fill="#8295c2" />
      <path d="m26 125 0 21 138 71 0-21Z" fill="#536f9f" />
      <path d="m164 196 82-41v21l-82 41Z" fill="#dce2f2" />
      <path d="m39 96 76-42 130 63-81 47Z" fill="#a496bf" />
      <path d="m39 96 0 19 125 66 0-17Z" fill="#8277a4" />
      <path d="m164 164 81-47v18l-81 46Z" fill="#eee9f5" />
      <path d="m40 59 82-46 118 64-76 47Z" fill="#ffcbcf" />
      <path d="m40 59 0 21 124 66 0-22Z" fill="#ed839f" />
      <path d="m164 124 76-47v21l-76 48Z" fill="#fff1f3" />
      <path d="m70 55 48-27 84 46-46 27Z" fill="none" stroke="#e398a9" strokeWidth="2" />
      <path
        d="m180 32 4-10m10 17 9-3M24 81l-9-3"
        stroke="#8295c2"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeContent() {
  return (
    <div className={s.content}>
      <section className={s.welcome} aria-labelledby="home-title">
        <div>
          <p className={s.eyebrow}>CHÀO MỪNG ĐẾN VỚI MINDY</p>
          <h1 id="home-title">
            Một nơi để học.
            <br />
            <span>Một hành trình để lớn.</span>
          </h1>
          <p>
            Mỗi điều mới bắt đầu bằng một chút tò mò. Khám phá điều bạn yêu thích và viết tiếp hành
            trình của mình cùng Mindy.
          </p>
          <Link className="button button-primary" href="/courses">
            Khám phá khóa học <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className={s.welcomeArt}>
          <BooksArt />
          <span>LEARN. CONNECT. GROW.</span>
        </div>
      </section>
      <section aria-labelledby="explore-title">
        <div className={s.sectionHeading}>
          <h2 id="explore-title">Hôm nay, bạn muốn khám phá gì?</h2>
          <span>Một khởi đầu mới đang chờ bạn</span>
        </div>
        <div className={s.shortcuts}>
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href} className={`${s.shortcut} ${s[item.tone]}`}>
              <span className={s.shortcutIcon}>
                <Icon name={item.icon} size={24} />
              </span>
              <p>{item.subtitle}</p>
              <h3>{item.title}</h3>
              <span className={s.shortcutLink}>
                {item.label}
                <Icon name="arrow" size={18} />
              </span>
              <span className={s.cardCircle} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
      <section className={s.journey} id="hanh-trinh" aria-labelledby="journey-title">
        <div className={s.sectionHeading}>
          <div>
            <p className={s.eyebrow}>TỪNG BƯỚC CÙNG MINDY</p>
            <h2 id="journey-title">Hành trình của bạn bắt đầu từ đây</h2>
          </div>
          <span className={s.smallBadge}>3 bước đơn giản</span>
        </div>
        <ol className={s.steps}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className={s.stepIcon}>
                <Icon name={step.icon} size={20} />
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <span className={s.stepNumber}>0{index + 1}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className={s.practice} aria-labelledby="practice-title">
        <div className={s.practiceIntro}>
          <span className={s.practiceIcon} aria-hidden="true">
            {'{ }'}
          </span>
          <div>
            <p className={s.eyebrow}>HỌC QUA TỪNG LẦN THỬ</p>
            <h2 id="practice-title">Một ý tưởng nhỏ. Một dòng code đầu tiên.</h2>
            <p>Thử JavaScript ngay trên trình duyệt, không cần cài đặt.</p>
          </div>
        </div>
        <div className={s.codeWindow}>
          <div className={s.windowBar}>
            <span>
              <i />
              <i />
              <i />
            </span>
            <span>hello-mindy.js</span>
            <span>JavaScript</span>
          </div>
          <pre>
            <code>
              <span className={s.comment}>{'// Bắt đầu với một lời chào.'}</span>
              {'\n'}
              <span className={s.keyword}>const</span>
              {' message = '}
              <span className={s.string}>&apos;Xin chào, Mindy!&apos;</span>
              {';\nconsole.log(message);'}
            </code>
          </pre>
          <div className={s.output}>
            <span>Kết quả minh họa</span>
            <code>Xin chào, Mindy!</code>
            <Icon name="check" size={16} />
          </div>
        </div>
        <Link className={s.practiceLink} href="/compiler">
          Mở góc thực hành
          <Icon name="arrow" size={17} />
        </Link>
      </section>
      <section className={s.closing} aria-labelledby="closing-title">
        <div>
          <span className={s.eyebrow}>CHƯƠNG TIẾP THEO CỦA BẠN</span>
          <h2 id="closing-title">
            Một bước nhỏ hôm nay.
            <br />
            Một chân trời mới ngày mai.
          </h2>
        </div>
        <Link className="button button-primary" href="/register">
          Bắt đầu cùng Mindy
          <Icon name="arrow" size={17} />
        </Link>
        <span className={s.closingDecoration} aria-hidden="true">
          ✳
        </span>
      </section>
    </div>
  );
}
