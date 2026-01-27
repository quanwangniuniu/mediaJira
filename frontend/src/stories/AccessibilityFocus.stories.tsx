import type { Meta, StoryObj } from '@storybook/react';
import { FocusTrapModalDemo } from '@/accessibility/FocusTrapModalDemo';
import { FocusTrapDrawerDemo } from '@/accessibility/FocusTrapDrawerDemo';
import { ScreenReaderLabelsDemo } from '@/accessibility/ScreenReaderLabelsDemo';
import { within, userEvent, expect, waitFor } from '@storybook/test';

const meta: Meta<typeof FocusTrapModalDemo> = {
  title: 'Accessibility/FocusManagement',
  component: FocusTrapModalDemo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FocusTrapModalDemo>;

export const FocusTrapModal: Story = {
  render: () => <FocusTrapModalDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openButton = canvas.getByRole('button', { name: /open modal/i });
    await userEvent.click(openButton);
    const input = canvas.getByLabelText(/email address/i);
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(openButton).toHaveFocus());
  },
};

export const FocusTrapDrawer: Story = {
  render: () => <FocusTrapDrawerDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const openButton = canvas.getByRole('button', { name: /open drawer/i });
    await userEvent.click(openButton);
    const input = canvas.getByLabelText(/keyword/i);
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(openButton).toHaveFocus());
  },
};

export const ScreenReaderLabels: StoryObj<typeof ScreenReaderLabelsDemo> = {
  render: () => <ScreenReaderLabelsDemo />,
};
