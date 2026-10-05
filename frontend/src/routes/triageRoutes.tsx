import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// ── Module 2 — Ticket Triage and Assignment (help desk pages) ─────────────────
const HelpdeskDashboard    = lazy(() => import('../pages/helpdesk/HelpdeskDashboard'))
const HelpdeskTicketDetail = lazy(() => import('../pages/helpdesk/HelpdeskTicketDetail'))

export const triageRoutes = (
  <>
    <Route path="/helpdesk" element={
      <ProtectedRoute roles={['HELP_DESK_OFFICER', 'ADMIN']}>
        <HelpdeskDashboard />
      </ProtectedRoute>
    } />
    <Route path="/helpdesk/tickets" element={
      <ProtectedRoute roles={['HELP_DESK_OFFICER', 'ADMIN']}>
        <HelpdeskDashboard />
      </ProtectedRoute>
    } />
    <Route path="/helpdesk/tickets/:id" element={
      <ProtectedRoute roles={['HELP_DESK_OFFICER', 'ADMIN']}>
        <HelpdeskTicketDetail />
      </ProtectedRoute>
    } />
    {/* Admin's "All Tickets" view reuses the help desk triage dashboard */}
    <Route path="/admin/tickets" element={
      <ProtectedRoute roles={['ADMIN']}>
        <HelpdeskDashboard />
      </ProtectedRoute>
    } />
  </>
)
