import Link from 'next/link';
import { Icon } from '@/shared/ui/icon';
import { benefits, steps, topics } from '../data/fixtures';
import { previewHref, type VariantId } from '../data/variants';
import base from '../styles/exploration.module.css';
import s from '../styles/ocean.module.css';

function Start({ variant }: { variant: VariantId }) {
  return (
    <Link className={base.primaryButton} href={previewHref(variant, 'register')}>
      Bắt đầu hành trình <Icon name="arrow" size={19} />
    </Link>
  );
}

function LearningSteps({ title = 'Một hành trình. Ba bước nhỏ.' }: { title?: string }) {
  return (
    <section className={s.learningSteps} id="cach-hoc">
      <div className={s.chapterHeading}>
        <span className={s.sectionIndex}>THE MINDY WAY / 03</span>
        <h2 className={s.chapterTitle}>{title}</h2>
      </div>
      <div className={s.stepCards}>
        {steps.map((step) => (
          <article key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <Icon name="arrow" size={22} />
          </article>
        ))}
      </div>
    </section>
  );
}

function LearningTopics({ variant }: { variant: VariantId }) {
  return (
    <section className={s.learningTopics} id="chu-de">
      <div className={s.chapterHeading}>
        <span className={s.sectionIndex}>KHƠI MỞ ĐIỀU MỚI / CHỦ ĐỀ MINH HỌA</span>
        <h2 className={s.chapterTitle}>Bạn muốn bắt đầu từ đâu?</h2>
      </div>
      <div className={s.topicCards}>
        {topics.map((topic) => (
          <article key={topic.number}>
            <div className={s.topicSymbol} aria-hidden="true">
              {topic.code.replaceAll(' ', '')}
              <span>{topic.number}</span>
            </div>
            <div>
              <small>{topic.subtitle}</small>
              <h3>{topic.title}</h3>
              <Link href={previewHref(variant, 'courses')}>
                Khám phá khóa học <span>↗</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Closing({ variant }: { variant: VariantId }) {
  return (
    <section className={s.closing}>
      <div>
        <span className={s.sectionIndex}>YOUR NEXT CHAPTER</span>
        <h2 className={s.chapterTitle}>
          Một bước nhỏ hôm nay.
          <br />
          Một chân trời mới ngày mai.
        </h2>
      </div>
      <Start variant={variant} />
    </section>
  );
}

export function HomeVariant() {
  return (
    <div className={`${s.expandedHome} ${s.editorialHome}`}>
      <section className={s.editorialCover}>
        <div className={s.editorialMasthead}>
          <span>THE MINDY JOURNAL</span>
          <span>HỌC HỎI LÀ MỘT HÀNH TRÌNH.</span>
          <span>VOL. 01 / 2026</span>
        </div>
        <div className={s.editorialStory}>
          <div className={s.issueNumber} aria-hidden="true">
            01<span>MỘT KHỞI ĐẦU</span>
          </div>
          <h1 className={s.homeTitle}>
            Câu chuyện mới.
            <br />
            <em>Bắt đầu từ bạn.</em>
          </h1>
          <p className={s.leadCopy}>
            Không cần có tất cả câu trả lời để bắt đầu học.
            <br />
            Chỉ cần một chút tò mò và một người đồng hành.
          </p>
          <Start variant="ocean-editorial" />
        </div>
        <aside className={s.editorialContents}>
          <p className={s.sectionIndex}>TRONG HÀNH TRÌNH NÀY</p>
          {benefits.map((benefit, index) => (
            <a key={benefit.title} href="#cach-hoc">
              <span>0{index + 1}</span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
              <Icon name="arrow" size={21} />
            </a>
          ))}
          <span className={s.editorialStamp}>
            LEARN
            <br />
            CONNECT
            <br />
            GROW ↗
          </span>
        </aside>
      </section>
      <LearningTopics variant="ocean-editorial" />
      <LearningSteps title="Đi từng bước, viết tiếp câu chuyện." />
      <Closing variant="ocean-editorial" />
    </div>
  );
}
