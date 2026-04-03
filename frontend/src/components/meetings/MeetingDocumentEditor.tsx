'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Bold, Italic, Underline, List, ListOrdered, Quote, Undo2, Redo2, Heading1, Heading2 } from 'lucide-react';

import { MeetingsAPI } from '@/lib/api/meetingsApi';
import { buildWsUrl } from '@/lib/ws';
import { useAuthStore } from '@/lib/authStore';
import type { MeetingDocument } from '@/types/meeting';
import { Button } from '@/components/ui/button';

type Props = {
  projectId: number;
  meetingId: number;
};

type DocumentWsEvent = {
  type: string;
  content?: string;
  updated_at?: string;
  client_id?: string;
  user_id?: number;
  username?: string;
  x?: number;
  y?: number;
  cursor_offset?: number;
  selection_start?: number;
  selection_end?: number;
  selection_rects?: Array<{ left: number; top: number; width: number; height: number }>;
  is_active?: boolean;
};

type RemoteCursor = {
  presenceKey: string;
  userId: number;
  username: string;
  x: number;
  y: number;
  cursorOffset?: number;
  selectionStart?: number;
  selectionEnd?: number;
  selectionRects?: Array<{ left: number; top: number; width: number; height: number }>;
  color: string;
};

const WS_SYNC_DEBOUNCE_MS = 20;
const HTTP_FALLBACK_DEBOUNCE_MS = 500;
const CURSOR_BROADCAST_DEBOUNCE_MS = 25;
const CURSOR_HEARTBEAT_MS = 600;
/** Keep generous: heartbeats may pause briefly during toolbar clicks / focus moves. */
const CURSOR_TTL_MS = 45000;

function presenceKeyFromMessage(userId: number, clientId?: string | null): string {
  return typeof clientId === 'string' && clientId.trim() ? clientId.trim() : `u:${userId}`;
}

/** Collapsed ranges often return wrong rects at line breaks; pick topmost valid rect or measure one character. */
function getCaretClientRect(collapsedRange: Range, editor: HTMLDivElement): { left: number; top: number; height: number } | null {
  const r = collapsedRange.cloneRange();
  r.collapse(true);

  const rawRects = Array.from(r.getClientRects());
  const lineRects = rawRects.filter((cr) => cr.height > 0);
  if (lineRects.length >= 2) {
    const topmost = lineRects.reduce((a, b) => (a.top <= b.top ? a : b));
    return { left: topmost.left, top: topmost.top, height: topmost.height };
  }
  if (lineRects.length === 1) {
    const c = lineRects[0]!;
    return { left: c.left, top: c.top, height: c.height };
  }

  const br = r.getBoundingClientRect();
  const maxH = Math.max(editor.clientHeight * 0.5, 24);
  if (br.height > 0 && br.height <= maxH) {
    return { left: br.left, top: br.top, height: br.height };
  }

  const { startContainer, startOffset } = r;
  if (startContainer.nodeType === Node.TEXT_NODE) {
    const tn = startContainer as Text;
    const text = tn.textContent ?? '';
    const expand = r.cloneRange();
    if (startOffset < text.length) {
      expand.setEnd(tn, startOffset + 1);
      const ers = Array.from(expand.getClientRects()).filter((cr) => cr.height > 0);
      if (ers.length > 0) {
        const lr = ers[ers.length - 1]!;
        return { left: lr.left, top: lr.top, height: lr.height };
      }
    }
    if (startOffset > 0) {
      expand.setStart(tn, startOffset - 1);
      expand.setEnd(tn, startOffset);
      const ers = Array.from(expand.getClientRects()).filter((cr) => cr.height > 0);
      if (ers.length > 0) {
        const lr = ers[ers.length - 1]!;
        return { left: lr.right, top: lr.top, height: lr.height };
      }
    }
  }

  if (br.height > 0) {
    return { left: br.left, top: br.top, height: br.height };
  }
  return null;
}

/**
 * Overlays are siblings of the editor (same offset parent). Use viewport delta vs editor box — do NOT add scrollTop/scrollLeft
 * (scroll is already reflected in getBoundingClientRect).
 */
