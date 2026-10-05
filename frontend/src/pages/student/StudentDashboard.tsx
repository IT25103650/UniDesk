import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { StatusBadge, PriorityBadge, DraftBadge } from '../../components/Badges'
import { announcementApi, notifApi } from '../../api/notificationApi'
import { ticketSubmissionApi } from '../../api/ticketSubmissionApi'
import { welfareApi } from '../../api/welfareApi'
import { useAuth } from '../../context/AuthContext'

interface Notification {
  id: number
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

/** Returns distinct icon + accent colour per notification title keyword. */
const getNotifStyle = (title: string): { icon: string; accent: string } => {
  const t = title.toLowerCase()
  if (t.includes('resolved'))             return { icon: '✅', accent: '#22c55e' }
  if (t.includes('closed'))               return { icon: '🔒', accent: '#64748b' }
  if (t.includes('forwarded'))            return { icon: '🔀', accent: '#0891b2' }
  if (t.includes('escalated'))            return { icon: '🚨', accent: '#ef4444' }
  if (t.includes('overdue'))              return { icon: '⏱️', accent: '#f59e0b' }
  if (t.includes('reply') || t.includes('comment')) return { icon: '💬', accent: '#3b82f6' }
  if (t.includes('welfare'))             return { icon: '🛡️', accent: '#a855f7' }
  if (t.includes('assigned'))            return { icon: '📋', accent: '#0ea5e9' }
  if (t.includes('announcement'))        return { icon: '📢', accent: '#f97316' }
  if (t.includes('status'))             return { icon: '🔄', accent: '#14b8a6' }
  return { icon: '🔔', accent: 'var(--color-primary-500)' }
}

const formatRelative = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}h ago`
    const diffDays = Math.floor(diffHr / 24)
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch { return '' }
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets]             = useState<any[]>([])
  const [welfare, setWelfare]             = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    Promise.all([
      ticketSubmissionApi.getMyTickets(0, 5),
      welfareApi.getMyCases(0, 3),
      announcementApi.getActive(),
      notifApi.getAll(),
    ]).then(([t, w, a, n]) => {
      setTickets(t.data.content || [])
      setWelfare(w.data.content || [])
      // Deduplicate announcements (title+body)
      const rawA: any[] = a.data || []
      const seenA = new Set<string>()
      const dedupedA = rawA.filter((ann) => {
        const key = `${ann.title}|${ann.body}`
        if (seenA.has(key)) return false
        seenA.add(key)
        return true
      })
      setAnnouncements(dedupedA)
      // Client-side dedup: belt-and-suspenders over the backend 4-hour window
      const raw: Notification[] = n.data || []
      const seen = new Set<string>()
      const deduped = raw.filter((notif) => {
        const key = `${notif.title}|${notif.link ?? notif.message}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setNotifications(deduped.slice(0, 6))
    }).finally(() => setLoading(false))
  }, [])

  const handleNotifClick = (n: Notification) => {
    if (!n.link) return
    let target = n.link.trim()
    const tm = target.match(/\/tickets\/(\d+)/i) || target.match(/^tickets\/(\d+)/i)
    if (tm) { navigate(`/student/tickets/${tm[1]}`); return }
    const wm = target.match(/\/welfare\/(\d+)/i)
    if (wm) { navigate(`/student/welfare/${wm[1]}`); return }
    navigate(target)
  }

  const open        = tickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length
  const resolved    = tickets.filter((t) => t.status === 'RESOLVED').length
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome, {user?.fullName.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's an overview of your support requests.</p>
          </div>
          <Link to="/student/tickets/new" className="btn btn-primary">
            ➕ New Ticket
          </Link>
        </div>

        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="announcements-container mb-6">
            {announcements.map((a) => (
              <div key={a.id} className="announcement-banner">
                <div className="announcement-icon">📢</div>
                <div className="announcement-content">
                  <div className="announcement-title">{a.title}</div>
                  <div className="announcement-body">{a.body}</div>
                  <div className="announcement-date">
                    Posted on {new Date(a.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="stats-grid">
          {[
            { label: 'Total Tickets', value: tickets.length, color: 'var(--color-primary-500)', icon: '🎫' },
            { label: 'Open', value: open, color: 'var(--color-warning)', icon: '🟡' },
            { label: 'Resolved', value: resolved, color: 'var(--color-success)', icon: '✅' },
            { label: 'Welfare Cases', value: welfare.length, color: 'var(--color-welfare)', icon: '🛡' },
          ].map((s) => (
            <div className="stat-card" key={s.label} style={{ '--stat-color': s.color } as any}>
              <div className="stat-icon" aria-hidden="true">{s.icon}</div>
              <div className="stat-value">{loading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Two-column: Recent Tickets + Notification Panel ────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem', alignItems: 'start' }}>

          {/* Recent Tickets */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: '1.1rem' }}>Recent Tickets</h2>
              <Link to="/student/tickets" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {loading ? (
              <div className="loading-screen"><span className="spinner spinner-lg" /></div>
            ) : tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎫</div>
                <p className="empty-title">No tickets yet</p>
                <p className="empty-desc">Submit a ticket to get help from the support team.</p>
                <Link to="/student/tickets/new" className="btn btn-primary mt-4">Submit your first ticket</Link>
              </div>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table" aria-label="Recent tickets">
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Subject</th>
                      <th scope="col">Status</th>
                      <th scope="col">Priority</th>
                      <th scope="col">Date</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((t) => (
                      <tr key={t.id}>
                        <td><code style={{ fontSize: '0.8rem', color: 'var(--color-primary-400)' }}>{t.referenceNo}</code></td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.subject}
                        </td>
                        <td>{t.isDraft ? <DraftBadge /> : <StatusBadge status={t.status} />}</td>
                        <td><PriorityBadge priority={t.priority} /></td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <Link to={`/student/tickets/${t.id}`} className="btn btn-ghost btn-sm">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Recent Notifications Panel ───────────────────────────── */}
          <div className="card" style={{ position: 'sticky', top: '1.5rem' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔔 Notifications
                {unreadCount > 0 && (
                  <span style={{
                    background: 'var(--color-primary-500)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                  }}>
                    {unreadCount} new
                  </span>
                )}
              </h2>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}><span className="spinner" /></div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔕</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>You're all caught up!</div>
                <div style={{ fontSize: '0.78rem', marginTop: 4 }}>Updates will appear here.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifications.map((n) => {
                  const { icon, accent } = getNotifStyle(n.title)
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      role={n.link ? 'button' : undefined}
                      tabIndex={n.link ? 0 : undefined}
                      onKeyDown={(e) => e.key === 'Enter' && handleNotifClick(n)}
                      style={{
                        display: 'flex',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: n.isRead ? 'transparent' : 'rgba(124,107,250,0.06)',
                        border: `1px solid ${n.isRead ? 'var(--color-border)' : 'rgba(124,107,250,0.18)'}`,
                        borderLeft: `3px solid ${accent}`,
                        cursor: n.link ? 'pointer' : 'default',
                        transition: 'background 0.15s',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: 2 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: n.isRead ? 500 : 700,
                          fontSize: '0.8rem',
                          color: 'var(--color-text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          marginBottom: 2,
                        }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0, display: 'inline-block' }} />
                          )}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 3, opacity: 0.7 }}>
                          {formatRelative(n.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {notifications.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => document.querySelector<HTMLButtonElement>('.top-notif-bell-btn')?.click()}
              >
                View all →
              </button>
            )}
          </div>

        </div>{/* end two-column grid */}

        {/* Welfare Cases */}
        {welfare.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontSize: '1.1rem' }}>🛡 Welfare Cases</h2>
              <Link to="/student/welfare" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            <div className="data-table-wrapper">
              <table className="data-table" aria-label="Welfare cases">
                <thead>
                  <tr>
                    <th scope="col">Reference</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Status</th>
                    <th scope="col">Urgent</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {welfare.map((w) => (
                    <tr key={w.id}>
                      <td><code style={{ fontSize: '0.8rem', color: 'var(--color-welfare)' }}>{w.referenceNo}</code></td>
                      <td>{w.subject}</td>
                      <td><StatusBadge status={w.status} /></td>
                      <td>{w.urgent ? <span className="badge badge-urgent">URGENT</span> : '—'}</td>
                      <td><Link to={`/student/welfare/${w.id}`} className="btn btn-ghost btn-sm">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default StudentDashboard
