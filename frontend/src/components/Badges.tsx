import React from 'react'

type Status = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'CANCELLED'
type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

interface StatusBadgeProps { status: Status }
interface PriorityBadgeProps { priority: Priority }

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const labels: Record<Status, string> = {
    NEW: 'New',
    ASSIGNED: 'Assigned',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    CLOSED: 'Closed',
    CANCELLED: 'Withdrawn',
  }
  return (
    <span className={`badge badge-${status.toLowerCase()}`} role="status">
      {labels[status] || status}
    </span>
  )
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => (
  <span className={`badge badge-${priority.toLowerCase()}`}>
    {priority === 'URGENT' ? '🔴 ' : priority === 'HIGH' ? '🟡 ' : priority === 'LOW' ? '🟢 ' : ''}
    {priority}
  </span>
)

export const DraftBadge: React.FC = () => (
  <span className="badge badge-draft">📝 Draft</span>
)

export const OverdueBadge: React.FC = () => (
  <span className="badge badge-overdue">⏰ Overdue</span>
)

export const WelfareBadge: React.FC = () => (
  <span className="badge badge-welfare">🛡 Welfare</span>
)
