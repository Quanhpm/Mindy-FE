import 'server-only';
import { z } from 'zod';

const httpUrl = z.url().refine((value) => {
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
}, 'Use an HTTP(S) URL without credentials');

const schema = z.object({
  API_BASE_URL: httpUrl.refine((value) => {
    const url = new URL(value);
    return !url.search && !url.hash;
  }),
  APP_ORIGIN: httpUrl.refine((value) => new URL(value).origin === value, 'Use only the origin'),
});

export function getServerEnv() {
  // Read at request time so one build can be deployed to several environments.
  return schema.parse({
    API_BASE_URL: process.env.API_BASE_URL,
    APP_ORIGIN: process.env.APP_ORIGIN,
  });
}
