<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTimesheetSubmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'department' => ['required', 'string', 'max:120'],
            'client' => ['nullable', 'string', 'max:120'],
            'approved_by' => ['required', 'string', 'max:120'],
            'approved_role' => ['nullable', 'string', 'max:120'],
            'period' => [
                'required',
                'date_format:Y-m',
                Rule::unique('timesheet_submissions', 'period')
                    ->where(fn ($query) => $query->where('user_id', $this->user()?->id)),
            ],
            'signature_data' => ['required', 'string', 'starts_with:data:image/png;base64,', 'max:1500000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'period.unique' => 'Pengajuan timesheet periode ini sudah ada. Tidak perlu membuat pengajuan lagi.',
        ];
    }
}
