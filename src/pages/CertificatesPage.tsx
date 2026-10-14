import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../lib/errors'
import ErrorNotice from '../components/ErrorNotice'
export default function CertificatesPage() {
  const { user } = useAuth()
  const [certificates, setCertificates] = useState<any[]>([]),
    [code, setCode] = useState(''),
    [result, setResult] = useState<any>(undefined)
  const [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let current = true
    if (!user) {
      setLoading(false)
      return
    }
    supabase
      .from('certificates')
      .select('*, offerings(title)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false })
      .then(({ data, error }) => {
        if (current) {
          if (error) setError(errorMessage(error))
          else setCertificates(data || [])
          setLoading(false)
        }
      })
    return () => {
      current = false
    }
  }, [user?.id])
  async function verify() {
    setBusy(true)
    setError(null)
    setResult(undefined)
    const { data, error } = await supabase.rpc('verify_certificate', { p_code: code.trim() })
    if (error) setError(errorMessage(error))
    else setResult(data)
    setBusy(false)
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Certificates</h1>
      <ErrorNotice message={error} />
      <section className="card">
        <label>
          Verification code
          <input className="input-field" value={code} onChange={(e) => setCode(e.target.value)} />
        </label>
        <button
          className="btn-primary mt-2"
          disabled={busy || !code.trim()}
          onClick={() => void verify()}
        >
          Verify certificate
        </button>
        {result !== undefined &&
          (result ? (
            <div role="status" className="mt-3">
              <p>{result.status === 'revoked' ? 'Revoked certificate' : 'Valid certificate'}</p>
              <p>
                {result.display_name} · {result.course}
              </p>
              <p>
                {result.certificate_number} · {new Date(result.issued_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p role="status">
              No matching public certificate. Contact the university for legacy verification codes.
            </p>
          ))}
      </section>
      <h2 className="font-bold">My certificates</h2>
      {loading ? (
        <p>Loading certificates…</p>
      ) : certificates.length === 0 ? (
        <p>No certificates issued.</p>
      ) : (
        certificates.map((c) => (
          <article key={c.id} className="card">
            <h3 className="font-bold">{c.offerings?.title}</h3>
            <p>
              {c.status} · {c.certificate_number}
            </p>
            <p>Verification code: {c.verification_code}</p>
          </article>
        ))
      )}
    </div>
  )
}
