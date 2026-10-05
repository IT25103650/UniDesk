import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { notificationAdminApi } from '../../api/notificationApi'

const today = new Date().toISOString().split('T')[0]

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [actionFilter, setActionFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = async (p = 0, action = actionFilter, actor = actorFilter, from = dateFrom, to = dateTo) => {
    setLoading(true)
    try {
      const res = await notificationAdminApi.getAuditLog(p, 50, action || undefined, actor || undefined, from || undefined, to || undefined)
      setLogs(res.data.content || [])
      setTotalPages(res.data.totalPages || 0)
    } finally { setLoading(false) }
  }

  useEffect(() => { load(0) }, [])

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">📜 Audit Log</h1>
            <p className="page-subtitle">
              Immutable audit trail of all security-relevant actions.
              (IEEE 730 §7.4 — Records Maintenance)
            </p>
          </div>
        </div>

        <div className="filter-bar" role="search" aria-label="Search audit log" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <input type="search" className="search-input" placeholder="Filter by action (e.g. TICKET_CREATED)"
            value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(0)}
            aria-label="Filter audit log by action" />
          <input type="search" className="search-input" placeholder="Filter by user email"
            value={actorFilter} onChange={(e) => setActorFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(0)}
            aria-label="Filter audit log by user" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>From:</span>
            <input type="date" className="input-field" value={dateFrom} max={dateTo || today} onChange={(e) => setDateFrom(e.target.value)} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>To:</span>
            <input type="date" className="input-field" value={dateTo} min={dateFrom || undefined} max={today} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => load(0)}>Filter</button>
          <button className="btn btn-secondary" onClick={() => {
            setActionFilter(''); setActorFilter(''); setDateFrom(''); setDateTo('')
            load(0, '', '', '', '')
          }}>Clear</button>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><span className="spinner spinner-lg" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📜</div>
              <p className="empty-title">No audit records</p>
              <p className="empty-desc">No audit log entries match the current filter.</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="Audit log">
                  <thead>
                    <tr>
                      <th>Timestamp</th><th>Actor</th><th>Action</th>
                      <th>Entity</th><th>Details</th><th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize:'0.8rem', whiteSpace:'nowrap', color:'var(--color-text-muted)' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td style={{ fontSize:'0.85rem' }}>{log.actorEmail || log.actor?.email || '—'}</td>
                        <td>
                          <code style={{ fontSize:'0.75rem', padding:'0.2rem 0.5rem',
                            background:'var(--color-surface-2)', borderRadius:4,
                            color: log.action?.includes('CREATED') ? 'var(--color-success)'
                                  : log.action?.includes('DISABLED') ? 'var(--color-danger)'
                                  : 'var(--color-text-secondary)' }}>
                            {log.action}
                          </code>
                        </td>
                        <td style={{ fontSize:'0.8rem', color:'var(--color-text-muted)' }}>
                          {log.entityType} #{log.entityId}
                        </td>
                        <td style={{ fontSize:'0.8rem', color:'var(--color-text-secondary)', maxWidth:220,
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {log.detail}
                        </td>
                        <td style={{ fontSize:'0.8rem', color:'var(--color-text-muted)', fontFamily:'monospace' }}>
                          {log.ipAddress || '—'}
                        </td>
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

export default AuditLogPage
