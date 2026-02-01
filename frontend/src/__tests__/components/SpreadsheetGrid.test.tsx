import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpreadsheetGrid from '@/components/spreadsheets/SpreadsheetGrid';

const readCellRangeMock = jest.fn().mockResolvedValue({ cells: [] });

jest.mock('@/lib/api/spreadsheetApi', () => ({
  SpreadsheetAPI: {
    readCellRange: (...args: any[]) => readCellRangeMock(...args),
    batchUpdateCells: jest.fn().mockResolvedValue({}),
    resizeSheet: jest.fn().mockResolvedValue({}),
  },
}));

describe('SpreadsheetGrid resizing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders resize handles with expected hit area', () => {
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const colHandle = screen.getByTestId('col-resize-handle-0');
    const rowHandle = screen.getByTestId('row-resize-handle-0');

    expect(colHandle).toHaveStyle({ width: '6px', cursor: 'col-resize' });
    expect(rowHandle).toHaveStyle({ height: '6px', cursor: 'row-resize' });
  });

  it('updates column width when dragging header resize handle', () => {
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const handle = screen.getByTestId('col-resize-handle-0') as HTMLDivElement;
    handle.setPointerCapture = jest.fn();
    handle.releasePointerCapture = jest.fn();

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 130 });
    fireEvent.pointerUp(handle, { pointerId: 1, clientX: 130 });

    const col = screen.getByTestId('col-width-0');
    expect(col).toHaveStyle({ width: '150px' });
  });

  it('updates row height when dragging row resize handle', () => {
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const handle = screen.getByTestId('row-resize-handle-0') as HTMLDivElement;
    handle.setPointerCapture = jest.fn();
    handle.releasePointerCapture = jest.fn();

    fireEvent.pointerDown(handle, { pointerId: 2, clientY: 100 });
    fireEvent.pointerMove(handle, { pointerId: 2, clientY: 130 });
    fireEvent.pointerUp(handle, { pointerId: 2, clientY: 130 });

    const rowHeader = screen.getByTestId('row-header-0');
    expect(rowHeader).toHaveStyle({ height: '54px' });
  });
});

describe('SpreadsheetGrid numeric display', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    readCellRangeMock.mockResolvedValue({
      cells: [
        {
          row_position: 0,
          column_position: 0,
          raw_input: '9.7654322457898765',
          computed_type: 'number',
          computed_number: '9.7654322457898765',
        },
      ],
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    readCellRangeMock.mockReset();
  });

  it('truncates display to 10 decimal places but keeps full raw input on edit', async () => {
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.getByText('9.7654322457')).toBeInTheDocument();

    const cell = screen.getByText('9.7654322457');
    fireEvent.doubleClick(cell);

    const input = screen.getByDisplayValue('9.7654322457898765') as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });
});

