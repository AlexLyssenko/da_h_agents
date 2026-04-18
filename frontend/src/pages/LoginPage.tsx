import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { connectSocket } from '../api/socket'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const validate = () => {
    const e: Record<string, string> = {}
    if (!email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email'
    if (!password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setIsLoading(true)

    try {
      const data = await authApi.login({ email, password })
      setAuth(data.user, data.accessToken, data.sessionId)
      connectSocket(data.accessToken)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrors({ general: msg ?? 'Invalid email or password' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold text-[var(--accent)]">IRC Chat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Sign in to continue</p>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && (
              <div className="p-3 rounded-md bg-red-900/30 border border-red-800 text-sm text-red-300">
                {errors.general}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.email ? 'border-red-500 focus:border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.password ? 'border-red-500 focus:border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--accent)] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
