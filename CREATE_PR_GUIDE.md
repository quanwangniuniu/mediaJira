# How to Create a Pull Request for Storybook

## Step-by-Step Guide

### Step 1: Check Current Branch and Status

```powershell
# Check current branch
git branch

# Check status of files
git status
```

### Step 2: Create a New Feature Branch

```powershell
# Create and switch to a new branch for Storybook
git checkout -b feat/add-storybook

# Or if you prefer a different naming convention:
# git checkout -b feature/storybook-setup
# git checkout -b storybook/initial-setup
```

### Step 3: Stage Storybook Files

```powershell
# Add all Storybook-related files
git add frontend/.storybook/
git add frontend/src/components/ui/Badge.stories.tsx
git add frontend/src/components/form/FormButton.stories.js
git add frontend/src/components/ui/StatusBadge.stories.js
git add frontend/package.json
git add frontend/package-lock.json
git add frontend/STORYBOOK_SETUP.md
git add .gitignore

# Or add all at once:
git add frontend/.storybook/ frontend/src/**/*.stories.* frontend/package.json frontend/package-lock.json frontend/STORYBOOK_SETUP.md .gitignore
```

### Step 4: Commit Changes

```powershell
git commit -m "feat: add Storybook configuration and sample component stories

- Add Storybook 7.6 configuration for Next.js
- Create sample stories for Badge, FormButton, and StatusBadge components
- Add Storybook scripts to package.json
- Include Storybook setup documentation
- Update .gitignore to exclude storybook-static directory"
```

### Step 5: Push Branch to GitHub

```powershell
# Push the new branch to GitHub
git push origin feat/add-storybook

# If this is the first time pushing this branch, use:
git push -u origin feat/add-storybook
```

### Step 6: Create Pull Request on GitHub

#### Option A: Using GitHub Web Interface (Recommended)

1. **Go to your repository:**
   - Navigate to: `https://github.com/quanwangniuniu/mediaJira`

2. **You'll see a banner at the top:**
   - "feat/add-storybook had recent pushes" with a green "Compare & pull request" button
   - Click the **"Compare & pull request"** button

3. **Fill in the PR details:**
   - **Title:** `feat: Add Storybook configuration and sample component stories`
   - **Description:** Use the template below

4. **Select reviewers** (if needed)

5. **Click "Create pull request"**

#### Option B: Using GitHub CLI (if installed)

```powershell
gh pr create --title "feat: Add Storybook configuration and sample component stories" --body "This PR adds Storybook setup for component development and documentation." --base main
```

## PR Description Template

```markdown
## Description
This PR adds Storybook configuration and sample component stories to enable component development and documentation.

## Changes
- ✅ Add Storybook 7.6 configuration for Next.js
- ✅ Create sample stories for Badge, FormButton, and StatusBadge components
- ✅ Add Storybook scripts to package.json
- ✅ Include Storybook setup documentation
- ✅ Update .gitignore to exclude storybook-static directory

## Files Added
- `frontend/.storybook/main.ts` - Storybook main configuration
- `frontend/.storybook/preview.ts` - Storybook preview configuration
- `frontend/src/components/ui/Badge.stories.tsx` - Badge component stories
- `frontend/src/components/form/FormButton.stories.js` - FormButton component stories
- `frontend/src/components/ui/StatusBadge.stories.js` - StatusBadge component stories
- `frontend/STORYBOOK_SETUP.md` - Setup and usage documentation

## Files Modified
- `frontend/package.json` - Added Storybook dependencies and scripts
- `frontend/package-lock.json` - Updated lock file
- `.gitignore` - Added storybook-static directory

## Testing
- [ ] Storybook runs locally (`npm run storybook`)
- [ ] All sample stories render correctly
- [ ] No TypeScript/linting errors after `npm install`

## Screenshots
(Optional: Add screenshots of Storybook UI)

## Related Issues
(If applicable, link to related issues)

## Checklist
- [x] Code follows project style guidelines
- [x] Documentation updated
- [x] No breaking changes
- [x] Dependencies added to package.json
```

## Quick Command Summary

```powershell
# 1. Create branch
git checkout -b feat/add-storybook

# 2. Add files
git add frontend/.storybook/ frontend/src/**/*.stories.* frontend/package.json frontend/package-lock.json frontend/STORYBOOK_SETUP.md .gitignore

# 3. Commit
git commit -m "feat: add Storybook configuration and sample component stories"

# 4. Push
git push -u origin feat/add-storybook

# 5. Then go to GitHub and create PR via web interface
```

## After PR is Created

1. **Wait for CI/CD checks** (if configured)
2. **Address review comments** if any
3. **Make additional commits** if needed:
   ```powershell
   # Make changes, then:
   git add .
   git commit -m "fix: address review comments"
   git push
   ```
4. **Merge when approved** (or merge yourself if you have permissions)

## Troubleshooting

### If branch already exists on remote:
```powershell
git pull origin feat/add-storybook
```

### If you need to update the PR:
```powershell
# Make changes, then:
git add .
git commit -m "chore: update PR"
git push
```

### To see PR status:
```powershell
gh pr status  # If using GitHub CLI
```

