'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragMoveEvent, Modifier } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { DashboardAPI } from '@/lib/api/dashboardApi';
import WorkspaceDashboard from '@/components/projects/WorkspaceDashboard';
import type { WorkspaceDashboardWidget } from '@/components/projects/WorkspaceDashboard';
import type { OverviewMock } from '@/types/overview';
import type { DashboardLayoutResponse, DashboardWidgetDefinition, DashboardWidgetPosition } from '@/types/dashboardLayout';
import { moveWidget, placeWidget } from './layout';
import { widgetRegistry } from './widgetRegistry';
import styles from './DashboardBuilder.module.css';

const ROW_HEIGHT = 24;
const GRID_GAP = 8;
const OVERVIEW_ROWS = 5;
// Reserve one small card's height for collision push-down, then stop the grid.
const BOTTOM_MARGIN_ROWS = 8;

function matchesSavedWidgets(expected: DashboardWidgetPosition[], actual: DashboardWidgetPosition[]) {
  if (expected.length !== actual.length) return false;
  const saved = new Map(actual.map((widget) => [widget.id, widget]));
  return expected.every((widget) => {
    const found = saved.get(widget.id);
    return found?.x === widget.x && found.y === widget.y
      && found.w === widget.w && found.h === widget.h;
  });
}

interface DashboardBuilderProps {
  data: OverviewMock;
  projectId: number | string;
  projectName?: string | null;
  projectSlug?: string | null;
  contentLoading: boolean;
}

