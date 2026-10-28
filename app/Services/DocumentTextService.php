<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class DocumentTextService
{
    public const MATERIAL_EXTRACTION_VERSION = 2;
    public const MAX_MATERIAL_LENGTH = 1000000;

    public function extract(UploadedFile $file): string
    {
        try {
            $text = $this->normalize($this->read($file));
            if ($text === '') throw new \RuntimeException('No readable text');
            return mb_substr($text, 0, EssayReferenceService::MAX_LENGTH);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages(['reference_file' => 'Could not extract readable text. Use a text-based PDF, DOCX, PPTX or TXT file. Convert legacy DOC/PPT files to DOCX/PPTX.']);
        }
    }

    public function extractMaterial(UploadedFile $file): string
    {
        try {
            $text = $this->normalize($this->read($file, true));
            if ($text === '') throw new \RuntimeException('No readable text');
            $this->checkMaterialLength($text);
            return $text;
        } catch (ValidationException $error) {
            throw $error;
        } catch (\Throwable $error) {
            throw ValidationException::withMessages(['reference_file' => 'Could not extract readable module text. Use a text-based PDF, DOCX, PPTX or TXT file. Scanned images require OCR first; convert legacy DOC/PPT files to DOCX/PPTX.']);
        }
    }

    private function read(UploadedFile $file, bool $fullMaterial = false): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        if ($extension === 'pdf') {
            $document = (new \Smalot\PdfParser\Parser)->parseFile($file->getRealPath());
            if (!$fullMaterial) return $document->getText();

            $parts = [];
            $hasText = false;
            $length = 0;
            foreach ($document->getPages() as $index => $page) {
                $content = $this->normalize($page->getText());
                $hasText = $hasText || $content !== '';
                $part = '[Page '.($index + 1)."]\n".$content;
                $length += mb_strlen($part) + ($parts ? 2 : 0);
                if ($length > self::MAX_MATERIAL_LENGTH) $this->materialTooLarge();
                $parts[] = $part;
            }
            if (!$hasText) throw new \RuntimeException('No readable text');
            return implode("\n\n", $parts);
        }
        if ($extension === 'txt') return file_get_contents($file->getRealPath());
        if (!in_array($extension, ['docx', 'pptx'], true) || !class_exists(\ZipArchive::class)) {
            throw new \RuntimeException('Unsupported document');
        }

        $zip = new \ZipArchive;
        if ($zip->open($file->getRealPath()) !== true) throw new \RuntimeException('Invalid Office document');
        try {
            $bytes = 0;
            if ($extension === 'pptx') return $this->slides($zip, $bytes, $fullMaterial);
            $xml = $this->readXml($zip, 'word/document.xml', $bytes);
            return html_entity_decode(strip_tags(str_replace(['</w:p>', '</w:tr>', '<w:tab/>'], ["\n", "\n", "\t"], $xml)), ENT_QUOTES | ENT_XML1, 'UTF-8');
        } finally { $zip->close(); }
    }

    private function normalize(string $text): string
    {
        return trim(str_replace("\0", '', mb_convert_encoding($text, 'UTF-8', 'UTF-8')));
    }

    private function checkMaterialLength(string $text): void
    {
        if (mb_strlen($text) > self::MAX_MATERIAL_LENGTH) $this->materialTooLarge();
    }

    private function materialTooLarge(): never
    {
        throw ValidationException::withMessages(['reference_file' => 'The module exceeds the 1,000,000-character text limit. Split it into smaller lesson files so the AI can read every section. No partial text was accepted.']);
    }

    private function readXml(\ZipArchive $zip, string $path, int &$bytes): string
    {
        $stat = $zip->statName($path);
        if (!$stat || ($bytes += $stat['size']) > 10000000) throw new \RuntimeException('Document content unavailable or too large');
        $xml = $zip->getFromName($path);
        if (!is_string($xml) || str_contains(strtoupper($xml), '<!DOCTYPE')) throw new \RuntimeException('Invalid document XML');
        return $xml;
    }

    private function xml(string $text): \DOMXPath
    {
        $document = new \DOMDocument;
        if (!$document->loadXML($text, LIBXML_NONET | LIBXML_NOERROR | LIBXML_NOWARNING)) throw new \RuntimeException('Invalid document XML');
        return new \DOMXPath($document);
    }

    private function slides(\ZipArchive $zip, int &$bytes, bool $fullMaterial = false): string
    {
        $presentation = $this->xml($this->readXml($zip, 'ppt/presentation.xml', $bytes));
        $presentation->registerNamespace('p', 'http://schemas.openxmlformats.org/presentationml/2006/main');
        $relationships = $this->xml($this->readXml($zip, 'ppt/_rels/presentation.xml.rels', $bytes));
        $relationships->registerNamespace('rel', 'http://schemas.openxmlformats.org/package/2006/relationships');
        $targets = [];
        foreach ($relationships->query('/rel:Relationships/rel:Relationship') as $relationship) {
            if ($relationship->getAttribute('TargetMode') === 'External') continue;
            $target = ltrim($relationship->getAttribute('Target'), '/');
            if (preg_match('#^(?:ppt/)?slides/slide[0-9]+\.xml$#', $target)) {
                $targets[$relationship->getAttribute('Id')] = str_starts_with($target, 'ppt/') ? $target : 'ppt/'.$target;
            }
        }
        $parts = [];
        $hasText = false;
        $length = 0;
        foreach ($presentation->query('/p:presentation/p:sldIdLst/p:sldId') as $index => $slide) {
            $id = $slide->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            if (!isset($targets[$id])) throw new \RuntimeException('Missing slide');
            $content = $this->xml($this->readXml($zip, $targets[$id], $bytes));
            $content->registerNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main');
            $paragraphs = [];
            foreach ($content->query('//a:p') as $paragraph) {
                $line = '';
                foreach ($content->query('.//a:t | .//a:br | .//a:tab', $paragraph) as $run) {
                    $line .= $run->localName === 't' ? $run->textContent : ' ';
                }
                if (trim($line) !== '') $paragraphs[] = trim($line);
            }
            $hasText = $hasText || (bool) $paragraphs;
            if ($paragraphs || $fullMaterial) {
                $part = 'Slide '.($index + 1)."\n".implode("\n", $paragraphs);
                $length += mb_strlen($part) + ($parts ? 2 : 0);
                if ($fullMaterial && $length > self::MAX_MATERIAL_LENGTH) $this->materialTooLarge();
                $parts[] = $part;
            }
            if (!$fullMaterial && $length >= EssayReferenceService::MAX_LENGTH) break;
        }
        if (!$hasText) throw new \RuntimeException('No readable text');
        return implode("\n\n", $parts);
    }
}
