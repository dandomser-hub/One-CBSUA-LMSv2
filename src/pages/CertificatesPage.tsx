import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Certificate, Offering } from '../types'
import { FileText, Loader2, Award, Search, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react'

export default function CertificatesPage() {
  const { user } = useAuth()
  const [certificates, setCertificates] = useState<(Certificate & { offerings: Offering })[]>([])
  const [loading, setLoading] = useState(true)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyResult, setVerifyResult] = useState<any | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data } = await supabase
        .from('certificates')
        .select('*, offerings(*)')
        .eq('user_id', user.id)
        .order('issued_at', { ascending: false })
      setCertificates((data || []) as any[])
      setLoading(false)
    }
    load()
  }, [user])

  const handleVerify = async () => {
    if (!verifyCode.trim()) return
    setVerifying(true)
    setVerifyResult(null)

    const { data } = await supabase
      .from('certificates')
      .select('*, offerings(title), profiles(display_name)')
      .eq('verification_code', verifyCode.trim())
      .maybeSingle()

    if (data) {
      setVerifyResult({ found: true, ...data })
    } else {
      setVerifyResult({ found: false })
    }
    setVerifying(false)
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
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your earned MOOC certificates and certificate verification.
        </p>
      </div>

      {/* Verification section */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary-600" />
          Verify a Certificate
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            className="input-field"
            placeholder="Enter verification code..."
          />
          <button onClick={handleVerify} disabled={verifying} className="btn-primary">
            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
        {verifyResult && (
          <div className="mt-4">
            {verifyResult.found ? (
              <div className={`border rounded-lg p-4 ${verifyResult.status === 'revoked' ? 'border-error-200 bg-error-50' : 'border-success-200 bg-success-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  {verifyResult.status === 'revoked' ? (
                    <><XCircle className="w-5 h-5 text-error-600" /><span className="font-medium text-error-700">Certificate Revoked</span></>
                  ) : (
                    <><CheckCircle2 className="w-5 h-5 text-success-600" /><span className="font-medium text-success-700">Valid Certificate</span></>
                  )}
                </div>
                <p className="text-sm text-gray-700">Certificate: {verifyResult.certificate_number}</p>
                <p className="text-sm text-gray-700">Course: {verifyResult.offerings?.title}</p>
                <p className="text-sm text-gray-700">Issued to: {verifyResult.profiles?.display_name}</p>
                <p className="text-sm text-gray-500">Issued on: {new Date(verifyResult.issued_at).toLocaleDateString()}</p>
                {verifyResult.status === 'revoked' && verifyResult.revoked_reason && (
                  <p className="text-sm text-error-600 mt-2">Reason: {verifyResult.revoked_reason}</p>
                )}
              </div>
            ) : (
              <div className="border border-error-200 bg-error-50 rounded-lg p-4">
                <p className="text-sm text-error-700">No certificate found with that verification code.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* My certificates */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">My Certificates</h3>
        {certificates.length === 0 ? (
          <div className="card text-center text-gray-400">
            No certificates earned yet. Complete a MOOC course to earn a certificate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => (
              <div key={cert.id} className="card border-2 border-amber-200">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-600" />
                  </div>
                  {cert.status === 'revoked' ? (
                    <span className="badge badge-error">Revoked</span>
                  ) : (
                    <span className="badge badge-success">Valid</span>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 mt-3">{cert.offerings?.title}</h4>
                <p className="text-xs text-gray-400 mt-1">Certificate #: {cert.certificate_number}</p>
                <p className="text-xs text-gray-400">Verification code: {cert.verification_code}</p>
                <p className="text-xs text-gray-400">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                {cert.status === 'revoked' && cert.revoked_reason && (
                  <p className="text-xs text-error-600 mt-2">Revoked: {cert.revoked_reason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
