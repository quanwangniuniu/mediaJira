/**
 * ============================================================================
 * STORYBOOK SAMPLE - Demonstrating All 4 Essential Aspects
 * ============================================================================
 * 
 * This story file demonstrates:
 * 
 * 1. DEVELOPMENT: Multiple story variants showing different component states
 *    - Primary, Secondary, Disabled, Loading, Submit, Reset, Custom styling
 * 
 * 2. INTERACTION TESTING: Automated tests using play functions
 *    - Tests button clickability, disabled state, loading state
 *    - Located in: Primary, Disabled, Loading stories
 * 
 * 3. VISUAL TESTING: Chromatic configuration for visual regression testing
 *    - Configured in parameters.chromatic
 *    - Multiple viewports: 320px, 768px, 1024px
 * 
 * 4. DOCUMENTATION: Auto-generated documentation
 *    - tags: ['autodocs'] enables auto-docs
 *    - Comprehensive argTypes with descriptions and type information
 *    - Component description in docs.description
 * 
 * ============================================================================
 */

import FormButton from './FormButton';
import { within, userEvent, expect } from '@storybook/test';

export default {
  title: 'Form/Sample',
  component: FormButton,
  parameters: {
    layout: 'centered',
    // ========================================
    // 3. VISUAL TESTING (Chromatic)
    // ========================================
    // Configures Chromatic for visual regression testing
    // Captures screenshots at multiple viewports
    chromatic: { 
      disableSnapshot: false,
      viewports: [320, 768, 1024], // Mobile, Tablet, Desktop
    },
    // ========================================
    // 4. DOCUMENTATION
    // ========================================
    // Auto-generates documentation page
    docs: {
      description: {
        component: 'A reusable form button component with multiple variants, loading states, and customizable styling. Use this component for form submissions, actions, and user interactions.',
      },
    },
  },
  // Enable auto-generated documentation
  tags: ['autodocs'],
  // ========================================
  // 4. DOCUMENTATION (argTypes)
  // ========================================
  // Comprehensive prop documentation with descriptions, types, and defaults
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

// ========================================
// 1. DEVELOPMENT - Story Variants
// ========================================
// Multiple stories demonstrating different component states and use cases

export const Primary = {
  args: {
    children: 'Primary Button!',
    variant: 'primary',
    type: 'button',
  },
  // ========================================
  // 2. INTERACTION TESTING
  // ========================================
  // Automated test that verifies button can be clicked
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

export const Disabled = {
  args: {
    children: 'Disabled Button',
    variant: 'primary',
    disabled: true,
  },
  // ========================================
  // 2. INTERACTION TESTING
  // ========================================
  // Automated test that verifies disabled button behavior
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /disabled button/i });
    
    // Verify button exists and is disabled
    await expect(button).toBeInTheDocument();
    await expect(button).toBeDisabled();
  },
};

export const Loading = {
  args: {
    children: 'Loading Button',
    variant: 'primary',
    loading: true,
  },
  // ========================================
  // 2. INTERACTION TESTING
  // ========================================
  // Automated test that verifies loading state and spinner visibility
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /loading button/i });
    
    // Verify button exists and is disabled when loading
    await expect(button).toBeInTheDocument();
    await expect(button).toBeDisabled();
    
    // Verify loading spinner is present (check for spinner element)
    // The spinner is rendered as a div with animate-spin class
    const spinner = canvasElement.querySelector('.animate-spin');
    await expect(spinner).toBeInTheDocument();
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

