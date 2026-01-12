import FormButton from './FormButton';
import { within, userEvent, expect } from '@storybook/test';

export default {
  title: 'Button/Primitives',
  component: FormButton,
  parameters: {
    layout: 'centered',
    // Visual testing: Ensures consistent rendering
    chromatic: { 
      disableSnapshot: false,
      viewports: [320, 768, 1024],
    },
    // Documentation: Auto-generates docs
    docs: {
      description: {
        component: 'A reusable form button component with multiple variants, loading states, and customizable styling. Use this component for form submissions, actions, and user interactions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Button variant style - primary for main actions, secondary for alternative actions',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
      },
    },
    type: {
      control: 'select',
      options: ['button', 'submit', 'reset'],
      description: 'HTML button type attribute',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'button' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled and cannot be clicked',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in loading state (shows spinner)',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    children: {
      control: 'text',
      description: 'Button label text or content',
      table: {
        type: { summary: 'ReactNode' },
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
      },
    },
    onClick: {
      action: 'clicked',
      description: 'Click handler function called when button is clicked',
      table: {
        type: { summary: 'function' },
      },
    },
  },
};

export const Primary = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
    type: 'button',
  },
  // Interaction testing: Verifies button can be clicked
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /primary button/i });
    
    // Verify button exists and is accessible
    await expect(button).toBeInTheDocument();
    
    // Test that button is clickable (interaction test)
    // Note: In Chromatic visual testing, this verifies the button renders correctly
    await userEvent.click(button);
  },
};

export const Secondary = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
    type: 'button',
  },
};

export const Submit = {
  args: {
    children: 'Submit Form',
    variant: 'primary',
    type: 'submit',
  },
};

export const Reset = {
  args: {
    children: 'Reset Form',
    variant: 'secondary',
    type: 'reset',
  },
};

export const WithCustomClass = {
  args: {
    children: 'Custom Styled Button',
    variant: 'primary',
    className: 'w-64',
  },
};
