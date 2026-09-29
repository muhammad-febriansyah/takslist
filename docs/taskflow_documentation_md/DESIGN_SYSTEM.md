# Design System — TaskFlow Sage

> Source of truth for UI implementation. Based on supplied TaskFlow references: dashboard overview, task board, and authentication screen.

## 0. Product UI Contract

TaskFlow is a calm, single-user productivity workspace. UI must make task capture, prioritization, and progress scanning fast.

Non-negotiable decisions:

- light mode only; no theme toggle, dark palette, or `dark:` variant,
- Google Font Poppins,
- top navigation; no persistent sidebar,
- sage/emerald green as primary action color,
- task assignment is out of scope; never add assignee controls or `assigned_to` fields,
- `user_id` represents record ownership, not task assignment,
- Lucide SVG icons; no emoji as UI icons,
- white surfaces on a very soft green-tinted background.

Active product navigation is intentionally limited to three areas:

```text
Dashboard · Tasks · Calendar
```

Projects, Team, and Reports are out of active UI scope. Project remains a data relationship for task organization, not a primary navigation area.

### Reference Fidelity

| Reference | UI target | Implementation scope |
|---|---|---|
| Dashboard | greeting, metrics, project overview, deadlines, activity, charts | `/dashboard` |
| Task board | create-task panel, board/list controls, four status columns | Tasks experience |
| Calendar | private agenda grid, modal create form, date picker, color markers | `/calendar` |
| Auth | quiet split layout, task preview, focused login card | `/login`, `/register` |

Login intentionally has no application navbar. Auth layout owns brand and form presentation; application layout starts after authentication.

## 1. Design Direction

Visual character:

- clean,
- calm,
- modern,
- light mode,
- sage green accent,
- thin border,
- subtle shadow,
- clear spacing,
- no sidebar,
- desktop-first but responsive.

Signature visual: dense productivity information arranged inside quiet white surfaces, with sage state colors carrying hierarchy instead of heavy decoration.

Avoid:

- thick borders,
- dark heavy shadows,
- excessive gradients,
- giant rounded pills everywhere,
- glassmorphism,
- noisy illustrations,
- excessive dashboard cards,
- overly saturated green.

---

## 2. Typography

### Font
**Poppins**

Recommended weights:
- 400 — body
- 500 — labels/navigation
- 600 — section title/buttons
- 700 — large page title only where useful

### Suggested Scale

| Token | Size | Line Height | Weight |
|---|---:|---:|---:|
| Display | 36px | 44px | 700 |
| H1 | 28px | 36px | 700 |
| H2 | 22px | 30px | 600 |
| H3 | 18px | 26px | 600 |
| Body | 14px | 22px | 400 |
| Body Large | 16px | 24px | 400 |
| Small | 12px | 18px | 400 |
| Label | 13px | 20px | 500 |

Do not use overly tight line-height.

---

## 3. Sage Color Palette

### Primary

| Token | Hex |
|---|---|
| Sage 50 | `#F6F8F4` |
| Sage 100 | `#EDF2EA` |
| Sage 200 | `#DCE7D8` |
| Sage 300 | `#C4D6BF` |
| Sage 400 | `#9FBA98` |
| Sage 500 | `#7F9E78` |
| Sage 600 | `#64835F` |
| Sage 700 | `#4F684B` |
| Sage 800 | `#3D503A` |
| Sage 900 | `#2D3A2B` |

### Semantic / Neutral

| Token | Hex | Use |
|---|---|---|
| Background | `#F8FAF7` | app background |
| Surface | `#FFFFFF` | card |
| Surface Soft | `#F3F6F1` | subtle sections |
| Text | `#1F2921` | main text |
| Text Muted | `#6E796F` | secondary |
| Border | `#DDE5DA` | default border |
| Border Strong | `#CBD7C7` | interactive |
| Success | `#16A34A` | success state |
| Success Soft | `#ECFDF3` | success bg |
| Error | `#DC2626` | destructive/error |
| Error Soft | `#FEF2F2` | error bg |
| Warning | `#F59E0B` | warning |
| Warning Soft | `#FFF7E6` | warning bg |

---

## 4. Shadcn Theme Mapping

Recommended CSS variable direction:

```css
:root {
  --background: 100 20% 98%;
  --foreground: 135 14% 14%;

  --card: 0 0% 100%;
  --card-foreground: 135 14% 14%;

  --popover: 0 0% 100%;
  --popover-foreground: 135 14% 14%;

  --primary: 113 16% 44%;
  --primary-foreground: 0 0% 100%;

  --secondary: 102 19% 93%;
  --secondary-foreground: 112 16% 28%;

  --muted: 105 15% 95%;
  --muted-foreground: 120 6% 46%;

  --accent: 105 20% 92%;
  --accent-foreground: 112 16% 28%;

  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --border: 105 16% 88%;
  --input: 105 16% 88%;
  --ring: 113 16% 44%;

  --radius: 0.75rem;
}
```

Adjust final HSL values visually during implementation.

---

## 5. Spacing

