import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { welfareApi } from '../../api/welfareApi'

const WelfareCaseForm: React.FC = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState({ subject: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (form.subject.trim().length < 5) e.subject = 'Subject must be at least 5 characters.'
    if (form.description.trim().length < 10) e.description = 'Please provide more detail.'
    if (!agreed) e.agreed = 'Please confirm you understand the privacy notice.'
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
      const res = await welfareApi.create({ subject: form.subject, description: form.description })
      navigate(`/student/welfare/${res.data.id}`, { replace: true })
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to submit welfare case.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">🛡 Submit a Welfare Case</h1>
            <p className="page-subtitle">
              For sensitive personal matters — mental health, financial hardship, personal crisis, or safety concerns.
            </p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 720 }}>
          {/* Privacy notice — IEEE Ethics §1: welfare paramount */}
          <div className="alert alert-info mb-6" role="note">
            <div>
              <strong>🔒 Privacy & Confidentiality</strong>
              <p style={{ marginTop: 6, fontSize: '0.9rem' }}>
                Your welfare case is <strong>completely private</strong>. Only you and your assigned
                Welfare Officer (and system administrators) can see its contents.
                It is stored in a separate, isolated system from regular help desk tickets.
                Staff from other departments cannot access this information.
              </p>
            </div>
          </div>

          {apiError && <div className="alert alert-danger" role="alert">⚠️ {apiError}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group mb-4">
              <label htmlFor="subject">
                Subject <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="subject" type="text" required
                placeholder="Brief description (you can be vague — details in description)"
                maxLength={300}
                className={errors.subject ? 'input-error' : ''}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                aria-required="true"
              />
              {errors.subject && <span className="error-msg" role="alert">{errors.subject}</span>}
            </div>

            <div className="form-group mb-4">
              <label htmlFor="description">
                Description <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="description" rows={7} required
                placeholder="Describe your situation in as much or as little detail as you're comfortable sharing. The welfare officer will reach out to you privately."
                className={errors.description ? 'input-error' : ''}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                aria-required="true"
              />
              {errors.description && <span className="error-msg" role="alert">{errors.description}</span>}
            </div>

            <div className="form-group mb-6">
              <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', fontWeight: 400 }}>
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  aria-describedby={errors.agreed ? 'agree-err' : undefined}
                />
                I understand this case is confidential and only visible to me and the Welfare Officer.
              </label>
              {errors.agreed && <span id="agree-err" className="error-msg" role="alert">{errors.agreed}</span>}
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-lg" disabled={loading}
                style={{ background: 'var(--color-welfare)', borderColor: 'var(--color-welfare)', color: '#fff' }}>
                {loading ? <><span className="spinner" /> Submitting…</> : '🛡 Submit Welfare Case'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default WelfareCaseForm
