'use client';

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromUrlSafe(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) {
    s += '=';
  }
  return s;
}

export type SharePayload = {
  surface?: 'ALL' | 'DISPLAY' | 'GMAIL' | 'YOUTUBE';
  device?: 'MOBILE' | 'DESKTOP';
  exp?: number;
  created?: number;
  ad_id?: number;
  previewToken?: string;
  previewExpiresAt?: number;
};

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];
const DEFAULT_PROXY_BASE = 'https://volar-probankruptcy-orval.ngrok-free.dev';

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const getEnvValue = (key: string): string | undefined => {
  const env = (globalThis as any)?.process?.env;
  const value = env?.[key];
  return typeof value === 'string' ? value : undefined;
};

export function resolveShareBaseUrl(): string {
  const envBase =
    getEnvValue('NEXT_PUBLIC_SHARE_BASE_URL') || getEnvValue('NEXT_PUBLIC_BASE_URL');

  if (envBase && typeof envBase === 'string') {
    return stripTrailingSlash(envBase);
  }

  if (typeof window !== 'undefined') {
    const { origin } = window.location;
    try {
      const url = new URL(origin);
      if (!LOCAL_HOSTNAMES.includes(url.hostname)) {
        return stripTrailingSlash(url.origin);
      }
    } catch {
      // Fallback to default proxy if origin cannot be parsed
    }
  }

  return DEFAULT_PROXY_BASE;
}

export function encodeSharePayload(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const BufferCtor = (globalThis as any)?.Buffer;
  const b64 = typeof window !== 'undefined'
    ? btoa(unescape(encodeURIComponent(json)))
    : BufferCtor
      ? BufferCtor.from(json, 'utf8').toString('base64')
      : '';
  return toUrlSafe(b64);
}

export function decodeSharePayload(token: string): SharePayload | null {
  try {
    const b64 = fromUrlSafe(token);
    const BufferCtor = (globalThis as any)?.Buffer;
    const json = typeof window !== 'undefined'
      ? decodeURIComponent(escape(atob(b64)))
      : BufferCtor
        ? BufferCtor.from(b64, 'base64').toString('utf8')
        : '';
    const obj = JSON.parse(json);
    return obj || null;
  } catch {
    return null;
  }
}

