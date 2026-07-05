---
name: implement
description: "Implement a piece of work based on a plan task, PRD, or issue."
disable-model-invocation: true
---

Implement the work described by the user in the plan task, PRD, or issue.

For this repo, prefer `plans/active/<slug>/plan.md` plus the selected
`tasks/*.md` file as the working contract when they exist.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