Base grid: **4px**

Common spacing:
- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40

Page:
- desktop horizontal padding: 32px
- laptop: 24px
- mobile: 16px

Main content max width:
- `1440px` recommended

Content alignment:
- left-align page titles and task content,
- use a 12-column desktop grid for dashboard sections,
- reserve right rail for deadlines and activity,
- keep line lengths below 80 characters for explanatory copy.

---

## 6. Radius

Use moderately rounded corners.

| Component | Radius |
|---|---|
| Button | 10px |
| Input | 10px |
| Card | 12px |
| Dialog | 14px |
| Badge | 999px only when pill is appropriate |
| Task card | 10–12px |

Avoid turning every container into a pill.

---

## 7. Border

Default:

```text
1px solid #DDE5DA
```

Hover:

```text
#CBD7C7
```

Do not use 2–3px borders unless required for focus/drag state.

---

## 8. Shadow

Default card:

```css
box-shadow: 0 1px 2px rgba(31, 41, 33, 0.04);
```

Raised interactive card:

```css
box-shadow:
  0 8px 24px rgba(31, 41, 33, 0.08),
  0 2px 6px rgba(31, 41, 33, 0.05);
```

Dragged task card may use the raised shadow.

Do not use permanent heavy shadows.

---

## 9. Layout

### Top Navigation
Height:
- 64px desktop

Behavior:
- sticky top recommended,
- white/slightly translucent surface,
- bottom border.

### Main Page
Structure:

```text
Topbar
  ↓
Breadcrumb
Title + Description                         Actions
  ↓
Page Content
```

No sidebar.

### Dashboard Grid

```text
Topbar
  ↓
Greeting + date filter + primary action
  ↓
[Total] [In Progress] [Completed] [Overdue]
  ↓
[Project overview / board snapshot        ] [Upcoming deadlines]
[Project overview / board snapshot        ] [Recent activity    ]
  ↓
[Completion chart] [Tasks by project] [Team workload]
```

### Auth Grid

```text
Soft sage canvas
  ├─ Left: brand, promise, task preview (desktop only)
  └─ Right: focused form card
```

---

## 10. Mandatory Page Header Pattern

Every page must have:

### Breadcrumb
Example:
`Dashboard / My Tasks`

### Title
Example:
`My Tasks`

### Description
Example:
`Manage, prioritize, and track everything you need to complete.`

### Actions
Example:
`+ New Task`

Use a reusable `PageHeader` component.

---

## 11. Buttons

### Primary
- Sage 600
- white text

Hover:
- Sage 700

### Secondary
- Sage 100
- Sage 800 text

### Outline
- white surface
- border color
- dark text

### Ghost
- no border
- soft sage hover

### Destructive
- red

Button rules:
- use icon + text for important actions,
- icon-only buttons require Tooltip,
- minimum touch target ~40px.

---

## 12. Inputs

Use Shadcn:
- Input
- Textarea
- Select
- Checkbox
- RadioGroup
- Switch
- Calendar
- Popover
- Command

Form conventions:
- every form control includes a clear contextual placeholder,
- required fields show a red `*` beside the label,
- task and project forms never include an assignee field.

Required field:
- red `*`.

Error:
- red border,
- helper error text under input.

Do not rely on toast alone for form validation.

---

## 13. Task Status Visuals

### To Do
- neutral gray-green
- no strong emphasis

### In Progress
- sage green

### Review
- soft amber

### Done
- success green

### Overdue
- error red

Color must not be the only status indicator; always include text/icon.

---

## 14. Priority Visuals

### Low
- green flag
- `Low`

### Medium
- orange flag
- `Medium`

### High
- red flag
- `High`

Use Lucide `Flag`.

---

## 15. Kanban Board

### Column
- very soft tinted background,
- small status indicator,
- status name,
- task count,
- optional menu.

### Task Card
Contents:

```text
Title                               Drag Handle

[Project] [Tag]

Priority              Due Date

Subtasks progress if any
```

Guidelines:
- card white,
- 1px border,
- small shadow,
- clear hover state,
- 12–16px padding.

### Dragging
Dragged card:
- slight rotation optional, max 1–2 degrees,
- raised shadow,
- cursor grabbing.

Drop zone:
- Sage 100 background,
- Sage 500 dashed outline,
- clear placeholder area.

---

## 16. Board View Controls

Use:

```text
[Board View] [List View]   Drag & drop tasks...   [+ New Task]
```

Active tab:
- Sage 100 background,
- Sage 700 text,
- subtle border.

---

## 17. Cards

Use Shadcn Card.

Card anatomy:
- Header
- Title
- Description
- Content
- Footer when needed

Do not nest too many cards.

---

## 18. Data Table

Use Shadcn Data Table pattern.

Rules:
- header soft neutral,
- row height ~56–64px,
- subtle separator,
- hover background,
- pagination bottom,
- responsive horizontal scroll.

---

## 19. Badges

Use badges for:
- status,
- priority only if needed,
- tags,
- project labels.

Keep pastel backgrounds.

