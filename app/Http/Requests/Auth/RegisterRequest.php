<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Anyone can attempt to register (no auth required).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for registration.
     * If any rule fails, Laravel automatically returns a
     * 422 error with specific error messages — you don't
     * have to write any error handling code yourself.
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password'   => [
                'required', 'string', 'min:8', 'confirmed',
                'regex:/[A-Z]/',   // must have uppercase
                'regex:/[0-9]/',   // must have number
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique'           => 'This email is already registered.',
            'password.confirmed'     => 'Passwords do not match.',
            'password.min'           => 'Password must be at least 8 characters.',
            'password.regex'         => 'Password must contain at least one uppercase letter and one number.',
        ];
    }
}
