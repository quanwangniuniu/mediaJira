import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
import CreateSheetModal from '@/components/spreadsheets/CreateSheetModal';
import { CreateSheetRequest } from '@/types/spreadsheet';

const meta: Meta<typeof CreateSheetModal> = {
  title: 'Spreadsheets/CreateSheetModal',
  component: CreateSheetModal,
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

type Story = StoryObj<typeof CreateSheetModal>;

function CreateSheetModalWrapper(props: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSheetRequest) => Promise<void>;
  loading?: boolean;
  defaultName?: string;
}) {
  return <CreateSheetModal {...props} />;
}

export const Closed: Story = {
  render: () => (
    <CreateSheetModalWrapper
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
      <CreateSheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async () => setOpen(false)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Create Sheet')).toBeInTheDocument();
    await expect(canvas.getByLabelText(/Sheet Name/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Create Sheet/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  },
};

export const WithDefaultName: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <CreateSheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async () => setOpen(false)}
        defaultName="Sheet2"
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Sheet Name/i) as HTMLInputElement;
    await expect(input.value).toBe('Sheet2');
  },
};

export const ValidationShowsError: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <CreateSheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async () => setOpen(false)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const submitBtn = canvas.getByRole('button', { name: /Create Sheet/i });
    await userEvent.click(submitBtn);
    await expect(canvas.getByText(/Sheet name is required/i)).toBeInTheDocument();
  },
};

export const SubmitSuccess: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <CreateSheetModalWrapper
        isOpen={open}
        onClose={() => setOpen(false)}
        onSubmit={async (data) => {
          expect(data.name).toBe('My Sheet');
          setOpen(false);
        }}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText(/Sheet Name/i);
    await userEvent.type(input, 'My Sheet');
    await userEvent.click(canvas.getByRole('button', { name: /Create Sheet/i }));
  },
};
