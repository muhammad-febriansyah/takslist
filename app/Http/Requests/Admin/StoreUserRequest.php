<?php

namespace App\Http\Requests\Admin;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', 'string', Rule::in(['admin', 'atasan', 'bawahan'])],
            'position' => ['nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
            'supervisor_id' => [
                'nullable',
                'integer',
                Rule::requiredIf($this->input('role') === 'bawahan'),
                Rule::exists('users', 'id')->where(fn ($query) => $query->where('role', 'atasan')),
            ],
        ];
    }
}
