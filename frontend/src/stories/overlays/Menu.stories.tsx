import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuShortcut,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuAnchor,
} from '@/overlays/menu/Menu';
import { Cloud, CreditCard, Github, Keyboard, LifeBuoy, LogOut, Mail, MessageSquare, Plus, PlusCircle, Settings, User, UserPlus, Users } from 'lucide-react';

const meta: Meta<typeof Menu> = {
  title: 'UI/Overlays/Menu',
  component: Menu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible menu component that can display a list of actions or options.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const DefaultStory = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Menu open={open} onOpenChange={setOpen}>
          <MenuAnchor asChild>
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? 'Close Menu' : 'Open Menu'}
            </button>
          </MenuAnchor>
          <MenuContent className="w-56">
              <MenuLabel>My Account</MenuLabel>
              <MenuSeparator />
              <MenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
                <MenuShortcut>⇧⌘P</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Billing</span>
                <MenuShortcut>⌘B</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <MenuShortcut>⌘S</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <Keyboard className="mr-2 h-4 w-4" />
                <span>Keyboard shortcuts</span>
                <MenuShortcut>⌘K</MenuShortcut>
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <Users className="mr-2 h-4 w-4" />
                <span>Team</span>
              </MenuItem>
              <MenuItem>
                <UserPlus className="mr-2 h-4 w-4" />
                <span>Invite users</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
                <MenuShortcut>⇧⌘Q</MenuShortcut>
              </MenuItem>
            </MenuContent>
        </Menu>
      );
    };

    return <DefaultStory />;
  },
};

export const WithIcons: Story = {
  render: () => {
    const WithIconsStory = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Menu open={open} onOpenChange={setOpen}>
          <MenuAnchor asChild>
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? 'Close Actions' : 'Actions'}
            </button>
          </MenuAnchor>
          <MenuContent className="w-56">
              <MenuItem>
                <Plus className="mr-2 h-4 w-4" />
                <span>New File</span>
              </MenuItem>
              <MenuItem>
                <PlusCircle className="mr-2 h-4 w-4" />
                <span>New Folder</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <Cloud className="mr-2 h-4 w-4" />
                <span>Upload to Cloud</span>
              </MenuItem>
              <MenuItem>
                <Mail className="mr-2 h-4 w-4" />
                <span>Share</span>
              </MenuItem>
            </MenuContent>
        </Menu>
      );
    };

    return <WithIconsStory />;
  },
};

export const WithCheckboxes: Story = {
  render: () => {
    const WithCheckboxesStory = () => {
      const [open, setOpen] = React.useState(false);
      const [showStatusBar, setShowStatusBar] = React.useState(true);
      const [showActivityBar, setShowActivityBar] = React.useState(false);
      const [showPanel, setShowPanel] = React.useState(false);

      return (
        <Menu open={open} onOpenChange={setOpen}>
          <MenuAnchor asChild>
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? 'Close View Options' : 'View Options'}
            </button>
          </MenuAnchor>
          <MenuContent className="w-56">
              <MenuLabel>Appearance</MenuLabel>
              <MenuSeparator />
              <MenuCheckboxItem
                checked={showStatusBar}
                onCheckedChange={setShowStatusBar}
              >
                Status Bar
              </MenuCheckboxItem>
              <MenuCheckboxItem
                checked={showActivityBar}
                onCheckedChange={setShowActivityBar}
              >
                Activity Bar
              </MenuCheckboxItem>
              <MenuCheckboxItem
                checked={showPanel}
                onCheckedChange={setShowPanel}
              >
                Panel
              </MenuCheckboxItem>
            </MenuContent>
        </Menu>
      );
    };

    return <WithCheckboxesStory />;
  },
};

export const WithRadioGroup: Story = {
  render: () => {
    const WithRadioGroupStory = () => {
      const [open, setOpen] = React.useState(false);
      const [position, setPosition] = React.useState("bottom");

      return (
        <Menu open={open} onOpenChange={setOpen}>
          <MenuAnchor asChild>
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? 'Close Panels' : 'Panels'}
            </button>
          </MenuAnchor>
          <MenuContent className="w-56">
              <MenuLabel>Panel Position</MenuLabel>
              <MenuSeparator />
              <MenuRadioGroup value={position} onValueChange={setPosition}>
                <MenuRadioItem value="top">Top</MenuRadioItem>
                <MenuRadioItem value="bottom">Bottom</MenuRadioItem>
                <MenuRadioItem value="right">Right</MenuRadioItem>
              </MenuRadioGroup>
            </MenuContent>
        </Menu>
      );
    };

    return <WithRadioGroupStory />;
  },
};

export const WithSubmenu: Story = {
  render: () => {
    const WithSubmenuStory = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Menu open={open} onOpenChange={setOpen}>
          <MenuAnchor asChild>
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? 'Close Edit' : 'Edit'}
            </button>
          </MenuAnchor>
          <MenuContent className="w-56">
              <MenuItem>
                <span>Undo</span>
                <MenuShortcut>⌘Z</MenuShortcut>
              </MenuItem>
              <MenuItem>
                <span>Redo</span>
                <MenuShortcut>⇧⌘Z</MenuShortcut>
              </MenuItem>
              <MenuSeparator />
              <MenuSub>
                <MenuSubTrigger>
                  <span>Find</span>
                </MenuSubTrigger>
                <MenuSubContent>
                  <MenuItem>Find in Files</MenuItem>
                  <MenuItem>Find References</MenuItem>
                  <MenuItem>Find Symbols</MenuItem>
                </MenuSubContent>
              </MenuSub>
              <MenuItem>
                <span>Replace</span>
                <MenuShortcut>⌘H</MenuShortcut>
              </MenuItem>
            </MenuContent>
        </Menu>
      );
    };

    return <WithSubmenuStory />;
  },
};

export const ComplexMenu: Story = {
  render: () => {
    const ComplexMenuStory = () => {
      const [open, setOpen] = React.useState(false);

      return (
        <Menu open={open} onOpenChange={setOpen}>
          <MenuAnchor asChild>
            <button
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              onClick={() => setOpen(!open)}
            >
              {open ? 'Close More' : 'More'}
            </button>
          </MenuAnchor>
          <MenuContent className="w-56">
              <MenuLabel>Help & Support</MenuLabel>
              <MenuSeparator />
              <MenuItem>
                <LifeBuoy className="mr-2 h-4 w-4" />
                <span>Support</span>
              </MenuItem>
              <MenuItem>
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Feedback</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem>
                <Github className="mr-2 h-4 w-4" />
                <span>GitHub</span>
              </MenuItem>
              <MenuItem>
                <span>API Documentation</span>
              </MenuItem>
              <MenuSeparator />
              <MenuItem disabled>
                <span>Advanced Settings</span>
              </MenuItem>
            </MenuContent>
        </Menu>
      );
    };

    return <ComplexMenuStory />;
  },
};
