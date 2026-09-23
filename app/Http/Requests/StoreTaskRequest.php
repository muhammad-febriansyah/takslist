<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Query\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Task::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'string', Rule::in(['todo', 'in_progress', 'review', 'done'])],
            'priority' => ['sometimes', 'string', Rule::in(['low', 'medium', 'high'])],
            'start_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'project_id' => [
                'nullable',
                'integer',
                Rule::exists('projects', 'id')->where(
                    fn (Builder $query): Builder => $query->where('user_id', $this->user()?->id),
                ),
            ],
        ];
    }
}
