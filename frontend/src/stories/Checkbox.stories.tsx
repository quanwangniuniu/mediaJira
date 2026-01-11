import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../components/ui/inputs/Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'UI/Inputs/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A checkbox input primitive with support for labels, helper text, and validation states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the checkbox.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked.',
      table: {
        type: { summary: 'boolean | "indeterminate"' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the checkbox.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    onCheckedChange: {
      action: 'checked changed',
      description: 'Callback fired when the checked state changes.',
      table: {
        type: { summary: '(checked: boolean) => void' },
        category: 'Events',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Accept terms and conditions',
  },
};

export const Checked: Story = {
  args: {
    label: 'Subscribe to newsletter',
    checked: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled checkbox',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: 'Disabled checked checkbox',
    checked: true,
    disabled: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Enable notifications',
    helperText: 'Receive email notifications about updates.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Agree to terms',
    helperText: 'You must agree to the terms to continue.',
    // Note: For error styling, we'd typically use a wrapper component
    // but for this demo we'll just show helper text
  },
};

export const Indeterminate: Story = {
  args: {
    label: 'Select all items',
    checked: 'indeterminate' as const,
  },
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const InteractiveCheckbox = () => {
      const [agreements, setAgreements] = React.useState({
        terms: false,
        privacy: false,
        marketing: false,
      });

      const [selectAll, setSelectAll] = React.useState(false);

      const handleAgreementChange = (key: keyof typeof agreements) => (checked: boolean) => {
        const newAgreements = { ...agreements, [key]: checked };
        setAgreements(newAgreements);

        // Update select all state
        const allChecked = Object.values(newAgreements).every(Boolean);
        const someChecked = Object.values(newAgreements).some(Boolean);
        setSelectAll(allChecked ? true : someChecked ? ('indeterminate' as const) : false);
      };

      const handleSelectAll = (checked: boolean) => {
        const newAgreements = Object.keys(agreements).reduce((acc, key) => ({
          ...acc,
          [key]: checked
        }), {} as typeof agreements);
        setAgreements(newAgreements);
        setSelectAll(checked);
      };

      return (
        <div className="space-y-4 max-w-md">
          <Checkbox
            label="Select all agreements"
            checked={selectAll}
            onCheckedChange={handleSelectAll}
          />

          <div className="space-y-3 pl-6 border-l-2 border-gray-200">
            <Checkbox
              label="Accept terms and conditions"
              checked={agreements.terms}
              onCheckedChange={handleAgreementChange('terms')}
              helperText="Required to use our services."
            />

            <Checkbox
              label="Accept privacy policy"
              checked={agreements.privacy}
              onCheckedChange={handleAgreementChange('privacy')}
              helperText="Required to use our services."
            />

            <Checkbox
              label="Subscribe to marketing emails"
              checked={agreements.marketing}
              onCheckedChange={handleAgreementChange('marketing')}
              helperText="Optional marketing communications."
            />
          </div>

          <div className="text-sm text-gray-600">
            <strong>Agreements status:</strong>
            <ul className="mt-1 ml-4">
              <li>Terms: {agreements.terms ? '✅' : '❌'}</li>
              <li>Privacy: {agreements.privacy ? '✅' : '❌'}</li>
              <li>Marketing: {agreements.marketing ? '✅' : '❌'}</li>
            </ul>
          </div>
        </div>
      );
    };

    return <InteractiveCheckbox />;
  },
};

