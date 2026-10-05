import api from './axios'

// ── Module 6 — Administration, Dashboard and Reporting ────────────────────────

// AdminController (users, student profile) + ReportController
export const adminUsersReportsApi = {
  getUsers: (page = 0, size = 20, role?: string, search?: string) =>
    api.get('/admin/users', { params: { page, size, role: role || undefined, search: search || undefined } }),
  getUserById: (id: number) => api.get(`/admin/users/${id}`),
  createUser: (data: object) => api.post('/admin/users', data),
  updateUser: (id: number, data: { fullName?: string; email?: string; phone?: string }) =>
    api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  updateRole: (id: number, role: string) =>
    api.put(`/admin/users/${id}/role`, { role }),
  setActive: (id: number, active: boolean) =>
    api.put(`/admin/users/${id}/active`, { active }),
  resetPassword: (id: number, password: string) =>
    api.put(`/admin/users/${id}/reset-password`, { password }),
  getStudentProfile: (id: number) => api.get(`/admin/users/${id}/student-profile`),
  upsertStudentProfile: (id: number, data: object) =>
    api.put(`/admin/users/${id}/student-profile`, data),
  getStats: () => api.get('/admin/reports/stats'),
  getByDepartment: (from?: string, to?: string) =>
    api.get('/admin/reports/tickets-by-department', { params: { from, to } }),
  getByCategory: (from?: string, to?: string) =>
    api.get('/admin/reports/tickets-by-category', { params: { from, to } }),
  getOpenVsResolved: () => api.get('/admin/reports/open-vs-resolved'),
  getTrends: (from?: string, to?: string) =>
    api.get('/admin/reports/trends', { params: { from, to } }),
  exportCsv: (from?: string, to?: string, status?: string, priority?: string, departmentId?: number) =>
    api.get('/admin/reports/export-csv', { params: { from, to, status, priority, departmentId }, responseType: 'blob' }),
  exportUsersCsv: (role?: string, search?: string) =>
    api.get('/admin/reports/export-users-csv', { params: { role, search }, responseType: 'blob' }),
  exportPdf: (from: string, to: string) =>
    api.get('/admin/reports/export/pdf', { params: { from, to }, responseType: 'blob' }),
  exportExcel: (from: string, to: string) =>
    api.get('/admin/reports/export/excel', { params: { from, to }, responseType: 'blob' }),
  getStaffPerformance: (from?: string, to?: string) =>
    api.get('/admin/reports/staff-performance', { params: { from, to } }),
  getSpeedAnalytics: (from?: string, to?: string) =>
    api.get('/admin/reports/speed-analytics', { params: { from, to } }),
  getDepartmentSpeed: (from?: string, to?: string) =>
    api.get('/admin/reports/department-speed', { params: { from, to } }),
  exportStaffCsv: (from?: string, to?: string) =>
    api.get('/admin/reports/export-staff-csv', { params: { from, to }, responseType: 'blob' }),
}

// DepartmentCategoryController
export const deptApi = {
  getAll: (activeOnly = false) => api.get('/departments', { params: { activeOnly } }),
  getStaff: (deptId: number) => api.get(`/departments/${deptId}/staff`),
  create: (data: { name: string; description?: string }) =>
    api.post('/departments', data),
  update: (id: number, data: object) => api.put(`/departments/${id}`, data),
  delete: (id: number) => api.delete(`/departments/${id}`),
}

export const categoryApi = {
  getAll: (activeOnly = false) => api.get('/categories', { params: { activeOnly } }),
  create: (data: { name: string; description?: string; departmentId?: number }) =>
    api.post('/categories', data),
  update: (id: number, data: object) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

// StudentProfileController (staff access)
export const studentApi = {
  /** Get full student profile by user ID — for staff viewing ticket owner details */
  getProfile: (userId: number) => api.get(`/students/${userId}/profile`),
}
