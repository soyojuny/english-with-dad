---
name: ewd-git-publish
description: Use when the user asks to commit, push, publish, or inspect git status for English With Dad changes.
---

# English With Dad Git Publish

Use the project git wrapper instead of hand-writing repeated git add, commit, and push command sequences.

## Commands

```powershell
npm run git:status
npm run git:commit -- "commit message"
npm run git:push
npm run git:publish -- "commit message"
```

If `npm` is not on PATH, use:

```powershell
C:\nvm4w\nodejs\npm.cmd run git:status
C:\nvm4w\nodejs\npm.cmd run git:commit -- "commit message"
C:\nvm4w\nodejs\npm.cmd run git:push
C:\nvm4w\nodejs\npm.cmd run git:publish -- "commit message"
```

## Rules

- This project uses direct `main` to `origin/main` pushes by default.
- Do not create a feature branch for normal publish work unless the user explicitly asks.
- Run `npm run git:status` before committing when the requested scope is not already obvious.
- Use `git:commit` when the user asks only to commit.
- Use `git:push` when the user asks only to push existing commits.
- Use `git:publish` when the user asks to commit and push together.
- Do not use destructive git commands in this workflow.
- Do not bypass the wrapper with ad hoc shell-composed git command chains unless the user explicitly asks for a different git operation.
