import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/authApi'

const LoginPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  // Shown once after an automatic inactivity logout (set in AuthContext)
  const [notice] = useState(() => {
    const msg = sessionStorage.getItem('logoutReason') || ''
    sessionStorage.removeItem('logoutReason')
    return msg
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address.'
    if (!form.password) e.password = 'Password is required.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    setFieldErrors(v)
    if (Object.keys(v).length > 0) return

    setError('')
    setLoading(true)
    try {
      const res = await authApi.login(form)
      const data = res.data
      login({
        userId: data.userId,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        departmentId: data.departmentId,
        departmentName: data.departmentName,
        accessToken: data.accessToken,
      })

      // Route based on role
      const roleRoutes: Record<string, string> = {
        STUDENT: '/student',
        HELP_DESK_OFFICER: '/helpdesk',
        DEPARTMENT_STAFF: '/department',
        WELFARE_OFFICER: '/welfare',
        ADMIN: '/admin',
        MANAGEMENT: '/management',
      }
      navigate(roleRoutes[data.role] || '/', { replace: true })
    } catch (err: any) {
      const backendFieldErrors = err.response?.data?.errors
      if (backendFieldErrors && typeof backendFieldErrors === 'object') {
        setFieldErrors((prev) => ({ ...prev, ...backendFieldErrors }))
      }
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <main className="auth-card fade-in">
        <div className="auth-logo">
          <div style={{ fontSize: '2.5rem', fontWeight: 800,
            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            UniDesk
          </div>
          <div style={{ fontSize:'0.7rem', letterSpacing:'0.1em',
            color:'var(--color-text-muted)', marginTop: 4 }}>
            STUDENT HELP DESK PORTAL
          </div>
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your account to continue</p>

        {notice && !error && (
          <div className="alert alert-info" role="status" aria-live="polite">
            ⏱ {notice}
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert" aria-live="assertive">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group mb-4">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@university.edu"
              className={fieldErrors.email ? 'input-error' : ''}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              aria-required="true"
              aria-describedby={fieldErrors.email ? 'email-err' : undefined}
            />
            {fieldErrors.email && <span id="email-err" className="error-msg" role="alert">{fieldErrors.email}</span>}
          </div>

          <div className="form-group mb-6">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className={fieldErrors.password ? 'input-error' : ''}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              aria-required="true"
              aria-describedby={fieldErrors.password ? 'password-err' : undefined}
            />
            {fieldErrors.password && <span id="password-err" className="error-msg" role="alert">{fieldErrors.password}</span>}
            <div style={{ textAlign: 'right', marginTop: 4 }}>
              <Link to="/forgot-password" style={{ fontSize: '0.8rem' }}>
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? <><span className="spinner" /> Signing in…</> : 'Sign In'}
          </button>
        </form>

        <hr className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>
      </main>
    </div>
  )
}

export default LoginPage
