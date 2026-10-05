import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../api/authApi'

const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword(token, form.password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) return (
    <div className="auth-layout">
      <main className="auth-card">
        <div className="alert alert-danger">Invalid or missing reset token.</div>
        <Link to="/forgot-password">Request a new link</Link>
      </main>
    </div>
  )

  return (
    <div className="auth-layout">
      <main className="auth-card fade-in">
        <h1 className="auth-title">Set New Password</h1>
        <p className="auth-sub">Choose a strong, unique password.</p>

        {success && (
          <div className="alert alert-success" role="status">
            ✅ Password reset successfully. Redirecting to login…
          </div>
        )}
        {error && <div className="alert alert-danger" role="alert">⚠️ {error}</div>}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label htmlFor="new-pwd">New Password</label>
              <input id="new-pwd" type="password" required placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                aria-required="true" autoComplete="new-password" />
            </div>
            <div className="form-group mb-6">
              <label htmlFor="confirm-pwd">Confirm Password</label>
              <input id="confirm-pwd" type="password" required placeholder="Repeat password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                aria-required="true" autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Resetting…</> : 'Reset Password'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}

export default ResetPasswordPage
