import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Offering } from '../types'
import { BookOpen, Briefcase, Loader2, Plus, Lock } from 'lucide-react'

interface DomainListPageProps {
  domain: 'academic' | 'lnd'
}

export default function DomainListPage({ domain }: DomainListPageProps) {
  const { user } = useAuth()
  const { isAdmin, isFaculty, isFacilitator } = useDomainAccess()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [loading, setLoading] = useState(true)

  const canCreate =
    domain === 'academic'
      ? isAdmin || isFaculty
      : isAdmin || isFacilitator

  const domainLabel = domain === 'academic' ? 'Academic Courses' : 'L&D Programs'
  const DomainIcon = domain === 'academic' ? BookOpen : Briefcase
  const badgeClass = domain === 'academic' ? 'badge-academic' : 'badge-lnd'

  useEffect(() => {
    const load = async () => {
      if (isAdmin) {
        const { data } = await supabase.from('offerings').select('*').eq('domain', domain)
        setOfferings((data || []) as Offering[])
      } else {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*, offerings(*)')
          .eq('user_id', user?.id ?? '')
        const domainOfferings = (enrollmentData || [])
          .map((e: any) => e.offerings)
          .filter((o: any) => o?.domain === domain)
        setOfferings(domainOfferings as Offering[])
      }
      setLoading(false)
    }
    load()
  }, [domain, user, isAdmin])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{domainLabel}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {domain === 'academic'
              ? 'Collegiate, graduate, special, and short-term academic offerings.'
              : 'Employee Learning & Development training programs and cohorts.'}
          </p>
        </div>
      </div>

      {offerings.length === 0 ? (
        <div className="card text-center text-gray-400">
          No {domainLabel.toLowerCase()} available.
          {!canCreate && (
            <p className="mt-2">
              <Link to="/mooc" className="text-primary-600">Browse the MOOC catalog to enroll</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerings.map((o) => (
            <Link
              key={o.id}
              to={`/offering/${o.id}`}
              className="card hover:shadow-md transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  domain === 'academic' ? 'bg-blue-50' : 'bg-green-50'
                }`}>
                  <DomainIcon className={`w-5 h-5 ${domain === 'academic' ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <span className={`badge ${badgeClass}`}>
                  {domain === 'academic' ? 'Academic' : 'L&D'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                {o.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{o.description}</p>
              {o.code && <p className="text-xs text-gray-400 mt-2">{o.code}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
