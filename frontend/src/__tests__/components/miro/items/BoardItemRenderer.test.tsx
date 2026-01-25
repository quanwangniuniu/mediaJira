import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardItemRenderer from '@/components/miro/items/BoardItemRenderer';
import { createMockBoardItem } from '../__mocks__/miroApi';

const defaultProps = {
  item: createMockBoardItem(),
  isSelected: false,
  onSelect: jest.fn(),
  onUpdate: jest.fn(),
};

describe('BoardItemRenderer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Type Routing', () => {
    test('renders TextItem for text type', () => {
      const item = createMockBoardItem({ type: 'text' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    test('renders ShapeItem for shape type', () => {
      const item = createMockBoardItem({ type: 'shape' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      // ShapeItem renders content
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    test('renders StickyNoteItem for sticky_note type', () => {
      const item = createMockBoardItem({ type: 'sticky_note' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    test('renders FrameItem for frame type', () => {
      const item = createMockBoardItem({ type: 'frame' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      // FrameItem should render
      const { container } = render(<BoardItemRenderer {...defaultProps} item={item} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders LineItem for line type', () => {
      const item = createMockBoardItem({ type: 'line' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      const { container } = render(<BoardItemRenderer {...defaultProps} item={item} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders ConnectorItem for connector type', () => {
      const item = createMockBoardItem({ type: 'connector' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      const { container } = render(<BoardItemRenderer {...defaultProps} item={item} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders FreehandItem for freehand type', () => {
      const item = createMockBoardItem({ type: 'freehand' });
      render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      const { container } = render(<BoardItemRenderer {...defaultProps} item={item} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    test('renders default fallback for unknown type', () => {
      const item = createMockBoardItem({ type: 'unknown' as any });
      const { container } = render(<BoardItemRenderer {...defaultProps} item={item} />);
      
      const fallback = container.querySelector('.border.border-gray-300');
      expect(fallback).toBeInTheDocument();
    });
  });
});

