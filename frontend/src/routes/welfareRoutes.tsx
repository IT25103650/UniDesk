import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// ── Module 4 — Welfare Case Management and File Handling ──────────────────────
const WelfareCasesPage  = lazy(() => import('../pages/student/WelfareCasesPage'))
const WelfareCaseForm   = lazy(() => import('../pages/student/WelfareCaseForm'))
const WelfareDashboard  = lazy(() => import('../pages/welfare/WelfareDashboard'))
const WelfareCaseDetail = lazy(() => import('../pages/welfare/WelfareCaseDetail'))

// Note: admins do NOT get a welfare route — case content (description,
// comments, contact details) is confidential and stays inside the
// welfare officer / owning student trust boundary only.
export const welfareRoutes = (
  <>
    {/* Student side */}
    <Route path="/student/welfare" element={
      <ProtectedRoute roles={['STUDENT']}>
        <WelfareCasesPage />
      </ProtectedRoute>
    } />
    <Route path="/student/welfare/new" element={
      <ProtectedRoute roles={['STUDENT']}>
        <WelfareCaseForm />
      </ProtectedRoute>
    } />
    <Route path="/student/welfare/:id" element={
      <ProtectedRoute roles={['STUDENT']}>
        <WelfareCaseDetail />
      </ProtectedRoute>
    } />

    {/* Welfare officer side */}
    <Route path="/welfare" element={
      <ProtectedRoute roles={['WELFARE_OFFICER']}>
        <WelfareDashboard />
      </ProtectedRoute>
    } />
    <Route path="/welfare/cases" element={
      <ProtectedRoute roles={['WELFARE_OFFICER']}>
        <WelfareDashboard />
      </ProtectedRoute>
    } />
    <Route path="/welfare/cases/:id" element={
      <ProtectedRoute roles={['WELFARE_OFFICER']}>
        <WelfareCaseDetail />
      </ProtectedRoute>
    } />
  </>
)
