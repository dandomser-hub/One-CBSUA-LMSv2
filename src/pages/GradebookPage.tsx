import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Offering, Grade } from '../types'
import { ClipboardList, Loader2, Lock, Unlock, TrendingUp } from 'lucide-react'

export default function GradebookPage() {
  const { user } = useAuth()
  const { isAdmin, isFaculty } = useDomainAccess()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [selectedOffering, setSelectedOffering] = useState<string | null>(null)
  const [grades, setGrades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const canManage = isAdmin || isFaculty

  useEffect(() => {
    const load = async () => {
      if (canManage) {
        // Faculty/admin: load offerings they manage
        const { data: offeringsData } = await supabase
          .from('offerings')
          .select('*')
          .or(`created_by.eq.${user?.id}`)
        setOfferings((offeringsData || []) as Offering[])
      } else {
        // Student: load their grades
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*, offerings(*)')
          .eq('user_id', user?.id ?? '')
        const enrolledOfferings = (enrollmentData || []).map((e: any) => e.offerings).filter(Boolean)
        setOfferings(enrolledOfferings as Offering[])
      }
      setLoading(false)
    }
    load()
  }, [user, canManage])

  useEffect(() => {
    if (!selectedOffering || !user) return
    const loadGrades = async () => {
      if (canManage) {
        const { data } = await supabase
          .from('grades')
          .select('*, profiles(*)')
          .eq('offering_id', selectedOffering)
          .order('item_name', { ascending: true })
        setGrades(data || [])
      } else {
        const { data } = await supabase
          .from('grades')
          .select('*')
          .eq('offering_id', selectedOffering)
          .eq('user_id', user.id)
          .eq('is_released', true)
        setGrades(data || [])
      }
    }
    loadGrades()
  }, [selectedOffering, user, canManage])

  const toggleRelease = async (gradeId: string, current: boolean) => {
    await supabase.from('grades').update({ is_released: !current }).eq('id', gradeId)
    setGrades((prev) =>
      prev.map((g) => (g.id === gradeId ? { ...g, is_released: !current } : g))
    )
  }

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
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <p className="text-sm text-gray-500 mt-1">
          {canManage
            ? 'View and release grades for your courses. Learners see only released grades.'
            : 'Your released grades across enrolled courses.'}
        </p>
      </div>

      {!selectedOffering ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerings.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedOffering(o.id)}
              className="card text-left hover:shadow-md transition"
            >
              <span className={`badge ${o.domain === 'academic' ? 'badge-academic' : o.domain === 'lnd' ? 'badge-lnd' : 'badge-mooc'}`}>
                {o.domain}
              </span>
              <h3 className="font-semibold text-gray-900 mt-2">{o.title}</h3>
              {o.code && <p className="text-xs text-gray-400">{o.code}</p>}
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => setSelectedOffering(null)}
            className="text-sm text-primary-600 hover:underline"
          >
            ← Back to course list
          </button>

          {grades.length === 0 ? (
            <div className="card text-center text-gray-400">No grades recorded yet.</div>
          ) : canManage ? (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Learner</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Item</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Type</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-600">Score</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">Released</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((g: any) => (
                    <tr key={g.id} className="border-b border-gray-50">
                      <td className="py-2 px-3">{g.profiles?.display_name ?? 'Unknown'}</td>
                      <td className="py-2 px-3">{g.item_name}</td>
                      <td className="py-2 px-3 capitalize">{g.item_type}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {g.score} / {g.max_score}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {g.is_released ? (
                          <span className="badge badge-success"><Unlock className="w-3 h-3 mr-1" />Released</span>
                        ) : (
                          <span className="badge badge-warning"><Lock className="w-3 h-3 mr-1" />Hidden</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => toggleRelease(g.id, g.is_released)}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          {g.is_released ? 'Unrelease' : 'Release'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {grades.map((g: Grade) => (
                <div key={g.id} className="card flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{g.item_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{g.item_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary-600">
                      {g.score} / {g.max_score}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.round((g.score / g.max_score) * 100)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