function clientPointToEditorOverlay(editor: HTMLDivElement, clientX: number, clientY: number) {
  const editorRect = editor.getBoundingClientRect();
  return {
    x: clientX - editorRect.left,
    y: clientY - editorRect.top,
  };
}

/** WS / JSON may deliver numbers as strings depending on proxies or serializers. */
function parseWsFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function parseWsUserId(value: unknown): number | null {
  const n = parseWsFiniteNumber(value);
  if (n === null || !Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Offsets from JSON may be whole floats (e.g. 5.0). */
function parseWsOptionalInt(value: unknown): number | null {
  const n = parseWsFiniteNumber(value);
  if (n === null) return null;
  const r = Math.round(n);
  if (Math.abs(n - r) > 1e-9) return null;
  return r;
}

function cursorColorForPresence(presenceKey: string, userId: number): string {
  const palette = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#dc2626', '#d97706', '#db2777'];
  let h = userId;
  for (let i = 0; i < presenceKey.length; i += 1) {
    h = (h * 31 + presenceKey.charCodeAt(i)) >>> 0;
  }
  return palette[h % palette.length];
}

function selectionHighlightBackground(hexColor: string): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor.trim());
  if (!m) return `${hexColor}33`;
  const r = parseInt(m[1], 16);
  const g = parseInt(m[2], 16);
  const b = parseInt(m[3], 16);
  return `rgba(${r},${g},${b},0.2)`;
}

