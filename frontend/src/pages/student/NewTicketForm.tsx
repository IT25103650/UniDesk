import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { categoryApi } from '../../api/adminApi'
import { ticketSubmissionApi } from '../../api/ticketSubmissionApi'

const NewTicketForm: React.FC = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<any[]>([])
  const [form, setForm] = useState({ categoryId: '', subject: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)

  useEffect(() => {
    categoryApi.getAll(true).then((r) => setCategories(r.data))
  }, [])

  // Drafts follow the same rules as submitted tickets (the backend enforces both).
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.categoryId) e.categoryId = 'Please select a category.'
    const subjectLen = form.subject.trim().length
    if (subjectLen < 5 || subjectLen > 300) e.subject = 'Subject must be between 5 and 300 characters.'
    if (form.description.trim().length < 10) e.description = 'Please provide more detail (at least 10 characters).'
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
      const res = await ticketSubmissionApi.create({
        categoryId: Number(form.categoryId),
        subject: form.subject,
        description: form.description,
      })
      navigate(`/student/tickets/${res.data.id}`, { replace: true })
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to submit ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDraft = async () => {
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return

    setApiError('')
    setSavingDraft(true)
    try {
      const res = await ticketSubmissionApi.saveDraft({
        categoryId: Number(form.categoryId),
        subject: form.subject.trim(),
        description: form.description.trim(),
      })
      navigate(`/student/tickets/${res.data.id}`, { replace: true })
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Failed to save draft.')
    } finally {
      setSavingDraft(false)
    }
  }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Submit a New Ticket</h1>
            <p className="page-subtitle">
              Describe your issue clearly so we can assist you as quickly as possible.
            </p>
          </div>
        </div>

        <div className="card" style={{ maxWidth: 720 }}>
          {apiError && (
            <div className="alert alert-danger" role="alert" aria-live="assertive">⚠️ {apiError}</div>
          )}

          <div className="alert alert-info mb-4" role="note">
            ℹ️ For welfare-related concerns (personal, mental health, financial hardship), please use the
            dedicated{' '}
            <a href="/student/welfare/new" style={{ color: 'var(--color-welfare)' }}>
              Welfare Case form
            </a>{' '}
            instead — it's private and confidential.
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group mb-4">
              <label htmlFor="category">
                Category <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <select
                id="category" required
                className={errors.categoryId ? 'input-error' : ''}
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                aria-required="true" aria-describedby={errors.categoryId ? 'cat-err' : undefined}
              >
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && <span id="cat-err" className="error-msg" role="alert">{errors.categoryId}</span>}
            </div>

            <div className="form-group mb-4">
              <label htmlFor="subject">
                Subject <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="subject" type="text" required
                placeholder="Brief description of your issue"
                maxLength={300}
                className={errors.subject ? 'input-error' : ''}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                aria-required="true" aria-describedby={errors.subject ? 'sub-err' : undefined}
              />
              {errors.subject && <span id="sub-err" className="error-msg" role="alert">{errors.subject}</span>}
            </div>

            <div className="form-group mb-6">
              <label htmlFor="description">
                Description <span aria-hidden="true" style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                id="description" required rows={6}
                placeholder="Provide as much detail as possible: when did this happen, what have you tried, any relevant reference numbers…"
                className={errors.description ? 'input-error' : ''}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                aria-required="true" aria-describedby={errors.description ? 'desc-err' : undefined}
              />
              {errors.description && <span id="desc-err" className="error-msg" role="alert">{errors.description}</span>}
            </div>

            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading || savingDraft}>
                {loading ? <><span className="spinner" /> Submitting…</> : '🚀 Submit Ticket'}
              </button>
              <button type="button" className="btn btn-secondary btn-lg" disabled={loading || savingDraft}
                onClick={handleSaveDraft}>
                {savingDraft ? <><span className="spinner" /> Saving…</> : '💾 Save as Draft'}
              </button>
              <button type="button" className="btn btn-ghost btn-lg"
                onClick={() => navigate(-1)}>Cancel</button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default NewTicketForm
