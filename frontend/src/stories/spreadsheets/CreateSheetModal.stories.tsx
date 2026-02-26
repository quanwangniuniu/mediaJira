import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, screen } from '@storybook/test';
import { useState } from 'react';
import CreateSheetModal from '@/components/spreadsheets/CreateSheetModal';
import { CreateSheetRequest } from '@/types/spreadsheet';

function CreateSheetModalWrapper(props: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSheetRequest) => Promise<void>;
  loading?: boolean;
  defaultName?: string;
}) {
  return <CreateSheetModal {...props} />;
}

const meta: Meta<typeof CreateSheetModal> = {
  title: 'Spreadsheets/CreateSheetModal',
  component: CreateSheetModal,
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal for creating a new sheet within an existing spreadsheet. Supports an optional default name (e.g. "Sheet2"). Used when adding sheets to a spreadsheet.',
      },
    },
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

export const Open: Story = {
  parameters: {
    docs: { description: { story: 'Default open state with empty form and Create/Cancel buttons.' } },
  },
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
  play: async () => {
    await waitFor(() => expect(screen.getByRole('heading', { name: /Create Sheet/i })).toBeInTheDocument());
    await expect(screen.getByLabelText(/Sheet Name/i)).toBeInTheDocument();
    await expect(screen.getByRole('button', { name: /Create Sheet/i })).toBeInTheDocument();
    await expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  },
};

export const WithDefaultName: Story = {
  parameters: {
    docs: { description: { story: 'Pre-filled with a default sheet name (e.g. Sheet2) when adding a new sheet.' } },
  },
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
  play: async () => {
    await waitFor(
      () => {
        const input = screen.getByLabelText(/Sheet Name/i) as HTMLInputElement;
        expect(input.value).toBe('Sheet2');
      },
      { timeout: 3000 }
    );
  },
};

export const ValidationShowsError: Story = {
  parameters: {
    docs: { description: { story: 'Shows validation error when submitting without a sheet name.' } },
  },
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
  play: async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: /Create Sheet/i })).toBeInTheDocument());
    const submitBtn = screen.getByRole('button', { name: /Create Sheet/i });
    await userEvent.click(submitBtn);
    await expect(screen.getByText(/Sheet name is required/i)).toBeInTheDocument();
  },
};

export const SubmitSuccess: Story = {
  parameters: {
    docs: { description: { story: 'User enters a name and submits successfully; modal closes on success.' } },
  },
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
  play: async () => {
    await waitFor(() => expect(screen.getByLabelText(/Sheet Name/i)).toBeInTheDocument());
    const input = screen.getByLabelText(/Sheet Name/i);
    await userEvent.type(input, 'My Sheet');
    await userEvent.click(screen.getByRole('button', { name: /Create Sheet/i }));
  },
};
