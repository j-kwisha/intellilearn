<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * LIST ALL USERS
     * GET /api/admin/users
     */
    public function listUsers(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $users = User::orderBy('created_at', 'desc')->get([
            'id', 'first_name', 'last_name', 'email', 'role', 'is_active', 'created_at',
        ]);

        return response()->json(['users' => $users]);
    }

    /**
     * CREATE A USER (admin creates with role)
     * POST /api/admin/users
     */
    public function createUser(Request $request): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name'  => ['required', 'string', 'max:255'],
            'email'      => ['required', 'email', 'unique:users'],
            'password'   => ['required', 'string', 'min:8', 'confirmed'],
            'role'       => ['required', 'in:student,instructor,admin'],
        ]);

        $user = User::create($validated);

        return response()->json([
            'message' => 'User created successfully.',
            'user'    => $user->only(['id', 'first_name', 'last_name', 'email', 'role', 'is_active']),
        ], 201);
    }

    /**
     * UPDATE A USER (role, active status)
     * PUT /api/admin/users/{user}
     */
    public function updateUser(Request $request, User $user): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name'  => ['sometimes', 'string', 'max:255'],
            'email'      => ['sometimes', 'email', 'unique:users,email,' . $user->id],
            'role'       => ['sometimes', 'in:student,instructor,admin'],
            'is_active'  => ['sometimes', 'boolean'],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully.',
            'user'    => $user->only(['id', 'first_name', 'last_name', 'email', 'role', 'is_active']),
        ]);
    }

    /**
     * DELETE A USER
     * DELETE /api/admin/users/{user}
     */
    public function deleteUser(Request $request, User $user): JsonResponse
    {
        if (! $request->user()->isAdmin()) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        // Prevent admin from deleting themselves
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully.']);
    }
}
