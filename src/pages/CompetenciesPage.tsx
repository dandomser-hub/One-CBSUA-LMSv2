import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Offering, Competency, LearnerCompetency } from '../types'
import { ShieldCheck, Loader2, TrendingUp, Award } from 'lucide-react'

export default function CompetenciesPage() {
  const { user } = useAuth()
  const { isAdmin, isFacilitator } = useDomainAccess()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [selectedOffering, setSelectedOffering] = useState<string | null>(null)
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [learnerComps, setLearnerComps] = useState<LearnerCompetency[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canManage = isAdmin || isFacilitator

  useEffect(() => {
    const load = async () => {
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('*, offerings(*)')
        .eq('user_id', user?.id ?? '')
      const lndOfferings = (enrollmentData || [])
        .map((e: any) => e.offerings)
        .filter((o: any) => o?.domain === 'lnd')
      setOfferings(lndOfferings as Offering[])
      setLoading(false)
    }
    load()
  }, [user])

  useEffect(() => {
    if (!selectedOffering || !user) return
    const load = async () => {
      const { data: compData } = await supabase
        .from('competencies')
        .select('*')
        .eq('offering_id', selectedOffering)
      setCompetencies((compData || []) as Competency[])

      if (canManage) {
        const { data: rosterData } = await supabase
          .from('enrollments')
          .select('*, profiles(*)')
          .eq('offering_id', selectedOffering)
          .eq('status', 'active')
        setRoster(rosterData || [])

        const { data: allLcs } = await supabase
          .from('learner_competencies')
          .select('*')
          .in('competency_id', (compData || []).map((c: any) => c.id))
        setLearnerComps((allLcs || []) as LearnerCompetency[])
      } else {
        const { data: myLcs } = await supabase
          .from('learner_competencies')
          .select('*')
          .eq('user_id', user.id)
          .in('competency_id', (compData || []).map((c: any) => c.id))
        setLearnerComps((myLcs || []) as LearnerCompetency[])
      }
    }
    load()
  }, [selectedOffering, user, canManage])

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
        <h1 className="text-2xl font-bold text-gray-900">Competencies</h1>
        <p className="text-sm text-gray-500 mt-1">
          {canManage ? 'Track competency development across your L&D cohorts.' : 'Your competency progress in L&D programs.'}
        </p>
      </div>

      {!selectedOffering ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offerings.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedOffering(o.id)}
              className="card text-left hover:shadow-md transition"
            >
              <span className="badge badge-lnd">L&D</span>
              <h3 className="font-semibold text-gray-900 mt-2">{o.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{o.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelectedOffering(null)}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Back to programs
          </button>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Competency Framework</h3>
            <div className="space-y-4">
              {competencies.map((comp) => {
                const metCount = learnerComps.filter((lc) => lc.competency_id === comp.id && lc.is_met).length
                return (
                  <div key={comp.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{comp.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{comp.description}</p>
                        {canManage && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div
                                className="bg-success-500 h-2 rounded-full transition-all"
                                style={{ width: `${roster.length > 0 ? (metCount / roster.length) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{metCount}/{roster.length} met</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {!canManage && learnerComps.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Your Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competencies.map((comp) => {
                  const lc = learnerComps.find((l) => l.competency_id === comp.id)
                  return (
                    <div key={comp.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">{comp.name}</span>
                      {lc?.is_met ? (
                        <span className="badge badge-success"><Award className="w-3 h-3 mr-1" /> Met</span>
                      ) : (
                        <span className="badge badge-warning">In Progress</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
