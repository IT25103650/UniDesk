import api from './axios'

// ── Module 3 — Department Response and Overdue Tracking (TicketDepartmentController) ──
export const departmentResponseApi = {
  getDepartmentTickets: (params: Record<string, string | number | undefined>) =>
    api.get(`/tickets/department`, { params }),
  getDepartmentArchive: (params: Record<string, string | number | undefined>) =>
    api.get(`/tickets/department/archive`, { params }),
  updateStatus: (id: number, status: string, note?: string) =>
    api.put(`/tickets/${id}/status`, { status, note }),
  closeResolved: (id: number, note?: string) =>
    api.put(`/tickets/${id}/close`, { note }),
  addResolutionNote: (id: number, note: string) =>
    api.post(`/tickets/${id}/resolution-note`, { note }),
  addComment: (id: number, body: string, internal = false) =>
    api.post(`/tickets/${id}/comments`, { body, internal }),
  updateComment: (id: number, commentId: number, body: string) =>
    api.put(`/tickets/${id}/comments/${commentId}`, { body }),
  deleteComment: (id: number, commentId: number) =>
    api.delete(`/tickets/${id}/comments/${commentId}`),
  getReplyTemplates: () => api.get('/tickets/department/reply-templates'),
  createReplyTemplate: (title: string, body: string) =>
    api.post('/tickets/department/reply-templates', { title, body }),
  deleteReplyTemplate: (templateId: number) =>
    api.delete(`/tickets/department/reply-templates/${templateId}`),
}
