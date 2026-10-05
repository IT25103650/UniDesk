import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge } from '../../components/Badges'
import { welfareApi } from '../../api/welfareApi'

const WelfareDashboard: React.FC = () => {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', isUrgent: '' })
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const load = async (p = 0, f = filters) => {
    setLoading(true)
    try {
      const res = await welfareApi.getAll({
        status: f.status || undefined,
        isUrgent: f.isUrgent === 'true' ? true : f.isUrgent === 'false' ? false : undefined,
        page: p, size: 15
      })
      setCases(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(0, filters) }, [])

  const urgent = cases.filter((c) => c.urgent).length
  const open = cases.filter((c) => !['RESOLVED','CLOSED'].includes(c.status)).length

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">🛡 Welfare Case Inbox</h1>
            <p className="page-subtitle">Manage private welfare cases — accessible only to Welfare Officers and Admins.</p>
          </div>
        </div>

        <div className="stats-grid mb-6">
          {[
            { label: 'Total Cases', value: cases.length, color: 'var(--color-welfare)', icon: '🛡' },
            { label: 'Open', value: open, color: 'var(--color-warning)', icon: '🟡' },
            { label: 'Urgent', value: urgent, color: 'var(--color-urgent)', icon: '🔴' },
          ].map((s) => (
            <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as any}>
              <div className="stat-icon" aria-hidden="true">{s.icon}</div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="filter-bar" role="search">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status">
            <option value="">All Statuses</option>
            {['NEW','IN_PROGRESS','RESOLVED','CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filters.isUrgent} onChange={(e) => setFilters({ ...filters, isUrgent: e.target.value })} aria-label="Filter by urgency">
            <option value="">All Cases</option>
            <option value="true">Urgent Only</option>
            <option value="false">Non-Urgent</option>
          </select>
          <button className="btn btn-primary" onClick={() => { setPage(0); load(0, filters) }}>Apply</button>
          <button className="btn btn-secondary" onClick={() => { setFilters({ status:'', isUrgent:'' }); load(0, { status:'', isUrgent:'' }) }}>Clear</button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🛡</div>
              <p className="empty-title">No welfare cases</p>
              <p className="empty-desc">No welfare cases match the current filters.</p>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="Welfare cases inbox">
                <thead>
                  <tr>
                    <th>Ref</th><th>Subject</th><th>Student</th>
                    <th>Status</th><th>Urgent</th><th>Assigned To</th><th>Date</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td><code style={{ color:'var(--color-welfare)', fontSize:'0.75rem' }}>{c.referenceNo}</code></td>
                      <td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.subject}</td>
                      <td style={{ fontSize:'0.85rem' }}>{c.studentName}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>{c.urgent ? <span className="badge badge-urgent">🔴 URGENT</span> : '—'}</td>
                      <td style={{ fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{c.assignedToName || 'Unassigned'}</td>
                      <td style={{ fontSize:'0.8rem', color:'var(--color-text-muted)' }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td><Link to={`/welfare/cases/${c.id}`} className="btn btn-ghost btn-sm">Manage</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default WelfareDashboard
