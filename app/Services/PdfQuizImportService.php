<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

/** Imports existing text, never generates questions or solves an answer key. */
class PdfQuizImportService
{
    public function extract(UploadedFile $file): array
    {
        try {
            $text = (new \Smalot\PdfParser\Parser)->parseFile($file->getRealPath())->getText();
        } catch (\Throwable $error) {
            throw ValidationException::withMessages(['file' => 'This PDF could not be read. Upload an unencrypted, text-based quiz PDF.']);
        }
        return $this->parse($text);
    }

    public function parse(string $text): array
    {
        $text = trim(str_replace(["\r\n", "\r", "\0"], ["\n", "\n", ''], $text));
        if ($text === '') $this->invalid('No selectable text was found. Scanned/image-only PDFs need OCR or a text-based copy; no questions were generated.');
        if (mb_strlen($text) > 200000) $this->invalid('This quiz contains too much text. Split the PDF into smaller quizzes; no content was truncated.');

        $blocks = [];
        $instructions = [];
        $keyLines = [];
        $keyMode = false;
        $current = null;
        $typeHint = 'short_answer';
        foreach (explode("\n", $text) as $line) {
            $line = trim($line);
            if (preg_match('/^(?:answer\s*key|correct\s*answers|answers)\s*(?::\s*(.*))?$/iu', $line, $keyHeading)) {
                if ($current !== null) { $blocks[] = $current; $current = null; }
                $keyMode = true;
                if (trim($keyHeading[1] ?? '') !== '') $keyLines[] = trim($keyHeading[1]);
                continue;
            }
            if ($keyMode) { if ($line !== '') $keyLines[] = $line; continue; }
            if (preg_match('/^(?:(?:[IVX]+[.)]|(?:part|section|test)\s+[\w-]+[.:)]?)\s*)?(multiple\s+choice|true\s*(?:or|\/|and)\s*false|identification|short\s+answer|essay|matching)\s*(?:[:.\-].*)?$/iu', $line, $heading)) {
                if ($current !== null) { $blocks[] = $current; $current = null; }
                $label = strtolower($heading[1]);
                $typeHint = str_starts_with($label, 'true') ? 'true_false' : ($label === 'essay' ? 'essay' : 'short_answer');
                $instructions[] = $line;
                continue;
            }
            if (preg_match('/^(?:(?:question|q)\s*)?(\d{1,3})[.):]\s+(.+)$/iu', $line, $match)) {
                if ($current !== null) $blocks[] = $current;
                $current = ['source_number' => (int) $match[1], 'hint' => $typeHint, 'lines' => [$match[2]]];
            } elseif ($current !== null) {
                $current['lines'][] = $line;
            } elseif ($line !== '') {
                $instructions[] = $line;
            }
        }
        if ($current !== null) $blocks[] = $current;
        if (!$blocks) $this->invalid('No numbered questions were found. Use question numbers such as 1. or 1) and choices such as A. or A). Nothing was generated.');
        if (count($blocks) > 200) $this->invalid('Import at most 200 questions at a time. Split this quiz PDF; no questions were dropped.');

        $warnings = ['Review every question against the original PDF before saving. Images, diagrams, tables and complex/multi-column layouts are not reproduced automatically.'];
        $keys = [];
        foreach ($keyLines as $line) {
            if (preg_match('/\s+\d{1,3}[.):]\s*\S/u', $line)) {
                $warnings[] = 'An answer-key line contains multiple entries. Enter those answers manually.';
                continue;
            }
            if (preg_match('/^(\d{1,3})[.):\-]\s*(.+)$/u', $line, $key)) {
                $number = (int) $key[1];
                if (array_key_exists($number, $keys)) {
                    $keys[$number] = null;
                    $warnings[] = "The answer key repeats question {$number}; enter that answer manually.";
                } else $keys[$number] = trim($key[2]);
            } else $warnings[] = 'Some answer-key lines could not be mapped safely. Enter those answers manually.';
        }
        $numberCounts = array_count_values(array_column($blocks, 'source_number'));
        $questions = [];
        $defaultPoints = 0;
        foreach ($blocks as $block) {
            $stem = [];
            $options = [];
            $labels = [];
            $explicitAnswer = null;
            $answerCount = 0;
            foreach ($block['lines'] as $line) {
                if (preg_match('/^(?:correct\s+answer|answer)\s*:\s*(\S.*)$/iu', $line, $answer) && !preg_match('/^[_\s.]+$/u', $answer[1])) {
                    $answerCount++;
                    if ($answerCount > 1) $warnings[] = "Question {$block['source_number']} has repeated answer labels; enter its answer manually.";
                    $explicitAnswer = $answerCount === 1 ? trim($answer[1]) : null;
                    continue;
                }
                // Two spaces/tabs may separate choices extracted from the same PDF row.
                preg_match_all('/(?:^|[\t ]{2,})([A-Ha-h])[.)]\s+/u', $line, $matches, PREG_OFFSET_CAPTURE);
                if ($matches[0] && $matches[0][0][1] === 0) {
                    foreach ($matches[0] as $index => [$marker, $offset]) {
                        $start = $offset + strlen($marker);
                        $end = $matches[0][$index + 1][1] ?? strlen($line);
                        $labels[] = strtoupper($matches[1][$index][0]);
                        $options[] = trim(substr($line, $start, $end - $start));
                    }
                } elseif ($options) {
                    $last = count($options) - 1;
                    $options[$last] .= ($line === '' ? "\n" : "\n".$line);
                } else $stem[] = $line;
            }
            $stemText = trim(implode("\n", $stem));
            if ($stemText === '') $this->invalid('A numbered block has no question text. Check the PDF layout and numbering before importing.');
            $options = array_map('trim', $options);
            $type = count($options) >= 2 ? 'multiple_choice' : $block['hint'];
            if (count($options) === 1) {
                $stemText .= "\n".$labels[0].'. '.$options[0];
                $options = [];
                $warnings[] = "Question {$block['source_number']} has only one recognized choice. Check its type and copy any missing choices from the source.";
            }
            if ($type === 'multiple_choice' && count($options) === 2 && array_map('strtolower', $options) === ['true', 'false']) $type = 'true_false';
            if ($type === 'true_false' && !$options) $options = ['True', 'False'];
            $points = 1;
            if (preg_match('/[\[(](\d+(?:\.\d{1,2})?)\s*(?:points?|pts?)\s*[\])]/iu', $stemText, $pointMatch) && (float) $pointMatch[1] > 0) $points = (float) $pointMatch[1];
            else $defaultPoints++;

            $answer = $answerCount > 1 ? null : ($explicitAnswer ?? ($numberCounts[$block['source_number']] === 1 ? ($keys[$block['source_number']] ?? null) : null));
            $correct = '';
            if ($answer !== null && $type === 'multiple_choice') {
                $label = strtoupper(rtrim($answer, '.)'));
                $indices = array_keys($labels, $label, true);
                if (count($indices) === 1) $correct = $options[$indices[0]];
                elseif (count(array_keys($options, $answer, true)) === 1) $correct = $answer;
            } elseif ($answer !== null && $type === 'true_false' && in_array(strtolower($answer), ['true', 'false'], true)) {
                $correct = ucfirst(strtolower($answer));
            } elseif ($answer !== null && $type === 'short_answer') $correct = $answer;
            if ($type !== 'essay' && $correct === '') $warnings[] = 'Question '.(count($questions) + 1).($type === 'short_answer'
                ? ' has no expected answer; none was guessed. Enter one for auto-grading, or leave it blank for instructor grading.'
                : ' needs an instructor-supplied correct answer; none was guessed.');
            if (count(array_unique($labels)) !== count($labels)) $warnings[] = 'Repeated option labels were found. Review the choices and answer mapping.';
            $questions[] = ['question_text' => $stemText, 'type' => $type, 'options' => $options,
                'correct_answer' => $correct, 'points' => $points, 'source_number' => $block['source_number']];
        }
        if ($defaultPoints) $warnings[] = "{$defaultPoints} question(s) have no explicit point value; they default to 1 point. Review the points before saving.";
        if (count($numberCounts) !== count($blocks)) $warnings[] = 'Question numbers repeat across sections. Number-only answer keys were not applied to those questions.';
        return ['questions' => $questions, 'instructions' => implode("\n", $instructions), 'extracted_text' => $text,
            'warnings' => array_values(array_unique($warnings))];
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }
}
