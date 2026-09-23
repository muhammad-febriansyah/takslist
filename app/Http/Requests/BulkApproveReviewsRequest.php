<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkApproveReviewsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAtasan() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'review_ids' => ['required', 'array', 'min:1'],
            'review_ids.*' => ['integer', 'distinct', Rule::exists('task_reviews', 'id')],
            'note' => ['nullable', 'string', 'max:1000'],
            'signature_data' => ['required', 'string', 'starts_with:data:image/png;base64,', 'max:1500000'],
        ];
    }
}
