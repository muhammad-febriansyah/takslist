<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ExportTimesheetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'department' => ['required', 'string', 'max:120'],
            'client' => ['nullable', 'string', 'max:120'],
            'approved_by' => ['required', 'string', 'max:120'],
            'approved_role' => ['nullable', 'string', 'max:120'],
            'period' => ['required', 'date_format:Y-m'],
            'signature_data' => ['nullable', 'string', 'starts_with:data:image/png;base64,', 'max:1000000'],
        ];
    }
}
