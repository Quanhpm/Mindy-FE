export type Course = {
  id: string;
  issue: string;
  title: string;
  category: 'Frontend' | 'Backend' | 'Dữ liệu';
  level: 'Bắt đầu' | 'Có nền tảng';
  symbol: string;
  tone: 'blue' | 'sand' | 'mint';
  description: string;
  duration: string;
  lessons: number;
  price: number;
  mentor: string;
  project: string;
  syllabus: string[];
};

// Preview fixtures only; production prices and eligibility must come from the backend.
export const courses: [Course, ...Course[]] = [
  {
    id: 'javascript',
    issue: '01',
    title: 'JavaScript từ nền tảng',
    category: 'Frontend',
    level: 'Bắt đầu',
    symbol: 'JS',
    tone: 'blue',
    description:
      'Hiểu cách code hoạt động. Tự tay viết những tương tác đầu tiên cho website của bạn.',
    duration: '8 tuần',
    lessons: 24,
    price: 1800000,
    mentor: 'Minh Anh',
    project: 'Ứng dụng quản lý công việc',
    syllabus: [
      'Biến, kiểu dữ liệu và tư duy lập trình',
      'Hàm, mảng và xử lý dữ liệu',
      'DOM, sự kiện và tương tác',
      'API và dự án thực hành',
    ],
  },
  {
    id: 'html-css',
    issue: '02',
    title: 'Thiết kế web với HTML & CSS',
    category: 'Frontend',
    level: 'Bắt đầu',
    symbol: '</>',
    tone: 'sand',
    description: 'Từ một trang trắng đến website chỉn chu, đẹp và sử dụng tốt trên mọi thiết bị.',
    duration: '6 tuần',
    lessons: 18,
    price: 1200000,
    mentor: 'Thu Hà',
    project: 'Website portfolio cá nhân',
    syllabus: [
      'Cấu trúc HTML và ngữ nghĩa',
      'CSS, typography và màu sắc',
      'Flexbox, Grid và responsive',
      'Hoàn thiện portfolio cá nhân',
    ],
  },
  {
    id: 'react',
    issue: '03',
    title: 'Xây dựng ứng dụng với React',
    category: 'Frontend',
    level: 'Có nền tảng',
    symbol: '{ }',
    tone: 'mint',
    description:
      'Ghép từng component thành một sản phẩm. Làm chủ state, dữ liệu và trải nghiệm người dùng.',
    duration: '8 tuần',
    lessons: 24,
    price: 2400000,
    mentor: 'Hoàng Nam',
    project: 'Ứng dụng đặt lịch trực tuyến',
    syllabus: [
      'Component, props và JSX',
      'State, hooks và form',
      'Routing và kết nối API',
      'Xây dựng ứng dụng đặt lịch',
    ],
  },
  {
    id: 'nodejs',
    issue: '04',
    title: 'Backend thực chiến với Node.js',
    category: 'Backend',
    level: 'Có nền tảng',
    symbol: 'API',
    tone: 'blue',
    description: 'Khám phá phía sau một ứng dụng: API, cơ sở dữ liệu và xác thực người dùng.',
    duration: '10 tuần',
    lessons: 30,
    price: 2600000,
    mentor: 'Quốc Huy',
    project: 'REST API cho một cửa hàng',
    syllabus: [
      'Node.js và HTTP',
      'Thiết kế REST API',
      'Database và xác thực',
      'Kiểm thử và triển khai API',
    ],
  },
  {
    id: 'python',
    issue: '05',
    title: 'Bắt đầu lập trình với Python',
    category: 'Backend',
    level: 'Bắt đầu',
    symbol: 'Py',
    tone: 'mint',
    description:
      'Một ngôn ngữ dễ tiếp cận để học tư duy lập trình và tự động hóa những việc nhỏ mỗi ngày.',
    duration: '6 tuần',
    lessons: 18,
    price: 1500000,
    mentor: 'Bảo Linh',
    project: 'Công cụ tự động xử lý tệp',
    syllabus: [
      'Cú pháp và kiểu dữ liệu',
      'Hàm và cấu trúc dữ liệu',
      'Làm việc với tệp',
      'Dự án tự động hóa',
    ],
  },
  {
    id: 'sql',
    issue: '06',
    title: 'Làm việc với dữ liệu & SQL',
    category: 'Dữ liệu',
    level: 'Bắt đầu',
    symbol: 'SQL',
    tone: 'sand',
    description: 'Đặt câu hỏi cho dữ liệu. Từ truy vấn đầu tiên đến một báo cáo có ý nghĩa.',
    duration: '4 tuần',
    lessons: 12,
    price: 1100000,
    mentor: 'Thanh Vy',
    project: 'Báo cáo dữ liệu kinh doanh',
    syllabus: [
      'Mô hình dữ liệu quan hệ',
      'SELECT, lọc và nhóm dữ liệu',
      'JOIN và truy vấn con',
      'Xây dựng báo cáo dữ liệu',
    ],
  },
];

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function readCartIds(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (id): id is string =>
            typeof id === 'string' && courses.some((course) => course.id === id),
        ),
      ),
    ];
  } catch {
    return [];
  }
}
