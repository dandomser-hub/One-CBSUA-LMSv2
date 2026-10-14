import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { useAuth } from '../context/AuthContext'
import { useOfferingAccess } from '../hooks/useOfferings'
import { useQuizAttempt } from '../hooks/useQuizAttempt'
import ErrorNotice from '../components/ErrorNotice'
import { Quiz, Question } from '../types'
export default function QuizPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [quiz, setQuiz] = useState<Quiz | null>(null),
    [questions, setQuestions] = useState<Question[]>([])
  const [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true)
  const access = useOfferingAccess(quiz?.offering_id)
  useEffect(() => {
    let current = true
    setLoading(true)
    setError(null)
    setQuiz(null)
    Promise.all([
      supabase.from('quizzes').select('*').eq('id', id!).single(),
      supabase.from('questions').select('*').eq('quiz_id', id!).order('order_index'),
    ]).then(([q, qs]) => {
      if (!current) return
      if (q.error || qs.error) setError(errorMessage(q.error || qs.error))
      else {
        setQuiz(q.data)
        setQuestions(qs.data || [])
      }
      setLoading(false)
    })
    return () => {
      current = false
    }
  }, [id])
  if (loading) return <p>Loading quiz…</p>
  if (error || !quiz) return <ErrorNotice message={error || 'Quiz unavailable.'} />
  if (access.loading) return <p>Checking course access…</p>
  if (access.error) return <ErrorNotice message={access.error} />
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Link to={`/offering/${quiz.offering_id}`} className="text-link">
        ← Back to course
      </Link>
      <h1 className="text-2xl font-bold">{quiz.title}</h1>
      {access.canManage ? (
        <InstructorQuiz quiz={quiz} />
      ) : access.learner && user ? (
        <LearnerQuiz
          key={`${user.id}:${quiz.id}`}
          quiz={quiz}
          questions={questions}
          userId={user.id}
        />
      ) : (
        <ErrorNotice message="An active learner enrollment is required to take this quiz." />
      )}
    </div>
  )
}
function LearnerQuiz({
  quiz,
  questions,
  userId,
}: {
  quiz: Quiz
  questions: Question[]
  userId: string
}) {
  const engine = useQuizAttempt(quiz.id, userId)
  if (engine.loading) return <p>Starting or resuming your attempt…</p>
  if (engine.result)
    return (
      <div className="card">
        <h2 className="font-bold">Quiz submitted</h2>
        <p>Your submission receipt: {engine.result.id}</p>
        <p>Released results are available in your gradebook.</p>
        {engine.result.expired && (
          <p>The deadline passed. The server used the last answers saved before the deadline.</p>
        )}
        <Link to="/gradebook" className="text-link">
          View gradebook
        </Link>
      </div>
    )
  return (
    <>
      <ErrorNotice message={engine.error} />
      {engine.attempt && (
        <>
          <div className="card flex justify-between" aria-live="polite">
            <span>{engine.status}</span>
            <span>
              {engine.remaining !== null
                ? `${Math.floor(engine.remaining / 60)}:${String(engine.remaining % 60).padStart(2, '0')}`
                : 'Untimed'}
            </span>
          </div>
          {!engine.online && (
            <p role="status" className="card">
              Offline. Drafts stay on this device. Reconnect before the deadline to save them to the
              server; late submissions use the last server save.
            </p>
          )}
          {questions.map((q, i) => (
            <fieldset
              key={q.id}
              className="card"
              disabled={engine.submitting || engine.remaining === 0}
            >
              <legend className="font-semibold">
                {i + 1}. {q.question_text} ({q.points} points)
              </legend>
              {q.question_type === 'multiple_choice' &&
                (q.options || []).map((opt) => (
                  <label key={opt.id} className="block p-2">
                    <input
                      type="radio"
                      name={q.id}
                      checked={engine.answers[q.id] === opt.id}
                      onChange={() => engine.setAnswer(q.id, opt.id)}
                    />{' '}
                    {opt.text}
                  </label>
                ))}
              {q.question_type === 'true_false' &&
                ['true', 'false'].map((value) => (
                  <label key={value} className="block p-2">
                    <input
                      type="radio"
                      name={q.id}
                      checked={engine.answers[q.id] === value}
                      onChange={() => engine.setAnswer(q.id, value)}
                    />{' '}
                    {value}
                  </label>
                ))}
              {['short_answer', 'essay'].includes(q.question_type) && (
                <textarea
                  aria-label={`Answer ${i + 1}`}
                  className="input-field"
                  rows={q.question_type === 'essay' ? 5 : 2}
                  value={engine.answers[q.id] || ''}
                  onChange={(e) => engine.setAnswer(q.id, e.target.value)}
                />
              )}
              {!['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(
                q.question_type,
              ) && (
                <ErrorNotice message="This question type requires instructor correction before the quiz can be used." />
              )}
            </fieldset>
          ))}
          <div className="flex gap-3">
            <button
              onClick={() => void engine.save()}
              disabled={engine.submitting || !engine.online || engine.remaining === 0}
              className="btn-secondary"
            >
              Save now
            </button>
            <button
              onClick={() => void engine.submit()}
              disabled={engine.submitting || !engine.online}
              className="btn-primary"
            >
              {engine.submitting ? 'Submitting…' : 'Submit quiz'}
            </button>
          </div>
        </>
      )}
    </>
  )
}
function InstructorQuiz({ quiz }: { quiz: Quiz }) {
  const [attempts, setAttempts] = useState<any[]>([]),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false)
  async function load() {
    const { data, error } = await supabase.rpc('quiz_results', { p_quiz: quiz.id })
    if (error) setError(errorMessage(error))
    else setAttempts(data || [])
    setLoading(false)
  }
  useEffect(() => {
    void load()
  }, [quiz.id])
  async function mark(id: string) {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('mark_quiz_answer', {
      p_answer: id,
      p_score: Number(scores[id]),
    })
    if (error) setError(errorMessage(error))
    else await load()
    setBusy(false)
  }
  return (
    <>
      <ErrorNotice message={error} />
      <p>Instructor review. Taking a learner attempt is separate from managing this course.</p>
      {loading ? (
        <p>Loading attempts…</p>
      ) : attempts.length === 0 ? (
        <p>No attempts yet.</p>
      ) : (
        attempts.map((a) => (
          <section key={a.id} className="card space-y-3">
            <h2 className="font-bold">
              {a.display_name} — attempt {a.attempt_number}
            </h2>
            <p>
              {a.status} · {a.score ?? '—'} / {a.max_score}
            </p>
            {a.answers.map((answer: any) => (
              <div key={answer.id} className="border-t pt-2">
                <p>{answer.question_text}</p>
                <p className="whitespace-pre-wrap">{answer.answer_data ?? '(unanswered)'}</p>
                <p>
                  {answer.is_correct === null
                    ? 'Needs marking'
                    : `${answer.points_awarded} / ${answer.points}`}
                </p>
                {['submitted', 'graded'].includes(a.status) && (
                  <div className="flex gap-2">
                    <input
                      aria-label={`Score for ${answer.id}`}
                      className="input-field"
                      type="number"
                      min="0"
                      max={answer.points}
                      value={scores[answer.id] ?? ''}
                      onChange={(e) => setScores({ ...scores, [answer.id]: e.target.value })}
                    />
                    <button
                      className="btn-secondary"
                      disabled={busy || !scores[answer.id]?.trim()}
                      onClick={() => void mark(answer.id)}
                    >
                      Save mark
                    </button>
                  </div>
                )}
              </div>
            ))}
          </section>
        ))
      )}
      <Link className="text-link" to="/gradebook">
        Release completed marks in Gradebook
      </Link>
    </>
  )
}
