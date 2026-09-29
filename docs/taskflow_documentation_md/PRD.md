# Product Requirements Document — TaskFlow

## 1. Product Summary

TaskFlow is a single-user task management web application for organizing daily work, projects, priorities, deadlines, and progress in one clean interface.

The primary interaction is a **drag-and-drop Kanban board** with four default statuses:

1. To Do
2. In Progress
3. Review
4. Done

Users can also view tasks as a list or calendar, create projects, attach tags, add subtasks, set priority and due dates, search/filter tasks, and review productivity reports.

The application intentionally does **not** include role management, team management, multi-user collaboration, task assignment, or any assignee field in task/project flows.

---

## 2. Problem Statement

Personal task systems often fail because:

- task creation takes too many steps,
- users lose context between different projects,
- status updates are tedious,
- priorities and deadlines are visually unclear,
- a task list becomes too long and difficult to scan,
- progress is difficult to understand at a glance.

TaskFlow solves this by providing:

- fast task capture,
- visual Kanban workflow,
- drag-and-drop status updates,
- clear project/tag organization,
- searchable and filterable task views,
- deadline-focused calendar,
- compact productivity dashboard.

---

## 3. Target User

A single authenticated user who wants to manage their own:

- daily tasks,
- freelance/client work,
- personal projects,
- office work,
- development tasks,
- recurring routines.

No collaboration workflow is required.

---

## 4. Core Product Goals

### G1 — Fast Task Capture
A task should be creatable in a few seconds with only a title required.

### G2 — Clear Work Status
The user should understand current workload from the Kanban board without opening each task.

### G3 — Easy Prioritization
Priority, due date, project, and tags must be visible directly on task cards.

### G4 — Simple Status Movement
Moving work from one status to another must be possible by drag-and-drop.

### G5 — Find Tasks Quickly
Search, filter, sorting, project grouping, and status filters must remain fast even when task volume grows.

### G6 — Understand Progress
Dashboard and reports should show useful personal productivity information without becoming an analytics-heavy product.

---

## 5. Non-Goals

The first product version will not include:

- multi-user workspace,
- roles and permissions,
- task assignee,
- comments between users,
- chat,
- organization/team settings,
- billing/subscription,
- public project sharing,
- complex Gantt chart,
- AI task generation,
- AI scheduling.

These can be considered only if the product later changes from single-user to collaborative.

---

## 6. Technology Stack

### Backend
- Laravel 13
- PHP 8.4+
- MySQL
- Laravel Form Request validation
- Laravel policies only where useful for user ownership checks

### Frontend
- Laravel React Starter Kit
- Inertia.js
- React
- TypeScript
- Tailwind CSS
- Shadcn UI
- Sonner
- Lucide React icons
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `date-fns`
- Recharts through Shadcn Chart

### Typography
- Google Font: **Poppins**

---

## 7. Navigation Structure

Top navigation only. No sidebar.

### Primary Navigation

- Dashboard
- My Tasks
- Projects
- Calendar
- Reports

### Right-side Utilities

- Global search
- Notifications
- Quick Add Task
- User menu
  - Settings
  - Logout

---

## 8. Main Modules

### 8.1 Authentication

Required:

- login,
- logout,
- forgot password,
- reset password.

Optional later:

- Google OAuth.

Because this is a single-user system, registration can be disabled after the first account is created.

---

### 8.2 Dashboard

Purpose: provide an immediate overview.

Widgets:

- Total Tasks
- In Progress
- Completed
- Overdue
- Current Project Overview
- Upcoming Deadlines
- Recent Activity
- Task Completion trend
- Tasks by Project
- Priority distribution

The dashboard should prioritize operational information instead of decorative analytics.

---

### 8.3 My Tasks

Default page: **Board View**.

Views:

#### Board View
Columns:

- To Do
- In Progress
- Review
- Done

Features:

- drag task between columns,
- reorder tasks inside a column,
- quick add task,
- open task detail,
- status count,
- filters,
- search,
- project filter,
- priority filter,
- due date filter,
- tag filter.

#### List View

Columns:

- Task
- Project
- Priority
- Due Date
- Status
- Tags
- Actions

Features:

- search,
- sorting,
- pagination,
- filters,
- inline status change where appropriate.

#### Calendar View

Show tasks based on due date.

Features:

- monthly calendar,
- task count per date,
- click date to view tasks,
- click task to open detail,
- overdue indication.

---

## 9. Task Model

### Required Task Field
- title

### Form Conventions

- Every form control uses a clear contextual placeholder.
- Every required field uses a red `*` beside its label.
- No task or project form includes an assignee field.

### Optional Task Fields
- description
- project
- status
- priority
- start date
- due date
- tags
- subtasks
- attachments
- reminder

### Default Values
- status: To Do
- priority: Medium
- project: none
- due date: none

---

## 10. Task Status

Default statuses are fixed for MVP.

| Key | Label | Meaning |
|---|---|---|
| todo | To Do | Not started |
| in_progress | In Progress | Currently being worked on |
| review | Review | Waiting for personal review/check |
| done | Done | Completed |

When a task is moved to `done`:

- set `completed_at`,
- record an activity log.

When moved away from `done`:

