<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in(['admin', 'atasan', 'bawahan'])],
            'position' => ['nullable', 'string', 'max:120'],
            'is_active' => ['required', 'boolean'],
            'supervisor_id' => [
                'nullable',
                'integer',
                Rule::requiredIf($this->input('role') === 'bawahan'),
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'atasan')),
                Rule::notIn([$userId]),
            ],
        ];
    }
}
