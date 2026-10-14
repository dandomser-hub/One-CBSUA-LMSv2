import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOfferings } from '../hooks/useOfferings'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import ErrorNotice from '../components/ErrorNotice'
export default function GradebookPage() {
  const { user } = useAuth()
  const { items, loading, error: offeringError } = useOfferings()
  const [selected, setSelected] = useState(''),
    [grades, setGrades] = useState<any[]>([]),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [loadingGrades, setLoadingGrades] = useState(false)
  const course = items.find((i) => i.offering.id === selected)
  useEffect(() => {
    if (selected && !course) setSelected('')
  }, [selected, course])
  useEffect(() => {
    let current = true
    setGrades([])
    setError(null)
    if (!course || !user) return
    setLoadingGrades(true)
    let query = supabase
      .from('grades')
      .select('*, profiles!grades_profile_fkey(display_name)')
      .eq('offering_id', selected)
      .order('graded_at', { ascending: false })
    if (!course.can_manage) query = query.eq('user_id', user.id).eq('is_released', true)
    query.then(({ data, error }) => {
      if (current) {
        if (error) setError(errorMessage(error))
        else setGrades(data || [])
        setLoadingGrades(false)
      }
    })
    return () => {
      current = false
    }
  }, [selected, course?.can_manage, user?.id])
  async function release(g: any) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('release_grade', {
      p_grade: g.id,
      p_released: !g.is_released,
    })
    if (error) setError(errorMessage(error))
    else
      setGrades((prev) =>
        prev.map((x) => (x.id === g.id ? { ...x, is_released: !g.is_released } : x)),
      )
    setBusy(false)
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gradebook</h1>
      <p>Grades and release controls follow your role in the selected course.</p>
      <ErrorNotice message={error || offeringError} />
      {loading ? (
        <p>Loading courses…</p>
      ) : (
        <label>
          Course
          <select
            className="input-field"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a course</option>
            {items.map((x) => (
              <option key={x.offering.id} value={x.offering.id}>
                {x.offering.title} — {x.can_manage ? 'Instructor' : 'Learner'}
              </option>
            ))}
          </select>
        </label>
      )}
      {course &&
        (loadingGrades ? (
          <p>Loading grades…</p>
        ) : grades.length === 0 ? (
          <p>No {course.can_manage ? 'recorded' : 'released'} grades.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th>Assessment / attempt</th>
                  <th>Score</th>
                  <th>Release</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr key={g.id} className="border-t">
                    <td className="p-2">{g.profiles?.display_name || 'Learner'}</td>
                    <td>{g.item_name}</td>
                    <td>
                      {g.score} / {g.max_score}
                    </td>
                    <td>
                      {g.is_released ? 'Released' : 'Hidden'}
                      {course.can_manage && (
                        <button
                          className="btn-secondary m-2"
                          disabled={busy}
                          onClick={() => void release(g)}
                        >
                          {g.is_released ? 'Unrelease' : 'Release'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  )
}
