<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class DocumentTextService
{
    public function extract(UploadedFile $file): string
    {
        try {
            $extension = strtolower($file->getClientOriginalExtension());
            if ($extension === 'pdf') {
                $text = (new \Smalot\PdfParser\Parser)->parseFile($file->getRealPath())->getText();
            } elseif ($extension === 'txt') {
                $text = file_get_contents($file->getRealPath());
            } elseif ($extension === 'docx' && class_exists(\ZipArchive::class)) {
                $zip = new \ZipArchive;
                if ($zip->open($file->getRealPath()) !== true) throw new \RuntimeException('Invalid DOCX');
                try {
                    $stat = $zip->statName('word/document.xml');
                    if (!$stat || $stat['size'] > 10000000) throw new \RuntimeException('Document content too large');
                    $xml = $zip->getFromName('word/document.xml');
                    $text = html_entity_decode(strip_tags(str_replace(['</w:p>', '</w:tr>', '<w:tab/>'], ["\n", "\n", "\t"], $xml)), ENT_QUOTES | ENT_XML1, 'UTF-8');
                } finally { $zip->close(); }
            } else {
                throw new \RuntimeException('Unsupported document');
            }
            $text = trim(str_replace("\0", '', mb_convert_encoding($text, 'UTF-8', 'UTF-8')));
            if ($text === '') throw new \RuntimeException('No readable text');
            return mb_substr($text, 0, EssayReferenceService::MAX_LENGTH);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages(['reference_file' => 'Could not extract readable text. Upload a text-based PDF, DOCX or TXT file, or paste the reference content.']);
        }
    }
}
