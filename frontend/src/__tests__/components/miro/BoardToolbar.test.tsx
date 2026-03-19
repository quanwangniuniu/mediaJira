import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import BoardToolbar from '@/components/miro/BoardToolbar';
import { ToolType } from '@/components/miro/hooks/useToolDnD';

const defaultProps = {
  activeTool: 'select' as ToolType,
  onToolChange: jest.fn(),
  onToolPrimaryAction: jest.fn(),
  lineVariant: 'straight_solid' as const,
  onLineVariantChange: jest.fn(),
};

describe('BoardToolbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders all tools', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: 'Select' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Shape' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sticky Note' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Frame' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Line' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Connector' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'brush' })).toBeInTheDocument();
    });

    test('shows tooltip on hover', () => {
      render(<BoardToolbar {...defaultProps} />);

      const textButton = screen.getByRole('button', { name: 'Text' });
      const tooltipRoot = textButton.parentElement;
      expect(tooltipRoot).toBeTruthy();

      fireEvent.mouseEnter(tooltipRoot!);
      expect(screen.getByText('Text')).toBeInTheDocument();
      fireEvent.mouseLeave(tooltipRoot!);
    });

    test('highlights active tool', () => {
      render(<BoardToolbar {...defaultProps} activeTool="text" />);
      
      const textButton = screen.getByRole('button', { name: 'Text' });
      expect(textButton).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('does not highlight inactive tools', () => {
      render(<BoardToolbar {...defaultProps} activeTool="text" />);
      
      const selectButton = screen.getByRole('button', { name: 'Select' });
      expect(selectButton).not.toHaveClass('bg-blue-100');
    });
  });

  describe('Line variant picker', () => {
    test('renders and triggers variant actions when line tool is active', () => {
      const onToolPrimaryAction = jest.fn();
      const onLineVariantChange = jest.fn();

      render(
        <BoardToolbar
          {...defaultProps}
          activeTool="line"
          onToolPrimaryAction={onToolPrimaryAction}
          onLineVariantChange={onLineVariantChange}
        />,
      );

      const dashedArrow = screen.getByRole('button', { name: 'Arrow dashed' });
      fireEvent.click(dashedArrow);

      expect(onLineVariantChange).toHaveBeenCalledWith('arrow_dashed');
      expect(onToolPrimaryAction).toHaveBeenCalledWith('line', { lineVariant: 'arrow_dashed' });
    });
  });

  describe('Tool Selection', () => {
    test('calls onToolPrimaryAction for click-create tools', () => {
      const onToolChange = jest.fn();
      const onToolPrimaryAction = jest.fn();
      render(
        <BoardToolbar
          {...defaultProps}
          onToolChange={onToolChange}
          onToolPrimaryAction={onToolPrimaryAction}
        />,
      );
      
      const textButton = screen.getByRole('button', { name: 'Text' });
      fireEvent.click(textButton);
      
      expect(onToolChange).not.toHaveBeenCalled();
      expect(onToolPrimaryAction).toHaveBeenCalledWith('text');
    });

    test('calls onToolChange only for select/freehand/line', () => {
      const onToolChange = jest.fn();
      const onToolPrimaryAction = jest.fn();
      render(
        <BoardToolbar
          {...defaultProps}
          onToolChange={onToolChange}
          onToolPrimaryAction={onToolPrimaryAction}
        />,
      );
      
      const tools: ToolType[] = ['select', 'text', 'shape', 'sticky_note', 'frame', 'line', 'connector', 'freehand'];
      const toolLabelByType: Record<ToolType, string> = {
        select: 'Select',
        text: 'Text',
        shape: 'Shape',
        sticky_note: 'Sticky Note',
        frame: 'Frame',
        line: 'Line',
        connector: 'Connector',
        freehand: 'brush',
      };
      
      tools.forEach((tool) => {
        const button = screen.getByRole('button', { name: toolLabelByType[tool] });
        fireEvent.click(button);
      });
      
      expect(onToolChange).toHaveBeenCalledTimes(3);
      expect(onToolChange).toHaveBeenCalledWith('select');
      expect(onToolChange).toHaveBeenCalledWith('line');
      expect(onToolChange).toHaveBeenCalledWith('freehand');
      expect(onToolPrimaryAction).toHaveBeenCalledTimes(5);
    });
  });

  describe('Drag and Drop', () => {
    test('select tool is not draggable', () => {
      render(<BoardToolbar {...defaultProps} activeTool="select" />);
      
      const selectButton = screen.getByRole('button', { name: 'Select' });
      expect(selectButton).not.toHaveAttribute('draggable', 'true');
    });

    test('other tools are draggable', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      const textButton = screen.getByRole('button', { name: 'Text' });
      expect(textButton).toHaveAttribute('draggable', 'true');
    });

    test('handles drag start for non-select tools', () => {
      render(<BoardToolbar {...defaultProps} />);
      
      const textButton = screen.getByRole('button', { name: 'Text' });
      const dataTransfer = { setData: jest.fn(), effectAllowed: '' } as any;

      fireEvent.dragStart(textButton!, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/x-miro-tool',
        expect.any(String),
      );
      expect(dataTransfer.setData).toHaveBeenCalledWith('toolType', 'text');
      expect(dataTransfer.setData).toHaveBeenCalledWith('source', 'toolbar');
    });

    test('prevents drag start for select tool', () => {
      render(<BoardToolbar {...defaultProps} activeTool="select" />);
      
      const selectButton = screen.getByRole('button', { name: 'Select' });
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
      
      const shapeButton = screen.getByRole('button', { name: 'Shape' });
      expect(shapeButton).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    test('applies hover styles to inactive tools', () => {
      render(<BoardToolbar {...defaultProps} activeTool="select" />);
      
      const textButton = screen.getByRole('button', { name: 'Text' });
      expect(textButton).toHaveClass('hover:bg-gray-100', 'text-gray-600');
    });
  });
});

