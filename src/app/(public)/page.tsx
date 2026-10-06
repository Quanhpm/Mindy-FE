import { FeaturedCourses } from '@/features/catalog/client';
import { HealthCheck } from '@/features/health/client';
import { HomeContent } from '@/features/home/server';
import { HomeShell } from '../_components/home-shell';

export default function HomePage() {
  return (
    <HomeShell healthCheck={<HealthCheck />}>
      <HomeContent courses={<FeaturedCourses />} />
    </HomeShell>
  );
}
