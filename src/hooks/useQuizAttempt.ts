import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { QuizAttempt } from '../types'
export type Answers = Record<string, string>
interface Attempt extends QuizAttempt {
  deadline: string | null
  server_now: string
}
export function useQuizAttempt(quizId: string, userId: string) {
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('Not saved yet')
  const [online, setOnline] = useState(navigator.onLine)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [result, setResult] = useState<{ id: string; status: string; expired?: boolean } | null>(
    null,
  )
  const [submitting, setSubmitting] = useState(false)
  const answersRef = useRef<Answers>({}),
    attemptRef = useRef<Attempt | null>(null)
  const submittingRef = useRef(false),
    completed = useRef(false),
    mounted = useRef(true)
  const pending = useRef<Promise<void>>(Promise.resolve()),
    offset = useRef(0),
    key = useRef('')
  const revision = useRef(0)
  const persist = useCallback((value: Answers) => {
    try {
      if (key.current) localStorage.setItem(key.current, JSON.stringify(value))
      return true
    } catch {
      setError('Browser draft storage is unavailable. Keep this page open and use Save now.')
      return false
    }
  }, [])
  useEffect(() => {
    let current = true
    mounted.current = true
    const on = () => setOnline(true),
      off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    async function load() {
      try {
        const { data, error } = await supabase.rpc('start_quiz', { p_quiz: quizId })
        if (error) throw error
        if (!current) return
        const a = data as Attempt
        attemptRef.current = a
        setAttempt(a)
        offset.current = new Date(a.server_now).getTime() - Date.now()
        key.current = `vlpv2:quiz:${userId}:${a.id}`
        let restored: Answers = a.autosave_state || {}
        try {
          const local = localStorage.getItem(key.current)
          if (local) {
            const parsed = JSON.parse(local)
            if (
              parsed &&
              typeof parsed === 'object' &&
              !Array.isArray(parsed) &&
              Object.values(parsed).every((v) => typeof v === 'string')
            )
              restored = parsed
          }
        } catch {
          setError('Could not read the browser draft. The last server save was restored.')
        }
        answersRef.current = restored
        setAnswers(restored)
        setStatus('Draft restored; awaiting server save')
      } catch (e) {
        if (current) setError(errorMessage(e))
      } finally {
        if (current) setLoading(false)
      }
    }
    load()
    return () => {
      current = false
      mounted.current = false
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [quizId, userId])
  const save = useCallback(async () => {
    const a = attemptRef.current
    if (!a || completed.current || submittingRef.current) return
    const snapshot = { ...answersRef.current },
      version = revision.current
    if (!navigator.onLine) {
      if (persist(snapshot)) setStatus('Saved on this device; waiting for connection')
      return
    }
    const work = pending.current.then(async () => {
      if (completed.current) return
      if (mounted.current) setStatus('Saving…')
      const { error } = await supabase.rpc('save_quiz_answers', {
        p_attempt: a.id,
        p_answers: snapshot,
      })
      if (error) throw error
      if (mounted.current)
        setStatus(
          version === revision.current ? 'Saved to server' : 'Newer changes waiting to save',
        )
    })
    pending.current = work.catch(() => {})
    try {
      await work
    } catch (e) {
      if (mounted.current) {
        setStatus('Server save failed; draft retained on this device')
        setError(errorMessage(e))
      }
    }
  }, [persist])
  const submit = useCallback(async () => {
    const a = attemptRef.current
    if (!a || submittingRef.current || completed.current) return
    if (!navigator.onLine) {
      setError('Reconnect to submit. Your draft remains on this device.')
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    const snapshot = { ...answersRef.current }
    persist(snapshot)
    try {
      await pending.current
      // One server transaction saves this exact final snapshot, scores it and closes the attempt.
      const { data, error } = await supabase.rpc('submit_quiz', {
        p_attempt: a.id,
        p_answers: snapshot,
      })
      if (error) throw error
      completed.current = true
      try {
        localStorage.removeItem(key.current)
      } catch {
        /* A stale local copy cannot reopen a submitted server attempt. */
      }
      if (mounted.current) setResult(data)
    } catch (e) {
      if (mounted.current) setError(errorMessage(e))
    } finally {
      submittingRef.current = false
      if (mounted.current) setSubmitting(false)
    }
  }, [persist])
  const setAnswer = useCallback(
    (id: string, value: string) => {
      if (submittingRef.current || completed.current) return
      const next = { ...answersRef.current, [id]: value }
      answersRef.current = next
      revision.current++
      setAnswers(next)
      setStatus(
        persist(next) ? 'Saved on this device; awaiting server save' : 'Not saved on this device',
      )
    },
    [persist],
  )
  useEffect(() => {
    if (!attempt || loading || result) return
    const timer = setTimeout(() => {
      void save()
    }, 750)
    return () => clearTimeout(timer)
  }, [answers, attempt, loading, online, result, save])
  useEffect(() => {
    if (!attempt || result) return
    const timer = setInterval(() => {
      void save()
    }, 10000)
    return () => clearInterval(timer)
  }, [attempt, result, save])
  useEffect(() => {
    if (!attempt?.deadline || result) return
    const tick = () =>
      setRemaining(
        Math.max(
          0,
          Math.ceil((new Date(attempt.deadline!).getTime() - Date.now() - offset.current) / 1000),
        ),
      )
    tick()
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [attempt, result])
  useEffect(() => {
    if (remaining === 0 && online && !result) void submit()
  }, [remaining, online, result, submit])
  return {
    attempt,
    answers,
    loading,
    error,
    status,
    online,
    remaining,
    result,
    submitting,
    setAnswer,
    save,
    submit,
  }
}
