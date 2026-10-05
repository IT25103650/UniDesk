import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge, OverdueBadge } from '../../components/Badges'
import { categoryApi, deptApi } from '../../api/adminApi'
import { triageApi } from '../../api/triageApi'

const today = new Date().toISOString().split('T')[0]

const HelpdeskDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [categories, setCategories] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', categoryId: '', departmentId: '', fromDate: '', toDate: '' })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async (p = 0, f = filters) => {
    setLoading(true)
    setError('')
    try {
      // Load tickets (primary — show error if this fails)
      const t = await triageApi.getAll({
        status: f.status || undefined,
        priority: f.priority || undefined,
        search: f.search || undefined,
        categoryId: f.categoryId || undefined,
        departmentId: f.departmentId || undefined,
        fromDate: f.fromDate || undefined,
        toDate: f.toDate || undefined,
        page: p, size: 15,
      })
      setTickets(t.data.content || [])
      setTotalPages(t.data.totalPages || 0)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load tickets.')
    } finally {
      setLoading(false)
    }

    // Load stats, categories, departments independently (non-blocking)
    Promise.allSettled([
      triageApi.getStats(),
      categoryApi.getAll(),
      deptApi.getAll(),
    ]).then(([s, c, d]) => {
      if (s.status === 'fulfilled') setStats(s.value.data)
      if (c.status === 'fulfilled') setCategories(c.value.data || [])
      if (d.status === 'fulfilled') setDepartments(d.value.data || [])
    })
  }

  useEffect(() => { load(0, filters) }, [])

  const applyFilters = () => { setPage(0); load(0, filters) }

  const isOverdue = (t: any) =>
    t.dueDate && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status) && new Date(t.dueDate) < new Date()

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Help Desk Inbox</h1>
            <p className="page-subtitle">Manage and triage all incoming student tickets.</p>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4" role="alert">⚠️ {error}</div>}

        <div className="stats-grid">
          {[
            { label: 'Total', value: stats.totalTickets, color: 'var(--color-primary-500)', icon: '🎫' },
            { label: 'New', value: stats.newTickets, color: 'var(--color-new)', icon: '📥' },
            { label: 'In Progress', value: stats.inProgressTickets, color: 'var(--color-inprogress)', icon: '⚙️' },
            { label: 'Resolved', value: stats.resolvedTickets, color: 'var(--color-resolved)', icon: '✅' },
            { label: 'Urgent', value: stats.urgentTickets, color: 'var(--color-urgent)', icon: '🔴' },
            { label: 'Overdue (this page)', value: tickets.filter(isOverdue).length, color: 'var(--color-danger)', icon: '⏰' },
          ].map((s) => (
            <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as any}>
              <div className="stat-icon" aria-hidden="true">{s.icon}</div>
              <div className="stat-value">{s.value ?? '—'}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="filter-bar" role="search" aria-label="Filter tickets" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <input className="search-input" type="search" placeholder="Search reference, subject, or student…"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            aria-label="Search tickets" />
          <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            aria-label="Filter by category">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
            aria-label="Filter by department">
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filter by status">
            <option value="">All Statuses</option>
            {['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            aria-label="Filter by priority">
            <option value="">All Priorities</option>
            {['LOW','NORMAL','HIGH','URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>From:</span>
            <input type="date" className="input-field" value={filters.fromDate} max={filters.toDate || today} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>To:</span>
            <input type="date" className="input-field" value={filters.toDate} min={filters.fromDate || undefined} max={today} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
          <button className="btn btn-secondary" onClick={() => {
            const clear = { status: '', priority: '', search: '', categoryId: '', departmentId: '', fromDate: '', toDate: '' }
            setFilters(clear); load(0, clear)
          }}>Clear</button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📥</div>
              <p className="empty-title">No tickets found</p>
              <p className="empty-desc">No tickets match the current filters.</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="Ticket inbox">
                  <thead>
                    <tr>
                      <th scope="col">Ref</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Student</th>
                      <th scope="col">Category</th>
                      <th scope="col">Dept</th>
                      <th scope="col">Status</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td><code style={{ color: 'var(--color-primary-400)', fontSize: '0.75rem' }}>{t.referenceNo}</code></td>
                        <td style={{ maxWidth: 180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.subject}</td>
                        <td style={{ fontSize: '0.85rem' }}>{t.studentName}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{t.categoryName}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {t.departmentName || <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem' }}>⚠ Unassigned</span>}
                        </td>
                        <td>
                          <StatusBadge status={t.status} />
                          {isOverdue(t) && <span style={{ marginLeft: 6 }}><OverdueBadge /></span>}
                        </td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td><Link to={`/helpdesk/tickets/${t.id}`} className="btn btn-ghost btn-sm">Manage</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => { setPage(p=>p-1); load(page-1) }}>← Prev</button>
                  <span className="text-sm text-secondary">Page {page+1} of {totalPages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages-1} onClick={() => { setPage(p=>p+1); load(page+1) }}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default HelpdeskDashboard
