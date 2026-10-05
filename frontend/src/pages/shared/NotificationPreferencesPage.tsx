import React, { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { notifApi } from '../../api/notificationApi'

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  TICKET_CREATED: 'Ticket Created',
  TICKET_ASSIGNED: 'Ticket Assigned',
  TICKET_REPLIED: 'New Reply on Ticket',
  TICKET_RESOLVED: 'Ticket Resolved',
  TICKET_CLOSED: 'Ticket Closed',
  OVERDUE_REMINDER: 'Overdue Reminder',
}

const NotificationPreferencesPage: React.FC = () => {
  const [types, setTypes] = useState<Record<string, string>>({})
  const [preferences, setPreferences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [t, p] = await Promise.all([notifApi.getTypes(), notifApi.getPreferences()])
        setTypes(t.data || NOTIFICATION_TYPE_LABELS)
        setPreferences(p.data || [])
      } catch { /* use defaults */ setTypes(NOTIFICATION_TYPE_LABELS) }
      finally { setLoading(false) }
    })()
  }, [])

  const isEnabled = (type: string) => {
    const pref = preferences.find(p => p.notificationType === type)
    return pref ? pref.enabled : true // default enabled if no preference exists
  }

  const toggle = async (type: string) => {
    const current = isEnabled(type)
    setSaving(type)
    try {
      const res = await notifApi.updatePreference(type, !current)
      setPreferences(prev => {
        const idx = prev.findIndex(p => p.notificationType === type)
        if (idx >= 0) {
          return prev.map((p, i) => i === idx ? res.data : p)
        }
        return [...prev, res.data]
      })
      setSuccess(`${NOTIFICATION_TYPE_LABELS[type] || type} ${!current ? 'enabled' : 'disabled'}.`)
      setTimeout(() => setSuccess(''), 2500)
    } catch { /* silent */ }
    finally { setSaving(null) }
  }

  const allTypes = Object.keys(types.length ? types : NOTIFICATION_TYPE_LABELS)

  return (
    <div className="page-layout">
      <Sidebar />
      <main className="main-content" id="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Notification Preferences</h1>
            <p className="page-subtitle">Choose which notification types you'd like to receive.</p>
          </div>
        </div>

        {success && <div className="alert alert-success mb-4" role="status">✅ {success}</div>}

        {loading ? (
          <div className="loading-screen"><span className="spinner spinner-lg" /></div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {allTypes.map(type => (
                <div key={type} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '1rem', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
                  transition: 'all var(--transition)',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{NOTIFICATION_TYPE_LABELS[type] || type}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {type === 'TICKET_CREATED' && 'When a new ticket is submitted'}
                      {type === 'TICKET_ASSIGNED' && 'When a ticket is assigned to your department'}
                      {type === 'TICKET_REPLIED' && 'When someone replies to a ticket'}
                      {type === 'TICKET_RESOLVED' && 'When a ticket is resolved'}
                      {type === 'TICKET_CLOSED' && 'When a ticket is closed'}
                      {type === 'OVERDUE_REMINDER' && 'Reminders for overdue tickets'}
                    </div>
                  </div>
                  <button
                    className={`toggle-btn ${isEnabled(type) ? 'toggle-on' : 'toggle-off'}`}
                    onClick={() => toggle(type)}
                    disabled={saving === type}
                    aria-pressed={isEnabled(type)}
                    aria-label={`Toggle ${NOTIFICATION_TYPE_LABELS[type] || type}`}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default NotificationPreferencesPage
