import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge } from '../../components/Badges'
import { ticketSubmissionApi } from '../../api/ticketSubmissionApi'

const MyTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const load = async (p: number, s: string) => {
    setLoading(true)
    try {
      const res = await ticketSubmissionApi.getMyTickets(p, 10, s || undefined)
      setTickets(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(page, statusFilter) }, [page, statusFilter])

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Tickets</h1>
            <p className="page-subtitle">Track all your submitted support requests.</p>
          </div>
          <Link to="/student/tickets/new" className="btn btn-primary">➕ New Ticket</Link>
        </div>

        <div className="filter-bar mb-4" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
            className="input-field" 
            style={{ width: 200 }}
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Withdrawn</option>
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎫</div>
              <p className="empty-title">No tickets found</p>
              <p className="empty-desc">You haven't submitted any tickets yet.</p>
              <Link to="/student/tickets/new" className="btn btn-primary mt-4">Submit your first ticket</Link>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="My tickets">
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Category</th>
                      <th scope="col">Status</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Submitted</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td><code style={{ color: 'var(--color-primary-400)', fontSize: '0.8rem' }}>{t.referenceNo}</code></td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.subject}
                        </td>
                        <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>{t.categoryName}</td>
                        <td><StatusBadge status={t.status} /></td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td><Link to={`/student/tickets/${t.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination" aria-label="Pagination">
                  <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    ← Prev
                  </button>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    Page {page + 1} of {totalPages}
                  </span>
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default MyTicketsPage
