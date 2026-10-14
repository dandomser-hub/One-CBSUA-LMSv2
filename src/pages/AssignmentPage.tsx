import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { useAuth } from '../context/AuthContext'
import { useOfferingAccess } from '../hooks/useOfferings'
import ErrorNotice from '../components/ErrorNotice'
import { Assignment, Submission } from '../types'
type Row = Submission & { display_name: string; is_released: boolean }
export default function AssignmentPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [assignment, setAssignment] = useState<Assignment | null>(null),
    [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false)
  const [content, setContent] = useState(''),
    [scores, setScores] = useState<Record<string, string>>({}),
    [feedback, setFeedback] = useState<Record<string, string>>({})
  const [extensions, setExtensions] = useState<Record<string, string>>({}),
    [roster, setRoster] = useState<any[]>([]),
    [myDue, setMyDue] = useState<string | null>(null)
  const access = useOfferingAccess(assignment?.offering_id)
  async function reload() {
    const { data, error } = await supabase.rpc('list_submissions', { p_assignment: id })
    if (error) throw error
    setRows(data || [])
  }
  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    setAssignment(null)
    setRows([])
    Promise.all([
      supabase.from('assignments').select('*').eq('id', id!).single(),
      supabase.rpc('list_submissions', { p_assignment: id }),
      supabase
        .from('assignment_extensions')
        .select('due_at')
        .eq('assignment_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle(),
    ]).then(([a, s, e]) => {
      if (!current) return
      if (a.error || s.error || e.error) setError(errorMessage(a.error || s.error || e.error))
      else {
        setAssignment(a.data)
        setRows(s.data || [])
        setMyDue(e.data?.due_at || null)
      }
      setLoading(false)
    })
    return () => {
      current = false
    }
  }, [id, user?.id])
  useEffect(() => {
    let current = true
    if (!access.canManage || !assignment) return
    supabase
      .from('enrollments')
      .select('user_id, profiles!enrollments_profile_fkey(display_name)')
      .eq('offering_id', assignment.offering_id)
      .eq('status', 'active')
      .in('role', ['student', 'learner'])
      .then(({ data, error }) => {
        if (current) {
          if (error) setError(errorMessage(error))
          else setRoster(data || [])
        }
      })
    return () => {
      current = false
    }
  }, [access.canManage, assignment?.id])
  async function action(work: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      await work()
      await reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  const mine = rows.filter((s) => s.user_id === user?.id),
    latest = mine[0]
  if (loading) return <p>Loading assignment…</p>
  if (!assignment) return <ErrorNotice message={error || 'Assignment unavailable.'} />
  const due = myDue || assignment.due_date
  const closed = !!due && Date.now() > new Date(due).getTime() && !assignment.allow_late
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link to={`/offering/${assignment.offering_id}`} className="text-link">
        ← Back to course
      </Link>
      <h1 className="text-2xl font-bold">{assignment.title}</h1>
      <p>{assignment.description}</p>
      <p>
        {assignment.max_points} points ·{' '}
        {due ? `Due ${new Date(due).toLocaleString()}` : 'No deadline'}
        {myDue ? ' (extension)' : ''}
      </p>
      <ErrorNotice message={error || access.error} />
      {message && (
        <p role="status" className="card">
          {message}
        </p>
      )}
      {access.loading ? (
        <p>Checking access…</p>
      ) : access.canManage ? (
        <>
          <h2 className="font-bold">Submissions ({rows.length})</h2>
          {rows.length === 0 && <p>No submissions yet.</p>}
          {rows.map((s) => (
            <section key={s.id} className="card space-y-2">
              <h3 className="font-semibold">{s.display_name}</h3>
              <p>
                {new Date(s.submitted_at).toLocaleString()} · {s.status}
              </p>
              <p className="whitespace-pre-wrap">{s.content}</p>
              <p>
                Recorded score: {s.grade ?? 'Unmarked'} ·{' '}
                {s.is_released ? 'Released' : 'Not released'}
              </p>
              <label className="block">
                Score
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  max={assignment.max_points}
                  value={scores[s.id] ?? ''}
                  onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                />
              </label>
              <label className="block">
                Feedback
                <textarea
                  className="input-field"
                  value={feedback[s.id] ?? ''}
                  onChange={(e) => setFeedback({ ...feedback, [s.id]: e.target.value })}
                />
              </label>
              <button
                className="btn-primary"
                disabled={busy || !scores[s.id]?.trim()}
                onClick={() =>
                  void action(async () => {
                    const { error } = await supabase.rpc('grade_submission', {
                      p_submission: s.id,
                      p_score: Number(scores[s.id]),
                      p_feedback: feedback[s.id] || '',
                    })
                    if (error) throw error
                    setMessage('Mark saved. Release it through Gradebook when ready.')
                  })
                }
              >
                Save mark
              </button>
            </section>
          ))}
          <section className="card">
            <h2 className="font-bold mb-2">Individual extensions</h2>
            {roster.map((r) => (
              <div key={r.user_id} className="flex flex-wrap gap-2 my-2 items-center">
                <span>{r.profiles?.display_name}</span>
                <input
                  aria-label={`Extension for ${r.profiles?.display_name}`}
                  type="datetime-local"
                  className="input-field max-w-xs"
                  value={extensions[r.user_id] || ''}
                  onChange={(e) => setExtensions({ ...extensions, [r.user_id]: e.target.value })}
                />
                <button
                  className="btn-secondary"
                  disabled={busy || !extensions[r.user_id]}
                  onClick={() =>
                    void action(async () => {
                      const { error } = await supabase.rpc('set_assignment_extension', {
                        p_assignment: id,
                        p_user: r.user_id,
                        p_due: new Date(extensions[r.user_id]).toISOString(),
                      })
                      if (error) throw error
                      setMessage('Extension saved.')
                    })
                  }
                >
                  Grant extension
                </button>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          {mine.map((s, i) => (
            <section key={s.id} className="card">
              <h2 className="font-bold">{i === 0 ? 'Latest submission' : 'Previous submission'}</h2>
              <p>Receipt: {s.id}</p>
              <p className="whitespace-pre-wrap">{s.content}</p>
              {s.grade !== null ? (
                <p>
                  Released grade: {s.grade} / {assignment.max_points}
                  <br />
                  Feedback: {s.feedback}
                </p>
              ) : (
                <p>Awaiting marking or release.</p>
              )}
            </section>
          ))}
          {access.learner && (!latest || assignment.allow_resubmission) ? (
            <section className="card">
              <label>
                Submission
                <textarea
                  className="input-field min-h-[160px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={busy || closed}
                />
              </label>
              <button
                disabled={busy || closed || !content.trim()}
                className="btn-primary mt-3"
                onClick={() =>
                  void action(async () => {
                    const { data, error } = await supabase.rpc('submit_assignment', {
                      p_assignment: id,
                      p_content: content,
                    })
                    if (error) throw error
                    setContent('')
                    setMessage(`Submission received. Receipt: ${data}`)
                  })
                }
              >
                {latest ? 'Resubmit' : 'Submit'}
              </button>
              {closed && <p>The deadline has passed. Ask your instructor for an extension.</p>}
            </section>
          ) : (
            <p>{latest ? 'Resubmission is disabled.' : 'Active learner enrollment required.'}</p>
          )}
        </>
      )}
    </div>
  )
}
