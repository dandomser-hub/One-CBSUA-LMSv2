import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Offering, Lesson, Quiz, Assignment, Enrollment } from '../types'
import {
  BookOpen,
  FileText,
  Link as LinkIcon,
  Folder,
  ClipboardList,
  CheckSquare,
  ArrowLeft,
  Plus,
  Users,
} from 'lucide-react'

const LESSON_ICONS: Record<string, typeof BookOpen> = {
  text: BookOpen,
  file: FileText,
  link: LinkIcon,
  folder: Folder,
  page: FileText,
}

export default function OfferingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const { isAdmin, isFaculty, isFacilitator } = useDomainAccess()
  const [offering, setOffering] = useState<Offering | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lessons' | 'quizzes' | 'assignments' | 'roster'>('lessons')

  const canManage =
    isAdmin ||
    (offering?.created_by === user?.id) ||
    enrollments.some(
      (e) => e.user_id === user?.id && (e.role === 'faculty' || e.role === 'facilitator')
    )

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      const { data: offeringData } = await supabase
        .from('offerings')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      setOffering(offeringData as Offering | null)

      const { data: lessonData } = await supabase
        .from('lessons')
        .select('*')
        .eq('offering_id', id)
        .order('order_index', { ascending: true })
      setLessons((lessonData || []) as Lesson[])

      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('offering_id', id)
        .order('created_at', { ascending: true })
      setQuizzes((quizData || []) as Quiz[])

      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*')
        .eq('offering_id', id)
        .order('due_date', { ascending: true })
      setAssignments((assignmentData || []) as Assignment[])

      // Load roster if faculty/admin
      if (canManage) {
        const { data: rosterData } = await supabase
          .from('enrollments')
          .select('*, profiles(*)')
          .eq('offering_id', id)
          .eq('status', 'active')
        setEnrollments((rosterData || []) as any)
      }

      setLoading(false)
    }
    load()
  }, [id, canManage, user])

  if (loading) return <div className="card text-center text-gray-400">Loading...</div>

  if (!offering) {
    return (
      <div className="card text-center">
        <p className="text-gray-500">Offering not found or you do not have access.</p>
        <Link to="/dashboard" className="text-primary-600 text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const domainBadge =
    offering.domain === 'academic'
      ? 'badge-academic'
      : offering.domain === 'lnd'
      ? 'badge-lnd'
      : 'badge-mooc'

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${domainBadge}`}>
                {offering.domain === 'academic' ? 'Academic' : offering.domain === 'lnd' ? 'L&D' : 'MOOC'}
              </span>
              {offering.is_paid && <span className="badge badge-warning">Paid</span>}
              {offering.pacing === 'self_paced' && <span className="badge badge-success">Self-paced</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{offering.title}</h1>
            <p className="text-gray-600 mt-2">{offering.description}</p>
            {offering.code && (
              <p className="text-sm text-gray-400 mt-1">Code: {offering.code}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(['lessons', 'quizzes', 'assignments', ...(canManage ? ['roster' as const] : [])] as const).map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition capitalize ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'roster' ? 'Class Roster' : tab}
            </button>
          )
        )}
      </div>

      {activeTab === 'lessons' && (
        <div className="space-y-3">
          {lessons.length === 0 ? (
            <div className="card text-center text-gray-400">No lessons published yet.</div>
          ) : (
            lessons.map((lesson, idx) => {
              const Icon = LESSON_ICONS[lesson.lesson_type] || BookOpen
              return (
                <div key={lesson.id} className="card flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">Lesson {idx + 1}</span>
                      {!lesson.is_published && <span className="badge badge-warning">Draft</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1">{lesson.title}</h3>
                    {lesson.content && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-3">{lesson.content}</p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {activeTab === 'quizzes' && (
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <div className="card text-center text-gray-400">No quizzes published yet.</div>
          ) : (
            quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                to={`/quiz/${quiz.id}`}
                className="card flex items-start gap-4 hover:shadow-md transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-academic capitalize">{quiz.quiz_type.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400">{quiz.total_points} pts</span>
                    {quiz.max_attempts > 1 && (
                      <span className="text-xs text-gray-400">Max {quiz.max_attempts} attempts</span>
                    )}
                    {quiz.time_limit_minutes && (
                      <span className="text-xs text-gray-400">{quiz.time_limit_minutes} min</span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mt-1 group-hover:text-primary-600 transition">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-sm text-gray-500 mt-1">{quiz.description}</p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <div className="card text-center text-gray-400">No assignments published yet.</div>
          ) : (
            assignments.map((a) => (
              <Link
                key={a.id}
                to={`/assignment/${a.id}`}
                className="card flex items-start gap-4 hover:shadow-md transition group"
              >
                <div className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="w-5 h-5 text-success-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition">
                    {a.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{a.max_points} pts</span>
                    {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                    {a.allow_resubmission && <span>Resubmission allowed</span>}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {activeTab === 'roster' && canManage && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Class Roster</h3>
            <span className="badge badge-academic">{enrollments.length} enrolled</span>
          </div>
          <div className="space-y-2">
            {enrollments.map((e: any) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {e.profiles?.display_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {e.profiles?.external_id ?? 'No ID'} — {e.profiles?.email}
                  </p>
                </div>
                <span className="badge badge-success capitalize">{e.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
