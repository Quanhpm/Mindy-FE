import { z } from 'zod';

const meetingUrl = z
  .url()
  .refine((value) => {
    if (!URL.canParse(value)) return false;
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  })
  .nullable();
export const studentClassSchema = z.object({
  id: z.uuid(),
  courseId: z.uuid(),
  code: z.string(),
  name: z.string(),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  deliveryMode: z.enum(['ONLINE', 'OFFLINE']),
  maxStudents: z.number().int().positive(),
  availableSeats: z.number().int().nonnegative(),
  mentor: z.object({ id: z.uuid(), displayName: z.string().nullable() }),
  meetingUrl,
  units: z.array(
    z.object({
      id: z.uuid(),
      position: z.number().int().positive(),
      title: z.string(),
      sessions: z.array(
        z.object({
          id: z.uuid(),
          sessionNumber: z.number().int().positive(),
          title: z.string(),
          startsAt: z.iso.datetime({ offset: true }),
          endsAt: z.iso.datetime({ offset: true }),
          roomName: z.string().nullable(),
          status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']),
          meetingUrl,
        }),
      ),
    }),
  ),
});
export type StudentClass = z.infer<typeof studentClassSchema>;
