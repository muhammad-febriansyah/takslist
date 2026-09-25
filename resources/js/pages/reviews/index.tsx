import { Form, Head, router } from '@inertiajs/react';
import { columnFilteringFeature, createColumnHelper, globalFilteringFeature, tableFeatures, useTable } from '@tanstack/react-table';
import { CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Download, PenLine, RotateCcw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { bulkApprove, update } from '@/routes/reviews';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

type ReviewTask = {
    review_id: number;
    review_status: ReviewStatus;
    note: string | null;
    signature_url: string | null;
    id: number;
    title: string;
    status: string;
    due_date: string | null;
};

type Submission = {
    id: string;
    period: string | null;
    status: ReviewStatus;
    submitted_at: string | null;
    review_ids: number[];
    pending_review_ids: number[];
    owner: { id: number; name: string };
    tasks: ReviewTask[];
};

type SelectedReview = {
    task: ReviewTask;
    owner: Submission['owner'];
};

const reviewTableFeatures = tableFeatures({ columnFilteringFeature, globalFilteringFeature });
type ReviewTableFeatures = typeof reviewTableFeatures;
const submissionColumnHelper = createColumnHelper<ReviewTableFeatures, Submission>();

const statusLabels: Record<ReviewStatus, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Dikembalikan',
};

function formatDate(date: string | null): string {
    if (!date) {
        return 'Tanpa tanggal';
    }

    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${date}T00:00:00`));
}

function formatPeriod(period: string | null): string {
    if (!period) {
        return 'Tanpa periode';
    }

    return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${period}-01T00:00:00`));
}

function statusClass(status: ReviewStatus): string {
    return status === 'approved'
        ? 'bg-[#eaf6ee] text-[#28754d]'
        : status === 'rejected'
            ? 'bg-[#fff1f1] text-[#c44f4f]'
            : 'bg-[#fff8e8] text-[#9b762b]';
}

function RequiredMark() {
    return <span className="text-[#d15a5a]"> *</span>;
}

