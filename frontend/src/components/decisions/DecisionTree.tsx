'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, PencilLine } from 'lucide-react';
import type { DecisionGraphEdge, DecisionGraphNode } from '@/types/decision';

interface DecisionTreeProps {
  nodes: DecisionGraphNode[];
  edges: DecisionGraphEdge[];
  projectId?: number | null;
  mode?: 'viewer' | 'selector';
  onAddDecision?: (decision: DecisionGraphNode) => void;
  selectedSeqs?: Set<number> | number[];
  focusSeq?: number | null;
  onEditDecision?: (decision: DecisionGraphNode) => void;
  onCreateDecision?: () => void;
  autoFocusToday?: boolean;
  focusDateKey?: string | null;
}

type PositionedNode = DecisionGraphNode & { x: number; y: number; dateKey: string };
type DateColumn = { dateKey: string; x: number; count: number };

const NODE_WIDTH = 210;
const NODE_HEIGHT = 64;
const COLUMN_GAP = 120;
const COLUMN_PADDING_X = 24;
const ROW_GAP = 24;
const PADDING = 32;
const EXTRA_SCROLL = 240;
const HEADER_BAND_HEIGHT = 40;
const BASE_ZOOM = 0.7;
const ZOOM_MIN = BASE_ZOOM * 0.5;
const ZOOM_MAX = BASE_ZOOM * 2.0;
const DEFAULT_ZOOM = BASE_ZOOM;
const ZOOM_STEP = BASE_ZOOM * 0.1;

const formatDateKey = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toISOString().slice(0, 10);
};

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (dateKey: string) => {
  if (dateKey === 'Unknown') return 'Unknown';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatDateLabelFull = (dateKey: string) => {
  if (dateKey === 'Unknown') return 'Unknown';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const formatDateLabelMinimal = (dateKey: string) => {
  if (dateKey === 'Unknown') return 'Unknown';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
  }).format(date);
};

const formatDateTooltip = (dateKey: string) => {
  if (dateKey === 'Unknown') return 'Unknown';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const weekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  }).format(date);
  return `${dateKey} (${weekday})`;
};

const getWeekdayStyle = (dateKey: string) => {
  if (dateKey === 'Unknown') {
    return {
      backgroundColor: '#f1f5f9',
      borderColor: '#e2e8f0',
      color: '#0f172a',
      tickColor: '#cbd5f5',
    };
  }
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return {
      backgroundColor: '#f1f5f9',
      borderColor: '#e2e8f0',
      color: '#0f172a',
      tickColor: '#cbd5f5',
    };
  }
  const day = date.getDay();
  switch (day) {
    case 1: // Mon
      return {
        backgroundColor: '#e0f2fe',
        borderColor: '#bae6fd',
        color: '#0c4a6e',
        tickColor: '#7dd3fc',
      };
    case 2: // Tue
      return {
        backgroundColor: '#ecfccb',
        borderColor: '#d9f99d',
        color: '#365314',
        tickColor: '#a3e635',
      };
    case 3: // Wed
      return {
        backgroundColor: '#fef3c7',
        borderColor: '#fde68a',
        color: '#92400e',
        tickColor: '#fbbf24',
      };
    case 4: // Thu
      return {
        backgroundColor: '#ede9fe',
        borderColor: '#ddd6fe',
        color: '#4c1d95',
        tickColor: '#c4b5fd',
      };
    case 5: // Fri
      return {
        backgroundColor: '#ffe4e6',
        borderColor: '#fecdd3',
        color: '#9f1239',
        tickColor: '#fda4af',
      };
    case 6: // Sat
      return {
        backgroundColor: '#dcfce7',
        borderColor: '#bbf7d0',
        color: '#166534',
        tickColor: '#86efac',
      };
    case 0: // Sun
    default:
      return {
        backgroundColor: '#e2e8f0',
        borderColor: '#cbd5f5',
        color: '#1e293b',
        tickColor: '#94a3b8',
      };
  }
};

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

const statusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-800';
    case 'AWAITING_APPROVAL':
      return 'bg-blue-100 text-blue-800';
    case 'COMMITTED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REVIEWED':
      return 'bg-purple-100 text-purple-800';
    case 'ARCHIVED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const DecisionTree = ({
  nodes,
  edges,
  projectId,
  mode = 'viewer',
  onAddDecision,
  onEditDecision,
  selectedSeqs,
  focusSeq,
  onCreateDecision,
  autoFocusToday = false,
  focusDateKey,
}: DecisionTreeProps) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const dragState = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [scale, setScale] = useState(DEFAULT_ZOOM);
  const [popover, setPopover] = useState<{
    node: DecisionGraphNode;
    x: number;
    y: number;
  } | null>(null);
  const [headerTooltip, setHeaderTooltip] = useState<{
    dateKey: string;
    x: number;
    y: number;
    count: number;
  } | null>(null);

  const selectedSeqSet = useMemo(() => {
    if (!selectedSeqs) return new Set<number>();
    return selectedSeqs instanceof Set ? selectedSeqs : new Set(selectedSeqs);
  }, [selectedSeqs]);

  const todayKey = useMemo(() => formatLocalDateKey(new Date()), []);

  const { positionedNodes, dateColumns } = useMemo(() => {
    const byDate = new Map<string, DecisionGraphNode[]>();
    nodes.forEach((node) => {
      const key = formatDateKey(node.createdAt);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)?.push(node);
    });
    const sortedDates = Array.from(byDate.keys());
    if (!sortedDates.includes(todayKey)) {
      sortedDates.push(todayKey);
    }
    sortedDates.sort();
    const indexMap = new Map<number, number>();
    const columnIndexMap = new Map<string, number>();
    sortedDates.forEach((dateKey, index) => {
      columnIndexMap.set(dateKey, index);
    });
    const outgoing = edges.reduce<Record<number, number[]>>((acc, edge) => {
      acc[edge.from] = acc[edge.from] || [];
      acc[edge.from].push(edge.to);
      return acc;
    }, {});

    let all: PositionedNode[] = [];
    const columns: DateColumn[] = [];
    sortedDates.forEach((dateKey, dateIndex) => {
      columns.push({
        dateKey,
        x: PADDING + dateIndex * (NODE_WIDTH + COLUMN_GAP),
        count: byDate.get(dateKey)?.length ?? 0,
      });
      const columnNodes = byDate.get(dateKey) || [];
      const ordered: DecisionGraphNode[] = [];
      const remaining = new Set(columnNodes.map((n) => n.id));

      columnNodes.forEach((node) => {
        const parentsInSameDate = edges
          .filter((edge) => edge.to === node.id)
          .map((edge) => edge.from)
          .filter((parentId) => byDate.get(dateKey)?.some((n) => n.id === parentId));
        if (parentsInSameDate.length === 0 && remaining.has(node.id)) {
          ordered.push(node);
          remaining.delete(node.id);
        }
      });

      let guard = 0;
      while (remaining.size > 0 && guard < columnNodes.length * 2) {
        guard += 1;
        for (const nodeId of Array.from(remaining)) {
          const parentId = edges.find((edge) => edge.to === nodeId)?.from;
          const parentIndex = ordered.findIndex((n) => n.id === parentId);
          if (parentIndex !== -1) {
            const node = columnNodes.find((n) => n.id === nodeId);
            if (node) {
              ordered.splice(parentIndex + 1, 0, node);
              remaining.delete(nodeId);
            }
          }
        }
      }

      for (const nodeId of Array.from(remaining)) {
        const node = columnNodes.find((n) => n.id === nodeId);
        if (node) ordered.push(node);
      }

      ordered.forEach((node, rowIndex) => {
        indexMap.set(node.id, rowIndex);
        const rowOffset = dateKey === todayKey ? 1 : 0;
        all.push({
          ...node,
          dateKey,
          x: PADDING + dateIndex * (NODE_WIDTH + COLUMN_GAP),
          y:
            PADDING +
            HEADER_BAND_HEIGHT +
            (rowIndex + rowOffset) * (NODE_HEIGHT + ROW_GAP),
        });
      });
    });

    if (sortedDates.length === 0 && nodes.length > 0) {
      columns.push({ dateKey: 'Unknown', x: PADDING, count: nodes.length });
      nodes.forEach((node, index) => {
        all.push({
          ...node,
          dateKey: 'Unknown',
          x: PADDING,
          y: PADDING + HEADER_BAND_HEIGHT + index * (NODE_HEIGHT + ROW_GAP),
        });
      });
    }

    return { positionedNodes: all, dateColumns: columns };
  }, [nodes, edges, todayKey]);

  const headerLayout = useMemo(() => {
    const preferredSpacing = NODE_WIDTH + COLUMN_GAP;
    const spacing = preferredSpacing * scale;
    let labelMode: 'full' | 'short' | 'minimal' = 'short';
    if (spacing >= 120) labelMode = 'full';
    else if (spacing >= 80) labelMode = 'short';
    else labelMode = 'minimal';
    const densityEvery =
      spacing < 80 ? clamp(2, Math.ceil(80 / Math.max(spacing, 1)), 6) : 1;
    const fontSize = clamp(10, Math.round(spacing / 10), 14);
    return { labelMode, densityEvery, fontSize, spacing };
  }, [scale]);

  const contentSize = useMemo(() => {
    const maxX = Math.max(0, ...positionedNodes.map((node) => node.x + NODE_WIDTH));
    const maxY = Math.max(0, ...positionedNodes.map((node) => node.y + NODE_HEIGHT));
    return {
      width: maxX + PADDING + EXTRA_SCROLL,
      height: maxY + PADDING + EXTRA_SCROLL,
    };
  }, [positionedNodes]);

  const nodeMap = useMemo(() => {
    return positionedNodes.reduce<Record<number, PositionedNode>>((acc, node) => {
      acc[node.id] = node;
      return acc;
    }, {});
  }, [positionedNodes]);

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const nextScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
    if (nextScale === scale) return;

    const rect = viewport.getBoundingClientRect();
    const offsetX = event.clientX - rect.left + viewport.scrollLeft;
    const offsetY = event.clientY - rect.top + viewport.scrollTop;
    const scaleRatio = nextScale / scale;
    const nextScrollLeft = offsetX * scaleRatio - (event.clientX - rect.left);
    const nextScrollTop = offsetY * scaleRatio - (event.clientY - rect.top);
    viewport.scrollLeft = nextScrollLeft;
    viewport.scrollTop = nextScrollTop;
    setScale(nextScale);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const delta = direction === 'in' ? ZOOM_STEP : -ZOOM_STEP;
    const nextScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale + delta));
    if (nextScale === scale) return;
    const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
    const centerY = viewport.scrollTop + viewport.clientHeight / 2;
    const scaleRatio = nextScale / scale;
    viewport.scrollLeft = centerX * scaleRatio - viewport.clientWidth / 2;
    viewport.scrollTop = centerY * scaleRatio - viewport.clientHeight / 2;
    setScale(nextScale);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    dragState.current = {
      dragging: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
    };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !dragState.current.dragging) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    if (!dragState.current.moved && Math.hypot(dx, dy) > 4) {
      dragState.current.moved = true;
    }
    const nextScrollLeft = dragState.current.scrollLeft - dx;
    const nextScrollTop = dragState.current.scrollTop - dy;
    viewport.scrollLeft = nextScrollLeft;
    viewport.scrollTop = nextScrollTop;
  };

  const handleMouseUp = () => {
    dragState.current.dragging = false;
  };

  const handleNodeClick = (node: DecisionGraphNode, event: React.MouseEvent<HTMLButtonElement>) => {
    if (dragState.current.dragging || dragState.current.moved) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPopover({
      node,
      x: rect.right + 12,
      y: rect.top,
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('[data-decision-popover]')) return;
      if (event.target.closest('[data-decision-node]')) return;
      setPopover(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!focusSeq) return;
    const target = positionedNodes.find((node) => node.projectSeq === focusSeq);
    const viewport = viewportRef.current;
    if (!target || !viewport) return;
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;
    const targetX = (target.x + NODE_WIDTH / 2) * scale;
    const targetY = (target.y + NODE_HEIGHT / 2) * scale;
    const nextLeft = Math.max(0, targetX - viewportWidth / 2);
    const nextTop = Math.max(0, targetY - viewportHeight / 2);
    requestAnimationFrame(() => {
      viewport.scrollLeft = nextLeft;
      viewport.scrollTop = nextTop;
    });
  }, [focusSeq, positionedNodes, scale]);

  const todayColumn = dateColumns.find((column) => column.dateKey === todayKey);
  const autoFocusDone = useRef(false);

  useEffect(() => {
    if (!autoFocusToday || autoFocusDone.current) return;
    if (!todayColumn) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const targetX = (todayColumn.x + NODE_WIDTH / 2) * scale;
    const targetY = (PADDING + HEADER_BAND_HEIGHT / 2) * scale;
    autoFocusDone.current = true;
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, targetX - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, targetY - viewport.clientHeight / 2);
    });
  }, [autoFocusToday, todayColumn, scale]);

  useEffect(() => {
    if (!focusDateKey) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const decisionColumns = dateColumns.filter((column) => column.count > 0);
    if (decisionColumns.length === 0) return;
    const targetDate = new Date(`${focusDateKey}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return;
    let nearest = decisionColumns[0];
    let nearestDiff = Math.abs(
      new Date(`${nearest.dateKey}T00:00:00`).getTime() - targetDate.getTime()
    );
    for (const column of decisionColumns.slice(1)) {
      const diff = Math.abs(
        new Date(`${column.dateKey}T00:00:00`).getTime() - targetDate.getTime()
      );
      if (diff < nearestDiff) {
        nearest = column;
        nearestDiff = diff;
      }
    }
    const targetX = (nearest.x + NODE_WIDTH / 2) * scale;
    const targetY = (PADDING + HEADER_BAND_HEIGHT / 2) * scale;
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, targetX - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, targetY - viewport.clientHeight / 2);
    });
  }, [focusDateKey, dateColumns, scale]);

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 shadow-sm">
        <button
          type="button"
          onClick={() => handleZoom('out')}
          className="h-6 w-6 rounded-full border border-gray-200 text-gray-600 hover:border-gray-300"
          aria-label="Zoom out"
        >
          -
        </button>
        <span className="min-w-[52px] text-center">
          {Math.round((scale / BASE_ZOOM) * 100)}%
        </span>
        <button
          type="button"
          onClick={() => handleZoom('in')}
          className="h-6 w-6 rounded-full border border-gray-200 text-gray-600 hover:border-gray-300"
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
      <div
        ref={viewportRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`h-[320px] overflow-auto ${dragState.current.dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <div
          ref={contentRef}
          style={{
            width: contentSize.width,
            height: contentSize.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="relative"
        >
          <svg
            className="absolute inset-0 h-full w-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="decision-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5f5" />
              </marker>
            </defs>
            {dateColumns.map((column) => (
              <rect
                key={`band-${column.dateKey}`}
                x={column.x - COLUMN_PADDING_X}
                y={0}
                width={NODE_WIDTH + COLUMN_PADDING_X * 2}
                height={contentSize.height}
                rx={16}
                fill="rgba(148, 163, 184, 0.08)"
              />
            ))}
            {edges.map((edge, idx) => {
              const fromNode = nodeMap[edge.from];
              const toNode = nodeMap[edge.to];
              if (!fromNode || !toNode) return null;
              const sameColumn = fromNode.x === toNode.x;
              const startX = fromNode.x + NODE_WIDTH;
              const startY = fromNode.y + NODE_HEIGHT / 2;
              const endX = sameColumn ? toNode.x + NODE_WIDTH : toNode.x;
              const endY = toNode.y + NODE_HEIGHT / 2;
              const curve = Math.max(40, (endX - startX) / 2);
              const loopOffset = 36;
              const path = sameColumn
                ? `M ${startX} ${startY} C ${startX + loopOffset} ${startY}, ${
                    startX + loopOffset
                  } ${endY}, ${endX} ${endY}`
                : `M ${startX} ${startY} C ${startX + curve} ${startY}, ${
                    endX - curve
                  } ${endY}, ${endX} ${endY}`;
              return (
                <path
                  key={`edge-${idx}`}
                  d={path}
                  stroke="#cbd5f5"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd="url(#decision-arrow)"
                />
              );
            })}
          </svg>

          <div className="pointer-events-none absolute inset-0">
            {dateColumns.map((column, index) => {
              const { labelMode, densityEvery, fontSize } = headerLayout;
              const showLabel = index % densityEvery === 0;
              const label =
                labelMode === 'full'
                  ? formatDateLabelFull(column.dateKey)
                  : labelMode === 'short'
                    ? formatDateLabel(column.dateKey)
                    : formatDateLabelMinimal(column.dateKey);
              const chipHeight = 24;
              const chipY = (HEADER_BAND_HEIGHT - chipHeight) / 2;
              const centerX = column.x + NODE_WIDTH / 2;
              const chipWidth = Math.max(54, label.length * (fontSize * 0.6) + 18);

              if (!showLabel) {
                const { tickColor } = getWeekdayStyle(column.dateKey);
                return (
                  <div
                    key={`header-${column.dateKey}`}
                    className="absolute"
                    style={{
                      left: centerX - 4,
                      top: chipY + chipHeight / 2 - 2,
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: tickColor,
                    }}
                  />
                );
              }

              const { backgroundColor, borderColor, color } = getWeekdayStyle(
                column.dateKey
              );
              return (
                <button
                  key={`header-${column.dateKey}`}
                  type="button"
                  className="pointer-events-auto absolute flex items-center justify-center border shadow-sm"
                  style={{
                    left: centerX - chipWidth / 2,
                    top: chipY,
                    width: chipWidth,
                    height: chipHeight,
                    borderRadius: chipHeight / 2,
                    fontSize,
                    fontWeight: 600,
                    backgroundColor,
                    borderColor,
                    color,
                  }}
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setHeaderTooltip({
                      dateKey: column.dateKey,
                      x: rect.left + rect.width / 2,
                      y: rect.top - 8,
                      count: column.count,
                    });
                  }}
                  onMouseLeave={() => setHeaderTooltip(null)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {todayColumn && onCreateDecision ? (
            <button
              type="button"
              onClick={onCreateDecision}
              className="absolute flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-500 hover:border-blue-300 hover:text-blue-600"
              style={{
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                left: todayColumn.x,
                top: PADDING + HEADER_BAND_HEIGHT,
              }}
            >
              + Create Decision
            </button>
          ) : null}

          {positionedNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              data-decision-node
              onClick={(event) => handleNodeClick(node, event)}
              className={`absolute rounded-xl border bg-white px-3 py-2 text-left shadow-sm transition ${
                node.projectSeq && selectedSeqSet.has(node.projectSeq)
                  ? 'border-emerald-300 ring-2 ring-emerald-200'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow'
              } ${
                focusSeq && node.projectSeq === focusSeq
                  ? 'ring-2 ring-blue-300'
                  : ''
              }`}
              style={{
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                left: node.x,
                top: node.y,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-[13px] font-semibold text-gray-900">
                  {node.title || 'Untitled'}
                </div>
                {node.projectSeq ? (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    #{node.projectSeq}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(
                    node.status
                  )}`}
                >
                  {node.status}
                </span>
                {node.riskLevel ? (
                  <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {node.riskLevel}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      </div>

      {popover ? (
        <div
          data-decision-popover
          className="fixed z-50 w-64 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
          style={{ left: popover.x, top: popover.y }}
        >
          <div className="text-sm font-semibold text-gray-900">
            {popover.node.title || 'Untitled'}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(
                popover.node.status
              )}`}
            >
              {popover.node.status}
            </span>
            {popover.node.riskLevel ? (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {popover.node.riskLevel}
              </span>
            ) : null}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Created: {new Date(popover.node.createdAt).toLocaleString()}
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              {mode === 'selector' ? (
                <button
                  type="button"
                  onClick={() => onAddDecision?.(popover.node)}
                  disabled={
                    !popover.node.projectSeq ||
                    selectedSeqSet.has(popover.node.projectSeq)
                  }
                  className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-semibold ${
                    !popover.node.projectSeq ||
                    selectedSeqSet.has(popover.node.projectSeq)
                      ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {!popover.node.projectSeq ||
                  selectedSeqSet.has(popover.node.projectSeq)
                    ? 'Added'
                    : '+ Add'}
                </button>
              ) : null}
              {popover.node.status === 'DRAFT' && onEditDecision ? (
                <button
                  type="button"
                  onClick={() => {
                    setPopover(null);
                    onEditDecision(popover.node);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:border-amber-300"
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </button>
              ) : null}
              <Link
                href={`/decisions/${popover.node.id}${
                  projectId ? `?project_id=${projectId}` : ''
                }`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
              >
                <FileText className="h-3.5 w-3.5" />
                Details
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {headerTooltip ? (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 shadow-lg"
          style={{ left: headerTooltip.x, top: headerTooltip.y }}
        >
          <div className="font-semibold text-slate-900">
            {formatDateTooltip(headerTooltip.dateKey)}
          </div>
          <div className="text-[11px] text-slate-600">
            {headerTooltip.count} decision{headerTooltip.count === 1 ? '' : 's'}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DecisionTree;
