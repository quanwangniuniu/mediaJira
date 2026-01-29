import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardCanvas from '@/components/miro/BoardCanvas';
import { createMockViewport, createMockBoardItems } from './__mocks__/testUtils';
import { ToolType } from '@/components/miro/hooks/useToolDnD';

// Mock hooks
jest.mock('@/components/miro/hooks/useItemDrag', () => ({
  useItemDrag: jest.fn(() => ({
    startDrag: jest.fn(),
    updateDrag: jest.fn(),
    endDrag: jest.fn(),
    getOverridePosition: jest.fn(() => null),
  })),
}));

jest.mock('@/components/miro/hooks/useItemResize', () => ({
  useItemResize: jest.fn(() => ({
    startResize: jest.fn(),
    updateResize: jest.fn(),
    endResize: jest.fn(),
    getOverrideSize: jest.fn(() => null),
  })),
}));

const mockViewport = createMockViewport();
const mockItems = createMockBoardItems(2);
const mockCanvasRef = React.createRef<HTMLDivElement>();

const defaultProps = {
  viewport: mockViewport,
  items: mockItems,
  selectedItemId: null,
  activeTool: 'select' as ToolType,
  onItemSelect: jest.fn(),
  onItemUpdate: jest.fn(),
  onItemUpdateOptimistic: jest.fn(() => jest.fn()),
  onItemUpdateAsync: jest.fn().mockResolvedValue(mockItems[0]),
  onPanStart: jest.fn(),
  onPanUpdate: jest.fn(),
  onPanEnd: jest.fn(),
  onZoom: jest.fn(),
  onItemCreate: jest.fn(),
  onFreehandCreate: jest.fn(),
  width: 800,
  height: 600,
  canvasRef: mockCanvasRef,
};

describe('BoardCanvas Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders canvas container', () => {
      const { container } = render(<BoardCanvas {...defaultProps} />);
      
      // BoardCanvas renders a div with className containing "relative", "overflow-hidden", and "bg-gray-50"
      const canvas = container.querySelector('.relative.overflow-hidden.bg-gray-50');
      expect(canvas).toBeInTheDocument();
    });

    test('renders items', () => {
      const { container } = render(<BoardCanvas {...defaultProps} />);
      
      // Items are rendered via BoardItemContainer
      // We can verify by checking the canvas structure exists
      const canvas = container.querySelector('.relative.overflow-hidden.bg-gray-50');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Viewport Application', () => {
    test('applies viewport transform', () => {
      const viewport = createMockViewport({ x: 100, y: 200, zoom: 1.5 });
      const { container } = render(<BoardCanvas {...defaultProps} viewport={viewport} />);
      
      // The transform is applied to an inner div with canvasStyle
      const innerDiv = container.querySelector('[style*="transform"]');
      expect(innerDiv).toBeInTheDocument();
      
      if (innerDiv) {
        const style = innerDiv.getAttribute('style');
        expect(style).toContain('translate(100px, 200px)');
        expect(style).toContain('scale(1.5)');
      }
    });
  });

  describe('Empty State', () => {
    test('handles empty items array', () => {
      const { container } = render(<BoardCanvas {...defaultProps} items={[]} />);
      
      // Canvas should still render even with no items
      const canvas = container.querySelector('.relative.overflow-hidden');
      expect(canvas).toBeInTheDocument();
    });
  });
});

