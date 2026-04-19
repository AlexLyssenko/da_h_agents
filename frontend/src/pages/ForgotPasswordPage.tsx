import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email is required'); return }
    setError('')
    setIsLoading(true)
    try {
      await authApi.requestPasswordReset({ email })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-mono text-3xl font-bold text-[var(--accent)]">IRC Chat</h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">Reset your password</p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-8 shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-[var(--text-primary)]">
                Request received. Check the <strong>server console</strong> for your reset token.
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                (Email delivery is not configured — this is a development environment.)
              </p>
              <Link to="/login" className="block text-sm text-[var(--accent)] hover:underline mt-4">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-900/30 border border-red-800 text-sm text-red-300">
                  {error}
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
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? 'Sending...' : 'Send Reset Token'}
              </button>
            </form>
          )}
          {!submitted && (
            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Remembered it?{' '}
              <Link to="/login" className="text-[var(--accent)] hover:underline">
                Sign In
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