export function MeetingDocumentEditor({ projectId, meetingId }: Props) {
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState(false);
  const [content, setContent] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pollingTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const httpPersistTimerRef = useRef<number | null>(null);
  const cursorTimerRef = useRef<number | null>(null);
  const cursorHeartbeatTimerRef = useRef<number | null>(null);
  const latestContentRef = useRef('');
  const clientIdRef = useRef(`doc-${meetingId}-${Math.random().toString(36).slice(2, 10)}`);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const isUnmountedRef = useRef(false);
  const cursorSeenAtRef = useRef<Record<string, number>>({});
  const [scrollLayoutTick, setScrollLayoutTick] = useState(0);
  const sendCursorUpdateRef = useRef<(isActive?: boolean) => void>(() => {});

  const wsPath = useMemo(() => `/ws/meetings/${meetingId}/document/`, [meetingId]);

  useEffect(() => {
    lastSyncedAtRef.current = lastSyncedAt;
  }, [lastSyncedAt]);

  useEffect(() => {
    latestContentRef.current = content;
  }, [content]);

  const applyRemoteContent = (next: string) => {
    latestContentRef.current = next;
    setContent(next);
    const editor = editorRef.current;
    if (editor && editor.innerHTML !== next) {
      editor.innerHTML = next;
    }
  };

  const isIncomingNewer = (incoming?: string | null, current?: string | null) => {
    if (!incoming) return false;
    if (!current) return true;
    const i = new Date(incoming).getTime();
    const c = new Date(current).getTime();
    if (!Number.isFinite(i) || !Number.isFinite(c)) return incoming !== current;
    return i > c;
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML === content) return;
    editor.innerHTML = content || '';
  }, [content]);

  useEffect(() => {
    let cancelled = false;
    if (!hasHydrated) return;
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const doc: MeetingDocument = await MeetingsAPI.getMeetingDocument(projectId, meetingId);
        if (cancelled) return;
        applyRemoteContent(doc.content ?? '');
        setLastSyncedAt(doc.updated_at ?? null);
        setLoading(false);
        return;
      } catch {
        // Retry once to avoid first-load race right after auth hydration/login.
      }

      try {
        const doc: MeetingDocument = await MeetingsAPI.getMeetingDocument(projectId, meetingId);
        if (cancelled) return;
        applyRemoteContent(doc.content ?? '');
        setLastSyncedAt(doc.updated_at ?? null);
      } catch {
        if (!cancelled) toast.error('Failed to load meeting document');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [projectId, meetingId, hasHydrated, token]);

  useEffect(() => {
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      const wsUrl = buildWsUrl(wsPath, token ? { token } : undefined);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        window.setTimeout(() => sendCursorUpdateRef.current(true), 0);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as DocumentWsEvent;
          if (message.type === 'document_snapshot' || message.type === 'document_updated') {
            if (message.client_id && message.client_id === clientIdRef.current) return;
            if (!isIncomingNewer(message.updated_at, lastSyncedAtRef.current)) return;
            if (typeof message.content === 'string') {
              applyRemoteContent(message.content);
            }
            if (message.updated_at) {
              lastSyncedAtRef.current = message.updated_at;
              setLastSyncedAt(message.updated_at);
            }
          }
          if (message.type === 'cursor_updated') {
            if (message.client_id === clientIdRef.current) return;
            const wsUserId = parseWsUserId(message.user_id);
            if (wsUserId === null) return;
            if (message.is_active === false) {
              const cid = message.client_id;
              if (typeof cid === 'string' && cid.trim()) {
                const k = cid.trim();
                delete cursorSeenAtRef.current[k];
                setRemoteCursors((prev) => {
                  const next = { ...prev };
                  delete next[k];
                  return next;
                });
              } else {
                const uid = wsUserId;
                setRemoteCursors((prev) => {
                  const next = { ...prev };
                  for (const pk of Object.keys(next)) {
                    if (next[pk]?.userId === uid) {
                      delete cursorSeenAtRef.current[pk];
                      delete next[pk];
                    }
                  }
                  return next;
                });
              }
              return;
            }
            const xParsed = parseWsFiniteNumber(message.x);
            const yParsed = parseWsFiniteNumber(message.y);
            const offsetParsed = parseWsOptionalInt(message.cursor_offset);
            const xOk = xParsed !== null;
            const yOk = yParsed !== null;
            const offsetOk = offsetParsed !== null;
            if ((!xOk || !yOk) && !offsetOk) {
              return;
            }
            const x = xOk ? xParsed! : 0;
            const y = yOk ? yParsed! : 0;
            const userId = wsUserId;
            const presenceKey = presenceKeyFromMessage(userId, message.client_id);
            const rectNum = (v: unknown) => parseWsFiniteNumber(v);
            const incomingSelectionRects = Array.isArray(message.selection_rects)
              ? message.selection_rects
                  .map((r) => {
                    if (!r || typeof r !== 'object') return null;
                    const o = r as Record<string, unknown>;
                    const left = rectNum(o.left);
                    const top = rectNum(o.top);
                    const width = rectNum(o.width);
                    const height = rectNum(o.height);
                    if (left === null || top === null || width === null || height === null) return null;
                    return { left, top, width, height };
                  })
                  .filter(
                    (r): r is { left: number; top: number; width: number; height: number } => r !== null,
                  )
              : [];
            const incomingSelectionStart = parseWsOptionalInt(message.selection_start) ?? undefined;
            const incomingSelectionEnd = parseWsOptionalInt(message.selection_end) ?? undefined;
            const hasNumericRange =
              typeof incomingSelectionStart === 'number' &&
              typeof incomingSelectionEnd === 'number' &&
              incomingSelectionEnd > incomingSelectionStart;
            const rectsEmpty = incomingSelectionRects.length === 0;
            const collapsedOffsets =
              typeof incomingSelectionStart === 'number' &&
              typeof incomingSelectionEnd === 'number' &&
              incomingSelectionStart === incomingSelectionEnd;
            /** True only when peer clearly has nothing selected (avoid wiping rects when only payload rects exist). */
            const peerHasNoSelection =
              rectsEmpty && (collapsedOffsets || !hasNumericRange);
            let storedSelectionStart: number | undefined;
            let storedSelectionEnd: number | undefined;
            let storedSelectionRects: typeof incomingSelectionRects;
            if (peerHasNoSelection) {
              storedSelectionStart = undefined;
              storedSelectionEnd = undefined;
              storedSelectionRects = [];
            } else if (hasNumericRange) {
              storedSelectionStart = incomingSelectionStart;
              storedSelectionEnd = incomingSelectionEnd;
              storedSelectionRects = incomingSelectionRects;
            } else {
              storedSelectionStart = undefined;
              storedSelectionEnd = undefined;
              storedSelectionRects = incomingSelectionRects;
            }
            cursorSeenAtRef.current[presenceKey] = Date.now();
            setRemoteCursors((prev) => ({
              ...prev,
              [presenceKey]: {
                presenceKey,
                userId,
                username: message.username || `User ${userId}`,
                x,
                y,
                cursorOffset: offsetOk ? offsetParsed! : undefined,
                selectionStart: storedSelectionStart,
                selectionEnd: storedSelectionEnd,
                selectionRects: storedSelectionRects,
                color: cursorColorForPresence(presenceKey, userId),
              },
            }));
          }
        } catch {
          // Ignore malformed message and keep editor usable.
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!stopped) {
          reconnectTimerRef.current = window.setTimeout(connect, 1500);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [wsPath, token]);

  useEffect(() => {
    if (!connected || loading) return;
    const id = window.setTimeout(() => sendCursorUpdateRef.current(true), 0);
    return () => window.clearTimeout(id);
  }, [connected, loading]);

  useEffect(() => {
    isUnmountedRef.current = false;
    return () => {
      isUnmountedRef.current = true;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      if (httpPersistTimerRef.current) {
        window.clearTimeout(httpPersistTimerRef.current);
      }
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
      }
      if (cursorTimerRef.current) {
        window.clearTimeout(cursorTimerRef.current);
      }
      if (cursorHeartbeatTimerRef.current) {
        window.clearInterval(cursorHeartbeatTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated || !token) return;

    const poll = async () => {
      try {
        const doc = await MeetingsAPI.getMeetingDocument(projectId, meetingId);
        if (isUnmountedRef.current) return;
        const incomingUpdatedAt = doc.updated_at ?? '';
        const currentUpdatedAt = lastSyncedAt ?? '';
        if (!incomingUpdatedAt || incomingUpdatedAt === currentUpdatedAt) return;
        if (!isIncomingNewer(incomingUpdatedAt, currentUpdatedAt)) return;

        applyRemoteContent(doc.content ?? '');
        setLastSyncedAt(incomingUpdatedAt);
      } catch {
        // keep silent; ws remains primary, polling is fallback
      }
    };

    pollingTimerRef.current = window.setInterval(() => {
      void poll();
    }, 1000);

    return () => {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
    };
  }, [projectId, meetingId, hasHydrated, token, lastSyncedAt]);

  useEffect(() => {
    const onSelectionChange = () => {
      if (cursorTimerRef.current) {
        window.clearTimeout(cursorTimerRef.current);
      }
      cursorTimerRef.current = window.setTimeout(() => {
        sendCursorUpdate(true);
      }, CURSOR_BROADCAST_DEBOUNCE_MS);
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange);
      // Do not send is_active:false here: React Strict Mode remount would flash-remove
      // remote cursors; server disconnect already broadcasts inactive via MeetingDocumentConsumer.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => {
        const next: Record<string, RemoteCursor> = {};
        let changed = false;
        for (const [key, cursor] of Object.entries(prev)) {
          const seenAt = cursorSeenAtRef.current[key] ?? 0;
          if (now - seenAt <= CURSOR_TTL_MS) {
            next[key] = cursor;
          } else {
            changed = true;
            delete cursorSeenAtRef.current[key];
          }
        }
        return changed ? next : prev;
      });
    }, 600);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (cursorHeartbeatTimerRef.current) {
      window.clearInterval(cursorHeartbeatTimerRef.current);
    }
    cursorHeartbeatTimerRef.current = window.setInterval(() => {
      const editor = editorRef.current;
      if (!editor) return;
      // Keep broadcasting while this tab is open: focus is often on the format toolbar,
      // not the contenteditable; otherwise peers' TTL drops our cursor after ~10s.
      sendCursorUpdateRef.current(true);
    }, CURSOR_HEARTBEAT_MS);

    return () => {
      if (cursorHeartbeatTimerRef.current) {
        window.clearInterval(cursorHeartbeatTimerRef.current);
        cursorHeartbeatTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistViaHttp = async (nextContent: string) => {
    setSaving(true);
    try {
      const response = await MeetingsAPI.saveMeetingDocument(projectId, meetingId, {
        content: nextContent,
      });
      setLastSyncedAt(response.updated_at ?? null);
    } catch {
      toast.error('Failed to save meeting document');
    } finally {
      setSaving(false);
    }
  };

  const scheduleSave = () => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        if (httpPersistTimerRef.current) {
          window.clearTimeout(httpPersistTimerRef.current);
        }
        ws.send(
          JSON.stringify({
            type: 'document_update',
            content: latestContentRef.current,
            client_id: clientIdRef.current,
          }),
        );
        httpPersistTimerRef.current = window.setTimeout(() => {
          void persistViaHttp(latestContentRef.current);
        }, HTTP_FALLBACK_DEBOUNCE_MS);
      } else {
        if (httpPersistTimerRef.current) {
          window.clearTimeout(httpPersistTimerRef.current);
        }
        httpPersistTimerRef.current = window.setTimeout(() => {
          void persistViaHttp(latestContentRef.current);
        }, HTTP_FALLBACK_DEBOUNCE_MS);
      }
    }, WS_SYNC_DEBOUNCE_MS);
  };

  const sendCursorUpdate = (isActive = true) => {
    const ws = wsRef.current;
    const editor = editorRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !editor) return;
    let x = 8 + editor.scrollLeft;
    let y = 8 + editor.scrollTop;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0).cloneRange();
      range.collapse(true);
      const caret = getCaretClientRect(range, editor);
      if (caret) {
        const pos = clientPointToEditorOverlay(editor, caret.left, caret.top);
        x = pos.x;
        y = pos.y;
      }
    }
    const selectionOffsets = getSelectionOffsets(editor);
    const selectionRects = getLiveSelectionRects(editor);
    ws.send(
      JSON.stringify({
        type: 'cursor_update',
        x,
        y,
        cursor_offset: getCursorOffset(editor),
        selection_start: selectionOffsets?.start ?? null,
        selection_end: selectionOffsets?.end ?? null,
        selection_rects: selectionRects,
        is_active: isActive,
        client_id: clientIdRef.current,
      }),
    );
  };

  sendCursorUpdateRef.current = sendCursorUpdate;

  const getCursorOffset = (editor: HTMLDivElement): number => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    if (!editor.contains(selection.anchorNode)) return 0;
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(true);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  };

  const getSelectionOffsets = (editor: HTMLDivElement): { start: number; end: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return null;
    const range = selection.getRangeAt(0).cloneRange();
    const startRange = range.cloneRange();
    startRange.collapse(true);
    const endRange = range.cloneRange();
    endRange.collapse(false);

    const preStart = startRange.cloneRange();
    preStart.selectNodeContents(editor);
    preStart.setEnd(startRange.endContainer, startRange.endOffset);

    const preEnd = endRange.cloneRange();
    preEnd.selectNodeContents(editor);
    preEnd.setEnd(endRange.endContainer, endRange.endOffset);

    const start = preStart.toString().length;
    const end = preEnd.toString().length;
    return { start: Math.min(start, end), end: Math.max(start, end) };
  };

  const getLiveSelectionRects = (editor: HTMLDivElement): Array<{ left: number; top: number; width: number; height: number }> => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];
    if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return [];
    const range = selection.getRangeAt(0);
    if (range.collapsed) return [];
    const editorRect = editor.getBoundingClientRect();
    return Array.from(range.getClientRects())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        left: rect.left - editorRect.left,
        top: rect.top - editorRect.top,
        width: rect.width,
        height: rect.height,
      }));
  };

  const resolveTextNodeAtOffset = (editor: HTMLDivElement, targetOffset: number): { node: Node; offset: number } | null => {
    const target = Math.max(0, targetOffset);
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let consumed = 0;
    let textNode = walker.nextNode();

    while (textNode) {
      const text = textNode.textContent ?? '';
      const nextConsumed = consumed + text.length;
      if (target <= nextConsumed) {
        return { node: textNode, offset: Math.max(0, Math.min(target - consumed, text.length)) };
      }
      consumed = nextConsumed;
      textNode = walker.nextNode();
    }

    if (editor.lastChild) {
      const fallbackOffset = editor.lastChild.nodeType === Node.TEXT_NODE
        ? (editor.lastChild.textContent ?? '').length
        : editor.lastChild.childNodes.length;
      return { node: editor.lastChild, offset: fallbackOffset };
    }

    return null;
  };

  const getSelectionRects = (editor: HTMLDivElement, start: number, end: number): Array<{ left: number; top: number; width: number; height: number }> => {
    if (end <= start) return [];
    const startPos = resolveTextNodeAtOffset(editor, start);
    const endPos = resolveTextNodeAtOffset(editor, end);
    if (!startPos || !endPos) return [];

    const range = document.createRange();
    range.setStart(startPos.node, startPos.offset);
    range.setEnd(endPos.node, endPos.offset);

    const editorRect = editor.getBoundingClientRect();
    const rects = Array.from(range.getClientRects());
    return rects
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        left: rect.left - editorRect.left,
        top: rect.top - editorRect.top,
        width: rect.width,
        height: rect.height,
      }));
  };

  const getCursorXYFromOffset = (editor: HTMLDivElement, offset: number): { x: number; y: number } | null => {
    const target = Math.max(0, offset);
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let consumed = 0;
    let textNode = walker.nextNode();
    while (textNode) {
      const nodeText = textNode.textContent ?? '';
      const nextConsumed = consumed + nodeText.length;
      if (target <= nextConsumed) {
        const nodeOffset = Math.max(0, Math.min(target - consumed, nodeText.length));
        const range = document.createRange();
        range.setStart(textNode, nodeOffset);
        range.setEnd(textNode, nodeOffset);
        const caret = getCaretClientRect(range, editor);
        if (caret) {
          return clientPointToEditorOverlay(editor, caret.left, caret.top);
        }
      }
      consumed = nextConsumed;
      textNode = walker.nextNode();
    }
    return null;
  };

  const resolveRemoteCursorPosition = (cursor: RemoteCursor): { left: number; top: number } => {
    void scrollLayoutTick;
    const editor = editorRef.current;
    if (!editor) return { left: Math.max(cursor.x, 0), top: Math.max(cursor.y, 0) };
    if (typeof cursor.cursorOffset === 'number') {
      const pos = getCursorXYFromOffset(editor, cursor.cursorOffset);
      if (pos) {
        return { left: Math.max(pos.x, 0), top: Math.max(pos.y, 0) };
      }
    }
    return { left: Math.max(cursor.x, 0), top: Math.max(cursor.y, 0) };
  };

  const applyFormat = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, value);
    const next = editor.innerHTML;
    latestContentRef.current = next;
    setContent(next);
    scheduleSave();
  };

  if (loading) {
    return <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">Loading document...</div>;
  }

  const activeEditorsCount = Object.keys(remoteCursors).length + 1;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Meeting document</h3>
          <p className="text-xs text-gray-500">
            Real-time collaborative editing is enabled.
          </p>
          <p className="text-[11px] text-gray-500">
            Editing now: {activeEditorsCount}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={connected ? 'text-green-600' : 'text-amber-600'}>
            {connected ? 'Realtime connected' : 'Realtime reconnecting...'}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => void persistViaHttp(content)}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-gray-200 bg-gray-50 p-1">
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('bold')}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('italic')}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('underline')}>
          <Underline className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('formatBlock', 'H1')}>
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('formatBlock', 'H2')}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('insertUnorderedList')}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('insertOrderedList')}>
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('formatBlock', 'BLOCKQUOTE')}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('undo')}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => applyFormat('redo')}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative isolate">
        {!content && (
          <div className="pointer-events-none absolute left-3 top-2 z-[1] text-sm text-gray-400">
            Start writing meeting notes...
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            const next = (e.currentTarget as HTMLDivElement).innerHTML;
            latestContentRef.current = next;
            setContent(next);
            scheduleSave();
            sendCursorUpdate(true);
          }}
          onKeyUp={() => sendCursorUpdate(true)}
          onMouseUp={() => sendCursorUpdate(true)}
          onFocus={() => sendCursorUpdate(true)}
          onScroll={() => setScrollLayoutTick((t) => t + 1)}
          onBlur={() => {
            void persistViaHttp(latestContentRef.current);
          }}
          className="relative z-0 min-h-[420px] w-full overflow-auto rounded-md border border-gray-300 px-3 py-2 text-sm leading-6 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:my-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:text-gray-700 [&_p]:my-1"
        />
        <div className="pointer-events-none absolute inset-0 z-[100]" aria-hidden>
          {Object.values(remoteCursors).map((cursor) => {
            void scrollLayoutTick;
            const position = resolveRemoteCursorPosition(cursor);
            const editor = editorRef.current;
            const hasOffsetRange =
              typeof cursor.selectionStart === 'number' &&
              typeof cursor.selectionEnd === 'number' &&
              cursor.selectionEnd > cursor.selectionStart;
            const selectionRectsFromOffset =
              hasOffsetRange && editor
                ? getSelectionRects(editor, cursor.selectionStart, cursor.selectionEnd)
                : [];
            const normalizePayloadRect = (rect: { left: number; top: number; width: number; height: number }) => {
              if (!editor) return rect;
              const maxDim = Math.max(editor.clientWidth, editor.clientHeight) * 3;
              let { left, top } = rect;
              if (left > maxDim || top > maxDim) {
                left = Math.max(0, left - editor.scrollLeft);
                top = Math.max(0, top - editor.scrollTop);
              }
              return { ...rect, left, top };
            };
            const payloadRects = cursor.selectionRects ?? [];
            const selectionRectsFromPayload = payloadRects.map((r) =>
              normalizePayloadRect({
                left: Math.max(r.left, 0),
                top: Math.max(r.top, 0),
                width: r.width,
                height: r.height,
              }),
            );
            // Prefer DOM from offsets; if empty (e.g. doc drift), fall back to payload. If peer cleared selection, both are [].
            const selectionRects =
              selectionRectsFromOffset.length > 0 ? selectionRectsFromOffset : selectionRectsFromPayload;
            const selectionLabelPosition =
              selectionRects.length > 0
                ? {
                    left: selectionRects[0].left,
                    top: Math.max(selectionRects[0].top - 20, 0),
                  }
                : null;
            const highlightBg = selectionHighlightBackground(cursor.color);
            return (
              <div key={cursor.presenceKey}>
                {selectionRects.map((rect, idx) => (
                  <div
                    key={`sel-${cursor.presenceKey}-${idx}`}
                    className="pointer-events-none absolute rounded-[2px]"
                    style={{
                      left: `${Math.max(rect.left, 0)}px`,
                      top: `${Math.max(rect.top, 0)}px`,
                      width: `${rect.width}px`,
                      height: `${rect.height}px`,
                      backgroundColor: highlightBg,
                    }}
                  />
                ))}
                {selectionLabelPosition && (
                  <div
                    className="pointer-events-none absolute rounded px-1.5 py-0.5 text-[10px] text-white shadow-sm"
                    style={{
                      left: `${selectionLabelPosition.left}px`,
                      top: `${selectionLabelPosition.top}px`,
                      backgroundColor: cursor.color,
                    }}
                  >
                    {cursor.username}
                  </div>
                )}
                <div
                  className="pointer-events-none absolute"
                  style={{ left: `${position.left}px`, top: `${position.top}px` }}
                >
                  <div className="h-5 w-0.5" style={{ backgroundColor: cursor.color }} />
                  {!selectionLabelPosition && (
                    <div className="rounded px-1.5 py-0.5 text-[10px] text-white shadow-sm" style={{ backgroundColor: cursor.color }}>
                      {cursor.username}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'Not synced yet'}
      </div>
      {Object.values(remoteCursors).length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
          {Object.values(remoteCursors).map((cursor) => (
            <span
              key={`badge-${cursor.presenceKey}`}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cursor.color }} />
              {cursor.username}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
