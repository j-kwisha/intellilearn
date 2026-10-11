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
            } elseif (in_array($extension, ['docx', 'pptx'], true) && class_exists(\ZipArchive::class)) {
                $zip = new \ZipArchive;
                if ($zip->open($file->getRealPath()) !== true) throw new \RuntimeException('Invalid Office document');
                try {
                    $bytes = 0;
                    if ($extension === 'docx') {
                        $xml = $this->readXml($zip, 'word/document.xml', $bytes);
                        $text = html_entity_decode(strip_tags(str_replace(['</w:p>', '</w:tr>', '<w:tab/>'], ["\n", "\n", "\t"], $xml)), ENT_QUOTES | ENT_XML1, 'UTF-8');
                    } else {
                        $text = $this->slides($zip, $bytes);
                    }
                } finally { $zip->close(); }
            } else {
                throw new \RuntimeException('Unsupported document');
            }
            $text = trim(str_replace("\0", '', mb_convert_encoding($text, 'UTF-8', 'UTF-8')));
            if ($text === '') throw new \RuntimeException('No readable text');
            return mb_substr($text, 0, EssayReferenceService::MAX_LENGTH);
        } catch (\Throwable $e) {
            throw ValidationException::withMessages(['reference_file' => 'Could not extract readable text. Use a text-based PDF, DOCX, PPTX or TXT file. Convert legacy DOC/PPT files to DOCX/PPTX.']);
        }
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

    private function slides(\ZipArchive $zip, int &$bytes): string
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
            if ($paragraphs) $parts[] = 'Slide '.($index + 1)."\n".implode("\n", $paragraphs);
            if (mb_strlen(implode("\n\n", $parts)) >= EssayReferenceService::MAX_LENGTH) break;
        }
        return implode("\n\n", $parts);
    }
}
