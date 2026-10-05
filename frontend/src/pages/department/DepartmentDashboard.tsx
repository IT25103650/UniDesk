import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge, OverdueBadge } from '../../components/Badges'
import { departmentResponseApi } from '../../api/departmentResponseApi'

const today = new Date().toISOString().split('T')[0]

const DepartmentDashboard: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [filters, setFilters] = useState({ status: '', search: '', categoryId: '', fromDate: '', toDate: '' })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = async (p = 0, f = filters) => {
    setLoading(true)
    try {
      const [res, c] = await Promise.all([
        departmentResponseApi.getDepartmentTickets({
          status: f.status || undefined,
          search: f.search || undefined,
          categoryId: f.categoryId || undefined,
          dateFrom: f.fromDate || undefined,   // backend param is dateFrom
          dateTo: f.toDate || undefined,         // backend param is dateTo
          page: p,
          size: 15
        }),
        import('../../api/adminApi').then(m => m.categoryApi.getAll())
      ])
      setTickets(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
      setCategories(c.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load(0, filters) }, [])

  const applyFilters = () => { setPage(0); load(0, filters) }

  const isOverdue = (t: any) =>
    t.dueDate && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status) && new Date(t.dueDate) < new Date()

  const open = tickets.filter((t) => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status)).length
  const overdue = tickets.filter(isOverdue).length

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Department Tickets</h1>
            <p className="page-subtitle">View and respond to tickets assigned to your department.</p>
          </div>
        </div>

        <div className="stats-grid mb-6">
          {[
            { label: 'Total Assigned', value: tickets.length, color: 'var(--color-primary-500)', icon: '📋' },
            { label: 'Open', value: open, color: 'var(--color-warning)', icon: '🟡' },
            { label: 'Overdue', value: overdue, color: 'var(--color-danger)', icon: '⏰' },
          ].map((s) => (
            <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as any}>
              <div className="stat-icon" aria-hidden="true">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="filter-bar mb-6" role="search" aria-label="Filter tickets" style={{ flexWrap: 'wrap', gap: '0.5rem', display: 'flex' }}>
          <input className="search-input" type="search" placeholder="Search reference, subject, or student…"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            aria-label="Search tickets" />
          <select value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
            aria-label="Filter by category" className="input-field">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            aria-label="Filter by status" className="input-field">
            <option value="">All Statuses</option>
            {['NEW','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED','CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>From:</span>
            <input type="date" className="input-field" value={filters.fromDate} max={filters.toDate || today} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>To:</span>
            <input type="date" className="input-field" value={filters.toDate} min={filters.fromDate || undefined} max={today} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          </div>
          <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
          <button className="btn btn-secondary" onClick={() => {
            const clear = { status: '', search: '', categoryId: '', fromDate: '', toDate: '' }
            setFilters(clear); load(0, clear)
          }}>Clear</button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p className="empty-title">No tickets assigned</p>
              <p className="empty-desc">Your department has no tickets assigned at the moment.</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="Department tickets">
                  <thead>
                    <tr>
                      <th>Ref</th><th>Subject</th><th>Student</th>
                      <th>Status</th><th>Priority</th><th>Submitted</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td><code style={{ color:'var(--color-primary-400)', fontSize:'0.75rem' }}>{t.referenceNo}</code></td>
                        <td style={{ maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.subject}</td>
                        <td style={{ fontSize:'0.85rem' }}>{t.studentName}</td>
                        <td>
                          <StatusBadge status={t.status} />
                          {isOverdue(t) && <span style={{ marginLeft: 6 }}><OverdueBadge /></span>}
                        </td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td style={{ fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td><Link to={`/department/tickets/${t.id}`} className="btn btn-ghost btn-sm">Respond</Link></td>
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

export default DepartmentDashboard
