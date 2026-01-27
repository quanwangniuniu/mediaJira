import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ProjectData } from '@/lib/api/projectApi';
import { BoardItem } from '@/lib/api/miroApi';
import { Viewport } from '@/components/miro/hooks/useBoardViewport';

// Mock project data generator
export const createMockProjects = (count: number = 2): ProjectData[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Project ${i + 1}`,
  }));
};

// Mock viewport generator
export const createMockViewport = (overrides?: Partial<Viewport>): Viewport => ({
  x: 0,
  y: 0,
  zoom: 1,
  ...overrides,
});

// Mock board items generator
export const createMockBoardItems = (count: number = 3): BoardItem[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i + 1}`,
    board_id: 'board-1',
    type: 'text' as const,
    x: i * 100,
    y: i * 100,
    width: 200,
    height: 50,
    rotation: 0,
    style: {},
    content: `Item ${i + 1}`,
    z_index: i + 1,
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }));
};

// Custom render function with providers if needed
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

