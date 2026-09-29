import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';
import InstructorLayout from './components/layout/InstructorLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import GoogleCallback from './pages/auth/GoogleCallback';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCoursesListPage from './pages/student/StudentCoursesListPage';
import StudentCoursePage from './pages/student/StudentCoursePage';
import StudentQuizPage from './pages/student/StudentQuizPage';
import StudentLessonPage from './pages/student/StudentLessonPage';
import StudentMaterialViewerPage from './pages/student/StudentMaterialViewerPage';
import StudentProfilePage from './pages/student/StudentProfilePage';
import StudentCalendarPage from './pages/student/StudentCalendarPage';
import StudentRiskCheckPage from './pages/student/StudentRiskCheckPage';

// Instructor
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import InstructorCoursesListPage from './pages/instructor/InstructorCoursesListPage';
import InstructorCoursePage from './pages/instructor/InstructorCoursePage';
import InstructorAssessmentPage from './pages/instructor/InstructorAssessmentPage';
import InstructorStudentsPage from './pages/instructor/InstructorStudentsPage';
import InstructorGradePage from './pages/instructor/InstructorGradePage';
import InstructorCreateCoursePage from './pages/instructor/InstructorCreateCoursePage';
import InstructorAiSummaryPage from './pages/instructor/InstructorAiSummaryPage';
import InstructorCreateLessonPage from './pages/instructor/InstructorCreateLessonPage';
import InstructorCreateAssessmentPage from './pages/instructor/InstructorCreateAssessmentPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminCreateCoursePage from './pages/admin/AdminCreateCoursePage';

// Utility
import { PlaceholderPage, UnauthorizedPage } from './pages/PlaceholderPage';

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  if (user.role === 'instructor') return <Navigate to="/instructor" />;
  return <Navigate to="/student" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* ── Student ── */}
          <Route path="/student" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentDashboard /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/courses" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentCoursesListPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/courses/:courseId" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentCoursePage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/courses/:courseId/lessons/:lessonId" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentLessonPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/courses/:courseId/lessons/:lessonId/materials/:materialId" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentMaterialViewerPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/courses/:courseId/assessments/:assessmentId" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentQuizPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/calendar" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentCalendarPage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/profile" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentProfilePage /></DashboardLayout>
            </ProtectedRoute>
          } />
          <Route path="/student/risk-check" element={
            <ProtectedRoute roles={['student']}>
              <DashboardLayout><StudentRiskCheckPage /></DashboardLayout>
            </ProtectedRoute>
          } />

          {/* ── Instructor ──
               /instructor and /instructor/courses are self-contained (own sidebar).
               All deeper sub-pages use InstructorLayout (same green sidebar). */}
          <Route path="/instructor" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorCoursesListPage />
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses/create" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorCreateCoursePage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorCoursePage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId/assessments/:assessmentId" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorAssessmentPage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/students" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorStudentsPage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/grading" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorGradePage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId/ai-summary" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorAiSummaryPage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId/lessons/create" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorCreateLessonPage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/courses/:courseId/assessments/create" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><InstructorCreateAssessmentPage /></InstructorLayout>
            </ProtectedRoute>
          } />
          <Route path="/instructor/profile" element={
            <ProtectedRoute roles={['instructor']}>
              <InstructorLayout><StudentProfilePage /></InstructorLayout>
            </ProtectedRoute>
          } />

          {/* ── Admin ── all wrapped in AdminLayout (navy sidebar + topbar) */}
          <Route path="/admin" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout><AdminUsersPage /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/courses" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/courses/create" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout><AdminCreateCoursePage /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout><PlaceholderPage title="Reports" /></AdminLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
