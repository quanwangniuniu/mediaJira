import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import SpreadsheetMainGrid from '@/components/spreadsheets/SpreadsheetMainGrid';

const meta: Meta<typeof SpreadsheetMainGrid> = {
  title: 'Spreadsheets/SpreadsheetMainGrid',
  component: SpreadsheetMainGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof SpreadsheetMainGrid>;

function MainGridDemo() {
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editValue, setEditValue] = useState('');
  const [addRowsInputValue, setAddRowsInputValue] = useState('1000');

  return (
    <div className="h-[520px] p-3">
      <SpreadsheetMainGrid
        gridRef={gridRef}
        inputRef={inputRef}
        rowNumberWidth={50}
        headerHeight={24}
        totalColumnWidth={5 * 120}
        totalRowHeight={12 * 24}
        leftSpacerWidth={0}
        rightSpacerWidth={0}
        visibleColCount={5}
        visibleStartCol={0}
        visibleRowCount={12}
        visibleStartRow={0}
        totalColumns={7}
        topSpacerHeight={0}
        bottomSpacerHeight={0}
        resizeHandleSize={6}
        maxRows={100000}
        rowCount={12}
        showAddRowsUI={false}
        addRowsInputValue={addRowsInputValue}
        editValue={editValue}
        editingCell={null}
        isSingleCellSelection={true}
        isFilling={false}
        highlightCell={null}
        activeCell={{ row: 1, col: 1 }}
        headerCellStyle={{ height: '24px', minHeight: '24px' }}
        onScroll={() => {}}
        onKeyDown={() => {}}
        onCopy={() => {}}
        onPaste={() => {}}
        onSelectAll={() => {}}
        onColumnHeaderClick={() => {}}
        onRowHeaderClick={() => {}}
        onHeaderContextMenu={() => {}}
        onStartResize={() => {}}
        onResizePointerMove={() => {}}
        onResizePointerUp={() => {}}
        onCellMouseDown={() => {}}
        onCellDoubleClick={() => {}}
        onEditValueChange={setEditValue}
        onInputBlur={() => {}}
        onInputKeyDown={() => {}}
        onFillHandlePointerDown={() => {}}
        onAddRowsInputChange={setAddRowsInputValue}
        onAddRows={() => {}}
        onCancelAddRows={() => setAddRowsInputValue('1000')}
        getColumnWidth={() => 120}
        getRowHeight={() => 24}
        getCellKey={(row, col) => `${row}:${col}`}
        getCellDisplayValue={(row, col) => (row === 0 ? `Header ${col + 1}` : `R${row + 1}C${col + 1}`)}
        getHighlightColor={() => null}
        isRowHeaderSelected={() => false}
        isColumnHeaderSelected={() => false}
        isCellInSelection={(row, col) => row >= 1 && row <= 3 && col >= 1 && col <= 2}
        isCellInFillPreview={() => false}
        columnIndexToLabel={(index) => String.fromCharCode(65 + index)}
        getCellBaseStyle={(height) => ({ boxSizing: 'border-box', height: `${height}px`, minHeight: `${height}px` })}
        getCellInputStyle={(height) => ({ boxSizing: 'border-box', height: `${height}px`, lineHeight: `${height - 4}px` })}
        getCellContentStyle={(height) => ({
          padding: '2px 4px',
          boxSizing: 'border-box',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          height: `${height}px`,
          lineHeight: `${height - 4}px`,
        })}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <MainGridDemo />,
};