Avoid using badge for normal body text.

---

## 20. Sonner Notification System

### Success
Method:
```ts
toast.success("Task created successfully")
```

Visual:
- green icon/accent,
- light green surface if customized.

### Error
```ts
toast.error("Failed to save task")
```

Visual:
- red.

### Warning
```ts
toast.warning("This task is overdue")
```

Visual:
- orange.

### Info
Use sparingly.

Do not show a success toast for every tiny toggle if visual feedback is already obvious.

---

## 21. Icons

Use **Lucide React**.

Recommended icons:
- LayoutDashboard
- ListTodo
- FolderKanban
- CalendarDays
- ChartNoAxesCombined
- Plus
- Search
- Bell
- Settings
- LogOut
- GripVertical
- Flag
- Clock3
- Check
- Circle
- Paperclip
- Tags
- ChevronDown
- MoreHorizontal
- Trash2
- Pencil
- Archive

Keep icon stroke consistent.

---

## 22. Breadcrumb

Use Shadcn Breadcrumb.

Rules:
- muted previous items,
- current page dark,
- no unnecessary deep hierarchy.

Examples:

```text
Dashboard / My Tasks
Dashboard / Projects / Website Redesign
Dashboard / Settings
```

---

## 23. Modal Strategy

### Dialog
Use for:
- quick create,
- small forms,
- confirmations that need content.

### Sheet
Use for:
- task detail,
- mobile filters,
- mobile navigation.

### AlertDialog
Use for:
- delete task,
- irreversible destructive actions.

---

## 24. Responsive Strategy

### Desktop >= 1280
- full top navigation,
- 4-column board visible where possible.

### Tablet 768–1279
- compact top nav,
- board horizontally scrollable.

### Mobile < 768
- top menu collapsed,
- board horizontally scrollable or single-column focus,
- task detail full-screen Sheet,
- filters in Sheet.

### Breakpoint Behavior

| Width | Behavior |
|---|---|
| 1440px+ | Full top nav, four board columns, dashboard right rail |
| 1024–1439px | Compact nav, reduced page padding, board remains horizontal |
| 768–1023px | Hide secondary nav labels, stack dashboard rail below overview |
| <768px | Mobile menu, one-column dashboard, horizontal board scroll, full-width forms |

---

## 25. Accessibility

- visible keyboard focus ring,
- form fields have labels,
- icon-only buttons use Tooltip/aria-label,
- destructive actions clearly labeled,
- drag-and-drop has keyboard/fallback action,
- maintain WCAG-readable contrast.

---

## 26. Motion

Keep motion subtle.

Recommended:
- 150–200ms hover transitions,
- 180–250ms dialog/sheet,
- natural DnD transform.

Avoid excessive spring animations.

---

## 27. Reference Page Style

The implementation should visually reference the generated sage-green concepts:

- clean top navigation,
- sage active states,
- off-white page background,
- white content cards,
- subtle borders,
- compact dashboard cards,
- Kanban board as the primary task interface,
- visible drag interaction,
- no sidebar.

## 28. Page-Level Specs

### Dashboard

- title: `Good morning, {firstName}`,
- subtitle: `Here’s what’s happening with your projects today.`,
- date control aligned right on desktop,
- four metric cards with icon circle, value, delta, and comparison label,
- project overview uses status lanes: To Do, In Progress, Review, Done,
- overdue uses red only for urgency; do not tint entire page red,
- charts remain readable without relying on color alone.

### Tasks

- title: `Task Manager`,
- left create-task panel remains visible on desktop,
- fields: task title, priority, due date, tags, checklist/subtasks,
- no assignee field,
- board columns use status count and overflow menu,
- task cards show title, tags/project, priority, due date, and subtask progress,
- drag state uses dashed sage drop zone and raised card shadow,
- list view can begin as local UI state before backend wiring.

### Calendar

- calendar data is stored separately from tasks in `calendar_events`,
- each agenda belongs to authenticated user,
- each agenda uses user-selected hex color,
- create form opens in modal with shadcn Calendar + Popover.

### Login

- no dashboard navbar,
- no sidebar,
- no theme switcher,
- brand link at top of auth panel,
- title `Welcome back`,
- visible labels for email and password,
- remember-me and password-reset actions remain near password field,
- primary action uses sage button with clear loading state,
- optional social actions may appear below divider without competing with primary login.

## 29. Implementation Tokens

```css
:root {
  --taskflow-bg: #f8faf7;
  --taskflow-surface: #ffffff;
  --taskflow-surface-soft: #f3f8f5;
  --taskflow-ink: #173d30;
  --taskflow-muted: #71877b;
  --taskflow-border: #dfeae3;
  --taskflow-primary: #2d875c;
  --taskflow-primary-hover: #236d49;
  --taskflow-primary-soft: #eaf6ee;
  --taskflow-success: #2d9b68;
  --taskflow-warning: #e79b28;
  --taskflow-danger: #e34f4f;
}
```

Use semantic classes/tokens in components. Avoid scattering new raw hex values when token exists.
