import { Form, Head, router, usePage } from '@inertiajs/react';
import { columnFilteringFeature, createColumnHelper, globalFilteringFeature, tableFeatures, useTable } from '@tanstack/react-table';
import {
    type FormEvent,
    type PointerEvent as ReactPointerEvent,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    CalendarDays,
    ClipboardList,
    Download,
    Eraser,
    Flag,
    GripVertical,
    List,
    Maximize2,
    MoreHorizontal,
    Pencil,
    PenLine,
    Plus,
    Search,
    SlidersHorizontal,
    SquareKanban,
    Ticket,
    Trash2,
    Minimize2,
} from 'lucide-react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Auth } from '@/types/auth';
import {
    index as tasksIndex,
    reorder as reorderTasks,
    store as storeTask,
    update as updateTask,
    destroy as destroyTask,
    bulkDestroy as bulkDestroyTasks,
} from '@/routes/tasks';
import { timesheet as exportTimesheet } from '@/routes/tasks/export';
import { store as storeTimesheetSubmission } from '@/routes/tasks/timesheet-submissions';
import osticketRoutes from '@/routes/tasks/osticket';

type Task = {
    id: number;
    title: string;
    owner: { id: number; name: string } | null;
    supervisor: { id: number; name: string } | null;
    can_edit: boolean;
    can_submit_review: boolean;
    description: string | null;
    status: 'todo' | 'in_progress' | 'review' | 'done';
    priority: 'low' | 'medium' | 'high';
    start_date: string | null;
    due_date: string | null;
    project: { name: string; color: string | null } | null;
    tags: Array<{ name: string; color: string | null }>;
    subtasks: { total: number; completed: number };
    review: {
        id: number;
        status: 'pending' | 'approved' | 'rejected';
        submitted_at: string | null;
        signed_at: string | null;
        reviewer: { id: number; name: string } | null;
        signature_url: string | null;
    } | null;
};

type Props = {
    tasks: Task[];
    search?: string;
    user_id?: number | null;
    period?: string;
    users?: Array<{ id: number; name: string }>;
    export_approver?: { id: number; name: string; role: 'admin' | 'atasan' | 'bawahan'; position: string | null } | null;
    submission_search?: string;
    submission_status?: string;
    timesheet_submission_periods?: string[];
    timesheet_submissions?: {
        data: TimesheetSubmission[];
        current_page: number;
        last_page: number;
        from: number | null;
        to: number | null;
        total: number;
    };
};

type TimesheetSubmission = {
    id: number;
    period: string;
    status: 'pending' | 'approved' | 'rejected';
    department: string;
    client: string | null;
    approved_by: string;
    approved_role: string | null;
    has_signature: boolean;
    submitted_at: string | null;
    can_download: boolean;
};

type OsticketTicket = {
    ticket_id: number;
    ticket_number: string;
    created_at: string;
    status: string;
    status_label: string;
    subject: string;
    description: string;
    assigned_to: string;
};

type OsticketPreview = {
    configured: boolean;
    user_name: string;
    matched_staff: { staff_id: number; name: string; score: number } | null;
    candidates: Array<{ staff_id: number; name: string; score: number }>;
    tickets: OsticketTicket[];
};

const tasksTableFeatures = tableFeatures({ columnFilteringFeature, globalFilteringFeature });
type TasksTableFeatures = typeof tasksTableFeatures;
const taskColumnHelper = createColumnHelper<TasksTableFeatures, Task>();
const submissionsTableFeatures = tableFeatures({});
type SubmissionsTableFeatures = typeof submissionsTableFeatures;
const submissionColumnHelper = createColumnHelper<SubmissionsTableFeatures, TimesheetSubmission>();

const columns = [
    { key: 'todo', label: 'Belum dikerjakan', tone: 'bg-[#f1f5f2]', dot: 'bg-[#8b9b92]' },
    {
        key: 'in_progress',
        label: 'Sedang dikerjakan',
        tone: 'bg-[#f1f7fc]',
        dot: 'bg-[#4f7cac]',
    },
    {
        key: 'review',
        label: 'Menunggu review',
        tone: 'bg-[#fff8e8]',
        dot: 'bg-[#d8a23c]',
    },
    { key: 'done', label: 'Selesai', tone: 'bg-[#eaf6ee]', dot: 'bg-[#2d875c]' },
] as const;

const priorityStyles = {
    low: { label: 'Rendah', color: 'text-[#2d875c]' },
    medium: { label: 'Sedang', color: 'text-[#d88b20]' },
    high: { label: 'Tinggi', color: 'text-[#d44f4f]' },
};

const taskStatusStyles = {
    todo: 'border-[#d8e3de] border-l-[#8b9b92] bg-[#fbfcfb]',
    in_progress: 'border-[#b9d6ed] border-l-[#4f7cac] bg-[#f3f8fc]',
    review: 'border-[#ecd9a4] border-l-[#d8a23c] bg-[#fffaf2]',
    done: 'border-[#a9d7b9] border-l-[#2d875c] bg-[#f1faf4]',
};

const submissionStatusLabels = {
    pending: 'Menunggu approval',
    approved: 'Approved',
    rejected: 'Rejected',
} satisfies Record<TimesheetSubmission['status'], string>;

const submissionStatusClasses = {
    pending: 'bg-[#fff8e8] text-[#9a6720]',
    approved: 'bg-[#eaf6ee] text-[#236d49]',
    rejected: 'bg-[#fff0f0] text-[#c45c5c]',
} satisfies Record<TimesheetSubmission['status'], string>;

