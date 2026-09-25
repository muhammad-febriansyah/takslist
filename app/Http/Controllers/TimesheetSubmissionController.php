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

        $existingSubmission = $user->timesheetSubmissions()->firstWhere('period', $data['period']);
        $submission = $user->timesheetSubmissions()->updateOrCreate(
            ['period' => $data['period']],
            [...$data, 'signature_path' => $signaturePath, 'status' => 'pending', 'submitted_at' => now()],
        );

        if ($existingSubmission?->signature_path !== null) {
            Storage::disk('public')->delete($existingSubmission->signature_path);
        }

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
