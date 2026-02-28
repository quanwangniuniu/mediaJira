import React from 'react';
import { OutlineItem } from '@/hooks/useOutline';

interface OutlineSidebarProps {
  variant: 'pills' | 'list';
  items: OutlineItem[];
  activeId: string | null;
  hoveredId?: string | null;
  setHoveredId?: (id: string | null) => void;
  onItemClick: (id: string) => void;
}

/** Notion-style micro-map: H1=24px, H2=16px, H3=8px, right-aligned */
const THUMB_WIDTH = { 1: 24, 2: 16, 3: 8 } as const;

export default function OutlineSidebar({
  variant,
  items,
  activeId,
  hoveredId = null,
  setHoveredId,
  onItemClick,
}: OutlineSidebarProps) {
  if (variant === 'pills') {
    return (
      <div
        className="flex flex-col items-end justify-center flex-1 min-h-0 py-3"
        style={{ gap: 8, padding: 3 }}
      >
        {(items.length ? items : Array(8).fill(null)).map((item, i) => {
          const level = (item ? item.level : ([1, 2, 3, 1, 2, 3, 1, 2] as const)[i % 8]) as 1 | 2 | 3;
          const wid = THUMB_WIDTH[level];
          const isActive = item && activeId === item.id;
          const isHovered = item && hoveredId === item.id && !isActive;
          const pillColor = isActive ? '#2383E2' : isHovered ? '#9ca3af' : '#d1d5db';
          return (
            <button
              key={item?.id ?? i}
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 m-0 rounded-full"
              style={{
                width: wid,
                height: 3,
                background: pillColor,
              }}
              onClick={() => item && onItemClick(item.id)}
              onMouseEnter={() => item && setHoveredId?.(item.id)}
              onMouseLeave={() => setHoveredId?.(null)}
              aria-label={item ? item.label || 'Outline item' : undefined}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 py-3">
      {items.length === 0 ? (
        <div
          style={{
            padding: '12px 20px',
            fontSize: 12,
            color: '#9ca3af',
            fontStyle: 'italic',
          }}
        >
          Add headings to see outline
        </div>
      ) : (
        items.map((item) => {
          const isActive = activeId === item.id;
          const isHovered = hoveredId === item.id && !isActive;
          const bgStyle = isActive ? 'rgba(239, 246, 255, 0.5)' : isHovered ? '#f3f4f6' : 'transparent';
          const barColor = isActive ? '#3b82f6' : 'transparent';
          const fontWeight = isActive ? 600 : 400;
          const textColor = isActive ? '#111' : '#6b7280';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item.id)}
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
                transition: 'background 0.1s, border-color 0.1s',
              }}
              onMouseEnter={() => setHoveredId?.(item.id)}
              onMouseLeave={() => setHoveredId?.(null)}
            >
              <div
                style={{
                  width: 3,
                  alignSelf: 'stretch',
                  flexShrink: 0,
                  background: barColor,
                  borderRadius: '0 2px 2px 0',
                  marginRight: 0,
                  transition: 'background 0.15s',
                }}
              />
              <span
                style={{
                  paddingLeft: item.level === 1 ? 17 : item.level === 2 ? 29 : 41,
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
                {item.label || 'Untitled heading'}
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