function formatDate(date: string | null): string {
    if (!date) {
        return 'Tanpa tanggal';
    }

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${date}T00:00:00`));
}

function getTodayValue(): string {
    const today = new Date();

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function formatMonth(period: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(new Date(`${period.slice(0, 7)}-01T00:00:00`));
}

function taskDescriptionPreview(description: string | null): string | null {
    const value = description?.trim() ?? '';

    if (value === '') {
        return null;
    }

    const marker = 'Deskripsi:';
    const markerIndex = value.indexOf(marker);

    return (markerIndex >= 0 ? value.slice(markerIndex + marker.length) : value).trim() || null;
}

function TaskCard({
    task,
    isDragging,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    isDragOver,
    isSelected,
    onToggleSelect,
    onEdit,
    onDelete,
    canEdit,
}: {
    task: Task;
    isDragging: boolean;
    onDragStart: (taskId: number) => void;
    onDragEnd: () => void;
    onDragOver: (taskId: number) => void;
    onDrop: (taskId: number) => void;
    isDragOver: boolean;
    isSelected: boolean;
    onToggleSelect: (taskId: number) => void;
    onEdit: (task: Task) => void;
    onDelete: (task: Task) => void;
    canEdit: boolean;
}) {
    const priority = priorityStyles[task.priority];
    const description = taskDescriptionPreview(task.description);
    const progress =
        task.subtasks.total > 0
            ? `${Math.round((task.subtasks.completed / task.subtasks.total) * 100)}%`
            : null;

    return (
        <article
            draggable={canEdit}
            onDragStart={() => canEdit && onDragStart(task.id)}
            onDragEnd={onDragEnd}
            onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDragOver(task.id);
            }}
            onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (canEdit) {
                    onDrop(task.id);
                }
            }}
            className={`group cursor-grab rounded-xl border border-l-4 p-4 shadow-[0_1px_2px_rgba(23,61,48,0.03)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(23,61,48,0.08)] active:cursor-grabbing ${taskStatusStyles[task.status]} ${isDragging ? 'scale-[0.98] opacity-45' : ''} ${isDragOver ? 'ring-2 ring-[#2d875c] ring-offset-2' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(task.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Pilih ${task.title}`}
                        disabled={!canEdit}
                        className="mt-0.5 size-4 shrink-0 accent-[#2d875c]"
                    />
                    <div className="min-w-0 flex-1">
                        <h3 className="text-sm leading-5 font-semibold text-[#173d30]">
                            {task.title}
                        </h3>
                    </div>
                </div>
                <div hidden={!canEdit} className="flex shrink-0 items-center gap-1 opacity-70 transition group-hover:opacity-100">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onEdit(task);
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-[#eaf4fb] px-2 text-[10px] font-semibold text-[#3f79ad] hover:bg-[#dcecf9]"
                        aria-label={`Edit ${task.title}`}
                    >
                        <Pencil className="size-3" /> Edit
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(task);
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded-md bg-[#fff0f0] px-2 text-[10px] font-semibold text-[#c45c5c] hover:bg-[#ffe1e1]"
                        aria-label={`Hapus ${task.title}`}
                    >
                        <Trash2 className="size-3" /> Hapus
                    </button>
                </div>
            </div>
            {description && (
                <div className="mt-3 rounded-lg border border-[#eef3ef] bg-white/60 px-3 py-2.5">
                    <p className="whitespace-pre-line break-words text-sm leading-6 text-[#557067]">
                        {description}
                    </p>
                </div>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {task.project && (
                    <span className="rounded-md bg-[#edf8f1] px-2 py-1 text-[11px] font-medium text-[#367554]">
                        {task.project.name}
                    </span>
                )}
                {task.tags.map((tag) => (
                    <span
                        key={tag.name}
                        className="rounded-md bg-[#f3f8f5] px-2 py-1 text-[11px] font-medium text-[#71877b]"
                    >
                        {tag.name}
                    </span>
                ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#eef3ef] pt-3 text-xs text-[#71877b]">
                <span
                    className={`inline-flex items-center gap-1 font-medium ${priority.color}`}
                >
                    <Flag className="size-3.5" />
                    {priority.label}
                </span>
                <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" />
                    {formatDate(task.due_date)}
                </span>
            </div>
            {progress && (
                <div className="mt-3 flex items-center gap-2 text-[11px] text-[#71877b]">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eaf1ec]">
                        <div
                            className="h-full rounded-full bg-[#5bab7b]"
                            style={{ width: progress }}
                        />
                    </div>
                    <span>
                        {task.subtasks.completed}/{task.subtasks.total}
                    </span>
                </div>
            )}
        </article>
    );
}

export default function Tasks({ tasks, search: initialSearch = '', user_id: initialUserId = null, period: initialPeriod = getTodayValue().slice(0, 7), users = [], export_approver: exportApprover = null, submission_search: initialSubmissionSearch = '', submission_status: initialSubmissionStatus = '', timesheet_submission_periods: submittedPeriods = [], timesheet_submissions: timesheetSubmissions = { data: [], current_page: 1, last_page: 1, from: null, to: null, total: 0 } }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const canManageTasks = auth.user.role !== 'admin';
    const usesSupervisorApproval = auth.user.role === 'bawahan';
    const [boardTasks, setBoardTasks] = useState(tasks);
    const [view, setView] = useState<'board' | 'list' | 'submissions'>('board');
    const [query, setQuery] = useState(initialSearch);
    const [submissionSearch, setSubmissionSearch] = useState(initialSubmissionSearch);
    const [submissionStatusFilter, setSubmissionStatusFilter] = useState(initialSubmissionStatus || 'all');
    const [taskPeriod, setTaskPeriod] = useState(initialPeriod);
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [userFilter, setUserFilter] = useState(initialUserId ? String(initialUserId) : 'all');
    const [listPage, setListPage] = useState(1);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deletingTask, setDeletingTask] = useState<Task | null>(null);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [statusTasksStatus, setStatusTasksStatus] = useState<Task['status'] | null>(null);
    const [statusTasksSearch, setStatusTasksSearch] = useState('');
    const [statusTasksDate, setStatusTasksDate] = useState('');
    const [statusTasksPage, setStatusTasksPage] = useState(1);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedDate, setSelectedDate] = useState('');
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isDuplicateSubmissionDialogOpen, setIsDuplicateSubmissionDialogOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedSubmissionForExport, setSelectedSubmissionForExport] = useState<TimesheetSubmission | null>(null);
    const [isNativeTasksFullscreen, setIsNativeTasksFullscreen] = useState(false);
    const [isFallbackTasksFullscreen, setIsFallbackTasksFullscreen] = useState(false);
    const tasksSectionRef = useRef<HTMLElement>(null);
    const [isOsticketPeriodOpen, setIsOsticketPeriodOpen] = useState(false);
    const [isOsticketOpen, setIsOsticketOpen] = useState(false);
    const [isOsticketLoading, setIsOsticketLoading] = useState(false);
    const [isOsticketImporting, setIsOsticketImporting] = useState(false);
    const [osticketPreview, setOsticketPreview] = useState<OsticketPreview | null>(null);
    const [selectedOsticketIds, setSelectedOsticketIds] = useState<number[]>([]);
    const [osticketPeriod, setOsticketPeriod] = useState(`${initialPeriod}-01`);
    const [department, setDepartment] = useState('');
    const [client, setClient] = useState(exportApprover?.name ?? 'SIM');
    const [approvedBy, setApprovedBy] = useState(exportApprover?.name ?? '');
    const [approvedRole, setApprovedRole] = useState(exportApprover?.position ?? (exportApprover ? 'Atasan' : ''));
    const [period, setPeriod] = useState(`${initialPeriod}-01`);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [dragOverTaskId, setDragOverTaskId] = useState<number | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<
        Task['status'] | null
    >(null);
    const [hasSignature, setHasSignature] = useState(false);
    const [signatureData, setSignatureData] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingSignature = useRef(false);
    const selectAllOsticketRef = useRef<HTMLInputElement>(null);
    const isTasksFullscreen = isNativeTasksFullscreen || isFallbackTasksFullscreen;

    useEffect(() => {
        setBoardTasks(tasks);
        setSelectedTaskIds((selectedIds) =>
            selectedIds.filter((id) => tasks.some((task) => task.id === id)),
        );
    }, [tasks]);

    useEffect(() => {
        setQuery(initialSearch);
    }, [initialSearch]);

    useEffect(() => {
        setSubmissionSearch(initialSubmissionSearch);
        setSubmissionStatusFilter(initialSubmissionStatus || 'all');
    }, [initialSubmissionSearch, initialSubmissionStatus]);

    useEffect(() => {
        if (view !== 'submissions') {
            return;
        }

        const timer = window.setTimeout(() => {
            router.visit(tasksIndex.url({
                query: {
                    period: taskPeriod,
                    user_id: userFilter === 'all' ? undefined : userFilter,
                    submission_search: submissionSearch || undefined,
                    submission_status: submissionStatusFilter === 'all' ? undefined : submissionStatusFilter,
                    submission_page: undefined,
                },
            }), {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            });
        }, 350);

        return () => window.clearTimeout(timer);
    }, [submissionSearch, submissionStatusFilter, taskPeriod, userFilter, view]);

    useEffect(() => {
        const handleFullscreenChange = (): void => {
            setIsNativeTasksFullscreen(document.fullscreenElement === tasksSectionRef.current);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
        if (!isFallbackTasksFullscreen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setIsFallbackTasksFullscreen(false);
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isFallbackTasksFullscreen]);

    useEffect(() => {
        const checkbox = selectAllOsticketRef.current;
        const ticketCount = osticketPreview?.tickets.length ?? 0;

        if (!checkbox) {
            return;
        }

        checkbox.indeterminate = selectedOsticketIds.length > 0 && selectedOsticketIds.length < ticketCount;
    }, [osticketPreview, selectedOsticketIds]);

    useEffect(() => {
        setUserFilter(initialUserId ? String(initialUserId) : 'all');
    }, [initialUserId]);

    useEffect(() => {
        setTaskPeriod(initialPeriod);
        setPeriod(`${initialPeriod}-01`);
    }, [initialPeriod]);

    useEffect(() => {
        if (!exportApprover) {
            return;
        }

        setApprovedBy(exportApprover.name);
        setApprovedRole(exportApprover.position ?? 'Atasan');
        setClient(exportApprover.name);
    }, [exportApprover]);

    useEffect(() => {
        if (!isExportOpen) {
            return;
        }

        setHasSignature(false);
        setSignatureData('');
        requestAnimationFrame(() => {
            const canvas = signatureCanvasRef.current;
            const context = canvas?.getContext('2d');

            if (canvas && context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
    }, [isExportOpen]);

    const filteredTasks = boardTasks.filter((task) => {
        const matchesQuery = task.title
            .toLowerCase()
            .includes(query.toLowerCase());
        const matchesPriority =
            priorityFilter === 'all' || task.priority === priorityFilter;

        return matchesQuery && matchesPriority;
    });

    const statusTasksFiltered = boardTasks.filter((task) => {
        if (task.status !== statusTasksStatus) {
            return false;
        }

        const searchValue = statusTasksSearch.trim().toLowerCase();
        const matchesSearch = searchValue === '' || [
            task.title,
            task.description ?? '',
            task.project?.name ?? '',
        ].some((value) => value.toLowerCase().includes(searchValue));
        const matchesDate = statusTasksDate === '' || task.due_date === statusTasksDate;

        return matchesSearch && matchesDate;
    });
    const statusTasksPageSize = 8;
    const statusTasksPageCount = Math.max(1, Math.ceil(statusTasksFiltered.length / statusTasksPageSize));
    const paginatedStatusTasks = statusTasksFiltered.slice(
        (statusTasksPage - 1) * statusTasksPageSize,
        statusTasksPage * statusTasksPageSize,
    );

    const listPageSize = 10;
    const listPageCount = Math.max(1, Math.ceil(filteredTasks.length / listPageSize));
    const paginatedTasks = filteredTasks.slice((listPage - 1) * listPageSize, listPage * listPageSize);
    useEffect(() => {
        setListPage(1);
    }, [query, priorityFilter, userFilter]);

    useEffect(() => {
        setStatusTasksPage(1);
    }, [statusTasksSearch, statusTasksDate, statusTasksStatus]);

    useEffect(() => {
        if (statusTasksPage > statusTasksPageCount) {
            setStatusTasksPage(statusTasksPageCount);
        }
    }, [statusTasksPage, statusTasksPageCount]);

    const statusTasksTableColumns = useMemo(() => taskColumnHelper.columns([
        taskColumnHelper.accessor('title', {
            header: 'Task',
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold text-[#173d30]">{row.original.title}</p>
                    <p className="mt-1 text-xs text-[#8aa097]">{row.original.project?.name ?? 'Tanpa project'}</p>
                </div>
            ),
        }),
        taskColumnHelper.accessor('description', {
            header: 'Deskripsi',
            cell: ({ row }) => (
                <p className="max-w-[520px] whitespace-pre-line break-words text-sm leading-6 text-[#557067]">
                    {taskDescriptionPreview(row.original.description) ?? 'Tanpa deskripsi'}
                </p>
            ),
        }),
        taskColumnHelper.accessor('priority', {
            header: 'Prioritas',
            cell: ({ row }) => (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${priorityStyles[row.original.priority].color}`}>
                    <Flag className="size-3.5" /> {priorityStyles[row.original.priority].label}
                </span>
            ),
        }),
        taskColumnHelper.accessor('due_date', {
            header: 'Tanggal',
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-[#71877b]">
                    <CalendarDays className="size-3.5" /> {formatDate(row.original.due_date)}
                </span>
            ),
        }),
    ]), []);

    const statusTasksTable = useTable({
        features: tasksTableFeatures,
        data: paginatedStatusTasks,
        columns: statusTasksTableColumns,
    });

    useEffect(() => {
        if (listPage > listPageCount) {
            setListPage(listPageCount);
        }
    }, [listPage, listPageCount]);

    const taskTableColumns = useMemo(() => taskColumnHelper.columns([
        taskColumnHelper.display({
            id: 'select',
            header: () => (
                <input
                    type="checkbox"
                    checked={paginatedTasks.length > 0 && paginatedTasks.every((task) => selectedTaskIds.includes(task.id))}
                    onChange={() => {
                        const pageIds = paginatedTasks.filter((task) => task.can_edit).map((task) => task.id);
                        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedTaskIds.includes(id));

                        setSelectedTaskIds((ids) => allSelected
                            ? ids.filter((id) => !pageIds.includes(id))
                            : Array.from(new Set([...ids, ...pageIds])));
                    }}
                    aria-label="Pilih task di halaman ini"
                    className="size-4 accent-[#2d875c]"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedTaskIds.includes(row.original.id)}
                    disabled={!row.original.can_edit}
                    onChange={() => toggleTaskSelection(row.original.id)}
                    aria-label={`Pilih ${row.original.title}`}
                    className="size-4 accent-[#2d875c]"
                />
            ),
        }),
        taskColumnHelper.accessor('title', {
            header: 'Task',
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <GripVertical className="hidden size-4 text-[#b2c3b8] sm:block" />
                    <div>
                        <p className="text-sm font-semibold text-[#173d30]">{row.original.title}</p>
                        {taskDescriptionPreview(row.original.description) && (
                            <p className="mt-1 max-w-[480px] whitespace-pre-line break-words text-sm leading-6 text-[#557067]">
                                {taskDescriptionPreview(row.original.description)}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-[#8aa097]">{row.original.project?.name ?? 'Tanpa project'}</p>
                    </div>
                </div>
            ),
        }),
        taskColumnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => (
                <select
                    disabled={!row.original.can_edit}
                    value={row.original.status}
                    onChange={(event) => changeStatus(row.original, event.target.value as Task['status'])}
                    className="h-8 rounded-md border border-[#dfeae3] bg-white px-2 text-xs text-[#173d30]"
                >
                    {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
                </select>
            ),
        }),
        taskColumnHelper.accessor('priority', {
            header: 'Prioritas',
            cell: ({ row }) => (
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${priorityStyles[row.original.priority].color}`}>
                    <Flag className="size-3.5" /> {priorityStyles[row.original.priority].label}
                </span>
            ),
        }),
        taskColumnHelper.accessor('due_date', {
            header: 'Tanggal',
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1 text-xs text-[#71877b]">
                    <CalendarDays className="size-3.5" /> {formatDate(row.original.due_date)}
                </span>
            ),
        }),
        taskColumnHelper.display({
            id: 'actions',
            header: () => <span className="block text-right">Aksi</span>,
            cell: ({ row }) => (
                <div hidden={!row.original.can_edit} className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => openEditDialog(row.original)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#eaf4fb] px-2.5 text-[11px] font-semibold text-[#3f79ad] hover:bg-[#dcecf9]" aria-label={`Edit ${row.original.title}`}>
                        <Pencil className="size-3.5" /> Edit
                    </button>
                    <button type="button" onClick={() => setDeletingTask(row.original)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#fff0f0] px-2.5 text-[11px] font-semibold text-[#c45c5c] hover:bg-[#ffe1e1]" aria-label={`Hapus ${row.original.title}`}>
                        <Trash2 className="size-3.5" /> Hapus
                    </button>
                </div>
            ),
        }),
    ]), [paginatedTasks, selectedTaskIds, canManageTasks]);

    const taskTable = useTable({
        features: tasksTableFeatures,
        data: paginatedTasks,
        columns: taskTableColumns,
        state: { globalFilter: query },
        manualFiltering: true,
    });

    const previewTasks = boardTasks.filter((task) =>
        task.due_date?.startsWith(period.slice(0, 7)),
    );
    const canDownloadTimesheet = selectedSubmissionForExport !== null
        ? selectedSubmissionForExport.can_download && selectedSubmissionForExport.has_signature
        : !usesSupervisorApproval
            || (previewTasks.length > 0
                && previewTasks.every((task) => task.review?.status === 'approved' && task.review.signature_url));
    const selectedPeriodKey = period.slice(0, 7);
    const hasExistingSubmission = selectedSubmissionForExport === null
        && submittedPeriods.includes(selectedPeriodKey);
    const submissionTableColumns = submissionColumnHelper.columns([
        submissionColumnHelper.accessor('period', {
            header: 'Periode',
            cell: ({ row }) => <span className="text-sm font-semibold text-[#173d30]">{formatMonth(row.original.period)}</span>,
        }),
        submissionColumnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => (
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${submissionStatusClasses[row.original.status]}`}>
                    {submissionStatusLabels[row.original.status]}
                </span>
            ),
        }),
        submissionColumnHelper.accessor('department', {
            header: 'Departemen',
        }),
        submissionColumnHelper.accessor('approved_by', {
            header: 'Approved By',
            cell: ({ row }) => (
                <div>
                    <p className="text-sm text-[#557067]">{row.original.approved_by}</p>
                    <p className="mt-1 text-xs text-[#9aac9f]">{row.original.approved_role ?? 'Atasan'}</p>
                </div>
            ),
        }),
        submissionColumnHelper.accessor('submitted_at', {
            header: 'Diajukan',
            cell: ({ row }) => <span className="text-xs text-[#71877b]">{row.original.submitted_at ? formatDate(row.original.submitted_at.slice(0, 10)) : 'Tanpa tanggal'}</span>,
        }),
        submissionColumnHelper.display({
            id: 'actions',
            header: () => <span className="block text-right">Aksi</span>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!row.original.can_download || isDownloading}
                        onClick={() => void downloadExport(undefined, row.original)}
                        className="border-[#cfe2d5] text-xs text-[#236d49]"
                    >
                        <Download className="size-3.5" /> Download
                    </Button>
                </div>
            ),
        }),
    ]);
    const submissionTable = useTable({
        features: submissionsTableFeatures,
        data: timesheetSubmissions.data,
        columns: submissionTableColumns,
    });

    function openNewTimesheetSubmission(): void {
        setSelectedSubmissionForExport(null);
        setPeriod(`${taskPeriod}-01`);
        setIsExportOpen(true);
        setIsDuplicateSubmissionDialogOpen(submittedPeriods.includes(taskPeriod));
    }

    function changeSubmissionPeriod(value: string): void {
        const nextPeriod = value.slice(0, 7);

        setPeriod(value);
        setIsDuplicateSubmissionDialogOpen(submittedPeriods.includes(nextPeriod));
    }

    function orderedTaskIds(items: Task[]): Record<Task['status'], number[]> {
        return columns.reduce(
            (result, column) => {
                result[column.key] = items
                    .filter((task) => task.status === column.key)
                    .map((task) => task.id);

                return result;
            },
            {
                todo: [],
                in_progress: [],
                review: [],
                done: [],
            } as Record<Task['status'], number[]>,
        );
    }

    function moveTask(
        taskId: number,
        toStatus: Task['status'],
        targetTaskId?: number,
    ): void {
        const draggedTask = boardTasks.find((task) => task.id === taskId);

        if (!draggedTask || taskId === targetTaskId) {
            return;
        }

        const previousTasks = boardTasks;
        const remainingTasks = boardTasks.filter((task) => task.id !== taskId);
        const movedTask = { ...draggedTask, status: toStatus };
        let insertAt = remainingTasks.length;

        if (targetTaskId !== undefined) {
            const targetIndex = remainingTasks.findIndex(
                (task) => task.id === targetTaskId,
            );

            if (targetIndex >= 0) {
                insertAt = targetIndex;
            }
        } else {
            const lastTargetIndex = remainingTasks.reduce(
                (lastIndex, task, index) =>
                    task.status === toStatus ? index : lastIndex,
                -1,
            );

            insertAt = lastTargetIndex >= 0 ? lastTargetIndex + 1 : remainingTasks.length;
        }

        const nextTasks = [...remainingTasks];
        nextTasks.splice(insertAt, 0, movedTask);
        setBoardTasks(nextTasks);
        setDraggedTaskId(null);
        setDragOverTaskId(null);
        setDragOverColumn(null);

        router.patch(
            reorderTasks().url,
            {
                task_id: taskId,
                from_status: draggedTask.status,
                to_status: toStatus,
                ordered_task_ids: orderedTaskIds(nextTasks),
            },
            {
                preserveScroll: true,
                onError: () => {
                    setBoardTasks(previousTasks);
                    toast.error('Task gagal dipindahkan.');
                },
            },
        );
    }

    function changeStatus(task: Task, status: Task['status']): void {
        moveTask(task.id, status);
    }

    function openCreateDialog(): void {
        setEditingTask(null);
        setSelectedDate(getTodayValue());
        setIsCreateOpen(true);
    }

    function openStatusTasksDialog(status: Task['status']): void {
        setStatusTasksStatus(status);
        setStatusTasksSearch('');
        setStatusTasksDate('');
        setStatusTasksPage(1);
    }

    async function toggleTasksFullscreen(): Promise<void> {
        const section = tasksSectionRef.current;

        if (!section) {
            return;
        }

        try {
            if (isFallbackTasksFullscreen) {
                setIsFallbackTasksFullscreen(false);
            } else if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else if (document.fullscreenEnabled && section.requestFullscreen) {
                await section.requestFullscreen();
            } else {
                setIsFallbackTasksFullscreen(true);
            }
        } catch {
            setIsFallbackTasksFullscreen(true);
        }
    }

    function changeUserFilter(value: string): void {
        setUserFilter(value);
        router.visit(tasksIndex.url({ query: { period: taskPeriod, user_id: value === 'all' ? undefined : value } }), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function changeTaskPeriod(value: string): void {
        const nextPeriod = value.slice(0, 7);

        setTaskPeriod(nextPeriod);
        setPeriod(`${nextPeriod}-01`);
        router.visit(tasksIndex.url({
            query: {
                period: nextPeriod,
                user_id: userFilter === 'all' ? undefined : userFilter,
                submission_search: view === 'submissions' ? submissionSearch || undefined : undefined,
                submission_status: view === 'submissions' && submissionStatusFilter !== 'all' ? submissionStatusFilter : undefined,
            },
        }), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function visitSubmissionPage(page: number): void {
        router.visit(tasksIndex.url({
            query: {
                period: taskPeriod,
                user_id: userFilter === 'all' ? undefined : userFilter,
                submission_search: submissionSearch || undefined,
                submission_status: submissionStatusFilter === 'all' ? undefined : submissionStatusFilter,
                submission_page: page === 1 ? undefined : page,
            },
        }), {
            preserveScroll: true,
            preserveState: true,
        });
    }

    function openEditDialog(task: Task): void {
        setEditingTask(task);
        setSelectedDate(task.due_date ?? '');
        setIsCreateOpen(true);
    }

    function openOsticketPeriodDialog(): void {
        setOsticketPeriod(`${taskPeriod}-01`);
        setIsOsticketPeriodOpen(true);
    }

    async function openOsticketDialog(selectedPeriod = osticketPeriod.slice(0, 7)): Promise<void> {
        setIsOsticketPeriodOpen(false);
        setIsOsticketOpen(true);
        setIsOsticketLoading(true);
        setOsticketPreview(null);
        setSelectedOsticketIds([]);

        try {
            const response = await fetch(osticketRoutes.preview.url({ query: { period: selectedPeriod } }), {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Preview ticket gagal.');
            }

            setOsticketPreview((await response.json()) as OsticketPreview);
        } catch {
            toast.error('Data osTicket gagal diambil.');
            setIsOsticketOpen(false);
        } finally {
            setIsOsticketLoading(false);
        }
    }

    function toggleOsticketTicket(ticketId: number): void {
        setSelectedOsticketIds((ids) =>
            ids.includes(ticketId)
                ? ids.filter((id) => id !== ticketId)
                : [...ids, ticketId],
        );
    }

    function toggleAllOsticketTickets(): void {
        const ticketIds = osticketPreview?.tickets.map((ticket) => ticket.ticket_id) ?? [];
        const allSelected = ticketIds.length > 0 && ticketIds.every((id) => selectedOsticketIds.includes(id));

        setSelectedOsticketIds(allSelected ? [] : ticketIds);
    }

    function importOsticketTickets(): void {
        if (selectedOsticketIds.length === 0) {
            toast.warning('Pilih minimal satu ticket.');

            return;
        }

        setIsOsticketImporting(true);
        router.post(osticketRoutes.import().url, { period: osticketPeriod.slice(0, 7), ticket_ids: selectedOsticketIds }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsOsticketOpen(false);
                setOsticketPreview(null);
                setSelectedOsticketIds([]);
            },
            onError: (errors) => {
                toast.error(errors.ticket_ids ?? 'Ticket gagal diambil.');
            },
            onFinish: () => setIsOsticketImporting(false),
        });
    }

    function toggleTaskSelection(taskId: number): void {
        if (!boardTasks.find((task) => task.id === taskId)?.can_edit) {
            return;
        }

        setSelectedTaskIds((selectedIds) =>
            selectedIds.includes(taskId)
                ? selectedIds.filter((id) => id !== taskId)
                : [...selectedIds, taskId],
        );
    }

    function toggleVisibleTasks(): void {
        const visibleIds = filteredTasks.filter((task) => task.can_edit).map((task) => task.id);
        const allVisibleSelected = visibleIds.every((id) =>
            selectedTaskIds.includes(id),
        );

        setSelectedTaskIds((selectedIds) =>
            allVisibleSelected
                ? selectedIds.filter((id) => !visibleIds.includes(id))
                : Array.from(new Set([...selectedIds, ...visibleIds])),
        );
    }

    function deleteSingleTask(): void {
        if (!deletingTask) {
            return;
        }

        setIsDeleting(true);
        router.delete(destroyTask(deletingTask.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                setDeletingTask(null);
                setSelectedTaskIds((selectedIds) =>
                    selectedIds.filter((id) => id !== deletingTask.id),
                );
            },
            onError: () => toast.error('Task gagal dihapus.'),
            onFinish: () => setIsDeleting(false),
        });
    }

    function deleteSelectedTasks(): void {
        if (selectedTaskIds.length === 0) {
            return;
        }

        setIsDeleting(true);
        router.delete(bulkDestroyTasks().url, {
            data: { task_ids: selectedTaskIds },
            preserveScroll: true,
            onSuccess: () => {
                setSelectedTaskIds([]);
                setIsBulkDeleteOpen(false);
            },
            onError: () => toast.error('Task gagal dihapus.'),
            onFinish: () => setIsDeleting(false),
        });
    }

    function handleDrop(status: Task['status']): void {
        if (draggedTaskId !== null) {
            moveTask(draggedTaskId, status);
        }
    }

    function handleTaskDrop(taskId: number): void {
        const targetTask = boardTasks.find((task) => task.id === taskId);

        if (draggedTaskId !== null && targetTask) {
            moveTask(draggedTaskId, targetTask.status, taskId);
        }
    }

    function submitExport(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();

        if (selectedSubmissionForExport === null && hasExistingSubmission) {
            toast.info(`Pengajuan timesheet periode ${formatMonth(selectedPeriodKey)} sudah tersimpan. Tidak perlu membuat pengajuan lagi.`);

            return;
        }

        if (selectedSubmissionForExport !== null) {
            if (!selectedSubmissionForExport.has_signature) {
                toast.warning('Pengajuan ini belum memiliki tanda tangan bawahan. Buat pengajuan baru untuk menyimpan tanda tangan.');

                return;
            }

            setIsExportOpen(false);
            setIsPreviewOpen(true);

            return;
        }

        if (!period) {
            toast.warning('Pilih periode timesheet terlebih dahulu.');

            return;
        }

        if (usesSupervisorApproval && !exportApprover) {
            toast.warning('Akunmu belum memiliki atasan untuk approval timesheet.');

            return;
        }

        const canvas = signatureCanvasRef.current;

        if (!canvas || !hasSignature) {
            toast.warning('Buat tanda tangan bawahan sebelum mengajukan timesheet.');

            return;
        }

        setSignatureData(canvas.toDataURL('image/png'));

        router.post(storeTimesheetSubmission().url, {
            department,
            client,
            approved_by: approvedBy,
            approved_role: approvedRole,
            period: period.slice(0, 7),
            signature_data: canvas.toDataURL('image/png'),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsExportOpen(false);
                setIsPreviewOpen(true);
            },
            onError: (errors) => toast.error(errors.period ?? errors.signature_data ?? 'Pengajuan timesheet gagal disimpan.'),
        });
    }

    function signaturePoint(
        event: ReactPointerEvent<HTMLCanvasElement>,
    ): { x: number; y: number } | null {
        const canvas = signatureCanvasRef.current;

        if (!canvas) {
            return null;
        }

        const bounds = canvas.getBoundingClientRect();

        return {
            x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
            y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
        };
    }

    function startSignature(event: ReactPointerEvent<HTMLCanvasElement>): void {
        const canvas = signatureCanvasRef.current;
        const context = canvas?.getContext('2d');
        const point = signaturePoint(event);

        if (!canvas || !context || !point) {
            return;
        }

        canvas.setPointerCapture(event.pointerId);
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = '#173d30';
        isDrawingSignature.current = true;
    }

    function drawSignature(event: ReactPointerEvent<HTMLCanvasElement>): void {
        if (!isDrawingSignature.current) {
            return;
        }

        const context = signatureCanvasRef.current?.getContext('2d');
        const point = signaturePoint(event);

        if (!context || !point) {
            return;
        }

        context.lineTo(point.x, point.y);
        context.stroke();
        setHasSignature(true);
    }

    function endSignature(): void {
        isDrawingSignature.current = false;
    }

    function clearSignature(): void {
        const canvas = signatureCanvasRef.current;
        const context = canvas?.getContext('2d');

        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }

        setHasSignature(false);
    }

    async function downloadExport(
        event?: FormEvent<HTMLFormElement>,
        submission?: TimesheetSubmission,
    ): Promise<void> {
        event?.preventDefault();

        const exportSubmission = submission ?? selectedSubmissionForExport;
        const exportDepartment = exportSubmission?.department ?? department;
        const exportClient = exportSubmission?.client ?? client;
        const exportApprovedBy = exportSubmission?.approved_by ?? approvedBy;
        const exportApprovedRole = exportSubmission?.approved_role ?? approvedRole;
        const exportPeriod = exportSubmission?.period ?? period.slice(0, 7);
        const canDownload = exportSubmission !== null
            ? exportSubmission.can_download && exportSubmission.has_signature
            : canDownloadTimesheet;

        if (!canDownload) {
            toast.warning('Timesheet belum bisa diunduh sebelum semua task disetujui atasan.');

            return;
        }

        setIsDownloading(true);

        try {
            const csrfToken = document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') ?? '';
            const body = new URLSearchParams({
                department: exportDepartment,
                client: exportClient,
                approved_by: exportApprovedBy,
                approved_role: exportApprovedRole,
                period: exportPeriod,
            });

            if (exportSubmission === null && signatureData !== '') {
                body.set('signature_data', signatureData);
            }

            const response = await fetch(exportTimesheet.url(), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body,
            });

            if (response.status === 419) {
                toast.error('Sesi sudah kedaluwarsa. Halaman akan dimuat ulang.');
                window.location.reload();

                return;
            }

            if (!response.ok) {
                const contentType = response.headers.get('content-type') ?? '';
                let message: string | undefined;

                if (contentType.includes('application/json')) {
                    const payload = await response.json().catch(() => null) as { message?: string } | null;
                    message = payload?.message;
                } else {
                    const responseText = await response.text();
                    const htmlMessage = responseText.match(/<(?:h1|title)[^>]*>([\s\S]*?)<\/(?:h1|title)>/i)?.[1];
                    const plainText = htmlMessage ?? responseText;
                    const cleanedText = plainText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

                    message = cleanedText || undefined;
                }

                throw new Error(message ?? `Export gagal (HTTP ${response.status}).`);
            }

            const blob = await response.blob();
            const downloadUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            const disposition = response.headers.get('content-disposition');
            const filename = disposition?.match(/filename="?([^";]+)"?/)?.[1] ?? 'timesheet.xlsx';

            anchor.href = downloadUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
            setIsPreviewOpen(false);
            toast.success('Timesheet berhasil diunduh.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Timesheet gagal diunduh.');
        } finally {
            setIsDownloading(false);
        }
    }

    return (
        <>
            <Head title="Tasks" />
            <main className="min-h-[calc(100svh-68px)] bg-[#f8faf7]">
                <div className="mx-auto max-w-[1540px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
                    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <p className="mb-2 text-xs font-semibold tracking-[0.08em] text-[#5c9072] uppercase">
                                Dashboard / Tasks
                            </p>
                            <h1 className="text-3xl leading-tight font-semibold tracking-[-0.04em] text-[#173d30]">
                                Task Manager
                            </h1>
                            <p className="mt-2 text-sm leading-6 text-[#71877b]">
                                Kelola, prioritaskan, dan pantau semua
                                pekerjaanmu.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={openOsticketPeriodDialog}
                                hidden={!canManageTasks}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#c8dced] bg-[#eef6fc] px-4 text-sm font-semibold text-[#3f79ad] shadow-sm transition hover:border-[#9ec4df] hover:bg-[#e2f0fa]"
                            >
                                <Ticket className="size-4" />
                                Ambil dari ticket
                            </button>
                            <button
                                type="button"
                                onClick={openNewTimesheetSubmission}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#cfe2d5] bg-white px-4 text-sm font-semibold text-[#236d49] shadow-sm transition hover:border-[#9fc9ad] hover:bg-[#f5fbf6]"
                            >
                                <Download className="size-4" />
                                Pengajuan timesheet
                            </button>
                            <button
                                type="button"
                                onClick={openCreateDialog}
                                hidden={!canManageTasks}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d875c] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#236d49]"
                            >
                                <Plus className="size-4" />
                                Task baru
                            </button>
                        </div>
                    </header>

                    <section
                        ref={tasksSectionRef}
                        className={isTasksFullscreen ? 'fixed inset-0 z-50 min-h-screen min-w-0 space-y-4 overflow-y-auto bg-[#f8faf7] px-4 py-4 sm:px-6 sm:py-6 lg:px-10' : 'min-w-0 space-y-4'}
                    >
                        <div className="flex flex-col gap-3 rounded-2xl border border-[#dfeae3] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex rounded-lg bg-[#f3f8f5] p-1">
                                    <button
                                        type="button"
                                        onClick={() => setView('board')}
                                        className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${view === 'board' ? 'bg-white text-[#236d49] shadow-sm' : 'text-[#71877b]'}`}
                                    >
                                        <SquareKanban className="size-4" /> Board
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('list')}
                                        className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${view === 'list' ? 'bg-white text-[#236d49] shadow-sm' : 'text-[#71877b]'}`}
                                    >
                                        <List className="size-4" /> List
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setView('submissions')}
                                        className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold transition ${view === 'submissions' ? 'bg-white text-[#236d49] shadow-sm' : 'text-[#71877b]'}`}
                                    >
                                        <ClipboardList className="size-4" /> Pengajuan
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleTasksFullscreen}
                                    aria-pressed={isTasksFullscreen}
                                    aria-label={isTasksFullscreen ? 'Keluar dari fullscreen' : 'Buka task fullscreen'}
                                    title={isTasksFullscreen ? 'Keluar dari fullscreen (Esc)' : 'Buka task fullscreen'}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#dfeae3] bg-white px-3 text-xs font-semibold text-[#557067] transition hover:border-[#9fc9ad] hover:bg-[#f5fbf6]"
                                >
                                    {isTasksFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                                    <span className="hidden sm:inline">{isTasksFullscreen ? 'Keluar' : 'Fullscreen'}</span>
                                </button>
                            </div>
                            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:justify-end">
                                    <div className="w-full sm:w-[180px]">
                                        <DatePicker
                                            value={taskPeriod}
                                            onChange={changeTaskPeriod}
                                            placeholder="Filter bulan"
                                            monthOnly
                                        />
                                    </div>
                                <label className="flex h-9 min-w-0 items-center gap-2 rounded-lg border border-[#dfeae3] px-3 text-[#9aac9f] sm:max-w-[230px]">
                                    <Search className="size-4 shrink-0" />
                                    <input
                                        value={view === 'submissions' ? submissionSearch : query}
                                        onChange={(event) => {
                                            if (view === 'submissions') {
                                                setSubmissionSearch(event.target.value);
                                            } else {
                                                setQuery(event.target.value);
                                            }
                                        }}
                                        placeholder={view === 'submissions' ? 'Cari pengajuan...' : 'Cari task...'}
                                        className="min-w-0 flex-1 bg-transparent text-xs text-[#173d30] outline-none placeholder:text-[#9aac9f]"
                                    />
                                </label>
                                {view === 'submissions' ? (
                                    <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dfeae3] px-3 text-[#71877b]">
                                        <SlidersHorizontal className="size-3.5" />
                                        <select
                                            value={submissionStatusFilter}
                                            onChange={(event) => {
                                                setSubmissionStatusFilter(event.target.value);
                                            }}
                                            className="bg-transparent text-xs outline-none"
                                        >
                                            <option value="all">Semua status</option>
                                            <option value="pending">Menunggu approval</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </label>
                                ) : (
                                    <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dfeae3] px-3 text-[#71877b]">
                                        <SlidersHorizontal className="size-3.5" />
                                        <select
                                            value={priorityFilter}
                                            onChange={(event) =>
                                                setPriorityFilter(
                                                    event.target.value,
                                                )
                                            }
                                            className="bg-transparent text-xs outline-none"
                                        >
                                            <option value="all">Semua prioritas</option>
                                            <option value="low">Rendah</option>
                                            <option value="medium">Sedang</option>
                                            <option value="high">Tinggi</option>
                                        </select>
                                    </label>
                                )}
                                {auth.user.role === 'admin' && view !== 'submissions' && (
                                    <label className="flex h-9 items-center gap-2 rounded-lg border border-[#dfeae3] px-3 text-[#71877b]">
                                        <select value={userFilter} onChange={(event) => changeUserFilter(event.target.value)} className="bg-transparent text-xs outline-none">
                                            <option value="all">Semua pengguna</option>
                                            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                                        </select>
                                    </label>
                                )}
                            </div>
                        </div>

                        {view !== 'submissions' && filteredTasks.length > 0 && (
                            <div hidden={!canManageTasks} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfeae3] bg-white px-4 py-3">
                                <button
                                    type="button"
                                    onClick={toggleVisibleTasks}
                                    className="text-xs font-semibold text-[#236d49] hover:underline"
                                >
                                    {filteredTasks.every((task) =>
                                        selectedTaskIds.includes(task.id),
                                    )
                                        ? 'Batalkan pilih semua'
                                        : 'Pilih semua yang terlihat'}
                                </button>
                                {selectedTaskIds.length > 0 && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-[#71877b]">
                                            {selectedTaskIds.length} task dipilih
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsBulkDeleteOpen(true)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#fff2f2] px-3 text-xs font-semibold text-[#d44f4f] transition hover:bg-[#ffe4e4]"
                                        >
                                            <Trash2 className="size-3.5" />
                                            Hapus pilihan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTaskIds([])}
                                            className="text-xs font-medium text-[#71877b] hover:text-[#173d30]"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {view === 'board' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-[#71877b]">
                                    Tarik task ke kolom lain untuk mengubah status.
                                </p>
                                <div className="overflow-x-auto pb-2">
                                    <div className="grid min-w-[920px] grid-cols-4 gap-3">
                                    {columns.map((column) => {
                                    const columnTasks = filteredTasks.filter(
                                        (task) => task.status === column.key,
                                    );

                                    return (
                                        <div
                                            key={column.key}
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                setDragOverColumn(column.key);
                                            }}
                                            onDrop={() => handleDrop(column.key)}
                                            className={`flex ${isTasksFullscreen ? 'h-[calc(100svh-235px)]' : 'h-[clamp(360px,calc(100vh-390px),720px)]'} min-h-0 flex-col overflow-hidden rounded-2xl p-3 transition ${column.tone} ${dragOverColumn === column.key ? 'ring-2 ring-[#2d875c] ring-offset-2' : ''}`}
                                        >
                                            <div className="mb-3 flex shrink-0 items-center justify-between px-1">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`size-2.5 rounded-full ${column.dot}`}
                                                    />
                                                    <h2 className="text-sm font-semibold text-[#173d30]">
                                                        {column.label}
                                                    </h2>
                                                    <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[10px] font-semibold text-[#71877b]">
                                                        {columnTasks.length}
                                                    </span>
                                                </div>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="rounded-md p-1 text-[#71877b] hover:bg-white/70"
                                                            aria-label={`Menu ${column.label}`}
                                                        >
                                                            <MoreHorizontal className="size-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-52">
                                                        <DropdownMenuLabel>
                                                            {column.label}
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onSelect={() => openStatusTasksDialog(column.key)}>
                                                            <List className="size-4" />
                                                            Lihat semua task
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
                                                {columnTasks.map((task) => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        isDragging={
                                                            draggedTaskId ===
                                                            task.id
                                                        }
                                                        onDragStart={
                                                            setDraggedTaskId
                                                        }
                                                        onDragEnd={() => {
                                                            setDraggedTaskId(
                                                                null,
                                                            );
                                                            setDragOverColumn(
                                                                null,
                                                            );
                                                            setDragOverTaskId(
                                                                null,
                                                            );
                                                        }}
                                                        onDragOver={
                                                            setDragOverTaskId
                                                        }
                                                        onDrop={handleTaskDrop}
                                                        isDragOver={
                                                            dragOverTaskId ===
                                                            task.id
                                                        }
                                                        isSelected={selectedTaskIds.includes(task.id)}
                                                        onToggleSelect={toggleTaskSelection}
                                                        onEdit={openEditDialog}
                                                        onDelete={setDeletingTask}
                                                        canEdit={task.can_edit}
                                                    />
                                                ))}
                                                {columnTasks.length === 0 && (
                                                    <div className="rounded-xl border border-dashed border-[#b9d7c3] px-3 py-10 text-center text-xs leading-5 text-[#71877b]">
                                                        {dragOverColumn ===
                                                        column.key
                                                            ? 'Lepaskan task di sini.'
                                                            : 'Belum ada task di sini.'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                    })}
                                    </div>
                                </div>
                            </div>
                        ) : view === 'list' ? (
                            <div className="overflow-x-auto rounded-2xl border border-[#dfeae3] bg-white">
                                <Table className="min-w-[1120px] text-left">
                                    <TableHeader className="bg-[#f8faf7] text-[11px] text-[#71877b]">
                                        {taskTable.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead key={header.id} className={header.id === 'select' ? 'w-12 px-5' : header.id === 'actions' ? 'text-right pr-5' : undefined}>
                                                        {header.isPlaceholder ? null : taskTable.FlexRender({ header })}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableHeader>
                                    <TableBody>
                                        {taskTable.getRowModel().rows.length > 0 ? taskTable.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id} className="hover:bg-[#fbfdfb]">
                                                {row.getAllCells().map((cell) => (
                                                    <TableCell key={cell.id} className={cell.column.id === 'select' ? 'px-5' : cell.column.id === 'actions' ? 'pr-5' : undefined}>
                                                        {taskTable.FlexRender({ cell })}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={taskTableColumns.length} className="h-24 text-center text-sm text-[#71877b]">Belum ada task yang cocok.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                {filteredTasks.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eaf1ec] px-5 py-3">
                                        <p className="text-xs text-[#8aa097]">Menampilkan {(listPage - 1) * listPageSize + 1}–{Math.min(listPage * listPageSize, filteredTasks.length)} dari {filteredTasks.length} task</p>
                                        <div className="flex items-center gap-2">
                                            <Button type="button" variant="outline" disabled={listPage === 1} onClick={() => setListPage((page) => Math.max(1, page - 1))} className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]">Sebelumnya</Button>
                                            <span className="text-xs text-[#71877b]">Halaman {listPage} dari {listPageCount}</span>
                                            <Button type="button" variant="outline" disabled={listPage === listPageCount} onClick={() => setListPage((page) => Math.min(listPageCount, page + 1))} className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]">Berikutnya</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-[#dfeae3] bg-white p-5">
                                    <p className="text-xs font-semibold tracking-[0.08em] text-[#5c9072] uppercase">
                                        Histori pengajuan timesheet
                                    </p>
                                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#173d30]">
                                        Data pengajuan tersimpan
                                    </h2>
                                    <p className="mt-2 text-sm leading-6 text-[#71877b]">
                                        Cari, filter status, lalu download pengajuan yang sudah approved.
                                    </p>
                                </div>
                                <div className="overflow-x-auto rounded-2xl border border-[#dfeae3] bg-white">
                                    <Table className="min-w-[980px] text-left">
                                        <TableHeader className="bg-[#f8faf7] text-[11px] text-[#71877b]">
                                            {submissionTable.getHeaderGroups().map((headerGroup) => (
                                                <TableRow key={headerGroup.id}>
                                                    {headerGroup.headers.map((header) => (
                                                        <TableHead key={header.id} className={header.id === 'actions' ? 'pr-5 text-right' : undefined}>
                                                            {header.isPlaceholder ? null : submissionTable.FlexRender({ header })}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableHeader>
                                        <TableBody>
                                            {submissionTable.getRowModel().rows.length > 0 ? submissionTable.getRowModel().rows.map((row) => (
                                                <TableRow key={row.id} className="hover:bg-[#fbfdfb]">
                                                    {row.getAllCells().map((cell) => (
                                                        <TableCell key={cell.id} className={cell.column.id === 'actions' ? 'pr-5' : undefined}>
                                                            {submissionTable.FlexRender({ cell })}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={submissionTableColumns.length} className="h-32 text-center text-sm text-[#71877b]">
                                                        Belum ada pengajuan tersimpan.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eaf1ec] px-5 py-3">
                                        <p className="text-xs text-[#8aa097]">
                                            {timesheetSubmissions.total > 0
                                                ? `Menampilkan ${timesheetSubmissions.from}–${timesheetSubmissions.to} dari ${timesheetSubmissions.total} pengajuan`
                                                : '0 pengajuan'}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={timesheetSubmissions.current_page <= 1}
                                                onClick={() => visitSubmissionPage(timesheetSubmissions.current_page - 1)}
                                                className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]"
                                            >
                                                Sebelumnya
                                            </Button>
                                            <span className="text-xs text-[#71877b]">
                                                Halaman {timesheetSubmissions.current_page} dari {timesheetSubmissions.last_page}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={timesheetSubmissions.current_page >= timesheetSubmissions.last_page}
                                                onClick={() => visitSubmissionPage(timesheetSubmissions.current_page + 1)}
                                                className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]"
                                            >
                                                Berikutnya
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <Dialog open={isOsticketPeriodOpen} onOpenChange={setIsOsticketPeriodOpen}>
                <DialogContent className="border-[#dfeae3] bg-white sm:max-w-[520px]">
                    <DialogHeader className="border-b border-[#eaf1ec] pb-4">
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Pilih periode osTicket
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            Pilih bulan dan tahun. Data ticket hanya akan diambil dari periode ini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                        <Label htmlFor="osticket-period" className="text-sm font-semibold text-[#315847]">
                            Periode
                        </Label>
                        <DatePicker
                            value={osticketPeriod}
                            onChange={setOsticketPeriod}
                            placeholder="Pilih bulan"
                            monthOnly
                        />
                    </div>
                    <DialogFooter className="border-t border-[#eaf1ec] pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOsticketPeriodOpen(false)}
                            className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void openOsticketDialog()}
                            disabled={!osticketPeriod}
                            className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"
                        >
                            <Ticket className="size-4" />
                            Ambil {osticketPeriod ? formatMonth(osticketPeriod.slice(0, 7)) : 'data'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={isOsticketOpen}
                onOpenChange={(open) => {
                    if (!isOsticketLoading && !isOsticketImporting) {
                        setIsOsticketOpen(open);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[820px]">
                    <DialogHeader className="border-b border-[#eaf1ec] pb-4">
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Ambil data dari osTicket
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            Ticket yang ditugaskan ke nama akunmu pada periode {formatMonth(osticketPeriod.slice(0, 7))} akan dicocokkan otomatis.
                        </DialogDescription>
                    </DialogHeader>
                    {isOsticketLoading ? (
                        <div className="flex min-h-48 items-center justify-center text-sm text-[#71877b]">
                            Membaca ticket...
                        </div>
                    ) : osticketPreview && !osticketPreview.configured ? (
                        <div className="rounded-xl border border-[#ecd9a4] bg-[#fffaf0] px-4 py-4 text-sm leading-6 text-[#8a681f]">
                            Koneksi osTicket belum dikonfigurasi. Isi variabel `OSTICKET_*` di file `.env`, lalu jalankan ulang aplikasi.
                        </div>
                    ) : osticketPreview ? (
                        <div className="grid gap-4">
                            <div className="rounded-xl border border-[#dfeae3] bg-[#f8faf7] px-4 py-3 text-sm">
                                <p className="font-semibold text-[#173d30]">
                                    Akun TaskList: {osticketPreview.user_name}
                                </p>
                                {osticketPreview.matched_staff ? (
                                    <p className="mt-1 text-[#71877b]">
                                        Cocok dengan <strong className="font-semibold text-[#367554]">{osticketPreview.matched_staff.name}</strong> ({osticketPreview.matched_staff.score}%).
                                    </p>
                                ) : (
                                    <p className="mt-1 text-[#9a6720]">
                                        Nama staff osTicket belum cocok minimal 90%.
                                    </p>
                                )}
                            </div>
                            {osticketPreview.candidates.length > 0 && !osticketPreview.matched_staff && (
                                <div className="rounded-xl border border-[#ecd9a4] bg-[#fffaf0] px-4 py-3 text-xs leading-5 text-[#8a681f]">
                                    Kandidat terdekat: {osticketPreview.candidates.map((candidate) => `${candidate.name} (${candidate.score}%)`).join(', ')}. Perbaiki nama akun agar pencocokan aman.
                                </div>
                            )}
                            <div className="overflow-hidden rounded-xl border border-[#dfeae3]">
                                <div className="flex items-center justify-between gap-3 border-b border-[#eaf1ec] bg-[#f8faf7] px-4 py-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-[#173d30]">Ticket ditemukan</h3>
                                        <p className="mt-1 text-xs text-[#71877b]">Periode {formatMonth(osticketPeriod.slice(0, 7))} · pilih ticket yang ingin dibuat menjadi task.</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#557067]">
                                            <input
                                                ref={selectAllOsticketRef}
                                                type="checkbox"
                                                checked={osticketPreview.tickets.length > 0 && selectedOsticketIds.length === osticketPreview.tickets.length}
                                                onChange={toggleAllOsticketTickets}
                                                disabled={osticketPreview.tickets.length === 0}
                                                aria-label="Pilih semua ticket"
                                                className="size-4 accent-[#2d875c]"
                                            />
                                            Pilih semua
                                        </label>
                                        <span className="rounded-full bg-[#eaf6ee] px-2.5 py-1 text-xs font-semibold text-[#236d49]">
                                            {osticketPreview.tickets.length} ticket
                                        </span>
                                    </div>
                                </div>
                                <div className="max-h-[360px] overflow-y-auto">
                                    {osticketPreview.tickets.length > 0 ? (
                                        osticketPreview.tickets.map((ticket) => (
                                            <label key={ticket.ticket_id} className="flex cursor-pointer gap-3 border-b border-[#eef3ef] px-4 py-4 last:border-b-0 hover:bg-[#fbfdfb]">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedOsticketIds.includes(ticket.ticket_id)}
                                                    onChange={() => toggleOsticketTicket(ticket.ticket_id)}
                                                    className="mt-1 size-4 shrink-0 accent-[#2d875c]"
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-semibold text-[#173d30]">#{ticket.ticket_number}</span>
                                                        <span className="rounded-full bg-[#eef6fc] px-2 py-0.5 text-[11px] font-semibold text-[#3f79ad]">{ticket.status_label}</span>
                                                    </span>
                                                    <span className="mt-1 block text-sm text-[#557067]">{ticket.subject || 'Tanpa subject'}</span>
                                                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-[#71877b]">{ticket.description || 'Tidak ada deskripsi ticket.'}</span>
                                                    <span className="mt-2 block text-xs text-[#9aac9f]">Assign To: {ticket.assigned_to || 'Belum ditugaskan'} · {formatDate(ticket.created_at.slice(0, 10))}</span>
                                                </span>
                                            </label>
                                        ))
                                    ) : (
                                        <p className="px-4 py-10 text-center text-sm text-[#71877b]">
                                            Tidak ada ticket yang cocok dengan akun ini.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <DialogFooter className="border-t border-[#eaf1ec] pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsOsticketOpen(false)}
                            disabled={isOsticketLoading || isOsticketImporting}
                            className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={importOsticketTickets}
                            disabled={isOsticketLoading || isOsticketImporting || !osticketPreview?.matched_staff || selectedOsticketIds.length === 0}
                            className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"
                        >
                            <Ticket className="size-4" />
                            {isOsticketImporting ? 'Mengambil...' : `Buat ${selectedOsticketIds.length || ''} task`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);

                    if (!open) {
                        setEditingTask(null);
                    }
                }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[720px]">
                    <DialogHeader className="border-b border-[#eaf1ec] pb-4">
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            {editingTask ? 'Edit task' : 'Buat task baru'}
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            {editingTask
                                ? 'Perbarui detail task yang dipilih.'
                                : 'Tambahkan pekerjaan, atur prioritas, dan tentukan tanggalnya.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...(editingTask
                            ? updateTask.form(editingTask.id)
                            : storeTask.form())}
                        resetOnSuccess
                        onSuccess={() => {
                            setIsCreateOpen(false);
                            setEditingTask(null);
                        }}
                        onError={() =>
                            toast.error(
                                editingTask
                                    ? 'Task gagal diperbarui.'
                                    : 'Task gagal dibuat.',
                            )
                        }
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="task-title">
                                        Judul task{' '}
                                        <span className="text-[#d44f4f]">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="task-title"
                                        name="title"
                                        required
                                        autoFocus
                                        defaultValue={editingTask?.title ?? ''}
                                        placeholder="Contoh: Rapikan halaman utama"
                                        className="h-11 rounded-xl"
                                    />
                                    <InputError message={errors.title} />
                                </div>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="task-priority">
                                            Prioritas
                                        </Label>
                                        <select
                                            id="task-priority"
                                            name="priority"
                                            defaultValue={editingTask?.priority ?? 'medium'}
                                            className="h-11 w-full rounded-xl border border-[#dfeae3] bg-white px-3 text-sm text-[#173d30] transition outline-none focus:border-[#7cba95] focus:ring-2 focus:ring-[#7cba95]/20"
                                        >
                                            <option value="low">Rendah</option>
                                            <option value="medium">
                                                Sedang
                                            </option>
                                            <option value="high">Tinggi</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="task-due-date">
                                            Tanggal
                                        </Label>
                                        <input
                                            id="task-due-date"
                                            name="due_date"
                                            type="hidden"
                                            value={selectedDate}
                                        />
                                        <DatePicker
                                            value={selectedDate}
                                            onChange={setSelectedDate}
                                        />
                                        <InputError message={errors.due_date} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="task-description">
                                        Catatan
                                    </Label>
                                        <textarea
                                            id="task-description"
                                            name="description"
                                            rows={5}
                                            defaultValue={editingTask?.description ?? ''}
                                        placeholder="Tambahkan konteks singkat untuk task ini..."
                                        className="w-full resize-none rounded-xl border border-[#dfeae3] bg-white px-3 py-3 text-sm leading-6 text-[#173d30] transition outline-none placeholder:text-[#9aac9f] focus:border-[#7cba95] focus:ring-2 focus:ring-[#7cba95]/20"
                                    />
                                    <InputError message={errors.description} />
                                </div>
                                <DialogFooter className="border-t border-[#eaf1ec] pt-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                        className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"
                                    >
                                        {processing
                                            ? 'Menyimpan...'
                                            : editingTask
                                              ? 'Simpan perubahan'
                                              : 'Buat task'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
            <Dialog
                open={deletingTask !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setDeletingTask(null);
                    }
                }}
            >
                <DialogContent className="border-[#dfeae3] bg-white sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Hapus task?
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            Task ini akan dihapus permanen dari akunmu.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl border border-[#f3dddd] bg-[#fff7f7] px-4 py-3 text-sm font-medium text-[#8f3d3d]">
                        {deletingTask?.title}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeletingTask(null)}
                            disabled={isDeleting}
                            className="h-10 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={deleteSingleTask}
                            disabled={isDeleting}
                            className="h-10 rounded-xl bg-[#d44f4f] px-5 text-white hover:bg-[#b83d3d]"
                        >
                            {isDeleting ? 'Menghapus...' : 'Hapus task'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={isBulkDeleteOpen}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setIsBulkDeleteOpen(false);
                    }
                }}
            >
                <DialogContent className="border-[#dfeae3] bg-white sm:max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Hapus task terpilih?
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            {selectedTaskIds.length} task akan dihapus permanen.
                            Tindakan ini tidak bisa dibatalkan.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBulkDeleteOpen(false)}
                            disabled={isDeleting}
                            className="h-10 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                        >
                            Batal
                        </Button>
                        <Button
                            type="button"
                            onClick={deleteSelectedTasks}
                            disabled={isDeleting}
                            className="h-10 rounded-xl bg-[#d44f4f] px-5 text-white hover:bg-[#b83d3d]"
                        >
                            {isDeleting ? 'Menghapus...' : 'Hapus semua'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog
                open={statusTasksStatus !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setStatusTasksStatus(null);
                    }
                }}
            >
                <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] max-w-[1200px] flex-col overflow-hidden border-[#dfeae3] bg-white p-0 sm:max-w-[1200px]">
                    <DialogHeader className="shrink-0 border-b border-[#eaf1ec] px-6 pt-6 pr-14 pb-4">
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Daftar task · {columns.find((column) => column.key === statusTasksStatus)?.label}
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            List task sesuai status board. Data hanya ditampilkan dan tidak diubah dari sini.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex shrink-0 flex-col gap-3 border-b border-[#eaf1ec] bg-[#f8faf7] px-6 py-4 sm:flex-row sm:items-end">
                        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#dfeae3] bg-white px-3 text-[#9aac9f]">
                            <Search className="size-4 shrink-0" />
                            <span className="sr-only">Cari task</span>
                            <input
                                value={statusTasksSearch}
                                onChange={(event) => setStatusTasksSearch(event.target.value)}
                                placeholder="Cari task atau deskripsi..."
                                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[#173d30] outline-none placeholder:text-[#9aac9f]"
                            />
                        </label>
                        <div className="w-full sm:w-[220px]">
                            <Label className="mb-1.5 block text-xs text-[#71877b]">
                                Filter tanggal
                            </Label>
                            <DatePicker
                                value={statusTasksDate}
                                onChange={setStatusTasksDate}
                                placeholder="Semua tanggal"
                            />
                        </div>
                        {statusTasksDate && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStatusTasksDate('')}
                                className="h-11 shrink-0 rounded-xl border-[#dfeae3] px-3 text-xs text-[#557067]"
                            >
                                <Eraser className="size-3.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
                        <div className="overflow-hidden rounded-xl border border-[#dfeae3]">
                            <Table className="min-w-[900px] text-left">
                                <TableHeader className="bg-[#f8faf7] text-[11px] text-[#71877b]">
                                    {statusTasksTable.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => (
                                                <TableHead key={header.id}>
                                                    {header.isPlaceholder ? null : statusTasksTable.FlexRender({ header })}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {statusTasksTable.getRowModel().rows.length > 0 ? statusTasksTable.getRowModel().rows.map((row) => (
                                        <TableRow key={row.id} className="align-top hover:bg-[#fbfdfb]">
                                            {row.getAllCells().map((cell) => (
                                                <TableCell key={cell.id} className="py-4">
                                                    {statusTasksTable.FlexRender({ cell })}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={statusTasksTableColumns.length} className="h-28 text-center text-sm text-[#71877b]">
                                                Tidak ada task yang cocok.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-3 border-t border-[#eaf1ec] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#8aa097]">
                            {statusTasksFiltered.length > 0
                                ? `Menampilkan ${(statusTasksPage - 1) * statusTasksPageSize + 1}–${Math.min(statusTasksPage * statusTasksPageSize, statusTasksFiltered.length)} dari ${statusTasksFiltered.length} task`
                                : '0 task'}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={statusTasksPage === 1}
                                onClick={() => setStatusTasksPage((page) => Math.max(1, page - 1))}
                                className="h-9 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]"
                            >
                                Sebelumnya
                            </Button>
                            <span className="min-w-24 text-center text-xs text-[#71877b]">
                                Halaman {statusTasksPage} dari {statusTasksPageCount}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={statusTasksPage === statusTasksPageCount}
                                onClick={() => setStatusTasksPage((page) => Math.min(statusTasksPageCount, page + 1))}
                                className="h-9 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]"
                            >
                                Berikutnya
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[720px]">
                    <DialogHeader className="border-b border-[#eaf1ec] pb-4">
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Pengajuan timesheet
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            Siapkan data task pada periode terpilih untuk pengajuan timesheet.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submitExport} className="grid gap-5">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="export-name">Name</Label>
                                <Input
                                    id="export-name"
                                    value={auth.user.name}
                                    readOnly
                                    className="h-11 rounded-xl bg-[#f8faf7] text-[#71877b]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="export-created-by">
                                    Created By
                                </Label>
                                <Input
                                    id="export-created-by"
                                    value={auth.user.name}
                                    readOnly
                                    className="h-11 rounded-xl bg-[#f8faf7] text-[#71877b]"
                                />
                            </div>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="export-approved-by">
                                    Approved By
                                </Label>
                                <Input
                                    id="export-approved-by"
                                    value={approvedBy}
                                    onChange={(event) => setApprovedBy(event.target.value)}
                                    readOnly={usesSupervisorApproval}
                                    required
                                    placeholder={usesSupervisorApproval ? 'Atasan belum tersedia' : 'Nama approver'}
                                    className={`h-11 rounded-xl ${usesSupervisorApproval ? 'bg-[#f8faf7] text-[#71877b]' : ''}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="export-approved-role">
                                    Jabatan approver
                                </Label>
                                <Input
                                    id="export-approved-role"
                                    value={approvedRole}
                                    onChange={(event) => setApprovedRole(event.target.value)}
                                    readOnly={usesSupervisorApproval}
                                    placeholder={usesSupervisorApproval ? 'Atasan' : 'Contoh: Dept Head IT Apps'}
                                    className={`h-11 rounded-xl ${usesSupervisorApproval ? 'bg-[#f8faf7] text-[#71877b]' : ''}`}
                                />
                            </div>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="export-department">
                                    Departemen
                                </Label>
                                <Input
                                    id="export-department"
                                    value={department}
                                    onChange={(event) =>
                                        setDepartment(event.target.value)
                                    }
                                    required
                                    placeholder="Contoh: Web Development"
                                    className="h-11 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="export-client">{usesSupervisorApproval ? 'Atasan' : 'Client'}</Label>
                                <Input
                                    id="export-client"
                                    value={client}
                                    onChange={(event) => setClient(event.target.value)}
                                    readOnly={usesSupervisorApproval}
                                    placeholder={usesSupervisorApproval ? 'Nama atasan' : 'SIM'}
                                    className={`h-11 rounded-xl ${usesSupervisorApproval ? 'bg-[#f8faf7] text-[#71877b]' : ''}`}
                                />
                            </div>
                        </div>
                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="export-period">Periode</Label>
                                <DatePicker
                                    value={period}
                                    onChange={changeSubmissionPeriod}
                                    monthOnly
                                    placeholder="Pilih periode"
                                />
                            </div>
                            <div className="rounded-xl border border-[#eaf1ec] bg-[#f8faf7] px-4 py-3 text-xs leading-5 text-[#71877b]">
                                <p>Jam kerja mengikuti template: <strong className="font-semibold text-[#557067]">08.00–17.00</strong>.</p>
                                <p className="mt-1">Sabtu dan Minggu otomatis ditandai dengan tanggal berwarna merah.</p>
                            </div>
                        </div>
                        {usesSupervisorApproval && (
                            <div className="rounded-xl border border-[#d9e9df] bg-[#f8faf7] px-4 py-3 text-xs leading-5 text-[#71877b]">
                                Data atasan diambil otomatis dari relasi akun. Download timesheet hanya tersedia setelah semua task pada periode ini disetujui atasan.
                            </div>
                        )}
                        {selectedSubmissionForExport === null && !hasExistingSubmission && (
                            <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <Label htmlFor="timesheet-signature">
                                        Tanda tangan pengaju
                                    </Label>
                                    <p className="mt-1 text-xs text-[#71877b]">
                                        Tanda tangan disimpan bersama pengajuan dan digunakan saat download timesheet approved.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearSignature}
                                    className="h-9 rounded-lg border-[#dfeae3] px-3 text-xs text-[#557067]"
                                >
                                    <Eraser className="size-3.5" />
                                    Hapus
                                </Button>
                            </div>
                            <div className="overflow-hidden rounded-xl border border-dashed border-[#b9d7c3] bg-white">
                                <canvas
                                    id="timesheet-signature"
                                    ref={signatureCanvasRef}
                                    width={760}
                                    height={190}
                                    onPointerDown={startSignature}
                                    onPointerMove={drawSignature}
                                    onPointerUp={endSignature}
                                    onPointerLeave={endSignature}
                                    className="block h-36 w-full touch-none cursor-crosshair"
                                    aria-label="Area tanda tangan pengaju"
                                />
                            </div>
                            </div>
                        )}
                        {selectedSubmissionForExport !== null && !selectedSubmissionForExport.has_signature && (
                            <div className="rounded-xl border border-[#ecd9a4] bg-[#fffaf0] px-4 py-4 text-sm leading-6 text-[#8a681f]">
                                Tanda tangan bawahan belum tersimpan pada pengajuan lama ini. Pengajuan tidak dapat di-download dengan meminta tanda tangan kedua; buat pengajuan baru agar tanda tangan tersimpan dengan benar.
                            </div>
                        )}
                        <DialogFooter className="border-t border-[#eaf1ec] pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsExportOpen(false)}
                                className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                disabled={hasExistingSubmission || (selectedSubmissionForExport !== null && !selectedSubmissionForExport.has_signature)}
                                className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"
                            >
                                <PenLine className="size-4" />
                                {hasExistingSubmission ? 'Sudah diajukan' : selectedSubmissionForExport === null ? 'Ajukan timesheet' : 'Lanjutkan ke download'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={isDuplicateSubmissionDialogOpen} onOpenChange={setIsDuplicateSubmissionDialogOpen}>
                <DialogContent className="border-[#dfeae3] bg-white sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Pengajuan sudah tersimpan
                        </DialogTitle>
                        <DialogDescription className="leading-6 text-[#71877b]">
                            Pengajuan periode {formatMonth(selectedPeriodKey)} sudah tersimpan. Tidak perlu membuat pengajuan kedua.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-xl border border-[#cfe2d5] bg-[#f3faf5] px-4 py-4 text-sm leading-6 text-[#236d49]">
                        Buka tab Pengajuan untuk melihat status dan download setelah disetujui. Jika ingin mengajukan bulan lain, pilih periode lain pada form.
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsDuplicateSubmissionDialogOpen(false)}
                            className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                        >
                            Pilih periode lain
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setIsDuplicateSubmissionDialogOpen(false);
                                setIsExportOpen(false);
                                setView('submissions');
                            }}
                            className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"
                        >
                            <ClipboardList className="size-4" />
                            Buka tab Pengajuan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[1040px]">
                        <DialogHeader className="border-b border-[#eaf1ec] pb-4">
                            <DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">
                            Konfirmasi timesheet
                            </DialogTitle>
                            <DialogDescription className="leading-6 text-[#71877b]">
                            Data pengajuan tersimpan. Tanda tangan atasan diambil dari approval task.
                            </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={downloadExport} className="grid gap-5">
                        <div className="grid gap-3 rounded-xl border border-[#dfeae3] bg-[#f8faf7] p-4 text-sm sm:grid-cols-2">
                            <div>
                                <span className="text-xs text-[#71877b]">Name</span>
                                <p className="mt-1 font-semibold text-[#173d30]">
                                    {auth.user.name}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-[#71877b]">Departemen</span>
                                <p className="mt-1 font-semibold text-[#173d30]">
                                    {department}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-[#71877b]">Approved By</span>
                                <p className="mt-1 font-semibold text-[#173d30]">
                                    {approvedBy}
                                    {approvedRole ? ` · ${approvedRole}` : ''}
                                </p>
                            </div>
                            <div>
                                <span className="text-xs text-[#71877b]">Periode</span>
                                <p className="mt-1 font-semibold text-[#173d30]">
                                    {period.slice(0, 7)}
                                </p>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-[#dfeae3]">
                            <div className="flex items-center justify-between border-b border-[#eaf1ec] bg-[#f8faf7] px-4 py-3">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#173d30]">
                                        Task periode ini
                                    </h3>
                                    <p className="mt-1 text-xs text-[#71877b]">
                                        {previewTasks.length} task masuk ke kolom description.
                                    </p>
                                </div>
                                <span className="rounded-full bg-[#eaf6ee] px-2.5 py-1 text-xs font-semibold text-[#236d49]">
                                    {period.slice(0, 7)}
                                </span>
                            </div>
                            <div className="max-h-52 overflow-y-auto">
                                {previewTasks.length > 0 ? (
                                    previewTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between gap-4 border-b border-[#eef3ef] px-4 py-3 last:border-b-0"
                                        >
                                            <span className="min-w-0 truncate text-sm text-[#173d30]">
                                                {task.title}
                                            </span>
                                            <span className="shrink-0 text-xs text-[#71877b]">
                                                {formatDate(task.due_date)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="px-4 py-8 text-center text-sm text-[#71877b]">
                                        Belum ada task dengan tanggal pada periode ini.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="rounded-xl border border-[#d9e9df] bg-[#f8faf7] px-4 py-3 text-xs leading-5 text-[#71877b]">
                            Tanda tangan bawahan sudah tersimpan pada data pengajuan. Tanda tangan atasan akan ditambahkan dari hasil approval.
                        </div>
                        {usesSupervisorApproval && !canDownloadTimesheet && (
                            <div className="rounded-xl border border-[#ecd9a4] bg-[#fffaf0] px-4 py-3 text-xs leading-5 text-[#8a681f]">
                                Download terkunci sampai semua task pada periode {period.slice(0, 7)} disetujui atasan.
                            </div>
                        )}
                        <DialogFooter className="border-t border-[#eaf1ec] pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsPreviewOpen(false);
                                    setIsExportOpen(true);
                                }}
                                className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"
                            >
                                Kembali
                            </Button>
                            <Button
                                type="submit"
                                disabled={isDownloading || !canDownloadTimesheet}
                                className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"
                            >
                                <PenLine className="size-4" />
                                {isDownloading ? 'Menyiapkan...' : usesSupervisorApproval ? (canDownloadTimesheet ? 'Download bertanda tangan atasan' : 'Menunggu approval atasan') : 'Tanda tangan & download'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Tasks.layout = {
    breadcrumbs: [
        {
            title: 'Tasks',
            href: tasksIndex(),
        },
    ],
};
