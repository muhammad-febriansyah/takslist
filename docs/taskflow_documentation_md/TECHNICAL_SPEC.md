# Technical Specification — TaskFlow

## 1. Architecture

```text
Browser
  ↓
React + TypeScript
  ↓
Inertia.js
  ↓
Laravel 13 Controllers / Actions
  ↓
Form Requests / Services
  ↓
Eloquent
  ↓
MySQL
```

No separate REST API is required for the standard web app.

Use JSON endpoints only where interaction quality benefits significantly, such as drag-and-drop reorder if preferred.

---

## 2. Frontend Structure

Suggested:

```text
resources/js/
├── components/
│   ├── app/
│   │   ├── top-nav.tsx
│   │   ├── page-header.tsx
│   │   ├── empty-state.tsx
│   │   └── quick-task-dialog.tsx
│   ├── tasks/
│   │   ├── task-card.tsx
│   │   ├── task-board.tsx
│   │   ├── task-column.tsx
│   │   ├── task-form.tsx
│   │   ├── task-detail-sheet.tsx
│   │   ├── task-filters.tsx
│   │   └── task-table.tsx
│   ├── projects/
│   └── ui/
├── layouts/
│   └── app-layout.tsx
├── pages/
│   ├── dashboard.tsx
│   ├── tasks/
│   ├── projects/
│   ├── calendar/
│   ├── reports/
│   └── settings/
├── types/
└── lib/
```

---

## 3. Backend Structure

Suggested:

```text
app/
├── Actions/
│   └── Tasks/
├── Http/
│   ├── Controllers/
│   └── Requests/
├── Models/
├── Policies/
├── Queries/
├── Services/
└── Support/
```

Do not over-engineer initially.

A practical split:

- Controller = request orchestration
- FormRequest = validation
- Query object/scopes = filters
- Action/Service = non-trivial reorder/completion logic

---

## 4. Main Routes

Example:

```php
Route::middleware(['auth'])->group(function () {
    Route::get('/dashboard', DashboardController::class)->name('dashboard');

    Route::resource('projects', ProjectController::class);

    Route::get('/tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::get('/tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
    Route::patch('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

    Route::patch('/tasks/reorder', TaskReorderController::class)
        ->name('tasks.reorder');

    Route::post('/tasks/{task}/subtasks', [SubtaskController::class, 'store']);
    Route::patch('/subtasks/{subtask}', [SubtaskController::class, 'update']);
    Route::delete('/subtasks/{subtask}', [SubtaskController::class, 'destroy']);

    Route::get('/calendar', CalendarController::class)->name('calendar');
    Route::get('/reports', ReportController::class)->name('reports');
});
```

Ordering route should be declared before conflicting wildcard routes if needed.

---

## 5. Validation

Canonical validation must remain on Laravel.

### StoreTaskRequest

Recommended:

```text
title:
  required|string|max:200

description:
  nullable|string|max:10000

project_id:
  nullable|integer|exists:projects,id
  plus ownership validation

status:
  required|in:todo,in_progress,review,done

priority:
  required|in:low,medium,high

start_date:
  nullable|date

due_date:
  nullable|date

tags:
  array

tags.*:
  integer
  owned by current user
```

Do not trust IDs from client.

---

## 6. Ownership

Every query must be scoped.

Example:

```php
Task::query()
    ->whereBelongsTo($request->user())
```

For project:

```php
Project::query()
    ->whereBelongsTo($request->user())
```

Policies are still useful even with one user because they protect against direct ID tampering.

---

## 7. Task Query Filters

Recommended query object or scopes:

```text
search
status
priority
project_id
tag_ids
due_from
due_to
overdue
completed
sort
```

Search:

```sql
WHERE title LIKE ?
   OR description LIKE ?
```

Add full-text only if needed later.

---

## 8. Drag-and-Drop Implementation

Frontend:
- `DndContext`
- `SortableContext`
- `DragOverlay`
- pointer sensor
- keyboard sensor

State strategy:

1. Save current board state.
2. Apply optimistic movement.
3. Send reorder request.
4. On success: keep state.
5. On failure:
   - rollback previous state,
   - show red Sonner.

