import api from './axios'

// ── Module 5 — Notifications, Announcements and Audit Logging ─────────────────

// UserNotificationController
export const notifApi = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  dismiss: (id: number) => api.delete(`/notifications/${id}`),
  getTypes: () => api.get('/notifications/types'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreference: (type: string, enabled: boolean) =>
    api.put('/notifications/preferences', { type, enabled }),
}

// AnnouncementController
export const announcementApi = {
  getActive: () => api.get('/announcements/active'),
  getAll: (page = 0, size = 20, filters?: { search?: string; targetRole?: string; isPublished?: boolean }) =>
    api.get('/announcements', { params: { page, size, ...filters } }),
  create: (data: { title: string; body: string; publish?: boolean; startDate?: string; endDate?: string; targetRole?: string; priority?: string }) =>
    api.post('/announcements', data),
  update: (id: number, data: object) => api.put(`/announcements/${id}`, data),
  publish: (id: number, publish: boolean) =>
    api.put(`/announcements/${id}/publish`, { publish }),
  delete: (id: number) => api.delete(`/announcements/${id}`),
}

// NotificationAdminController (admin: send notification, audit log)
export const notificationAdminApi = {
  getAuditLog: (page = 0, size = 50, action?: string, actor?: string, dateFrom?: string, dateTo?: string) =>
    api.get('/admin/audit', { params: { page, size, action, actor, dateFrom, dateTo } }),
  sendNotification: (data: { userId?: number; role?: string; title: string; message: string }) =>
    api.post('/admin/notifications', data),
}
