---
name: typescript-build-verify
description: Run TypeScript type checking and Next.js build verification for CitiGoo frontend and backend
---

# TypeScript Build Verification

This skill automates type checking and build verification for the CitiGoo platform.

## When to Use

- After making code changes
- Before committing PR
- When build errors occur
- Verifying compilation

## Workflow

### Step 1: TypeScript Type Check
```bash
# Backend (MedusaJS)
npx.cmd tsc --noEmit -p apps/medusa-backend/tsconfig.json

# Frontend (Next.js)
cd apps/frontend && npx tsc --noEmit
```

### Step 2: Build Verification
```bash
# Frontend build
cd apps/frontend && npx next build 2>&1 | grep -E "✓|Error|error" | head -10
```

### Step 3: Error Analysis
If errors found:
1. Read error messages
2. Identify affected files
3. Fix type issues
4. Re-run verification

### Step 4: Success Confirmation
```bash
# Verify clean build
npx next build 2>&1 | grep -E "Compiled|error" | grep -v "node_modules"
```

## Common Error Patterns

- **Type mismatch**: Check function signatures
- **Missing imports**: Verify module paths
- **Null/undefined**: Add null checks or type guards
- **Async issues**: Ensure proper await usage

## Example Usage

User: "Check if build passes"
→ Execute steps 1-4, report results

User: "Fix TypeScript errors"
→ Diagnose, fix, verify
