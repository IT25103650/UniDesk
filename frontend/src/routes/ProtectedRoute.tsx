import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  children: React.ReactNode
  roles?: string[]
}

/**
 * ProtectedRoute — renders children only when:
 *   1. User is authenticated (JWT present + user in context)
 *   2. User has one of the allowed roles (if specified)
 *
 * Redirects to /login on auth failure.
 * Returns a clear 403 message on role mismatch rather than silently hiding.
 * (IEEE Code of Ethics §6 — honest representation of system state)
 */
const ProtectedRoute: React.FC<Props> = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-danger)' }}>Access Denied</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
          You do not have permission to view this page.
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
