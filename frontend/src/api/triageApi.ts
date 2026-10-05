import api from './axios'

// ── Module 2 — Ticket Triage and Assignment (TicketTriageController) ──────────
export const triageApi = {
  getStats: () => api.get('/tickets/stats'),
  getAll: (params: Record<string, string | number | undefined>) =>
    api.get('/tickets', { params }),
  updatePriority: (id: number, priority: string) =>
    api.put(`/tickets/${id}/priority`, { priority }),
  assign: (id: number, departmentId: number, assignedToId?: number) =>
    api.put(`/tickets/${id}/assign`, { departmentId, assignedToId }),
  unassign: (id: number, reason?: string) =>
    api.put(`/tickets/${id}/unassign`, { reason }),
  forward: (id: number, departmentId: number, reason?: string) =>
    api.put(`/tickets/${id}/forward`, { departmentId, reason }),
  reopen: (id: number) => api.put(`/tickets/${id}/reopen`),
  addTriageNote: (id: number, note: string) =>
    api.post(`/tickets/${id}/triage-notes`, { note }),
  getTriageNotes: (id: number) => api.get(`/tickets/${id}/triage-notes`),
  deleteTriageNote: (id: number, noteId: number) =>
    api.delete(`/tickets/${id}/triage-notes/${noteId}`),
  getTags: (id: number) => api.get(`/tickets/${id}/tags`),
  addTag: (id: number, label: string) =>
    api.post(`/tickets/${id}/tags`, { label }),
  deleteTag: (id: number, tagId: number) =>
    api.delete(`/tickets/${id}/tags/${tagId}`),
}
