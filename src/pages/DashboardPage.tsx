import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { supabase } from '../lib/supabase'
import { Offering, Enrollment, Domain } from '../types'
import {
  BookOpen,
  Briefcase,
  Globe,
  ClipboardList,
  TrendingUp,
  ShieldCheck,
  Server,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react'

export default function DashboardPage() {
  const { profile, memberships } = useAuth()
  const { domains, isAdmin, isFaculty, isFacilitator, isStudent, isLndLearner, isMoocLearner } =
    useDomainAccess()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Load enrollments for this user
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*, offerings(*)')
        .eq('user_id', profile?.user_id ?? '')

      setEnrollments((enrollmentData || []) as any)

      if (isAdmin) {
        // Admins see all offerings
        const { data: allOfferings } = await supabase.from('offerings').select('*')
        setOfferings((allOfferings || []) as Offering[])
      } else {
        // Extract offerings from enrollment data
        const enrolledOfferings = (enrollmentData || [])
          .map((e: any) => e.offerings)
          .filter(Boolean)
        setOfferings(enrolledOfferings as Offering[])
      }

      setLoading(false)
    }
    loadData()
  }, [profile, isAdmin])

  const academicOfferings = offerings.filter((o) => o.domain === 'academic')
  const lndOfferings = offerings.filter((o) => o.domain === 'lnd')
  const moocOfferings = offerings.filter((o) => o.domain === 'mooc')

  const stats = [
    {
      label: 'Academic Courses',
      value: academicOfferings.length,
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-600',
      show: domains.includes('academic') || isAdmin,
    },
    {
      label: 'L&D Programs',
      value: lndOfferings.length,
      icon: Briefcase,
      color: 'bg-green-50 text-green-600',
      show: domains.includes('lnd') || isAdmin,
    },
    {
      label: 'MOOC Courses',
      value: moocOfferings.length,
      icon: Globe,
      color: 'bg-amber-50 text-amber-600',
      show: domains.includes('mooc') || isAdmin,
    },
    {
      label: 'My Enrollments',
      value: enrollments.filter((e) => e.status === 'active').length,
      icon: ClipboardList,
      color: 'bg-primary-50 text-primary-600',
      show: !isAdmin,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          {profile?.display_name} — {memberships.length} membership(s) across {domains.length} domain(s)
        </p>
      </div>

      {/* Domain isolation proof banner */}
      {domains.length > 1 && (
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary-800">Multi-Domain Identity Active</p>
            <p className="text-xs text-primary-600 mt-1">
              You hold memberships in {domains.map((d) => d.toUpperCase()).join(', ')}. Each domain's
              courses and records are isolated — switching active domain filters what you see.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats
          .filter((s) => s.show)
          .map((stat) => (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Role badges */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3">Your Roles & Memberships</h3>
        <div className="flex flex-wrap gap-2">
          {memberships.map((m) => (
            <span
              key={m.id}
              className={`badge ${
                m.domain === 'academic'
                  ? 'badge-academic'
                  : m.domain === 'lnd'
                  ? 'badge-lnd'
                  : 'badge-mooc'
              }`}
            >
              {m.domain.toUpperCase()} — {m.role}
            </span>
          ))}
        </div>
      </div>

      {/* Enrolled courses */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">Your Courses & Programs</h3>
        {loading ? (
          <div className="card text-center text-gray-400">Loading...</div>
        ) : offerings.length === 0 ? (
          <div className="card text-center text-gray-400">
            No courses yet. {isMoocLearner && <Link to="/mooc" className="text-primary-600">Browse MOOC catalog</Link>}
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
                  <span
                    className={`badge ${
                      o.domain === 'academic'
                        ? 'badge-academic'
                        : o.domain === 'lnd'
                        ? 'badge-lnd'
                        : 'badge-mooc'
                    }`}
                  >
                    {o.domain === 'academic' ? 'Academic' : o.domain === 'lnd' ? 'L&D' : 'MOOC'}
                  </span>
                  {o.is_paid && <span className="badge badge-warning">Paid</span>}
                </div>
                <h4 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                  {o.title}
                </h4>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{o.description}</p>
                {o.code && <p className="text-xs text-gray-400 mt-2">{o.code}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
