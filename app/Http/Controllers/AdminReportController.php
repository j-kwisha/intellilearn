<?php

namespace App\Http\Controllers;

use App\Services\AdminReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminReportController extends Controller
{
    public function index(Request $request, AdminReportService $reports): JsonResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $filters = $request->validate([
            'course_id' => ['nullable', 'integer', 'exists:courses,id'],
            'instructor_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('role', 'instructor')],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('from') ? ['after_or_equal:from'] : [])],
            'include_risk' => ['sometimes', 'boolean'],
        ]);

        return response()->json($reports->build($filters, $request->boolean('include_risk')));
    }
}
