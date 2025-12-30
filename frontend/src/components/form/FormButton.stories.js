import FormButton from './FormButton';

export default {
  title: 'Form/FormButton',
  component: FormButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    onClick: { action: 'clicked' },
  },
};

export const Primary = {
  args: {
    children: 'Submit',
    variant: 'primary',
    type: 'button',
  },
};

export const Secondary = {
  args: {
    children: 'Cancel',
    variant: 'secondary',
    type: 'button',
  },
};

export const Loading = {
  args: {
    children: 'Loading...',
    variant: 'primary',
    loading: true,
    type: 'button',
  },
};

export const Disabled = {
  args: {
    children: 'Disabled',
    variant: 'primary',
    disabled: true,
    type: 'button',
  },
};

export const WithCustomClass = {
  args: {
    children: 'Custom Button',
    variant: 'primary',
    className: 'w-64',
    type: 'button',
  },
};

