import { reorderInputSchema } from './catalog.schema';

/** Build a complete permutation before the backend validates concurrent changes. */
export function moveUnit(ids: readonly string[], id: string, direction: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return [...ids];
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export function unitOrderPayload(existingIds: readonly string[], nextIds: readonly string[]) {
  const result = reorderInputSchema.parse({ unitIds: [...nextIds] });
  if (existingIds.length !== nextIds.length || existingIds.some((id) => !nextIds.includes(id))) {
    throw new Error('Thứ tự phải chứa đủ các học phần của khóa học.');
  }
  return result;
}
