import ErrorNotice from '../components/ErrorNotice'
import { errorMessage } from '../lib/errors'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuditLogEntry } from '../types'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function AuditLogPage() {
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<
    (AuditLogEntry & { profiles: { display_name: string } | null })[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, profiles!audit_profile_fkey(display_name)')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) setError(errorMessage(error))
      setEntries((data || []) as any[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-link" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ErrorNotice message={error} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted mt-1">
          Tracks privileged changes: who did what, when, and what changed.
        </p>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-link" />
          <h3 className="font-semibold text-foreground">Change History</h3>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">
            No audit entries yet. Grading and submission actions will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 border border-border rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {entry.profiles?.display_name ?? 'Unknown user'}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-1">
                    <span className="font-medium">{entry.action.replace(/_/g, ' ')}</span>
                    {' → '}
                    <span className="text-muted">{entry.entity_type}</span>
                    {entry.domain && (
                      <span
                        className={`badge ml-2 ${
                          entry.domain === 'academic'
                            ? 'badge-academic'
                            : entry.domain === 'lnd'
                              ? 'badge-lnd'
                              : 'badge-mooc'
                        }`}
                      >
                        {entry.domain}
                      </span>
                    )}
                  </p>
                  {entry.after_value && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted cursor-pointer">
                        View change details
                      </summary>
                      <pre className="text-xs text-muted mt-1 bg-surface-alt rounded p-2 overflow-x-auto">
                        {JSON.stringify(entry.after_value, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
