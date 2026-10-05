import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// ── Module 6 — Administration, Dashboard and Reporting ────────────────────────
const AdminDashboard       = lazy(() => import('../pages/admin/AdminDashboard'))
const AdminUsersPage       = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminDepartmentsPage = lazy(() => import('../pages/admin/AdminDepartmentsPage'))
const AdminCategoriesPage  = lazy(() => import('../pages/admin/AdminCategoriesPage'))
const AdminReportsPage     = lazy(() => import('../pages/admin/AdminReportsPage'))
const ManagementDashboard  = lazy(() => import('../pages/management/ManagementDashboard'))

export const adminRoutes = (
  <>
    <Route path="/admin" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AdminDashboard />
      </ProtectedRoute>
    } />
    <Route path="/admin/users" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AdminUsersPage />
      </ProtectedRoute>
    } />
    <Route path="/admin/departments" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AdminDepartmentsPage />
      </ProtectedRoute>
    } />
    <Route path="/admin/categories" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AdminCategoriesPage />
      </ProtectedRoute>
    } />
    <Route path="/admin/reports" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AdminReportsPage />
      </ProtectedRoute>
    } />

    {/* Management */}
    <Route path="/management" element={
      <ProtectedRoute roles={['MANAGEMENT']}>
        <ManagementDashboard />
      </ProtectedRoute>
    } />
    <Route path="/management/reports" element={
      <ProtectedRoute roles={['MANAGEMENT']}>
        <ManagementDashboard />
      </ProtectedRoute>
    } />
  </>
)
