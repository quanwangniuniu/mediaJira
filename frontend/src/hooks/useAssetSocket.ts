'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWsUrl } from '@/lib/ws';
import { useAuthStore } from '@/lib/authStore';

type AssetWsEventType =
  | 'statusChanged'
  | 'versionUploaded'
  | 'commentAdded'
  | 'reviewAssigned'
  | 'versionPublished'
  | 'versionScanStarted'
  | 'versionScanCompleted'
  | string; // allow forward compatibility

export interface AssetWsEvent<T = any> {
  type: AssetWsEventType;
  payload?: T;
}

export interface UseAssetSocketHandlers {
  onStatusChanged?: (e: AssetWsEvent) => void;
  onVersionUploaded?: (e: AssetWsEvent) => void;
  onCommentAdded?: (e: AssetWsEvent) => void;
  onReviewAssigned?: (e: AssetWsEvent) => void;
  onVersionPublished?: (e: AssetWsEvent) => void;
  onVersionScanStarted?: (e: AssetWsEvent) => void;
  onVersionScanCompleted?: (e: AssetWsEvent) => void;
  onUnknownEvent?: (e: AssetWsEvent) => void;
  onOpen?: () => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event) => void;
}

export function useAssetSocket(
  assetId: string | number | null | undefined,
  handlers: UseAssetSocketHandlers = {}
) {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const retryRef = useRef(0);
  const shouldRun = useMemo(() => !!assetId, [assetId]);

  useEffect(() => {
    if (!shouldRun) return;

    let stopped = false;
    const connect = () => {
      if (stopped) return;
      // Add trailing slash to satisfy common Django Channels routing (/ws/assets/<id>/)
      const url = buildWsUrl(`/ws/assets/${assetId}/`, token ? { token } : undefined);
      console.log('🔌 WebSocket connecting to:', url);
      console.log('🔑 Token present:', !!token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        try { console.log('[WS] open', { url }); } catch {}
        setConnected(true);
        retryRef.current = 0;
        handlers.onOpen?.();
      };

      ws.onmessage = (ev) => {
        try { console.log('[WS] message', { url, data: ev.data }); } catch {}
        try {
          const data: AssetWsEvent = JSON.parse(ev.data);
          try { console.log('[WS] event', data); } catch {}
          switch (data.type) {
            case 'statusChanged':
              handlers.onStatusChanged?.(data);
              break;
            case 'versionUploaded':
              handlers.onVersionUploaded?.(data);
              break;
            case 'commentAdded':
              handlers.onCommentAdded?.(data);
              break;
            case 'reviewAssigned':
              handlers.onReviewAssigned?.(data);
              break;
            case 'versionPublished':
              handlers.onVersionPublished?.(data);
              break;
            case 'versionScanStarted':
              handlers.onVersionScanStarted?.(data);
              break;
            case 'versionScanCompleted':
              handlers.onVersionScanCompleted?.(data);
              break;
            default:
              handlers.onUnknownEvent?.(data);
          }
        } catch (e) {
          console.warn('WS message parse error', e);
        }
      };

      ws.onerror = (ev) => {
        try { console.error('[WS] error', { url, ev }); } catch {}
        handlers.onError?.(ev);
      };

      ws.onclose = (ev) => {
        try { console.warn('[WS] close', { url, code: ev.code, reason: ev.reason }); } catch {}
        setConnected(false);
        handlers.onClose?.(ev);
        wsRef.current = null;
        if (!stopped) {
          const retry = Math.min(1000 * Math.pow(2, retryRef.current++), 10000);
          setTimeout(connect, retry);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldRun, assetId, token]);

  return { connected };
}