- clear `completed_at`.

---

## 11. Priority

| Key | Label | Visual |
|---|---|---|
| low | Low | green |
| medium | Medium | orange |
| high | High | red |

Priority is independent from status.

---

## 12. Projects

A project groups related tasks.

Fields:

- name
- description
- color
- status
- start_date
- due_date

Project statuses:

- active
- archived

Features:

- CRUD,
- task count,
- progress count,
- overdue count,
- archive,
- project detail with tasks.

Deleting a project must not delete tasks automatically. Tasks can become projectless.

---

## 13. Tags

Tags provide flexible classification.

Features:

- create tag,
- edit name,
- edit color,
- delete tag,
- attach multiple tags to a task,
- filter tasks by tags.

---

## 14. Subtasks

A task can have multiple subtasks.

Features:

- create,
- rename,
- complete/uncomplete,
- reorder,
- delete.

Task card can show:

`2 / 5 subtasks completed`.

Completing all subtasks must not automatically complete the parent task.

---

## 15. Attachments

Supported types can initially include:

- images,
- PDF,
- common documents.

Recommended max size:

- 10 MB/file.

The attachment system is secondary to the task workflow and should be implemented after core task management is stable.

---

## 16. Reminder

A task can optionally have a reminder datetime.

MVP reminder channel:

- in-app notification.

Future option:

- email.

---

## 17. Search & Filters

### Search
Search against:

- task title,
- description.

### Filters
- status
- priority
- project
- tags
- due date
- overdue
- completed

### Sorting
- newest
- oldest
- due date ascending
- due date descending
- priority
- manual board order

Filter state should be represented in query parameters where useful.

---

## 18. Reports

The report module should remain compact.

Reports:

- tasks completed by period,
- tasks created by period,
- completion rate,
- overdue count,
- tasks by project,
- tasks by priority,
- average completion duration.

Filters:

- this week,
- this month,
- custom date range.

---

## 19. Settings

Sections:

### Profile
- name
- email
- avatar

### Preferences
- default task view: board/list/calendar
- first day of week
- date format
- timezone

### Task Defaults
- default priority
- default status

### Account
- change password
- logout other sessions if Laravel session management is enabled

---

## 20. Notifications

Use **Sonner**.

### Success — Green
Examples:
- Task created successfully.
- Task updated successfully.
- Task moved to In Progress.
- Project archived successfully.

### Error — Red
Examples:
- Failed to save task.
- Attachment upload failed.
- Unable to reorder task.

### Warning — Orange
Examples:
- Task is overdue.
- Project has incomplete tasks.
- Attachment exceeds maximum file size.

Avoid browser `alert()`.

---

## 21. Page Header Standard

Every main page must include:

1. Breadcrumb
2. H1 Title
3. One-line description
4. Contextual actions on the right

Example:

```text
Dashboard / My Tasks

My Tasks
Manage, prioritize, and track everything you need to complete.

[+ New Task]
```

---

## 22. Functional Requirements

### FR-01
User can create, edit, view, and delete a task.

### FR-02
User can move tasks between statuses using drag-and-drop.

### FR-03
User can reorder tasks in a status column.

### FR-04
Task order must persist after page reload.

### FR-05
User can manage projects.

### FR-06
User can manage tags.

### FR-07
User can add and reorder subtasks.

### FR-08
User can search tasks.

### FR-09
User can filter tasks.

### FR-10
User can view tasks in board, list, and calendar mode.

### FR-11
User can see overdue tasks clearly.

### FR-12
User can review dashboard metrics.

### FR-13
User can view personal reports.

### FR-14
User receives visual feedback through Sonner notifications.

### FR-15
Every task mutation is validated on the Laravel backend.

---

## 23. Non-Functional Requirements

### Performance
- Standard task pages should feel instant after initial load.
- Avoid fetching all historical tasks where pagination is more suitable.
- Use indexes for task status, project, due date, completion, and user ownership.
- Keep Inertia payloads focused.

### Security
- authentication required for private routes,
- CSRF protection,
- backend validation,
- file MIME validation,
- ownership scoping by `user_id`,
- no raw HTML output for user content,
- secure password handling through Laravel.

### Usability
- keyboard-accessible controls,
- visible focus states,
- drag-and-drop must have a non-drag fallback,
- no important information communicated only by color.

### Responsive
- desktop: full Kanban board,
- tablet: horizontally scrollable board,
- mobile: one status column at a time or horizontally scrollable board.

---

## 24. MVP Scope

MVP includes:

- authentication,
- app shell,
- dashboard basics,
- project CRUD,
- tag CRUD,
- task CRUD,
- subtasks,
- board drag-and-drop,
- list view,
- search/filter,
- calendar view,
- Sonner notifications,
- settings.

Post-MVP:

- attachments,
- activity log UI,
- reminders,
- advanced reports,
- recurring tasks,
- command palette/global quick search.

---

## 25. Definition of Done

A feature is considered done when:

- backend behavior works,
- validation exists,
- TypeScript types are correct,
- UI uses the design system,
- loading/empty/error states exist,
- success/error feedback uses Sonner,
- responsive behavior is checked,
- feature has at least core automated tests,
- no visible console errors remain.
