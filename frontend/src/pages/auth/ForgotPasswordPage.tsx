import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [step, setStep] = useState(1) // 1: Email, 2: Question
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleGetQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.getSecurityQuestion(email)
      if (res.data.question) {
        setQuestion(res.data.question)
        setStep(2)
      } else {
        // Generic message if email not found
        setError('No security question found for this email.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authApi.verifySecurityAnswer(email, answer)
      if (res.data.resetToken) {
        navigate(`/reset-password?token=${res.data.resetToken}`)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Incorrect answer. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <main className="auth-card fade-in">
        <h1 className="auth-title">Reset Password</h1>
        <p className="auth-sub">
          {step === 1 ? 'Enter your email to answer your security question.' : 'Answer your security question to reset your password.'}
        </p>

        {error && <div className="alert alert-danger" role="alert">⚠️ {error}</div>}

        {step === 1 ? (
          <form onSubmit={handleGetQuestion}>
            <div className="form-group mb-6">
              <label htmlFor="reset-email">Email address</label>
              <input
                id="reset-email" type="email" required
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-required="true"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Loading…</> : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAnswer}>
            <div className="form-group mb-6">
              <label>Security Question</label>
              <div style={{ padding: '0.75rem', background: 'var(--color-bg-secondary)', borderRadius: 8, fontWeight: 500, marginBottom: '1rem' }}>
                {question}
              </div>
              <label htmlFor="security-answer">Your Answer</label>
              <input
                id="security-answer" type="password" required
                placeholder="Type your answer here"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                aria-required="true"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" /> Verifying…</> : 'Verify Answer'}
            </button>
          </form>
        )}

        <hr className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Remembered? <Link to="/login">Back to sign in</Link>
        </p>
      </main>
    </div>
  )
}

export default ForgotPasswordPage
