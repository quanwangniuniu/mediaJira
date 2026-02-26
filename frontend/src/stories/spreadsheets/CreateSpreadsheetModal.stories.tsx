import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import CreateSpreadsheetModal from '@/components/spreadsheets/CreateSpreadsheetModal';
import { CreateSpreadsheetRequest } from '@/types/spreadsheet';

const meta: Meta<typeof CreateSpreadsheetModal> = {
  title: 'Spreadsheets/CreateSpreadsheetModal',
  component: CreateSpreadsheetModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        data-modal-root
        style={{
          position: 'relative',
          minHeight: '800px',
          height: '100vh',
          width: '100%',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CreateSpreadsheetModal>;

function CreateSpreadsheetModalWrapper(props: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSpreadsheetRequest) => Promise<void>;
  loading?: boolean;
}) {
  return <CreateSpreadsheetModal {...props} />;
}

export const Closed: Story = {
  render: () => (
    <CreateSpreadsheetModalWrapper
      isOpen={false}
      onClose={() => {}}
      onSubmit={async () => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('dialog')).toBeNull();
  },
};

export const Open: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <CreateSpreadsheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async () => setOpen(false)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Create Spreadsheet')).toBeInTheDocument();
    await expect(canvas.getByLabelText(/Spreadsheet Name/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Create Spreadsheet/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  },
};

export const ValidationShowsError: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <CreateSpreadsheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async () => setOpen(false)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitBtn = canvas.getByRole('button', { name: /Create Spreadsheet/i });
    await userEvent.click(submitBtn);
    await expect(canvas.getByText(/Spreadsheet name is required/i)).toBeInTheDocument();
  },
};

export const SubmitSuccess: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <CreateSpreadsheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async (data) => {
          expect(data.name).toBe('My Spreadsheet');
          setOpen(false);
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Spreadsheet Name/i);
    await userEvent.type(input, 'My Spreadsheet');
    await userEvent.click(canvas.getByRole('button', { name: /Create Spreadsheet/i }));
  },
};

export const Loading: Story = {
  render: () => (
    <CreateSpreadsheetModalWrapper
      isOpen={true}
      onClose={() => {}}
      onSubmit={async () => {}}
      loading={true}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /Creating/i })).toBeInTheDocument();
  },
};
