import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Assignment, Submission } from '../types'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
  Send,
  GraduationCap,
  History,
} from 'lucide-react'

export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { isAdmin, isFaculty, isFacilitator } = useDomainAccess()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [priorSubmissions, setPriorSubmissions] = useState<Submission[]>([])
  const [allSubmissions, setAllSubmissions] = useState<any[]>([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [gradingFor, setGradingFor] = useState<string | null>(null)
  const [gradeInput, setGradeInput] = useState('')
  const [feedbackInput, setFeedbackInput] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id || !user) return
    const load = async () => {
      setLoading(true)
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('*, offerings(*)')
        .eq('id', id)
        .maybeSingle()
      setAssignment(assignmentData as Assignment | null)

      // Load user's submission
      const { data: subData } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
      const subs = (subData || []) as Submission[]
      setMySubmission(subs[0] || null)
      setPriorSubmissions(subs.slice(1))

      // If faculty/admin, load all submissions for grading
      const offering = (assignmentData as any)?.offerings
      if (offering && (isAdmin || offering.created_by === user.id)) {
        const { data: allSubs } = await supabase
          .from('submissions')
          .select('*, profiles(*)')
          .eq('assignment_id', id)
          .order('submitted_at', { ascending: false })
        setAllSubmissions(allSubs || [])
      }

      setLoading(false)
    }
    load()
  }, [id, user, isAdmin])

  const handleSubmit = async () => {
    if (!id || !user || !assignment) return
    setSubmitting(true)
    setMessage(null)

    try {
      const isLate = assignment.due_date
        ? new Date() > new Date(assignment.due_date) &&
          (!mySubmission?.extension_due_date || new Date() > new Date(mySubmission.extension_due_date))
        : false

      const { data: newSub, error } = await supabase
        .from('submissions')
        .insert({
          assignment_id: id,
          user_id: user.id,
          content,
          status: isLate ? 'late' : mySubmission ? 'resubmitted' : 'submitted',
          prior_submission_id: mySubmission?.id,
        })
        .select()
        .single()

      if (error) throw error

      setMySubmission(newSub as Submission)
      setContent('')
      setMessage('Submission received. A receipt has been recorded.')

      // Create audit log entry
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'submit_assignment',
        entity_type: 'submission',
        entity_id: newSub.id,
        domain: assignment ? 'academic' : null,
        after_value: { status: newSub.status } as any,
      })
    } catch {
      setMessage('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGrade = async (submissionId: string) => {
    if (!user || !assignment) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('submissions')
        .update({
          grade: parseFloat(gradeInput),
          feedback: feedbackInput,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
          status: 'graded',
        })
        .eq('id', submissionId)

      if (error) throw error

      // Create gradebook entry
      await supabase.from('grades').insert({
        offering_id: assignment.offering_id,
        user_id: allSubmissions.find((s) => s.id === submissionId)?.user_id,
        item_name: assignment.title,
        item_type: 'assignment',
        item_id: assignment.id,
        score: parseFloat(gradeInput),
        max_score: assignment.max_points,
        is_released: false,
        graded_by: user.id,
      })

      // Audit log
      await supabase.from('audit_log').insert({
        actor_id: user.id,
        action: 'grade_submission',
        entity_type: 'submission',
        entity_id: submissionId,
        domain: 'academic',
        after_value: { grade: parseFloat(gradeInput), feedback: feedbackInput } as any,
      })

      // Refresh submissions
      const { data: refreshed } = await supabase
        .from('submissions')
        .select('*, profiles(*)')
        .eq('assignment_id', id)
        .order('submitted_at', { ascending: false })
      setAllSubmissions(refreshed || [])

      setGradingFor(null)
      setGradeInput('')
      setFeedbackInput('')
      setMessage('Grade saved. Result is not yet released to the learner.')
    } catch {
      setMessage('Failed to save grade.')
    } finally {
      setSubmitting(false)
    }
  }

  const canGrade = isAdmin || (assignment && (assignment as any).offerings?.created_by === user?.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="card text-center">
        <p className="text-gray-500">Assignment not found or you do not have access.</p>
        <Link to="/dashboard" className="text-primary-600 text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  const effectiveDueDate = mySubmission?.extension_due_date || assignment.due_date
  const isOverdue = effectiveDueDate ? new Date() > new Date(effectiveDueDate) : false

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to={`/offering/${assignment.offering_id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Course
      </Link>

      <div className="card">
        <h1 className="text-xl font-bold text-gray-900">{assignment.title}</h1>
        <p className="text-gray-600 mt-2">{assignment.description}</p>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <span className="flex items-center gap-1 text-gray-500">
            <FileText className="w-4 h-4" /> {assignment.max_points} pts
          </span>
          {effectiveDueDate && (
            <span className={`flex items-center gap-1 ${isOverdue ? 'text-error-600' : 'text-gray-500'}`}>
              <Clock className="w-4 h-4" />
              Due: {new Date(effectiveDueDate).toLocaleString()}
              {mySubmission?.extension_due_date && (
                <span className="badge badge-success ml-1">Extension applied</span>
              )}
            </span>
          )}
          {assignment.allow_resubmission && (
            <span className="text-gray-400">Resubmission allowed</span>
          )}
        </div>
      </div>

      {message && (
        <div className="bg-success-50 border border-success-100 text-success-700 text-sm rounded-lg px-4 py-3">
          {message}
        </div>
      )}

      {/* Student submission area */}
      {!canGrade && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">Your Submission</h3>

          {mySubmission && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`badge ${
                  mySubmission.status === 'graded' ? 'badge-success' :
                  mySubmission.status === 'late' ? 'badge-warning' : 'badge-academic'
                }`}>
                  {mySubmission.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(mySubmission.submitted_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{mySubmission.content}</p>
              {mySubmission.grade !== null && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    Grade: {mySubmission.grade} / {assignment.max_points}
                  </p>
                  {mySubmission.feedback && (
                    <p className="text-sm text-gray-600 mt-1">Feedback: {mySubmission.feedback}</p>
                  )}
                </div>
              )}
              {mySubmission.status !== 'graded' && (
                <p className="text-xs text-gray-400 mt-2">
                  Pending review — not yet graded by instructor.
                </p>
              )}
            </div>
          )}

          {priorSubmissions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase mb-2 flex items-center gap-1">
                <History className="w-3 h-3" /> Prior Submissions ({priorSubmissions.length})
              </p>
              <div className="space-y-1">
                {priorSubmissions.map((ps) => (
                  <div key={ps.id} className="text-xs text-gray-400 flex items-center gap-2">
                    <span>v{priorSubmissions.length - priorSubmissions.indexOf(ps)}</span>
                    <span>{new Date(ps.submitted_at).toLocaleString()}</span>
                    <span className="badge badge-warning">{ps.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field min-h-[120px]"
            placeholder="Write your submission here..."
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="btn-primary mt-3"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <><Send className="w-4 h-4 mr-1" /> {mySubmission ? 'Resubmit' : 'Submit'}</>
            )}
          </button>
        </div>
      )}

      {/* Faculty grading area */}
      {canGrade && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary-600" />
            Submissions to Grade ({allSubmissions.length})
          </h3>

          {allSubmissions.length === 0 ? (
            <p className="text-sm text-gray-400">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {allSubmissions.map((sub) => (
                <div key={sub.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{sub.profiles?.display_name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(sub.submitted_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`badge ${
                      sub.status === 'graded' ? 'badge-success' :
                      sub.status === 'late' ? 'badge-warning' : 'badge-academic'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded p-3 mb-3">
                    {sub.content || '(no text content)'}
                  </p>

                  {sub.grade !== null ? (
                    <div className="bg-success-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-success-700">
                        Graded: {sub.grade} / {assignment.max_points}
                      </p>
                      {sub.feedback && (
                        <p className="text-sm text-success-600 mt-1">Feedback: {sub.feedback}</p>
                      )}
                      <p className="text-xs text-success-400 mt-1">
                        Graded by {sub.graded_by === user?.id ? 'you' : 'another grader'} on{' '}
                        {sub.graded_at && new Date(sub.graded_at).toLocaleString()}
                      </p>
                    </div>
                  ) : gradingFor === sub.id ? (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={gradeInput}
                        onChange={(e) => setGradeInput(e.target.value)}
                        className="input-field"
                        placeholder={`Grade (max ${assignment.max_points})`}
                        max={assignment.max_points}
                      />
                      <textarea
                        value={feedbackInput}
                        onChange={(e) => setFeedbackInput(e.target.value)}
                        className="input-field"
                        placeholder="Feedback for learner..."
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleGrade(sub.id)}
                          disabled={submitting || !gradeInput}
                          className="btn-primary"
                        >
                          Save Grade
                        </button>
                        <button
                          onClick={() => { setGradingFor(null); setGradeInput(''); setFeedbackInput('') }}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setGradingFor(sub.id); setGradeInput(''); setFeedbackInput('') }}
                      className="btn-secondary text-sm"
                    >
                      Grade Submission
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
