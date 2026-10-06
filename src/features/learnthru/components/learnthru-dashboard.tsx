'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import styles from './learnthru-dashboard.module.css';

type IconName =
  | 'home'
  | 'users'
  | 'laptop'
  | 'video'
  | 'library'
  | 'search'
  | 'folder'
  | 'teacher'
  | 'bell'
  | 'left'
  | 'right';
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: <path d="m3 10 9-8 9 8v11h-6v-7H9v7H3Z" fill="currentColor" stroke="none" />,
    users: (
      <>
        <circle cx="9" cy="7" r="3" fill="currentColor" />
        <path d="M3 20v-4a6 6 0 0 1 12 0v4Z" fill="currentColor" />
        <path d="M17 4a3 3 0 0 1 0 6m1 3q4 1 3 6" />
      </>
    ),
    laptop: (
      <>
        <path d="M5 4h14v13H5Z" fill="currentColor" stroke="none" />
        <path d="M2 20h20" />
        <circle cx="12" cy="14" r=".5" stroke="white" />
      </>
    ),
    video: (
      <>
        <rect x="2" y="6" width="13" height="12" rx="2" fill="currentColor" stroke="none" />
        <path d="m16 10 6-4v12l-6-4Z" fill="currentColor" stroke="none" />
      </>
    ),
    library: (
      <>
        <path d="M3 4h7l2 3h9v14H3Z" fill="currentColor" stroke="none" />
        <path d="m10 11 5 3-5 3Z" fill="white" stroke="none" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </>
    ),
    folder: <path d="M3 7h7l2 2h9v12H3Zm0 0V4h7l2 3" />,
    teacher: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="9" r="2.5" />
        <path d="M7 18v-2a5 5 0 0 1 10 0v2" />
      </>
    ),
    bell: (
      <>
        <path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5Zm5 3h4" />
        <path d="M12 2v2" />
      </>
    ),
    left: <path d="m14 6-6 6 6 6" />,
    right: <path d="m9 6 6 6-6 6" />,
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function BooksArt() {
  return (
    <svg className={styles.books} viewBox="0 0 260 220" aria-hidden="true">
      <path d="m21 162 125-63 105 86-79 36Z" fill="#f7f7fa" />
      <path d="m26 99 80-38 140 71-82 54Z" fill="#6467ef" />
      <path d="m26 99-2 22 139 73 1-28Z" fill="#4348d3" />
      <path d="m164 166 82-34v23l-82 39Z" fill="#383ac0" />
      <path d="m170 169 72-29v12l-72 33Z" fill="#f0f0ff" />
      <path d="m39 87 76-44 130 61-81 52Z" fill="#8c90ff" />
      <path d="m39 87 1 15 123 67 1-13Z" fill="#5558e6" />
      <path d="m164 156 81-52v14l-81 51Z" fill="#deddf8" />
      <path d="m40 54 82-46 118 67-76 49Z" fill="#ffcbcf" />
      <path d="m40 54v21l124 67v-18Z" fill="#fb88a2" />
      <path d="m164 124 76-49v20l-76 47Z" fill="#f7819c" />
      <path d="m169 124 66-42v11l-66 41Z" fill="#fff0ed" />
      <path d="m74 53 92-54 77 44-91 59Z" fill="#c4c7ff" />
      <path d="m74 53 78 43 91-53v7l-91 55-78-43Z" fill="#5153cb" />
      <path d="m85 52 81-45 64 36-78 48Z" fill="#eceeff" />
      <path
        d="m107 48 13-8 53 29-12 9Zm23-14 13-8 53 29-12 9Zm24-14 12-7 54 30-12 7Z"
        fill="#d7dafa"
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={111 + i * 19} cy={49 - i * 11} rx="5" ry="2.8" fill="#6760e5" />
      ))}
    </svg>
  );
}
function HelpArt() {
  return (
    <svg viewBox="0 0 150 118" className={styles.helpArt} aria-hidden="true">
      <circle cx="76" cy="48" r="42" fill="#f0f2fa" />
      <path
        d="M43 93V63q-27-2-21-25 7-24 27-9 11 6 6 20 27-10 24 12-4 17-21 17v15"
        fill="#4c679a"
      />
      <path d="M109 91V56q22-21 20-5-1 10-16 18 30-13 25 1-4 8-23 9 25 1 17 10Z" fill="#9eadd5" />
      <path
        d="M67 34q-17-16-8-24 8-8 15 14-2-26 8-21 8 3 0 25 17-23 22-12 2 10-21 22"
        fill="#d7dbef"
      />
      <path d="m45 76 41-8 34 15-44 13Z" fill="#d0d8ee" />
      <path d="m45 76 31 13v16L45 91Zm31 13 44-6v15l-44 7Z" fill="#94a4cc" />
      <path d="M64 89V62l16 4v29Z" fill="#f8f9ff" />
      <path d="m84 96 8-25 16 5-9 23Z" fill="#b8c4e4" />
      <rect x="84" y="29" width="32" height="25" rx="2" fill="#ef91ac" />
      <text x="100" y="46" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">
        24/7
      </text>
      <path d="m40 105 83-5" stroke="#bec8de" strokeWidth="2" />
    </svg>
  );
}
function Members({ count, large = false }: { count?: string; large?: boolean }) {
  return (
    <div className={`${styles.members} ${large ? styles.largeMembers : ''}`}>
      {['member-one.jpg', 'member-two.jpg', 'stella.jpg'].slice(0, large ? 3 : 2).map((file, i) => (
        <Image
          key={file}
          src={`/learnthru/${file}`}
          width={large ? 27 : 20}
          height={large ? 27 : 20}
          alt={`Class member ${i + 1}`}
        />
      ))}
      {count && <span>{count}</span>}
    </div>
  );
}
const classes = [
  { title: 'English - UNIT III', files: 10, teacher: 'Leona Jimenez', count: '+4' },
  { title: 'English - UNIT II', files: 12, teacher: 'Cole Chandler', count: '+2' },
  { title: 'UNIT I', files: 16, teacher: 'Cole Chandler', count: '+4' },
];
const lessons = [
  { teacher: 'Bernard Carr', date: '12.07.2022', count: '3+', status: 'Done' },
  { teacher: 'Henry Poole', date: '17.07.2022', count: '7+', status: 'Pending' },
  { teacher: 'Helena Lowe', date: '22.07.2022', status: 'Done' },
];
const navigation: { label: string; icon: IconName; target: string }[] = [
  { label: 'Dashboard', icon: 'home', target: '#main-content' },
  { label: 'Classroom', icon: 'users', target: '#learnthru-classes' },
  { label: 'Live Lessons', icon: 'laptop', target: '#learnthru-lessons' },
  { label: 'Recorded Lessons', icon: 'video', target: '#learnthru-lessons' },
  { label: 'Video library', icon: 'library', target: '#learnthru-lessons' },
];

