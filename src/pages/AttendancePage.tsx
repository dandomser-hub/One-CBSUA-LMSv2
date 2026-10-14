import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOfferings } from '../hooks/useOfferings'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import ErrorNotice from '../components/ErrorNotice'
import { AttendanceSession, AttendanceRecord } from '../types'
export default function AttendancePage() {
  const { user } = useAuth()
  const { items, loading, error: courseError } = useOfferings()
  const [selected, setSelected] = useState(''),
    [sessionId, setSessionId] = useState(''),
    [sessions, setSessions] = useState<AttendanceSession[]>([]),
    [records, setRecords] = useState<AttendanceRecord[]>([]),
    [roster, setRoster] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [loadingRecords, setLoadingRecords] = useState(false)
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const course = items.find((i) => i.offering.id === selected)
  useEffect(() => {
    if (selected && !course) setSelected('')
  }, [selected, course])
  useEffect(() => {
    let current = true
    setSessionId('')
    setSessions([])
    setRoster([])
    setRecords([])
    setError(null)
    if (!course) return
    async function load() {
      const s = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('offering_id', selected)
        .order('session_date', { ascending: false })
      const r = course!.can_manage
        ? await supabase
            .from('enrollments')
            .select('user_id, profiles!enrollments_profile_fkey(display_name)')
            .eq('offering_id', selected)
            .eq('status', 'active')
            .in('role', ['student', 'learner'])
        : { data: [], error: null }
      if (!current) return
      if (s.error || r.error) setError(errorMessage(s.error || r.error))
      else {
        setSessions(s.data || [])
        setRoster(r.data || [])
        setSessionId(s.data?.[0]?.id || '')
      }
    }
    void load()
    return () => {
      current = false
    }
  }, [selected, course?.can_manage])
  useEffect(() => {
    let current = true
    setRecords([])
    if (!sessionId) return
    setLoadingRecords(true)
    setError(null)
    supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId)
      .then(({ data, error }) => {
        if (current) {
          if (error) setError(errorMessage(error))
          else setRecords(data || [])
          setLoadingRecords(false)
        }
      })
    return () => {
      current = false
    }
  }, [sessionId])
  async function create() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({ offering_id: selected, session_date: date, created_by: user!.id })
      .select()
      .single()
    if (error) setError(errorMessage(error))
    else {
      setSessions((prev) =>
        [...prev, data].sort((a, b) => b.session_date.localeCompare(a.session_date)),
      )
      setSessionId(data.id)
    }
    setBusy(false)
  }
  async function mark(uid: string, status: string) {
    setBusy(true)
    setError(null)
    const target = sessionId
    const { error } = await supabase.rpc('record_attendance', {
      p_session: target,
      p_user: uid,
      p_status: status,
    })
    if (error) setError(errorMessage(error))
    else {
      const result = await supabase.from('attendance_records').select('*').eq('session_id', target)
      if (result.error) setError(errorMessage(result.error))
      else setRecords(result.data || [])
    }
    setBusy(false)
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Attendance</h1>
      <ErrorNotice message={error || courseError} />
      {loading ? (
        <p>Loading courses…</p>
      ) : (
        <label>
          Course
          <select
            className="input-field"
            value={selected}
            disabled={busy}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select a course</option>
            {items.map((x) => (
              <option key={x.offering.id} value={x.offering.id}>
                {x.offering.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {course?.can_manage && (
        <div className="card flex gap-2">
          <label>
            Session date
            <input
              type="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <button className="btn-primary" disabled={busy || !date} onClick={() => void create()}>
            Create session
          </button>
        </div>
      )}
      {course && (
        <label>
          Session
          <select
            className="input-field"
            value={sessionId}
            disabled={busy}
            onChange={(e) => setSessionId(e.target.value)}
          >
            <option value="">Select a session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.session_date} {s.label || ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {sessionId &&
        (loadingRecords ? (
          <p>Loading attendance…</p>
        ) : course?.can_manage ? (
          <div className="card space-y-3">
            {roster.length === 0 ? (
              <p>No active learners.</p>
            ) : (
              roster.map((r) => (
                <div key={r.user_id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{r.profiles?.display_name}</span>
                  <select
                    aria-label={`Attendance for ${r.profiles?.display_name}`}
                    className="input-field max-w-xs"
                    value={records.find((x) => x.user_id === r.user_id)?.status || ''}
                    disabled={busy}
                    onChange={(e) => void mark(r.user_id, e.target.value)}
                  >
                    <option value="" disabled>
                      Not recorded
                    </option>
                    {['present', 'late', 'absent', 'excused'].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="card">
            <h2 className="font-bold">Your attendance</h2>
            <p>{records.find((r) => r.user_id === user?.id)?.status || 'Not recorded yet'}</p>
          </div>
        ))}
      {course && !sessions.length && <p>No sessions recorded.</p>}
    </div>
  )
}
