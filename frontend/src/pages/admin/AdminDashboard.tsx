import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { adminUsersReportsApi } from '../../api/adminApi'
import { triageApi } from '../../api/triageApi'

type MetricKey =
  | 'TOTAL_TICKETS'
  | 'NEW'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'URGENT'
  | 'USERS'
  | null

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<any>({})
  const [byDept, setByDept] = useState<any[]>([])
  const [byCat, setByCat] = useState<any[]>([])
  const [byStatus, setByStatus] = useState<any>({})
  const [loading, setLoading] = useState(true)

  // Drill-down details state
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('TOTAL_TICKETS')
  const [drillDownData, setDrillDownData] = useState<any[]>([])
  const [drillDownLoading, setDrillDownLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const loadStats = async () => {
    setLoading(true)
    try {
      const [s, d, c, ov] = await Promise.all([
        adminUsersReportsApi.getStats(),
        adminUsersReportsApi.getByDepartment(),
        adminUsersReportsApi.getByCategory(),
        adminUsersReportsApi.getOpenVsResolved(),
      ])
      setStats(s.data || {})
      setByDept(d.data || [])
      setByCat(c.data || [])
      setByStatus(ov.data || {})
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Fetch drill-down records when metric changes
  useEffect(() => {
    if (!selectedMetric) {
      setDrillDownData([])
      return
    }

    const fetchDrillDown = async () => {
      setDrillDownLoading(true)
      try {
        if (selectedMetric === 'TOTAL_TICKETS') {
          const res = await triageApi.getAll({ page: 0, size: 50 })
          setDrillDownData(res.data?.content || res.data || [])
        } else if (selectedMetric === 'NEW') {
          const res = await triageApi.getAll({ status: 'NEW', page: 0, size: 50 })
          setDrillDownData(res.data?.content || res.data || [])
        } else if (selectedMetric === 'IN_PROGRESS') {
          const res = await triageApi.getAll({ status: 'IN_PROGRESS', page: 0, size: 50 })
          setDrillDownData(res.data?.content || res.data || [])
        } else if (selectedMetric === 'RESOLVED') {
          const res = await triageApi.getAll({ status: 'RESOLVED', page: 0, size: 50 })
          setDrillDownData(res.data?.content || res.data || [])
        } else if (selectedMetric === 'CLOSED') {
          const res = await triageApi.getAll({ status: 'CLOSED', page: 0, size: 50 })
          setDrillDownData(res.data?.content || res.data || [])
        } else if (selectedMetric === 'URGENT') {
          const res = await triageApi.getAll({ priority: 'URGENT', page: 0, size: 50 })
          setDrillDownData(res.data?.content || res.data || [])
        } else if (selectedMetric === 'USERS') {
          const res = await adminUsersReportsApi.getUsers(0, 50)
          setDrillDownData(res.data?.content || res.data || [])
        }
      } catch {
        setDrillDownData([])
      } finally {
        setDrillDownLoading(false)
      }
    }

    fetchDrillDown()
  }, [selectedMetric])

  const statCards: {
    key: MetricKey
    label: string
    value: any
    color: string
    icon: string
    sublabel?: string
  }[] = [
    { key: 'TOTAL_TICKETS', label: 'Total Tickets', value: stats.totalTickets, color: 'var(--color-primary-500)', icon: '🎫', sublabel: 'Click to view all' },
    { key: 'NEW', label: 'New', value: stats.newTickets, color: 'var(--color-new)', icon: '📥', sublabel: 'Pending triage' },
    { key: 'IN_PROGRESS', label: 'In Progress', value: stats.inProgressTickets, color: 'var(--color-inprogress)', icon: '⚙️', sublabel: 'Active resolution' },
    { key: 'RESOLVED', label: 'Resolved', value: stats.resolvedTickets, color: 'var(--color-resolved)', icon: '✅', sublabel: 'Completed' },
    { key: 'CLOSED', label: 'Closed', value: stats.closedTickets, color: 'var(--color-closed)', icon: '🔒', sublabel: 'Archived' },
    { key: 'URGENT', label: 'Urgent', value: stats.urgentTickets, color: 'var(--color-urgent)', icon: '🔴', sublabel: 'High priority' },
    { key: 'USERS', label: 'Total Users', value: stats.totalUsers, color: 'var(--color-primary-400)', icon: '👥', sublabel: 'Students & Staff' },
  ]

  const getMetricTitle = () => {
    switch (selectedMetric) {
      case 'TOTAL_TICKETS': return 'All Tickets'
      case 'NEW': return 'New Tickets (Pending Triage)'
      case 'IN_PROGRESS': return 'Tickets In Progress'
      case 'RESOLVED': return 'Resolved Tickets'
      case 'CLOSED': return 'Closed Tickets'
      case 'URGENT': return 'Urgent Priority Tickets'
      case 'USERS': return 'Registered System Users'
      default: return 'Details'
    }
  }

  // Filter drill down data locally by search query
  const filteredData = drillDownData.filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      (item.referenceNo && item.referenceNo.toLowerCase().includes(q)) ||
      (item.subject && item.subject.toLowerCase().includes(q)) ||
      (item.fullName && item.fullName.toLowerCase().includes(q)) ||
      (item.email && item.email.toLowerCase().includes(q)) ||
      (item.studentName && item.studentName.toLowerCase().includes(q)) ||
      (item.student?.fullName && item.student.fullName.toLowerCase().includes(q)) ||
      (item.departmentName && item.departmentName.toLowerCase().includes(q)) ||
      (item.department?.name && item.department.name.toLowerCase().includes(q)) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(q)) ||
      (item.category?.name && item.category.name.toLowerCase().includes(q)) ||
      (item.role && item.role.toLowerCase().includes(q))
    )
  })

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Real-time system overview, ticket queues, and student welfare monitoring.</p>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-secondary" onClick={loadStats} title="Reload fresh data from database">
              🔄 Refresh Data
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/admin/reports')}>
              📊 Reports &amp; Exports
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/admin/tickets')}>
              Ticket Inbox &rarr;
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><span className="spinner spinner-lg" /></div>
        ) : (
          <>
            {/* ── Interactive Stats Grid ────────────────────────────────────────── */}
            <div className="stats-grid">
              {statCards.map((s) => {
                const isSelected = selectedMetric === s.key
                return (
                  <div
                    key={s.label}
                    className={`stat-card ${isSelected ? 'active-stat-card' : ''}`}
                    onClick={() => setSelectedMetric(s.key)}
                    style={{
                      '--stat-color': s.color,
                      cursor: 'pointer',
                      transform: isSelected ? 'translateY(-4px)' : undefined,
                      borderColor: isSelected ? s.color : undefined,
                      boxShadow: isSelected ? `0 8px 24px rgba(0,0,0,0.5), 0 0 0 2px ${s.color}` : undefined,
                    } as any}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedMetric(s.key)}
                    title={`Click to view details for ${s.label}`}
                  >
                    <div className="stat-icon" aria-hidden="true">{s.icon}</div>
                    <div className="stat-value">{s.value ?? '0'}</div>
                    <div className="stat-label">{s.label}</div>
                    <div style={{ fontSize: '0.72rem', color: isSelected ? s.color : 'var(--color-text-muted)', marginTop: 4, fontWeight: isSelected ? 700 : 500 }}>
                      {isSelected ? '● Active View' : s.sublabel}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Dynamic Drill-Down Details Table ─────────────────────────────── */}
            {selectedMetric && (
              <div className="card mt-6" style={{ border: '1px solid var(--color-primary-500)', boxShadow: 'var(--shadow-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="badge badge-assigned" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }}>
                        LIVE DRILL-DOWN
                      </span>
                      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                        {getMetricTitle()}
                      </h2>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Showing {filteredData.length} records matching current selection. Click any record to inspect full conversation & actions.
                    </p>
                  </div>

                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search within these records…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ maxWidth: 240, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    />
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelectedMetric(null)}
                      title="Hide drill-down view"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {drillDownLoading ? (
                  <div className="loading-screen" style={{ minHeight: 180 }}>
                    <span className="spinner" />
                  </div>
                ) : filteredData.length === 0 ? (
                  <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
                    <div className="empty-icon">📭</div>
                    <p className="empty-title">No matching records found</p>
                    <p className="empty-desc">There are currently no records for this status or search filter.</p>
                  </div>
                ) : (
                  <div className="data-table-wrapper">
                    <table className="data-table" aria-label="Drill down details">
                      {/* Ticket Table */}
                      {selectedMetric !== 'USERS' && (
                        <>
                          <thead>
                            <tr>
                              <th>Ref #</th>
                              <th>Subject</th>
                              <th>Student</th>
                              <th>Department</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Created</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.map((t) => (
                              <tr
                                key={t.id}
                                onClick={() => navigate(`/helpdesk/tickets/${t.id}`)}
                                style={{ cursor: 'pointer' }}
                                title={`Click to open ticket ${t.referenceNo}`}
                              >
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary-400)', fontSize: '0.8rem' }}>
                                  {t.referenceNo}
                                </td>
                                <td style={{ fontWeight: 600, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.subject}
                                </td>
                                <td style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                  {t.studentName || t.student?.fullName || '—'}
                                </td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
                                  {(t.departmentName || t.department?.name) ? (
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      🏢 {t.departmentName || t.department.name}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-text-muted)' }}>Unassigned</span>
                                  )}
                                </td>
                                <td>
                                  <span className={`badge badge-${t.priority ? t.priority.toLowerCase() : 'normal'}`}>
                                    {t.priority || 'NORMAL'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`badge badge-${t.status ? t.status.toLowerCase() : 'new'}`}>
                                    {t.status}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/helpdesk/tickets/${t.id}`)
                                    }}
                                  >
                                    Inspect &rarr;
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}

                      {/* Users Table */}
                      {selectedMetric === 'USERS' && (
                        <>
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Full Name</th>
                              <th>Email</th>
                              <th>Role</th>
                              <th>Student / Staff ID</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredData.map((u) => (
                              <tr
                                key={u.id}
                                onClick={() => navigate('/admin/users')}
                                style={{ cursor: 'pointer' }}
                                title="Click to open user management"
                              >
                                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{u.id}</td>
                                <td style={{ fontWeight: 600 }}>{u.fullName}</td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                                <td>
                                  <span className="badge badge-assigned">{u.role}</span>
                                </td>
                                <td style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                                  {u.studentId || '—'}
                                </td>
                                <td>
                                  <span className={`badge ${u.active ? 'badge-success' : 'badge-closed'}`}>
                                    {u.active ? 'Active' : 'Disabled'}
                                  </span>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate('/admin/users')
                                    }}
                                  >
                                    Manage &rarr;
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </>
                      )}
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tickets by Department ─────────────────────────────────────── */}
            <div className="card mt-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>📊 Tickets by Department</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Distribution across academic & operational units</span>
              </div>
              {byDept.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No department data available.</p>
              ) : (
                <div>
                  {byDept.map((row) => {
                    const max = Math.max(...byDept.map((r) => Number(r.count)))
                    const pct = Math.round((Number(row.count) / (max || 1)) * 100)
                    return (
                      <div key={row.department} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.department}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary-400)' }}>
                            {row.count} tickets
                          </span>
                        </div>
                        <div style={{ background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, var(--color-primary-600), var(--color-primary-400))',
                              borderRadius: 4,
                              transition: 'width 0.5s ease',
                            }}
                            role="progressbar"
                            aria-valuenow={Number(row.count)}
                            aria-valuemax={max}
                            aria-label={row.department}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Tickets by Category ───────────────────────────────────────── */}
            <div className="card mt-6">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>🏷️ Tickets by Category</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Top student inquiries and support classifications</span>
              </div>
              {byCat.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No category data available.</p>
              ) : (
                <div>
                  {byCat.map((row) => {
                    const max = Math.max(...byCat.map((r) => Number(r.count)))
                    const pct = Math.round((Number(row.count) / (max || 1)) * 100)
                    return (
                      <div key={row.category} style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.category}</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-inprogress)' }}>
                            {row.count} tickets
                          </span>
                        </div>
                        <div style={{ background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                              borderRadius: 4,
                              transition: 'width 0.5s ease',
                            }}
                            role="progressbar"
                            aria-valuenow={Number(row.count)}
                            aria-valuemax={max}
                            aria-label={row.category}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Open vs Resolved Resolution Velocity ──────────────────────── */}
            <div className="card mt-6">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>📈 Ticket Resolution Velocity</h2>
              <div className="stats-grid">
                {[
                  { label: 'Active Open / In Progress', value: byStatus.open, color: 'var(--color-warning)', icon: '⏳' },
                  { label: 'Successfully Resolved', value: byStatus.resolved, color: 'var(--color-success)', icon: '✅' },
                  { label: 'Closed / Archived', value: byStatus.closed, color: 'var(--color-text-muted)', icon: '🔒' },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: '1.25rem',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: `4px solid ${s.color}`,
                    }}
                  >
                    <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{s.value ?? '—'}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default AdminDashboard
