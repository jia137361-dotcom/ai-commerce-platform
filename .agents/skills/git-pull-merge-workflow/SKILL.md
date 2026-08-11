---
name: git-pull-merge-workflow
description: Automate pulling latest code from GitHub, merging branches, and resolving conflicts for CitiGoo projects
---

# Git Pull/Merge Workflow

This skill automates the common workflow of pulling latest code, merging branches, and resolving conflicts.

## When to Use

- User asks to "pull latest code" or "merge branches"
- User says "I've pushed changes, pull them down"
- Conflicts need resolution after merge

## Workflow

### Step 1: Check Current State
```bash
git status
git log --oneline -5
git remote -v
```

### Step 2: Fetch Latest
```bash
git fetch origin
```

### Step 3: Check for Divergence
```bash
git log HEAD..origin/main --oneline
```

### Step 4: Merge or Rebase
```bash
# If clean merge possible:
git merge origin/main --no-edit

# If rebase preferred:
git rebase origin/main
```

### Step 5: Resolve Conflicts (if any)
1. Check `git status` for conflicted files
2. Edit each file to resolve conflict markers
3. `git add <resolved-files>`
4. `git commit` or `git rebase --continue`

### Step 6: Verify
```bash
git status
git log --oneline -3
```

## Common Issues

- **Fetch timeout**: Use `git fetch --depth 1` for shallow clone
- **SSH issues**: Verify with `ssh -T git@github.com`
- **Port conflicts**: Check if services are running on expected ports

## Example Usage

User: "Pull latest code from GitHub"
→ Execute steps 1-6 automatically

User: "I merged new code to branch, pull it"
→ Execute steps 1-6 with branch-specific merge
