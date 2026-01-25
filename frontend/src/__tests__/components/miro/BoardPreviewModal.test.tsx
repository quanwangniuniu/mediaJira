import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardPreviewModal from '@/components/miro/BoardPreviewModal';
import { createMockBoardItems } from './__mocks__/testUtils';

jest.mock('@/components/miro/hooks/useBoardViewport', () => ({
  useBoardViewport: jest.fn(() => ({
    viewport: { x: 0, y: 0, zoom: 1 },
    setViewport: jest.fn(),
    screenToWorld: jest.fn((x, y) => ({ x, y })),
    zoomAtPoint: jest.fn(),
    startPan: jest.fn(),
    updatePan: jest.fn(),
    endPan: jest.fn(),
  })),
}));

const mockItems = createMockBoardItems(3);

const defaultProps = {
  open: true,
  items: mockItems,
  onClose: jest.fn(),
};

describe('BoardPreviewModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  });

  describe('Basic Rendering', () => {
    test('renders modal when open', () => {
      render(<BoardPreviewModal {...defaultProps} />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    test('does not render when closed', () => {
      render(<BoardPreviewModal {...defaultProps} open={false} />);
      expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    });

    test('renders close button', () => {
      render(<BoardPreviewModal {...defaultProps} />);
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Item Rendering', () => {
    test('renders all items', () => {
      render(<BoardPreviewModal {...defaultProps} />);
      // Items are rendered via BoardItemRenderer, check for item count in footer
      expect(screen.getByText(/Items: 3/)).toBeInTheDocument();
    });

    test('filters out deleted items', () => {
      const itemsWithDeleted = [
        ...mockItems,
        { ...mockItems[0], id: 'deleted-1', is_deleted: true },
      ];
      render(<BoardPreviewModal {...defaultProps} items={itemsWithDeleted} />);
      expect(screen.getByText(/Items: 3/)).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    test('calls onClose when close button clicked', () => {
      const onClose = jest.fn();
      render(<BoardPreviewModal {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    test('calls onClose when backdrop clicked', () => {
      const onClose = jest.fn();
      const { container } = render(<BoardPreviewModal {...defaultProps} onClose={onClose} />);
      
      // Find backdrop by its className
      const backdrop = container.querySelector('.fixed.inset-0.bg-gray-900');
      expect(backdrop).toBeInTheDocument();
      
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    test('calls onClose on Escape key', () => {
      const onClose = jest.fn();
      render(<BoardPreviewModal {...defaultProps} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Viewport Display', () => {
    test('displays zoom percentage', () => {
      render(<BoardPreviewModal {...defaultProps} />);
      expect(screen.getByText(/Zoom: 100%/)).toBeInTheDocument();
    });

    test('displays item count', () => {
      render(<BoardPreviewModal {...defaultProps} />);
      expect(screen.getByText(/Items: 3/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('handles empty items array', () => {
      render(<BoardPreviewModal {...defaultProps} items={[]} />);
      expect(screen.getByText(/Items: 0/)).toBeInTheDocument();
    });
  });
});

