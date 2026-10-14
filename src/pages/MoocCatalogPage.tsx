import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Offering } from '../types'
import { Globe, Loader2, Search, Lock, CheckCircle2, UserPlus } from 'lucide-react'

export default function MoocCatalogPage() {
  const { user } = useAuth()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [enrolling, setEnrolling] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('offerings')
        .select('*')
        .eq('domain', 'mooc')
        .eq('is_public', true)
      setOfferings((data || []) as Offering[])

      if (user) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('offering_id')
          .eq('user_id', user.id)
        setEnrolledIds(new Set((enrollments || []).map((e: any) => e.offering_id)))
      }
      setLoading(false)
    }
    load()
  }, [user])

  const handleEnroll = async (offering: Offering) => {
    if (!user) return
    setEnrolling(offering.id)
    setMessage(null)

    if (offering.is_paid) {
      setMessage(`This is a paid course. Payment confirmation via FMIS is required before access. (Simulated: Payment status = "${offering.payment_status}")`)
      setEnrolling(null)
      return
    }

    // Self-enroll in free MOOC
    const { error } = await supabase.from('enrollments').insert({
      user_id: user.id,
      offering_id: offering.id,
      role: 'learner',
      status: 'active',
    })

    if (error) {
      if (error.code === '23505') {
        setMessage('You are already enrolled in this course.')
      } else {
        setMessage('Enrollment failed: ' + error.message)
      }
    } else {
      setEnrolledIds((prev) => new Set([...prev, offering.id]))
      setMessage(`Successfully enrolled in "${offering.title}"`)
    }
    setEnrolling(null)
  }

  const filtered = offerings.filter(
    (o) =>
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      (o.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">MOOC Catalog</h1>
        <p className="text-sm text-gray-500 mt-1">
          Open online courses for distant learners. Self-enrollment available for free courses.
        </p>
      </div>

      {message && (
        <div className={`border rounded-lg px-4 py-3 text-sm ${
          message.includes('Successfully') || message.includes('already')
            ? 'bg-success-50 border-success-100 text-success-700'
            : 'bg-warning-50 border-warning-100 text-warning-700'
        }`}>
          {message}
        </div>
      )}

      <div className="relative">
        <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
          placeholder="Search MOOC courses..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o) => {
          const isEnrolled = enrolledIds.has(o.id)
          return (
            <div key={o.id} className="card flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {o.is_paid ? (
                    <span className="badge badge-warning"><Lock className="w-3 h-3 mr-1" />Paid</span>
                  ) : (
                    <span className="badge badge-success">Free</span>
                  )}
                  <span className="badge badge-mooc capitalize">{o.pacing.replace('_', '-')}</span>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{o.title}</h3>
              <p className="text-sm text-gray-500 mt-1 flex-1 line-clamp-3">{o.description}</p>
              {o.code && <p className="text-xs text-gray-400 mt-2">{o.code}</p>}

              <div className="mt-4">
                {isEnrolled ? (
                  <Link
                    to={`/offering/${o.id}`}
                    className="btn-secondary w-full"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Continue Learning
                  </Link>
                ) : (
                  <button
                    onClick={() => handleEnroll(o)}
                    disabled={enrolling === o.id}
                    className="btn-primary w-full"
                  >
                    {enrolling === o.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-1" /> Enroll Now</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="card text-center text-gray-400">No MOOC courses found.</div>
      )}
    </div>
  )
}
