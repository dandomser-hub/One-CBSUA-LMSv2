import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import ErrorNotice from '../components/ErrorNotice'
export default function MoocCatalogPage() {
  const { user, refreshProfile } = useAuth()
  const [offerings, setOfferings] = useState<any[]>([]),
    [enrolled, setEnrolled] = useState<string[]>([])
  const [loading, setLoading] = useState(true),
    [search, setSearch] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState('')
  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    Promise.all([
      supabase.rpc('public_mooc_catalog'),
      user
        ? supabase
            .from('enrollments')
            .select('offering_id')
            .eq('user_id', user.id)
            .in('status', ['active', 'completed'])
        : Promise.resolve({ data: [], error: null }),
    ]).then(([o, e]) => {
      if (!current) return
      if (o.error || e.error) setError(errorMessage(o.error || e.error))
      else {
        setOfferings(o.data || [])
        setEnrolled((e.data || []).map((x: any) => x.offering_id))
      }
      setLoading(false)
    })
    return () => {
      current = false
    }
  }, [user?.id])
  async function enroll(id: string) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('enroll_free_mooc', { p_offering: id })
    if (error) setError(errorMessage(error))
    else {
      setEnrolled((prev) => [...prev, id])
      setMessage('Enrollment confirmed.')
      await refreshProfile()
    }
    setBusy(false)
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">MOOC Catalog</h1>
      <p>Discover published university courses.</p>
      <ErrorNotice message={error} />
      {message && <p role="status">{message}</p>}
      <input
        aria-label="Search courses"
        className="input-field"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search courses"
      />
      {loading ? (
        <p>Loading catalog…</p>
      ) : offerings.length === 0 ? (
        <p className="text-muted">No courses are available in the public catalog yet. Please check back later.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {offerings
            .filter((o) =>
              `${o.title} ${o.description || ''}`.toLowerCase().includes(search.toLowerCase()),
            )
            .map((o) => (
              <article key={o.id} className="card">
                <h2 className="font-bold">{o.title}</h2>
                <p>{o.description}</p>
                <p>
                  {o.is_paid
                    ? 'Paid offering — contact the university for admission and payment verification.'
                    : 'Free offering'}
                </p>
                {!user ? (
                  <Link to="/login" className="btn-primary mt-3">
                    Sign in to enroll
                  </Link>
                ) : enrolled.includes(o.id) ? (
                  <Link className="btn-primary mt-3" to={`/offering/${o.id}`}>
                    Continue learning
                  </Link>
                ) : (
                  <button
                    className="btn-primary mt-3"
                    disabled={busy || o.is_paid}
                    onClick={() => void enroll(o.id)}
                  >
                    Enroll
                  </button>
                )}
              </article>
            ))}
        </div>
      )}
    </div>
  )
}
