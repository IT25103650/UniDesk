import React, { createContext, useContext, useState, useEffect } from 'react'

export interface AuthUser {
  userId: number
  fullName: string
  email: string
  role: 'STUDENT' | 'HELP_DESK_OFFICER' | 'DEPARTMENT_STAFF' | 'WELFARE_OFFICER' | 'ADMIN' | 'MANAGEMENT'
  departmentId?: number
  departmentName?: string
  accessToken: string
}

interface AuthContextValue {
  user: AuthUser | null
  login: (user: AuthUser) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
})

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (u: AuthUser) => {
    localStorage.setItem('token', u.accessToken)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    window.location.href = '/login'
  }

  // 15-minute idle timeout auto-logout
  useEffect(() => {
    if (!user) return

    const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
    let timeoutId: ReturnType<typeof setTimeout>

    const resetTimer = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        sessionStorage.setItem('logoutReason', 'You have been logged out due to 15 minutes of inactivity.')
        logout()
      }, TIMEOUT_MS)
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()

    return () => {
      clearTimeout(timeoutId)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
