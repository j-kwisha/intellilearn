<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()?->isAdmin()) return response()->json(['message' => 'Admins only.'], 403);

        $query = ActivityLog::with(['user:id,first_name,last_name,email', 'course:id,name,code'])
            ->where(function ($actors) {
                $actors->whereHas('user', fn ($users) => $users->where('role', 'instructor'))
                    ->orWhereNull('user_id');
            })
            ->when($request->filled('course_id'), fn ($q) => $q->where('course_id', $request->integer('course_id')))
            ->when($request->filled('action'), fn ($q) => $q->where('action', $request->string('action')->toString()))
            ->orderByDesc('created_at')->orderByDesc('id');

        $logs = $query->paginate(min(max($request->integer('per_page', 50), 1), 100));
        return response()->json($logs);
    }
}
