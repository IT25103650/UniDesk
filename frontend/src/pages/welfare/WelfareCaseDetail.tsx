import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge } from '../../components/Badges'
import { welfareApi } from '../../api/welfareApi'
import { useAuth } from '../../context/AuthContext'
import StudentProfileModal from '../../components/StudentProfileModal'
import { useDialog } from '../../components/ConfirmDialog'

const WelfareCaseDetail: React.FC = () => {
  const { confirm, notify, dialog } = useDialog()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [wc, setWc] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [attachments, setAttachments] = useState<any[]>([])
  const [commentText, setCommentText] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')   // action failures: shown inline, page stays visible
  const [note, setNote] = useState('')
  const [showStudentModal, setShowStudentModal] = useState(false)

  const load = async () => {
    try {
      const [w, c, h, a] = await Promise.all([
        welfareApi.getById(Number(id)),
        welfareApi.getComments(Number(id)),
        welfareApi.getHistory(Number(id)),
        welfareApi.getAttachments(Number(id)),
      ])
      setWc(w.data); setComments(c.data); setHistory(h.data); setAttachments(a.data)
    } catch { setError('Failed to load. You may not have access to this welfare case.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const setStatus = async (status: string) => {
    try { await welfareApi.updateStatus(Number(id), status, note); await load(); setNote('') }
    catch (err: any) { setActionError(err?.response?.data?.message || 'Failed to update status.') }
  }

  const toggleUrgent = async () => {
    try { await welfareApi.setUrgent(Number(id), !wc.urgent); await load() }
    catch { setActionError('Failed to update urgent flag.') }
  }

  const [archiving, setArchiving] = useState(false)
  const archiveCase = async () => {
    if (!(await confirm('Archive/close this welfare case? It will leave the active list but remain viewable in history.', { title: 'Archive case', confirmText: 'Archive / Close' }))) return
    setArchiving(true)
    try {
      await welfareApi.archive(Number(id))
      await load()
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to archive case.')
    } finally {
      setArchiving(false)
    }
  }

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setSending(true)
    try {
      await welfareApi.addComment(Number(id), commentText, isInternalNote)
      setCommentText('')
      setIsInternalNote(false)
      await load()
    }
    catch { setActionError('Failed to send message.') }
    finally { setSending(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await welfareApi.uploadAttachment(Number(id), file)
      await load()
    } catch {
      await notify('Failed to upload file.', { title: 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (fileId: number, fileName: string) => {
    try {
      const res = await welfareApi.downloadAttachment(Number(id), fileId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch {
      await notify('Failed to download file.', { title: 'Download failed' })
    }
  }

  const handleDeleteAttachment = async (fileId: number) => {
    if (!(await confirm('Delete this confidential file? This cannot be undone.', { title: 'Delete file', confirmText: 'Delete', danger: true }))) return
    try {
      await welfareApi.deleteAttachment(Number(id), fileId)
      await load()
    } catch {
      await notify('Failed to delete file.', { title: 'Delete failed' })
    }
  }

  const [assigning, setAssigning] = useState(false)
  const assignToMe = async () => {
    setAssigning(true)
    try {
      await welfareApi.assign(Number(id), user!.userId)
      await load()
    } catch (err: any) {
      setActionError(err?.response?.data?.message || 'Failed to assign case.')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <div className="page-layout"><Sidebar /><main className="main-content"><div className="loading-screen"><span className="spinner spinner-lg" /></div></main></div>
  if (error || !wc) return (
    <div className="page-layout"><Sidebar />
      <main className="main-content">
        <div className="empty-state">
          <div className="empty-icon">🔒</div>
          <p className="empty-title">Access Restricted</p>
          <p className="empty-desc">{error || 'Welfare case not found.'}</p>
          <button className="btn btn-secondary mt-4" onClick={() => navigate(-1)}>← Go back</button>
        </div>
      </main>
    </div>
  )

  const isOfficerOrAdmin = user?.role === 'WELFARE_OFFICER' || user?.role === 'ADMIN'

  // Module 4 — a welfare officer can delete their own internal note (messages to the student are kept)
  const deleteInternalNote = async (commentId: number) => {
    if (!(await confirm('Delete this internal note? This cannot be undone.',
      { title: 'Delete internal note', confirmText: 'Delete', danger: true }))) return
    try {
      await welfareApi.deleteComment(Number(id), commentId)
      setComments((cs) => cs.filter((c) => c.id !== commentId))
    } catch (err: any) { setActionError(err?.response?.data?.message || 'Failed to delete note.') }
  }

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
            <h1 className="page-title" style={{ fontSize:'1.4rem' }}>
              🛡 {wc.subject}
            </h1>
            <code style={{ color:'var(--color-welfare)', fontSize:'0.85rem' }}>{wc.referenceNo}</code>
            {wc.urgent && <span className="badge badge-urgent ml-2" style={{ marginLeft:8 }}>🔴 URGENT</span>}
          </div>
          <StatusBadge status={wc.status} />
        </div>

        <div className="alert alert-info mb-4" role="note">
          🔒 This is a confidential welfare case. Do not share its contents with unauthorised persons.
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'1.5rem' }}>
          <div>
            <div className="card mb-4">
              <h2 style={{ fontSize:'1rem', marginBottom:'1rem' }}>Description</h2>
              <p style={{ whiteSpace:'pre-wrap', color:'var(--color-text-secondary)', lineHeight:1.7 }}>{wc.description}</p>
            </div>

            <div className="card mb-4">
              <h2 style={{ fontSize:'1rem', marginBottom:'1rem' }}>📎 Confidential Files</h2>
              {attachments.length === 0 ? (
                <p style={{ color:'var(--color-text-muted)', fontSize:'0.9rem' }}>No attachments uploaded.</p>
              ) : (
                <ul style={{ listStyle:'none', padding:0, margin:0, marginBottom:'1rem' }}>
                  {attachments.map(att => (
                    <li key={att.id} style={{ display:'flex', justifyContent:'space-between', padding:'0.5rem', background:'var(--color-bg-alt)', borderRadius:'6px', marginBottom:'0.5rem' }}>
                      <span style={{ fontSize:'0.85rem' }}>{att.fileName} ({(att.fileSize/1024).toFixed(1)} KB)</span>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDownload(att.id, att.fileName)}>Download</button>
                        <button className="btn btn-ghost btn-sm" style={{ color:'var(--color-danger)' }} onClick={() => handleDeleteAttachment(att.id)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {wc.status !== 'CLOSED' && (
                <div>
                  <input type="file" id="welfare-file-upload" style={{ display:'none' }} onChange={handleFileUpload} />
                  <label htmlFor="welfare-file-upload" className="btn btn-sm btn-secondary" style={{ cursor:'pointer' }}>
                    {uploading ? 'Uploading…' : 'Upload Confidential File'}
                  </label>
                </div>
              )}
            </div>

            <div className="card">
              <h2 style={{ fontSize:'1rem', marginBottom:'1rem' }}>💬 Private Conversation</h2>
              {comments.length === 0 ? (
                <p style={{ color:'var(--color-text-muted)', fontSize:'0.9rem' }}>No messages yet.</p>
              ) : (
                <div className="comment-thread" aria-live="polite">
                  {comments.filter((c) => isOfficerOrAdmin || !c.isInternal).map((c) => {
                    const isMe = c.authorId === user?.userId
                    return (
                      <div key={c.id} className="comment-bubble" style={{ flexDirection: isMe ? 'row-reverse' : 'row' }}>
                        <div className="user-avatar" aria-hidden="true">{c.authorName.slice(0,2).toUpperCase()}</div>
                        <div className="comment-body" style={{ borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                          ...(c.isInternal ? { border: '1px dashed var(--color-warning, #d97706)' } : {}) }}>
                          <div className="comment-meta">
                            <span className="comment-author">{isMe ? 'You' : c.authorName}</span>
                            {' · '}{c.authorRole.replace('_',' ')}
                            {' · '}{new Date(c.createdAt).toLocaleString()}
                            {c.isInternal && <span style={{ marginLeft:6, color:'var(--color-warning, #d97706)', fontWeight:600 }}>🔒 Internal note — not visible to student</span>}
                          </div>
                          <p className="comment-text">{c.body}</p>
                          {c.isInternal && isMe && user?.role === 'WELFARE_OFFICER' && (
                            <button type="button" className="btn btn-ghost btn-sm mt-2"
                              style={{ color: 'var(--color-danger)', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                              onClick={() => deleteInternalNote(c.id)}>
                              🗑 Delete Note
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              {wc.status !== 'CLOSED' && (
                <form onSubmit={submitComment} className="mt-6">
                  <div className="form-group mb-3">
                    <label htmlFor="welfare-reply">
                      {isInternalNote ? 'Write an internal note (staff only)' : 'Send a private message'}
                    </label>
                    <textarea id="welfare-reply" rows={3} value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={isInternalNote ? 'Write a note for staff — the student will never see this…' : 'Write a confidential message…'} />
                  </div>
                  {isOfficerOrAdmin && (
                    <div className="form-group mb-3" style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <input type="checkbox" id="welfare-internal-note" checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)} />
                      <label htmlFor="welfare-internal-note" style={{ margin:0, fontSize:'0.85rem' }}>
                        Internal note (not visible to student)
                      </label>
                    </div>
                  )}
                  <button type="submit" className="btn btn-sm" disabled={sending || !commentText.trim()}
                    style={{ background:'var(--color-welfare)', borderColor:'var(--color-welfare)', color:'#fff' }}>
                    {sending ? <><span className="spinner" /> Sending…</> : isInternalNote ? '🔒 Save Internal Note' : '🔒 Send Private Message'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div>
            {isOfficerOrAdmin && (
              <>
                {/* Student Details Card */}
                <div className="card mb-4" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), var(--color-surface))', border: '1px solid var(--color-welfare)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-welfare), #5b21b6)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        flexShrink: 0,
                      }}
                    >
                      {wc.studentName ? wc.studentName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() : 'ST'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                        {wc.studentName || 'Student'}
                      </h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {wc.studentIdentifier || `ID #${wc.studentId}`}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>✉️</span>
                      <a href={`mailto:${wc.studentEmail}`} style={{ color: 'var(--color-primary-400)', wordBreak: 'break-all' }}>
                        {wc.studentEmail || 'student@unidesk.edu'}
                      </a>
                    </div>
                    {wc.studentPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--color-text-muted)' }}>📞</span>
                        <a href={`tel:${wc.studentPhone}`} style={{ color: 'var(--color-text-secondary)' }}>
                          {wc.studentPhone}
                        </a>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 2 }}>
                      <span>🎓</span>
                      <span>Registered Undergraduate</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm mt-3 w-full"
                      style={{ fontSize: '0.78rem', justifyContent: 'center' }}
                      onClick={() => setShowStudentModal(true)}
                    >
                      👤 View Student Record
                    </button>
                  </div>
                </div>

                <div className="card mb-4">
                  <h3 style={{ fontSize:'0.85rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>ASSIGNMENT</h3>
                  <p style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', marginBottom:'0.75rem' }}>
                    Assigned to: <strong>{wc.assignedToName || 'Unassigned'}</strong>
                  </p>
                  <button className="btn btn-secondary w-full" onClick={assignToMe} disabled={assigning || wc.assignedToName === user?.fullName}>
                    {assigning ? <><span className="spinner" /> Assigning…</> : wc.assignedToName === user?.fullName ? '✓ Assigned to You' : '👤 Assign to Me'}
                  </button>
                </div>
                <div className="card mb-4">
                  <h3 style={{ fontSize:'0.85rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>UPDATE STATUS</h3>
                  <div className="form-group mb-3">
                    <input type="text" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem' }}>
                    {['NEW','IN_PROGRESS','RESOLVED','CLOSED'].map((s) => (
                      <button key={s} className={`btn btn-sm ${wc.status === s ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setStatus(s)} aria-pressed={wc.status === s}
                        disabled={wc.status === 'CLOSED'}>
                        {s.replace('_',' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="card mb-4">
                  <h3 style={{ fontSize:'0.85rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>URGENT FLAG</h3>
                  <button className={`btn w-full ${wc.urgent ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleUrgent}>
                    {wc.urgent ? '🔴 Remove Urgent Flag' : '🔴 Mark as Urgent'}
                  </button>
                </div>
                {wc.status !== 'CLOSED' && (
                  <div className="card mb-4">
                    <h3 style={{ fontSize:'0.85rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>ARCHIVE CASE</h3>
                    <button className="btn btn-secondary w-full" onClick={archiveCase} disabled={archiving}>
                      {archiving ? <><span className="spinner" /> Archiving…</> : '🗄 Archive / Close Case'}
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="card">
              <h3 style={{ fontSize:'0.85rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>CASE INFO</h3>
              {[
                { label: 'Student', value: wc.studentName },
                { label: 'Assigned To', value: wc.assignedToName || 'Unassigned' },
                { label: 'Submitted', value: new Date(wc.createdAt).toLocaleString() },
                { label: 'Last Updated', value: new Date(wc.updatedAt).toLocaleString() },
              ].map((row) => (
                <div key={row.label} style={{ marginBottom:'0.75rem', fontSize:'0.875rem' }}>
                  <div style={{ color:'var(--color-text-muted)', marginBottom:2 }}>{row.label}</div>
                  <div style={{ fontWeight:500 }}>{row.value}</div>
                </div>
              ))}

              <hr className="divider" />
              <h4 style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', marginBottom:'0.75rem' }}>STATUS HISTORY</h4>
              {history.map((h) => (
                <div key={h.id} style={{ marginBottom:'0.5rem', fontSize:'0.8rem', borderLeft:'2px solid var(--color-welfare)', paddingLeft:'0.5rem' }}>
                  <div style={{ fontWeight:600 }}>{h.oldStatus ? `${h.oldStatus} → ` : ''}{h.newStatus}</div>
                  <div style={{ color:'var(--color-text-muted)' }}>{new Date(h.changedAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Student Profile Modal */}
        <StudentProfileModal
          isOpen={showStudentModal}
          onClose={() => setShowStudentModal(false)}
          studentUserId={wc?.studentId}
          studentName={wc?.studentName}
          studentIdentifier={wc?.studentIdentifier}
          studentEmail={wc?.studentEmail}
          studentPhone={wc?.studentPhone}
        />
        {dialog}
      </main>
    </div>
  )
}

export default WelfareCaseDetail
