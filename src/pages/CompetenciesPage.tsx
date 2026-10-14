import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useOfferings } from '../hooks/useOfferings'
import ErrorNotice from '../components/ErrorNotice'
import { errorMessage } from '../lib/errors'
import { Offering, Competency, LearnerCompetency } from '../types'
import { ShieldCheck, Loader2, TrendingUp, Award } from 'lucide-react'

export default function CompetenciesPage() {
  const { user } = useAuth()
  const { items, error: courseError } = useOfferings()
  const [error, setError] = useState<string | null>(null)
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [selectedOffering, setSelectedOffering] = useState<string | null>(null)
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [learnerComps, setLearnerComps] = useState<LearnerCompetency[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canManage = !!items.find((x) => x.offering.id === selectedOffering)?.can_manage
  useEffect(() => {
    setOfferings(items.filter((x) => x.offering.domain === 'lnd').map((x) => x.offering))
    if (selectedOffering && !items.some((x) => x.offering.id === selectedOffering))
      setSelectedOffering(null)
    setLoading(false)
  }, [JSON.stringify(items), selectedOffering])

  useEffect(() => {
    if (!selectedOffering || !user) return
    const load = async () => {
      const { data: compData, error: compError } = await supabase
        .from('competencies')
        .select('*')
        .eq('offering_id', selectedOffering)
      if (compError) {
        setError(errorMessage(compError))
        return
      }
      setCompetencies((compData || []) as Competency[])

      if (canManage) {
        const { data: rosterData, error: rosterError } = await supabase
          .from('enrollments')
          .select('*, profiles!enrollments_profile_fkey(display_name)')
          .eq('offering_id', selectedOffering)
          .eq('status', 'active')
        if (rosterError) setError(errorMessage(rosterError))
        setRoster(rosterData || [])

        const { data: allLcs, error: allError } = await supabase
          .from('learner_competencies')
          .select('*')
          .in(
            'competency_id',
            (compData || []).map((c: any) => c.id),
          )
        if (allError) setError(errorMessage(allError))
        setLearnerComps((allLcs || []) as LearnerCompetency[])
      } else {
        const { data: myLcs, error: myError } = await supabase
          .from('learner_competencies')
          .select('*')
          .eq('user_id', user.id)
          .in(
            'competency_id',
            (compData || []).map((c: any) => c.id),
          )
        if (myError) setError(errorMessage(myError))
        setLearnerComps((myLcs || []) as LearnerCompetency[])
      }
    }
    load()
  }, [selectedOffering, user, canManage])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-link" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ErrorNotice message={error || courseError} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Competencies</h1>
        <p className="text-sm text-muted mt-1">
          {canManage
            ? 'Track competency development across your L&D cohorts.'
            : 'Your competency progress in L&D programs.'}
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
              <h3 className="font-semibold text-foreground mt-2">{o.title}</h3>
              <p className="text-sm text-muted mt-1 line-clamp-2">{o.description}</p>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelectedOffering(null)}
            className="text-sm text-link hover:underline"
          >
            ← Back to programs
          </button>

          <div className="card">
            <h3 className="font-semibold text-foreground mb-4">Competency Framework</h3>
            <div className="space-y-4">
              {competencies.map((comp) => {
                const metCount = learnerComps.filter(
                  (lc) => lc.competency_id === comp.id && lc.is_met,
                ).length
                return (
                  <div key={comp.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-success-text flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{comp.name}</p>
                        <p className="text-sm text-muted mt-1">{comp.description}</p>
                        {canManage && (
                          <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 bg-surface-alt rounded-full h-2">
                              <div
                                className="bg-success h-2 rounded-full transition-all"
                                style={{
                                  width: `${roster.length > 0 ? (metCount / roster.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted">
                              {metCount}/{roster.length} met
                            </span>
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
              <h3 className="font-semibold text-foreground mb-4">Your Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {competencies.map((comp) => {
                  const lc = learnerComps.find((l) => l.competency_id === comp.id)
                  return (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-3 border border-border rounded-lg"
                    >
                      <span className="text-sm font-medium text-foreground">{comp.name}</span>
                      {lc?.is_met ? (
                        <span className="badge badge-success">
                          <Award className="w-3 h-3 mr-1" /> Met
                        </span>
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