---

## 9. Reorder Payload

Example:

```json
{
  "task_id": 52,
  "from_status": "todo",
  "to_status": "in_progress",
  "ordered_task_ids": {
    "todo": [11, 18, 27],
    "in_progress": [44, 52, 61]
  }
}
```

Backend must:
- validate task IDs belong to user,
- validate statuses,
- wrap updates in transaction,
- update `sort_order`,
- update `completed_at` rules.

Do not accept arbitrary user ownership from payload.

---

## 10. Reorder Transaction

Pseudo flow:

```text
BEGIN

verify dragged task ownership
verify all affected task IDs ownership
update dragged task status

for source list:
  update sort_order

for target list:
  update sort_order

if target=done:
  set completed_at

if leaving done:
  clear completed_at

insert activity log

COMMIT
```

On failure:
`ROLLBACK`.

---

## 11. Inertia Data Strategy

Avoid returning every relation everywhere.

Task board card needs only:

```text
id
title
status
priority
due_date
sort_order
project: id,name,color
tags: limited fields
subtasks_count
subtasks_completed_count
is_overdue
```

Task detail can fetch:
- description,
- all subtasks,
- attachments,
- activity,
- reminder.

This keeps board payload smaller.

---

## 12. Shared Props

Keep shared props minimal:

```text
auth.user
flash
app name
```

Avoid sharing all projects/tags globally unless required.

---

## 13. Flash + Sonner

Server can return flash:

```php
return back()->with('success', 'Task created successfully.');
```

React app layout can map:

```text
success -> toast.success
error -> toast.error
warning -> toast.warning
```

For local optimistic actions, Sonner may be triggered directly.

---

## 14. Date Handling

Store:
- dates as `date`,
- reminder/completion timestamps in DB timezone/UTC strategy.

Display:
- user preference,
- default timezone `Asia/Jakarta`.

Use:
- `date-fns` on frontend.

Be explicit about timezone for reminder timestamps.

---

## 15. Attachments

Recommended initial storage:
- Laravel filesystem.

Validation:
- max 10 MB,
- MIME whitelist.

Store:
- original filename,
- generated path,
- MIME,
- size,
- disk.

Never trust uploaded filename as storage path.

---

## 16. Scheduler

Reminders require Laravel scheduler.

Example:

```text
everyMinute:
  find pending reminders <= now
  create in-app notification
  mark sent_at
```

Avoid duplicate sends with transaction/locking.

---

## 17. Dashboard Queries

Do not load full task collections just to count.

Use aggregate queries:

```text
count total
count status=in_progress
count status=done
count overdue
```

Upcoming deadline:
- due date not null,
- status != done,
- order due_date,
- limit 5–10.

---

## 18. Reports

Use SQL aggregation where possible.

Examples:

```text
DATE(completed_at)
COUNT(*)

GROUP BY project_id

GROUP BY priority
```

Avoid calculating all analytics in React.

---

## 19. Performance

### Required indexes
See `ERD.md`.

### Additional rules
- eager load project/tags when card requires them,
- avoid N+1,
- paginate list view,
- dashboard widgets should use aggregate queries,
- cache only after measuring real bottlenecks.

---

## 20. Security Checklist

- auth middleware,
- CSRF,
- FormRequest,
- ownership scope,
- file MIME validation,
- XSS-safe React rendering,
- password hashing through Laravel,
- rate limit login,
- session regeneration after login,
- destructive actions protected.

---

## 21. Testing Strategy

### Feature Tests
- login required,
- task create/update/delete,
- project ownership,
- tag ownership,
- subtask behavior,
- reorder,
- completed_at,
- filter combinations,
- upload validation.

### Unit Tests
Use only where application logic is isolated enough to justify them.

### Browser/E2E — later
Good targets:
- DnD flow,
- quick create,
- filter persistence.

---

## 22. Code Quality

Recommended:
- Laravel Pint
- Larastan if already part of the project
- ESLint
- TypeScript strictness
- Prettier if desired

Do not introduce unnecessary abstractions before core workflows stabilize.
