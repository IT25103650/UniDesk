import api from './axios'

// ── Module 4 — Welfare Case Management and File Handling (WelfareController) ──
export const welfareApi = {
  create: (data: { subject: string; description: string }) =>
    api.post('/welfare', data),
  getMyCases: (page = 0, size = 10) =>
    api.get(`/welfare/my?page=${page}&size=${size}`),
  getAll: (params: Record<string, string | boolean | number | undefined>) =>
    api.get('/welfare', { params }),
  getById: (id: number) => api.get(`/welfare/${id}`),
  updateStatus: (id: number, status: string, note?: string) =>
    api.put(`/welfare/${id}/status`, { status, note }),
  setUrgent: (id: number, urgent: boolean) =>
    api.put(`/welfare/${id}/urgent`, { urgent }),
  archive: (id: number, note?: string) =>
    api.put(`/welfare/${id}/archive`, { note }),
  assign: (id: number, officerId: number) =>
    api.put(`/welfare/${id}/assign`, { officerId }),
  addComment: (id: number, body: string, internal = false) =>
    api.post(`/welfare/${id}/comments`, { body, internal }),
  // Welfare officer deletes own internal note
  deleteComment: (id: number, commentId: number) =>
    api.delete(`/welfare/${id}/comments/${commentId}`),
  getComments: (id: number) => api.get(`/welfare/${id}/comments`),
  getHistory: (id: number) => api.get(`/welfare/${id}/history`),
  getAttachments: (id: number) => api.get(`/welfare/${id}/attachments`),
  uploadAttachment: (id: number, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/welfare/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  downloadAttachment: (id: number, fileId: number) =>
    api.get(`/welfare/${id}/attachments/${fileId}`, { responseType: 'blob' }),
  deleteAttachment: (id: number, fileId: number) =>
    api.delete(`/welfare/${id}/attachments/${fileId}`),
}
