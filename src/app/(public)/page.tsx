import { HomeRoleBoundary } from '@/features/auth/client';
import { FeaturedCourses } from '@/features/catalog/client';
import { HealthCheck } from '@/features/health/client';
import { HomeContent } from '@/features/home/server';
import { HomeShell } from '../_components/home-shell';
import { AppProviders } from '../_providers/app-providers';

export default function HomePage() {
  return (
    <AppProviders>
      <HomeRoleBoundary>
        <HomeShell healthCheck={<HealthCheck />}>
          <HomeContent courses={<FeaturedCourses />} />
        </HomeShell>
      </HomeRoleBoundary>
    </AppProviders>
  );
}
