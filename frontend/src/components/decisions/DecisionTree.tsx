'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { DecisionGraphEdge, DecisionGraphNode } from '@/types/decision';

interface DecisionTreeProps {
  nodes: DecisionGraphNode[];
  edges: DecisionGraphEdge[];
  projectId?: number | null;
}

type PositionedNode = DecisionGraphNode & { x: number; y: number; dateKey: string };
type DateColumn = { dateKey: string; x: number; count: number };

const NODE_WIDTH = 180;
const NODE_HEIGHT = 54;
const COLUMN_GAP = 120;
const COLUMN_PADDING_X = 24;
const ROW_GAP = 24;
const PADDING = 32;
const HEADER_BAND_HEIGHT = 40;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;

const formatDateKey = (value?: string) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toISOString().slice(0, 10);
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

const DecisionTree = ({ nodes, edges, projectId }: DecisionTreeProps) => {
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
  const [scale, setScale] = useState(1);
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

  const { positionedNodes, dateColumns } = useMemo(() => {
    const byDate = new Map<string, DecisionGraphNode[]>();
    nodes.forEach((node) => {
      const key = formatDateKey(node.createdAt);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)?.push(node);
    });
    const sortedDates = Array.from(byDate.keys()).sort();
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
        all.push({
          ...node,
          dateKey,
          x: PADDING + dateIndex * (NODE_WIDTH + COLUMN_GAP),
          y: PADDING + HEADER_BAND_HEIGHT + rowIndex * (NODE_HEIGHT + ROW_GAP),
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
  }, [nodes, edges]);

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
      width: maxX + PADDING,
      height: maxY + PADDING,
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
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
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

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
        No decision relationships yet.
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-gray-200 bg-white">
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
              const startX = fromNode.x + NODE_WIDTH;
              const startY = fromNode.y + NODE_HEIGHT / 2;
              const endX = toNode.x;
              const endY = toNode.y + NODE_HEIGHT / 2;
              const curve = Math.max(40, (endX - startX) / 2);
              const path = `M ${startX} ${startY} C ${startX + curve} ${startY}, ${
                endX - curve
              } ${endY}, ${endX} ${endY}`;
              return (
                <path
                  key={`edge-${idx}`}
                  d={path}
                  stroke="#cbd5f5"
                  strokeWidth="2"
                  fill="none"
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

          {positionedNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              data-decision-node
              onClick={(event) => handleNodeClick(node, event)}
              className="absolute rounded-xl border border-gray-200 bg-white px-3 py-2 text-left shadow-sm hover:border-blue-300 hover:shadow"
              style={{
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
                left: node.x,
                top: node.y,
              }}
            >
              <div className="truncate text-sm font-semibold text-gray-900">
                {node.title || 'Untitled'}
              </div>
              <div className="mt-1 flex items-center gap-2">
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
            <Link
              href={`/decisions/${popover.node.id}${
                projectId ? `?project_id=${projectId}` : ''
              }`}
              className="inline-flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Open
            </Link>
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
