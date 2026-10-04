import { authenticatedRequest } from '@/features/auth/client';
import { type User, type UserStatus, userSchema } from '@/shared/api/contracts/identity';
import { ApiError } from '@/shared/lib/http/api-error';
import { type CreateUserInput, type UserPage, userPageSchema } from '../schemas/user.schema';

export async function listUsers(query: string, signal?: AbortSignal): Promise<UserPage> {
  const parsed = userPageSchema.safeParse(
    await authenticatedRequest(`/admin/users?${query}`, { signal }),
  );
  if (!parsed.success) throw new ApiError(502, 'INVALID_RESPONSE', 'Unexpected users response');
  return parsed.data;
}

export async function listAllActiveMentors(signal?: AbortSignal): Promise<User[]> {
  const mentors: User[] = [];
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({
      page: String(page),
      pageSize: '100',
      role: 'MENTOR',
      status: 'ACTIVE',
    });
    const result = await listUsers(query.toString(), signal);
    mentors.push(...result.items);
    if (page * result.pageSize >= result.total) return mentors;
    if (result.items.length === 0 || result.pageSize <= 0)
      throw new ApiError(502, 'INVALID_RESPONSE', 'Incomplete mentor pagination');
  }
}

export async function getUser(id: string, signal?: AbortSignal): Promise<User> {
  return userSchema.parse(
    await authenticatedRequest(`/admin/users/${encodeURIComponent(id)}`, { signal }),
  );
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { phone, ...fields } = input;
  return userSchema.parse(
    await authenticatedRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify({ ...fields, ...(phone.trim() ? { phone: phone.trim() } : {}) }),
    }),
  );
}

export async function updateUserStatus(id: string, status: UserStatus): Promise<User> {
  return userSchema.parse(
    await authenticatedRequest(`/admin/users/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  );
}
