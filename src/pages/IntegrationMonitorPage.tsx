import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { useAuth } from '../context/AuthContext'
import ErrorNotice from '../components/ErrorNotice'
import { IntegrationLogEntry } from '../types'
export default function IntegrationMonitorPage() {
  const { memberships } = useAuth()
  const allowed = ['academic', 'lnd', 'mooc'].every((d) =>
    memberships.some((m) => m.domain === d && m.role === 'admin' && m.organization_id === null),
  )
  const [entries, setEntries] = useState<IntegrationLogEntry[]>([]),
    [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true)
  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('integration_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) setError(errorMessage(error))
    else setEntries(data || [])
    setLoading(false)
  }
  useEffect(() => {
    if (allowed) void load()
  }, [allowed])
  if (!allowed) return <ErrorNotice message="University-wide administration access is required." />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Integration Monitor</h1>
      <p>
        This prototype displays recorded integration logs. Live Registrar/SIS, HRMIS, FMIS and IAM
        adapters are not connected. Replay is unavailable until a real adapter and idempotency
        controls are implemented.
      </p>
      <ErrorNotice message={error} />
      <button className="btn-secondary" disabled={loading} onClick={() => void load()}>
        Refresh
      </button>
      {loading ? (
        <p>Loading logs…</p>
      ) : entries.length === 0 ? (
        <p>No integration jobs recorded.</p>
      ) : (
        <div className="card overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>System</th>
                <th>Action</th>
                <th>Status</th>
                <th>Accepted / processed</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">{e.source_system}</td>
                  <td>{e.action}</td>
                  <td>{e.status}</td>
                  <td>
                    {e.records_accepted} / {e.records_processed}
                  </td>
                  <td>{e.error_detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
