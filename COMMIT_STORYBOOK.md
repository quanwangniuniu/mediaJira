# How to Commit Storybook to GitHub

## Step-by-Step Guide

### 1. Install Dependencies (if not already done)

First, make sure you've installed the Storybook dependencies:

```powershell
cd frontend
npm install
```

### 2. Verify Storybook Files

Check that these files exist:
- `frontend/.storybook/main.ts`
- `frontend/.storybook/preview.ts`
- `frontend/src/components/ui/Badge.stories.tsx`
- `frontend/src/components/form/FormButton.stories.js`
- `frontend/src/components/ui/StatusBadge.stories.js`
- `frontend/package.json` (updated with Storybook dependencies)

### 3. Stage Files for Commit

In PowerShell, navigate to your project root and stage the files:

```powershell
# Navigate to project root
cd C:\Users\User\OneDrive\Desktop\media\mediaJira

# Add Storybook configuration
git add frontend/.storybook/

# Add story files
git add frontend/src/components/ui/Badge.stories.tsx
git add frontend/src/components/form/FormButton.stories.js
git add frontend/src/components/ui/StatusBadge.stories.js

# Add updated package files
git add frontend/package.json
git add frontend/package-lock.json

# Add documentation
git add frontend/STORYBOOK_SETUP.md
git add COMMIT_STORYBOOK.md
```

Or add all changes at once:

```powershell
git add frontend/.storybook/ frontend/src/**/*.stories.* frontend/package.json frontend/package-lock.json frontend/STORYBOOK_SETUP.md COMMIT_STORYBOOK.md
```

### 4. Commit with a Descriptive Message

```powershell
git commit -m "feat: add Storybook configuration and sample component stories

- Add Storybook 7.6 configuration for Next.js
- Create sample stories for Badge, FormButton, and StatusBadge components
- Add Storybook scripts to package.json
- Include Storybook setup documentation"
```

### 5. Push to GitHub

```powershell
git push origin main
```

(Replace `main` with your branch name if different, e.g., `master` or `develop`)

## Verify on GitHub

After pushing, check your GitHub repository:
1. Go to `https://github.com/quanwangniuniu/mediaJira`
2. Navigate to `frontend/.storybook/` to see configuration files
3. Navigate to `frontend/src/components/` to see story files
4. Check `frontend/package.json` to see Storybook dependencies

## Next Steps

After committing, team members can:
1. Pull the latest changes
2. Run `npm install` in the `frontend` directory
3. Run `npm run storybook` to start Storybook
4. View components at `http://localhost:6006`

## Troubleshooting

If you encounter issues:

1. **Check git status:**
   ```powershell
   git status
   ```

2. **See what will be committed:**
   ```powershell
   git diff --cached
   ```

3. **If you need to unstage files:**
   ```powershell
   git reset HEAD <file>
   ```

