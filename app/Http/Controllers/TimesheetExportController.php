<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExportTimesheetRequest;
use App\Models\User;
use App\TimesheetExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class TimesheetExportController extends Controller
{
    public function __invoke(
        ExportTimesheetRequest $request,
        TimesheetExportService $service,
    ): BinaryFileResponse|JsonResponse {
        /** @var User $user */
        $user = $request->user();
        $options = $request->validated();
        $options['signature_data'] ??= $service->signatureDataForSubmission($user, $options['period']);

        if ($options['signature_data'] === null) {
            return response()->json([
                'message' => 'Tanda tangan Officer belum tersimpan. Ajukan ulang timesheet dengan tanda tangan.',
            ], 422);
        }

        if ($user->isBawahan()) {
            $user->loadMissing('supervisor:id,name,position');
            $options['supervisor_signature_data'] = $service->signatureDataForPeriod($user, $options['period']);
            $options['approved_by'] = $user->supervisor?->name ?? $options['approved_by'];
            $options['approved_role'] = $user->supervisor?->position ?? $options['approved_role'] ?? null;
        }

        $options['edited_rows'] = $user->timesheetSubmissions()
            ->where('period', $options['period'])
            ->first(['edited_rows'])
            ?->edited_rows;

        $path = $service->generate($user, $options);
        $period = Str::of($options['period'])->replace('-', '');

        return response()->download(
            $path,
            "timesheet-{$period}.xlsx",
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        )->deleteFileAfterSend(true);
    }
}
