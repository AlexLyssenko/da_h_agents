import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { connectSocket } from '../api/socket'

export function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e: Record<string, string> = {}
    if (!username) e.username = 'Username is required'
    else if (username.length < 3) e.username = 'At least 3 characters'
    if (!email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email'
    if (!password) e.password = 'Password is required'
    else if (password.length < 8) e.password = 'At least 8 characters'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setIsLoading(true)

    try {
      const data = await authApi.register({ username, email, password })
      setAuth(data.user, data.accessToken, data.sessionId)
      connectSocket(data.accessToken)
      navigate('/')
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { message?: string; errors?: Record<string, string> } } })?.response
      const fieldErrors = resp?.data?.errors
      if (fieldErrors) {
        setErrors(fieldErrors)
      } else {
        setErrors({ general: resp?.data?.message ?? 'Registration failed' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold text-[var(--accent)]">IRC Chat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Create your account</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && (
              <div className="p-3 rounded-md bg-red-900/30 border border-red-800 text-sm text-red-300">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.username ? 'border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
                placeholder="cooluser"
              />
              {errors.username && <p className="mt-1 text-xs text-red-400">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.email ? 'border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.password ? 'border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
                placeholder="Min 8 characters"
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
