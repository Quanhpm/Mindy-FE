import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { isAllowedEndpoint } from './proxy-policy';

const swagger = JSON.parse(
  readFileSync(new URL('../../../../docs/swagger-live-2026-10-06.json', import.meta.url), 'utf8'),
) as { paths: Record<string, Record<string, unknown>> };
describe('saved Swagger business coverage', () => {
  it('supports every business operation, keeping provider webhook and readiness outside FE', () => {
    const dedicatedGoogle = new Set(['/api/v1/auth/google', '/api/v1/auth/google/callback']);
    const infrastructure = new Set(['/api/v1/health/ready', '/api/v1/payment-callbacks/payos']);
    let business = 0;
    for (const [path, operations] of Object.entries(swagger.paths)) {
      for (const method of Object.keys(operations)) {
        const concrete = path
          .replace(/\{[^}]+\}/g, '123e4567-e89b-42d3-a456-426614174000')
          .replace('/api/v1/', '');
        if (infrastructure.has(path))
          expect(isAllowedEndpoint(method.toUpperCase(), concrete)).toBe(false);
        else {
          business++;
          if (!dedicatedGoogle.has(path))
            expect(isAllowedEndpoint(method.toUpperCase(), concrete), `${method} ${path}`).toBe(
              true,
            );
        }
      }
    }
    expect(business).toBe(53);
    expect(isAllowedEndpoint('GET', 'mentor/cash-orders/not-a-uuid/confirm')).toBe(false);
    expect(
      isAllowedEndpoint('GET', 'mentor/cash-orders/123e4567-e89b-42d3-a456-426614174000/confirm'),
    ).toBe(false);
    expect(isAllowedEndpoint('POST', 'me/orders/payment-result')).toBe(false);
    expect(isAllowedEndpoint('GET', 'mentor/classes')).toBe(true);
    expect(
      isAllowedEndpoint('GET', 'mentor/classes/123e4567-e89b-42d3-a456-426614174000/students'),
    ).toBe(true);
  });
});
