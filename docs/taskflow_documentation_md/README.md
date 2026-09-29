# TaskFlow — Documentation Index

> Working title: **TaskFlow**  
> Product type: **Single-user task management / tasklist web application**  
> UI direction: **Sage Green, light mode, top navigation only, no sidebar**  
> Main stack: **Laravel 13 + React + Inertia.js + TypeScript + Tailwind CSS + Shadcn UI**

## Documents

1. [PRD.md](./PRD.md) — Product Requirements Document.
2. [ERD.md](./ERD.md) — database model, relationships, indexes, and data rules.
3. [USER_GOALS.md](./USER_GOALS.md) — primary user goals and success outcomes.
4. [USER_STORIES.md](./USER_STORIES.md) — detailed user stories and acceptance criteria.
5. [MENUS_AND_FEATURES.md](./MENUS_AND_FEATURES.md) — top-bar menu structure and page-level features.
6. [TASKLIST.md](./TASKLIST.md) — implementation plan ordered from smaller/easier tasks to larger/complex tasks.
7. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — sage green design system, page rules, Shadcn components, Sonner notifications.
8. [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) — architecture, routes, validation, drag-and-drop behavior, performance, security.
9. [PAGE_SPEC.md](./PAGE_SPEC.md) — detailed page anatomy and UI component mapping.

## Product Principles

- Single-user only. No role, permission, organization, team, or assignee management.
- Fast task capture must be easier than opening a complex form.
- Task status is visually managed through a **drag-and-drop Kanban board**.
- Every major page must contain:
  - breadcrumb,
  - page title,
  - short description,
  - contextual action area.
- Use **Shadcn UI** components whenever an equivalent component exists.
- Use **Sonner** for feedback:
  - success = green,
  - error = red,
  - warning = orange.
- Use **Poppins** as the global font.
- Keep borders and shadows subtle.
- Avoid oversized gradients, excessively rounded cards, glassmorphism, and decorative UI that reduces readability.
