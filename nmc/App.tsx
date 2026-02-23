import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './src/context/AuthContext';
import Login from './pages/Login';
import { GlobalAnalyticsTracker } from './src/components/GlobalAnalyticsTracker';
import { AutoLogout } from './src/components/AutoLogout';

// Pages
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Programs from './pages/Programs';
import Candidates from './pages/Candidates';
import Examiners from './pages/Examiners';
import UsersPage from './pages/Users';
import Tasks from './pages/Tasks';
import Downloads from './pages/Downloads';
import PracticalAssessment from './pages/PracticalAssessment';
import CareStudyAssessment from './pages/CareStudyAssessment';
import CarePlanAssessment from './pages/CarePlanAssessment';
import ObstetricianAssessment from './pages/ObstetricianAssessment';
import ObstetricianReconciliation from './pages/ObstetricianReconciliation';
import PracticalReconciliation from './pages/PracticalReconciliation';
import ReconciliationList from './pages/ReconciliationList';
import AdminResults from './pages/AdminResults';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';
import Cohorts from './pages/Cohorts';
import ExaminerAssessments from './pages/ExaminerAssessments';
import ForcePasswordChange from './pages/ForcePasswordChange';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user, logout, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (!user) return <Navigate to="/" />;

  if (user.forcePasswordChange) return <ForcePasswordChange />;

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* Header is fixed with its own z-30 */}
      <Header
        toggleSidebar={toggleSidebar}
        onLogout={logout}
        user={user}
        onUpdateProfile={() => { window.location.href = '/settings'; }}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Sidebar: fixed directly below the fixed header. NO transform property —
          CSS transform on a fixed element breaks its top-positioning. Use left instead. */}
      <aside
        style={{
          left: isSidebarOpen ? '0' : '-16rem',
          top: '0',
          transition: 'left 0.3s ease-in-out',
        }}
        className="fixed top-0 bottom-0 z-40 w-64 bg-white border-r border-gray-200 overflow-y-auto"
      >
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          isOpen={true}
          userRole={user.role}
          onMobileClose={closeSidebar}
        />
      </aside>

      {/* Mobile overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Main content area — shifts right when sidebar is open on desktop */}
      <div
        style={{
          marginLeft: (!isMobile && isSidebarOpen) ? '16rem' : '0',
          paddingTop: '4rem',
          transition: 'margin-left 0.3s ease-in-out',
        }}
      >
        <main className="p-4 md:p-6">
          <Outlet context={{ setCurrentPage }} />

          <footer className="mt-12 text-center text-gray-600 text-sm py-4">
            Copyright © 2026 Stream Streak inc.
          </footer>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <>
      <GlobalAnalyticsTracker />
      <AutoLogout />
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

        <Route element={<Layout />}>
          {/* Dashboard */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Examiner Routes */}
          <Route path="/my-assessments" element={
            <ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}>
              <ExaminerAssessments />
            </ProtectedRoute>
          } />

          {/* Administrator Routes */}
          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Analytics />
            </ProtectedRoute>
          } />
          <Route path="/programs" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Programs />
            </ProtectedRoute>
          } />
          <Route path="/candidates" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Candidates />
            </ProtectedRoute>
          } />
          <Route path="/examiners" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Examiners />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <UsersPage />
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Tasks />
            </ProtectedRoute>
          } />

          {/* Results/Downloads Routes (Admin) */}
          <Route path="/practical-results" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Downloads title="Practical Results" type="practical" />
            </ProtectedRoute>
          } />
          <Route path="/care-study-results" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Downloads title="Care Study Results" type="care_study" />
            </ProtectedRoute>
          } />
          <Route path="/care-plan-results" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Downloads title="Care Plan Results" type="care_plan" />
            </ProtectedRoute>
          } />
          <Route path="/obstetrician-results" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <Downloads title="Obstetrician Results" type="obstetrician" />
            </ProtectedRoute>
          } />

          {/* Examiner Routes */}
          <Route path="/practical-exams" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><PracticalAssessment /></ProtectedRoute>} />
          <Route path="/assess-care-study" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><CareStudyAssessment /></ProtectedRoute>} />
          <Route path="/assess-care-plan" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><CarePlanAssessment /></ProtectedRoute>} />
          <Route path="/assess-obstetrician" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><ObstetricianAssessment /></ProtectedRoute>} />
          <Route path="/reconciliation-list" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><ReconciliationList /></ProtectedRoute>} />
          <Route path="/practical-reconciliation/:reconciliationId" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><PracticalReconciliation /></ProtectedRoute>} />
          <Route path="/obstetrician-reconciliation/:reconciliationId" element={<ProtectedRoute allowedRoles={['EXAMINER', 'ADMINISTRATOR']}><ObstetricianReconciliation /></ProtectedRoute>} />

          {/* Settings & Audit */}
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute allowedRoles={['ADMINISTRATOR']}>
              <AuditLog />
            </ProtectedRoute>
          } />

        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

const PublicOnlyRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default App;