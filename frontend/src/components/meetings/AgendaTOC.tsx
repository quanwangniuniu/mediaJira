'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { createPortal, flushSync } from 'react-dom';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import type { NestedAgendaTemplateSection } from '@/lib/meetings/meetingTemplates';
import {
  PILL_ACTIVE,
  PILL_BG,
  PILL_HOVER,
  PILL_TRANSITION,
  PILL_WIDTH_BY_LEVEL,
} from '@/components/notion/OutlineSidebar';
import { cn } from '@/lib/utils';

class NoDndPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: React.PointerEvent<Element>) => {
        const target = nativeEvent.target as HTMLElement | null;
        if (!target) return true;
        return !target.closest('[data-no-dnd="true"]');
      },
    },
  ];
}

export function meetingAgendaSectionDomId(sectionId: string): string {
  return `meeting-agenda-section-${sectionId}`;
}

export function meetingAgendaItemDomId(sectionId: string, itemId: string): string {
  return `meeting-agenda-item-${sectionId}-${itemId}`;
}

/**
 * TOC outline rail uses its own sortable id namespace so ids never collide with the main
 * workspace DndContext (`section:…` / `item:…`).
 */
const OUTLINE_SECTION_SORTABLE_PREFIX = 'outline-section:' as const;

export function tocOutlineSectionSortableId(sectionId: string): string {
  return `${OUTLINE_SECTION_SORTABLE_PREFIX}${sectionId}`;
}

function outlineToMainSectionSortableId(id: string): string {
  if (id.startsWith(OUTLINE_SECTION_SORTABLE_PREFIX)) {
    return `section:${id.slice(OUTLINE_SECTION_SORTABLE_PREFIX.length)}`;
  }
  return id;
}

/** Top margin for scroll-spy active section detection */
const SCROLL_SPY_TOP_MARGIN = 128;

/** Height of the pills container */
const PILLS_CONTAINER_HEIGHT = 200;
/** Height of the TOC card (approximate max) */
const TOC_CARD_HEIGHT = 360;
/** Padding from block edges */
const EDGE_PADDING = 24;

const LIST_TRANSITION = 'background 160ms cubic-bezier(0.4, 0, 0.2, 1), border-color 160ms cubic-bezier(0.4, 0, 0.2, 1)';
const BAR_TRANSITION = 'background 160ms cubic-bezier(0.4, 0, 0.2, 1)';
const CARD_SHELL_TRANSITION =
  'opacity 180ms cubic-bezier(0.4, 0, 0.2, 1), transform 180ms cubic-bezier(0.4, 0, 0.2, 1)';

export type AgendaOutlineEntry = {
  id: string;
  level: 1 | 2 | 3;
  label: string;
  scrollTarget:
    | { type: 'section'; sectionId: string }
    | { type: 'item'; sectionId: string; itemId: string };
};

export function buildAgendaOutlineEntries(sections: NestedAgendaTemplateSection[]): AgendaOutlineEntry[] {
  const out: AgendaOutlineEntry[] = [];
  for (const s of sections) {
    out.push({
      id: s.id,
      level: 1,
      label: s.title || 'Section',
      scrollTarget: { type: 'section', sectionId: s.id },
    });
    for (const it of s.items) {
      out.push({
        id: `${s.id}::${it.id}`,
        level: 2,
        label: (it.text || 'Item').trim() || 'Item',
        scrollTarget: { type: 'item', sectionId: s.id, itemId: it.id },
      });
    }
  }
  return out;
}

/**
 * Notion-style pills column.
 * Shows a compact vertical line of pills representing outline entries.
 */
