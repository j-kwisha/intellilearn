<?php

namespace Tests\Unit;

use App\Services\{DocumentTextService, EssayReferenceService};
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class DocumentTextServiceTest extends TestCase
{
    private function file(string $name, string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, $content);
    }

    private function office(array $entries): string
    {
        $path = tempnam(sys_get_temp_dir(), 'module-extraction-');
        $zip = new \ZipArchive;
        $zip->open($path, \ZipArchive::OVERWRITE);
        foreach ($entries as $name => $content) $zip->addFromString($name, $content);
        $zip->close();
        try { return file_get_contents($path); } finally { unlink($path); }
    }

    private function presentation(array $slideTexts): string
    {
        $ids = $relationships = '';
        $entries = [];
        foreach ($slideTexts as $index => $text) {
            // Reverse physical file numbering so only manifest order is correct.
            $number = count($slideTexts) - $index;
            $ids .= '<p:sldId id="'.(256 + $index).'" r:id="slide'.$number.'"/>';
            $relationships .= '<Relationship Id="slide'.$number.'" Target="slides/slide'.$number.'.xml"/>';
            $entries['ppt/slides/slide'.$number.'.xml'] = '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><p:cSld><a:p><a:r><a:t>'.htmlspecialchars($text, ENT_XML1, 'UTF-8').'</a:t></a:r></a:p></p:cSld></p:sld>';
        }
        $entries['ppt/presentation.xml'] = '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst>'.$ids.'</p:sldIdLst></p:presentation>';
        $entries['ppt/_rels/presentation.xml.rels'] = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.$relationships.'</Relationships>';
        return $this->office($entries);
    }

    private function pdf(array $pages): string
    {
        $kids = [];
        foreach ($pages as $index => $text) $kids[] = (4 + $index * 2).' 0 R';
        $objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids ['.implode(' ', $kids).'] /Count '.count($pages).' >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
        foreach ($pages as $index => $text) {
            $contentId = 5 + $index * 2;
            $objects[] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents '.$contentId.' 0 R >>';
            $stream = "BT /F1 12 Tf 50 750 Td 16 TL\n";
            foreach (explode("\n", $text) as $line) $stream .= '('.str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line).") Tj T*\n";
            $stream .= 'ET';
            $objects[] = '<< /Length '.strlen($stream)." >>\nstream\n{$stream}\nendstream";
        }
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $index => $object) { $offsets[] = strlen($pdf); $pdf .= ($index + 1)." 0 obj\n{$object}\nendobj\n"; }
        $xref = strlen($pdf);
        $size = count($objects) + 1;
        $pdf .= "xref\n0 {$size}\n0000000000 65535 f \n";
        foreach ($offsets as $offset) $pdf .= sprintf("%010d 00000 n \n", $offset);
        return $pdf."trailer\n<< /Size {$size} /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF";
    }

    public function test_material_txt_keeps_later_sections_while_reference_extract_remains_capped(): void
    {
        $service = new DocumentTextService;
        $text = str_repeat('Learning materials. ', 1500)."\nTopic 2: Commercial Publications\nCoursebooks contain instruction and activities.\nTopic 3: Materials Development Projects";
        $file = $this->file('module.txt', $text);
        $this->assertSame($text, $service->extractMaterial($file));
        $reference = $service->extract($file);
        $this->assertSame(EssayReferenceService::MAX_LENGTH, mb_strlen($reference));
        $this->assertStringNotContainsString('Topic 2', $reference);
    }

    public function test_material_pdf_preserves_every_page_and_accurate_numbers_after_blank_pages(): void
    {
        $file = $this->file('module.pdf', $this->pdf([
            "Topic 1: Materials Development\n".str_repeat('Language learning content. ', 1100),
            '',
            "Topic 2: Commercial Publications\nCoursebooks provide information, instruction and activities.",
            'Topic 3: Materials Development Projects',
        ]));
        $service = new DocumentTextService;
        $text = $service->extractMaterial($file);
        $this->assertGreaterThan(24000, mb_strlen($text));
        $this->assertStringStartsWith('[Page 1]', $text);
        $this->assertStringContainsString("[Page 2]\n\n\n[Page 3]\nTopic 2: Commercial Publications", $text);
        $this->assertStringContainsString('Coursebooks provide information, instruction and activities.', $text);
        $this->assertStringContainsString("[Page 4]\nTopic 3: Materials Development Projects", $text);
        $this->assertSame(24000, mb_strlen($service->extract($file)));
    }

    public function test_material_pptx_reads_late_slides_in_manifest_order_without_reference_cutoff(): void
    {
        $file = $this->file('module.pptx', $this->presentation([
            'First topic '.str_repeat('Learning materials ', 1400),
            '',
            'Topic 2: Commercial Publications & Coursebooks',
            'Topic 3: Materials Development Projects',
        ]));
        $service = new DocumentTextService;
        $text = $service->extractMaterial($file);
        $this->assertStringStartsWith("Slide 1\nFirst topic", $text);
        $this->assertStringContainsString("Slide 2\n\n\nSlide 3\nTopic 2: Commercial Publications & Coursebooks", $text);
        $this->assertStringEndsWith("Slide 4\nTopic 3: Materials Development Projects", $text);
        $reference = $service->extract($file);
        $this->assertSame(24000, mb_strlen($reference));
        $this->assertStringNotContainsString('Topic 2', $reference);
    }

    public function test_material_docx_preserves_all_paragraphs_beyond_reference_limit(): void
    {
        $first = str_repeat('Instruction & practice. ', 1200);
        $file = $this->file('module.docx', $this->office(['word/document.xml' => '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'.htmlspecialchars($first, ENT_XML1, 'UTF-8').'</w:t></w:r></w:p><w:p><w:r><w:t>Topic 2: Commercial Publications</w:t></w:r></w:p><w:p><w:r><w:t>Coursebooks support learning.</w:t></w:r></w:p></w:body></w:document>']));
        $service = new DocumentTextService;
        $this->assertSame($first."\nTopic 2: Commercial Publications\nCoursebooks support learning.", $service->extractMaterial($file));
        $this->assertSame(24000, mb_strlen($service->extract($file)));
    }

    public function test_material_limit_is_explicit_instead_of_accepting_a_truncated_prefix(): void
    {
        $service = new DocumentTextService;
        $this->assertSame(DocumentTextService::MAX_MATERIAL_LENGTH, mb_strlen($service->extractMaterial($this->file('limit.txt', str_repeat('x', DocumentTextService::MAX_MATERIAL_LENGTH)))));
        foreach ([
            $this->file('large.txt', str_repeat('x', DocumentTextService::MAX_MATERIAL_LENGTH + 1)),
            $this->file('large.pptx', $this->presentation([str_repeat('x', DocumentTextService::MAX_MATERIAL_LENGTH), 'Later content'])),
        ] as $file) {
            try {
                $service->extractMaterial($file);
                $this->fail('Oversized material must not return only its first section.');
            } catch (ValidationException $error) {
                $this->assertStringContainsString('No partial text was accepted', $error->errors()['reference_file'][0]);
            }
        }
    }

    public function test_unreadable_or_unsupported_modules_fail_without_fake_page_or_slide_content(): void
    {
        $service = new DocumentTextService;
        foreach ([
            $this->file('scanned.pdf', $this->pdf(['', ''])),
            $this->file('images.pptx', $this->presentation(['', ''])),
            $this->file('legacy.ppt', 'legacy binary'),
            $this->file('corrupt.pdf', 'not a PDF'),
            $this->file('empty.txt', " \n\0 "),
        ] as $file) {
            try {
                $service->extractMaterial($file);
                $this->fail('Unreadable modules must not become usable AI context.');
            } catch (ValidationException $error) {
                $this->assertStringContainsString('Could not extract readable module text', $error->errors()['reference_file'][0]);
            }
        }
    }

    public function test_material_office_xml_keeps_entity_and_uncompressed_size_protections(): void
    {
        foreach ([
            '<!DOCTYPE w:document [<!ENTITY local SYSTEM "file:///etc/passwd">]><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">&local;</w:document>',
            str_repeat('x', 10000001),
        ] as $xml) {
            try {
                (new DocumentTextService)->extractMaterial($this->file('unsafe.docx', $this->office(['word/document.xml' => $xml])));
                $this->fail('Unsafe Office XML must not be read.');
            } catch (ValidationException $error) {
                $this->assertArrayHasKey('reference_file', $error->errors());
            }
        }
    }
}
