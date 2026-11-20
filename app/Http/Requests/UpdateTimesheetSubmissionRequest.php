<?php

namespace App\Http\Requests;

use App\Models\TimesheetSubmission;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTimesheetSubmissionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $submission = $this->route('submission');

        return $submission instanceof TimesheetSubmission
            && $submission->user_id === $this->user()?->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rows' => ['required', 'array', 'min:1', 'max:31'],
            'rows.*.day' => ['required', 'integer', 'between:1,31', 'distinct'],
            'rows.*.start_time' => ['nullable', 'date_format:H:i', 'required_with:rows.*.end_time'],
            'rows.*.end_time' => ['nullable', 'date_format:H:i', 'required_with:rows.*.start_time', 'after:rows.*.start_time'],
            'rows.*.activities' => ['nullable', 'string', 'max:10000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rows.*.start_time.required_with' => 'Jam mulai wajib diisi jika jam selesai diisi.',
            'rows.*.end_time.required_with' => 'Jam selesai wajib diisi jika jam mulai diisi.',
            'rows.*.end_time.after' => 'Jam selesai harus setelah jam mulai.',
            'rows.*.start_time.date_format' => 'Format jam mulai harus HH:MM.',
            'rows.*.end_time.date_format' => 'Format jam selesai harus HH:MM.',
        ];
    }
}
