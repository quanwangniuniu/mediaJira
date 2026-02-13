import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import SpreadsheetGrid, { SpreadsheetGridHandle } from '@/components/spreadsheets/SpreadsheetGrid';

const readCellRangeMock = jest.fn().mockResolvedValue({ cells: [] });
const deleteRowsMock = jest.fn().mockResolvedValue({ operation_id: 1 });
const deleteColumnsMock = jest.fn().mockResolvedValue({ operation_id: 1 });

jest.mock('@/lib/api/spreadsheetApi', () => ({
  SpreadsheetAPI: {
    readCellRange: (...args: any[]) => readCellRangeMock(...args),
    batchUpdateCells: jest.fn().mockResolvedValue({}),
    resizeSheet: jest.fn().mockResolvedValue({}),
    getHighlights: jest.fn().mockResolvedValue({ highlights: [] }),
    batchUpdateHighlights: jest.fn().mockResolvedValue({ updated: 0, deleted: 0 }),
    deleteRows: (...args: any[]) => deleteRowsMock(...args),
    deleteColumns: (...args: any[]) => deleteColumnsMock(...args),
  },
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: (...args: any[]) => toastSuccess(...args),
    error: (...args: any[]) => toastError(...args),
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

describe('SpreadsheetGrid highlight toolbar', () => {
  beforeEach(() => {
    readCellRangeMock.mockReset();
    readCellRangeMock.mockResolvedValue({ cells: [] });
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('applies highlight to a single cell selection', () => {
    const { container } = render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const cell = container.querySelector('td[data-row="0"][data-col="0"]') as HTMLTableCellElement;
    fireEvent.mouseDown(cell);

    const button = screen.getByTestId('highlight-button');
    fireEvent.click(button);
    fireEvent.click(screen.getByTestId('highlight-color-yellow'));

    expect(cell).toHaveStyle({ backgroundColor: '#FEF08A' });
  });

  it('applies highlight to a row selection', () => {
    const { container } = render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const rowHeader = screen.getByTestId('row-header-0');
    fireEvent.click(rowHeader);

    const button = screen.getByTestId('highlight-button');
    fireEvent.click(button);
    fireEvent.click(screen.getByTestId('highlight-color-green'));

    const cell = container.querySelector('td[data-row="0"][data-col="1"]') as HTMLTableCellElement;
    expect(cell).toHaveStyle({ backgroundColor: '#BBF7D0' });
  });

  it('applies highlight to a column selection', () => {
    const { container } = render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const colHeader = screen.getByTestId('col-header-0');
    fireEvent.click(colHeader);

    const button = screen.getByTestId('highlight-button');
    fireEvent.click(button);
    fireEvent.click(screen.getByTestId('highlight-color-blue'));

    const cell = container.querySelector('td[data-row="1"][data-col="0"]') as HTMLTableCellElement;
    expect(cell).toHaveStyle({ backgroundColor: '#BFDBFE' });
  });

  it('clears highlight', () => {
    const { container } = render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });

    const cell = container.querySelector('td[data-row="0"][data-col="0"]') as HTMLTableCellElement;
    fireEvent.mouseDown(cell);

    const button = screen.getByTestId('highlight-button');
    fireEvent.click(button);
    fireEvent.click(screen.getByTestId('highlight-color-pink'));
    expect(cell).toHaveStyle({ backgroundColor: '#FBCFE8' });

    fireEvent.click(button);
    fireEvent.click(screen.getByTestId('highlight-clear'));
    expect(cell).not.toHaveStyle({ backgroundColor: '#FBCFE8' });
  });

  it('records column highlight by header', async () => {
    readCellRangeMock.mockResolvedValue({
      cells: [
        { row_position: 0, column_position: 0, raw_input: 'Name' },
        { row_position: 0, column_position: 1, raw_input: 'Spend' },
      ],
    });
    const onHighlightCommit = jest.fn();
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} onHighlightCommit={onHighlightCommit} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    const colHeader = screen.getByTestId('col-header-0');
    fireEvent.click(colHeader);

    fireEvent.click(screen.getByTestId('highlight-button'));
    fireEvent.click(screen.getByTestId('highlight-color-yellow'));

    expect(onHighlightCommit).toHaveBeenCalled();
    const payload = onHighlightCommit.mock.calls[0][0];
    expect(payload.scope).toBe('COLUMN');
    expect(payload.target.by_header).toBe('Name');
  });

  it('replays highlight by header on reordered columns', async () => {
    readCellRangeMock.mockResolvedValue({
      cells: [
        { row_position: 0, column_position: 0, raw_input: 'City' },
        { row_position: 0, column_position: 2, raw_input: 'Spend' },
      ],
    });
    const ref = React.createRef<SpreadsheetGridHandle>();
    const { container } = render(<SpreadsheetGrid ref={ref} spreadsheetId={1} sheetId={1} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    ref.current?.applyHighlightOperation({
      color: '#BFDBFE',
      scope: 'COLUMN',
      header_row_index: 1,
      target: {
        by_header: 'Spend',
        fallback: { col_index: 1 },
      },
    });

    const cell = container.querySelector('td[data-row="1"][data-col="2"]') as HTMLTableCellElement;
    expect(cell).toHaveStyle({ backgroundColor: '#BFDBFE' });
  });

  it('skips highlight when header is missing', async () => {
    readCellRangeMock.mockResolvedValue({
      cells: [{ row_position: 0, column_position: 0, raw_input: 'City' }],
    });
    const ref = React.createRef<SpreadsheetGridHandle>();
    const { container } = render(<SpreadsheetGrid ref={ref} spreadsheetId={1} sheetId={1} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    ref.current?.applyHighlightOperation({
      color: '#FEF08A',
      scope: 'COLUMN',
      header_row_index: 1,
      target: {
        by_header: 'Missing',
      },
    });

    const cell = container.querySelector('td[data-row="1"][data-col="0"]') as HTMLTableCellElement;
    expect(cell).not.toHaveStyle({ backgroundColor: '#FEF08A' });
  });

  it('records clear highlight action', async () => {
    const onHighlightCommit = jest.fn();
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} onHighlightCommit={onHighlightCommit} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    const cell = screen.getByTestId('cell-0-0');
    fireEvent.click(cell);

    fireEvent.click(screen.getByTestId('highlight-button'));
    fireEvent.click(screen.getByTestId('highlight-clear'));

    expect(onHighlightCommit).toHaveBeenCalled();
    const payload = onHighlightCommit.mock.calls[0][0];
    expect(payload.color).toBe('clear');
  });
});

describe('SpreadsheetGrid delete row/column', () => {
  beforeEach(() => {
    readCellRangeMock.mockResolvedValue({ cells: [] });
    deleteRowsMock.mockResolvedValue({ operation_id: 1 });
    deleteColumnsMock.mockResolvedValue({ operation_id: 1 });
    toastSuccess.mockClear();
    toastError.mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('delete row calls API and shows success toast without opening modal', async () => {
    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    const rowHeader = screen.getByTestId('row-header-0');
    fireEvent.contextMenu(rowHeader);

    const deleteRowButton = screen.getByRole('menuitem', { name: /delete row/i });
    fireEvent.click(deleteRowButton);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(deleteRowsMock).toHaveBeenCalledWith(1, 1, 0, 1);
    expect(toastSuccess).toHaveBeenCalledWith('Deleted row.');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('delete row failure shows error toast', async () => {
    deleteRowsMock.mockRejectedValueOnce(new Error('Server error'));

    render(<SpreadsheetGrid spreadsheetId={1} sheetId={1} />);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    const rowHeader = screen.getByTestId('row-header-0');
    fireEvent.contextMenu(rowHeader);

    const deleteRowButton = screen.getByRole('menuitem', { name: /delete row/i });
    fireEvent.click(deleteRowButton);

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(deleteRowsMock).toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
    expect(toastError.mock.calls[0][0]).toContain('Server error');
  });
});

