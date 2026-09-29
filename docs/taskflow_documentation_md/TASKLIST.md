# Development Tasklist — Small → Large

This tasklist is intentionally ordered from smaller/easier implementation work toward larger/more complex features.

Complexity:

- XS = very small
- S = small
- M = medium
- L = large
- XL = very large

---

# Phase 0 — Project Foundation

## T-001 — Install / Verify Starter Stack
**Complexity:** XS

- Laravel 13
- React
- Inertia.js
- TypeScript
- Tailwind CSS
- Shadcn UI

**Done when**
- app runs,
- TypeScript compiles,
- production build succeeds.

---

## T-002 — Install Poppins
**Complexity:** XS

- load Google Font Poppins,
- set as global font,
- define font family in theme.

**Done when**
- all app text uses Poppins.

---

## T-003 — Install Frontend Utility Packages
**Complexity:** XS

Install:
- Sonner
- Lucide React
- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`
- `date-fns`

Use Recharts via Shadcn Chart when report work begins.

---

## T-004 — Build Global Sage Theme Tokens
**Complexity:** S

Implement:
- primary,
- background,
- foreground,
- border,
- muted,
- success,
- error,
- warning,
- card,
- ring.

**Done when**
- Button, Input, Card, Badge, Select have consistent sage-green styling.

---

## T-005 — Configure Sonner
**Complexity:** XS

Rules:
- `toast.success()` = green,
- `toast.error()` = red,
- `toast.warning()` = orange.

**Done when**
- example success/error/warning actions render correctly.

---

# Phase 1 — App Shell

## T-006 — Top Navigation Layout
**Complexity:** S

Build:
- logo,
- Dashboard,
- My Tasks,
- Projects,
- Calendar,
- Reports,
- search placeholder,
- notification button,
- `+ Task`,
- profile dropdown.

No sidebar.

---

## T-007 — Responsive Mobile Navigation
**Complexity:** S

- collapse primary menu,
- use Sheet/DropdownMenu,
- preserve quick-add action.

---

## T-008 — Reusable PageHeader
**Complexity:** XS

Props:
- breadcrumb,
- title,
- description,
- actions.

Every main page must use it.

---

## T-009 — Reusable Breadcrumb Wrapper
**Complexity:** XS

Use Shadcn Breadcrumb.

---

## T-010 — Reusable Empty State
**Complexity:** XS

Support:
- icon,
- title,
- description,
- action.

---

## T-011 — Reusable Loading Skeletons
**Complexity:** S

Create:
- TaskCardSkeleton
- TableRowSkeleton
- DashboardStatSkeleton

---

# Phase 2 — Authentication & Settings Base

## T-012 — Login Styling
**Complexity:** S

Apply sage reference:
- clean split layout,
- subtle shadow,
- Poppins,
- primary green CTA.

---

## T-013 — Forgot/Reset Password Styling
**Complexity:** S

Match same design system.

---

## T-014 — Profile Settings
**Complexity:** S

- name,
- email,
- avatar optional.

---

# Phase 3 — Database Foundation

## T-015 — Projects Migration + Model
**Complexity:** S

Fields per ERD.

---

## T-016 — Tasks Migration + Model
**Complexity:** S

Fields per ERD.

---

## T-017 — Tags + Pivot Migration
**Complexity:** S

---

## T-018 — Subtasks Migration
**Complexity:** S

---

## T-019 — User Preferences Migration
**Complexity:** XS

---

## T-020 — Factories & Seeders
**Complexity:** S

Seed:
- example projects,
- 20–40 tasks,
- tags,
- subtasks.

Useful for UI development.

---

# Phase 4 — Projects

## T-021 — Project Index Page
**Complexity:** S

Features:
- cards/list,
- search,
- active/archive tabs,
- create project.

---

## T-022 — Create Project
**Complexity:** S

Use:
- Dialog,
- Input,
- Textarea,
- color selection,
- FormRequest.

---

## T-023 — Edit Project
**Complexity:** S

---

## T-024 — Archive Project
**Complexity:** XS

Use confirmation if appropriate.

---

## T-025 — Project Detail Page
**Complexity:** M

Show:
- metadata,
- progress,
- task counts,
- project tasks.

---

# Phase 5 — Tag Management

## T-026 — Tag CRUD
**Complexity:** S

Can live in Settings or inline task form management.

---

## T-027 — Task Tag Selector
**Complexity:** S

Use:
- Popover
- Command
- Badge

Support multiple tags.

---

# Phase 6 — Core Task CRUD

## T-028 — Basic Task Create
**Complexity:** S

Required:
- title only.

Defaults:
- todo,
- medium.

This is the first fully usable product milestone.

---

## T-029 — Task Edit Form
**Complexity:** M

Fields:
- title,
- description,
- project,
- status,
- priority,
- start date,
- due date,
- tags.

---

## T-030 — Delete Task
**Complexity:** XS

Use AlertDialog.

---

## T-031 — Task Detail Sheet
**Complexity:** M

Open without leaving board context.

---

## T-032 — Quick Add Task Dialog
**Complexity:** S

Fields:
- title,
- project,
- priority,
- due date.

---

# Phase 7 — Subtasks

## T-033 — Add Subtask
**Complexity:** S

---

## T-034 — Toggle Subtask Complete
**Complexity:** XS

---

## T-035 — Delete/Rename Subtask
**Complexity:** S

---

## T-036 — Reorder Subtasks
**Complexity:** M

Use DnD Kit.

---

# Phase 8 — Board UI

## T-037 — Static Kanban Columns
**Complexity:** S

Columns:
- To Do
- In Progress
- Review
- Done.

---

## T-038 — Reusable TaskCard
**Complexity:** S

Show:
- title,
- project,
- priority,
- due date,
- tags,
- subtask progress,
- drag handle.

---

## T-039 — Board Status Counts
**Complexity:** XS

---

## T-040 — Horizontal Responsive Board
**Complexity:** S

Tablet/mobile:
- horizontal ScrollArea,
- usable touch targets.

---

# Phase 9 — Drag & Drop Core

## T-041 — Drag Task Within Same Column
**Complexity:** M

- SortableContext,
- DragOverlay,
- local optimistic order.

---

## T-042 — Move Task Between Columns
**Complexity:** L

- status update,
- target insertion,
- visual target highlight.

---

## T-043 — Persist Board Ordering
**Complexity:** L

Backend endpoint:
- transaction,
- validate owned task IDs,
- update source and target order.

---

## T-044 — DnD Rollback on Failure
**Complexity:** M

If backend fails:
- restore previous board state,
- red Sonner error.

---

## T-045 — Done / Reopen Completion Rules
**Complexity:** S

- set/clear `completed_at`.

---

## T-046 — DnD Keyboard Accessibility
**Complexity:** M

Provide keyboard sensor/fallback.

---

# Phase 10 — Search, Filter, Sorting

## T-047 — Task Search
**Complexity:** S

- debounce 300 ms,
- title/description.

---

## T-048 — Project Filter
**Complexity:** XS

---

## T-049 — Priority Filter
**Complexity:** XS

---

## T-050 — Status Filter
**Complexity:** XS

---

## T-051 — Tag Filter
**Complexity:** S

---

## T-052 — Due Date / Overdue Filter
**Complexity:** S

---

## T-053 — Combined Filter Query
**Complexity:** M

Use Laravel query scope / query builder methods.

---

## T-054 — URL Query State
**Complexity:** M

Preserve useful filters across navigation/reload.

---

# Phase 11 — List View

## T-055 — Task List Table
**Complexity:** M

Use Shadcn Data Table pattern.

---

## T-056 — List Pagination
**Complexity:** S

Server-side pagination.

---

## T-057 — List Sorting
**Complexity:** S

- due date,
- newest,
- oldest,
- priority.

---

## T-058 — Quick Status Update
**Complexity:** S

Dropdown in row.

---

# Phase 12 — Calendar

## T-059 — Calendar Month Layout
**Complexity:** M

---

## T-060 — Show Tasks by Due Date
**Complexity:** M

---

## T-061 — Calendar Task Detail
**Complexity:** S

Click task -> Task Detail Sheet.

---

## T-062 — Calendar Filters
**Complexity:** S

Project/priority.

---

# Phase 13 — Dashboard

## T-063 — Dashboard KPI Queries
**Complexity:** M

- total,
- in progress,
- completed,
- overdue.

---

## T-064 — Upcoming Deadlines Widget
**Complexity:** S

---

## T-065 — Project Overview Widget
**Complexity:** M

---

## T-066 — Recent Activity Widget Base
**Complexity:** M

Requires activity log table.

---

## T-067 — Task Completion Chart
**Complexity:** M

Use Shadcn Chart.

---

## T-068 — Tasks by Project Chart
**Complexity:** M

---

# Phase 14 — Activity Logging

## T-069 — Activity Log Migration + Model
**Complexity:** S

---

## T-070 — Log Task Lifecycle Events
**Complexity:** M

- create,
- update,
- status change,
- complete,
- reopen,
- delete where useful.

---

## T-071 — Activity UI
**Complexity:** M

Show recent activity in task detail and dashboard.

---

# Phase 15 — Attachments

## T-072 — Attachment Migration
**Complexity:** XS

---

## T-073 — Upload Attachment
**Complexity:** M

- validate MIME,
- max 10 MB,
- store metadata.

---

## T-074 — Attachment List/Preview
**Complexity:** M

---

## T-075 — Delete Attachment
**Complexity:** S

Delete file + DB record safely.

---

# Phase 16 — Reminders & Notifications

## T-076 — Reminder Migration
**Complexity:** XS

---

## T-077 — Create/Edit Reminder
**Complexity:** M

---

## T-078 — Laravel Scheduled Reminder Check
**Complexity:** M

---

## T-079 — In-App Notification Bell
**Complexity:** L

- unread state,
- list,
- mark read.

---

# Phase 17 — Reports

## T-080 — Report Date Filter
**Complexity:** S

---

## T-081 — Completion Trend Report
**Complexity:** M

---

## T-082 — Created vs Completed Report
**Complexity:** M

---

## T-083 — Task by Project/Priority Reports
**Complexity:** M

---

## T-084 — Completion Duration Metric
**Complexity:** M

---

# Phase 18 — Preferences

## T-085 — Save Default Task View
**Complexity:** S

---

## T-086 — Save Default Priority
**Complexity:** XS

---

## T-087 — Timezone & Date Format
**Complexity:** M

---

# Phase 19 — Advanced / Larger Features

## T-088 — Global Command Search
**Complexity:** L

`⌘K / Ctrl+K`

Search:
- tasks,
- projects,
- quick actions.

---

## T-089 — Recurring Tasks
**Complexity:** XL

Examples:
- daily,
- weekdays,
- weekly,
- monthly,
- custom recurrence.

Must avoid duplicate generation.

---

## T-090 — Saved Filters
**Complexity:** L

Save reusable combinations of filters.

---

## T-091 — Task Dependencies
**Complexity:** XL

Only build if genuinely needed.

---

# Phase 20 — Hardening

## T-092 — Database Index Audit
**Complexity:** M

Use EXPLAIN on important queries.

---

## T-093 — Inertia Payload Audit
**Complexity:** M

Avoid sending unnecessary data.

---

## T-094 — Authorization Ownership Audit
**Complexity:** M

Every mutation must scope data to current user.

---

## T-095 — Feature Tests
**Complexity:** L

Cover:
- task CRUD,
- project CRUD,
- filters,
- DnD reorder endpoint,
- completion logic,
- attachment validation.

---

## T-096 — Responsive QA
**Complexity:** M

Widths:
- mobile,
- tablet,
- laptop,
- large desktop.

---

## T-097 — Accessibility QA
**Complexity:** M

- keyboard navigation,
- focus states,
- labels,
- contrast,
- DnD fallback.

---

## T-098 — Production Build & Deployment Checklist
**Complexity:** M

- environment,
- queue if used,
- scheduler,
- storage link/object storage,
- cache,
- DB migration,
- backup strategy.

---

# Recommended Milestones

## Milestone 1 — Usable Core
Complete:
T-001 through T-032

Result:
- authenticated app,
- projects,
- tags,
- task CRUD,
- quick create.

## Milestone 2 — Main Product Experience
Complete:
T-033 through T-058

Result:
- subtasks,
- Kanban,
- drag-and-drop,
- filters,
- list view.

## Milestone 3 — Planning Experience
Complete:
T-059 through T-071

Result:
- calendar,
- dashboard,
- activity.

## Milestone 4 — Productivity Extensions
Complete:
T-072 through T-087

Result:
- attachments,
- reminders,
- reports,
- preferences.

## Milestone 5 — Advanced
Complete only if needed:
T-088 onward.
