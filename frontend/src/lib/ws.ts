// src/lib/ws.ts - WebSocket URL helpers

/**
 * Build a WebSocket URL from NEXT_PUBLIC_API_URL (or current origin) and a path.
 * - http -> ws, https -> wss
 * - Accepts optional query params; skips null/undefined
 * - Tolerates base or path with/without leading/trailing slashes
 */
export function buildWsUrl(
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
): string {
  const baseWsEnv = (process.env.NEXT_PUBLIC_WS_URL || '').trim();
  const baseEnv = (process.env.NEXT_PUBLIC_API_URL || '').trim();

  // Determine base origin
  let base: URL;
  if (baseWsEnv) {
    // Prefer explicit WS base if provided
    try {
      base = new URL(baseWsEnv, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    } catch {
      base = new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    }
  } else if (baseEnv) {
    try {
      // If baseEnv is just a path, anchor to current origin
      base = new URL(baseEnv, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    } catch {
      base = new URL(typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    }
  } else {
    // Default to current origin when nothing specified
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8000';
    base = new URL(origin);
  }

  // Normalize protocol to ws / wss
  const wsProtocol = base.protocol === 'https:' || base.protocol === 'wss:' ? 'wss:' : 'ws:';

  // Normalize path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  

  // Compose URL using HTTP(S) first for correctness, then swap protocol
  const composed = new URL(normalizedPath, base.origin);
  composed.protocol = wsProtocol;
  // Preserve explicit port from base
  if (base.port) composed.port = base.port;

  // Append query params
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      composed.searchParams.set(key, String(value));
    });
  }

  return composed.toString();
}

/**
 * Convenience utility to merge existing query string with additional params.
 */
export function withQuery(url: string, extra: Record<string, string | number | boolean | null | undefined>): string {
  const u = new URL(url);
  Object.entries(extra).forEach(([k, v]) => {
    if (v === null || v === undefined) return;
    u.searchParams.set(k, String(v));
  });
  return u.toString();
}


