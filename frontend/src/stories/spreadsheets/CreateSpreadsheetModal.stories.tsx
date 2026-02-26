import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, screen } from '@storybook/test';
import { useState } from 'react';
import CreateSpreadsheetModal from '@/components/spreadsheets/CreateSpreadsheetModal';
import { CreateSpreadsheetRequest } from '@/types/spreadsheet';

const meta: Meta<typeof CreateSpreadsheetModal> = {
  title: 'Spreadsheets/CreateSpreadsheetModal',
  component: CreateSpreadsheetModal,
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Modal for creating a new spreadsheet within a project. Requires a spreadsheet name. Used when the user clicks "Create Spreadsheet" from the spreadsheets list page.',
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

type Story = StoryObj<typeof CreateSpreadsheetModal>;

function CreateSpreadsheetModalWrapper(props: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSpreadsheetRequest) => Promise<void>;
  loading?: boolean;
}) {
  return <CreateSpreadsheetModal {...props} />;
}


export const Open: Story = {
  parameters: {
    docs: { description: { story: 'Default open state with empty form and Create/Cancel buttons.' } },
  },
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
  play: async () => {
    await waitFor(() => expect(screen.getByRole('heading', { name: /Create Spreadsheet/i })).toBeInTheDocument());
    await expect(screen.getByLabelText(/Spreadsheet Name/i)).toBeInTheDocument();
    await expect(screen.getByRole('button', { name: /Create Spreadsheet/i })).toBeInTheDocument();
    await expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
  },
};

export const ValidationShowsError: Story = {
  parameters: {
    docs: { description: { story: 'Shows validation error when submitting without a spreadsheet name.' } },
  },
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
  play: async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: /Create Spreadsheet/i })).toBeInTheDocument());
    const submitBtn = screen.getByRole('button', { name: /Create Spreadsheet/i });
    await userEvent.click(submitBtn);
    await expect(screen.getByText(/Spreadsheet name is required/i)).toBeInTheDocument();
  },
};

export const SubmitSuccess: Story = {
  parameters: {
    docs: { description: { story: 'User enters a name and submits successfully; modal closes on success.' } },
  },
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
  play: async () => {
    await waitFor(() => expect(screen.getByLabelText(/Spreadsheet Name/i)).toBeInTheDocument());
    const input = screen.getByLabelText(/Spreadsheet Name/i);
    await userEvent.type(input, 'My Spreadsheet');
    await userEvent.click(screen.getByRole('button', { name: /Create Spreadsheet/i }));
  },
};

export const Loading: Story = {
  parameters: {
    docs: { description: { story: 'Loading state while the create request is in progress.' } },
  },
  render: () => (
    <CreateSpreadsheetModalWrapper
      isOpen={true}
      onClose={() => {}}
      onSubmit={async () => {}}
      loading={true}
    />
  ),
  play: async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: /Creating/i })).toBeInTheDocument());
  },
};
