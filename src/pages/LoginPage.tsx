import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { GraduationCap, Loader2 } from 'lucide-react'

const TEST_USERS = [
  { email: 'admin@vlpv2.test', label: 'Administrator', domain: 'All domains' },
  { email: 'faculty@vlpv2.test', label: 'Faculty', domain: 'Academic' },
  { email: 'student@vlpv2.test', label: 'Academic Student', domain: 'Academic' },
  { email: 'facilitator@vlpv2.test', label: 'L&D Facilitator', domain: 'Employee L&D' },
  { email: 'employee@vlpv2.test', label: 'L&D Learner', domain: 'Employee L&D' },
  { email: 'mooc@vlpv2.test', label: 'MOOC Learner', domain: 'MOOC' },
  { email: 'multirole@vlpv2.test', label: 'Multi-Role (Faculty+Student+L&D)', domain: 'Multi-domain' },
]

const PASSWORD = 'Password123!'

export default function LoginPage() {
  const { signIn, session, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (session) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await signIn(email, password)
    setBusy(false)
    if (err) {
      setError(err)
    } else {
      navigate('/dashboard')
    }
  }

  const quickLogin = async (testEmail: string) => {
    setBusy(true)
    setError(null)
    setEmail(testEmail)
    setPassword(PASSWORD)
    const { error: err } = await signIn(testEmail, PASSWORD)
    setBusy(false)
    if (err) {
      setError(err)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-blue-50 px-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">One-CBSUA LMS v2</h1>
              <p className="text-sm text-gray-500">VLPv2 Prototype</p>
            </div>
          </div>
          <p className="text-gray-600 leading-relaxed mb-6">
            A unified learning management system serving Academic, Employee Learning & Development,
            and MOOC programs for Central Bicol State University of Agriculture.
          </p>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Login (Test Users)</h3>
            <div className="space-y-2">
              {TEST_USERS.map((u) => (
                <button
                  key={u.email}
                  onClick={() => quickLogin(u.email)}
                  disabled={busy}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition text-left disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-gray-700">{u.label}</span>
                  <span className="text-xs text-gray-400">{u.domain}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">All passwords: {PASSWORD}</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-2">Sign In</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials or use a quick login.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@vlpv2.test"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <div className="bg-error-50 border border-error-100 text-error-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
