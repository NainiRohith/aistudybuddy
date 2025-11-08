import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'

interface User {
  id: number
  email: string
  full_name: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/users/me')
      setUser(response.data)
    } catch (error: any) {
      console.error('Failed to fetch user:', error)
      localStorage.removeItem('token')
      delete api.defaults.headers.common['Authorization']
      throw error // Re-throw so login function knows it failed
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    // OAuth2PasswordRequestForm expects form-urlencoded data
    const params = new URLSearchParams()
    params.append('username', email)
    params.append('password', password)
    
    try {
      const response = await api.post('/token', params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      
      if (!response.data?.access_token) {
        throw new Error('No access token received')
      }
      
      const token = response.data.access_token
      localStorage.setItem('token', token)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // Fetch user info after successful login
      try {
        await fetchUser()
      } catch (fetchError: any) {
        // If fetching user fails, still consider login successful if we got a token
        console.warn('Failed to fetch user after login:', fetchError)
        // Don't throw - login was successful, just user fetch failed
      }
    } catch (error: any) {
      console.error('Login error:', error)
      // Re-throw with better error message
      if (error.response?.status === 401) {
        throw new Error('Incorrect email or password')
      }
      if (error.message) {
        throw error
      }
      throw new Error(error.response?.data?.detail || 'Login failed. Please try again.')
    }
  }

  const register = async (email: string, password: string, fullName?: string) => {
    await api.post('/register', { email, password, full_name: fullName })
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

