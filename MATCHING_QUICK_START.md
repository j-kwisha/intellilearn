# Matching Questions - Quick Start Guide

## 🚀 Ready to Test the New Matching Question Feature!

---

## ✅ Setup Complete

The matching questions feature has been fully implemented and the database is ready. You can now test it immediately!

---

## Quick Test (5 minutes)

### Step 1: Start the Application
```bash
# Terminal 1 - Backend
php artisan serve

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - AI Service (optional for matching questions)
cd ai-service
uvicorn app:app --reload --port 8001
```

### Step 2: Login as Instructor
- Navigate to `http://localhost:5173`
- Login with instructor account
- Go to any course

### Step 3: Create Assessment with Matching Question
1. Click "Create Assessment"
2. Fill in assessment details (Title, Type: Quiz)
3. Click "Create & Add Questions"
4. In the question form:
   - **Type:** Select "Matching"
   - **Question Text:** "Match programming languages with their types"
   - **Points:** 10
   - **Add Pairs:**
     ```
     Pair 1:
     Left: JavaScript
     Right: Scripting Language
     Correct: Scripting Language
     
     Pair 2:
     Left: Python
     Right: High-level Language
     Correct: High-level Language
     
     Pair 3:
     Left: C++
     Right: Compiled Language
     Correct: Compiled Language
     ```
5. Click "Save Questions"
6. Click "Done - Back to Course"

### Step 4: Test as Student
1. Logout from instructor account
2. Login with a student account enrolled in the course
3. Navigate to the course
4. Click on the assessment you just created
5. Click "Start Assessment"
6. You should see a **table** with:
   - Left column: JavaScript, Python, C++
   - Right column: Dropdown menus for each
7. Select matches (try correct, incorrect, and partial)
8. Click "Submit Answers"
9. View your results - score should be calculated automatically!

---

## Expected Results

### ✅ Instructor View
- Matching option appears in question type dropdown
- Can add/remove pairs (minimum 2)
- Validation prevents empty fields
- Questions save successfully
- Pairs appear in saved questions list

### ✅ Student View
- Table-based interface displays clearly
- Each left item has its own dropdown
- Dropdowns contain all right items
- Can submit with any combination of matches

### ✅ Grading
- **All correct (3/3):** 100% = 10 points
- **Partial (2/3):** ~67% = 6.67 points
- **Partial (1/3):** ~33% = 3.33 points
- **None correct (0/3):** 0% = 0 points

---

## Test Scenarios to Try

### Scenario A: All Correct ✅
```
JavaScript → Scripting Language ✓
Python → High-level Language ✓
C++ → Compiled Language ✓

Expected: 10/10 points (100%)
```

### Scenario B: Partially Correct ⚠️
```
JavaScript → Scripting Language ✓
Python → Compiled Language ✗
C++ → Compiled Language ✓

Expected: 6.67/10 points (~67%)
```

### Scenario C: All Wrong ❌
```
JavaScript → Compiled Language ✗
Python → Compiled Language ✗
C++ → Scripting Language ✗

Expected: 0/10 points (0%)
```

### Scenario D: Some Unmatched 🔵
```
JavaScript → Scripting Language ✓
Python → (not selected)
C++ → Compiled Language ✓

Expected: 6.67/10 points (~67%)
```

---

## Verification Checklist

After testing, verify these items:

### Database
- [ ] Check `matching_pairs` table has records
```sql
SELECT * FROM matching_pairs ORDER BY question_id, `order`;
```

- [ ] Check questions table has matching type
```sql
SELECT id, question_text, type, points FROM questions WHERE type = 'matching';
```

- [ ] Check submission answers stored as JSON
```sql
SELECT id, question_id, answer_text, points_earned, is_correct 
FROM submission_answers 
WHERE question_id IN (SELECT id FROM questions WHERE type = 'matching');
```

### Frontend
- [ ] Matching option in question type dropdown
- [ ] Pair inputs render correctly
- [ ] Add/Remove pair buttons work
- [ ] Validation messages appear
- [ ] Student table interface displays properly
- [ ] Dropdowns populated with right items
- [ ] Selections persist during navigation

