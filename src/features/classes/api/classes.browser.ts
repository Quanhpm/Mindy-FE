import type { z } from 'zod';
import { authenticatedRequest } from '@/features/auth/client';
import { ApiError } from '@/shared/lib/http/api-error';
import type { ClassCommand } from '../domain/class-rules';
import {
  type CreateClassInput,
  type ManagementClassDetail,
  type ManagementClassPage,
  managementClassDetailSchema,
  managementClassPageSchema,
  type ScheduleSessionInput,
  type UpdateClassInput,
} from '../schemas/class.schema';

function validated<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new ApiError(502, 'INVALID_RESPONSE', 'Dữ liệu lớp chưa đúng định dạng.');
  return parsed.data;
}
export async function listClasses(
  query: string,
  signal?: AbortSignal,
): Promise<ManagementClassPage> {
  return validated(
    managementClassPageSchema,
    await authenticatedRequest(`/admin/classes?${query}`, { signal }),
  );
}
export async function getClass(id: string, signal?: AbortSignal): Promise<ManagementClassDetail> {
  return validated(
    managementClassDetailSchema,
    await authenticatedRequest(`/admin/classes/${encodeURIComponent(id)}`, { signal }),
  );
}
export async function createClass(values: CreateClassInput): Promise<ManagementClassDetail> {
  const { meetingUrl, ...fields } = values;
  return validated(
    managementClassDetailSchema,
    await authenticatedRequest('/admin/classes', {
      method: 'POST',
      body: JSON.stringify({
        ...fields,
        ...(meetingUrl.trim() ? { meetingUrl: meetingUrl.trim() } : {}),
      }),
    }),
  );
}
export async function updateClass(
  id: string,
  values: UpdateClassInput,
): Promise<ManagementClassDetail> {
  return validated(
    managementClassDetailSchema,
    await authenticatedRequest(`/admin/classes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(values),
    }),
  );
}
export async function scheduleSession(
  id: string,
  values: ScheduleSessionInput,
): Promise<ManagementClassDetail> {
  return validated(
    managementClassDetailSchema,
    await authenticatedRequest(`/admin/classes/${encodeURIComponent(id)}/sessions`, {
      method: 'POST',
      body: JSON.stringify(values),
    }),
  );
}
export async function commandClass(
  id: string,
  command: ClassCommand,
): Promise<ManagementClassDetail> {
  return validated(
    managementClassDetailSchema,
    await authenticatedRequest(`/admin/classes/${encodeURIComponent(id)}/${command}`, {
      method: 'POST',
    }),
  );
}
