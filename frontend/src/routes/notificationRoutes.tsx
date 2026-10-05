import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// ── Module 5 — Notifications, Announcements and Audit Logging ─────────────────
const NotificationPreferencesPage = lazy(() => import('../pages/shared/NotificationPreferencesPage'))
const AdminAnnouncementsPage      = lazy(() => import('../pages/admin/AdminAnnouncementsPage'))
const AuditLogPage                = lazy(() => import('../pages/admin/AuditLogPage'))

export const notificationRoutes = (
  <>
    <Route path="/preferences" element={
      <ProtectedRoute roles={['STUDENT', 'HELP_DESK_OFFICER', 'DEPARTMENT_STAFF', 'WELFARE_OFFICER', 'ADMIN', 'MANAGEMENT']}>
        <NotificationPreferencesPage />
      </ProtectedRoute>
    } />
    <Route path="/admin/announcements" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AdminAnnouncementsPage />
      </ProtectedRoute>
    } />
    <Route path="/admin/audit" element={
      <ProtectedRoute roles={['ADMIN']}>
        <AuditLogPage />
      </ProtectedRoute>
    } />
  </>
)
