import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ShapeItem from '@/components/miro/items/ShapeItem';
import { createMockBoardItem } from '../__mocks__/miroApi';

const defaultProps = {
  item: createMockBoardItem({ type: 'shape', content: 'Shape Content' }),
  isSelected: false,
  onSelect: jest.fn(),
  onUpdate: jest.fn(),
};

describe('ShapeItem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders shape content', () => {
      render(<ShapeItem {...defaultProps} />);
      expect(screen.getByText('Shape Content')).toBeInTheDocument();
    });

    test('renders empty content gracefully', () => {
      const item = createMockBoardItem({ type: 'shape', content: '' });
      const { container } = render(<ShapeItem {...defaultProps} item={item} />);

      // When content is empty, there should be no text rendered, but the shape container still exists.
      expect(screen.queryByText('Shape Content')).not.toBeInTheDocument();
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });

  describe('Shape Types', () => {
    test('renders rectangle shape', () => {
      const item = createMockBoardItem({ type: 'shape', content: 'Shape Content', style: { shapeType: 'rect' } });
      render(<ShapeItem {...defaultProps} item={item} />);
      
      const shape = screen.getByText('Shape Content').parentElement;
      expect(shape).toBeInTheDocument();
    });

    test('renders rounded rectangle shape', () => {
      const item = createMockBoardItem({ type: 'shape', content: 'Shape Content', style: { shapeType: 'roundRect' } });
      render(<ShapeItem {...defaultProps} item={item} />);
      
      const shape = screen.getByText('Shape Content').parentElement;
      expect(shape).toHaveStyle({
        borderRadius: '8px',
      });
    });

    test('renders ellipse shape', () => {
      const item = createMockBoardItem({ type: 'shape', content: 'Shape Content', style: { shapeType: 'ellipse' } });
      render(<ShapeItem {...defaultProps} item={item} />);
      
      const shape = screen.getByText('Shape Content').parentElement;
      expect(shape).toHaveStyle({
        borderRadius: '50%',
      });
    });

    test('renders diamond shape', () => {
      const item = createMockBoardItem({ type: 'shape', content: 'Shape Content', style: { shapeType: 'diamond' } });
      const { container } = render(<ShapeItem {...defaultProps} item={item} />);

      // Diamond is implemented via clip-path, not rotation
      const diamond = container.querySelector('div[style*="clip-path"]') as HTMLElement | null;
      expect(diamond).toBeInTheDocument();
      expect(diamond).toHaveStyle({
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      });
    });
  });

  describe('Styling', () => {
    test('applies background color', () => {
      const item = createMockBoardItem({
        type: 'shape',
        content: 'Shape Content',
        style: { backgroundColor: '#ff0000' },
      });
      render(<ShapeItem {...defaultProps} item={item} />);
      
      const shape = screen.getByText('Shape Content').parentElement;
      expect(shape).toHaveStyle({
        backgroundColor: 'rgb(255, 0, 0)',
      });
    });

    test('applies border color and width', () => {
      const item = createMockBoardItem({
        type: 'shape',
        content: 'Shape Content',
        style: { borderColor: '#0000ff', borderWidth: 3 },
      });
      render(<ShapeItem {...defaultProps} item={item} />);
      
      const shape = screen.getByText('Shape Content').parentElement;
      expect(shape).toHaveStyle({
        border: '3px solid #0000ff',
      });
    });

    test('applies default styles', () => {
      const item = createMockBoardItem({ type: 'shape', content: 'Shape Content', style: {} });
      render(<ShapeItem {...defaultProps} item={item} />);
      
      const shape = screen.getByText('Shape Content').parentElement;
      expect(shape).toHaveStyle({
        backgroundColor: 'rgb(255, 255, 255)',
        border: '2px solid #000000',
      });
    });
  });

  describe('Selection State', () => {
    test('shows selection border when selected', () => {
      const { container } = render(<ShapeItem {...defaultProps} isSelected={true} />);

      // Selection border is applied to the outer wrapper
      const outer = container.firstChild as HTMLElement;
      expect(outer).toHaveStyle({
        border: '2px solid #3b82f6',
      });
    });
  });

  describe('Interaction', () => {
    test('calls onSelect when clicked', () => {
      const onSelect = jest.fn();
      render(<ShapeItem {...defaultProps} onSelect={onSelect} />);
      
      const container = screen.getByText('Shape Content').closest('div');
      fireEvent.click(container!);
      
      expect(onSelect).toHaveBeenCalled();
    });
  });
});

