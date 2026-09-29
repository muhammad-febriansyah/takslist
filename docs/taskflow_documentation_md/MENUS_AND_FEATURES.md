# Menus & Features — TaskFlow

## 1. Navigation Concept

Use a **top navigation bar only**.

Do not use a sidebar.

Desktop top bar:

```text
[Logo TaskFlow]
Dashboard
Tasks
Calendar

                         [Search] [Bell] [+ Task] [Profile]
```

Active product scope is limited to Dashboard, Tasks, and Calendar. Projects, Team, and Reports are not exposed in navigation.

Mobile:

```text
[Logo]                           [+] [Profile/Menu]
```

Primary routes can move into a Sheet/DropdownMenu on mobile.

---

## 2. Dashboard

### Route
`/dashboard`

### Page Header
**Breadcrumb**  
`Dashboard`

**Title**  
`Good morning, {name}`

**Description**  
`Here’s what’s happening with your tasks today.`

### Features
- Total Tasks
- In Progress
- Completed
- Overdue
- Project Overview
- Upcoming Deadlines
- Recent Activity
- Task Completion chart
- Tasks by Project chart
- Priority distribution
- Quick Add Task

### Shadcn
- Card
- Badge
- Button
- DropdownMenu
- Progress
- Chart
- Separator
- Tooltip
- Skeleton

---

## 3. Tasks

### Route
`/tasks`

### Page Header
**Breadcrumb**  
`Dashboard / Tasks`

**Title**  
`Tasks`

**Description**  
`Manage, prioritize, and track everything you need to complete.`

**Action**
`+ New Task`

### View Tabs
- Board View
- List View
- Calendar View

### Shared Filters
- Search
- Project
- Priority
- Status
- Tags
- Due date
- Overdue
- Clear filters

### Shadcn
- Tabs
- Button
- Input
- Select
- Popover
- Command
- Calendar
- Badge
- DropdownMenu
- Checkbox
- Sheet
- Dialog
- AlertDialog
- Tooltip
- ScrollArea
- Separator
- Skeleton

### Non-Shadcn behavior
- `@dnd-kit/core`
- `@dnd-kit/sortable`

---

## 4. Board View

### Columns
- To Do
- In Progress
- Review
- Done

### Task Card
Show:
- title,
- project,
- priority,
- due date,
- up to 2 tags,
- subtask progress,
- overdue state,
- drag handle.

### Card Actions
- Open detail
- Edit
- Duplicate — optional post-MVP
- Delete

### Board Behaviors
- drag between columns,
- reorder inside columns,
- horizontal board scrolling on smaller screens,
- loading placeholder during initial fetch,
- optimistic movement with rollback on server failure.

---

## 5. List View

### Columns
- checkbox optional
- Task
- Project
- Priority
- Due Date
- Status
- Tags
- Actions

### Features
- pagination,
- sorting,
- filters,
- search,
- quick status change,
- click row to view detail.

Use TanStack Table only if Shadcn Data Table implementation needs advanced sorting/filtering behavior.

---

## 6. Calendar

### Main Route
`/calendar`

### Page Header
**Breadcrumb**  
`Dashboard / Calendar`

**Title**  
`Calendar`

**Description**  
`See your private calendar agendas by date.`

### Features
- month navigation,
- today shortcut,
- private calendar agendas per date,
- color marker per agenda,
- click day to open create modal,
- shadcn date picker,
- color picker.

### Shadcn
- Calendar
- Popover
- Button
- Card
- Badge
- Sheet
- Select

---

## 7. Projects

### Route
`/projects`

### Page Header
**Breadcrumb**  
`Dashboard / Projects`

**Title**  
`Projects`

**Description**  
`Organize related tasks into focused workspaces.`

### Features
- create project,
- search project,
- active/archived tabs,
- progress,
- task count,
- overdue count,
- due date,
- archive.

### Project Detail Route
`/projects/{project}`

### Detail Features
- project info,
- edit project,
- project stats,
- related tasks,
- board/list switch,
- archive action.

### Shadcn
- Card
- Button
- Dialog
- Tabs
- Badge
- Progress
- DropdownMenu
- AlertDialog
- Input
- Textarea

---

## 8. Reports

### Route
`/reports`

### Page Header
**Breadcrumb**  
`Dashboard / Reports`

**Title**  
`Reports`

**Description**  
`Review task completion, workload, and productivity trends.`

### Features
- period filter,
- completion trend,
- created vs completed,
- tasks by project,
- tasks by priority,
- overdue tasks,
- completion rate.

### Shadcn
- Card
- Chart
- Select
- Calendar
- Popover
- Badge
- Skeleton

---

## 9. Global Search

### Trigger
Top bar search.

### Search Targets
- tasks,
- projects.

### Interaction
Recommended:
- `CommandDialog`
- debounce search after 250–350 ms,
- keyboard shortcut `⌘K` / `Ctrl+K`.

### Result sections
- Tasks
- Projects

Post-MVP if needed.

---

## 10. Notifications

### Trigger
Bell icon.

### In-App Notifications
- reminder due,
- overdue warning,
- system event if useful.

### Shadcn
- Popover
- ScrollArea
- Button
- Badge

Sonner remains for immediate action feedback.

---

## 11. Settings

### Route
`/settings`

### Page Header
**Breadcrumb**  
`Dashboard / Settings`

**Title**  
`Settings`

**Description**  
`Manage your profile and task preferences.`

### Sections
- Profile
- Preferences
- Task Defaults
- Security

### Shadcn
- Tabs
- Input
- Select
- Button
- Avatar
- Separator
- AlertDialog

---

## 12. Quick Add Task

Available from:
- top bar,
- dashboard,
- task board,
- calendar.

Recommended UI:
- Dialog on desktop,
- Sheet on smaller screens.

Required:
- title.

Optional expandable fields:
- project,
- priority,
- due date,
- tags.

The quick form must stay shorter than the full edit form.

---

## 13. Task Detail

Recommended first implementation:
- right-side Sheet on desktop,
- full-screen Sheet/Dialog on mobile.

Contents:
- title,
- status,
- priority,
- project,
- description,
- dates,
- tags,
- subtasks,
- attachments,
- activity history,
- reminder,
- delete action.

Actions:
- Edit
- Complete/Reopen
- Delete

---

## 14. Empty States

Required empty states:

### No Tasks
`No tasks yet. Create your first task to start organizing your work.`

### No Search Results
`No tasks match your search or filters.`

### No Projects
`Create a project to group related tasks.`

### No Calendar Tasks
`No tasks due on this date.`

Use simple iconography, not oversized illustrations.

---

## 15. Loading States

Use Shadcn `Skeleton`.

Do not replace the full application layout with a spinner.

Examples:
- KPI card skeleton,
- task-card skeleton,
- table-row skeleton,
- report chart skeleton.

---

## 16. Error States

Inline form errors:
- directly below field.

Page/data error:
- compact `Alert` or dedicated empty-state card.

Mutation errors:
- Sonner error toast.
