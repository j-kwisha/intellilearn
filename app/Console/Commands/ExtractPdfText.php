<?php

namespace App\Console\Commands;

use App\Models\LessonMaterial;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser as PdfParser;

class ExtractPdfText extends Command
{
    protected $signature = 'ai:extract-pdf-text {--force : Re-extract even if text already exists}';
    protected $description = 'Extract text from uploaded PDF lesson materials for AI chatbot';

    public function handle(): void
    {
        $query = LessonMaterial::where('type', 'pdf')->whereNotNull('file_path');

        if (!$this->option('force')) {
            $query->whereNull('extracted_text');
        }

        $materials = $query->get();

        if ($materials->isEmpty()) {
            $this->info('No PDFs to process.');
            return;
        }

        $this->info("Processing {$materials->count()} PDF(s)...");
        $parser = new PdfParser();
        $success = 0;
        $failed = 0;

        foreach ($materials as $material) {
            try {
                $fullPath = Storage::disk('public')->path($material->file_path);

                if (!file_exists($fullPath)) {
                    $this->warn("File not found: {$material->file_path}");
                    $failed++;
                    continue;
                }

                $pdf = $parser->parseFile($fullPath);
                $text = substr($pdf->getText(), 0, 8000);

                $material->update(['extracted_text' => $text]);
                $this->line("  ✓ {$material->title}");
                $success++;
            } catch (\Exception $e) {
                $this->warn("  ✗ {$material->title}: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->info("Done. Success: {$success}, Failed: {$failed}");
    }
}