export default function Reviews({ submissions }: { submissions: Submission[] }) {
    const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
    const [selectedReview, setSelectedReview] = useState<SelectedReview | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
    const [page, setPage] = useState(1);
    const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
    const [signatureData, setSignatureData] = useState('');
    const [bulkSignatureData, setBulkSignatureData] = useState('');
    const [note, setNote] = useState('');
    const [bulkNote, setBulkNote] = useState('');
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bulkCanvasRef = useRef<HTMLCanvasElement>(null);
    const drawingTarget = useRef<'single' | 'bulk' | null>(null);

    const filteredSubmissions = useMemo(() => submissions.filter((submission) => {
        const normalizedQuery = query.trim().toLowerCase();
        const taskText = submission.tasks
            .map((task) => `${task.title} ${task.note ?? ''}`)
            .join(' ')
            .toLowerCase();
        const matchesQuery = normalizedQuery === ''
            || submission.owner.name.toLowerCase().includes(normalizedQuery)
            || formatPeriod(submission.period).toLowerCase().includes(normalizedQuery)
            || taskText.includes(normalizedQuery);
        const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;

        return matchesQuery && matchesStatus;
    }), [query, statusFilter, submissions]);
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
    const pageSubmissions = filteredSubmissions.slice((page - 1) * pageSize, page * pageSize);
    const pendingCount = submissions.filter((submission) => submission.status === 'pending').length;
    const selectedTaskReviews = useMemo(() => submissions
        .flatMap((submission) => submission.tasks)
        .filter((task) => selectedIds.includes(task.review_id)), [selectedIds, submissions]);

    useEffect(() => {
        setPage(1);
    }, [query, statusFilter]);

    useEffect(() => {
        const pendingIds = submissions.flatMap((submission) => submission.pending_review_ids);
        setSelectedIds((ids) => ids.filter((id) => pendingIds.includes(id)));
    }, [submissions]);

    useEffect(() => {
        if (page > pageCount) {
            setPage(pageCount);
        }
    }, [page, pageCount]);

    function canvasFor(target: 'single' | 'bulk'): HTMLCanvasElement | null {
        return target === 'single' ? canvasRef.current : bulkCanvasRef.current;
    }

    function point(event: PointerEvent<HTMLCanvasElement>, target: 'single' | 'bulk'): { x: number; y: number } | null {
        const canvas = canvasFor(target);
        if (!canvas) {
            return null;
        }
        const bounds = canvas.getBoundingClientRect();

        return {
            x: ((event.clientX - bounds.left) / bounds.width) * canvas.width,
            y: ((event.clientY - bounds.top) / bounds.height) * canvas.height,
        };
    }

    function startDrawing(event: PointerEvent<HTMLCanvasElement>, target: 'single' | 'bulk'): void {
        const canvas = canvasFor(target);
        const context = canvas?.getContext('2d');
        const position = point(event, target);
        if (!canvas || !context || !position) {
            return;
        }
        canvas.setPointerCapture(event.pointerId);
        context.beginPath();
        context.moveTo(position.x, position.y);
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.strokeStyle = '#173d30';
        drawingTarget.current = target;
    }

    function draw(event: PointerEvent<HTMLCanvasElement>, target: 'single' | 'bulk'): void {
        if (drawingTarget.current !== target) {
            return;
        }
        const context = canvasFor(target)?.getContext('2d');
        const position = point(event, target);
        if (!context || !position) {
            return;
        }
        context.lineTo(position.x, position.y);
        context.stroke();
    }

    function finishDrawing(target: 'single' | 'bulk'): void {
        if (drawingTarget.current !== target) {
            return;
        }
        drawingTarget.current = null;
        const data = canvasFor(target)?.toDataURL('image/png') ?? '';
        if (target === 'single') {
            setSignatureData(data);
        } else {
            setBulkSignatureData(data);
        }
    }

    function clearSignature(target: 'single' | 'bulk'): void {
        const canvas = canvasFor(target);
        const context = canvas?.getContext('2d');
        if (canvas && context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (target === 'single') {
            setSignatureData('');
        } else {
            setBulkSignatureData('');
        }
    }

    function openReview(task: ReviewTask, submission: Submission): void {
        setSelectedReview({ task, owner: submission.owner });
        setDecision('approved');
        setSignatureData('');
        setNote('');
        requestAnimationFrame(() => clearSignature('single'));
    }

    function toggleSubmission(submission: Submission): void {
        const ids = submission.pending_review_ids;
        const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
        setSelectedIds((currentIds) => allSelected
            ? currentIds.filter((id) => !ids.includes(id))
            : Array.from(new Set([...currentIds, ...ids])));
    }

    function togglePage(): void {
        const pageIds = pageSubmissions.flatMap((submission) => submission.pending_review_ids);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
        setSelectedIds((ids) => allSelected ? ids.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...ids, ...pageIds])));
    }

    function openBulkReview(reviewIds: number[] = selectedIds): void {
        if (reviewIds.length === 0) {
            return;
        }
        setSelectedIds(Array.from(new Set(reviewIds)));
        setBulkNote('');
        setBulkSignatureData('');
        setIsBulkOpen(true);
        requestAnimationFrame(() => clearSignature('bulk'));
    }

    function submitBulkApproval(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        if (selectedIds.length === 0 || !bulkSignatureData) {
            return;
        }
        setIsBulkProcessing(true);
        router.post(bulkApprove().url, { review_ids: selectedIds, note: bulkNote, signature_data: bulkSignatureData }, {
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds([]);
                setIsBulkOpen(false);
                setSelectedSubmission(null);
            },
            onError: (errors) => toast.error(errors.review_ids ?? errors.signature_data ?? 'Bulk approve gagal.'),
            onFinish: () => setIsBulkProcessing(false),
        });
    }

    const columns = useMemo(() => submissionColumnHelper.columns([
        submissionColumnHelper.display({
            id: 'select',
            header: () => {
                const pageIds = pageSubmissions.flatMap((submission) => submission.pending_review_ids);

                return <input type="checkbox" checked={pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id))} onChange={togglePage} aria-label="Pilih pengajuan di halaman ini" className="size-4 accent-[#2d875c]" />;
            },
            cell: ({ row }) => {
                const submission = row.original;
                const ids = submission.pending_review_ids;

                return <input type="checkbox" checked={ids.length > 0 && ids.every((id) => selectedIds.includes(id))} disabled={ids.length === 0} onChange={() => toggleSubmission(submission)} aria-label={`Pilih pengajuan ${submission.owner.name} ${formatPeriod(submission.period)}`} className="size-4 accent-[#2d875c]" />;
            },
        }),
        submissionColumnHelper.accessor('period', {
            id: 'submission',
            header: 'Pengajuan',
            cell: ({ row }) => <div><p className="font-semibold text-[#173d30]">{formatPeriod(row.original.period)}</p><p className="mt-1 text-xs text-[#8aa097]">{row.original.owner.name}</p></div>,
        }),
        submissionColumnHelper.display({
            id: 'tasks',
            header: 'Task',
            cell: ({ row }) => <div className="max-w-[360px]"><p className="font-semibold text-[#315847]">{row.original.tasks.length} task diajukan</p><p className="mt-1 truncate text-xs text-[#8aa097]">{row.original.tasks.map((task) => task.title).join(' · ')}</p></div>,
        }),
        submissionColumnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(row.original.status)}`}>{statusLabels[row.original.status]}</span>,
        }),
        submissionColumnHelper.display({
            id: 'actions',
            header: () => <span className="block text-right">Aksi</span>,
            cell: ({ row }) => <Button type="button" variant="outline" onClick={() => setSelectedSubmission(row.original)} className="h-9 rounded-lg border-[#dfeae3] px-3 text-xs font-semibold text-[#2d875c] hover:bg-[#f0f8f3]">{row.original.status === 'pending' ? <><PenLine className="size-3.5" /> Review</> : 'Lihat detail'}</Button>,
        }),
    ]), [pageSubmissions, selectedIds]);

    const table = useTable({ features: reviewTableFeatures, data: pageSubmissions, columns, state: { globalFilter: query }, manualFiltering: true });

    return (
        <>
            <Head title="Review bawahan" />
            <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10">
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#4b956d] uppercase">ATASAN / REVIEW</p><h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30] sm:text-4xl">Review task bawahan</h1><p className="mt-2 text-sm leading-6 text-[#7f978d]">Periksa pengajuan per periode, beri catatan, lalu setujui dengan tanda tangan.</p></div><div className="rounded-full border border-[#cfe4d7] bg-[#f0f8f3] px-4 py-2 text-xs font-semibold text-[#26724b]">{pendingCount} menunggu review</div></div>
                <section className="overflow-hidden rounded-3xl border border-[#e1eee7] bg-white shadow-[0_6px_18px_rgba(32,83,57,0.04)]">
                    <div className="flex flex-col gap-3 border-b border-[#edf3ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-[#eaf6ee] text-[#2d875c]"><ClipboardCheck className="size-5" /></span><div><h2 className="text-sm font-semibold text-[#173d30]">Daftar pengajuan</h2><p className="mt-1 text-xs text-[#8aa097]">{submissions.length} pengajuan tercatat</p></div></div>{selectedIds.length > 0 && <Button type="button" onClick={() => openBulkReview()} className="h-10 rounded-full bg-[#2d8b60] px-4 text-xs font-semibold text-white hover:bg-[#247850]"><CheckCircle2 className="size-4" /> Setujui {selectedIds.length} task</Button>}</div>
                    <div className="flex flex-col gap-3 border-b border-[#edf3ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><label className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8aa097]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari periode, nama, atau task..." aria-label="Cari pengajuan" className="h-10 rounded-xl border-[#dfeae3] pl-10 text-sm" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-xl border border-[#dfeae3] bg-white px-3 text-sm text-[#557067] outline-none"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Dikembalikan</option></select></div>
                    {submissions.length === 0 ? <div className="px-6 py-20 text-center"><ClipboardCheck className="mx-auto size-9 text-[#65a87d]" /><h2 className="mt-4 text-lg font-semibold text-[#315847]">Belum ada pengajuan review</h2><p className="mt-2 text-sm text-[#8aa097]">Pengajuan bawahan akan muncul per periode di sini.</p></div> : <div className="overflow-x-auto"><Table className="min-w-[920px] text-left"><TableHeader className="bg-[#fbfdfb] text-xs text-[#91a49b]">{table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => <TableHead key={header.id} className={header.id === 'select' ? 'w-12 px-5 sm:px-7' : header.id === 'actions' ? 'text-right sm:pr-7' : undefined}>{header.isPlaceholder ? null : table.FlexRender({ header })}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => <TableRow key={row.id} className="hover:bg-[#fbfdfb]">{row.getAllCells().map((cell) => <TableCell key={cell.id} className={cell.column.id === 'select' ? 'px-5 sm:px-7' : cell.column.id === 'submission' || cell.column.id === 'tasks' ? 'py-4' : cell.column.id === 'actions' ? 'text-right sm:pr-7' : undefined}>{table.FlexRender({ cell })}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-sm text-[#8aa097]">Pengajuan tidak ditemukan.</TableCell></TableRow>}</TableBody></Table>{filteredSubmissions.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ef] px-5 py-4 sm:px-7"><p className="text-xs text-[#8aa097]">Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredSubmissions.length)} dari {filteredSubmissions.length}</p><div className="flex items-center gap-1.5"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="size-9 rounded-lg border-[#dfeae3] p-0 text-[#557067]"><ChevronLeft className="size-4" /></Button><span className="px-2 text-xs text-[#71877b]">{page}/{pageCount}</span><Button type="button" variant="outline" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="size-9 rounded-lg border-[#dfeae3] p-0 text-[#557067]"><ChevronRight className="size-4" /></Button></div></div>}</div>}
                </section>
            </main>

            <Dialog open={selectedSubmission !== null} onOpenChange={(open) => !open && setSelectedSubmission(null)}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[900px]"><DialogHeader className="border-b border-[#eaf1ec] pb-4"><DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">Detail pengajuan</DialogTitle><DialogDescription className="leading-6 text-[#71877b]">{selectedSubmission && `${formatPeriod(selectedSubmission.period)} · ${selectedSubmission.owner.name}`}</DialogDescription></DialogHeader>{selectedSubmission && <div className="grid gap-5"><div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f3f9f5] px-4 py-4"><div><p className="text-xs text-[#8aa097]">{selectedSubmission.owner.name}</p><h3 className="mt-1 text-lg font-semibold text-[#173d30]">{formatPeriod(selectedSubmission.period)}</h3></div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(selectedSubmission.status)}`}>{statusLabels[selectedSubmission.status]}</span></div><div className="overflow-hidden rounded-2xl border border-[#e1eee7]"><Table><TableHeader className="bg-[#fbfdfb] text-xs text-[#91a49b]"><TableRow><TableHead>Task</TableHead><TableHead>Status</TableHead><TableHead>Tenggat</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{selectedSubmission.tasks.map((task) => <TableRow key={task.review_id}><TableCell><p className="font-semibold text-[#173d30]">{task.title}</p>{task.note && <p className="mt-1 max-w-[420px] truncate text-xs text-[#8aa097]">{task.note}</p>}</TableCell><TableCell><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(task.review_status)}`}>{statusLabels[task.review_status]}</span></TableCell><TableCell className="text-xs text-[#71877b]">{formatDate(task.due_date)}</TableCell><TableCell className="text-right">{task.review_status === 'pending' ? <Button type="button" onClick={() => openReview(task, selectedSubmission)} className="h-9 rounded-lg bg-[#2d8b60] px-3 text-xs font-semibold text-white hover:bg-[#247850]"><PenLine className="size-3.5" /> Review</Button> : task.review_status === 'approved' && task.signature_url ? <a href={task.signature_url} download className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#eaf4fb] px-3 text-xs font-semibold text-[#3f79ad] hover:bg-[#dcecf9]"><Download className="size-3.5" /> Download ttd</a> : <span className="text-xs text-[#91a49b]">Selesai</span>}</TableCell></TableRow>)}</TableBody></Table></div>{selectedSubmission.pending_review_ids.length > 1 && <Button type="button" onClick={() => { setSelectedSubmission(null); openBulkReview(selectedSubmission.pending_review_ids); }} className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]"><CheckCircle2 className="size-4" /> Setujui semua task</Button>}</div>}</DialogContent></Dialog>

            <Dialog open={selectedReview !== null} onOpenChange={(open) => !open && setSelectedReview(null)}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[680px]"><DialogHeader className="border-b border-[#eaf1ec] pb-4"><DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">Review task</DialogTitle><DialogDescription className="leading-6 text-[#71877b]">Setujui dengan tanda tangan atau kembalikan dengan catatan.</DialogDescription></DialogHeader>{selectedReview && <Form {...update.form(selectedReview.task.review_id)} resetOnSuccess onSuccess={() => { setSelectedReview(null); setSelectedSubmission(null); }} onError={() => toast.error('Review gagal disimpan.')} className="grid gap-5">{({ processing, errors }) => <><div className="rounded-2xl bg-[#f3f9f5] px-4 py-4"><p className="text-xs text-[#8aa097]">{formatPeriod(selectedSubmission?.period ?? null)} · {selectedReview.owner.name}</p><h3 className="mt-1 text-lg font-semibold text-[#173d30]">{selectedReview.task.title}</h3></div><div className="grid gap-2"><Label htmlFor="review-note">{decision === 'rejected' ? <>Alasan pengembalian<RequiredMark /></> : 'Catatan review'}</Label><textarea id="review-note" name="note" value={note} onChange={(event) => setNote(event.target.value)} required={decision === 'rejected'} placeholder={decision === 'rejected' ? 'Jelaskan perbaikan yang harus dilakukan bawahan...' : 'Tulis catatan untuk bawahan...'} className="min-h-24 w-full rounded-2xl border border-[#d9e9df] bg-[#fbfdfb] px-3 py-3 text-sm text-[#315847] outline-none focus:border-[#72b68a] focus:ring-2 focus:ring-[#dcefe2]" /><InputError message={errors.note} /></div><div className="grid gap-2"><Label>Keputusan<RequiredMark /></Label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setDecision('approved')} className={'rounded-2xl border px-4 py-3 text-left text-sm font-semibold ' + (decision === 'approved' ? 'border-[#8bc49d] bg-[#eaf6ee] text-[#28754d]' : 'border-[#dfeae3] text-[#71877b]')}><CheckCircle2 className="mb-2 size-4" />Setujui & ttd</button><button type="button" onClick={() => setDecision('rejected')} className={'rounded-2xl border px-4 py-3 text-left text-sm font-semibold ' + (decision === 'rejected' ? 'border-[#efb8b8] bg-[#fff3f3] text-[#c44f4f]' : 'border-[#dfeae3] text-[#71877b]')}><RotateCcw className="mb-2 size-4" />Kembalikan</button></div><input type="hidden" name="decision" value={decision} /></div>{decision === 'approved' && <div className="grid gap-2"><div className="flex items-center justify-between"><Label>Tanda tangan atasan<RequiredMark /></Label><Button type="button" variant="outline" onClick={() => clearSignature('single')} className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs">Hapus</Button></div><div className="overflow-hidden rounded-2xl border border-dashed border-[#b9d7c3] bg-white"><canvas ref={canvasRef} width={620} height={170} onPointerDown={(event) => startDrawing(event, 'single')} onPointerMove={(event) => draw(event, 'single')} onPointerUp={() => finishDrawing('single')} onPointerLeave={() => finishDrawing('single')} className="block h-36 w-full touch-none cursor-crosshair" /></div><input type="hidden" name="signature_data" value={signatureData} /><InputError message={errors.signature_data} /></div>}<DialogFooter className="border-t border-[#eaf1ec] pt-4"><Button type="button" variant="outline" onClick={() => setSelectedReview(null)} className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"><X className="size-4" />Batal</Button><Button type="submit" disabled={processing || (decision === 'approved' && !signatureData) || (decision === 'rejected' && !note.trim())} className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]">{processing ? 'Menyimpan...' : decision === 'approved' ? 'Simpan & tanda tangan' : 'Kembalikan task'}</Button></DialogFooter></>}</Form>}</DialogContent></Dialog>

            <Dialog open={isBulkOpen} onOpenChange={(open) => !isBulkProcessing && setIsBulkOpen(open)}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[860px]"><DialogHeader className="border-b border-[#eaf1ec] pb-4"><DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">Setujui banyak task</DialogTitle><DialogDescription className="leading-6 text-[#71877b]">{selectedIds.length} task pada pengajuan terpilih akan disetujui dengan satu tanda tangan atasan.</DialogDescription></DialogHeader><form onSubmit={submitBulkApproval} className="grid gap-5"><div className="rounded-2xl bg-[#f3f9f5] px-4 py-4 text-sm text-[#557067]">Status semua task terpilih akan menjadi <strong className="text-[#28754d]">Done</strong>.</div>{selectedTaskReviews.length > 0 && <div className="grid gap-2"><Label>Task yang dipilih</Label><div className="max-h-40 overflow-y-auto rounded-2xl border border-[#e1eee7] bg-[#fbfdfb]">{selectedTaskReviews.map((task) => <div key={task.review_id} className="border-b border-[#edf3ef] px-4 py-3 text-sm text-[#315847] last:border-b-0">{task.title}<span className="ml-2 text-xs text-[#8aa097]">{formatDate(task.due_date)}</span></div>)}</div></div>}<div className="grid gap-2"><Label htmlFor="bulk-note">Catatan review</Label><textarea id="bulk-note" value={bulkNote} onChange={(event) => setBulkNote(event.target.value)} placeholder="Catatan untuk semua bawahan (opsional)..." className="min-h-24 w-full rounded-2xl border border-[#d9e9df] bg-[#fbfdfb] px-3 py-3 text-sm text-[#315847] outline-none focus:border-[#72b68a] focus:ring-2 focus:ring-[#dcefe2]" /></div><div className="grid gap-2"><div className="flex items-center justify-between"><Label>Tanda tangan atasan<RequiredMark /></Label><Button type="button" variant="outline" onClick={() => clearSignature('bulk')} className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs">Hapus</Button></div><div className="overflow-hidden rounded-2xl border border-dashed border-[#b9d7c3] bg-white"><canvas ref={bulkCanvasRef} width={620} height={170} onPointerDown={(event) => startDrawing(event, 'bulk')} onPointerMove={(event) => draw(event, 'bulk')} onPointerUp={() => finishDrawing('bulk')} onPointerLeave={() => finishDrawing('bulk')} className="block h-36 w-full touch-none cursor-crosshair" /></div></div><DialogFooter className="border-t border-[#eaf1ec] pt-4"><Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)} className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]">Batal</Button><Button type="submit" disabled={isBulkProcessing || !bulkSignatureData} className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]">{isBulkProcessing ? 'Menyimpan...' : `Setujui ${selectedIds.length} task`}</Button></DialogFooter></form></DialogContent></Dialog>
        </>
    );
}
