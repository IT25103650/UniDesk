import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { announcementApi, notifApi } from '../api/notificationApi'

interface Notification {
  id: number
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: string
}

interface AnnouncementNotif {
  id: number
  title: string
  body: string
  priority?: string
  createdAt: string
}

const NotificationBell: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementNotif[]>([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'ANNOUNCEMENTS'>('ALL')
  const drawerRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    if (!user) return
    try {
      const [countRes, listRes, annRes] = await Promise.all([
        notifApi.getUnreadCount(),
        notifApi.getAll(),
        announcementApi.getActive(),
      ])
      setCount(countRes.data?.count || 0)
      setNotifs(listRes.data || [])
      setAnnouncements(annRes.data || [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000) // Poll every 15s
    return () => clearInterval(interval)
  }, [user])

  // Close when pressing Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const markRead = async (id: number) => {
    try {
      await notifApi.markRead(id)
      setCount((c) => Math.max(0, c - 1))
      setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    } catch {
      // silent
    }
  }

  const dismiss = async (e: React.MouseEvent, n: Notification) => {
    e.stopPropagation()
    try {
      await notifApi.dismiss(n.id)
      setNotifs((ns) => ns.filter((x) => x.id !== n.id))
      if (!n.isRead) setCount((c) => Math.max(0, c - 1))
    } catch {
      // silent
    }
  }

  const markAll = async () => {
    try {
      await notifApi.markAllRead()
      setCount(0)
      setNotifs((ns) => ns.map((n) => ({ ...n, isRead: true })))
    } catch {
      // silent
    }
  }

  // Resolve proper route according to user role and notification data
  const handleNotificationClick = (n: Notification) => {
    markRead(n.id)
    setOpen(false)

    if (!n.link) return

    let target = n.link.trim()

    // If link is a raw ticket path like "/tickets/12" or "tickets/12"
    const ticketMatch = target.match(/\/tickets\/(\d+)/i) || target.match(/^tickets\/(\d+)/i)
    if (ticketMatch) {
      const ticketId = ticketMatch[1]
      if (user?.role === 'STUDENT') {
        target = `/student/tickets/${ticketId}`
      } else if (user?.role === 'HELP_DESK_OFFICER' || user?.role === 'ADMIN') {
        target = `/helpdesk/tickets/${ticketId}`
      } else if (user?.role === 'DEPARTMENT_STAFF') {
        target = `/department/tickets/${ticketId}`
      } else {
        target = `/student/tickets/${ticketId}`
      }
    }

    // If link is a welfare path like "/welfare/5"
    const welfareMatch = target.match(/\/welfare\/(\d+)/i) || target.match(/welfare\/cases\/(\d+)/i)
    if (welfareMatch) {
      const caseId = welfareMatch[1]
      if (user?.role === 'STUDENT') {
        target = `/student/welfare/${caseId}`
      } else if (user?.role === 'WELFARE_OFFICER' || user?.role === 'ADMIN') {
        target = `/welfare/cases/${caseId}`
      }
    }

    // If link is an announcement
    if (target.includes('announcement')) {
      if (user?.role === 'ADMIN') target = '/admin/announcements'
      else if (user?.role === 'STUDENT') target = '/student'
    }

    navigate(target)
  }

  // Format relative timestamp
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - d.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHr = Math.floor(diffMin / 60)
      const diffDays = Math.floor(diffHr / 24)

      if (diffMin < 1) return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      if (diffHr < 24) return `${diffHr}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Get notification icon
  const getIcon = (title: string) => {
    const t = title.toLowerCase()
    if (t.includes('ticket') || t.includes('tkt')) return '🎫'
    if (t.includes('welfare')) return '🛡️'
    if (t.includes('overdue') || t.includes('escalat')) return '⏱️'
    if (t.includes('announcement')) return '📢'
    if (t.includes('resolved') || t.includes('closed')) return '✅'
    if (t.includes('reply') || t.includes('comment')) return '💬'
    return '🔔'
  }

  const displayedNotifs = filter === 'UNREAD' 
    ? notifs.filter((n) => !n.isRead) 
    : notifs

  if (!user) return null

  return (
    <>
      {/* ── Top-Right Bell Button ────────────────────────────────────────── */}
      <div className="top-right-notif-container">
        <button
          className="top-notif-bell-btn"
          onClick={() => setOpen(true)}
          aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
          title="Notifications"
        >
          <span className="bell-icon" aria-hidden="true">🔔</span>
          {count > 0 && (
            <span className="notif-count-badge" aria-hidden="true">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </div>

      {/* ── Half-Side Slide-Over Drawer ─────────────────────────────────── */}
      {open && (
        <div className="notif-drawer-backdrop" onClick={() => setOpen(false)}>
          <aside
            ref={drawerRef}
            className="notif-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Notifications Drawer"
            aria-modal="true"
          >
            {/* Drawer Header */}
            <div className="notif-drawer-header">
              <div className="notif-drawer-title-group">
                <div className="notif-drawer-title">
                  <span style={{ marginRight: 6 }}>🔔</span> Notifications
                </div>
                {count > 0 && (
                  <span className="notif-unread-pill">{count} New</span>
                )}
              </div>
              <button
                className="notif-drawer-close-btn"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
              >
                ✕
              </button>
            </div>

            {/* Filter Tabs & Quick Actions */}
            <div className="notif-drawer-toolbar">
              <div className="notif-filter-tabs">
                <button
                  className={`notif-tab ${filter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFilter('ALL')}
                >
                  All ({notifs.length})
                </button>
                <button
                  className={`notif-tab ${filter === 'UNREAD' ? 'active' : ''}`}
                  onClick={() => setFilter('UNREAD')}
                >
                  Unread ({count})
                </button>
                <button
                  className={`notif-tab ${filter === 'ANNOUNCEMENTS' ? 'active' : ''}`}
                  onClick={() => setFilter('ANNOUNCEMENTS')}
                >
                  📢 Announcements ({announcements.length})
                </button>
              </div>

              {count > 0 && (
                <button className="notif-mark-all-btn" onClick={markAll}>
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notification Items List */}
            <div className="notif-drawer-body">
              {filter === 'ANNOUNCEMENTS' ? (
                announcements.length === 0 ? (
                  <div className="notif-empty-state">
                    <div className="notif-empty-icon">📢</div>
                    <div className="notif-empty-title">No announcements right now</div>
                    <div className="notif-empty-subtitle">
                      Admin announcements targeted to your role will appear here.
                    </div>
                  </div>
                ) : (
                  <div className="notif-items-list">
                    {announcements.map((a) => (
                      <div key={`ann-${a.id}`} className="notif-item-card read">
                        <div className="notif-item-icon-box">
                          <span className="notif-type-emoji">📢</span>
                        </div>
                        <div className="notif-item-content">
                          <div className="notif-item-header">
                            <span className="notif-item-title">{a.title}</span>
                            <span className="notif-item-time">{formatTime(a.createdAt)}</span>
                          </div>
                          <div className="notif-item-message">{a.body}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : displayedNotifs.length === 0 ? (
                <div className="notif-empty-state">
                  <div className="notif-empty-icon">🔕</div>
                  <div className="notif-empty-title">
                    {filter === 'UNREAD' ? 'No unread notifications' : 'No notifications yet'}
                  </div>
                  <div className="notif-empty-subtitle">
                    {filter === 'UNREAD'
                      ? 'You have caught up with all your notifications.'
                      : 'Important updates regarding your tickets, inquiries, and announcements will show here.'}
                  </div>
                </div>
              ) : (
                <div className="notif-items-list">
                  {displayedNotifs.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item-card ${!n.isRead ? 'unread' : 'read'}`}
                      onClick={() => handleNotificationClick(n)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleNotificationClick(n)}
                    >
                      <div className="notif-item-icon-box">
                        <span className="notif-type-emoji">{getIcon(n.title)}</span>
                        {!n.isRead && <span className="notif-unread-indicator" />}
                      </div>

                      <div className="notif-item-content">
                        <div className="notif-item-header">
                          <span className="notif-item-title">{n.title}</span>
                          <span className="notif-item-time">{formatTime(n.createdAt)}</span>
                        </div>
                        <div className="notif-item-message">{n.message}</div>
                        {n.link && (
                          <div className="notif-item-action-hint">
                            Click to open details &rarr;
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="notif-dismiss-btn"
                        onClick={(e) => dismiss(e, n)}
                        aria-label="Dismiss notification"
                        title="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

export default NotificationBell
