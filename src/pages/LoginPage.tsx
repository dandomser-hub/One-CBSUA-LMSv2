import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import ThemeSelector from '../components/ThemeSelector'
import ErrorNotice from '../components/ErrorNotice'
const TEST_USERS = [
  ['Administrator', 'admin', 'All domains'],
  ['Faculty', 'faculty', 'Academic'],
  ['Academic Student', 'student', 'Academic'],
  ['Second Academic Student', 'student2', 'Academic'],
  ['L&D Facilitator', 'facilitator', 'Employee L&D'],
  ['L&D Learner', 'employee', 'Employee L&D'],
  ['MOOC Learner', 'mooc', 'MOOC'],
  ['Multi-Role', 'multirole', 'Faculty, Student & L&D'],
]
const demoEnabled = import.meta.env.VITE_ENABLE_DEMO_LOGIN !== 'false'
const demoPassword = import.meta.env.VITE_DEMO_PASSWORD || 'VLP-Demo-2026!'

export default function LoginPage() {
  const { signIn, signUp, session, loading } = useAuth()
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [register, setRegister] = useState(false)
  const [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  if (loading) return <p className="p-8">Loading account…</p>
  if (session) return <Navigate to="/dashboard" replace />
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      const { error } = register
        ? await signUp(email, password, name)
        : await signIn(email, password)
      if (error) setError(error)
      else if (register)
        setMessage(
          'Account request received. Check your email if confirmation is required, then sign in.',
        )
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  async function demoLogin(account: string) {
    setBusy(true)
    setError(null)
    setMessage('')
    setEmail(account)
    setPassword(demoPassword)
    setRegister(false)
    try {
      const result = await signIn(account, demoPassword)
      if (result.error) setError(result.error)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="min-h-screen landing-background px-4 py-6 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end mb-10">
          <ThemeSelector />
        </div>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <section>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">One-CBSUA VLP</h1>
            <p className="mt-4">Academic, Employee Learning & Development, and MOOC learning.</p>
            <p className="mt-4">
              Academic and employee learning access is assigned by the university. New accounts can
              browse and enroll in open, free MOOCs.
            </p>
            <Link className="text-link block mt-4" to="/mooc">
              Browse the public catalog
            </Link>
            <Link className="text-link block mt-2" to="/verify">
              Verify a certificate
            </Link>
          </section>
          <form onSubmit={submit} className="card space-y-4">
            <h2 className="text-xl font-bold">{register ? 'Create account' : 'Sign in'}</h2>
            {register && (
              <label className="block">
                Display name
                <input
                  required
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label className="block">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="block">
              Password
              <input
                required
                minLength={register ? 12 : undefined}
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <ErrorNotice message={error} />
            {message && <p role="status">{message}</p>}
            <button disabled={busy} className="btn-primary w-full" type="submit">
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            </button>
            <button
              className="text-link"
              type="button"
              disabled={busy}
              onClick={() => {
                setRegister(!register)
                setError(null)
                setMessage('')
              }}
            >
              {register ? 'Use an existing account' : 'Create an external learner account'}
            </button>
          </form>
        </div>
        {demoEnabled && (
          <section className="mt-10 card" aria-labelledby="test-users-heading">
            <h2 id="test-users-heading" className="text-xl font-bold">
              Role-based test users
            </h2>
            <p className="mt-2 text-sm text-muted">
              Choose a seeded account to explore its assigned role. Shared test password:{' '}
              <code className="text-foreground">{demoPassword}</code>
            </p>
            <p className="mt-1 text-sm text-muted">
              If your demo uses a different password, enter it in the sign-in form above.
            </p>
            <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {TEST_USERS.map(([role, account]) => (
                <button
                  type="button"
                  key={account}
                  disabled={busy}
                  onClick={() => demoLogin(account + '@vlpv2.test')}
                  className="text-left rounded-xl border border-border bg-surface-alt px-3 py-2 hover:border-primary focus-visible:outline-offset-2 disabled:opacity-50"
                >
                  <span className="block font-semibold text-link">{role}</span>
                  <span className="block text-xs text-muted mt-1 truncate">
                    {account}@vlpv2.test
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
