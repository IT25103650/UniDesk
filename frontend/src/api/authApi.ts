import api from './axios'

// ── Common — Auth (AuthController) ────────────────────────────────────────────
export const authApi = {
  register: (data: { fullName: string; email: string; password: string; studentId: string; phone?: string; securityQuestion: string; securityAnswer: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  verifyEmail: (code: string) =>
    api.post('/auth/verify-email', { code }),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  getSecurityQuestion: (email: string) =>
    api.post('/auth/security-question', { email }),
  verifySecurityAnswer: (email: string, securityAnswer: string) =>
    api.post('/auth/verify-security-answer', { email, securityAnswer }),
}
