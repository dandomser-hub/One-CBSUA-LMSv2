import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Offering, AttendanceSession, AttendanceRecord } from '../types'
import { CheckSquare, Loader2, Plus, Calendar, Check, X, Clock, AlertCircle } from 'lucide-react'

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'text-success-600 bg-success-50', icon: Check },
  late: { label: 'Late', color: 'text-warning-600 bg-warning-50', icon: Clock },
  absent: { label: 'Absent', color: 'text-error-600 bg-error-50', icon: X },
  excused: { label: 'Excused', color: 'text-blue-600 bg-blue-50', icon: AlertCircle },
}

export default function AttendancePage() {
  const { user } = useAuth()
  const { isAdmin, isFaculty, isFacilitator } = useDomainAccess()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [selectedOffering, setSelectedOffering] = useState<string | null>(null)
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [records, setRecords] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])

  const canManage = isAdmin || isFaculty || isFacilitator

  useEffect(() => {
    const load = async () => {
      if (canManage) {
        const { data } = await supabase
          .from('offerings')
          .select('*')
          .or(`created_by.eq.${user?.id}`)
        setOfferings((data || []) as Offering[])
      } else {
        // Students see their own attendance
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
    if (!selectedOffering) return
    const load = async () => {
      const { data: sessionData } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('offering_id', selectedOffering)
        .order('session_date', { ascending: false })
      setSessions((sessionData || []) as AttendanceSession[])

      if (canManage) {
        const { data: rosterData } = await supabase
          .from('enrollments')
          .select('*, profiles(*)')
          .eq('offering_id', selectedOffering)
          .eq('status', 'active')
        setRoster(rosterData || [])
      }
    }
    load()
  }, [selectedOffering, canManage])

  const loadRecordsForSession = async (sessionId: string) => {
    const { data } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', sessionId)
    const recordMap: Record<string, string> = {}
    ;(data || []).forEach((r: any) => {
      recordMap[r.user_id] = r.status
    })
    setRecords(recordMap)
  }

  const createSession = async () => {
    if (!selectedOffering || !user) return
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert({
        offering_id: selectedOffering,
        session_date: sessionDate,
        created_by: user.id,
      })
      .select()
      .single()
    if (!error && data) {
      setSessions((prev) => [data as AttendanceSession, ...prev])
      loadRecordsForSession(data.id)
    }
  }

  const markAttendance = async (userId: string, status: string) => {
    if (!sessions[0]) return
    setRecords((prev) => ({ ...prev, [userId]: status }))

    await supabase.from('attendance_records').upsert(
      {
        session_id: sessions[0].id,
        user_id: userId,
        status,
        recorded_by: user?.id,
      },
      { onConflict: 'session_id,user_id' }
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
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">
          {canManage ? 'Take and manage attendance for your classes.' : 'View your attendance records.'}
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

          {canManage && (
            <div className="card flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="input-field max-w-xs"
              />
              <button onClick={createSession} className="btn-primary">
                <Plus className="w-4 h-4 mr-1" /> New Session
              </button>
            </div>
          )}

          {sessions.length > 0 && canManage && (
            <>
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-800">
                    Session: {new Date(sessions[0].session_date).toLocaleDateString()}
                  </h3>
                  <span className="badge badge-academic">{roster.length} enrolled</span>
                </div>

                <div className="space-y-2">
                  {roster.map((enrollment: any) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {enrollment.profiles?.display_name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-400">{enrollment.profiles?.external_id}</p>
                      </div>
                      <div className="flex gap-1">
                        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                          const Icon = config.icon
                          return (
                            <button
                              key={status}
                              onClick={() => markAttendance(enrollment.user_id, status)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                                records[enrollment.user_id] === status
                                  ? config.color + ' ring-2 ring-offset-1'
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {sessions.length === 0 && (
            <div className="card text-center text-gray-400">
              No attendance sessions yet. {canManage && 'Create one above.'}
            </div>
          )}
        </>
      )}
    </div>
  )
}
