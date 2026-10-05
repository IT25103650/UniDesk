import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

interface NavItem {
  label: string
  to: string
  icon: string
}

const roleNavItems: Record<string, NavItem[]> = {
  STUDENT: [
    { label: 'Dashboard', to: '/student', icon: '🏠' },
    { label: 'My Tickets', to: '/student/tickets', icon: '🎫' },
    { label: 'Submit Ticket', to: '/student/tickets/new', icon: '➕' },
    { label: 'Welfare Cases', to: '/student/welfare', icon: '🛡️' },
    { label: 'Submit Welfare', to: '/student/welfare/new', icon: '💬' },
  ],
  HELP_DESK_OFFICER: [
    { label: 'Ticket Inbox', to: '/helpdesk', icon: '📥' },
  ],
  DEPARTMENT_STAFF: [
    { label: 'Assigned Tickets', to: '/department', icon: '📋' },
    { label: 'Resolved/Closed Archive', to: '/department/archive', icon: '🗄' },
  ],
  WELFARE_OFFICER: [
    { label: 'Welfare Cases', to: '/welfare', icon: '🛡️' },
  ],
  ADMIN: [
    { label: 'Dashboard', to: '/admin', icon: '🏠' },
    { label: 'All Tickets', to: '/admin/tickets', icon: '🎫' },
    { label: 'Reports & Analytics', to: '/admin/reports', icon: '📊' },
    { label: 'Users', to: '/admin/users', icon: '👥' },
    { label: 'Departments', to: '/admin/departments', icon: '🏢' },
    { label: 'Categories', to: '/admin/categories', icon: '🏷️' },
    { label: 'Announcements', to: '/admin/announcements', icon: '📢' },
    { label: 'Audit Log', to: '/admin/audit', icon: '📜' },
  ],
  MANAGEMENT: [
    { label: 'Reports', to: '/management', icon: '📈' },
  ],
}

const roleLabelMap: Record<string, string> = {
  STUDENT: 'Student',
  HELP_DESK_OFFICER: 'Help Desk',
  DEPARTMENT_STAFF: 'Dept. Staff',
  WELFARE_OFFICER: 'Welfare Officer',
  ADMIN: 'Administrator',
  MANAGEMENT: 'Management',
}

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const items = roleNavItems[user.role] || []
  const initials = user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <nav className="sidebar" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="logo-mark">UniDesk</div>
          <div className="logo-sub">STUDENT HELP DESK PORTAL</div>
        </div>

        <div className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-label">{roleLabelMap[user.role]}</div>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split('/').length === 2}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-label">Account</div>
            <NavLink to="/help" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon" aria-hidden="true">❓</span>
              Help &amp; FAQ
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon" aria-hidden="true">👤</span>
              My Profile
            </NavLink>
            <NavLink to="/preferences" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon" aria-hidden="true">⚙️</span>
              Preferences
            </NavLink>
            <button className="nav-item" onClick={logout} aria-label="Sign out">
              <span className="nav-icon" aria-hidden="true">🚪</span>
              Sign Out
            </button>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar" aria-hidden="true">{initials}</div>
            <div>
              <div className="user-name">{user.fullName}</div>
              <div className="user-role">{roleLabelMap[user.role]}</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Global Top-Right Notification Bell & Half-Side Drawer */}
      <NotificationBell />
    </>
  )
}

export default Sidebar
