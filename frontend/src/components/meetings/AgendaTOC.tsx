'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
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
  OUTLINE_MAX_PILLS,
  PILL_ACTIVE,
  PILL_BG,
  PILL_HOVER,
  PILL_PLACEHOLDER_BG,
  PILL_TRANSITION,
  PILL_WIDTH_BY_LEVEL,
} from '@/components/notion/OutlineSidebar';
import { cn } from '@/lib/utils';

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

/** Delay before showing pills strip after hovering Agenda block */
const AGENDA_STRIP_SHOW_MS = 150;
/** Delay before hiding pills strip after leaving Agenda block */
const AGENDA_STRIP_HIDE_MS = 300;
/** Delay before showing TOC card after hovering pills */
const TOC_CARD_SHOW_MS = 80;
/** Delay before hiding TOC card after leaving pills/card */
const TOC_CARD_HIDE_MS = 200;

/** Top margin for scroll-spy active section detection */
const SCROLL_SPY_TOP_MARGIN = 128;

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
 * Each pill represents an outline entry (section or item).
 * Active section is highlighted, hover state shows intermediate color.
 */
function AgendaOutlinePills({
  entries,
  activeSectionId,
  hoveredId,
  setHoveredId,
  onEntryClick,
}: {
  entries: AgendaOutlineEntry[];
  activeSectionId: string | null;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  onEntryClick: (entry: AgendaOutlineEntry) => void;
}) {
  // Only show pills for actual entries, up to OUTLINE_MAX_PILLS
  const pillsSlice = entries.slice(0, OUTLINE_MAX_PILLS);
  const placeholderCount = Math.max(0, OUTLINE_MAX_PILLS - pillsSlice.length);

  return (
    <div className="flex h-[min(50vh,320px)] w-full flex-col items-end justify-between py-2">
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
            onClick={() => onEntryClick(entry)}
            onMouseEnter={() => setHoveredId(entry.id)}
            onMouseLeave={() => setHoveredId(null)}
            aria-label={entry.label}
          />
        );
      })}
      {/* Placeholder pills for visual consistency */}
      {Array.from({ length: placeholderCount }, (_, i) => (
        <span
          key={`placeholder-${i}`}
          className="m-0 h-[3px] shrink-0 rounded-full"
          style={{
            width: 10,
            background: PILL_PLACEHOLDER_BG,
          }}
          aria-hidden
        />
      ))}
    </div>
  );
}

/**
 * Row in the TOC list card.
 * Displays section/item label with active indicator bar.
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
 * Includes drag handle for reordering sections via TOC.
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
  stripArmed: boolean;
};

/**
 * The outline rail component that appears on the right side of the Agenda block.
 * Shows pills on hover, expands to full TOC list on pill hover.
 */
