import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OfferingDetailPage from './pages/OfferingDetailPage'
import QuizPage from './pages/QuizPage'
import AssignmentPage from './pages/AssignmentPage'
import GradebookPage from './pages/GradebookPage'
import AttendancePage from './pages/AttendancePage'
import MoocCatalogPage from './pages/MoocCatalogPage'
import CompetenciesPage from './pages/CompetenciesPage'
import CertificatesPage from './pages/CertificatesPage'
import IntegrationMonitorPage from './pages/IntegrationMonitorPage'
import AuditLogPage from './pages/AuditLogPage'
import DomainListPage from './pages/DomainListPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/academic"
        element={
          <ProtectedRoute>
            <Layout>
              <DomainListPage domain="academic" />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lnd"
        element={
          <ProtectedRoute>
            <Layout>
              <DomainListPage domain="lnd" />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mooc"
        element={
          <ProtectedRoute>
            <Layout>
              <MoocCatalogPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/offering/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <OfferingDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/quiz/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <QuizPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assignment/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <AssignmentPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gradebook"
        element={
          <ProtectedRoute>
            <Layout>
              <GradebookPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <AttendancePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/competencies"
        element={
          <ProtectedRoute>
            <Layout>
              <CompetenciesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/certificates"
        element={
          <ProtectedRoute>
            <Layout>
              <CertificatesPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/integration"
        element={
          <ProtectedRoute>
            <Layout>
              <IntegrationMonitorPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <Layout>
              <AuditLogPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
