import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'huertai_token'

interface AuthContextValue {
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  }, [token])

  async function login(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? 'Error al iniciar sesión')
    }
    const { access_token } = await res.json()
    setToken(access_token)
  }

  async function register(email: string, password: string) {
    const res = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail ?? 'Error al registrarse')
    }
    const { access_token } = await res.json()
    setToken(access_token)
  }

  function logout() {
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
