import type { Meta, StoryObj } from '@storybook/react';
import { InlineEditableForm } from '@/inline-edit-keyboard/InlineEditableForm';
import { InlineEditableText } from '@/inline-edit-keyboard/InlineEditableText';
import { within, userEvent, expect } from '@storybook/test';

const meta: Meta<typeof InlineEditableText> = {
  title: 'Patterns/InlineEditKeyboard',
  component: InlineEditableText,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof InlineEditableText>;

export const EnterToEdit: Story = {
  render: () => <InlineEditableText />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = canvas.getByRole('button', { name: /title value/i });
    view.focus();
    await userEvent.keyboard('{Enter}');
    const input = canvas.getByRole('textbox', { name: /title input/i });
    await expect(input).toHaveFocus();
  },
};

export const EscToCancelRevert: Story = {
  render: () => <InlineEditableText initialValue="Release notes v3" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const view = canvas.getByRole('button', { name: /title value/i });
    await userEvent.click(view);
    const input = canvas.getByRole('textbox', { name: /title input/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'Draft change');
    await userEvent.keyboard('{Escape}');
    await expect(view).toHaveTextContent('Release notes v3');
  },
};

export const TabNavigationBetweenFields: Story = {
  render: () => <InlineEditableForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const project = canvas.getByRole('button', { name: /project value/i });
    project.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard('{Tab}');
    const owner = canvas.getByRole('button', { name: /owner value/i });
    await expect(owner).toHaveFocus();
  },
};
