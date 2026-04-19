import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!token) e.general = 'Missing reset token. Use the link from the server console.'
    if (!newPassword) e.newPassword = 'Password is required'
    else if (newPassword.length < 8) e.newPassword = 'Password must be at least 8 characters'
    if (newPassword !== confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setIsLoading(true)
    try {
      await authApi.confirmPasswordReset({ token, newPassword })
      navigate('/login', { state: { message: 'Password updated. Please sign in.' } })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrors({ general: msg ?? 'Invalid or expired token.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold text-[var(--accent)]">IRC Chat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Set a new password</p>
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
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.newPassword ? 'border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
              />
              {errors.newPassword && <p className="mt-1 text-xs text-red-400">{errors.newPassword}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat password"
                className={`w-full px-3 py-2.5 bg-[var(--bg-secondary)] border rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                  errors.confirm ? 'border-red-500' : 'border-[var(--border)] focus:border-blue-500'
                }`}
              />
              {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm}</p>}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? 'Updating...' : 'Set New Password'}
            </button>
          </form>
          <p className="text-center text-sm text-[var(--text-muted)] mt-6">
            <Link to="/login" className="text-[var(--accent)] hover:underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
