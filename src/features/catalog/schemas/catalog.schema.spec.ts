import { describe, expect, it } from 'vitest';
import {
  categoryInputSchema,
  courseCreateSchema,
  courseUpdatePayloadSchema,
  unitInputSchema,
} from './catalog.schema';
import { moveUnit, unitOrderPayload } from './unit-order';

const ids = [
  '123e4567-e89b-42d3-a456-426614174000',
  '123e4567-e89b-42d3-a456-426614174001',
  '123e4567-e89b-42d3-a456-426614174002',
];
const create = {
  categoryId: ids[0],
  code: 'WEB_101',
  title: 'Web',
  description: '',
  priceAmount: 2500000,
};

describe('catalog input contract', () => {
  it('enforces integer VND and backend price/code limits', () => {
    expect(courseCreateSchema.safeParse(create).success).toBe(true);
    for (const priceAmount of [-1, 1.5, 1_000_000_000_001])
      expect(courseCreateSchema.safeParse({ ...create, priceAmount }).success).toBe(false);
    expect(courseCreateSchema.safeParse({ ...create, code: 'web 101' }).success).toBe(false);
    expect(courseCreateSchema.safeParse({ ...create, isActive: true }).success).toBe(false);
  });
  it('keeps activation/code out of PATCH and supports clearing description', () => {
    expect(courseUpdatePayloadSchema.parse({ description: null })).toEqual({ description: null });
    expect(courseUpdatePayloadSchema.safeParse({ isActive: true }).success).toBe(false);
    expect(courseUpdatePayloadSchema.safeParse({ code: 'OTHER' }).success).toBe(false);
    expect(courseUpdatePayloadSchema.safeParse({ categoryId: null }).success).toBe(false);
  });
  it('validates optional slug and decimal score precision', () => {
    expect(categoryInputSchema.safeParse({ name: 'Web', slug: '', description: '' }).success).toBe(
      true,
    );
    expect(
      categoryInputSchema.safeParse({ name: 'Web', slug: 'Web--', description: '' }).success,
    ).toBe(false);
    expect(
      unitInputSchema.safeParse({ title: 'Unit', description: '', requiredScorePercent: 80.25 })
        .success,
    ).toBe(true);
    for (const requiredScorePercent of [100.01, -1, 1.234])
      expect(
        unitInputSchema.safeParse({ title: 'Unit', description: '', requiredScorePercent }).success,
      ).toBe(false);
  });
});

describe('unit ordering', () => {
  it('preserves a complete permutation while moving a selected unit', () => {
    const next = moveUnit(ids, ids[1] as string, -1);
    expect(next).toEqual([ids[1], ids[0], ids[2]]);
    expect(unitOrderPayload(ids, next)).toEqual({ unitIds: next });
    expect(ids[0]).toBe('123e4567-e89b-42d3-a456-426614174000');
  });
  it('keeps edge positions stable and rejects incomplete, foreign or duplicate IDs', () => {
    expect(moveUnit(ids, ids[0] as string, -1)).toEqual(ids);
    expect(moveUnit(ids, ids[2] as string, 1)).toEqual(ids);
    expect(() => unitOrderPayload(ids, ids.slice(1))).toThrow();
    expect(() =>
      unitOrderPayload(ids, [ids[0] as string, ids[0] as string, ids[1] as string]),
    ).toThrow();
    expect(() =>
      unitOrderPayload(ids, [...ids.slice(0, 2), '123e4567-e89b-42d3-a456-426614174999']),
    ).toThrow();
    expect(() => unitOrderPayload([], [])).toThrow();
  });
});
