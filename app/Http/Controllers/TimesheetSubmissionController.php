<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTimesheetSubmissionRequest;
use App\Notifications\TaskFlowNotification;
use App\Services\TaskReviewService;
use App\TimesheetExportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class TimesheetSubmissionController extends Controller
{
    public function store(
        StoreTimesheetSubmissionRequest $request,
        TimesheetExportService $service,
        TaskReviewService $reviewService,
    ): RedirectResponse {
        $user = $request->user();
        $data = $request->validated();

        if ($user->timesheetSubmissions()->where('period', $data['period'])->exists()) {
            throw ValidationException::withMessages([
                'period' => 'Pengajuan timesheet periode ini sudah ada. Tidak perlu membuat pengajuan lagi.',
            ]);
        }

        $signatureData = $data['signature_data'];
        $signatureBinary = base64_decode(Str::after($signatureData, 'data:image/png;base64,'), true);

        if ($signatureBinary === false || ! str_starts_with($signatureBinary, "\x89PNG\r\n\x1a\n")) {
            throw ValidationException::withMessages([
                'signature_data' => 'Tanda tangan tidak valid.',
            ]);
        }

        unset($data['signature_data']);

        $signaturePath = 'signatures/'.Str::uuid().'.png';
        Storage::disk('public')->put($signaturePath, $signatureBinary);

        if ($user->isBawahan()) {
            $user->loadMissing('supervisor:id,name,position');
            $data['approved_by'] = $user->supervisor?->name ?? $data['approved_by'];
            $data['approved_role'] = $user->supervisor?->position ?? $data['approved_role'];
        }

        $tasks = $user->isBawahan() && $user->supervisor_id !== null
            ? $reviewService->submitCompletedTasks($user, $data['period'])
            : collect();

        $submission = $user->timesheetSubmissions()->create([
            ...$data,
            'signature_path' => $signaturePath,
            'status' => 'pending',
            'submitted_at' => now(),
        ]);

        $service->syncSubmissionStatus($submission);

        if ($tasks->isNotEmpty()) {
            $user->supervisor?->notify(new TaskFlowNotification(
                'info',
                'Pengajuan timesheet baru',
                $user->name.' mengajukan '.$tasks->count().' task untuk periode '.$data['period'].'.',
                route('reviews.index'),
            ));
        }

        Inertia::flash('toast', [
            'type' => $tasks->isNotEmpty() ? 'success' : 'warning',
            'message' => $tasks->isNotEmpty()
                ? 'Pengajuan timesheet tersimpan dan '.$tasks->count().' task dikirim ke atasan.'
                : 'Pengajuan timesheet tersimpan, tetapi tidak ada task Done pada periode ini yang bisa dikirim ke atasan.',
        ]);

        return back();
    }
}