### Grading
- [ ] Auto-grading calculates correctly
- [ ] Proportional scoring works
- [ ] Score included in total assessment score
- [ ] Results display properly to student

---

## Troubleshooting

### Issue: "Type 'matching' not in enum"
**Cause:** Migration not run or rolled back
**Fix:** 
```bash
php artisan migrate:status
php artisan migrate
```

### Issue: Matching pairs not showing
**Cause:** Relationship not loaded
**Check:** AssessmentController `show()` method includes:
```php
$assessment->load('questions.matchingPairs');
```

### Issue: Grading returns 0 for all answers
**Cause:** JSON parsing error or ID mismatch
**Debug:** Check console logs and verify answer_text format:
```json
{"45": "Scripting Language", "46": "High-level Language"}
```

### Issue: Pair IDs showing in dropdown
**Cause:** UI code error
**Check:** Dropdown should use `rightPair.right_item` not `rightPair.id`

---

## Advanced Testing

### Test with Multiple Question Types
Create an assessment with:
- 1 Multiple Choice (5 pts)
- 1 True/False (5 pts)
- 1 Matching (10 pts)
- 1 Essay (10 pts)

**Verify:**
- All types display correctly
- All auto-gradable types grade correctly
- Total score calculation includes matching
- Essay marked for manual grading

### Test Edit Functionality
1. Create matching question with 3 pairs
2. Edit the question
3. Remove 1 pair, add 2 new pairs
4. Save
5. **Verify:** Old pairs deleted, new pairs saved

### Test Delete Cascade
1. Create assessment with matching question
2. Note the question_id and check matching_pairs table
3. Delete the assessment
4. **Verify:** Matching pairs also deleted (cascade)

---

## Performance Check

### Expected Query Count
- Assessment view: ~3 queries (assessment + questions + matching_pairs)
- Submission: ~5 queries (validation + grading + save + grade compute)

### No N+1 Issues
Verify eager loading with:
```php
// In AssessmentController show()
DB::enableQueryLog();
$assessment->load('questions.matchingPairs');
dd(DB::getQueryLog()); // Should be 2-3 queries max
```

---

## Sample Data for Testing

### Programming Languages (Easy)
```
JavaScript → Scripting Language
Python → High-level Language
Java → Object-oriented Language
C++ → Compiled Language
```

### Countries and Capitals (Medium)
```
France → Paris
Germany → Berlin
Italy → Rome
Spain → Madrid
```

### Math Formulas (Hard)
```
Area of Circle → πr²
Pythagorean Theorem → a² + b² = c²
Quadratic Formula → x = (-b ± √(b²-4ac)) / 2a
Slope Formula → (y₂ - y₁) / (x₂ - x₁)
```

---

## What's Next?

1. **Manual Testing:** Complete the test plan in `MATCHING_QUESTIONS_TEST_PLAN.md`

2. **User Feedback:** Get real instructors and students to try it

3. **Documentation:** Update user guides with screenshots

4. **Iteration:** Enhance based on feedback

5. **Deploy:** Follow deployment notes in test plan

---

## Success Metrics

The feature is working correctly if:
- ✅ Instructors can create matching questions without errors
- ✅ Students see clean, usable interface
- ✅ Auto-grading produces expected scores
- ✅ No console errors or warnings
- ✅ Database properly stores all data
- ✅ Existing question types still work

---

## Quick Reference

**Docs:**
- `MATCHING_FEATURE_SUMMARY.md` - Feature overview
- `MATCHING_QUESTIONS_TEST_PLAN.md` - Detailed test scenarios
- `SYSTEM_OVERVIEW.md` - System architecture

**Key Files:**
- Backend: `app/Http/Controllers/AssessmentController.php`
- Backend: `app/Http/Controllers/SubmissionController.php`
- Frontend: `frontend/src/pages/instructor/InstructorCreateAssessmentPage.jsx`
- Frontend: `frontend/src/pages/student/StudentQuizPage.jsx`
- Migration: `database/migrations/2026_09_26_160747_create_matching_pairs_table.php`

---

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Laravel logs: `storage/logs/laravel.log`
3. Verify database state with queries above
4. Review implementation in key files

---

**Happy Testing! 🎉**

The matching questions feature is fully implemented and ready to enhance your IntelliLearn LMS!
