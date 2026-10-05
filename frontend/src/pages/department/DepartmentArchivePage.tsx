import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge } from '../../components/Badges'
import { departmentResponseApi } from '../../api/departmentResponseApi'

const DepartmentArchivePage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = async (p = 0, s = search) => {
    setLoading(true)
    try {
      const res = await departmentResponseApi.getDepartmentArchive({
        search: s || undefined,
        page: p,
        size: 15,
      })
      setTickets(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(0, search) }, [])

  const applySearch = () => { setPage(0); load(0, search) }

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">🗄 Resolved / Closed Archive</h1>
            <p className="page-subtitle">Tickets your department has previously resolved or closed — read-only history.</p>
          </div>
        </div>

        <div className="filter-bar mb-6" role="search" aria-label="Search archive" style={{ flexWrap: 'wrap', gap: '0.5rem', display: 'flex' }}>
          <input className="search-input" type="search" placeholder="Search reference, subject, or student…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            aria-label="Search archived tickets" />
          <button className="btn btn-primary" onClick={applySearch}>Apply</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); load(0, '') }}>Clear</button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗄</div>
              <p className="empty-title">No archived tickets</p>
              <p className="empty-desc">Resolved and closed tickets handled by your department will appear here.</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="Resolved and closed ticket archive">
                  <thead>
                    <tr>
                      <th>Ref</th><th>Subject</th><th>Student</th>
                      <th>Status</th><th>Priority</th><th>Resolved</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td><code style={{ color: 'var(--color-primary-400)', fontSize: '0.75rem' }}>{t.referenceNo}</code></td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</td>
                        <td style={{ fontSize: '0.85rem' }}>{t.studentName}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString() : '—'}
                        </td>
                        <td><Link to={`/department/tickets/${t.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => { setPage(p => p - 1); load(page - 1) }}>← Prev</button>
                  <span className="text-sm text-secondary">Page {page + 1} of {totalPages}</span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => { setPage(p => p + 1); load(page + 1) }}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default DepartmentArchivePage
