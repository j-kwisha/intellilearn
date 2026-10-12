<?php

namespace Tests\Unit;

use App\Services\PdfQuizImportService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PdfQuizImportServiceTest extends TestCase
{
    public function test_original_wording_choices_order_and_printed_points_are_preserved(): void
    {
        $draft = (new PdfQuizImportService)->parse("Networking Quiz\nChoose the best answer.\n1. Which protocol delivers web pages? (2 points)\nA. HTTP\nB. SMTP\nC. FTP\nD. DNS\n2) Explain why privacy matters. (5 pts)\nAnswer Key\n1. A\n2. It protects personal information.");
        $this->assertSame('Networking Quiz'."\n".'Choose the best answer.', $draft['instructions']);
        $this->assertCount(2, $draft['questions']);
        $first = $draft['questions'][0];
        $this->assertSame('Which protocol delivers web pages? (2 points)', $first['question_text']);
        $this->assertSame(['HTTP', 'SMTP', 'FTP', 'DNS'], $first['options']);
        $this->assertSame('HTTP', $first['correct_answer']);
        $this->assertSame(2.0, $first['points']);
        $this->assertSame('Explain why privacy matters. (5 pts)', $draft['questions'][1]['question_text']);
        $this->assertSame('It protects personal information.', $draft['questions'][1]['correct_answer']);
    }

    public function test_wrapped_choices_inline_columns_and_unicode_are_not_rewritten(): void
    {
        $text = "1. What does José mean by “evidence”?\nA) Observations & measurements\ncollected during research\nB) Opinions only\n2. Choose a unit.\nA. Bytes  B. Seconds  C. Volts\nCorrect answer: C";
        $draft = (new PdfQuizImportService)->parse($text);
        $this->assertSame($text, $draft['extracted_text']);
        $this->assertSame('What does José mean by “evidence”?', $draft['questions'][0]['question_text']);
        $this->assertSame("Observations & measurements\ncollected during research", $draft['questions'][0]['options'][0]);
        $this->assertSame(['Bytes', 'Seconds', 'Volts'], $draft['questions'][1]['options']);
        $this->assertSame('Volts', $draft['questions'][1]['correct_answer']);
    }

    public function test_missing_answers_are_never_solved_or_generated_and_defaults_are_disclosed(): void
    {
        $draft = (new PdfQuizImportService)->parse("1. What is 2 + 2?\nA. 3\nB. 4\n2. Name a programming language.");
        foreach ($draft['questions'] as $question) {
            $this->assertSame('', $question['correct_answer']);
            $this->assertSame(1, $question['points']);
        }
        $this->assertStringContainsString('none was guessed', implode(' ', $draft['warnings']));
        $this->assertStringContainsString('default to 1 point', implode(' ', $draft['warnings']));
    }

    public function test_true_false_and_essay_section_types_use_existing_assessment_types(): void
    {
        $draft = (new PdfQuizImportService)->parse("I. True or False\n1. Encryption protects data.\nAnswer: True\nII. Essay\n2. Discuss responsible data use. (10 points)");
        $this->assertSame('true_false', $draft['questions'][0]['type']);
        $this->assertSame(['True', 'False'], $draft['questions'][0]['options']);
        $this->assertSame('True', $draft['questions'][0]['correct_answer']);
        $this->assertSame('essay', $draft['questions'][1]['type']);
        $this->assertSame('', $draft['questions'][1]['correct_answer']);
        $this->assertStringContainsString('II. Essay', $draft['instructions']);
    }

    public function test_ambiguous_keys_and_duplicate_question_numbers_are_not_guessed(): void
    {
        foreach (["1. A\n1. B", '1. A 2. B'] as $key) {
            $draft = (new PdfQuizImportService)->parse("1. Choose an option.\nA. First\nB. Second\nAnswer Key\n{$key}");
            $this->assertSame('', $draft['questions'][0]['correct_answer']);
        }
        $draft = (new PdfQuizImportService)->parse("1. First section question.\nA. First\nB. Second\nII. Multiple Choice\n1. Second section question.\nA. Other\nB. Another\nAnswer Key\n1. A");
        $this->assertCount(2, $draft['questions']);
        foreach ($draft['questions'] as $question) $this->assertSame('', $question['correct_answer']);
        $draft = (new PdfQuizImportService)->parse("1. Choose.\nA. First\nB. Second\nAnswer: A\nAnswer: B");
        $this->assertSame('', $draft['questions'][0]['correct_answer']);
    }

    public function test_unsupported_empty_and_oversized_content_fails_without_truncation(): void
    {
        foreach (['', 'An unnumbered passage with no quiz.', str_repeat('x', 200001)] as $text) {
            try {
                (new PdfQuizImportService)->parse($text);
                $this->fail('Invalid content must not generate a quiz.');
            } catch (ValidationException $error) {
                $this->assertArrayHasKey('file', $error->errors());
            }
        }
    }
}
