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

type Review = {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    note: string | null;
    submitted_at: string | null;
    signature_url: string | null;
    task: {
        id: number;
        title: string;
        status: string;
        due_date: string | null;
        owner: { id: number; name: string };
    };
};

const reviewsTableFeatures = tableFeatures({ columnFilteringFeature, globalFilteringFeature });
type ReviewsTableFeatures = typeof reviewsTableFeatures;
const reviewColumnHelper = createColumnHelper<ReviewsTableFeatures, Review>();

const statusLabels: Record<Review['status'], string> = {
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

function RequiredMark() {
    return <span className="text-[#d15a5a]"> *</span>;
}

export default function Reviews({ reviews }: { reviews: Review[] }) {
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | Review['status']>('all');
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

    const filteredReviews = useMemo(() => reviews.filter((review) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesQuery = normalizedQuery === ''
            || review.task.title.toLowerCase().includes(normalizedQuery)
            || review.task.owner.name.toLowerCase().includes(normalizedQuery)
            || (review.note ?? '').toLowerCase().includes(normalizedQuery);
        const matchesStatus = statusFilter === 'all' || review.status === statusFilter;

        return matchesQuery && matchesStatus;
    }), [query, reviews, statusFilter]);
    const pageSize = 10;
    const pageCount = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
    const pageReviews = filteredReviews.slice((page - 1) * pageSize, page * pageSize);
    const pendingCount = reviews.filter((review) => review.status === 'pending').length;

    useEffect(() => {
        setPage(1);
    }, [query, statusFilter]);

    useEffect(() => {
        setSelectedIds((ids) => ids.filter((id) => reviews.some((review) => review.id === id && review.status === 'pending')));
    }, [reviews]);

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

    function openReview(review: Review): void {
        setSelectedReview(review);
        setDecision('approved');
        setSignatureData('');
        setNote('');
        requestAnimationFrame(() => clearSignature('single'));
    }

    function toggleReview(review: Review): void {
        if (review.status !== 'pending') {
            return;
        }
        setSelectedIds((ids) => ids.includes(review.id) ? ids.filter((id) => id !== review.id) : [...ids, review.id]);
    }

    function togglePage(): void {
        const pageIds = pageReviews.filter((review) => review.status === 'pending').map((review) => review.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
        setSelectedIds((ids) => allSelected ? ids.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...ids, ...pageIds])));
    }

    function openBulkReview(): void {
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
            },
            onError: (errors) => toast.error(errors.review_ids ?? errors.signature_data ?? 'Bulk approve gagal.'),
            onFinish: () => setIsBulkProcessing(false),
        });
    }

    const columns = useMemo(() => reviewColumnHelper.columns([
        reviewColumnHelper.display({
            id: 'select',
            header: () => <input type="checkbox" checked={pageReviews.some((review) => review.status === 'pending') && pageReviews.filter((review) => review.status === 'pending').every((review) => selectedIds.includes(review.id))} onChange={togglePage} aria-label="Pilih pengajuan di halaman ini" className="size-4 accent-[#2d875c]" />,
            cell: ({ row }) => <input type="checkbox" checked={selectedIds.includes(row.original.id)} disabled={row.original.status !== 'pending'} onChange={() => toggleReview(row.original)} aria-label={`Pilih ${row.original.task.title}`} className="size-4 accent-[#2d875c]" />,
        }),
        reviewColumnHelper.accessor('task', {
            header: 'Task',
            cell: ({ row }) => <div><p className="font-semibold text-[#173d30]">{row.original.task.title}</p><p className="mt-1 text-xs text-[#8aa097]">Diajukan oleh {row.original.task.owner.name}</p></div>,
        }),
        reviewColumnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${row.original.status === 'approved' ? 'bg-[#eaf6ee] text-[#28754d]' : row.original.status === 'rejected' ? 'bg-[#fff1f1] text-[#c44f4f]' : 'bg-[#fff8e8] text-[#9b762b]'}`}>{statusLabels[row.original.status]}</span>,
        }),
        reviewColumnHelper.accessor('task.due_date', {
            header: 'Tenggat',
            cell: ({ row }) => <span className="text-xs text-[#71877b]">{formatDate(row.original.task.due_date)}</span>,
        }),
        reviewColumnHelper.display({
            id: 'actions',
            header: () => <span className="block text-right">Aksi</span>,
            cell: ({ row }) => row.original.status === 'pending' ? <Button type="button" onClick={() => openReview(row.original)} className="h-9 rounded-lg bg-[#2d8b60] px-3 text-xs font-semibold text-white hover:bg-[#247850]"><PenLine className="size-3.5" /> Review</Button> : row.original.status === 'approved' && row.original.signature_url ? <a href={row.original.signature_url} download className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#eaf4fb] px-3 text-xs font-semibold text-[#3f79ad] hover:bg-[#dcecf9]"><Download className="size-3.5" /> Download ttd</a> : <span className="text-xs text-[#91a49b]">Selesai</span>,
        }),
    ]), [pageReviews, selectedIds]);

    const table = useTable({ features: reviewsTableFeatures, data: pageReviews, columns, state: { globalFilter: query }, manualFiltering: true });

    return (
        <>
            <Head title="Review bawahan" />
            <main className="mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10">
                <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#4b956d] uppercase">ATASAN / REVIEW</p><h1 className="text-3xl font-semibold tracking-[-0.05em] text-[#173d30] sm:text-4xl">Review task bawahan</h1><p className="mt-2 text-sm leading-6 text-[#7f978d]">Periksa hasil kerja, beri catatan, lalu setujui dengan tanda tangan.</p></div><div className="rounded-full border border-[#cfe4d7] bg-[#f0f8f3] px-4 py-2 text-xs font-semibold text-[#26724b]">{pendingCount} menunggu review</div></div>
                <section className="overflow-hidden rounded-3xl border border-[#e1eee7] bg-white shadow-[0_6px_18px_rgba(32,83,57,0.04)]">
                    <div className="flex flex-col gap-3 border-b border-[#edf3ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-2xl bg-[#eaf6ee] text-[#2d875c]"><ClipboardCheck className="size-5" /></span><div><h2 className="text-sm font-semibold text-[#173d30]">Daftar pengajuan</h2><p className="mt-1 text-xs text-[#8aa097]">{reviews.length} pengajuan tercatat</p></div></div>{selectedIds.length > 0 && <Button type="button" onClick={openBulkReview} className="h-10 rounded-full bg-[#2d8b60] px-4 text-xs font-semibold text-white hover:bg-[#247850]"><CheckCircle2 className="size-4" /> Setujui {selectedIds.length}</Button>}</div>
                    <div className="flex flex-col gap-3 border-b border-[#edf3ef] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7"><label className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#8aa097]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari task atau bawahan..." aria-label="Cari pengajuan" className="h-10 rounded-xl border-[#dfeae3] pl-10 text-sm" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 rounded-xl border border-[#dfeae3] bg-white px-3 text-sm text-[#557067] outline-none"><option value="all">Semua status</option><option value="pending">Menunggu</option><option value="approved">Disetujui</option><option value="rejected">Dikembalikan</option></select></div>
                    {reviews.length === 0 ? <div className="px-6 py-20 text-center"><ClipboardCheck className="mx-auto size-9 text-[#65a87d]" /><h2 className="mt-4 text-lg font-semibold text-[#315847]">Belum ada pengajuan review</h2><p className="mt-2 text-sm text-[#8aa097]">Task bawahan yang diajukan akan muncul di sini.</p></div> : <div className="overflow-x-auto"><Table className="min-w-[920px] text-left"><TableHeader className="bg-[#fbfdfb] text-xs text-[#91a49b]">{table.getHeaderGroups().map((headerGroup) => <TableRow key={headerGroup.id}>{headerGroup.headers.map((header) => <TableHead key={header.id} className={header.id === 'select' ? 'w-12 px-5 sm:px-7' : header.id === 'actions' ? 'text-right sm:pr-7' : undefined}>{header.isPlaceholder ? null : table.FlexRender({ header })}</TableHead>)}</TableRow>)}</TableHeader><TableBody>{table.getRowModel().rows.length > 0 ? table.getRowModel().rows.map((row) => <TableRow key={row.id} className="hover:bg-[#fbfdfb]">{row.getAllCells().map((cell) => <TableCell key={cell.id} className={cell.column.id === 'select' ? 'px-5 sm:px-7' : cell.column.id === 'task' ? 'py-4' : cell.column.id === 'actions' ? 'text-right sm:pr-7' : undefined}>{table.FlexRender({ cell })}</TableCell>)}</TableRow>) : <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-sm text-[#8aa097]">Pengajuan tidak ditemukan.</TableCell></TableRow>}</TableBody></Table>{filteredReviews.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf3ef] px-5 py-4 sm:px-7"><p className="text-xs text-[#8aa097]">Menampilkan {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredReviews.length)} dari {filteredReviews.length}</p><div className="flex items-center gap-1.5"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="size-9 rounded-lg border-[#dfeae3] p-0 text-[#557067]"><ChevronLeft className="size-4" /></Button><span className="px-2 text-xs text-[#71877b]">{page}/{pageCount}</span><Button type="button" variant="outline" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="size-9 rounded-lg border-[#dfeae3] p-0 text-[#557067]"><ChevronRight className="size-4" /></Button></div></div>}</div>}
                </section>
            </main>

            <Dialog open={selectedReview !== null} onOpenChange={(open) => !open && setSelectedReview(null)}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[680px]"><DialogHeader className="border-b border-[#eaf1ec] pb-4"><DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">Review task</DialogTitle><DialogDescription className="leading-6 text-[#71877b]">Setujui dengan tanda tangan atau kembalikan dengan catatan.</DialogDescription></DialogHeader>{selectedReview && <Form {...update.form(selectedReview.id)} resetOnSuccess onSuccess={() => setSelectedReview(null)} onError={() => toast.error('Review gagal disimpan.')} className="grid gap-5">{({ processing, errors }) => <><div className="rounded-2xl bg-[#f3f9f5] px-4 py-4"><p className="text-xs text-[#8aa097]">Task · {selectedReview.task.owner.name}</p><h3 className="mt-1 text-lg font-semibold text-[#173d30]">{selectedReview.task.title}</h3></div><div className="grid gap-2"><Label htmlFor="review-note">{decision === 'rejected' ? <>Alasan pengembalian<RequiredMark /></> : 'Catatan review'}</Label><textarea id="review-note" name="note" value={note} onChange={(event) => setNote(event.target.value)} required={decision === 'rejected'} placeholder={decision === 'rejected' ? 'Jelaskan perbaikan yang harus dilakukan bawahan...' : 'Tulis catatan untuk bawahan...'} className="min-h-24 w-full rounded-2xl border border-[#d9e9df] bg-[#fbfdfb] px-3 py-3 text-sm text-[#315847] outline-none focus:border-[#72b68a] focus:ring-2 focus:ring-[#dcefe2]" /><InputError message={errors.note} /></div><div className="grid gap-2"><Label>Keputusan<RequiredMark /></Label><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setDecision('approved')} className={'rounded-2xl border px-4 py-3 text-left text-sm font-semibold ' + (decision === 'approved' ? 'border-[#8bc49d] bg-[#eaf6ee] text-[#28754d]' : 'border-[#dfeae3] text-[#71877b]')}><CheckCircle2 className="mb-2 size-4" />Setujui & ttd</button><button type="button" onClick={() => setDecision('rejected')} className={'rounded-2xl border px-4 py-3 text-left text-sm font-semibold ' + (decision === 'rejected' ? 'border-[#efb8b8] bg-[#fff3f3] text-[#c44f4f]' : 'border-[#dfeae3] text-[#71877b]')}><RotateCcw className="mb-2 size-4" />Kembalikan</button></div><input type="hidden" name="decision" value={decision} /></div>{decision === 'approved' && <div className="grid gap-2"><div className="flex items-center justify-between"><Label>Tanda tangan atasan<RequiredMark /></Label><Button type="button" variant="outline" onClick={() => clearSignature('single')} className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs">Hapus</Button></div><div className="overflow-hidden rounded-2xl border border-dashed border-[#b9d7c3] bg-white"><canvas ref={canvasRef} width={620} height={170} onPointerDown={(event) => startDrawing(event, 'single')} onPointerMove={(event) => draw(event, 'single')} onPointerUp={() => finishDrawing('single')} onPointerLeave={() => finishDrawing('single')} className="block h-36 w-full touch-none cursor-crosshair" /></div><input type="hidden" name="signature_data" value={signatureData} /><InputError message={errors.signature_data} /></div>}<DialogFooter className="border-t border-[#eaf1ec] pt-4"><Button type="button" variant="outline" onClick={() => setSelectedReview(null)} className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]"><X className="size-4" />Batal</Button><Button type="submit" disabled={processing || (decision === 'approved' && !signatureData) || (decision === 'rejected' && !note.trim())} className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]">{processing ? 'Menyimpan...' : decision === 'approved' ? 'Simpan & tanda tangan' : 'Kembalikan task'}</Button></DialogFooter></>}</Form>}</DialogContent></Dialog>

            <Dialog open={isBulkOpen} onOpenChange={(open) => !isBulkProcessing && setIsBulkOpen(open)}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#dfeae3] bg-white sm:max-w-[860px]"><DialogHeader className="border-b border-[#eaf1ec] pb-4"><DialogTitle className="text-xl tracking-[-0.03em] text-[#173d30]">Setujui banyak task</DialogTitle><DialogDescription className="leading-6 text-[#71877b]">{selectedIds.length} pengajuan akan disetujui dengan satu tanda tangan atasan.</DialogDescription></DialogHeader><form onSubmit={submitBulkApproval} className="grid gap-5"><div className="rounded-2xl bg-[#f3f9f5] px-4 py-4 text-sm text-[#557067]">Status semua task terpilih akan menjadi <strong className="text-[#28754d]">Done</strong>.</div><div className="grid gap-2"><Label htmlFor="bulk-note">Catatan review</Label><textarea id="bulk-note" value={bulkNote} onChange={(event) => setBulkNote(event.target.value)} placeholder="Catatan untuk semua bawahan (opsional)..." className="min-h-24 w-full rounded-2xl border border-[#d9e9df] bg-[#fbfdfb] px-3 py-3 text-sm text-[#315847] outline-none focus:border-[#72b68a] focus:ring-2 focus:ring-[#dcefe2]" /></div><div className="grid gap-2"><div className="flex items-center justify-between"><Label>Tanda tangan atasan<RequiredMark /></Label><Button type="button" variant="outline" onClick={() => clearSignature('bulk')} className="h-8 rounded-lg border-[#dfeae3] px-3 text-xs">Hapus</Button></div><div className="overflow-hidden rounded-2xl border border-dashed border-[#b9d7c3] bg-white"><canvas ref={bulkCanvasRef} width={620} height={170} onPointerDown={(event) => startDrawing(event, 'bulk')} onPointerMove={(event) => draw(event, 'bulk')} onPointerUp={() => finishDrawing('bulk')} onPointerLeave={() => finishDrawing('bulk')} className="block h-36 w-full touch-none cursor-crosshair" /></div></div><DialogFooter className="border-t border-[#eaf1ec] pt-4"><Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)} className="h-11 rounded-xl border-[#dfeae3] px-5 text-[#557067]">Batal</Button><Button type="submit" disabled={isBulkProcessing || !bulkSignatureData} className="h-11 rounded-xl bg-[#2d875c] px-5 text-white hover:bg-[#236d49]">{isBulkProcessing ? 'Menyimpan...' : `Setujui ${selectedIds.length} task`}</Button></DialogFooter></form></DialogContent></Dialog>
        </>
    );
}
