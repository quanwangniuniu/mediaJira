import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardToolbar from '@/components/miro/BoardToolbar';
import { ToolType } from '@/components/miro/hooks/useToolDnD';

const defaultProps = {
  activeTool: 'select' as ToolType,
  onToolChange: jest.fn(),
};

describe('BoardToolbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders all tools', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      expect(screen.getByTitle('Select')).toBeInTheDocument();
      expect(screen.getByTitle('Text')).toBeInTheDocument();
      expect(screen.getByTitle('Shape')).toBeInTheDocument();
      expect(screen.getByTitle('Sticky Note')).toBeInTheDocument();
      expect(screen.getByTitle('Frame')).toBeInTheDocument();
      expect(screen.getByTitle('Line')).toBeInTheDocument();
      expect(screen.getByTitle('Connector')).toBeInTheDocument();
      expect(screen.getByTitle('Freehand')).toBeInTheDocument();
    });

    test('highlights active tool', () => {
      render(<BoardToolbar {...defaultProps} activeTool="text" />);
      
      const textButton = screen.getByTitle('Text').closest('button');
      expect(textButton).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('does not highlight inactive tools', () => {
      render(<BoardToolbar {...defaultProps} activeTool="text" />);
      
      const selectButton = screen.getByTitle('Select').closest('button');
      expect(selectButton).not.toHaveClass('bg-blue-100');
    });
  });

  describe('Tool Selection', () => {
    test('calls onToolChange when tool button clicked', () => {
      const onToolChange = jest.fn();
      render(<BoardToolbar {...defaultProps} onToolChange={onToolChange} />);
      
      const textButton = screen.getByTitle('Text');
      fireEvent.click(textButton);
      
      expect(onToolChange).toHaveBeenCalledWith('text');
    });

    test('calls onToolChange for each tool type', () => {
      const onToolChange = jest.fn();
      render(<BoardToolbar {...defaultProps} onToolChange={onToolChange} />);
      
      const tools: ToolType[] = ['select', 'text', 'shape', 'sticky_note', 'frame', 'line', 'connector', 'freehand'];
      
      tools.forEach((tool) => {
        const button = screen.getByTitle(
          tool === 'sticky_note' ? 'Sticky Note' : 
          tool.charAt(0).toUpperCase() + tool.slice(1)
        );
        fireEvent.click(button);
      });
      
      expect(onToolChange).toHaveBeenCalledTimes(8);
      tools.forEach((tool) => {
        expect(onToolChange).toHaveBeenCalledWith(tool);
      });
    });
  });

  describe('Drag and Drop', () => {
    test('select tool is not draggable', () => {
      render(<BoardToolbar {...defaultProps} activeTool="select" />);
      
      const selectButton = screen.getByTitle('Select');
      expect(selectButton).not.toHaveAttribute('draggable', 'true');
    });

    test('other tools are draggable', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      const textButton = screen.getByTitle('Text');
      expect(textButton.closest('button')).toHaveAttribute('draggable', 'true');
    });

    test('handles drag start for non-select tools', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      const textButton = screen.getByTitle('Text').closest('button');
      const dataTransfer = { setData: jest.fn(), effectAllowed: '' } as any;

      fireEvent.dragStart(textButton!, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith('toolType', 'text');
      expect(dataTransfer.setData).toHaveBeenCalledWith('source', 'toolbar');
    });

    test('prevents drag start for select tool', () => {
      render(<BoardToolbar {...defaultProps} activeTool="select" />);
      
      const selectButton = screen.getByTitle('Select').closest('button');
      const dataTransfer = { setData: jest.fn(), effectAllowed: '' } as any;

      fireEvent.dragStart(selectButton!, { dataTransfer });

      // Select tool should not set any drag payload
      expect(dataTransfer.setData).not.toHaveBeenCalled();
    });
  });

  describe('Tool Icons', () => {
    test('renders correct icons for each tool', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      // Icons are rendered as SVG elements from lucide-react
      // We can verify they exist by checking the button structure
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(8);
    });
  });

  describe('Tool States', () => {
    test('applies active styles to active tool', () => {
      render(<BoardToolbar {...defaultProps} activeTool="shape" />);
      
      const shapeButton = screen.getByTitle('Shape').closest('button');
      expect(shapeButton).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('applies hover styles to inactive tools', () => {
      render(<BoardToolbar {...defaultProps} activeTool="select" />);
      
      const textButton = screen.getByTitle('Text').closest('button');
      expect(textButton).toHaveClass('hover:bg-gray-100', 'text-gray-600');
    });
  });
});

