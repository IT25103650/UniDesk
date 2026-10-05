import api from './axios'

// ── Module 1 — Ticket Submission and Tracking (TicketController) ──────────────
export const ticketSubmissionApi = {
  create: (data: { categoryId: number; subject: string; description: string }) =>
    api.post('/tickets', data),
  saveDraft: (data: { categoryId: number; subject: string; description: string }) =>
    api.post('/tickets/draft', data),
  submitDraft: (id: number) =>
    api.put(`/tickets/${id}/submit-draft`),
  deleteDraft: (id: number) =>
    api.delete(`/tickets/${id}`),
  withdraw: (id: number, reason?: string) =>
    api.put(`/tickets/${id}/withdraw`, { reason }),
  submitFeedback: (id: number, rating: number, comment?: string) =>
    api.post(`/tickets/${id}/feedback`, { rating, comment }),
  getMyTickets: (page = 0, size = 10, status?: string) =>
    api.get(`/tickets/my`, { params: { page, size, status } }),
  getById: (id: number) => api.get(`/tickets/${id}`),
  requestReopen: (id: number, reason?: string) =>
    api.post(`/tickets/${id}/request-reopen`, { reason }),
  getComments: (id: number) => api.get(`/tickets/${id}/comments`),
  getHistory: (id: number) => api.get(`/tickets/${id}/history`),
  getAttachments: (id: number) => api.get(`/tickets/${id}/attachments`),
  uploadAttachment: (id: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/tickets/${id}/attachments`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteAttachment: (id: number, fileId: number) =>
    api.delete(`/tickets/${id}/attachments/${fileId}`),
  downloadAttachment: (id: number, fileId: number) =>
    api.get(`/tickets/${id}/attachments/${fileId}`, { responseType: 'blob' }),
}