export function LearnthruDashboard() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState(11);
  const [year, setYear] = useState(2022);
  const [selectedDay, setSelectedDay] = useState(7);
  const [dialog, setDialog] = useState<string | null>(null);
  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);
  const monthName = new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  // Preserve the reference calendar arrangement on the initial preview month.
  const offset = month === 11 && year === 2022 ? 4 : (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  function changeMonth(direction: number) {
    const date = new Date(year, month + direction);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
    setSelectedDay(0);
  }
  return (
    <main id="main-content" className={styles.page}>
      <div className={styles.dashboard}>
        <aside className={styles.sidebar}>
          <a className={styles.brand} href="/learnthru" aria-label="Learnthru dashboard">
            <span className={styles.brandMark}>
              <i />
              <i />
              <i />
            </span>
            <strong>Learnthru</strong>
          </a>
          <nav className={styles.navigation} aria-label="Learning navigation">
            {navigation.map((item, i) => (
              <a
                key={item.label}
                href={item.target}
                className={i === 0 ? styles.active : undefined}
                aria-current={i === 0 ? 'page' : undefined}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
          <button className={styles.help} type="button" onClick={() => setDialog('Need help?')}>
            <HelpArt />
            <strong>Need help?</strong>
            <span>
              Do you have any problem
              <br />
              while using the Learnthru?
            </span>
          </button>
        </aside>
        <section className={styles.workspace} aria-label="Learning dashboard">
          <header className={styles.topbar}>
            <label className={styles.search}>
              <span>
                <Icon name="search" />
              </span>
              <input
                aria-label="Search classes"
                placeholder="Search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <span className={styles.today}>12 May 2022, Friday</span>
          </header>
          <section className={styles.welcome}>
            <div>
              <h1>Welcome back, Stella Walton!</h1>
              <p>
                New French speaking classes are available.
                <br />
                Étudier en France for B1 and B2 levels.{' '}
                <button type="button" onClick={() => setDialog('French speaking classes')}>
                  Learn more
                </button>
              </p>
              <button className={styles.pill} type="button" onClick={() => setDialog('Buy Lesson')}>
                Buy Lesson
              </button>
            </div>
            <BooksArt />
          </section>
          <section id="learnthru-classes" className={styles.classes}>
            <div className={styles.sectionHeading}>
              <h2>Classes</h2>
              <button type="button" onClick={() => setDialog('All classes')}>
                View All <Icon name="right" />
              </button>
            </div>
            <div className={styles.classGrid}>
              {classes
                .filter((item) =>
                  `${item.title} ${item.teacher}`.toLowerCase().includes(query.toLowerCase()),
                )
                .map((item, i) => (
                  <button
                    type="button"
                    className={`${styles.classCard} ${styles[`class${i}`]}`}
                    key={item.title}
                    onClick={() => setDialog(item.title)}
                  >
                    <h3>{item.title}</h3>
                    <Members count={item.count} />
                    <span className={styles.files}>
                      <Icon name="folder" />
                      {item.files} Files
                    </span>
                    <span className={styles.teacher}>
                      <Icon name="teacher" />
                      Teacher: {item.teacher}
                    </span>
                  </button>
                ))}
            </div>
            {query &&
              !classes.some((item) =>
                `${item.title} ${item.teacher}`.toLowerCase().includes(query.toLowerCase()),
              ) && <p className={styles.empty}>No classes found.</p>}
          </section>
          <section id="learnthru-lessons" className={styles.lessons}>
            <div className={styles.sectionHeading}>
              <h2>Lessons</h2>
              <button type="button" onClick={() => setDialog('All lessons')}>
                View All <Icon name="right" />
              </button>
            </div>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    {['Class', 'Teacher Name', 'Members', 'Starting', 'Material', 'Payment'].map(
                      (label) => (
                        <th key={label}>{label}</th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((item) => (
                    <tr key={item.teacher}>
                      <td>A1</td>
                      <td>{item.teacher}</td>
                      <td>
                        <Members count={item.count} large />
                      </td>
                      <td>{item.date}</td>
                      <td>
                        <a href="/learnthru/lesson-material.txt" download>
                          Download
                        </a>
                      </td>
                      <td>
                        <span className={styles.payment}>
                          <i className={item.status === 'Pending' ? styles.pending : undefined} />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
        <aside className={styles.rightPanel}>
          <section className={styles.profile}>
            <Image
              src="/learnthru/stella.jpg"
              alt="Stella Walton"
              width={130}
              height={130}
              priority
            />
            <h2>Stella Walton</h2>
            <p>Student</p>
            <button
              type="button"
              className={styles.pill}
              onClick={() => setDialog('Stella Walton')}
            >
              Profile
            </button>
          </section>
          <section className={styles.calendar} aria-label="Lesson calendar">
            <div className={styles.calendarHeading}>
              <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>
                <Icon name="left" />
              </button>
              <h2>{monthName}</h2>
              <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>
                <Icon name="right" />
              </button>
            </div>
            <div className={styles.calendarGrid}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <span className={styles.weekday} key={day}>
                  {day}
                </span>
              ))}
              {Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, i) => {
                const day = i - offset + 1;
                const muted = day < 1 || day > days;
                const label = day < 1 ? previousDays + day : day > days ? day - days : day;
                return (
                  <button
                    key={`${year}-${month}-${day}`}
                    type="button"
                    disabled={muted}
                    aria-label={`${label} ${monthName}`}
                    aria-pressed={!muted && day === selectedDay}
                    className={`${muted ? styles.mutedDay : ''} ${!muted && [2, 19, 29].includes(day) ? styles.lessonDay : ''} ${!muted && day === selectedDay ? styles.selectedDay : ''} ${month === 11 && year === 2022 && day === -1 ? styles.previousHighlight : ''}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
          <section className={styles.reminders}>
            <h2>Reminders</h2>
            {[
              'Eng - Vocabulary test',
              'Eng - Essay',
              'Eng - Speaking Class',
              'Eng - Vocabulary test',
            ].map((label, i) => (
              <button
                type="button"
                key={`${label}-${i === 3 ? 'past' : 'upcoming'}`}
                className={styles.reminder}
                onClick={() => setDialog(label)}
              >
                <span className={styles.bell}>
                  <Icon name="bell" />
                </span>
                <span>
                  <strong>{label}</strong>
                  <small>{i === 3 ? '12 May 2020, Friday' : '12 Dec 2022, Friday'}</small>
                </span>
              </button>
            ))}
          </section>
        </aside>
      </div>
      <dialog
        ref={dialogRef}
        aria-label={dialog ?? 'Learning preview'}
        className={styles.modal}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
      >
        <h2>{dialog}</h2>
        <p>This is a layout preview with sample learning data.</p>
        <button type="button" className={styles.pill} onClick={() => setDialog(null)}>
          Close
        </button>
      </dialog>
    </main>
  );
}
