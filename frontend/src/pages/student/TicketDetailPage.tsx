import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge, DraftBadge, OverdueBadge } from '../../components/Badges'
import { departmentResponseApi } from '../../api/departmentResponseApi'
import { ticketSubmissionApi } from '../../api/ticketSubmissionApi'
import { useAuth } from '../../context/AuthContext'
import { useDialog } from '../../components/ConfirmDialog'

const TicketDetailPage: React.FC = () => {
  const { confirm, prompt, notify, dialog } = useDialog()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submittingDraft, setSubmittingDraft] = useState(false)
  const [deletingDraft, setDeletingDraft] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [feedbackRating, setFeedbackRating] = useState<number>(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)
  const [reopenReason, setReopenReason] = useState('')
  const [requestingReopen, setRequestingReopen] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')   // action failures: shown inline, page stays visible
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const ticketRes = await ticketSubmissionApi.getById(Number(id))
      setTicket(ticketRes.data)
      if (ticketRes.data.feedbackRating) {
        setFeedbackRating(ticketRes.data.feedbackRating)
        setFeedbackComment(ticketRes.data.feedbackComment || '')
        setFeedbackSuccess(true)
      }

      // Load sub-resources safely
      try {
        const [c, h, a] = await Promise.all([
          ticketSubmissionApi.getComments(Number(id)),
          ticketSubmissionApi.getHistory(Number(id)),
          ticketSubmissionApi.getAttachments(Number(id)),
        ])
        setComments(c.data || [])
        setHistory(h.data || [])
        setAttachments(a.data || [])
      } catch (subErr) {
        console.warn('Sub-resource loading warning:', subErr)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load ticket. It may not exist or you may not have access.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const submitDraft = async () => {
    setSubmittingDraft(true)
    try {
      await ticketSubmissionApi.submitDraft(Number(id))
      await load()
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to submit draft ticket.')
    } finally {
      setSubmittingDraft(false)
    }
  }

  const handleDeleteDraft = async () => {
    if (!(await confirm('Delete this draft ticket permanently? This cannot be undone.', { title: 'Delete draft', confirmText: 'Delete Draft', danger: true }))) return
    setDeletingDraft(true)
    try {
      await ticketSubmissionApi.deleteDraft(Number(id))
      navigate('/student/tickets')
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to delete draft ticket.')
      setDeletingDraft(false)
    }
  }

  const handleWithdraw = async () => {
    const answer = await prompt('Withdraw this ticket? Staff will no longer action it. This cannot be undone.',
      { title: 'Withdraw ticket', confirmText: 'Withdraw Ticket', danger: true, placeholder: 'Optional: reason for withdrawing' })
    if (answer === null) return
    const reason = answer || undefined
    setWithdrawing(true)
    try {
      await ticketSubmissionApi.withdraw(Number(id), reason)
      await load()
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to withdraw ticket.')
    } finally {
      setWithdrawing(false)
    }
  }

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingFeedback(true)
    try {
      await ticketSubmissionApi.submitFeedback(Number(id), feedbackRating, feedbackComment)
      setFeedbackSuccess(true)
      await load()
    } catch {
      setActionError('Failed to submit feedback.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    try {
      await departmentResponseApi.addComment(Number(id), commentText)
      setCommentText('')
      await load()
    } catch { setActionError('Failed to send comment.') }
    finally { setSending(false) }
  }

  const uploadFile = async () => {
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'].includes(ext)) {
      setActionError('Only PDF, DOC, DOCX, JPG, PNG or TXT files can be attached.'); return
    }
    if (file.size > 10 * 1024 * 1024) { setActionError('Files must be 10 MB or smaller.'); return }
    setUploading(true)
    try {
      await ticketSubmissionApi.uploadAttachment(Number(id), file)
      setFile(null)
      await load()
    } catch { setActionError('Failed to upload file.') }
    finally { setUploading(false) }
  }

  const handleDeleteAttachment = async (fileId: number) => {
    if (!(await confirm('Are you sure you want to delete this attachment?', { title: 'Delete attachment', confirmText: 'Delete', danger: true }))) return
    try {
      await ticketSubmissionApi.deleteAttachment(Number(id), fileId)
      await load()
    } catch { setActionError('Failed to delete attachment.') }
  }

  const handleDownloadAttachment = async (fileId: number, fileName: string) => {
    try {
      const res = await ticketSubmissionApi.downloadAttachment(Number(id), fileId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      setActionError('Failed to download file.')
    }
  }

  const handleRequestReopen = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestingReopen(true)
    try {
      await ticketSubmissionApi.requestReopen(Number(id), reopenReason)
      setReopenReason('')
      await notify('Reopen request sent successfully.', { title: 'Request sent' })
      await load()
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to request reopen.')
    } finally {
      setRequestingReopen(false)
    }
  }

  if (loading) return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content"><div className="loading-screen"><span className="spinner spinner-lg" /></div></main>
    </div>
  )

  if (error || !ticket) return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content">
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <p className="empty-title">Ticket not found</p>
          <p className="empty-desc">{error || 'This ticket does not exist.'}</p>
          <button className="btn btn-secondary mt-4" onClick={() => navigate(-1)}>← Go back</button>
        </div>
      </main>
    </div>
  )

  const isOverdue = ticket && ticket.dueDate && new Date(ticket.dueDate) < new Date() && !['RESOLVED', 'CLOSED'].includes(ticket.status)

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        {actionError && (
          <div className="alert alert-danger mb-4" role="alert">
            ⚠️ {actionError} <button className="btn btn-ghost btn-sm" onClick={() => setActionError('')}>Dismiss</button>
          </div>
        )}
        <div className="page-header">
          <div>
            <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>
            <h1 className="page-title" style={{ fontSize: '1.4rem' }}>{ticket.subject}</h1>
            <code style={{ fontSize: '0.85rem', color: 'var(--color-primary-400)' }}>{ticket.referenceNo}</code>
          </div>
          <div className="flex gap-3 items-center">
            {ticket.isDraft ? <DraftBadge /> : <StatusBadge status={ticket.status} />}
            <PriorityBadge priority={ticket.priority} />
            {isOverdue && <OverdueBadge />}
          </div>
        </div>

        {/* Draft Notice Banner */}
        {ticket.isDraft && (
          <div className="alert alert-warning mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>📝 This ticket is currently a Draft.</strong>
              <div style={{ fontSize: '0.85rem', marginTop: 2 }}>
                It has not been submitted to the support team yet. You can review the details below and submit when ready.
              </div>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={handleDeleteDraft} disabled={deletingDraft || submittingDraft}>
                {deletingDraft ? <><span className="spinner" /> Deleting…</> : '🗑 Delete Draft'}
              </button>
              <button className="btn btn-primary" onClick={submitDraft} disabled={submittingDraft || deletingDraft}>
                {submittingDraft ? <><span className="spinner" /> Submitting…</> : '🚀 Submit Ticket Now'}
              </button>
            </div>
          </div>
        )}

        {/* Withdraw Notice for active, submitted tickets */}
        {!ticket.isDraft && ['NEW', 'ASSIGNED', 'IN_PROGRESS'].includes(ticket.status) && user?.role === 'STUDENT' && (
          <div className="alert alert-info mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Need to withdraw this ticket?</strong>
              <div style={{ fontSize: '0.85rem', marginTop: 2 }}>
                You can withdraw this ticket if you no longer need it actioned. This cannot be undone.
              </div>
            </div>
            <button className="btn btn-secondary" style={{ color: 'var(--color-danger)' }} onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? <><span className="spinner" /> Withdrawing…</> : '↩ Withdraw Ticket'}
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
          {/* Main */}
          <div>
            <div className="card mb-6">
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Description</h2>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {ticket.description}
              </p>
            </div>

            {/* Feedback Section if Resolved or Closed */}
            {['RESOLVED', 'CLOSED'].includes(ticket.status) && !ticket.isDraft && (
              <div className="card mb-6" style={{ borderLeft: '4px solid var(--color-success)' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>⭐ Satisfaction Feedback & Rating</h2>
                {feedbackSuccess ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem', color: '#f59e0b' }}>
                        {'★'.repeat(feedbackRating) + '☆'.repeat(5 - feedbackRating)}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>({feedbackRating} / 5 Stars)</span>
                    </div>
                    {feedbackComment && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                        "{feedbackComment}"
                      </p>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginTop: '0.5rem' }}>
                      ✓ Thank you for your feedback!
                    </div>
                  </div>
                ) : user?.role === 'STUDENT' ? (
                  <form onSubmit={submitFeedback}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                      How satisfied are you with the resolution of this issue?
                    </p>
                    <div className="rating-selector mb-4" style={{ display: 'flex', gap: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setFeedbackRating(star)}
                          style={{
                            fontSize: '1.5rem',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: star <= feedbackRating ? '#f59e0b' : 'var(--color-border)',
                            padding: '0 4px',
                            transition: 'transform 0.15s ease',
                          }}
                          aria-label={`${star} Stars`}
                        >
                          ★
                        </button>
                      ))}
                      <span style={{ alignSelf: 'center', fontSize: '0.9rem', fontWeight: 600, marginLeft: 8 }}>
                        {feedbackRating} / 5
                      </span>
                    </div>
                    <div className="form-group mb-4">
                      <label htmlFor="fb-comment">Additional comments (optional)</label>
                      <textarea
                        id="fb-comment"
                        rows={2}
                        placeholder="Tell us what went well or how we can improve…"
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={submittingFeedback}>
                      {submittingFeedback ? <><span className="spinner" /> Submitting…</> : 'Submit Feedback'}
                    </button>
                  </form>
                ) : (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    No student feedback submitted yet.
                  </p>
                )}
              </div>
            )}

            {/* Request Reopen Section */}
            {['RESOLVED', 'CLOSED'].includes(ticket.status) && user?.role === 'STUDENT' && (
              <div className="card mb-6">
                <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>🔄 Request Reopen</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                  If you feel this issue has not been fully resolved, you can request to reopen this ticket.
                </p>
                <form onSubmit={handleRequestReopen}>
                  <div className="form-group mb-4">
                    <label htmlFor="reopen-reason">Reason for reopening (optional)</label>
                    <textarea
                      id="reopen-reason"
                      rows={2}
                      placeholder="Explain why this needs to be reopened…"
                      value={reopenReason}
                      onChange={(e) => setReopenReason(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={requestingReopen}>
                    {requestingReopen ? <><span className="spinner" /> Requesting…</> : 'Request Reopen'}
                  </button>
                </form>
              </div>
            )}

            {/* Comments */}
            <div className="card mb-6">
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>💬 Conversation</h2>
              {comments.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  No replies yet. A staff member will respond shortly.
                </p>
              ) : (
                <div className="comment-thread" aria-live="polite" aria-label="Ticket comments">
                  {comments.map((c) => {
                    const isMe = c.authorId === user?.userId
                    return (
                      <div key={c.id} className="comment-bubble" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
                        <div className="user-avatar" style={{ flexShrink: 0 }} aria-hidden="true">
                          {c.authorName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className={`comment-body ${c.internal ? 'comment-internal' : ''}`}
                          style={{ borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px' }}>
                          <div className="comment-meta">
                            <span className="comment-author">{isMe ? 'You' : c.authorName}</span>
                            {' · '}
                            <span>{new Date(c.createdAt).toLocaleString()}</span>
                            {c.internal && <span style={{ color: 'var(--color-warning)', marginLeft: 6 }}>🔒 Internal</span>}
                          </div>
                          <p className="comment-text">{c.body}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reply form — disabled if closed */}
              {ticket.status !== 'CLOSED' ? (
                <form onSubmit={submitComment} className="mt-6">
                  <div className="form-group">
                    <label htmlFor="reply">Add a reply</label>
                    <textarea
                      id="reply" rows={3}
                      placeholder="Write your reply…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      aria-label="Add a reply to this ticket"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary mt-4" disabled={sending || !commentText.trim()}>
                    {sending ? <><span className="spinner" /> Sending…</> : '📤 Send Reply'}
                  </button>
                </form>
              ) : (
                <div className="alert alert-info mt-4">This ticket is closed. No further replies can be added.</div>
              )}
            </div>

            {/* Attachments */}
            <div className="card">
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>📎 Attachments</h2>
              {attachments.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No attachments.</p>
              ) : (
                <ul aria-label="Attachments list">
                  {attachments.map((a) => (
                    <li key={a.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem' }}>📄 {a.originalName}</span>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-ghost btn-sm"
                          onClick={() => handleDownloadAttachment(a.id, a.originalName)}>
                          Download
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }}
                                onClick={() => handleDeleteAttachment(a.id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {user?.role === 'STUDENT' && ticket.status !== 'CLOSED' && (
                <div className="mt-4">
                  <label htmlFor="file-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    📎 Attach File
                  </label>
                  <span className="form-hint" style={{ marginLeft: '0.75rem' }}>PDF, DOC, DOCX, JPG, PNG, TXT · max 10 MB</span>
                  <input id="file-upload" type="file" style={{ display: 'none' }}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                    aria-label="Attach a file to this ticket"
                  />
                  {file && (
                    <div className="mt-4 flex gap-3 items-center">
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{file.name}</span>
                      <button className="btn btn-primary btn-sm" onClick={uploadFile} disabled={uploading}>
                        {uploading ? <><span className="spinner" /> Uploading…</> : 'Upload'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar info */}
          <div>
            <div className="card mb-4">
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>TICKET INFO</h3>
              {[
                { label: 'Category', value: ticket.categoryName },
                { label: 'Department', value: ticket.departmentName || 'Not assigned' },
                { label: 'Assigned to', value: ticket.assignedToName || 'Pending' },
                { label: 'Submitted', value: new Date(ticket.createdAt).toLocaleString() },
                { label: 'Last updated', value: new Date(ticket.updatedAt).toLocaleString() },
                ticket.resolvedAt ? { label: 'Resolved at', value: new Date(ticket.resolvedAt).toLocaleString() } : null,
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                  <div style={{ color: 'var(--color-text-muted)', marginBottom: 2 }}>{row.label}</div>
                  <div style={{ fontWeight: 500 }}>{row.value}</div>
                </div>
              ))}
            </div>

            {/* Status history */}
            <div className="card">
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>STATUS HISTORY</h3>
              {history.map((h) => (
                <div key={h.id} style={{ marginBottom: '0.75rem', fontSize: '0.8rem',
                  borderLeft: '2px solid var(--color-border)', paddingLeft: '0.75rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {h.oldStatus ? `${h.oldStatus} → ` : ''}{h.newStatus}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(h.changedAt).toLocaleString()}
                  </div>
                  {h.note && <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{h.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {dialog}
      </main>
    </div>
  )
}

export default TicketDetailPage
