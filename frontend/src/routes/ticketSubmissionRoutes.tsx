import { lazy } from 'react'
import { Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'

// ── Module 1 — Ticket Submission and Tracking (student pages) ─────────────────
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'))
const MyTicketsPage    = lazy(() => import('../pages/student/MyTicketsPage'))
const NewTicketForm    = lazy(() => import('../pages/student/NewTicketForm'))
const TicketDetailPage = lazy(() => import('../pages/student/TicketDetailPage'))

export const ticketSubmissionRoutes = (
  <>
    <Route path="/student" element={
      <ProtectedRoute roles={['STUDENT']}>
        <StudentDashboard />
      </ProtectedRoute>
    } />
    <Route path="/student/tickets" element={
      <ProtectedRoute roles={['STUDENT']}>
        <MyTicketsPage />
      </ProtectedRoute>
    } />
    <Route path="/student/tickets/new" element={
      <ProtectedRoute roles={['STUDENT']}>
        <NewTicketForm />
      </ProtectedRoute>
    } />
    <Route path="/student/tickets/:id" element={
      <ProtectedRoute roles={['STUDENT']}>
        <TicketDetailPage />
      </ProtectedRoute>
    } />
  </>
)
