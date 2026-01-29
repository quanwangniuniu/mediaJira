import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StickyNoteItem from '@/components/miro/items/StickyNoteItem';
import { createMockBoardItem } from '../__mocks__/miroApi';

const defaultProps = {
  item: createMockBoardItem({ type: 'sticky_note', content: 'Note Content' }),
  isSelected: false,
  onSelect: jest.fn(),
  onUpdate: jest.fn(),
};

describe('StickyNoteItem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders sticky note content', () => {
      render(<StickyNoteItem {...defaultProps} />);
      expect(screen.getByText('Note Content')).toBeInTheDocument();
    });

    test('renders default text when content is empty', () => {
      const item = createMockBoardItem({ type: 'sticky_note', content: '' });
      render(<StickyNoteItem {...defaultProps} item={item} />);
      expect(screen.getByText('Sticky Note')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    test('applies default yellow background', () => {
      // Ensure empty content so the component shows its default label
      const item = createMockBoardItem({ type: 'sticky_note', content: '', style: {} });
      render(<StickyNoteItem {...defaultProps} item={item} />);
      
      const container = screen.getByText('Sticky Note').parentElement;
      expect(container).toHaveStyle({
        backgroundColor: 'rgb(254, 240, 138)', // #fef08a
      });
    });

    test('applies custom background color', () => {
      const item = createMockBoardItem({
        type: 'sticky_note',
        content: 'Note Content',
        style: { backgroundColor: '#ff0000' },
      });
      render(<StickyNoteItem {...defaultProps} item={item} />);
      
      const container = screen.getByText('Note Content').parentElement;
      expect(container).toHaveStyle({
        backgroundColor: 'rgb(255, 0, 0)',
      });
    });

    test('applies custom font size', () => {
      const item = createMockBoardItem({
        type: 'sticky_note',
        content: 'Note Content',
        style: { fontSize: 18 },
      });
      render(<StickyNoteItem {...defaultProps} item={item} />);
      
      const textElement = screen.getByText('Note Content');
      expect(textElement).toHaveStyle({
        fontSize: '18px',
      });
    });

    test('applies custom font family', () => {
      const item = createMockBoardItem({
        type: 'sticky_note',
        content: 'Note Content',
        style: { fontFamily: 'Helvetica' },
      });
      render(<StickyNoteItem {...defaultProps} item={item} />);
      
      const textElement = screen.getByText('Note Content');
      expect(textElement).toHaveStyle({
        fontFamily: 'Helvetica',
      });
    });

    test('applies default styles', () => {
      // Ensure empty content so the component shows its default label
      const item = createMockBoardItem({ type: 'sticky_note', content: '', style: {} });
      render(<StickyNoteItem {...defaultProps} item={item} />);
      
      const container = screen.getByText('Sticky Note').parentElement;
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({ borderRadius: '4px' });
      // boxShadow string varies by environment; just assert it’s set and contains rgba()
      expect((container as HTMLElement).style.boxShadow).toContain('rgba');
    });
  });

  describe('Selection State', () => {
    test('shows blue border when selected', () => {
      render(<StickyNoteItem {...defaultProps} isSelected={true} />);
      
      const container = screen.getByText('Note Content').parentElement;
      expect(container).toHaveStyle({
        border: '2px solid #3b82f6',
      });
    });

    test('shows gray border when not selected', () => {
      render(<StickyNoteItem {...defaultProps} isSelected={false} />);
      
      const container = screen.getByText('Note Content').parentElement;
      expect(container).toHaveStyle({
        border: '1px solid #d1d5db',
      });
    });
  });

  describe('Interaction', () => {
    test('calls onSelect when clicked', () => {
      const onSelect = jest.fn();
      render(<StickyNoteItem {...defaultProps} onSelect={onSelect} />);
      
      const container = screen.getByText('Note Content').parentElement;
      fireEvent.click(container!);
      
      expect(onSelect).toHaveBeenCalled();
    });
  });
});

