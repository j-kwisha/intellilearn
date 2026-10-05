# Essay Question Fixes Summary

## Overview
Fixed two bugs related to essay questions in the IntelliLearn system:

1. **Bug #1**: Changed essay input from textarea (typing) to file upload
2. **Bug #2**: Added validation to skip AI grading if the reference lesson has been deleted

---

## Changes Made

### 1. Database Migration
**File**: `database/migrations/2026_10_05_000001_add_file_url_to_submission_answers.php`

- Added `file_url` column to `submission_answers` table to store uploaded essay files
- Migration allows nullable values to maintain backward compatibility

### 2. Frontend Changes
**File**: `frontend/src/pages/student/StudentQuizPage.jsx`

#### Added:
- New state variable `essayFiles` to track uploaded files
- `handleFileUpload()` function to handle file selection
- File input UI for essay questions with:
  - Accept formats: `.pdf`, `.doc`, `.docx`, `.txt`
  - Visual feedback showing selected filename and file size
  - Styled file upload button

#### Modified:
- `handleSubmit()` function now uses `FormData` to support file uploads
- Changed from simple JSON POST to multipart/form-data
- Answers are sent as JSON string with files attached separately

#### UI Changes:
- Replaced textarea with file input for essay questions
- Added blue info box explaining file upload requirement
- Display uploaded file information (name and size)
- Results view now shows "View submission" link for uploaded files

### 3. Backend Changes
**File**: `app/Http/Controllers/SubmissionController.php`

#### Request Validation:
- Changed `answers` validation from array to string (JSON)
- Added validation for essay file uploads: `essay_file_*`
- Max file size: 10MB
- Allowed formats: PDF, DOC, DOCX, TXT

#### File Upload Handling:
- Upload essay files to Cloudinary in folder: `intellilearn/submissions/{course_id}/{assessment_id}`
- Extract text from PDF files using existing `Smalot\PdfParser\Parser`
- Store file URL in `submission_answers.file_url`
- Use extracted text for AI grading (up to 8000 characters)

#### Deleted Lesson Check:
```php
if ($question->reference_lesson_id) {
    $lessonExists = \App\Models\Lesson::where('id', $question->reference_lesson_id)->exists();
    
    if (!$lessonExists) {
        // Skip AI grading, mark for manual review
        SubmissionAnswer::updateOrCreate(
            ['submission_id' => $submission->id, 'question_id' => $question->id],
            [
                'answer_text'   => $answerText,
                'file_url'      => $fileUrl,
                'is_correct'    => null,
                'points_earned' => null,
                'ai_feedback'   => 'Reference lesson has been removed. Pending manual grading by instructor.',
            ]
        );
        $allAutoGradable = false;
        $totalPoints += $question->points;
        continue; // Skip to next question
    }
    // ... proceed with normal grading
}
```

### 4. Model Changes
**File**: `app/Models/SubmissionAnswer.php`

- Added `file_url`, `criterion_scores`, and `instructor_override` to `$fillable` array

---

## How It Works Now

### Student Experience:
1. **Taking Assessment**:
   - For essay questions, student sees file upload button instead of textarea
   - Student clicks "Choose File" and selects PDF/DOC/DOCX/TXT file
   - File name and size are displayed after selection
   - Student submits assessment with all answers

2. **Viewing Results**:
   - Students can click "View submission" link to see their uploaded file
   - AI feedback is displayed (if grading succeeded)
   - If lesson was deleted: "Reference lesson has been removed. Pending manual grading by instructor."

### System Behavior:
1. **File Upload**:
   - Files uploaded to Cloudinary with organized folder structure
   - PDF files: Text is extracted and used for AI grading
   - DOC/DOCX files: Stored for instructor review (text extraction can be added later)

2. **AI Grading**:
   - Checks if reference lesson still exists
   - If deleted: Skips AI grading, marks for manual review, sets helpful feedback
   - If exists: Proceeds with normal AI grading using reference materials

3. **Manual Grading**:
   - Instructors can still manually grade all essay questions
   - File URL is preserved for instructor to view student's submission
   - Instructor can override AI grades if needed

---

## Testing Instructions

### Test File Upload (Bug #1):
1. Log in as a student
2. Start an assessment with essay questions
3. For essay question, click file upload button
4. Select a PDF file (test with ~1-2 page document)
5. Verify filename and size appear
6. Submit assessment
7. Check results - should see "View submission" link
8. Click link - should open file in new tab

### Test Deleted Lesson (Bug #2):
1. Log in as instructor
2. Create an assessment with essay question
3. Set reference lesson for the essay question
4. Publish assessment
5. As student, start and submit the assessment
6. As instructor, delete the reference lesson
7. As another student, submit the same assessment
8. Check submission - should show: "Reference lesson has been removed. Pending manual grading by instructor."
9. Points should be null (not graded)

---

## File Upload Limits
- **Max Size**: 10MB per file
- **Formats**: PDF, DOC, DOCX, TXT
- **Text Extraction**: Currently only PDF (up to 8000 characters)
- **Storage**: Cloudinary

---

## Notes
- Backward compatible: Existing text-based essay submissions still work
- PDF text extraction uses existing `Smalot\PdfParser\Parser` library
- DOCX text extraction can be added by installing `phpoffice/phpword` package
- File upload UI matches the existing design system (Tailwind CSS)

---

## Next Steps (Optional Enhancements)
1. Add DOCX text extraction for AI grading
2. Add file preview in assessment submission view
3. Add file size validation on frontend before upload
4. Add progress indicator for large file uploads
5. Add ability to replace uploaded file before submission
6. Add download button for instructors in grading interface
