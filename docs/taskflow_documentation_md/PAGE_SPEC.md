# Page Specification — TaskFlow

## Global Layout

All authenticated pages use:

```text
AppLayout
├── TopNav
└── Main
    ├── PageHeader
    └── PageContent
```

No sidebar.

---

# 1. Login

## Purpose
Authenticate the single user.

## Layout
Two-column desktop:
- left: product value + task illustration/reference,
- right: login card.

Mobile:
- login card first,
- decorative content reduced/hidden.

## Components
- Card
- Input
- Label
- Checkbox
- Button
- Separator
- Sonner

## Visual
- sage green CTA,
- soft off-white background,
- thin border,
- subtle shadow.

---

# 2. Dashboard

## Breadcrumb
`Dashboard`

## Title
`Good morning, {name}`

## Description
`Here’s what’s happening with your tasks today.`

## Top Widgets
4 cards:
- Total Tasks
- In Progress
- Completed
- Overdue

## Main Grid
Left:
- Project Overview

Right:
- Upcoming Deadlines
- Recent Activity

Bottom:
- Task Completion
- Tasks by Project
- Priority Distribution

## Empty State
If no tasks:
- compact onboarding card,
- `Create your first task`.

---

# 3. My Tasks — Board

## Breadcrumb
`Dashboard / My Tasks`

## Title
`My Tasks`

## Description
`Manage, prioritize, and track everything you need to complete.`

## Header Actions
- New Task

## Toolbar

Left:
- Board View
- List View
- Calendar View

Center/Right:
- Search
- Filters
- Clear

Hint:
`Drag & drop tasks to update status`

## Board
Columns:
- To Do
- In Progress
- Review
- Done

## Column Header
- status icon
- status title
- count
- more menu

## Task Card
- title
- project badge
- tags
- priority
- due date
- subtask count
- drag handle

## DnD States

### Idle
Normal card.

### Hover
Border becomes slightly stronger.

### Dragging
- lifted shadow,
- opacity ~95%,
- cursor grabbing.

### Valid Drop
- Sage 100 background,
- Sage 500 dashed border.

### Saving
Do not freeze whole board.

### Error
Rollback + red Sonner.

---

# 4. My Tasks — List

## Same Header
Use same breadcrumb/title/description.

## Filters
Same as board.

## Table
Columns:
- Task
- Project
- Priority
- Due Date
- Status
- Tags
- Actions

## Footer
- result count,
- pagination.

---

# 5. My Tasks — Calendar View

## Same Header

## Calendar Controls
- previous month
- month/year
- next month
- Today

## Date Cell
- day number
- max visible task chips,
- `+N more` when overflow.

---

# 6. Projects

## Breadcrumb
`Dashboard / Projects`

## Title
`Projects`

## Description
`Organize related tasks into focused workspaces.`

## Actions
`+ New Project`

## Controls
- search
- Active / Archived tabs

## Project Card
- color marker
- name
- description
- progress
- active tasks
- overdue
- due date
- menu

---

# 7. Project Detail

## Breadcrumb
`Dashboard / Projects / {Project Name}`

## Title
Project name.

## Description
Project description.

## Actions
- Edit
- Archive

## Stats
- Total tasks
- In Progress
- Done
- Overdue

## Task Section
- Board/List tabs
- project task filters.

---

# 8. Calendar

## Breadcrumb
`Dashboard / Calendar`

## Title
`Calendar`

## Description
`See your deadlines and planned work by date.`

## Actions
- Today
- Month selector

## Secondary Filters
- Project
- Priority

---

# 9. Reports

## Breadcrumb
`Dashboard / Reports`

## Title
`Reports`

## Description
`Review task completion, workload, and productivity trends.`

## Date Control
- This Week
- This Month
- Custom

## Cards
- Completion Rate
- Completed
- Created
- Overdue

## Charts
- Completion trend
- Tasks by project
- Tasks by priority

---

# 10. Settings

## Breadcrumb
`Dashboard / Settings`

## Title
`Settings`

## Description
`Manage your profile and task preferences.`

## Tabs
- Profile
- Preferences
- Security

## Preferences
- default task view,
- default priority,
- timezone,
- date format,
- week starts on.

---

# 11. Quick Task Dialog

## Required
- title

## Optional
- project
- priority
- due date

## Actions
- Create Task
- Cancel

## UX Rule
Do not turn Quick Add into the full form.

---

# 12. Task Detail Sheet

## Header
- task title
- status
- actions menu

## Main
- description
- project
- priority
- dates
- tags

## Sections
- subtasks
- attachments
- reminder
- activity

## Footer/Actions
- Save when editing
- Delete task

---

# 13. Full Task Edit Form

Use either:
- dedicated page, or
- large Sheet.

Recommended MVP:
large right Sheet on desktop.

Fields:
- title
- description
- project
- status
- priority
- start date
- due date
- tags
- subtasks
- reminder
- attachments

---

# 14. Global Search

Use Shadcn `CommandDialog`.

Trigger:
- top bar search
- `⌘K` / `Ctrl+K`

Sections:
- Tasks
- Projects
- Quick Actions

Examples:
- New Task
- Go to Calendar
- Open Reports

Recommended post-MVP.