function WidgetCard({
  widget, definition, content, onResizeStart,
}: {
  widget: DashboardWidgetPosition;
  definition: DashboardWidgetDefinition;
  content: React.ReactNode;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>, widget: DashboardWidgetPosition) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: widget.id });
  const position = {
    '--widget-column': `${widget.x + 1} / span ${widget.w}`,
    '--widget-row': `${widget.y + 1} / span ${widget.h}`,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 10 : undefined,
  } as CSSProperties;

  return (
    <section ref={setNodeRef} className={`${styles.widget} ${isDragging ? styles.dragging : ''}`} style={position} data-widget-id={widget.id} data-section={widget.y < OVERVIEW_ROWS ? 'overview' : 'module'} id={widget.id}>
      <div className={styles.widgetContent}>{content}</div>
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Move ${definition.label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={15} />
      </button>
      <button
        type="button"
        className={styles.resizeHandle}
        aria-label={`Resize ${definition.label}`}
        onPointerDown={(event) => onResizeStart(event, widget)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 14l6-6M12 14l2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </section>
  );
}

function DashboardGrid(props: DashboardBuilderProps & { workspaceWidgets: WorkspaceDashboardWidget[] }) {
  const { projectId, contentLoading } = props;
  const [layout, setLayout] = useState<DashboardLayoutResponse | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidgetPosition[]>([]);
  const [rowLimit, setRowLimit] = useState(0);
  const [resizePreview, setResizePreview] = useState<DashboardWidgetPosition[] | null>(null);
  const [dropLayout, setDropLayout] = useState<DashboardWidgetPosition[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragPointer = useRef<{ x: number; y: number } | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    let cancelled = false;
    revision.current += 1;
    setLayout(null);
    setLoadError(false);
    DashboardAPI.getLayout(projectId).then(({ data }) => {
      if (cancelled) return;
      setLayout(data);
      setWidgets(data.widgets);
      const contentBottom = Math.max(0, ...data.widgets.map((widget) => widget.y + widget.h));
      setRowLimit(Math.min(data.max_rows, contentBottom + BOTTOM_MARGIN_ROWS));
      setSaveState('idle');
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    });
    return () => { cancelled = true; };
  }, [projectId, reloadKey]);

  useEffect(() => {
    const trackPointer = (event: PointerEvent) => {
      dragPointer.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener('pointermove', trackPointer, true);
    window.addEventListener('pointerup', trackPointer, true);
    return () => {
      window.removeEventListener('pointermove', trackPointer, true);
      window.removeEventListener('pointerup', trackPointer, true);
    };
  }, []);

  const restrictToDashboard: Modifier = ({ transform, activeNodeRect }) => {
    const grid = gridRef.current;
    if (!grid || !activeNodeRect || !rowLimit) return transform;
    const rect = grid.getBoundingClientRect();
    const bottom = rect.top + rowLimit * (ROW_HEIGHT + GRID_GAP) - GRID_GAP;
    return {
      ...transform,
      x: Math.max(rect.left - activeNodeRect.left, Math.min(rect.right - activeNodeRect.right, transform.x)),
      y: Math.max(rect.top - activeNodeRect.top, Math.min(bottom - activeNodeRect.bottom, transform.y)),
    };
  };

  function persist(next: DashboardWidgetPosition[]) {
    setWidgets(next);
    const contentBottom = Math.max(...next.map((widget) => widget.y + widget.h));
    setRowLimit((current) => Math.min(layout?.max_rows ?? current, contentBottom + BOTTOM_MARGIN_ROWS));
    setSaveState('saving');
    const currentRevision = ++revision.current;
    saveChain.current = saveChain.current.catch(() => undefined).then(async () => {
      await DashboardAPI.saveLayout(projectId, next);
      const { data } = await DashboardAPI.getLayout(projectId);
      if (!matchesSavedWidgets(next, data.widgets)) {
        throw new Error('Dashboard layout did not match the saved version.');
      }
      if (currentRevision === revision.current) setSaveState('saved');
    }).catch(() => {
      if (currentRevision === revision.current) setSaveState('error');
    });
  }

  function movedLayout(event: DragMoveEvent | DragEndEvent) {
    if (!layout) return null;
    const widget = widgets.find((item) => item.id === event.active.id);
    const grid = gridRef.current;
    if (!widget || !grid) return null;
    const columnStep = (grid.clientWidth + GRID_GAP) / layout.columns;
    const candidate = {
      ...widget,
      x: widget.x + Math.round(event.delta.x / columnStep),
      y: widget.y + Math.round(event.delta.y / (ROW_HEIGHT + GRID_GAP)),
    };
    if (dragPointer.current) {
      const rect = grid.getBoundingClientRect();
      const pointerX = (dragPointer.current.x - rect.left) / columnStep;
      const pointerY = (dragPointer.current.y - rect.top) / (ROW_HEIGHT + GRID_GAP);
      const target = widgets.find((item) => item.id !== widget.id
        && pointerX >= item.x && pointerX < item.x + item.w
        && pointerY >= item.y
        && pointerY < item.y + item.h);
      const sameSize = target?.w === widget.w && target?.h === widget.h;
      if (target && (sameSize || pointerY - target.y < 1.25)) {
        candidate.x = target.x;
        candidate.y = target.y;
      }
    }
    candidate.y = Math.max(0, Math.min(rowLimit - candidate.h, candidate.y));
    return moveWidget(widgets, candidate, layout.columns, layout.max_rows);
  }

  function onDragMove(event: DragMoveEvent) {
    const next = movedLayout(event);
    setDropLayout((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
  }

  function onDragEnd(event: DragEndEvent) {
    // Commit the placement shown to the user. Auto-scroll can move the grid
    // between the last preview and pointer release without another drag move.
    const next = dropLayout ?? movedLayout(event);
    setDropLayout(null);
    setDraggingId(null);
    if (!next) return;
    if (JSON.stringify(next) !== JSON.stringify(widgets)) persist(next);
  }

  function onResizeStart(event: ReactPointerEvent<HTMLButtonElement>, widget: DashboardWidgetPosition) {
    if (!layout || !gridRef.current || event.button !== 0) return;
    revision.current += 1;
    setSaveState('idle');
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const columnStep = (gridRef.current.clientWidth + GRID_GAP) / layout.columns;
    const resizedLayout = (clientX: number, clientY: number) => {
      const definition = layout.catalog.find((item) => item.id === widget.id);
      // An older running API may not include min_width yet. Keep the current
      // width in that case so the preview never receives NaN dimensions.
      const minWidth = Number.isFinite(layout.min_width) ? layout.min_width : widget.w;
      const candidate = {
        ...widget,
        w: Math.max(minWidth, widget.w + Math.round((clientX - startX) / columnStep)),
        h: Math.max(definition?.min_h ?? 1, widget.h + Math.round((clientY - startY) / (ROW_HEIGHT + GRID_GAP))),
      };
      return placeWidget(widgets, candidate, layout.columns, rowLimit);
    };
    const onPointerMove = (moveEvent: PointerEvent) => {
      setResizePreview(resizedLayout(moveEvent.clientX, moveEvent.clientY));
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      setResizePreview(null);
    };
    const onPointerUp = (endEvent: PointerEvent) => {
      const next = resizedLayout(endEvent.clientX, endEvent.clientY);
      cleanup();
      if (JSON.stringify(next) !== JSON.stringify(widgets)) persist(next);
    };
    const onPointerCancel = () => cleanup();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
  }

  if (loadError) {
    return <div role="alert" className="rounded-lg border bg-white p-4 text-sm">Could not load dashboard layout. <button className="underline" onClick={() => setReloadKey((key) => key + 1)}>Try again</button></div>;
  }
  if (!layout) return <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">Loading dashboard layout…</div>;

  const definitions = new Map(layout.catalog.map((definition) => [definition.id, definition]));
  const workspaceContent = new Map(props.workspaceWidgets.map((widget) => [widget.id, widget.content]));
  const dropPreview = dropLayout?.find((widget) => widget.id === draggingId);

  return (
    <div>
      {saveState !== 'idle' && (
        <div className="mb-2 flex items-center justify-end gap-3 text-xs text-gray-500">
          <span role="status" className="text-xs text-gray-500">
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Could not save' : ''}
          </span>
          {saveState === 'error' && <button type="button" className="text-xs underline" onClick={() => persist(widgets)}>Retry</button>}
        </div>
      )}
      {contentLoading && <p role="status" className="mb-3 text-xs text-gray-500">Loading card data…</p>}
      <DndContext sensors={sensors} modifiers={[restrictToDashboard]} autoScroll={{
        acceleration: 6,
        interval: 16,
        threshold: { x: 0.1, y: 0.16 },
        canScroll: (element) => element === gridRef.current?.closest('main.dashboard-scrollbar'),
      }} onDragStart={(event) => {
        revision.current += 1;
        setSaveState('idle');
        const activation = event.activatorEvent;
        dragPointer.current = 'clientX' in activation && 'clientY' in activation
          ? { x: Number(activation.clientX), y: Number(activation.clientY) }
          : null;
        setDraggingId(String(event.active.id));
      }} onDragMove={onDragMove} onDragEnd={(event) => { onDragEnd(event); dragPointer.current = null; }} onDragCancel={() => { setDropLayout(null); setDraggingId(null); dragPointer.current = null; }}>
        <div ref={gridRef} className={styles.grid} style={{ '--dashboard-columns': layout.columns, minHeight: rowLimit * (ROW_HEIGHT + GRID_GAP) - GRID_GAP } as CSSProperties}>
          {dropPreview && (
            <div aria-hidden="true" data-testid="dashboard-drop-preview" className={styles.dropPreview} style={{
              '--widget-column': `${dropPreview.x + 1} / span ${dropPreview.w}`,
              '--widget-row': `${dropPreview.y + 1} / span ${dropPreview.h}`,
            } as CSSProperties} />
          )}
          {(resizePreview ?? widgets).map((widget) => {
            const definition = definitions.get(widget.id);
            if (!definition) return null;
            const content = workspaceContent.has(widget.id)
              ? workspaceContent.get(widget.id)
              : widgetRegistry[widget.id]?.(props);
            if (content === undefined) return null;
            return <WidgetCard key={widget.id} widget={widget} definition={definition} content={content} onResizeStart={onResizeStart} />;
          })}
        </div>
      </DndContext>
    </div>
  );
}

export default function DashboardBuilder(props: DashboardBuilderProps) {
  return (
    <WorkspaceDashboard
      projectId={props.projectId}
      renderWidgets={(workspaceWidgets) => <DashboardGrid {...props} workspaceWidgets={workspaceWidgets} />}
    />
  );
}
