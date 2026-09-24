<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTimesheetSubmissionRequest;
use App\TimesheetExportService;
use Illuminate\Http\RedirectResponse;

class TimesheetSubmissionController extends Controller
{
    public function store(
        StoreTimesheetSubmissionRequest $request,
        TimesheetExportService $service,
    ): RedirectResponse {
        $user = $request->user();
        $data = $request->validated();

        if ($user->isBawahan()) {
            $user->loadMissing('supervisor:id,name,position');
            $data['approved_by'] = $user->supervisor?->name ?? $data['approved_by'];
            $data['approved_role'] = $user->supervisor?->position ?? $data['approved_role'];
        }

        $submission = $user->timesheetSubmissions()->updateOrCreate(
            ['period' => $data['period']],
            [...$data, 'status' => 'pending', 'submitted_at' => now()],
        );
        $service->syncSubmissionStatus($submission);

        return back();
    }
}
