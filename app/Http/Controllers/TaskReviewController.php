<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkApproveReviewsRequest;
use App\Http\Requests\ReviewTaskRequest;
use App\Http\Requests\SubmitPeriodReviewRequest;
use App\Http\Requests\SubmitTaskReviewRequest;
use App\Models\Task;
use App\Models\TaskReview;
use App\Notifications\TaskFlowNotification;
use App\TimesheetExportService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TaskReviewController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', TaskReview::class);

        $reviews = TaskReview::query()
            ->where('reviewer_id', $request->user()->id)
            ->with(['task:id,title,status,due_date,user_id', 'task.user:id,name,email'])
            ->latest()
            ->get()
            ->map(fn (TaskReview $review): array => [
                'id' => $review->id,
                'status' => $review->status,
                'note' => $review->note,
                'submitted_at' => $review->created_at?->toIso8601String(),
                'signature_url' => $review->signature_path
                    ? route('reviews.signature', $review)
                    : null,
                'task' => [
                    'id' => $review->task->id,
                    'title' => $review->task->title,
                    'status' => $review->task->status,
                    'due_date' => $review->task->due_date?->toDateString(),
                    'owner' => $review->task->user->only(['id', 'name']),
                ],
            ])
            ->values();

        return Inertia::render('reviews/index', ['reviews' => $reviews]);
    }

    public function store(SubmitTaskReviewRequest $request, Task $task): RedirectResponse
    {
        Gate::authorize('submitReview', $task);

        if ($task->reviews()->where('status', 'pending')->exists()) {
            throw ValidationException::withMessages([
                'task' => 'Task sudah menunggu review atasan.',
            ]);
        }

        $task->reviews()->create([
            'submitted_by' => $request->user()->id,
            'reviewer_id' => $request->user()->supervisor_id,
            'status' => 'pending',
        ]);
        $task->update(['status' => 'review']);

        $request->user()->supervisor?->notify(new TaskFlowNotification(
            'info',
            'Pengajuan review baru',
            $request->user()->name.' mengajukan "'.$task->title.'" untuk diperiksa.',
            route('reviews.index'),
        ));

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Task berhasil diajukan untuk review.']);

        return back();
    }

    public function storeForPeriod(SubmitPeriodReviewRequest $request): RedirectResponse
    {
        $user = $request->user();
        $period = $request->validated('period');
        $periodStart = CarbonImmutable::createFromFormat('!Y-m', $period)->startOfMonth();
        $periodEnd = $periodStart->endOfMonth();

        $tasks = DB::transaction(function () use ($user, $periodStart, $periodEnd): Collection {
            $tasks = Task::query()
                ->ownedBy($user)
                ->where('status', 'done')
                ->whereBetween('due_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                ->whereDoesntHave('reviews', fn ($query) => $query->whereIn('status', ['pending', 'approved']))
                ->lockForUpdate()
                ->get();

            foreach ($tasks as $task) {
                $task->reviews()->create([
                    'submitted_by' => $user->id,
                    'reviewer_id' => $user->supervisor_id,
                    'status' => 'pending',
                ]);
                $task->update(['status' => 'review']);
            }

            return $tasks;
        });

        if ($tasks->isEmpty()) {
            Inertia::flash('toast', [
                'type' => 'warning',
                'message' => 'Tidak ada task selesai yang bisa diajukan pada periode ini.',
            ]);

            return back();
        }

        $user->supervisor?->notify(new TaskFlowNotification(
            'info',
            'Pengajuan review periode baru',
            $user->name.' mengajukan '.$tasks->count().' task untuk periode '.$period.'.',
            route('reviews.index'),
        ));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $tasks->count().' task periode '.$period.' berhasil diajukan untuk review.',
        ]);

        return back();
    }

    public function signature(TaskReview $review): StreamedResponse
    {
        Gate::authorize('view', $review);

        if ($review->signature_path === null || ! Storage::disk('public')->exists($review->signature_path)) {
            abort(404);
        }

        return Storage::disk('public')->download(
            $review->signature_path,
            'tanda-tangan-review-'.$review->id.'.png',
        );
    }

    public function update(
        ReviewTaskRequest $request,
        TaskReview $review,
        TimesheetExportService $timesheetService,
    ): RedirectResponse {
        Gate::authorize('update', $review);
        $validated = $request->validated();
        $signaturePath = null;

        if ($validated['decision'] === 'approved') {
            $encoded = Str::after($validated['signature_data'], 'data:image/png;base64,');
            $binary = base64_decode($encoded, true);

            if ($binary === false || $binary === '') {
                throw ValidationException::withMessages([
                    'signature_data' => 'Tanda tangan tidak valid.',
                ]);
            }

            $signaturePath = 'signatures/'.Str::uuid().'.png';
            Storage::disk('public')->put($signaturePath, $binary);
        }

        DB::transaction(function () use ($review, $validated, $signaturePath): void {
            $review->update([
                'status' => $validated['decision'] === 'approved' ? 'approved' : 'rejected',
                'note' => $validated['note'] ?? null,
                'signature_path' => $signaturePath,
                'signed_at' => $validated['decision'] === 'approved' ? now() : null,
            ]);
            $review->task()->update([
                'status' => $validated['decision'] === 'approved' ? 'done' : 'in_progress',
                'completed_at' => $validated['decision'] === 'approved' ? now() : null,
            ]);
        });

        $review->loadMissing(['submitter:id,name', 'task:id,title,due_date,user_id']);
        $timesheetService->syncSubmissionForTask($review->task);
        $isApproved = $validated['decision'] === 'approved';
        $review->submitter?->notify(new TaskFlowNotification(
            $isApproved ? 'success' : 'warning',
            $isApproved ? 'Task disetujui' : 'Task dikembalikan',
            $isApproved
                ? '"'.$review->task?->title.'" telah disetujui dan ditandatangani.'
                : '"'.$review->task?->title.'" perlu diperbaiki. '.($validated['note'] ?? ''),
            route('tasks.index'),
        ));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $validated['decision'] === 'approved' ? 'Task disetujui dan ditandatangani.' : 'Task dikembalikan ke bawahan.',
        ]);

        return back();
    }

    public function bulkApprove(
        BulkApproveReviewsRequest $request,
        TimesheetExportService $timesheetService,
    ): RedirectResponse {
        Gate::authorize('viewAny', TaskReview::class);
        $validated = $request->validated();
        $reviews = TaskReview::query()
            ->whereIn('id', $validated['review_ids'])
            ->where('reviewer_id', $request->user()->id)
            ->where('status', 'pending')
            ->with(['task:id,title,user_id,due_date', 'task.user:id,name'])
            ->get();

        if ($reviews->count() !== count($validated['review_ids'])) {
            throw ValidationException::withMessages([
                'review_ids' => 'Sebagian pengajuan sudah diproses atau bukan tanggung jawab Anda.',
            ]);
        }

        $signatureBinary = $this->signatureBinary($validated['signature_data']);

        DB::transaction(function () use ($reviews, $validated, $signatureBinary): void {
            foreach ($reviews as $review) {
                $signaturePath = 'signatures/'.Str::uuid().'.png';
                Storage::disk('public')->put($signaturePath, $signatureBinary);
                $review->update([
                    'status' => 'approved',
                    'note' => $validated['note'] ?? null,
                    'signature_path' => $signaturePath,
                    'signed_at' => now(),
                ]);
                $review->task()->update(['status' => 'done', 'completed_at' => now()]);
            }
        });

        foreach ($reviews as $review) {
            $timesheetService->syncSubmissionForTask($review->task);
            $review->task?->user?->notify(new TaskFlowNotification(
                'success',
                'Task disetujui',
                '"'.$review->task?->title.'" telah disetujui dan ditandatangani.',
                route('tasks.index'),
            ));
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $reviews->count().' task berhasil disetujui dan ditandatangani.',
        ]);

        return back();
    }

    private function signatureBinary(string $signatureData): string
    {
        $encoded = Str::after($signatureData, 'data:image/png;base64,');
        $binary = base64_decode($encoded, true);

        if ($binary === false || $binary === '') {
            throw ValidationException::withMessages([
                'signature_data' => 'Tanda tangan tidak valid.',
            ]);
        }

        return $binary;
    }
}
