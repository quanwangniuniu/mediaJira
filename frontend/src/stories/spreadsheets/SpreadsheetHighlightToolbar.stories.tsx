import type { Meta, StoryObj } from '@storybook/react';
import { useRef, useState } from 'react';
import SpreadsheetHighlightToolbar from '@/components/spreadsheets/SpreadsheetHighlightToolbar';

const COLORS = [
  { id: 'yellow', label: 'Yellow', value: '#FEF08A' },
  { id: 'green', label: 'Green', value: '#BBF7D0' },
  { id: 'blue', label: 'Blue', value: '#BFDBFE' },
];

const meta: Meta<typeof SpreadsheetHighlightToolbar> = {
  title: 'Spreadsheets/SpreadsheetHighlightToolbar',
  component: SpreadsheetHighlightToolbar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof SpreadsheetHighlightToolbar>;

function HighlightToolbarDemo({ hasSelection }: { hasSelection: boolean }) {
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const highlightTriggerRef = useRef<HTMLButtonElement>(null);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState('#FEF08A');

  return (
    <SpreadsheetHighlightToolbar
      highlightMenuRef={highlightMenuRef}
      highlightTriggerRef={highlightTriggerRef}
      highlightMenuOpen={highlightMenuOpen}
      hasSelection={hasSelection}
      selectedHighlight={selectedHighlight}
      colors={COLORS}
      onToggleMenu={() => setHighlightMenuOpen((prev) => !prev)}
      onPickColor={(color) => {
        setSelectedHighlight(color);
        setHighlightMenuOpen(false);
      }}
      onClear={() => setHighlightMenuOpen(false)}
    />
  );
}

export const Enabled: Story = {
  render: () => <HighlightToolbarDemo hasSelection={true} />,
};

export const DisabledWithoutSelection: Story = {
  render: () => <HighlightToolbarDemo hasSelection={false} />,
};
