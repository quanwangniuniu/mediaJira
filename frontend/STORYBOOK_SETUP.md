# Storybook Setup Guide

This project includes Storybook for component development and documentation.

## Installation

After cloning the repository, install dependencies:

```bash
cd frontend
npm install
```

## Running Storybook

Start the Storybook development server:

```bash
npm run storybook
```

This will start Storybook on `http://localhost:6006`

## Building Storybook

To build a static version of Storybook:

```bash
npm run build-storybook
```

The static files will be generated in the `storybook-static` directory.

## Adding New Stories

To create a new story for a component:

1. Create a `.stories.tsx` or `.stories.js` file next to your component
2. Follow the pattern in existing story files
3. Storybook will automatically discover and display your stories

## Example Story Structure

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './YourComponent';

const meta: Meta<typeof YourComponent> = {
  title: 'Category/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof YourComponent>;

export const Default: Story = {
  args: {
    // component props
  },
};
```

## Committing to GitHub

When committing Storybook files to GitHub:

1. **Add Storybook files:**
   ```bash
   git add .storybook/
   git add src/**/*.stories.*
   git add package.json package-lock.json
   ```

2. **Commit with a descriptive message:**
   ```bash
   git commit -m "feat: add Storybook configuration and sample component stories"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   ```

## Files to Commit

- `.storybook/` - Storybook configuration directory
- `src/**/*.stories.*` - All story files
- `package.json` - Updated with Storybook dependencies
- `package-lock.json` - Updated lock file

## Ignoring Storybook Build Files

The `storybook-static` directory should be in `.gitignore` (if you build static versions).

