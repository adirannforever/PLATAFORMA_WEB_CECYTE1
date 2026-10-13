import { timingSafeEqual } from 'node:crypto';

const DEFAULT_CORS_ORIGINS = 'http://localhost:5173';

export function parseCorsOrigins(value = DEFAULT_CORS_ORIGINS) {
  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(`CORS origins must be exact HTTP(S) origins: ${origin}`);
    }
  }

  return [...new Set(origins)];
}

export function parseTrustProxyHops(value = '0') {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer.');
  }

  const hops = Number(value);
  if (!Number.isSafeInteger(hops) || hops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be between 0 and 10.');
  }

  return hops;
}

export function isMetricsAuthorized(authorizationHeader, token) {
  if (!token || !authorizationHeader?.startsWith('Bearer ')) return false;

  const expected = Buffer.from(token);
  const provided = Buffer.from(authorizationHeader.slice('Bearer '.length));
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
