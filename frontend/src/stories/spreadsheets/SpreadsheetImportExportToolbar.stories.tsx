import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import SpreadsheetImportExportToolbar from '@/components/spreadsheets/SpreadsheetImportExportToolbar';

const meta: Meta<typeof SpreadsheetImportExportToolbar> = {
  title: 'Spreadsheets/SpreadsheetImportExportToolbar',
  component: SpreadsheetImportExportToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof SpreadsheetImportExportToolbar>;

function ToolbarDemo({
  isImporting,
  isReverting,
  hasUndoOperation,
}: {
  isImporting: boolean;
  isReverting: boolean;
  hasUndoOperation: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const exportTriggerRef = useRef<HTMLButtonElement>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportMenuAnchor, setExportMenuAnchor] = useState<{ top: number; left: number; width: number } | null>(null);

  return (
    <SpreadsheetImportExportToolbar
      fileInputRef={fileInputRef}
      exportMenuRef={exportMenuRef}
      exportTriggerRef={exportTriggerRef}
      isImporting={isImporting}
      isReverting={isReverting}
      hasUndoOperation={hasUndoOperation}
      exportMenuOpen={exportMenuOpen}
      exportMenuAnchor={exportMenuAnchor}
      onFileChange={() => {}}
      onUndo={() => {}}
      onImportClick={() => {}}
      onToggleExportMenu={(anchor) => {
        if (anchor) setExportMenuAnchor(anchor);
        setExportMenuOpen((prev) => !prev);
      }}
      onCloseExportMenu={() => setExportMenuOpen(false)}
      onExportCSV={() => {}}
      onExportXLSX={() => {}}
    />
  );
}

export const Default: Story = {
  render: () => <ToolbarDemo isImporting={false} isReverting={false} hasUndoOperation={true} />,
};

export const ImportingDisabled: Story = {
  render: () => <ToolbarDemo isImporting={true} isReverting={false} hasUndoOperation={true} />,
};

export const NoUndoHistory: Story = {
  render: () => <ToolbarDemo isImporting={false} isReverting={false} hasUndoOperation={false} />,
};
