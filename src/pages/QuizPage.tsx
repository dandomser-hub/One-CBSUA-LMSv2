import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Quiz, Question, QuizAttempt, QuizAnswer } from '../types'
import {
  ArrowLeft,
  Clock,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  WifiOff,
  Wifi,
} from 'lucide-react'

export default function QuizPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const submittedRef = useRef(false)

  // Track online/offline status for resilience demo
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Load quiz and questions, then create or resume attempt
  useEffect(() => {
    if (!id || !user) return
    const load = async () => {
      setLoading(true)
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      setQuiz(quizData as Quiz | null)

      if (!quizData) {
        setLoading(false)
        return
      }

      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true })
      setQuestions((questionData || []) as Question[])

      // Check for existing in-progress attempt
      const { data: existingAttempt } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('quiz_id', id)
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .order('attempt_number', { ascending: false })
        .maybeSingle()

      if (existingAttempt) {
        // Resume existing attempt — restore autosaved answers
        setAttempt(existingAttempt as QuizAttempt)
        if (existingAttempt.autosave_state) {
          setAnswers(existingAttempt.autosave_state as Record<string, any>)
        }
        // Load previously saved answers
        const { data: savedAnswers } = await supabase
          .from('quiz_answers')
          .select('*')
          .eq('attempt_id', existingAttempt.id)
        if (savedAnswers) {
          const restored: Record<string, any> = {}
          ;(savedAnswers as QuizAnswer[]).forEach((a) => {
            restored[a.question_id] = a.answer_data
          })
          setAnswers(restored)
        }
      } else {
        // Count existing attempts to determine attempt number
        const { count } = await supabase
          .from('quiz_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('quiz_id', id)
          .eq('user_id', user.id)

        const attemptNum = (count || 0) + 1

        // Check attempt limit
        if (attemptNum > (quizData as Quiz).max_attempts) {
          setError('You have reached the maximum number of attempts for this quiz.')
          setLoading(false)
          return
        }

        // Create new attempt
        const { data: newAttempt, error: createErr } = await supabase
          .from('quiz_attempts')
          .insert({
            quiz_id: id,
            user_id: user.id,
            attempt_number: attemptNum,
            status: 'in_progress',
            max_score: (quizData as Quiz).total_points,
          })
          .select()
          .single()
        if (createErr) {
          setError('Failed to start quiz attempt.')
        } else {
          setAttempt(newAttempt as QuizAttempt)
        }
      }

      setLoading(false)
    }
    load()
  }, [id, user])

  // Timer countdown
  useEffect(() => {
    if (!quiz?.time_limit_minutes || !attempt) return
    const endTime = new Date(attempt.started_at).getTime() + quiz.time_limit_minutes * 60 * 1000
    const update = () => {
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0 && !submittedRef.current) {
        handleSubmit(true)
      }
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [quiz, attempt])

  // Autosave answers (resilience: saves to DB so disconnect doesn't lose data)
  const saveAnswers = useCallback(async () => {
    if (!attempt || !user || submittedRef.current) return
    setAutosaveStatus('saving')
    try {
      // Save autosave_state on the attempt
      await supabase
        .from('quiz_attempts')
        .update({ autosave_state: answers })
        .eq('id', attempt.id)

      // Upsert individual answers
      for (const [questionId, answerData] of Object.entries(answers)) {
        await supabase.from('quiz_answers').upsert(
          {
            attempt_id: attempt.id,
            question_id: questionId,
            answer_data: answerData,
          },
          { onConflict: 'attempt_id,question_id' }
        )
      }
      setAutosaveStatus('saved')
    } catch {
      setAutosaveStatus('error')
    }
  }, [attempt, answers, user])

  // Periodic autosave
  useEffect(() => {
    if (!attempt || loading) return
    autosaveTimer.current = setInterval(() => {
      if (Object.keys(answers).length > 0) {
        saveAnswers()
      }
    }, 10000) // Every 10 seconds
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current)
    }
  }, [attempt, answers, loading, saveAnswers])

  // Save on unmount
  useEffect(() => {
    return () => {
      if (attempt && Object.keys(answers).length > 0 && !submittedRef.current) {
        // Fire and forget — best effort
        supabase
          .from('quiz_attempts')
          .update({ autosave_state: answers })
          .eq('id', attempt.id)
      }
    }
  }, [attempt, answers])

  const setAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async (autoSubmit = false) => {
    if (!attempt || !user || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      // Final save of all answers
      await saveAnswers()

      // Calculate score for objective questions
      let totalScore = 0
      const answerUpdates: { id: string; is_correct: boolean; points_awarded: number }[] = []

      for (const q of questions) {
        const userAnswer = answers[q.id]
        let isCorrect = false
        let points = 0

        if (q.question_type === 'multiple_choice' && userAnswer && q.correct_answer) {
          isCorrect = userAnswer === q.correct_answer.correct
          points = isCorrect ? q.points : 0
        } else if (q.question_type === 'true_false' && userAnswer !== undefined && q.correct_answer) {
          isCorrect = String(userAnswer) === q.correct_answer.correct
          points = isCorrect ? q.points : 0
        } else if (q.question_type === 'short_answer' && userAnswer && q.correct_answer) {
          const expected = String(q.correct_answer.correct).toLowerCase().trim()
          const given = String(userAnswer).toLowerCase().trim()
          isCorrect = given.includes(expected)
          points = isCorrect ? q.points : 0
        } else if (q.question_type === 'essay') {
          // Essays remain pending until manually marked
          points = 0
        }

        totalScore += points

        // Update answer record
        await supabase
          .from('quiz_answers')
          .update({ is_correct: isCorrect, points_awarded: points })
          .eq('attempt_id', attempt.id)
          .eq('question_id', q.id)
      }

      // Mark attempt as submitted (duplicate prevention: check status first)
      const { data: currentAttempt } = await supabase
        .from('quiz_attempts')
        .select('status')
        .eq('id', attempt.id)
        .single()

      if (currentAttempt?.status === 'submitted') {
        // Already submitted — prevent duplicate
        setError('This attempt was already submitted. Duplicate submission prevented.')
        setSubmitting(false)
        return
      }

      const { error: submitErr } = await supabase
        .from('quiz_attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          score: totalScore,
        })
        .eq('id', attempt.id)

      if (submitErr) throw submitErr

      setResult({ score: totalScore, maxScore: quiz?.total_points ?? 0 })
    } catch (err) {
      setError('Failed to submit quiz. Your answers have been saved — please try again.')
      submittedRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (error && !attempt) {
    return (
      <div className="card text-center">
        <AlertTriangle className="w-8 h-8 text-warning-500 mx-auto mb-3" />
        <p className="text-gray-700">{error}</p>
        <Link to={`/offering/${quiz?.offering_id}`} className="text-primary-600 text-sm mt-3 inline-block">
          Back to course
        </Link>
      </div>
    )
  }

  if (result) {
    return (
      <div className="card text-center max-w-md mx-auto">
        <CheckCircle2 className="w-12 h-12 text-success-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Quiz Submitted</h2>
        <p className="text-3xl font-bold text-primary-600 mt-4">
          {result.score} / {result.maxScore}
        </p>
        <p className="text-sm text-gray-500 mt-2">
          {result.maxScore > 0
            ? `${Math.round((result.score / result.maxScore) * 100)}%`
            : 'Your score has been recorded.'}
        </p>
        <p className="text-xs text-gray-400 mt-4">
          Essay questions will be graded by your instructor and added to your final score.
        </p>
        <Link to={`/offering/${quiz?.offering_id}`} className="btn-primary mt-6 inline-flex">
          Back to Course
        </Link>
      </div>
    )
  }

  if (!quiz || !attempt) {
    return (
      <div className="card text-center">
        <p className="text-gray-500">Quiz not found or you do not have access.</p>
        <Link to="/dashboard" className="text-primary-600 text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const answeredCount = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== '').length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to={`/offering/${quiz.offering_id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Course
      </Link>

      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <span className="badge badge-academic capitalize mb-2">{quiz.quiz_type.replace('_', ' ')}</span>
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>
          </div>
          <div className="text-right space-y-2">
            {timeLeft !== null && (
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className={timeLeft < 60 ? 'text-error-600' : 'text-gray-600'}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 text-xs">
              {isOnline ? (
                <><Wifi className="w-3 h-3 text-success-500" /><span className="text-success-600">Online</span></>
              ) : (
                <><WifiOff className="w-3 h-3 text-error-500" /><span className="text-error-600">Offline</span></>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resilience status bar */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          {autosaveStatus === 'saving' && (
            <><Loader2 className="w-4 h-4 animate-spin text-primary-500" /><span className="text-primary-600">Saving answers...</span></>
          )}
          {autosaveStatus === 'saved' && (
            <><Save className="w-4 h-4 text-success-500" /><span className="text-success-600">Answers saved</span></>
          )}
          {autosaveStatus === 'idle' && (
            <><Save className="w-4 h-4 text-gray-300" /><span className="text-gray-400">Autosave every 10s</span></>
          )}
          {autosaveStatus === 'error' && (
            <><AlertTriangle className="w-4 h-4 text-error-500" /><span className="text-error-600">Save error — will retry</span></>
          )}
        </div>
        <span className="text-xs text-gray-400">{answeredCount} / {questions.length} answered</span>
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <div className="bg-warning-50 border border-warning-100 rounded-lg p-4 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning-800">Connection lost</p>
            <p className="text-xs text-warning-600 mt-1">
              Your answers are being saved locally and will sync when you reconnect. Do not close this page.
              If you reconnect, your progress will be preserved.
            </p>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-400">Question {idx + 1}</span>
                <p className="font-medium text-gray-900 mt-1">{q.question_text}</p>
              </div>
              <span className="text-xs text-gray-400 ml-3">{q.points} pts</span>
            </div>

            {q.question_type === 'multiple_choice' && q.options && (
              <div className="space-y-2">
                {(q.options as any[]).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                      answers[q.id] === opt.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(q.id, opt.id)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-gray-700">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'true_false' && (
              <div className="flex gap-3">
                {['true', 'false'].map((val) => (
                  <label
                    key={val}
                    className={`flex-1 flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition capitalize ${
                      answers[q.id] === val
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={val}
                      checked={answers[q.id] === val}
                      onChange={() => setAnswer(q.id, val)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <span className="text-sm text-gray-700">{val}</span>
                  </label>
                ))}
              </div>
            )}

            {q.question_type === 'short_answer' && (
              <input
                type="text"
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className="input-field"
                placeholder="Type your answer..."
              />
            )}

            {q.question_type === 'essay' && (
              <textarea
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                className="input-field min-h-[120px]"
                placeholder="Write your essay response..."
              />
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500">
          {answeredCount < questions.length
            ? `${questions.length - answeredCount} question(s) unanswered`
            : 'All questions answered'}
        </p>
        <button
          onClick={() => handleSubmit(false)}
          disabled={submitting || !isOnline}
          className="btn-primary"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Quiz'}
        </button>
      </div>

      {error && (
        <div className="bg-error-50 border border-error-100 text-error-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}
    </div>
  )
}
