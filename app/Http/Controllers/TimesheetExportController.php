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

        if ($user->isBawahan() && ! $service->canExportForPeriod($user, $options['period'])) {
            return response()->json([
                'message' => 'Timesheet belum bisa diunduh. Semua task pada periode ini harus disetujui atasan.',
            ], 422);
        }

        if ($user->isBawahan()) {
            $user->loadMissing('supervisor:id,name,position');
            $supervisorSignature = $service->signatureDataForPeriod($user, $options['period']);

            if ($supervisorSignature === null) {
                return response()->json([
                    'message' => 'Timesheet belum bisa diunduh. Belum ada tanda tangan atasan pada periode ini.',
                ], 422);
            }

            $options['signature_data'] = $supervisorSignature;
            $options['approved_by'] = $user->supervisor?->name ?? $options['approved_by'];
            $options['approved_role'] = $user->supervisor?->position ?? $options['approved_role'];
        }

        $path = $service->generate($user, $options);
        $period = Str::of($options['period'])->replace('-', '');

        return response()->download(
            $path,
            "timesheet-{$period}.xlsx",
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        )->deleteFileAfterSend(true);
    }
}
