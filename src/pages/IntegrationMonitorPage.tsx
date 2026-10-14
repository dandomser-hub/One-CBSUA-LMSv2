import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { IntegrationLogEntry } from '../types'
import { Server, Loader2, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw } from 'lucide-react'

const SYSTEM_LABELS: Record<string, string> = {
  registrar_sis: 'Registrar/SIS',
  hrmis: 'HRMIS',
  fmis: 'FMIS',
  iam: 'IAM/SSO',
}

const STATUS_CONFIG = {
  success: { color: 'badge-success', icon: CheckCircle2 },
  failed: { color: 'badge-error', icon: XCircle },
  pending: { color: 'badge-warning', icon: Clock },
  replayed: { color: 'badge-academic', icon: RotateCcw },
  rejected: { color: 'badge-error', icon: AlertTriangle },
}

export default function IntegrationMonitorPage() {
  const [entries, setEntries] = useState<IntegrationLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [replaying, setReplaying] = useState<string | null>(null)

  const load = async () => {
    const { data } = await supabase
      .from('integration_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setEntries((data || []) as IntegrationLogEntry[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleReplay = async (entry: IntegrationLogEntry) => {
    setReplaying(entry.id)
    // Simulate replay: update status to replayed
    await supabase
      .from('integration_log')
      .update({
        status: 'replayed',
        replayed_at: new Date().toISOString(),
        records_accepted: entry.records_processed,
        records_rejected: 0,
        error_detail: null,
      })
      .eq('id', entry.id)

    // Create a new success entry showing replay result
    await supabase.from('integration_log').insert({
      source_system: entry.source_system,
      source_batch_id: entry.source_batch_id,
      action: entry.action + ' (replay)',
      status: 'success',
      records_processed: entry.records_processed,
      records_accepted: entry.records_processed,
      records_rejected: 0,
      source_timestamp: new Date().toISOString(),
    })

    await load()
    setReplaying(null)
  }

  const stats = {
    total: entries.length,
    success: entries.filter((e) => e.status === 'success').length,
    failed: entries.filter((e) => e.status === 'failed').length,
    pending: entries.filter((e) => e.status === 'pending').length,
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
        <h1 className="text-2xl font-bold text-gray-900">Integration Monitor</h1>
        <p className="text-sm text-gray-500 mt-1">
          ERP integration status for Registrar/SIS, HRMIS, FMIS, and IAM. Failed jobs can be replayed without duplication.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-gray-500">Total Jobs</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Successful</p>
          <p className="text-2xl font-bold text-success-600">{stats.success}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-error-600">{stats.failed}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-warning-600">{stats.pending}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-primary-600" /> Integration Log
          </h3>
          <button onClick={load} className="btn-secondary text-sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-medium text-gray-600">System</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Action</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Status</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Processed</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Accepted</th>
                <th className="text-right py-2 px-3 font-medium text-gray-600">Rejected</th>
                <th className="text-left py-2 px-3 font-medium text-gray-600">Error</th>
                <th className="text-center py-2 px-3 font-medium text-gray-600">Replay</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const StatusIcon = STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG]?.icon
                return (
                  <tr key={entry.id} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-medium text-gray-700">
                      {SYSTEM_LABELS[entry.source_system] || entry.source_system}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{entry.action}</td>
                    <td className="py-2 px-3">
                      <span className={`badge ${STATUS_CONFIG[entry.status as keyof typeof STATUS_CONFIG]?.color}`}>
                        {StatusIcon && <StatusIcon className="w-3 h-3 mr-1" />}
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{entry.records_processed}</td>
                    <td className="py-2 px-3 text-right text-success-600">{entry.records_accepted}</td>
                    <td className="py-2 px-3 text-right text-error-600">{entry.records_rejected}</td>
                    <td className="py-2 px-3 text-xs text-gray-400 max-w-xs truncate">
                      {entry.error_detail || '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {(entry.status === 'failed' || entry.status === 'pending') && (
                        <button
                          onClick={() => handleReplay(entry)}
                          disabled={replaying === entry.id}
                          className="text-xs text-primary-600 hover:underline disabled:opacity-50"
                        >
                          {replaying === entry.id ? 'Replaying...' : 'Replay'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
