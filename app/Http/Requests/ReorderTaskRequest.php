<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderTaskRequest extends FormRequest
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
            'task_id' => ['required', 'integer'],
            'from_status' => ['required', 'string', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'to_status' => ['required', 'string', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'ordered_task_ids' => ['required', 'array:todo,in_progress,review,done'],
            'ordered_task_ids.todo' => ['array'],
            'ordered_task_ids.in_progress' => ['array'],
            'ordered_task_ids.review' => ['array'],
            'ordered_task_ids.done' => ['array'],
            'ordered_task_ids.*.*' => ['integer', 'distinct'],
        ];
    }
}
