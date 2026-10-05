import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// ── Module 3 — Department Response and Overdue Tracking ───────────────────────
const DepartmentDashboard    = lazy(() => import('../pages/department/DepartmentDashboard'))
const DepartmentTicketDetail = lazy(() => import('../pages/department/DepartmentTicketDetail'))
const DepartmentArchivePage  = lazy(() => import('../pages/department/DepartmentArchivePage'))

export const departmentRoutes = (
  <>
    <Route path="/department" element={
      <ProtectedRoute roles={['DEPARTMENT_STAFF', 'ADMIN']}>
        <DepartmentDashboard />
      </ProtectedRoute>
    } />
    <Route path="/department/tickets" element={
      <ProtectedRoute roles={['DEPARTMENT_STAFF', 'ADMIN']}>
        <DepartmentDashboard />
      </ProtectedRoute>
    } />
    <Route path="/department/tickets/:id" element={
      <ProtectedRoute roles={['DEPARTMENT_STAFF', 'ADMIN']}>
        <DepartmentTicketDetail />
      </ProtectedRoute>
    } />
    <Route path="/department/archive" element={
      <ProtectedRoute roles={['DEPARTMENT_STAFF', 'ADMIN']}>
        <DepartmentArchivePage />
      </ProtectedRoute>
    } />
  </>
)