function AgendaOutlinePills({
  entries,
  activeSectionId,
  hoveredId,
  setHoveredId,
  onEntryClick,
  onAnyPillClick,
}: {
  entries: AgendaOutlineEntry[];
  activeSectionId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onEntryClick: (entry: AgendaOutlineEntry) => void;
  onAnyPillClick?: () => void;
}) {
  // Limit pills to a reasonable number for compact display
  const maxPills = Math.min(entries.length, 15);
  const pillsSlice = entries.slice(0, maxPills);

  return (
    <div
      className="flex flex-col items-end justify-between gap-1 py-2"
      style={{ height: PILLS_CONTAINER_HEIGHT }}
    >
      {pillsSlice.map((entry) => {
        const level = entry.level;
        const isActive =
          entry.scrollTarget.type === 'section'
            ? activeSectionId === entry.scrollTarget.sectionId
            : activeSectionId === entry.scrollTarget.sectionId;
        const isHovered = hoveredId === entry.id && !isActive;
        const pillColor = isActive ? PILL_ACTIVE : isHovered ? PILL_HOVER : PILL_BG;
        const w = PILL_WIDTH_BY_LEVEL[level as 1 | 2 | 3] ?? PILL_WIDTH_BY_LEVEL[1];
        return (
          <button
            key={entry.id}
            type="button"
            className="m-0 h-[3px] shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0"
            style={{
              width: w,
              background: pillColor,
              transition: PILL_TRANSITION,
            }}
            onClick={() => {
              onAnyPillClick?.();
              onEntryClick(entry);
            }}
            onMouseEnter={() => setHoveredId(entry.id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-label={entry.label}
          />
        );
      })}
    </div>
  );
}

/**
 * Row in the TOC list card.
 */
function AgendaListStyleRow({
  label,
  level,
  isActive,
  isHovered,
  onClick,
  onMouseEnter,
  onMouseLeave,
  prefix,
}: {
  label: string;
  level: 1 | 2 | 3;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  prefix?: ReactNode;
}) {
  const bgStyle = isActive ? 'rgba(239, 246, 255, 0.5)' : isHovered ? '#f3f4f6' : 'transparent';
  const barColor = isActive ? '#3b82f6' : 'transparent';
  const fontWeight = isActive ? 600 : 400;
  const textColor = isActive ? '#111' : '#6b7280';
  const paddingLeft = level === 1 ? 17 : level === 2 ? 29 : 41;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: 32,
        padding: '0 12px 0 0',
        paddingLeft: 0,
        margin: 0,
        border: 'none',
        borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
        background: bgStyle,
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 0,
        transition: LIST_TRANSITION,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {prefix ? <span className="flex shrink-0 items-center pl-1">{prefix}</span> : null}
      <div
        style={{
          width: 3,
          alignSelf: 'stretch',
          flexShrink: 0,
          background: barColor,
          borderRadius: '0 2px 2px 0',
          marginRight: 0,
          transition: BAR_TRANSITION,
        }}
      />
      <span
        style={{
          paddingLeft,
          paddingRight: 20,
          fontSize: 13,
          lineHeight: '1.4',
          fontWeight,
          color: textColor,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
          minWidth: 0,
        }}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * Sortable section group in the TOC list.
 */
function SortableSectionGroup({
  section,
  index,
  outlineEntriesForSection,
  activeSectionId,
  hoveredListId,
  setHoveredListId,
  onNavigateSection,
  onNavigateItem,
  isDragging,
}: {
  section: NestedAgendaTemplateSection;
  index: number;
  outlineEntriesForSection: AgendaOutlineEntry[];
  activeSectionId: string | null;
  hoveredListId: string | null;
  setHoveredListId: (id: string | null) => void;
  onNavigateSection: (sectionId: string) => void;
  onNavigateItem: (sectionId: string, itemId: string) => void;
  isDragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: tocOutlineSectionSortableId(section.id),
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const sectionActive = activeSectionId === section.id;
  const sectionHover = hoveredListId === `list-section:${section.id}` && !sectionActive;

  const grip = (
    <button
      type="button"
      className="relative z-10 cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-200/80 active:cursor-grabbing"
      aria-label={`Drag to reorder: ${section.title}`}
      {...(attributes as HTMLAttributes<HTMLButtonElement>)}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('flex flex-col', isDragging && 'opacity-60')}
    >
      <AgendaListStyleRow
        label={`${index + 1}. ${section.title}`}
        level={1}
        isActive={sectionActive}
        isHovered={sectionHover}
        onClick={() => onNavigateSection(section.id)}
        onMouseEnter={() => setHoveredListId(`list-section:${section.id}`)}
        onMouseLeave={() => setHoveredListId(null)}
        prefix={grip}
      />
      {outlineEntriesForSection.map((entry) => {
        if (entry.scrollTarget.type !== 'item') return null;
        const target = entry.scrollTarget;
        const hid = `list-item:${entry.id}`;
        const hov = hoveredListId === hid;
        return (
          <AgendaListStyleRow
            key={entry.id}
            label={entry.label}
            level={2}
            isActive={false}
            isHovered={hov}
            onClick={() => onNavigateItem(target.sectionId, target.itemId)}
            onMouseEnter={() => setHoveredListId(hid)}
            onMouseLeave={() => setHoveredListId(null)}
          />
        );
      })}
    </div>
  );
}

export type AgendaOutlineRailProps = {
  sections: NestedAgendaTemplateSection[];
  meetingId: number;
  onSectionReorder: (activeSortableId: string, overSortableId: string) => void;
  refreshContainerRect: () => void;
  /** Mouse Y position relative to the Agenda block */
  mouseY: number;
  /** Height of the Agenda block */
  blockHeight: number;
  /** Whether the trigger area is being hovered */
  isHovering: boolean;
  /** Container rect for portal positioning */
  containerRect: DOMRect | null;
};

/**
 * The outline rail component that appears on the right side of the Agenda block.
 * Pills and TOC card follow the mouse position. Card opens on click.
 */
function AgendaOutlineRail({
  sections,
  meetingId,
  onSectionReorder,
  refreshContainerRect,
  mouseY,
  blockHeight,
  isHovering,
  containerRect,
}: AgendaOutlineRailProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [hoveredPillId, setHoveredPillId] = useState<string | null>(null);
  const [hoveredListId, setHoveredListId] = useState<string | null>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Refs for click-outside detection
  const pillsContainerRef = useRef<HTMLDivElement>(null);
  const tocCardRef = useRef<HTMLDivElement>(null);

  const outlineEntries = useMemo(() => buildAgendaOutlineEntries(sections), [sections]);

  const entriesBySection = useMemo(() => {
    const map = new Map<string, AgendaOutlineEntry[]>();
    for (const s of sections) {
      map.set(
        s.id,
        outlineEntries.filter((e) => e.scrollTarget.type === 'item' && e.scrollTarget.sectionId === s.id),
      );
    }
    return map;
  }, [sections, outlineEntries]);

  // Calculate pills position - follow mouse Y with boundary clamping
  const pillsOffsetY = useMemo(() => {
    const halfPillsHeight = PILLS_CONTAINER_HEIGHT / 2;
    const minY = EDGE_PADDING;
    const maxY = blockHeight - PILLS_CONTAINER_HEIGHT - EDGE_PADDING;
    // Center pills around mouse position
    const targetY = mouseY - halfPillsHeight;
    return Math.max(minY, Math.min(targetY, maxY));
  }, [mouseY, blockHeight]);

  // Calculate TOC card position - follow mouse Y with boundary clamping
  const tocOffsetY = useMemo(() => {
    const halfTocHeight = TOC_CARD_HEIGHT / 2;
    const minY = EDGE_PADDING;
    const maxY = Math.max(minY, blockHeight - TOC_CARD_HEIGHT - EDGE_PADDING);
    // Center TOC around mouse position
    const targetY = mouseY - halfTocHeight;
    return Math.max(minY, Math.min(targetY, maxY));
  }, [mouseY, blockHeight]);

  // Isolated DndContext sensors
  const sensors = useSensors(
    useSensor(NoDndPointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sectionIds = useMemo(() => sections.map((s) => tocOutlineSectionSortableId(s.id)), [sections]);

  // Toggle card open/close on pills click
  const handlePillsPointerDownCapture = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      flushSync(() => {
        refreshContainerRect();
      });
      setIsCardOpen((prev) => !prev);
    },
    [refreshContainerRect],
  );

  // Close card when clicking outside
  useEffect(() => {
    if (!isCardOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check if click is outside both pills and TOC card
      const isOutsidePills = pillsContainerRef.current && !pillsContainerRef.current.contains(target);
      const isOutsideCard = tocCardRef.current && !tocCardRef.current.contains(target);

      if (isOutsidePills && isOutsideCard) {
        setIsCardOpen(false);
      }
    };

    // Use capture phase to handle clicks before other handlers
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isCardOpen]);

  const scrollToTarget = useCallback((entry: AgendaOutlineEntry) => {
    if (entry.scrollTarget.type === 'section') {
      document.getElementById(meetingAgendaSectionDomId(entry.scrollTarget.sectionId))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
      return;
    }
    document
      .getElementById(
        meetingAgendaItemDomId(entry.scrollTarget.sectionId, entry.scrollTarget.itemId),
      )
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Scroll spy: detect which section is currently in view
  const updateActiveFromScroll = useCallback(() => {
    if (sections.length === 0) {
      setActiveSectionId(null);
      return;
    }
    for (let i = sections.length - 1; i >= 0; i--) {
      const el = document.getElementById(meetingAgendaSectionDomId(sections[i].id));
      if (!el) continue;
      const top = el.getBoundingClientRect().top;
      if (top <= SCROLL_SPY_TOP_MARGIN) {
        setActiveSectionId(sections[i].id);
        return;
      }
    }
    setActiveSectionId(sections[0].id);
  }, [sections]);

  useEffect(() => {
    let frame: number | null = null;
    const onScrollOrResize = () => {
      if (frame != null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateActiveFromScroll();
      });
    };
    updateActiveFromScroll();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (frame != null) window.cancelAnimationFrame(frame);
    };
  }, [updateActiveFromScroll]);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const active = outlineToMainSectionSortableId(String(event.active.id ?? ''));
    const over = outlineToMainSectionSortableId(String(event.over?.id ?? ''));
    if (!active || !over || active === over) return;
    if (active.startsWith('section:') && over.startsWith('section:')) {
      onSectionReorder(active, over);
    }
  };

  if (sections.length === 0) return null;

  return (
    <>
      {/* Pills indicator - follows mouse Y position, positioned near trigger area */}
      <div
        ref={pillsContainerRef}
        data-no-dnd="true"
        className={cn(
          'absolute z-[100] w-10 cursor-pointer pointer-events-auto transition-all duration-150 ease-out active:scale-95',
          isHovering || isCardOpen ? 'opacity-100' : 'opacity-60',
        )}
        style={{
          top: pillsOffsetY,
          right: '-32px', // Keep clickable zone aligned with trigger strip
          transition: 'top 120ms ease-out, opacity 150ms ease-out',
        }}
        onPointerDownCapture={handlePillsPointerDownCapture}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            setIsCardOpen((prev) => !prev);
          }
        }}
        aria-expanded={isCardOpen}
        aria-label="Toggle agenda table of contents"
      >
        <div
          className={cn(
            'flex w-full flex-col items-end pr-1 transition-transform duration-150 ease-out',
            isCardOpen && '-translate-x-1',
          )}
        >
          <AgendaOutlinePills
            entries={outlineEntries}
            activeSectionId={activeSectionId}
            hoveredId={hoveredPillId}
            setHoveredId={setHoveredPillId}
            onAnyPillClick={() => setIsCardOpen(true)}
            onEntryClick={scrollToTarget}
          />
        </div>
      </div>

      {/* TOC List card - rendered via Portal with fixed positioning */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tocCardRef}
            className={cn(
              'fixed z-[9999] w-56',
              'transition-all duration-150 ease-out',
            )}
            style={{
              // Position card to the left of the pills, using viewport coordinates
              top: containerRect ? containerRect.top + tocOffsetY : 0,
              left: containerRect ? containerRect.right - 240 : 0, // 240 = card width (224px) + gap
              opacity: isCardOpen ? 1 : 0,
              transform: isCardOpen ? 'translateX(0)' : 'translateX(8px)',
              pointerEvents: isCardOpen ? 'auto' : 'none',
              transition: CARD_SHELL_TRANSITION,
            }}
          >
            <div
              className={cn(
                'rounded-lg border border-slate-200/80 bg-white py-1 shadow-lg',
                // Hide scrollbar but keep scrollable
                'max-h-[360px] overflow-y-auto',
                '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
              )}
              style={{ boxShadow: '0 4px 24px rgba(15, 23, 42, 0.08)' }}
            >
              <nav aria-label="Agenda sections">
                <DndContext
                  id={`meeting-${meetingId}-agenda-outline-rail-dnd`}
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={(e) => setActiveDragId(String(e.active.id))}
                  onDragEnd={handleDragEnd}
                  onDragCancel={() => setActiveDragId(null)}
                >
                  <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                    {sections.map((section, index) => (
                      <SortableSectionGroup
                        key={section.id}
                        section={section}
                        index={index}
                        outlineEntriesForSection={entriesBySection.get(section.id) ?? []}
                        activeSectionId={activeSectionId}
                        hoveredListId={hoveredListId}
                        setHoveredListId={setHoveredListId}
                        onNavigateSection={(id) =>
                          document.getElementById(meetingAgendaSectionDomId(id))?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                          })
                        }
                        onNavigateItem={(sectionId, itemId) =>
                          document
                            .getElementById(meetingAgendaItemDomId(sectionId, itemId))
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                        isDragging={activeDragId === tocOutlineSectionSortableId(section.id)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

export type AgendaBlockWithOutlineRailProps = {
  children: ReactNode;
  sections: NestedAgendaTemplateSection[];
  meetingId: number;
  onSectionReorder: (activeSortableId: string, overSortableId: string) => void;
};

/**
 * Wrapper component that adds the outline rail to the Agenda block.
 * Tracks mouse position for the following pills indicator.
 */
export function AgendaBlockWithOutlineRail({
  children,
  sections,
  meetingId,
  onSectionReorder,
}: AgendaBlockWithOutlineRailProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [mouseY, setMouseY] = useState(0);
  const [blockHeight, setBlockHeight] = useState(400);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const refreshContainerRect = useCallback(() => {
    if (!containerRef.current) return;
    setContainerRect(containerRef.current.getBoundingClientRect());
  }, []);

  // Track mouse position within the trigger area and update container rect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    setMouseY(relativeY);
    setContainerRect(rect);
  }, []);

  // Update block height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setBlockHeight(containerRef.current.offsetHeight);
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Also update height when sections change (content might change height)
  useEffect(() => {
    if (containerRef.current) {
      setBlockHeight(containerRef.current.offsetHeight);
      setContainerRect(containerRef.current.getBoundingClientRect());
    }
  }, [sections]);

  if (sections.length === 0) {
    return <div className="min-w-0 flex-1 overflow-visible">{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className="group/agenda relative min-w-0 overflow-visible"
    >
      {/* Main content */}
      <div className="min-w-0 flex-1 overflow-visible">{children}</div>

      {/* Full-height invisible trigger area - extends beyond container to reach SortableBlock edge */}
      <div
        ref={triggerRef}
        className="absolute top-0 bottom-0 w-10 z-20"
        style={{ right: '-32px' }} // Extends past the px-8 padding of SortableBlock
        onMouseEnter={() => {
          setIsHovering(true);
          refreshContainerRect();
        }}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
      />

      {/* Pills and TOC card */}
      <AgendaOutlineRail
        sections={sections}
        meetingId={meetingId}
        onSectionReorder={onSectionReorder}
        refreshContainerRect={refreshContainerRect}
        mouseY={mouseY}
        blockHeight={blockHeight}
        isHovering={isHovering}
        containerRect={containerRect}
      />
    </div>
  );
}
