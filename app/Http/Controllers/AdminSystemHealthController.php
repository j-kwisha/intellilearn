<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class AdminSystemHealthController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403, 'Admins only.');

        $checks = [
            $this->check('database', 'Database', fn () => $this->databaseCheck()),
            $this->check('storage', 'File storage', fn () => $this->storageCheck()),
            $this->check('email', 'Email configuration', fn () => $this->mailCheck()),
            $this->check('ai', 'AI service', fn () => $this->aiCheck()),
        ];

        $statuses = array_column($checks, 'status');
        $overall = in_array('failed', $statuses, true) ? 'failed'
            : (in_array('attention', $statuses, true) ? 'attention' : 'healthy');

        return response()->json([
            'status' => $overall,
            'checked_at' => now()->toIso8601String(),
            'checks' => $checks,
        ]);
    }

    private function check(string $key, string $label, callable $run): array
    {
        try {
            return ['key' => $key, 'label' => $label] + $run();
        } catch (Throwable $exception) {
            Log::warning('Admin system health check failed.', ['check' => $key, 'exception' => $exception::class]);

            return [
                'key' => $key,
                'label' => $label,
                'status' => 'failed',
                'message' => 'This service could not be checked successfully.',
                'next_step' => 'Review the backend service logs for this check, then retry.',
            ];
        }
    }

    private function databaseCheck(): array
    {
        DB::select('select 1');

        return [
            'status' => 'healthy',
            'message' => 'The application can connect to the database.',
            'next_step' => null,
        ];
    }

    private function storageCheck(): array
    {
        $disk = Storage::disk('public');
        $probe = '.health-check/'.Str::uuid().'.txt';
        $written = $disk->put($probe, 'ok');
        $removed = $written ? $disk->delete($probe) : false;
        if (! $written || ! $removed) {
            return [
                'status' => 'failed',
                'message' => 'The configured public file storage could not complete a write and delete check.',
                'next_step' => 'Check the storage disk settings and its credentials or write permissions.',
            ];
        }

        $driver = config('filesystems.disks.public.driver');
        $durable = in_array($driver, ['s3'], true);

        return [
            'status' => $durable ? 'healthy' : 'attention',
            'message' => $durable
                ? 'The configured public file storage passed a write and delete check.'
                : 'File storage is writable, but the configured disk is local and may not survive redeploys.',
            'next_step' => $durable ? null : 'Use durable object storage for uploaded files that must survive redeploys.',
        ];
    }

    private function mailCheck(): array
    {
        $mailer = (string) config('mail.default');
        $transport = (string) config("mail.mailers.{$mailer}.transport", $mailer);
        $configured = match ($transport) {
            'resend' => filled(config('services.resend.key')) && filled(config('mail.from.address')),
            'smtp' => filled(config("mail.mailers.{$mailer}.host")) && filled(config("mail.mailers.{$mailer}.username")) && filled(config("mail.mailers.{$mailer}.password")) && filled(config('mail.from.address')),
            'log', 'array' => false,
            default => filled(config('mail.from.address')),
        };

        return [
            'status' => $configured ? 'healthy' : 'attention',
            'message' => $configured
                ? "The {$mailer} mailer has the required configuration. This check does not send an email."
                : "The {$mailer} mailer is missing required configuration or is a non-delivery mailer. This check does not send an email.",
            'next_step' => $configured ? null : 'Check the mailer, sender address, and provider credentials in the backend environment.',
        ];
    }

    private function aiCheck(): array
    {
        $baseUrl = rtrim((string) config('services.ai.url', ''), '/');
        if ($baseUrl === '') {
            return [
                'status' => 'attention',
                'message' => 'AI_SERVICE_URL is not configured for the backend.',
                'next_step' => 'Set AI_SERVICE_URL to the deployed AI service URL and restart the backend.',
            ];
        }

        $response = Http::timeout(4)->get($baseUrl.'/health');
        if (! $response->successful() || $response->json('status') !== 'healthy') {
            return [
                'status' => 'failed',
                'message' => 'The AI service health endpoint did not report a healthy status.',
                'next_step' => 'Check that the AI service is running, then verify AI_SERVICE_URL and its deployment logs.',
            ];
        }

        return [
            'status' => 'healthy',
            'message' => 'The AI service health endpoint responded successfully.',
            'next_step' => null,
        ];
    }
}
