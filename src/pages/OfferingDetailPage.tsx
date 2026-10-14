import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { useOfferingAccess } from '../hooks/useOfferings'
import ErrorNotice from '../components/ErrorNotice'
import { Offering, Lesson, Quiz, Assignment } from '../types'
export default function OfferingDetailPage() {
  const { id } = useParams()
  const access = useOfferingAccess(id)
  const [offering, setOffering] = useState<Offering | null>(null),
    [lessons, setLessons] = useState<Lesson[]>([]),
    [quizzes, setQuizzes] = useState<Quiz[]>([]),
    [assignments, setAssignments] = useState<Assignment[]>([]),
    [roster, setRoster] = useState<any[]>([])
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [tab, setTab] = useState('lessons')
  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    setTab('lessons')
    setOffering(null)
    Promise.all([
      supabase.from('offerings').select('*').eq('id', id!).single(),
      supabase.from('lessons').select('*').eq('offering_id', id!).order('order_index'),
      supabase.from('quizzes').select('*').eq('offering_id', id!).order('created_at'),
      supabase.from('assignments').select('*').eq('offering_id', id!).order('due_date'),
    ]).then(([o, l, q, a]) => {
      if (!current) return
      const e = o.error || l.error || q.error || a.error
      if (e) setError(errorMessage(e))
      else {
        setOffering(o.data)
        setLessons(l.data || [])
        setQuizzes(q.data || [])
        setAssignments(a.data || [])
      }
      setLoading(false)
    })
    return () => {
      current = false
    }
  }, [id])
  useEffect(() => {
    let current = true
    setRoster([])
    if (!access.canManage) return
    supabase
      .from('enrollments')
      .select('*, profiles!enrollments_profile_fkey(display_name,email,external_id)')
      .eq('offering_id', id!)
      .eq('status', 'active')
      .then(({ data, error }) => {
        if (current) {
          if (error) setError(errorMessage(error))
          else setRoster(data || [])
        }
      })
    return () => {
      current = false
    }
  }, [id, access.canManage])
  if (loading) return <p>Loading course…</p>
  if (!offering) return <ErrorNotice message={error || 'Course unavailable.'} />
  return (
    <div className="space-y-4">
      <Link to="/dashboard" className="text-link">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold">{offering.title}</h1>
      <p>{offering.description}</p>
      <p>
        {offering.domain.toUpperCase()} · {offering.code} · {offering.start_date || 'No start date'}{' '}
        – {offering.end_date || 'No end date'}
      </p>
      <ErrorNotice message={error || access.error} />
      <nav className="flex flex-wrap gap-2" aria-label="Course sections">
        {['lessons', 'quizzes', 'assignments', ...(access.canManage ? ['roster'] : [])].map((x) => (
          <button
            className={tab === x ? 'btn-primary' : 'btn-secondary'}
            key={x}
            onClick={() => setTab(x)}
          >
            {x}
          </button>
        ))}
      </nav>
      {tab === 'lessons' &&
        (lessons.length ? (
          lessons.map((l) => (
            <article className="card" key={l.id}>
              <h2 className="font-bold">
                {l.title} {!l.is_published && '(Draft)'}
              </h2>
              <p className="whitespace-pre-wrap">{l.content}</p>
            </article>
          ))
        ) : (
          <p>No lessons available.</p>
        ))}
      {tab === 'quizzes' &&
        (quizzes.length ? (
          quizzes.map((q) => (
            <Link className="card block" key={q.id} to={`/quiz/${q.id}`}>
              <h2 className="font-bold">{q.title}</h2>
              <p>
                {q.total_points} points · {q.max_attempts} attempts · {q.time_limit_minutes || 'No'}{' '}
                minute limit
              </p>
              <p>
                {access.canManage ? 'Review learner attempts' : 'Open quiz'}{' '}
                {!q.is_published && '· Draft'}
              </p>
            </Link>
          ))
        ) : (
          <p>No quizzes available.</p>
        ))}
      {tab === 'assignments' &&
        (assignments.length ? (
          assignments.map((a) => (
            <Link className="card block" key={a.id} to={`/assignment/${a.id}`}>
              <h2 className="font-bold">{a.title}</h2>
              <p>
                {a.max_points} points ·{' '}
                {a.due_date ? new Date(a.due_date).toLocaleString() : 'No deadline'}{' '}
                {!a.is_published && '· Draft'}
              </p>
            </Link>
          ))
        ) : (
          <p>No assignments available.</p>
        ))}
      {tab === 'roster' && access.canManage && (
        <section className="card">
          <h2 className="font-bold">Active roster ({roster.length})</h2>
          {roster.map((r) => (
            <div key={r.id} className="border-t py-2">
              <p>
                {r.profiles?.display_name} · {r.role}
              </p>
              <p>
                {r.profiles?.external_id} {r.profiles?.email}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
