# Recent Changes Summary

## Individual Activity file assignments (November 10, 2026)

- Instructors can attach a PDF, DOC, DOCX, PPT, or PPTX file when creating or editing an Individual Activity. The activity publishes after the file is saved.
- Students can preview the instructor's file (PDF and DOCX in-app; Office preview for DOC/PPT), download it, and upload a completed file in any of the same formats. The submission uses the existing attempt lock and instructor unlock rules.
- Instructors can download submitted work and assign a score out of 100 with feedback from either the assessment detail or Grading page. The result contributes to course activity grades.
- Student files are encrypted on the persistent public storage volume; readable downloads require course/ownership authorization. The backend startup migration adds the file metadata columns automatically.
- Existing question-based Individual Activities continue to use their earlier quiz flow.

To test: create an Individual Activity with a small PDF or DOCX, open it as an enrolled student, preview/download the task, start the activity, upload a completed file, then grade it as the instructor. Confirm that another student's account cannot access that submission.

## Changes Made (May 7, 2026)

### 1. ✅ Removed Email Verification from Registration
**Status:** Already implemented + verified

- Registration now auto-verifies email (`email_verified_at` set to `now()`)
- Users are immediately logged in after registration with a token
- No email verification step required

**Files:**
- `app/Http/Controllers/Auth/AuthController.php` (line 18)

---

### 2. ✅ Simplified Forgot Password Flow
**Status:** Completed

**Backend Changes:**
- Removed email token-based reset flow
- New simplified flow: just provide email + new password
- Password is updated immediately without email verification
- All existing tokens are deleted after password reset

**Frontend Changes:**
- Updated forgot password page to include password fields
- Added password and password_confirmation inputs
- Shows success message and redirects to login after reset
- Improved error handling with field-specific validation

**Files Modified:**
- `app/Http/Controllers/Auth/AuthController.php` - `forgotPassword()` method
- `frontend/src/pages/auth/ForgotPasswordPage.jsx` - Complete UI overhaul

**API Endpoint:**
```
POST /api/forgot-password
Body: {
  email: string (required),
  password: string (required, min:8, must have uppercase & number),
  password_confirmation: string (required, must match password)
}
```

---

### 3. ✅ Added Course Deletion for Instructors
**Status:** Completed

**Backend Changes:**
- Updated `CourseController::destroy()` to allow instructors to delete their own courses
- Admins can still delete any course
- Instructors can only delete courses they created

**Frontend Changes:**
- Added "Delete" button on each course card in the courses list page
- Added "Delete Course" button in the course header on the course detail page
- Both buttons include confirmation dialogs with warnings
- Proper error handling and success feedback

**Files Modified:**
- `app/Http/Controllers/CourseController.php` - `destroy()` method
- `frontend/src/pages/instructor/InstructorCoursesListPage.jsx` - Added delete button
- `frontend/src/pages/instructor/InstructorCoursePage.jsx` - Added delete button in header

**Features:**
- Delete button on course list (positioned top-right of each card)
- Delete button in course detail page header
- Confirmation dialog warns about permanent deletion
- Automatically navigates back to courses list after deletion
- Filters deleted course from list without page reload

---

## Testing Notes

### Login Issue Resolution
The instructor account password is `password` (not `Admin123!`) because the database was seeded using `DatabaseSeeder.php`.

**Demo Credentials:**
- **Admin:** admin@demo.com / password
- **Instructor:** instructor@demo.com / password  
- **Student:** student1@demo.com / password

---

## API Changes Summary

### Modified Endpoints:

1. **POST /api/forgot-password**
   - Old: `{ email }` → sends reset link
   - New: `{ email, password, password_confirmation }` → resets immediately

2. **DELETE /api/courses/{id}**
   - Old: Admin only
   - New: Admin OR course instructor

---

## Security Notes

- Password validation still enforces:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 number
  - Must be different from current password
- Course deletion requires explicit confirmation
- Instructors can only delete their own courses
- All tokens are invalidated after password reset

### Assessment calendar sync and dark-mode readability (2026-11-10)
- Scheduled assessments now create or update a linked calendar event automatically; students see it after the assessment is published. Removing all schedule dates removes the linked event.
- Removed the optional calendar checkbox from instructor assessment setup.
- Individual activities show only activity essentials and schedule controls; quiz-only options are hidden and normalized before saving.
- Softened dark-mode surfaces and accent colors and improved contrast for student pages, chatbot messages and inputs, and workspace navigation.
