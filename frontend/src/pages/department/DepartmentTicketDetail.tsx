import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge, OverdueBadge } from '../../components/Badges'
import { deptApi } from '../../api/adminApi'
import { departmentResponseApi } from '../../api/departmentResponseApi'
import { ticketSubmissionApi } from '../../api/ticketSubmissionApi'
import { triageApi } from '../../api/triageApi'
import { useAuth } from '../../context/AuthContext'
import StudentProfileModal from '../../components/StudentProfileModal'
import { useDialog } from '../../components/ConfirmDialog'

const DepartmentTicketDetail: React.FC = () => {
  const { confirm, prompt, dialog } = useDialog()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const ticketId = Number(id)
  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [replyBody, setReplyBody] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [showForward, setShowForward] = useState(false)
  const [forwardDept, setForwardDept] = useState('')
  const [forwardReason, setForwardReason] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const t = await ticketSubmissionApi.getById(ticketId)
      setTicket(t.data)
      setStatus(t.data.status)

      try {
        const [c, h, d] = await Promise.all([
          ticketSubmissionApi.getComments(ticketId),
          ticketSubmissionApi.getHistory(ticketId),
          deptApi.getAll(true),
        ])
        setComments(c.data || [])
        setHistory(h.data || [])
        setDepartments(d.data || [])
      } catch (subErr) {
        console.warn('Sub-resource loading warning:', subErr)
      }
    } catch (err) {
      console.error('Failed to load department ticket:', err)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [ticketId])

  // ── Saved reply templates (Module 3) ──
  const loadTemplates = async () => {
    try { const r = await departmentResponseApi.getReplyTemplates(); setTemplates(r.data || []) }
    catch { /* templates are optional — the reply box still works without them */ }
  }
  useEffect(() => { loadTemplates() }, [])

  const insertTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    const t = templates.find((x) => String(x.id) === templateId)
    if (t) setReplyBody(t.body)
  }

  const saveAsTemplate = async () => {
    if (!replyBody.trim()) return
    const title = await prompt('Give this saved reply a short name so your department can reuse it.',
      { title: 'Save as template', confirmText: 'Save Template', placeholder: 'e.g. Wi-Fi reset steps' })
    if (title === null) return
    if (!title) { setError('Template name is required.'); return }
    try {
      const r = await departmentResponseApi.createReplyTemplate(title, replyBody)
      await loadTemplates()
      setSelectedTemplateId(String(r.data.id))
      setSuccess(`Saved reply "${r.data.title}" created.`)
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to save template.') }
  }

  const deleteTemplate = async () => {
    const t = templates.find((x) => String(x.id) === selectedTemplateId)
    if (!t) return
    if (!(await confirm(`Delete the saved reply "${t.title}" for your whole department?`,
      { title: 'Delete saved reply', confirmText: 'Delete', danger: true }))) return
    try {
      await departmentResponseApi.deleteReplyTemplate(t.id)
      setSelectedTemplateId('')
      await loadTemplates()
      setSuccess(`Saved reply "${t.title}" deleted.`)
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to delete template.') }
  }

  const sendReply = async () => {
    if (!replyBody.trim()) return
    setSending(true)
    try {
      await departmentResponseApi.addComment(ticketId, replyBody, isInternal)
      setReplyBody('')
      setIsInternal(false)
      setSuccess(isInternal ? 'Internal note added.' : 'Reply sent to student.')
      const c = await ticketSubmissionApi.getComments(ticketId)
      setComments(c.data)
    } catch { setError('Failed to send reply.') }
    finally { setSending(false) }
  }

  const updateStatus = async (newStatus: string) => {
    if (!(await confirm(`Change this ticket's status to ${newStatus.replace(/_/g, ' ')}? The student will be notified.`,
      { title: 'Change status', confirmText: 'Change Status' }))) {
      setStatus(ticket.status)   // put the dropdown back if cancelled
      return
    }
    try {
      const res = await departmentResponseApi.updateStatus(ticketId, newStatus, `Status changed to ${newStatus}`)
      setTicket(res.data)
      setStatus(res.data.status)
      setSuccess(`Status updated to ${newStatus}.`)
      const h = await ticketSubmissionApi.getHistory(ticketId)
      setHistory(h.data)
    } catch { setError('Failed to update status.') }
  }

  const [closingTicket, setClosingTicket] = useState(false)
  const closeTicket = async () => {
    if (!(await confirm('Close/archive this resolved ticket? It will leave the active queue.', { title: 'Close ticket', confirmText: 'Close / Archive' }))) return
    setClosingTicket(true)
    try {
      const res = await departmentResponseApi.closeResolved(ticketId)
      setTicket(res.data)
      setStatus(res.data.status)
      setSuccess('Ticket closed/archived.')
      const h = await ticketSubmissionApi.getHistory(ticketId)
      setHistory(h.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to close ticket.')
    } finally {
      setClosingTicket(false)
    }
  }

  const deleteInternalNote = async (commentId: number) => {
    if (!(await confirm('Delete this internal note? This cannot be undone.', { title: 'Delete internal note', confirmText: 'Delete', danger: true }))) return
    try {
      await departmentResponseApi.deleteComment(ticketId, commentId)
      const c = await ticketSubmissionApi.getComments(ticketId)
      setComments(c.data)
      setSuccess('Internal note deleted.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete internal note.')
    }
  }

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null)
  const [editingNoteText, setEditingNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const startEditNote = (c: any) => {
    setEditingNoteId(c.id)
    setEditingNoteText(c.body)
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditingNoteText('')
  }

  const saveEditedNote = async (commentId: number) => {
    if (!editingNoteText.trim()) return
    setSavingNote(true)
    try {
      await departmentResponseApi.updateComment(ticketId, commentId, editingNoteText)
      const c = await ticketSubmissionApi.getComments(ticketId)
      setComments(c.data)
      setSuccess('Internal note updated.')
      cancelEditNote()
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update internal note.')
    } finally {
      setSavingNote(false)
    }
  }

  const [resolutionNoteText, setResolutionNoteText] = useState('')
  const [savingResolutionNote, setSavingResolutionNote] = useState(false)

  const saveResolutionNote = async () => {
    if (!resolutionNoteText.trim()) return
    setSavingResolutionNote(true)
    try {
      const res = await departmentResponseApi.addResolutionNote(ticketId, resolutionNoteText)
      setTicket(res.data)
      setResolutionNoteText('')
      setSuccess('Resolution note added.')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add resolution note.')
    } finally {
      setSavingResolutionNote(false)
    }
  }

  const forwardTicket = async () => {
    if (!forwardDept || !forwardReason.trim()) return
    try {
      const res = await triageApi.forward(ticketId, Number(forwardDept), forwardReason)
      setTicket(res.data)
      setShowForward(false)
      setForwardReason('')
      setSuccess('Ticket forwarded successfully.')
      const h = await ticketSubmissionApi.getHistory(ticketId)
      setHistory(h.data)
    } catch { setError('Failed to forward ticket.') }
  }

  const isOverdue = ticket && ticket.dueDate && new Date(ticket.dueDate) < new Date() && !['RESOLVED', 'CLOSED'].includes(ticket.status)

  if (loading) return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content"><div className="loading-screen"><span className="spinner spinner-lg" /></div></main>
    </div>
  )

  if (!ticket) return null

  const externalComments = comments.filter(c => !c.internal)
  const internalNotes = comments.filter(c => c.internal)

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        {error && <div className="alert alert-danger mb-4" role="alert">⚠️ {error} <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>Dismiss</button></div>}
        {success && <div className="alert alert-success mb-4" role="alert">✅ {success} <button className="btn btn-ghost btn-sm" onClick={() => setSuccess('')}>Dismiss</button></div>}

        <div className="page-header">
          <div>
            <Link to="/department/tickets" className="btn btn-ghost btn-sm mb-2">← Back to Inbox</Link>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <code style={{ color: 'var(--color-primary-400)', fontSize: '1.2rem' }}>{ticket.referenceNo}</code>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              {isOverdue && <OverdueBadge />}
            </h1>
            <p className="page-subtitle">{ticket.subject}</p>
          </div>
        </div>

        {/* Ticket Info */}
        <div className="card mb-6">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            <div>
              <span className="form-hint">Student</span>
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{ticket.studentName}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{ticket.studentIdentifier || ''}</div>
              {ticket.studentEmail && <div style={{ fontSize: '0.78rem', color: 'var(--color-primary-400)', marginTop: 2 }}>✉️ {ticket.studentEmail}</div>}
              {ticket.studentPhone && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 1 }}>📞 {ticket.studentPhone}</div>}
              <button
                type="button"
                className="btn btn-secondary btn-sm mt-2"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                onClick={() => setShowStudentModal(true)}
              >
                👤 View Student Record
              </button>
            </div>
            <div><span className="form-hint">Category</span><div style={{ fontWeight: 500 }}>{ticket.categoryName}</div></div>
            <div><span className="form-hint">Department</span><div style={{ fontWeight: 500 }}>🏢 {ticket.departmentName || 'Unassigned'}</div></div>
            <div><span className="form-hint">Submitted</span><div style={{ fontSize: '0.85rem' }}>{new Date(ticket.createdAt).toLocaleString()}</div></div>
            {ticket.dueDate && <div><span className="form-hint">Due Date</span><div style={{ fontSize: '0.85rem', color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>{new Date(ticket.dueDate).toLocaleString()}</div></div>}
          </div>
          <div style={{ marginTop: '1rem' }}>
            <span className="form-hint">Description</span>
            <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>{ticket.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="card mb-6" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Status:</span>
          <select value={status} onChange={(e) => { setStatus(e.target.value); updateStatus(e.target.value) }} style={{ width: 'auto' }}>
            {['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowForward(true)}>↗ Forward to Another Dept</button>
          {ticket.status === 'RESOLVED' && (
            <button className="btn btn-secondary btn-sm" onClick={closeTicket} disabled={closingTicket}>
              {closingTicket ? <><span className="spinner" /> Closing…</> : '🗄 Close / Archive Ticket'}
            </button>
          )}
        </div>

        {/* Student Conversation */}
        <div className="card mb-6">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>💬 Student Conversation</h2>
          {externalComments.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No messages yet.</p>
          ) : externalComments.map(c => (
            <div key={c.id} style={{
              padding: '0.875rem', marginBottom: '0.75rem',
              background: c.authorRole === 'STUDENT' ? 'var(--color-surface-2)' : 'rgba(37,147,175,0.08)',
              borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${c.authorRole === 'STUDENT' ? 'var(--color-primary-400)' : 'var(--color-success)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.authorName} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>({c.authorRole.replace(/_/g, ' ')})</span></span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{c.body}</p>
            </div>
          ))}
        </div>

        {/* Internal Notes — Staff Only */}
        <div className="card mb-6" style={{ borderColor: 'var(--color-warning)', borderWidth: 2 }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-warning)' }}>🔒 Internal Notes <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>(Staff only — not visible to student)</span></h2>
          {internalNotes.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No internal notes.</p>
          ) : internalNotes.map(c => (
            <div key={c.id} style={{
              padding: '0.875rem', marginBottom: '0.75rem',
              background: 'rgba(245,158,11,0.06)', borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--color-warning)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.authorName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {new Date(c.createdAt).toLocaleString()}
                  {c.updatedAt && <span style={{ fontStyle: 'italic' }}> (edited {new Date(c.updatedAt).toLocaleString()})</span>}
                </span>
              </div>
              {editingNoteId === c.id ? (
                <div>
                  <textarea rows={3} value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)}
                    style={{ marginBottom: '0.5rem' }} aria-label="Edit internal note" />
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => saveEditedNote(c.id)} disabled={savingNote || !editingNoteText.trim()}>
                      {savingNote ? <><span className="spinner" /> Saving…</> : 'Save'}
                    </button>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEditNote}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{c.body}</p>
                  {(c.authorId === user?.userId || user?.role === 'ADMIN') && (
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => startEditNote(c)}
                      >
                        ✏️ Edit Note
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => deleteInternalNote(c.id)}
                      >
                        🗑 Delete Note
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Resolution Note */}
        {['RESOLVED', 'CLOSED'].includes(ticket.status) && (
          <div className="card mb-6" style={{ borderColor: 'var(--color-success)', borderWidth: 2 }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--color-success)' }}>✅ Resolution Note</h2>
            {ticket.resolutionNote ? (
              <div style={{
                padding: '0.875rem', background: 'rgba(34,197,94,0.06)',
                borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-success)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ticket.resolutionNoteByName}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {ticket.resolutionNoteAt && new Date(ticket.resolutionNoteAt).toLocaleString()}
                  </span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{ticket.resolutionNote}</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                  Summarize how this ticket was resolved. This is separate from the reply thread.
                </p>
                <textarea rows={3} placeholder="e.g. Replaced the faulty network cable and confirmed connectivity with the student."
                  value={resolutionNoteText} onChange={(e) => setResolutionNoteText(e.target.value)}
                  style={{ marginBottom: '0.75rem' }} aria-label="Resolution note" />
                <button className="btn btn-primary btn-sm" onClick={saveResolutionNote} disabled={savingResolutionNote || !resolutionNoteText.trim()}>
                  {savingResolutionNote ? <><span className="spinner" /> Saving…</> : 'Add Resolution Note'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reply Box */}
        <div className="card mb-6">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>✏️ Write a Reply</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <select aria-label="Insert saved reply" value={selectedTemplateId}
              onChange={(e) => insertTemplate(e.target.value)} style={{ width: 'auto', minWidth: 240 }}>
              <option value="">📋 Insert saved reply…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}{user?.role === 'ADMIN' ? ` (${t.departmentName})` : ''}</option>)}
            </select>
            {selectedTemplateId && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={deleteTemplate}>
                🗑 Delete saved reply
              </button>
            )}
          </div>
          <textarea placeholder="Type your reply…" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
            style={{ marginBottom: '0.75rem' }} aria-label="Reply body" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} style={{ width: 'auto' }} />
              🔒 Internal note (not visible to student)
            </label>
            <button className="btn btn-primary" onClick={sendReply} disabled={sending || !replyBody.trim()}>
              {sending ? <><span className="spinner" /> Sending…</> : isInternal ? 'Add Internal Note' : 'Send Reply'}
            </button>
            {user?.role === 'DEPARTMENT_STAFF' && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={saveAsTemplate} disabled={!replyBody.trim()}>
                💾 Save as template
              </button>
            )}
          </div>
        </div>

        {/* Status History */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📜 Status History</h2>
          {history.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>No history.</p>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="Status history">
                <thead><tr><th>From</th><th>To</th><th>Note</th><th>By</th><th>Date</th></tr></thead>
                <tbody>
                  {history.map((h: any) => (
                    <tr key={h.id}>
                      <td>{h.oldStatus || '—'}</td>
                      <td><StatusBadge status={h.newStatus} /></td>
                      <td style={{ fontSize: '0.85rem' }}>{h.note || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{h.changedBy?.fullName || '—'}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(h.changedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Forward Modal */}
        {showForward && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title">Forward Ticket</h2>
                <button className="modal-close" onClick={() => setShowForward(false)}>✕</button>
              </div>
              <div className="form-group mb-4">
                <label htmlFor="fwd-dept">Forward to Department</label>
                <select id="fwd-dept" value={forwardDept} onChange={(e) => setForwardDept(e.target.value)}>
                  <option value="">Select department…</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group mb-4">
                <label htmlFor="forward-reason">Reason (Required)</label>
                <textarea
                  id="forward-reason"
                  rows={2}
                  required
                  placeholder="Why is this being forwarded?"
                  value={forwardReason}
                  onChange={(e) => setForwardReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button className="btn btn-primary" onClick={forwardTicket} disabled={!forwardDept || !forwardReason.trim()}>Confirm Forward</button>
                <button className="btn btn-secondary" onClick={() => setShowForward(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {/* Student Profile Modal */}
        <StudentProfileModal
          isOpen={showStudentModal}
          onClose={() => setShowStudentModal(false)}
          studentUserId={ticket?.studentId}
          studentName={ticket?.studentName}
          studentIdentifier={ticket?.studentIdentifier}
          studentEmail={ticket?.studentEmail}
          studentPhone={ticket?.studentPhone}
        />
        {dialog}
      </main>
    </div>
  )
}

export default DepartmentTicketDetail
