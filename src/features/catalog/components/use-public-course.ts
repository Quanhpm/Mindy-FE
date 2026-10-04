'use client';

import { useEffect, useState } from 'react';
import { catalogErrorMessage } from '../api/catalog.browser';
import { getPublicCourse } from '../api/public-catalog.browser';
import type { PublicCourseDetail } from '../schemas/public-catalog.schema';

export function usePublicCourse(id: string) {
  const [course, setCourse] = useState<PublicCourseDetail | null>(null);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: revision is an explicit retry trigger.
  useEffect(() => {
    const controller = new AbortController();
    setCourse(null);
    setError(undefined);
    void getPublicCourse(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setCourse(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(catalogErrorMessage(cause));
      });
    return () => controller.abort();
  }, [id, revision]);
  return { course, error, retry: () => setRevision((value) => value + 1) };
}