function AgendaOutlineRail({ sections, meetingId, onSectionReorder, stripArmed }: AgendaOutlineRailProps) {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [hoveredPillId, setHoveredPillId] = useState<string | null>(null);
  const [hoveredListId, setHoveredListId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const tocShowTimerRef = useRef<number | null>(null);
  const tocHideTimerRef = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

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

  // Isolated DndContext sensors with distance constraint to prevent conflict with main workspace
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sectionIds = useMemo(() => sections.map((s) => tocOutlineSectionSortableId(s.id)), [sections]);

  const clearTocShowTimer = useCallback(() => {
    if (tocShowTimerRef.current != null) {
      window.clearTimeout(tocShowTimerRef.current);
      tocShowTimerRef.current = null;
    }
  }, []);

  const clearTocHideTimer = useCallback(() => {
    if (tocHideTimerRef.current != null) {
      window.clearTimeout(tocHideTimerRef.current);
      tocHideTimerRef.current = null;
    }
  }, []);

  const openToc = useCallback(() => {
    clearTocHideTimer();
    clearTocShowTimer();
    setTocOpen(true);
  }, [clearTocHideTimer, clearTocShowTimer]);

  const scheduleOpenToc = useCallback(() => {
    clearTocHideTimer();
    clearTocShowTimer();
    tocShowTimerRef.current = window.setTimeout(() => {
      tocShowTimerRef.current = null;
      setTocOpen(true);
    }, TOC_CARD_SHOW_MS);
  }, [clearTocHideTimer, clearTocShowTimer]);

  const scheduleCloseToc = useCallback(() => {
    clearTocShowTimer();
    clearTocHideTimer();
    tocHideTimerRef.current = window.setTimeout(() => {
      tocHideTimerRef.current = null;
      setTocOpen(false);
    }, TOC_CARD_HIDE_MS);
  }, [clearTocShowTimer, clearTocHideTimer]);

  useEffect(() => {
    if (!stripArmed) {
      clearTocShowTimer();
      clearTocHideTimer();
      setTocOpen(false);
    }
  }, [stripArmed, clearTocShowTimer, clearTocHideTimer]);

  useEffect(
    () => () => {
      clearTocShowTimer();
      clearTocHideTimer();
    },
    [clearTocShowTimer, clearTocHideTimer],
  );

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

  const onTriggerEnter = useCallback(() => {
    if (!stripArmed) return;
    scheduleOpenToc();
  }, [stripArmed, scheduleOpenToc]);

  const onTriggerLeave = useCallback(() => {
    scheduleCloseToc();
  }, [scheduleCloseToc]);

  if (sections.length === 0) return null;

  return (
    <aside
      ref={railRef}
      className={cn(
        'absolute right-0 top-0 bottom-0 w-5 overflow-visible',
        'transition-opacity duration-200 ease-out',
        stripArmed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
      onMouseEnter={onTriggerEnter}
      onMouseLeave={onTriggerLeave}
    >
      {/* Sticky container for pills and TOC card - stays centered in viewport */}
      <div
        className="sticky z-30 w-full overflow-visible"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
      >
        <div
          tabIndex={stripArmed ? 0 : -1}
          role="button"
          aria-label="Agenda outline"
          aria-expanded={tocOpen}
          aria-haspopup="true"
          onKeyDown={(e) => {
            if (!stripArmed) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openToc();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              (e.target as HTMLElement).blur();
              scheduleCloseToc();
            }
          }}
          onFocus={() => stripArmed && openToc()}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              scheduleCloseToc();
            }
          }}
          className={cn(
            'relative flex w-full flex-col outline-none',
            'focus-visible:ring-2 focus-visible:ring-slate-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          )}
        >
          {/* Pills rail — Notion-style outline indicator */}
          <div
            className={cn(
              'flex w-full flex-col items-end pr-1 transition-transform duration-200 ease-out',
              tocOpen && '-translate-x-0.5',
            )}
          >
            <AgendaOutlinePills
              entries={outlineEntries}
              activeSectionId={activeSectionId}
              hoveredId={hoveredPillId}
              setHoveredId={setHoveredPillId}
              onEntryClick={scrollToTarget}
            />
          </div>

          {/* TOC List card — appears on pill hover */}
          <div
            className="absolute right-full top-1/2 z-40 mr-2 w-56 max-w-[calc(100vw-2rem)]"
            style={{
              transform: tocOpen ? 'translate(0, -50%)' : 'translate(12px, -50%)',
              opacity: tocOpen ? 1 : 0,
              pointerEvents: tocOpen ? 'auto' : 'none',
              transition: CARD_SHELL_TRANSITION,
            }}
            onMouseEnter={() => stripArmed && openToc()}
            onMouseLeave={onTriggerLeave}
          >
            <div
              className="max-h-[min(480px,calc(100vh-8rem))] overflow-y-auto overscroll-contain rounded-lg border border-slate-200/80 bg-white py-1 shadow-lg"
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
          </div>
        </div>
      </div>
    </aside>
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
 * Handles hover detection for the entire Agenda area to arm/disarm the pills strip.
 */
export function AgendaBlockWithOutlineRail({
  children,
  sections,
  meetingId,
  onSectionReorder,
}: AgendaBlockWithOutlineRailProps) {
  const [stripArmed, setStripArmed] = useState(false);
  const agendaShowTimerRef = useRef<number | null>(null);
  const agendaHideTimerRef = useRef<number | null>(null);

  const clearAgendaShowTimer = useCallback(() => {
    if (agendaShowTimerRef.current != null) {
      window.clearTimeout(agendaShowTimerRef.current);
      agendaShowTimerRef.current = null;
    }
  }, []);

  const clearAgendaHideTimer = useCallback(() => {
    if (agendaHideTimerRef.current != null) {
      window.clearTimeout(agendaHideTimerRef.current);
      agendaHideTimerRef.current = null;
    }
  }, []);

  const onAgendaEnter = useCallback(() => {
    clearAgendaHideTimer();
    if (stripArmed) return;
    if (agendaShowTimerRef.current != null) return;
    agendaShowTimerRef.current = window.setTimeout(() => {
      agendaShowTimerRef.current = null;
      setStripArmed(true);
    }, AGENDA_STRIP_SHOW_MS);
  }, [clearAgendaHideTimer, stripArmed]);

  const onAgendaLeave = useCallback(() => {
    clearAgendaShowTimer();
    clearAgendaHideTimer();
    agendaHideTimerRef.current = window.setTimeout(() => {
      agendaHideTimerRef.current = null;
      setStripArmed(false);
    }, AGENDA_STRIP_HIDE_MS);
  }, [clearAgendaShowTimer, clearAgendaHideTimer]);

  useEffect(
    () => () => {
      clearAgendaShowTimer();
      clearAgendaHideTimer();
    },
    [clearAgendaShowTimer, clearAgendaHideTimer],
  );

  if (sections.length === 0) {
    return <div className="min-w-0 flex-1 overflow-visible">{children}</div>;
  }

  return (
    <div
      className="group/agenda relative min-w-0 overflow-visible pr-6"
      onMouseEnter={onAgendaEnter}
      onMouseLeave={onAgendaLeave}
    >
      <div className="min-w-0 flex-1 overflow-visible">{children}</div>
      <AgendaOutlineRail
        sections={sections}
        meetingId={meetingId}
        onSectionReorder={onSectionReorder}
        stripArmed={stripArmed}
      />
    </div>
  );
}
