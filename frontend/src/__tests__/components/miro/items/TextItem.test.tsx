import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TextItem from '@/components/miro/items/TextItem';
import { createMockBoardItem } from '../__mocks__/miroApi';

const defaultProps = {
  item: createMockBoardItem({ type: 'text', content: 'Test Text' }),
  isSelected: false,
  onSelect: jest.fn(),
  onUpdate: jest.fn(),
};

describe('TextItem Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders text content', () => {
      render(<TextItem {...defaultProps} />);
      expect(screen.getByText('Test Text')).toBeInTheDocument();
    });

    test('renders default text when content is empty', () => {
      const item = createMockBoardItem({ type: 'text', content: '' });
      render(<TextItem {...defaultProps} item={item} />);
      expect(screen.getByText('Text')).toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    test('shows border when selected', () => {
      render(<TextItem {...defaultProps} isSelected={true} />);
      
      const container = screen.getByText('Test Text').parentElement;
      expect(container).toHaveStyle({
        border: '2px solid #3b82f6',
      });
    });

    test('shows transparent border when not selected', () => {
      render(<TextItem {...defaultProps} isSelected={false} />);
      
      const container = screen.getByText('Test Text').parentElement;
      expect(container).toHaveStyle({
        border: '1px solid transparent',
      });
    });
  });

  describe('Styling', () => {
    test('applies custom font size', () => {
      const item = createMockBoardItem({
        type: 'text',
        content: 'Test Text',
        style: { fontSize: 20 },
      });
      render(<TextItem {...defaultProps} item={item} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveStyle({
        fontSize: '20px',
      });
    });

    test('applies custom font family', () => {
      const item = createMockBoardItem({
        type: 'text',
        content: 'Test Text',
        style: { fontFamily: 'Helvetica' },
      });
      render(<TextItem {...defaultProps} item={item} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveStyle({
        fontFamily: 'Helvetica',
      });
    });

    test('applies custom text color', () => {
      const item = createMockBoardItem({
        type: 'text',
        content: 'Test Text',
        style: { color: '#ff0000' },
      });
      render(<TextItem {...defaultProps} item={item} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveStyle({
        color: 'rgb(255, 0, 0)',
      });
    });

    test('applies default styles when not provided', () => {
      const item = createMockBoardItem({ type: 'text', content: 'Test Text', style: {} });
      render(<TextItem {...defaultProps} item={item} />);
      
      const textElement = screen.getByText('Test Text');
      expect(textElement).toHaveStyle({
        fontSize: '16px',
        color: 'rgb(0, 0, 0)',
        fontFamily: 'Arial',
      });
    });

    test('applies background color', () => {
      const item = createMockBoardItem({
        type: 'text',
        content: 'Test Text',
        style: { backgroundColor: '#f0f0f0' },
      });
      render(<TextItem {...defaultProps} item={item} />);
      
      const container = screen.getByText('Test Text').parentElement;
      expect(container).toHaveStyle({
        backgroundColor: 'rgb(240, 240, 240)',
      });
    });
  });

  describe('Interaction', () => {
    test('calls onSelect when clicked', () => {
      const onSelect = jest.fn();
      render(<TextItem {...defaultProps} onSelect={onSelect} />);
      
      const container = screen.getByText('Test Text').parentElement;
      fireEvent.click(container!);
      
      expect(onSelect).toHaveBeenCalled();
    });
  });
});

