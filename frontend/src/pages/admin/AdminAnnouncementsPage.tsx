import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { announcementApi, notificationAdminApi } from '../../api/notificationApi'
import { useDialog } from '../../components/ConfirmDialog'

const TARGET_OPTIONS = [
  { value: 'ALL', label: 'All Users' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'HELP_DESK_OFFICER', label: 'Help Desk Officers' },
  { value: 'DEPARTMENT_STAFF', label: 'Department Staff' },
  { value: 'WELFARE_OFFICER', label: 'Welfare Officers' },
  { value: 'ADMIN', label: 'Administrators' },
  { value: 'MANAGEMENT', label: 'Management' },
]
const targetLabel = (v: string | null) => TARGET_OPTIONS.find((t) => t.value === (v || 'ALL'))?.label || 'All Users'

const PRIORITY_OPTIONS = ['LOW', 'NORMAL', 'HIGH', 'URGENT']

const AdminAnnouncementsPage: React.FC = () => {
  const { confirm, dialog } = useDialog()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ title: '', body: '', publish: false, startDate: '', endDate: '', targetRole: 'ALL', priority: 'NORMAL' })
  const [saving, setSaving] = useState(false)

  // Direct notification (distinct from persistent announcements — an ephemeral push to a user/role)
  const [showNotifyModal, setShowNotifyModal] = useState(false)
  const [notifyMode, setNotifyMode] = useState<'ROLE' | 'USER'>('ROLE')
  const [notifyRole, setNotifyRole] = useState('STUDENT')
  const [notifyUserId, setNotifyUserId] = useState('')
  const [notifyTitle, setNotifyTitle] = useState('')
  const [notifyMessage, setNotifyMessage] = useState('')
  const [sendingNotify, setSendingNotify] = useState(false)
  const [notifyResult, setNotifyResult] = useState('')

  // Search / filter
  const [search, setSearch] = useState('')
  const [targetFilter, setTargetFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = async (p = 0) => {
    setLoading(true)
    try {
      const res = await announcementApi.getAll(p, 20, {
        search: search || undefined,
        targetRole: targetFilter || undefined,
        isPublished: statusFilter === '' ? undefined : statusFilter === 'published',
      })
      setAnnouncements(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } catch { setError('Failed to load announcements.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load(page) }, [page])

  const applyFilters = () => { setPage(0); load(0) }
  const clearFilters = () => { setSearch(''); setTargetFilter(''); setStatusFilter(''); setPage(0); load(0) }

  const openNew = () => {
    setEditing(null)
    setForm({ title: '', body: '', publish: false, startDate: '', endDate: '', targetRole: 'ALL', priority: 'NORMAL' })
    setFormError('')
    setShowModal(true)
  }

  const openEdit = (a: any) => {
    setEditing(a)
    setForm({
      title: a.title,
      body: a.body,
      publish: a.isPublished,
      startDate: a.startDate ? a.startDate.slice(0, 16) : '',
      endDate: a.endDate ? a.endDate.slice(0, 16) : '',
      targetRole: a.targetRole || 'ALL',
      priority: a.priority || 'NORMAL',
    })
    setFormError('')
    setShowModal(true)
  }

  const [formError, setFormError] = useState('')

  const validateForm = () => {
    if (!form.title.trim()) return 'Title is required.'
    if (form.title.trim().length > 200) return 'Title must be 200 characters or fewer.'
    if (!form.body.trim()) return 'Message is required.'
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate))
      return 'End date must be after the start date.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const problem = validateForm()
    setFormError(problem)
    if (problem) return
    setSaving(true)
    try {
      if (editing) {
        await announcementApi.update(editing.id, {
          title: form.title, body: form.body,
          startDate: form.startDate || null, endDate: form.endDate || null,
          targetRole: form.targetRole, priority: form.priority,
        })
      } else {
        await announcementApi.create({
          title: form.title, body: form.body, publish: form.publish,
          startDate: form.startDate || undefined, endDate: form.endDate || undefined,
          targetRole: form.targetRole, priority: form.priority,
        })
      }
      setShowModal(false)
      load(0)
    } catch (err: any) { setError(err.response?.data?.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const togglePublish = async (id: number, pub: boolean) => {
    try { await announcementApi.publish(id, pub); load(page) }
    catch { setError('Failed to update.') }
  }

  const deleteAnn = async (id: number) => {
    if (!(await confirm('Delete this announcement notification? This cannot be undone.', { title: 'Delete announcement', confirmText: 'Delete', danger: true }))) return
    try {
      await announcementApi.delete(id)
      load(page)
    } catch { setError('Failed to delete.') }
  }

  const openNotify = () => {
    setNotifyMode('ROLE'); setNotifyRole('STUDENT'); setNotifyUserId('')
    setNotifyTitle(''); setNotifyMessage(''); setNotifyResult('')
    setShowNotifyModal(true)
  }

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingNotify(true); setNotifyResult('')
    try {
      const res = await notificationAdminApi.sendNotification({
        userId: notifyMode === 'USER' ? Number(notifyUserId) : undefined,
        role: notifyMode === 'ROLE' ? notifyRole : undefined,
        title: notifyTitle,
        message: notifyMessage,
      })
      setNotifyResult(`✅ Sent to ${res.data.recipients} recipient(s).`)
      setNotifyTitle(''); setNotifyMessage('')
    } catch (err: any) { setNotifyResult(err.response?.data?.message || 'Failed to send notification.') }
    finally { setSendingNotify(false) }
  }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        {error && <div className="alert alert-danger mb-4" role="alert">⚠️ {error} <button className="btn btn-ghost btn-sm" onClick={() => setError('')}>Dismiss</button></div>}

        <div className="page-header">
          <div>
            <h1 className="page-title">📢 Broadcast Notifications</h1>
            <p className="page-subtitle">Part of the Notification Module — create and manage admin announcement notifications targeted at specific roles, alongside the system's automatic notifications.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={openNotify}>🔔 Send Notification</button>
            <button className="btn btn-primary" onClick={openNew} id="btn-new-announcement">+ New Announcement</button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="filter-bar mb-4" role="search" aria-label="Filter announcements" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <input className="search-input" type="search" placeholder="Search title or message…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            aria-label="Search announcements" />
          <select value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)} aria-label="Filter by target access level">
            <option value="">All Access Levels</option>
            {TARGET_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
          <button className="btn btn-secondary" onClick={clearFilters}>Clear</button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📢</div>
              <p className="empty-title">No announcements found</p>
              <p className="empty-desc">Create an announcement to broadcast a notification to a role or to everyone.</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="Announcement notifications">
                  <thead>
                    <tr>
                      <th>Title</th><th>Message</th><th>Target</th><th>Priority</th><th>Status</th><th>Created By</th><th>Created</th><th>Updated</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {announcements.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>{a.body}</td>
                        <td><span className="badge badge-draft">{targetLabel(a.targetRole)}</span></td>
                        <td style={{ fontSize: '0.8rem' }}>{a.priority || 'NORMAL'}</td>
                        <td>
                          <span className={`badge ${a.isPublished ? 'badge-success' : 'badge-closed'}`}>
                            {a.isPublished ? '✅ Published' : '📝 Draft'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.createdBy?.fullName || '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : '—'}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => togglePublish(a.id, !a.isPublished)}>
                              {a.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => deleteAnn(a.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <span className="text-sm text-secondary">Page {page + 1} of {totalPages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title" id="modal-title">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
                <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">✕</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group mb-4">
                  <label htmlFor="ann-title">Title</label>
                  <input id="ann-title" required maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                {formError && <div className="alert alert-danger mb-4" role="alert">⚠️ {formError}</div>}
                <div className="form-group mb-4">
                  <label htmlFor="ann-body">Message</label>
                  <textarea id="ann-body" required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mb-4">
                  <div className="form-group">
                    <label htmlFor="ann-target">Target Access Level</label>
                    <select id="ann-target" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                      {TARGET_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="ann-priority">Priority</label>
                    <select id="ann-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }} className="mb-4">
                  <div className="form-group">
                    <label htmlFor="ann-start">Start Date (optional)</label>
                    <input id="ann-start" type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ann-end">End Date (optional)</label>
                    <input id="ann-end" type="datetime-local" min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
                {!editing && (
                  <div className="form-group mb-6">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.publish} onChange={(e) => setForm({ ...form, publish: e.target.checked })}
                        style={{ width: 'auto' }} />
                      Publish immediately
                    </label>
                  </div>
                )}
                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner" /> Saving…</> : editing ? 'Update' : 'Create'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Direct Notification modal */}
        {showNotifyModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="notify-modal-title">
            <div className="modal">
              <div className="modal-header">
                <h2 className="modal-title" id="notify-modal-title">🔔 Send Direct Notification</h2>
                <button className="modal-close" onClick={() => setShowNotifyModal(false)} aria-label="Close">✕</button>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: -8, marginBottom: '1rem' }}>
                Pushes an immediate notification bell alert — unlike an announcement, it isn't a persistent banner and can't be edited afterwards.
              </p>
              <form onSubmit={sendNotification}>
                <div className="form-group mb-4">
                  <label htmlFor="notify-mode">Send To</label>
                  <select id="notify-mode" value={notifyMode} onChange={(e) => setNotifyMode(e.target.value as 'ROLE' | 'USER')}>
                    <option value="ROLE">Everyone with a role</option>
                    <option value="USER">A specific user (by ID)</option>
                  </select>
                </div>
                {notifyMode === 'ROLE' ? (
                  <div className="form-group mb-4">
                    <label htmlFor="notify-role">Role</label>
                    <select id="notify-role" value={notifyRole} onChange={(e) => setNotifyRole(e.target.value)}>
                      {TARGET_OPTIONS.filter((t) => t.value !== 'ALL').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-group mb-4">
                    <label htmlFor="notify-userid">User ID</label>
                    <input id="notify-userid" type="number" required value={notifyUserId} onChange={(e) => setNotifyUserId(e.target.value)} placeholder="e.g. 8" />
                  </div>
                )}
                <div className="form-group mb-4">
                  <label htmlFor="notify-title">Title</label>
                  <input id="notify-title" required value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
                </div>
                <div className="form-group mb-4">
                  <label htmlFor="notify-message">Message</label>
                  <textarea id="notify-message" required value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} />
                </div>
                {notifyResult && <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{notifyResult}</p>}
                <div className="flex gap-3">
                  <button type="submit" className="btn btn-primary" disabled={sendingNotify}>
                    {sendingNotify ? <><span className="spinner" /> Sending…</> : 'Send'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNotifyModal(false)}>Close</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {dialog}
      </main>
    </div>
  )
}

export default AdminAnnouncementsPage
