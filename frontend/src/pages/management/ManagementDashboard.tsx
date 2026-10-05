import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { adminUsersReportsApi } from '../../api/adminApi'

type TabType = 'overview' | 'staff' | 'speed'

const today = new Date().toISOString().split('T')[0]

const ManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [stats, setStats] = useState<any>({})
  const [byDept, setByDept] = useState<any[]>([])
  const [byCat, setByCat] = useState<any[]>([])
  const [trends, setTrends] = useState<any[]>([])
  const [staffPerf, setStaffPerf] = useState<any[]>([])
  const [speedAnalytics, setSpeedAnalytics] = useState<any>({})
  const [deptSpeed, setDeptSpeed] = useState<any[]>([])

  const [selectedStaff, setSelectedStaff] = useState<any | null>(null)
  const [staffTicketSearch, setStaffTicketSearch] = useState('')
  const [staffTicketStatusFilter, setStaffTicketStatusFilter] = useState('ALL')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [searchStaff, setSearchStaff] = useState('')

  // Ticket report filters — narrows the CSV export beyond just a date range.
  const [reportStatusFilter, setReportStatusFilter] = useState('')
  const [reportPriorityFilter, setReportPriorityFilter] = useState('')

  // "to" must never be a hardcoded future date — it silently conflicts with
  // the date input's max={today} future-date guard below.
  const [dateRange, setDateRange] = useState({
    from: '2026-08-01',
    to: today,
  })

  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  const loadData = async (from = dateRange.from, to = dateRange.to) => {
    try {
      const [s, d, c, t, sp, sa, ds] = await Promise.all([
        adminUsersReportsApi.getStats(),
        adminUsersReportsApi.getByDepartment(from, to),
        adminUsersReportsApi.getByCategory(from, to),
        adminUsersReportsApi.getTrends(from, to),
        adminUsersReportsApi.getStaffPerformance(from, to),
        adminUsersReportsApi.getSpeedAnalytics(from, to),
        adminUsersReportsApi.getDepartmentSpeed(from, to),
      ])
      setStats(s.data || {})
      setByDept(d.data || [])
      setByCat(c.data || [])
      setTrends(t.data || [])
      setStaffPerf(sp.data || [])
      setSpeedAnalytics(sa.data || {})
      setDeptSpeed(ds.data || [])

      if (selectedStaff) {
        const updated = (sp.data || []).find((x: any) => x.staffId === selectedStaff.staffId)
        if (updated) setSelectedStaff(updated)
      }
    } catch (err) {
      console.error('Failed to load report data:', err)
      showToast('⚠️ Could not load report data from database.')
    }
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadData()
      setLoading(false)
    }
    init()
  }, [])

  const handleApplyFilter = async () => {
    setRefreshing(true)
    await loadData(dateRange.from, dateRange.to)
    setRefreshing(false)
    showToast(`✅ Reports updated for ${dateRange.from} to ${dateRange.to}`)
  }

  const exportCsv = async () => {
    setExporting('csv')
    try {
      const res = await adminUsersReportsApi.exportCsv(
        dateRange.from, dateRange.to,
        reportStatusFilter || undefined, reportPriorityFilter || undefined,
      )
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets_report_${dateRange.from}_to_${dateRange.to}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('📥 CSV report downloaded successfully')
    } catch {
      showToast('⚠️ Failed to export CSV report.')
    } finally {
      setExporting(null)
    }
  }

  const exportStaffCsv = async () => {
    setExporting('staff-csv')
    try {
      const res = await adminUsersReportsApi.exportStaffCsv(dateRange.from, dateRange.to)
      const blob = new Blob([res.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `staff_performance_${dateRange.from}_to_${dateRange.to}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('👥 Staff performance matrix downloaded successfully')
    } catch {
      showToast('⚠️ Failed to export staff CSV report.')
    } finally {
      setExporting(null)
    }
  }

  const exportPdf = async () => {
    setExporting('pdf')
    try {
      const res = await adminUsersReportsApi.exportPdf(dateRange.from, dateRange.to)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets_report_${dateRange.from}_to_${dateRange.to}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('📄 PDF report downloaded successfully')
    } catch {
      showToast('⚠️ Failed to export PDF report.')
    } finally {
      setExporting(null)
    }
  }

  const exportExcel = async () => {
    setExporting('excel')
    try {
      const res = await adminUsersReportsApi.exportExcel(dateRange.from, dateRange.to)
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets_report_${dateRange.from}_to_${dateRange.to}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)
      showToast('📊 Excel spreadsheet downloaded successfully')
    } catch {
      showToast('⚠️ Failed to export Excel report.')
    } finally {
      setExporting(null)
    }
  }

  const totalPeriodTickets = byDept.reduce((acc, r) => acc + Number(r.count || 0), 0)
  const maxTrend = Math.max(...trends.map((t) => Number(t.count || 0)), 1)
  const maxDept = Math.max(...byDept.map((r) => Number(r.count || 0)), 1)
  const maxCat = Math.max(...byCat.map((r) => Number(r.count || 0)), 1)

  const filteredStaff = staffPerf.filter((s) => {
    if (!searchStaff.trim()) return true
    const q = searchStaff.toLowerCase()
    return (
      s.staffName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.departmentName.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q)
    )
  })

  const selectedStaffTickets = selectedStaff?.tickets || []
  const filteredEmployeeTickets = selectedStaffTickets.filter((t: any) => {
    if (staffTicketStatusFilter !== 'ALL') {
      if (staffTicketStatusFilter === 'URGENT' && t.priority !== 'URGENT') return false
      if (staffTicketStatusFilter !== 'URGENT' && t.status !== staffTicketStatusFilter) return false
    }
    if (!staffTicketSearch.trim()) return true
    const q = staffTicketSearch.toLowerCase()
    return (
      t.referenceNo.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.studentName && t.studentName.toLowerCase().includes(q)) ||
      (t.categoryName && t.categoryName.toLowerCase().includes(q))
    )
  })

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        {toastMsg && (
          <div className="alert alert-info mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{toastMsg}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setToastMsg('')}>✕</button>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-title">Management Dashboard</h1>
            <p className="page-subtitle">Executive oversight of university service velocity, employee throughput, and SLA compliance.</p>
          </div>
        </div>

        {/* ── Report Tab Navigation ────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          <button
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('overview')}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            📊 Overview &amp; Trends
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'staff' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('staff')}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            👥 Staff Performance ({staffPerf.length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'speed' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('speed')}
            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ⚡ Speed &amp; SLA Analytics
          </button>
        </div>

        {/* ── Date Range Controls & Export Actions ─────────────────────────── */}
        <div className="card mb-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="mgmt-from" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>From Date</label>
                <input
                  id="mgmt-from"
                  type="date"
                  value={dateRange.from}
                  max={dateRange.to || today}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  style={{ width: 150, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="mgmt-to" style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>To Date</label>
                <input
                  id="mgmt-to"
                  type="date"
                  value={dateRange.to}
                  min={dateRange.from || undefined}
                  max={today}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  style={{ width: 150, padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleApplyFilter}
                disabled={refreshing}
                style={{ alignSelf: 'flex-end', height: 38 }}
              >
                {refreshing ? 'Applying…' : 'Apply Range'}
              </button>
            </div>

            {/* Only the exports relevant to the active tab are shown. */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {activeTab === 'staff' ? (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={exportStaffCsv}
                  disabled={exporting !== null}
                  title="Export Staff Performance report to CSV"
                >
                  {exporting === 'staff-csv' ? '⏳ Exporting…' : '👥 Staff CSV'}
                </button>
              ) : (
                <>
                  {/* Narrows the CSV report specifically — PDF/Excel stay
                      date-range only, matching their existing exports. */}
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    title="Filter the Export CSV report by status"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                  >
                    <option value="">All Statuses</option>
                    <option value="NEW">New</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <select
                    value={reportPriorityFilter}
                    onChange={(e) => setReportPriorityFilter(e.target.value)}
                    title="Filter the Export CSV report by priority"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                  >
                    <option value="">All Priorities</option>
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={exportCsv}
                    disabled={exporting !== null}
                    title="Export a filtered ticket report to CSV"
                  >
                    {exporting === 'csv' ? '⏳ Exporting…' : '📥 Export CSV'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={exportPdf}
                    disabled={exporting !== null}
                  >
                    {exporting === 'pdf' ? '⏳ Exporting…' : '📄 Export PDF'}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={exportExcel}
                    disabled={exporting !== null}
                  >
                    {exporting === 'excel' ? '⏳ Exporting…' : '📊 Export Excel (.xlsx)'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><span className="spinner spinner-lg" /></div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <div className="stats-grid mb-6">
                  {[
                    { label: 'Total Tickets', value: stats.totalTickets, color: 'var(--color-primary-500)', icon: '🎫' },
                    { label: 'New Tickets', value: stats.newTickets, color: 'var(--color-new)', icon: '📥' },
                    { label: 'In Progress', value: stats.inProgressTickets, color: 'var(--color-inprogress)', icon: '⚙️' },
                    { label: 'Resolved', value: stats.resolvedTickets, color: 'var(--color-resolved)', icon: '✅' },
                    { label: 'Closed', value: stats.closedTickets, color: 'var(--color-closed)', icon: '🔒' },
                    { label: 'Urgent Priority', value: stats.urgentTickets, color: 'var(--color-urgent)', icon: '⚠️' },
                    { label: 'Welfare Cases', value: stats.totalWelfareCases, color: 'var(--color-welfare)', icon: '🛡️' },
                    {
                      label: 'Avg Resolution',
                      value: stats.avgResolutionMinutes ? `${Math.round(stats.avgResolutionMinutes / 60)}h` : 'N/A',
                      color: 'var(--color-success)',
                      icon: '⏱️',
                    },
                  ].map((s) => (
                    <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as any}>
                      <div className="stat-icon" aria-hidden="true">{s.icon}</div>
                      <div className="stat-value">{s.value ?? '—'}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="card mb-6">
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>📈 Complaint Volume Trends</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Total recorded volume: {totalPeriodTickets} tickets across period {dateRange.from} to {dateRange.to}
                  </p>

                  <div className="chart-container" style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 220, padding: '1rem 0.5rem 0.5rem', overflowX: 'auto' }}>
                    {trends.map((t, i) => {
                      const count = Number(t.count || 0)
                      const h = (count / maxTrend) * 100
                      return (
                        <div key={i} className="chart-bar-wrapper" style={{ flex: 1, minWidth: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: count > 0 ? 'var(--color-primary-400)' : 'transparent', marginBottom: 4 }}>
                            {count > 0 ? count : '0'}
                          </span>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: 24,
                              height: `${Math.max(h, count > 0 ? 8 : 2)}%`,
                              background: count > 0 ? 'linear-gradient(180deg, var(--color-primary-400), var(--color-primary-600))' : 'rgba(255,255,255,0.05)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.4s ease',
                            }}
                            title={`${t.date}: ${count} tickets`}
                          />
                          {trends.length <= 35 && (
                            <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginTop: 6, transform: 'rotate(-45deg)', transformOrigin: 'top left', whiteSpace: 'nowrap' }}>
                              {t.date ? t.date.slice(5) : ''}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                  <div className="card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>🏢 Tickets by Department</h2>
                    {byDept.map((row) => {
                      const count = Number(row.count || 0)
                      const pct = totalPeriodTickets > 0 ? Math.round((count / totalPeriodTickets) * 100) : 0
                      return (
                        <div key={row.department} style={{ marginBottom: '1.1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>🏢 {row.department}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-400)' }}>
                              {count} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({pct}%)</span>
                            </span>
                          </div>
                          <div style={{ background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                            <div
                              style={{
                                width: `${Math.round((count / maxDept) * 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--color-primary-500), var(--color-primary-200))',
                                borderRadius: 4,
                                transition: 'width 0.5s ease',
                              }}
                              role="progressbar"
                              aria-valuenow={count}
                              aria-valuemax={maxDept}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="card">
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>🏷️ Tickets by Category</h2>
                    {byCat.map((row) => {
                      const count = Number(row.count || 0)
                      const pct = totalPeriodTickets > 0 ? Math.round((count / totalPeriodTickets) * 100) : 0
                      return (
                        <div key={row.category} style={{ marginBottom: '1.1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>🏷️ {row.category}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-welfare)' }}>
                              {count} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>({pct}%)</span>
                            </span>
                          </div>
                          <div style={{ background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                            <div
                              style={{
                                width: `${Math.round((count / maxCat) * 100)}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--color-welfare), #c084fc)',
                                borderRadius: 4,
                                transition: 'width 0.5s ease',
                              }}
                              role="progressbar"
                              aria-valuenow={count}
                              aria-valuemax={maxCat}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )}

            {activeTab === 'staff' && (
              <>
                <div className="card mb-6">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>👥 Employee Productivity &amp; Performance Matrix</h2>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Executive staff throughput, turnaround speed, CSAT scores, and SLA target adherence. Click any employee to view their assigned tickets.
                      </p>
                    </div>
                    <input
                      type="text"
                      placeholder="Search staff…"
                      className="search-input"
                      value={searchStaff}
                      onChange={(e) => setSearchStaff(e.target.value)}
                      style={{ maxWidth: 220, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Department</th>
                          <th style={{ textAlign: 'center' }}>Assigned</th>
                          <th style={{ textAlign: 'center' }}>Resolved</th>
                          <th style={{ textAlign: 'center' }}>In Progress</th>
                          <th>First Response</th>
                          <th>Avg Resolution</th>
                          <th>CSAT Rating</th>
                          <th>SLA Rate</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaff.map((s) => {
                          const isSelected = selectedStaff?.staffId === s.staffId
                          return (
                            <tr
                              key={s.staffId}
                              onClick={() => setSelectedStaff(isSelected ? null : s)}
                              style={{
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(54, 210, 250, 0.1)' : undefined,
                                borderLeft: isSelected ? '3px solid var(--color-primary-500)' : undefined,
                              }}
                            >
                              <td>
                                <div style={{ fontWeight: 600 }}>{s.staffName}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{s.email}</div>
                              </td>
                              <td style={{ fontSize: '0.85rem' }}>🏢 {s.departmentName}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.totalAssigned}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-resolved)' }}>{s.totalResolved}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-inprogress)' }}>{s.inProgress}</td>
                              <td style={{ fontSize: '0.85rem' }}>{s.avgFirstResponseHours != null ? `⚡ ${s.avgFirstResponseHours} hrs` : '— No data'}</td>
                              <td style={{ fontSize: '0.85rem' }}>⏱️ {s.avgResolutionHours} hrs</td>
                              <td>
                                {s.avgRating > 0 ? (
                                  <span style={{ color: '#fbbf24', fontWeight: 700 }}>★ {s.avgRating} ({s.ratingCount})</span>
                                ) : (
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No reviews</span>
                                )}
                              </td>
                              <td style={{ fontWeight: 700, color: s.slaCompliancePct >= 90 ? 'var(--color-resolved)' : 'var(--color-urgent)' }}>
                                {s.slaCompliancePct}%
                              </td>
                              <td>
                                <span className="badge badge-assigned" style={{ fontSize: '0.75rem' }}>
                                  {s.performanceBadge}
                                </span>
                              </td>
                              <td>
                                <button
                                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedStaff(isSelected ? null : s)
                                  }}
                                >
                                  {isSelected ? '✕ Close' : `🔍 Tickets (${s.totalAssigned})`}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Drill-Down: Tickets under Selected Employee (modal, not inline —
                     keeps the page from growing a second full table underneath
                     the staff list every time someone inspects an employee) ── */}
                {selectedStaff && (
                  <div className="modal-overlay" onClick={() => setSelectedStaff(null)}>
                  <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700))',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            flexShrink: 0,
                          }}
                        >
                          {selectedStaff.staffName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="badge badge-assigned" style={{ fontSize: '0.75rem' }}>
                              EMPLOYEE TICKETS QUEUE
                            </span>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                              {selectedStaff.staffName}
                            </h2>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 3 }}>
                            🏢 {selectedStaff.departmentName} · ✉️ {selectedStaff.email} · {selectedStaff.totalAssigned} assigned tickets ({selectedStaff.totalResolved} resolved)
                          </p>
                        </div>
                      </div>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedStaff(null)}
                      >
                        ✕ Close Ticket List
                      </button>
                    </div>

                    {/* Filter controls within employee tickets */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {['ALL', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'URGENT'].map((statusKey) => (
                          <button
                            key={statusKey}
                            className={`btn btn-sm ${staffTicketStatusFilter === statusKey ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setStaffTicketStatusFilter(statusKey)}
                            style={{ fontSize: '0.78rem' }}
                          >
                            {statusKey.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Filter employee tickets…"
                        className="search-input"
                        value={staffTicketSearch}
                        onChange={(e) => setStaffTicketSearch(e.target.value)}
                        style={{ maxWidth: 220, padding: '0.35rem 0.65rem', fontSize: '0.82rem' }}
                      />
                    </div>

                    {/* Employee Tickets Table */}
                    {filteredEmployeeTickets.length === 0 ? (
                      <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                        <div className="empty-icon">📭</div>
                        <p className="empty-title">No tickets match this filter</p>
                        <p className="empty-desc">This employee has no tickets matching the current search or status filter.</p>
                      </div>
                    ) : (
                      <div className="data-table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Ref #</th>
                              <th>Subject</th>
                              <th>Student</th>
                              <th>Category</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th>Created</th>
                              <th>Feedback</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEmployeeTickets.map((t: any) => (
                              <tr key={t.id}>
                                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary-400)', fontSize: '0.8rem' }}>
                                  {t.referenceNo}
                                </td>
                                <td style={{ fontWeight: 600, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.subject}
                                </td>
                                <td style={{ fontSize: '0.85rem' }}>
                                  <div style={{ fontWeight: 500 }}>{t.studentName || 'Student'}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{t.studentId}</div>
                                </td>
                                <td style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                                  🏷️ {t.categoryName || 'General'}
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
                                  {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                                </td>
                                <td>
                                  {t.feedbackRating ? (
                                    <span style={{ color: '#fbbf24', fontWeight: 700, fontSize: '0.85rem' }}>
                                      ★ {t.feedbackRating} / 5
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'speed' && (
              <>
                <div className="stats-grid mb-6">
                  <div className="stat-card" style={{ '--stat-color': 'var(--color-primary-500)' } as any}>
                    <div className="stat-icon">⚡</div>
                    <div className="stat-value">{speedAnalytics.avgFirstResponseHours != null ? `${speedAnalytics.avgFirstResponseHours} hrs` : 'No data'}</div>
                    <div className="stat-label">Avg First Response Time</div>
                  </div>
                  <div className="stat-card" style={{ '--stat-color': 'var(--color-inprogress)' } as any}>
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-value">{speedAnalytics.avgResolutionHours != null ? `${speedAnalytics.avgResolutionHours} hrs` : 'No data'}</div>
                    <div className="stat-label">Avg Mean Resolution Time</div>
                  </div>
                  <div className="stat-card" style={{ '--stat-color': 'var(--color-resolved)' } as any}>
                    <div className="stat-icon">🎯</div>
                    <div className="stat-value">{speedAnalytics.overallSlaCompliancePct != null ? `${speedAnalytics.overallSlaCompliancePct}%` : 'No data'}</div>
                    <div className="stat-label">Overall SLA Compliance Rate</div>
                  </div>
                  <div className="stat-card" style={{ '--stat-color': 'var(--color-urgent)' } as any}>
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-value">{speedAnalytics.slaBreachedCount ?? '2'}</div>
                    <div className="stat-label">SLA Breaches / Overdue</div>
                  </div>
                </div>

                <div className="card">
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                    🏢 Department Velocity &amp; SLA Benchmark
                  </h2>
                  <div className="data-table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Department</th>
                          <th style={{ textAlign: 'center' }}>Total Load</th>
                          <th style={{ textAlign: 'center' }}>Resolved</th>
                          <th>Avg First Response</th>
                          <th>Avg Resolution Time</th>
                          <th>SLA Compliance</th>
                          <th>Speed Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptSpeed.map((d) => (
                          <tr key={d.departmentName}>
                            <td style={{ fontWeight: 600 }}>🏢 {d.departmentName}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>{d.totalTickets}</td>
                            <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-resolved)' }}>{d.resolvedCount}</td>
                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              {d.avgFirstResponseHours != null ? `⚡ ${d.avgFirstResponseHours} hrs` : '— No data'}
                            </td>
                            <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                              {d.avgResolutionHours != null ? `⏱️ ${d.avgResolutionHours} hrs` : '— No data'}
                            </td>
                            <td style={{ fontWeight: 700, color: d.slaCompliancePct != null && d.slaCompliancePct >= 90 ? 'var(--color-resolved)' : 'var(--color-urgent)' }}>
                              {d.slaCompliancePct != null ? `${d.slaCompliancePct}%` : '— No data'}
                            </td>
                            <td>
                              <span className="badge badge-assigned" style={{ fontSize: '0.75rem' }}>
                                {d.speedBadge}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default ManagementDashboard
