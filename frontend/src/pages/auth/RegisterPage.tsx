import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { authApi } from '../../api/authApi'

const roleRoutes: Record<string, string> = {
  STUDENT: '/student',
  HELP_DESK_OFFICER: '/helpdesk',
  DEPARTMENT_STAFF: '/department',
  WELFARE_OFFICER: '/welfare',
  ADMIN: '/admin',
  MANAGEMENT: '/management',
}

const RegisterPage: React.FC = () => {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '', studentId: '', phone: '',
    securityQuestion: '', securityAnswer: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  // Once registration succeeds, we switch to a code-entry step instead of
  // navigating away — a typed-in code works no matter which device the
  // student reads the email on, unlike a clickable link.
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [verifying, setVerifying] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.fullName.trim() || form.fullName.length < 2)
      e.fullName = 'Full name must be at least 2 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address.'
    if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword)
      e.confirmPassword = 'Passwords do not match.'
    if (!form.studentId.trim())
      e.studentId = 'Student ID is required.'
    if (!form.securityQuestion.trim())
      e.securityQuestion = 'Security question is required.'
    if (!form.securityAnswer.trim())
      e.securityAnswer = 'Security answer is required.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setApiError('')
    setLoading(true)
    try {
      await authApi.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        studentId: form.studentId.trim(),
        phone: form.phone || undefined,
        securityQuestion: form.securityQuestion,
        securityAnswer: form.securityAnswer,
      })
      setAwaitingCode(true)
    } catch (err: any) {
      const fieldErrors = err.response?.data?.errors
      if (fieldErrors && typeof fieldErrors === 'object') {
        // Backend-side @Valid failures (e.g. stricter email format than our
        // client-side check) — surface them on the actual fields, not just
        // as a vague banner, since the message tells the user to look there.
        setErrors((prev) => ({ ...prev, ...fieldErrors }))
      }
      setApiError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setCodeError('')
    if (!/^\d{6}$/.test(code.trim())) {
      setCodeError('Enter the 6-digit code exactly as it appeared in your email.')
      return
    }
    setVerifying(true)
    try {
      const res = await authApi.verifyEmail(code.trim())
      const data = res.data
      login({
        userId: data.userId, fullName: data.fullName, email: data.email,
        role: data.role, departmentId: data.departmentId,
        departmentName: data.departmentName, accessToken: data.accessToken,
      })
      navigate(roleRoutes[data.role] || '/', { replace: true })
    } catch (err: any) {
      setCodeError(err.response?.data?.message || 'Verification failed. Please check the code and try again.')
    } finally {
      setVerifying(false)
    }
  }

  const field = (id: string, label: string, type = 'text', placeholder = '', required = false) => (
    <div className="form-group">
      <label htmlFor={id}>
        {label} {required && <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      <input
        id={id} type={type} placeholder={placeholder} required={required}
        className={errors[id] ? 'input-error' : ''}
        value={(form as any)[id]}
        onChange={(e) => setForm({ ...form, [id]: e.target.value })}
        aria-required={required} aria-describedby={errors[id] ? `${id}-err` : undefined}
        autoComplete={type === 'email' ? 'email' : type === 'password' ? 'new-password' : 'off'}
      />
      {errors[id] && <span id={`${id}-err`} className="error-msg" role="alert">{errors[id]}</span>}
    </div>
  )

  return (
    <div className="auth-layout">
      <main className="auth-card fade-in" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div style={{ fontSize: '2rem', fontWeight: 800,
            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            UniDesk
          </div>
        </div>

        {awaitingCode ? (
          <>
            <h1 className="auth-title">Enter your verification code</h1>
            <p className="auth-sub">
              We sent a 6-digit code to <strong>{form.email}</strong>. Enter it below to finish creating your account.
            </p>

            {codeError && (
              <div className="alert alert-danger" role="alert" aria-live="assertive">⚠️ {codeError}</div>
            )}

            <form onSubmit={handleVerify} noValidate>
              <div className="form-group mb-6">
                <label htmlFor="code">Verification code</label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  style={{ fontSize: '1.5rem', letterSpacing: '0.4em', textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  aria-required="true"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={verifying}>
                {verifying ? <><span className="spinner" /> Verifying…</> : 'Verify & Continue'}
              </button>
            </form>

            <hr className="divider" />
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Wrong email? <button type="button" className="btn-ghost" style={{ textDecoration: 'underline', padding: 0 }} onClick={() => setAwaitingCode(false)}>Go back</button>
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-sub">Join the student help desk portal</p>

            {apiError && (
              <div className="alert alert-danger" role="alert" aria-live="assertive">⚠️ {apiError}</div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="grid-2 mb-4">
                {field('fullName', 'Full Name', 'text', 'Your full name', true)}
                {field('email', 'Email Address', 'email', 'you@university.edu', true)}
              </div>
              <div className="grid-2 mb-4">
                {field('password', 'Password', 'password', 'Min. 8 characters', true)}
                {field('confirmPassword', 'Confirm Password', 'password', 'Repeat password', true)}
              </div>
              <div className="grid-2 mb-4">
                {field('studentId', 'Student ID', 'text', 'e.g. STU-2024-001', true)}
                {field('phone', 'Phone Number', 'tel', 'Optional')}
              </div>
              <div className="grid-2 mb-6">
                {field('securityQuestion', 'Security Question', 'text', 'e.g. What is your favorite color?', true)}
                {field('securityAnswer', 'Security Answer', 'password', 'Your answer', true)}
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
                {loading ? <><span className="spinner" /> Creating account…</> : 'Create Account'}
              </button>
            </form>

            <hr className="divider" />
            <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </main>
    </div>
  )
}

export default RegisterPage
