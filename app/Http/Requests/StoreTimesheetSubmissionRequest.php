<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

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
            'period' => ['required', 'date_format:Y-m'],
            'signature_data' => ['required', 'string', 'starts_with:data:image/png;base64,', 'max:1500000'],
        ];
    }
}
