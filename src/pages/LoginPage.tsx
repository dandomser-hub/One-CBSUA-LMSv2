import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import ErrorNotice from '../components/ErrorNotice'
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
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 px-4">
      <div className="max-w-3xl w-full grid md:grid-cols-2 gap-8">
        <section>
          <h1 className="text-3xl font-bold">One-CBSUA LMS v2</h1>
          <p className="mt-4">Academic, Employee Learning & Development, and MOOC learning.</p>
          <p className="mt-4">
            Academic and employee learning access is assigned by the university. New accounts can
            browse and enroll in open, free MOOCs.
          </p>
          <Link className="text-primary-600 block mt-4" to="/mooc">
            Browse the public catalog
          </Link>
          <Link className="text-primary-600 block mt-2" to="/verify">
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
            className="text-primary-600"
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
    </main>
  )
}
