import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InlineContentEditor from '@/components/miro/InlineContentEditor';

const defaultProps = {
  rect: {
    left: 100,
    top: 200,
    width: 300,
    height: 50,
  },
  value: 'Test content',
  onChange: jest.fn(),
  onCommit: jest.fn(),
  onCancel: jest.fn(),
};

describe('InlineContentEditor Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders input for single-line mode', () => {
      render(<InlineContentEditor {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test content') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('text');
    });

    test('renders textarea for multiline mode', () => {
      render(<InlineContentEditor {...defaultProps} multiline={true} />);
      
      const textarea = screen.getByDisplayValue('Test content') as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    test('applies correct positioning styles', () => {
      render(<InlineContentEditor {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test content');
      const style = window.getComputedStyle(input);
      expect(input).toHaveStyle({
        position: 'fixed',
        left: '100px',
        top: '200px',
      });
    });

    test('uses minimum width and height', () => {
      render(<InlineContentEditor {...defaultProps} rect={{ left: 0, top: 0, width: 50, height: 10 }} />);
      
      const input = screen.getByDisplayValue('Test content');
      expect(input).toHaveStyle({
        width: '100px', // min width
        height: '24px', // min height
      });
    });
  });

  describe('Auto Focus', () => {
    test('focuses and selects text on mount', () => {
      render(<InlineContentEditor {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test content') as HTMLInputElement;
      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe('Test content'.length);
    });
  });

  describe('Content Editing', () => {
    test('calls onChange when content changes', () => {
      const onChange = jest.fn();
      render(<InlineContentEditor {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByDisplayValue('Test content');
      fireEvent.change(input, { target: { value: 'New content' } });
      
      expect(onChange).toHaveBeenCalledWith('New content');
    });
  });

  describe('Keyboard Events - Single Line', () => {
    test('commits on Enter key', () => {
      const onCommit = jest.fn();
      render(<InlineContentEditor {...defaultProps} onCommit={onCommit} />);
      
      const input = screen.getByDisplayValue('Test content');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(onCommit).toHaveBeenCalled();
    });

    test('cancels on Escape key', () => {
      const onCancel = jest.fn();
      render(<InlineContentEditor {...defaultProps} onCancel={onCancel} />);
      
      const input = screen.getByDisplayValue('Test content');
      fireEvent.keyDown(input, { key: 'Escape' });
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Keyboard Events - Multiline', () => {
    test('commits on Enter key (without Shift)', () => {
      const onCommit = jest.fn();
      render(<InlineContentEditor {...defaultProps} multiline={true} onCommit={onCommit} />);
      
      const textarea = screen.getByDisplayValue('Test content');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      
      expect(onCommit).toHaveBeenCalled();
    });

    test('does not commit on Shift+Enter (allows newline)', () => {
      const onCommit = jest.fn();
      render(<InlineContentEditor {...defaultProps} multiline={true} onCommit={onCommit} />);
      
      const textarea = screen.getByDisplayValue('Test content');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
      
      expect(onCommit).not.toHaveBeenCalled();
    });

    test('cancels on Escape key', () => {
      const onCancel = jest.fn();
      render(<InlineContentEditor {...defaultProps} multiline={true} onCancel={onCancel} />);
      
      const textarea = screen.getByDisplayValue('Test content');
      fireEvent.keyDown(textarea, { key: 'Escape' });
      
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Blur Handling', () => {
    test('commits on blur', () => {
      const onCommit = jest.fn();
      render(<InlineContentEditor {...defaultProps} onCommit={onCommit} />);
      
      const input = screen.getByDisplayValue('Test content');
      fireEvent.blur(input);
      
      expect(onCommit).toHaveBeenCalled();
    });
  });

  describe('Event Propagation', () => {
    test('stops propagation on mouse down', () => {
      render(<InlineContentEditor {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test content');
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      const stopPropagationSpy = jest.spyOn(mouseDownEvent, 'stopPropagation');
      
      fireEvent(input, mouseDownEvent);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    test('stops propagation on click', () => {
      render(<InlineContentEditor {...defaultProps} />);
      
      const input = screen.getByDisplayValue('Test content');
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');
      
      fireEvent(input, clickEvent);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Textarea Specific', () => {
    test('allows resizing in multiline mode', () => {
      render(<InlineContentEditor {...defaultProps} multiline={true} />);
      
      const textarea = screen.getByDisplayValue('Test content') as HTMLTextAreaElement;
      expect(textarea.style.resize).toBe('both');
    });

    test('has minimum height in multiline mode', () => {
      render(<InlineContentEditor {...defaultProps} multiline={true} />);
      
      const textarea = screen.getByDisplayValue('Test content');
      expect(textarea).toHaveStyle({
        minHeight: '60px',
      });
    });
  });
});

