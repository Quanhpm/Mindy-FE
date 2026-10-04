export const benefits = [
  {
    icon: 'book',
    title: 'Lộ trình rõ ràng',
    text: 'Biết mình bắt đầu từ đâu, hiểu bước tiếp theo là gì.',
  },
  {
    icon: 'check',
    title: 'Thực hành chủ động',
    text: 'Biến những điều vừa học thành kỹ năng của riêng bạn.',
  },
  {
    icon: 'users',
    title: 'Đồng hành cùng mentor',
    text: 'Có người lắng nghe, gợi mở và phản hồi trên từng chặng.',
  },
] as const;
export const steps = [
  {
    number: '01',
    title: 'Tìm hướng đi của bạn',
    text: 'Bắt đầu từ mục tiêu nhỏ và một lộ trình phù hợp.',
  },
  {
    number: '02',
    title: 'Học bằng cách thực hành',
    text: 'Từng bài học, từng trải nghiệm. Hiểu sâu hơn mỗi ngày.',
  },
  {
    number: '03',
    title: 'Tiến bộ cùng phản hồi',
    text: 'Nhìn lại điều đã làm và tự tin bước tiếp với mentor.',
  },
] as const;
export const topics = [
  { number: '01', title: 'Nền tảng lập trình', subtitle: 'TƯ DUY & KỸ NĂNG', code: '< / >' },
  { number: '02', title: 'Xây dựng sản phẩm', subtitle: 'Ý TƯỞNG & THỰC HÀNH', code: '{ }' },
  { number: '03', title: 'Phát triển bản thân', subtitle: 'KẾT NỐI & TIẾN BỘ', code: '↗' },
] as const;
export type DemoRole = 'STUDENT' | 'MENTOR' | 'ADMIN';
export type DemoStatus = 'ACTIVE' | 'SUSPENDED';
export const roleLabels: Record<DemoRole, string> = {
  STUDENT: 'Học viên',
  MENTOR: 'Mentor',
  ADMIN: 'Quản trị viên',
};
export const statusLabels: Record<DemoStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  SUSPENDED: 'Tạm khóa',
};
export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: DemoRole;
  status: DemoStatus;
  createdAt: string;
};
const names = [
  'Nguyễn Minh Anh',
  'Trần Hải An',
  'Lê Khánh Linh',
  'Phạm Đức Minh',
  'Võ Thu Hà',
  'Đặng Nhật Nam',
  'Hoàng Bảo Ngọc',
  'Bùi Thanh Tâm',
  'Đỗ Quang Huy',
  'Ngô Mai Chi',
  'Phan Gia Bảo',
  'Vũ Ngọc Hân',
  'Lý Hoài Phương',
  'Trịnh Minh Khang',
  'Dương An Nhiên',
];
export const demoUsers: DemoUser[] = names.map((name, index) => ({
  id: `demo-${index + 1}`,
  name,
  email: `member${index + 1}@example.com`,
  role: index % 5 === 0 ? 'MENTOR' : index === 3 ? 'ADMIN' : 'STUDENT',
  status: index % 6 === 4 ? 'SUSPENDED' : 'ACTIVE',
  createdAt: `${String(2 - Math.floor(index / 8)).padStart(2, '0')}/10/2026`,
}));
export const summaries = [
  { title: 'Học viên', value: '128', hint: 'Đang trên hành trình học', icon: 'users' },
  { title: 'Mentor', value: '08', hint: 'Đồng hành cùng học viên', icon: 'user' },
  { title: 'Lớp đang mở', value: '06', hint: 'Không gian học tập', icon: 'book' },
  { title: 'Lịch học hôm nay', value: '03', hint: 'Thứ Sáu, 02 tháng 10', icon: 'clock' },
] as const;
export const schedule = [
  {
    time: '09:00',
    title: 'Tư duy lập trình',
    mentor: 'Mentor Minh Anh',
    mode: 'ONLINE',
    length: '90 phút',
  },
  {
    time: '14:00',
    title: 'Thực hành JavaScript',
    mentor: 'Mentor Hải An',
    mode: 'OFFLINE',
    length: '120 phút',
  },
  {
    time: '19:00',
    title: 'Xây dựng sản phẩm',
    mentor: 'Mentor Khánh Linh',
    mode: 'ONLINE',
    length: '90 phút',
  },
] as const;
