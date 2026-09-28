# Alpha Test Fixes - IntelliLearn

## ✅ COMPLETED (Backend)

### Auth Flow
- ✅ **Password requirements**: Added uppercase + number requirement for registration
- ✅ **Password reset validation**: New password must be different from current password
- ✅ **Remember me**: Not implemented yet (requires frontend + backend session changes)

### Instructor Flow
- ✅ **PDF upload size**: Increased from 50MB to 100MB (Laravel validation + PHP runtime flag in `start.bat`)
- ✅ **Multiple choice validation**: Backend now rejects questions without options

---

## 🔧 TODO (Frontend & UX)

### Auth Flow
- [ ] **Remember me checkbox**: Wire up to backend (requires Sanctum token expiry config)

### Instructor Flow  
- [ ] **Assessment creation UX**: Open questions panel in same view (not separate tab)
- [ ] **Question form**: Remove pre-filled points, show placeholder only
- [ ] **Manual grading fix**: Debug why grading modal doesn't save (check API call in `InstructorAssessmentPage.jsx`)

### Student Flow
- [ ] **AI Chatbot on dashboard**: Add floating chatbot to `StudentDashboard.jsx` (already exists in other pages)
- [ ] **Risk Checker link**: Add "Risk Check" to student sidebar nav in `DashboardLayout.jsx`

### General/Overall
- [ ] **Back buttons**: Add back navigation to all pages (use `useNavigate()` from react-router)
- [ ] **10% larger UI**: Increase all font sizes and spacing by 10% in `index.css`

---

## Implementation Guide

### 1. Remember Me (Auth)
**Backend**: Modify `AuthController::login()` to accept `remember` boolean, set longer token expiry
**Frontend**: Pass `remember` value from `LoginPage.jsx` checkbox to API

### 2. Assessment Questions Panel (Instructor)
**File**: `frontend/src/pages/instructor/InstructorCoursePage.jsx`
- When creating assessment, show question form immediately below
- Use state to toggle question panel visibility

### 3. Question Form Fixes (Instructor)
**File**: Question creation modal/form
- Change `value={points}` to `placeholder="Points"`
- Add frontend validation: if type === 'multiple_choice' && options.length < 2, show error

### 4. Manual Grading Debug (Instructor)
**File**: `frontend/src/pages/instructor/InstructorAssessmentPage.jsx`
- Check `saveGrades()` function — verify API endpoint and payload format
- Add console.log to see what's being sent
- Check if `grades` state is populated correctly

### 5. AI Chatbot on Dashboard (Student)
**File**: `frontend/src/pages/student/StudentDashboard.jsx`
- Import `AiChatbot` component
- Add `<AiChatbot />` at bottom of component (already exists in other student pages)

### 6. Risk Checker Link (Student)
**File**: `frontend/src/components/layout/DashboardLayout.jsx`
- Add to `navItems.student` array:
```js
{ label: 'Risk Check', path: '/student/risk-check', icon: <WarningIcon fontSize="small" /> }
```

### 7. Back Buttons (All Pages)
Add to top of each page:
```jsx
<button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-700 mb-4">
  ← Back
</button>
```

### 8. 10% Larger UI (Global)
**File**: `frontend/src/index.css`
- Change root font-size from `15px` to `16.5px`
- Increase all padding/margin values by 10%
- Increase `--sidebar-width` from `230px` to `253px`

---

## Testing Checklist

After implementing fixes:

- [ ] Register with weak password (no uppercase/number) → should fail
- [ ] Reset password with same password → should fail
- [ ] Upload 80MB PDF → should succeed
- [ ] Create multiple choice question without options → should fail
- [ ] Grade a submission manually → should save
- [ ] Open AI chatbot on student dashboard → should work
- [ ] Click "Risk Check" in student sidebar → should navigate
- [ ] Click back button on any page → should go back
- [ ] Check if UI feels 10% larger

---

## Notes

- `start.bat` now includes PHP upload limit flags
- Password validation uses regex in `RegisterRequest.php`
- Backend changes are done, frontend changes need implementation
- Risk Check page already exists at `/student/risk-check`, just needs nav link
- AI Chatbot component already exists, just needs to be added to dashboard

---

## Quick Wins (Do These First)

1. Add Risk Check link to sidebar (2 min)
2. Add AI Chatbot to dashboard (2 min)
3. Fix question points placeholder (5 min)
4. Add back buttons (10 min)
5. Debug manual grading (15 min)
6. Increase UI size (20 min)
7. Assessment UX redesign (30 min)
8. Remember me feature (45 min)
