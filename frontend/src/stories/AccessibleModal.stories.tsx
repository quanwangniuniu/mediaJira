import React, { useState, useRef } from 'react';
import { AccessibleModal } from '../accessibility/AccessibleModalNew';
import { AccessibleDrawer } from '../accessibility/AccessibleDrawerNew';
import Button from '../components/button/Button';
import { TextInput, Checkbox } from '../components/input/InputPrimitives';

export default {
  title: 'Accessibility/Modal & Drawer',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Accessible modal and drawer components with focus trapping, ARIA semantics, and keyboard navigation.',
      },
    },
    tags: ['autodocs'],
  },
};

// Modal Focus Trap story
export const ModalFocusTrap: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900 text-left">Modal Focus Trap Demo</h2>
          <p className="text-sm text-slate-600 text-left">
            Use Tab and Shift+Tab to cycle through focusable elements inside the modal. Press Escape to close.
          </p>
        </div>

        <Button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          variant="primary"
          className="mx-auto"
        >
          Open Modal
        </Button>
      </div>

      <AccessibleModal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Focus Trap Demo"
        description="This modal demonstrates focus trapping with Tab and Shift+Tab navigation."
        returnFocusRef={triggerRef}
      >
        <div className="space-y-4">
          <TextInput
            label="Input Field"
            placeholder="Type something..."
          />

          <Button variant="primary" className="mr-4">
            Action Button
          </Button>

          <a
            href="#"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm"
            onClick={(e) => e.preventDefault()}
          >
            Focusable Link
          </a>
        </div>
      </AccessibleModal>
    </div>
  );
};

// Drawer Focus Trap story
export const DrawerFocusTrap: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900 text-left">Drawer Focus Trap Demo</h2>
          <p className="text-sm text-slate-600 text-left">
            Use Tab and Shift+Tab to cycle through focusable elements inside the drawer. Press Escape to close.
          </p>
        </div>

        <Button
          ref={triggerRef}
          onClick={() => setIsOpen(true)}
          variant="primary"
          className="mx-auto"
        >
          Open Drawer
        </Button>
      </div>

      <AccessibleDrawer
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Focus Trap Demo"
        description="This drawer demonstrates focus trapping with Tab and Shift+Tab navigation."
        returnFocusRef={triggerRef}
      >
        <div className="space-y-4">
          <TextInput
            label="Input Field"
            placeholder="Type something..."
          />

          <Button variant="primary" className="mr-4">
            Action Button
          </Button>

          <a
            href="#"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm"
            onClick={(e) => e.preventDefault()}
          >
            Focusable Link
          </a>
        </div>
      </AccessibleDrawer>
    </div>
  );
};

// Screen Reader Labels story
export const ScreenReaderLabels: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900 text-left">Screen Reader Labels Demo</h2>
          <p className="text-sm text-slate-600 text-left">
            This demo shows proper ARIA labels and semantic markup for accessibility.
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => setModalOpen(true)} variant="primary">
            Open Modal with Labels
          </Button>

          <Button onClick={() => setDrawerOpen(true)} variant="secondary">
            Open Drawer with Labels
          </Button>
        </div>
      </div>

      <AccessibleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="User Settings"
        description="Configure your account preferences and accessibility options."
      >
        <div className="space-y-4">
          <TextInput
            label="Username"
            placeholder="Enter username"
            required
          />

          <TextInput
            label="Email Address"
            type="email"
            placeholder="Enter email"
            required
          />

          <Checkbox
            label="Enable email notifications"
            description="Receive notifications about account activity"
          />

          <div className="flex gap-3 justify-center pt-4">
            <Button variant="primary">
              Save Changes
            </Button>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </AccessibleModal>

      <AccessibleDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title="Navigation Menu"
        description="Site navigation with quick access to main sections."
      >
        <nav className="flex justify-center">
          <ul className="space-y-2 w-full max-w-xs">
            <li>
              <a
                href="#"
                className="block px-3 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                Dashboard
              </a>
            </li>
            <li>
              <a
                href="#"
                className="block px-3 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                Projects
              </a>
            </li>
            <li>
              <a
                href="#"
                className="block px-3 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
                onClick={(e) => e.preventDefault()}
              >
                Settings
              </a>
            </li>
          </ul>
        </nav>
      </AccessibleDrawer>
    </div>
  );
};


