# User Stories — TaskFlow

## Authentication

### US-AUTH-01 — Login
As a user, I want to log in securely so that my tasks remain private.

**Acceptance Criteria**
- valid credentials open the dashboard,
- invalid credentials show an error,
- loading state prevents duplicate submission,
- error feedback is clear,
- logout is available in the user menu.

---

## Dashboard

### US-DASH-01 — View Summary
As a user, I want to see a summary of my tasks so I can quickly understand my workload.

**Acceptance Criteria**
- total task count is shown,
- in-progress count is shown,
- completed count is shown,
- overdue count is shown,
- values are scoped to the authenticated user.

### US-DASH-02 — View Upcoming Deadlines
As a user, I want to see upcoming deadlines so I know what needs attention.

**Acceptance Criteria**
- sorted nearest-first,
- overdue is visually distinct,
- clicking a task opens its detail.

---

## Task Creation

### US-TASK-01 — Quick Create
As a user, I want to create a task by entering only a title so I can capture work quickly.

**Acceptance Criteria**
- title is required,
- default status is To Do,
- default priority is Medium,
- task appears immediately after successful creation,
- green success Sonner is shown.

### US-TASK-02 — Detailed Create
As a user, I want to add details such as project, due date, tags, and subtasks.

**Acceptance Criteria**
- optional fields can remain empty,
- Laravel validates all fields,
- server validation errors render next to relevant fields,
- invalid data is never persisted.

---

## Task Management

### US-TASK-03 — Edit Task
As a user, I want to edit a task so information stays current.

**Acceptance Criteria**
- all editable fields are prefilled,
- save updates the record,
- success feedback uses green Sonner.

### US-TASK-04 — Delete Task
As a user, I want to delete an unwanted task.

**Acceptance Criteria**
- destructive action uses AlertDialog,
- cancel keeps data unchanged,
- confirm deletes task,
- success message shown.

### US-TASK-05 — Open Task Detail
As a user, I want to inspect task information without losing board context.

**Acceptance Criteria**
- task detail opens using Sheet/Dialog or dedicated page depending on screen size,
- current task data is visible,
- user can edit from detail.

---

## Drag & Drop

### US-DND-01 — Move Between Statuses
As a user, I want to drag a task to another column so I can update status naturally.

**Acceptance Criteria**
- active card visibly lifts,
- valid target column highlights,
- drop updates status,
- update persists after refresh,
- failed update rolls UI back,
- error Sonner is red.

### US-DND-02 — Reorder Within Column
As a user, I want to reorder tasks inside a status column.

**Acceptance Criteria**
- tasks can be reordered,
- order persists after refresh,
- source and target ordering remains deterministic.

### US-DND-03 — Complete Task
As a user, I want dropping a task into Done to complete it.

**Acceptance Criteria**
- status becomes done,
- `completed_at` is set,
- UI reflects completion.

### US-DND-04 — Reopen Task
As a user, I want to move a completed task out of Done.

**Acceptance Criteria**
- new status is persisted,
- `completed_at` becomes null.

---

## Projects

### US-PROJ-01 — Create Project
As a user, I want to create projects to group related tasks.

**Acceptance Criteria**
- name required,
- color optional,
- successful creation shown via Sonner.

### US-PROJ-02 — Open Project
As a user, I want to view project details and its tasks.

**Acceptance Criteria**
- project metadata shown,
- task count shown,
- active/completed/overdue information shown,
- tasks can be filtered within project.

### US-PROJ-03 — Archive Project
As a user, I want to archive inactive projects.

**Acceptance Criteria**
- archived project disappears from default active list,
- project tasks are preserved.

---

## Tags

### US-TAG-01 — Manage Tags
As a user, I want reusable tags to classify tasks.

**Acceptance Criteria**
- create/edit/delete supported,
- duplicate tag names for same user are rejected,
- tags have optional colors.

### US-TAG-02 — Filter by Tag
As a user, I want to filter tasks by one or more tags.

**Acceptance Criteria**
- selected tag appears in filter state,
- clear filter restores results.

---

## Subtasks

### US-SUB-01 — Add Subtask
As a user, I want to break a task into smaller steps.

**Acceptance Criteria**
- subtask title required,
- subtask appears immediately after save.

### US-SUB-02 — Complete Subtask
As a user, I want to check off a subtask.

**Acceptance Criteria**
- state persists,
- progress count updates.

### US-SUB-03 — Reorder Subtasks
As a user, I want to reorder subtasks.

**Acceptance Criteria**
- drag handle available,
- order persists.

---

## Search & Filters

### US-FILTER-01 — Search Tasks
As a user, I want to search by task title or description.

**Acceptance Criteria**
- debounced input,
- search query reflected in URL where practical,
- empty state shown for no results.

### US-FILTER-02 — Filter Tasks
As a user, I want to filter by status, priority, project, tags, and due date.

**Acceptance Criteria**
- filters can combine,
- filter chips are removable,
- clear all action exists.

### US-FILTER-03 — Sort Tasks
As a user, I want to sort list view by meaningful fields.

**Acceptance Criteria**
- due date,
- newest,
- oldest,
- priority supported.

---

## Views

### US-VIEW-01 — Board View
As a user, I want a Kanban view for workflow management.

### US-VIEW-02 — List View
As a user, I want a compact list when I need to scan many tasks.

### US-VIEW-03 — Calendar View
As a user, I want to see tasks by deadline.

**Acceptance Criteria**
- switching views preserves relevant filters,
- preferred default view can be saved.

---

## Attachments

### US-ATT-01 — Upload Attachment
As a user, I want to attach a file to a task.

**Acceptance Criteria**
- size/type validated,
- upload progress/loading state visible,
- invalid upload shows red Sonner.

### US-ATT-02 — Delete Attachment
As a user, I want to remove attachments I no longer need.

**Acceptance Criteria**
- confirmation required if needed,
- storage file and DB record are removed safely.

---

## Reminders

### US-REM-01 — Create Reminder
As a user, I want a reminder before a task is due.

**Acceptance Criteria**
- reminder datetime must be valid,
- pending reminder is persisted,
- in-app notification appears when due.

---

## Reports

### US-REP-01 — View Completion Trend
As a user, I want to see completed tasks over time.

### US-REP-02 — View Project Distribution
As a user, I want to see which projects contain the most work.

### US-REP-03 — Filter Reports by Period
As a user, I want weekly/monthly/custom report ranges.

---

## Settings

### US-SET-01 — Change Default Task View
As a user, I want the app to open tasks using my preferred view.

### US-SET-02 — Change Default Priority
As a user, I want new tasks to use my preferred default priority.

### US-SET-03 — Change Timezone/Date Format
As a user, I want dates displayed in my local preference.
