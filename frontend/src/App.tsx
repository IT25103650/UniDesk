import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'

// Each module's routes live in its own routes/*Routes.tsx file and are picked up
// automatically, so adding or removing a module never touches this file.
const moduleRoutes = Object.entries(
  import.meta.glob<Record<string, React.ReactElement>>('./routes/*Routes.tsx', { eager: true })
).flatMap(([file, mod]) =>
  Object.entries(mod).map(([name, routes]) => <React.Fragment key={`${file}:${name}`}>{routes}</React.Fragment>)
)

// ── Common pages ───────────────────────────────────────────────────────────
const LoginPage          = lazy(() => import('./pages/auth/LoginPage'))
const RegisterPage       = lazy(() => import('./pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage  = lazy(() => import('./pages/auth/ResetPasswordPage'))
const ProfilePage        = lazy(() => import('./pages/shared/ProfilePage'))
const HelpPage           = lazy(() => import('./pages/shared/HelpPage'))

const ALL_ROLES = ['STUDENT', 'HELP_DESK_OFFICER', 'DEPARTMENT_STAFF', 'WELFARE_OFFICER', 'ADMIN', 'MANAGEMENT']

// Shared page loader
const PageLoader: React.FC = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' }}>
    <span className="spinner spinner-lg" aria-label="Loading page" />
  </div>
)

const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/register"        element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/"                element={<Navigate to="/login" replace />} />

          {/* Shared authenticated */}
          <Route path="/profile" element={
            <ProtectedRoute roles={ALL_ROLES}>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/help" element={
            <ProtectedRoute roles={ALL_ROLES}>
              <HelpPage />
            </ProtectedRoute>
          } />

          {/* Module routes */}
          {moduleRoutes}

          {/* 404 */}
          <Route path="*" element={
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:'1rem' }}>
              <h1 style={{ fontSize:'4rem', fontWeight:800, color:'var(--color-text-muted)' }}>404</h1>
              <p style={{ color:'var(--color-text-secondary)' }}>Page not found.</p>
              <a href="/login" className="btn btn-primary">Back to Login</a>
            </div>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AuthProvider>
)

export default App
