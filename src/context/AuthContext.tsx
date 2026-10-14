import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { Profile, DomainMembership, Domain } from '../types'
interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  memberships: DomainMembership[]
  activeDomain: Domain | null
  setActiveDomain: (domain: Domain | null) => void
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<DomainMembership[]>([])
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let current = true,
      receivedEvent = false
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      receivedEvent = true
      if (current) {
        setSession(s)
        setInitializing(false)
      }
    })
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!current || receivedEvent) return
        setSession(data.session)
        setInitializing(false)
        if (error) setError(errorMessage(error))
      })
      .catch((e) => {
        if (current) {
          setError(errorMessage(e))
          setInitializing(false)
        }
      })
    return () => {
      current = false
      listener.subscription.unsubscribe()
    }
  }, [])
  useEffect(() => {
    let current = true
    setProfile(null)
    setMemberships([])
    setActiveDomain(null)
    setError(null)
    if (!session?.user) {
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    Promise.all([
      supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
      supabase.from('domain_memberships').select('*').eq('user_id', session.user.id),
    ])
      .then(([p, m]) => {
        if (!current) return
        if (p.error || m.error) setError(errorMessage(p.error || m.error))
        else {
          setProfile(p.data)
          setMemberships(m.data || [])
        }
      })
      .catch((e) => {
        if (current) setError(errorMessage(e))
      })
      .finally(() => {
        if (current) setProfileLoading(false)
      })
    return () => {
      current = false
    }
  }, [session?.user.id, revision])
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }
  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    return { error: error?.message ?? null } // Profile provisioning is a database trigger, including email-confirmation flows.
  }
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null)
  }
  const refreshProfile = useCallback(async () => {
    setRevision((n) => n + 1)
  }, [])
  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        memberships,
        activeDomain,
        setActiveDomain,
        loading: initializing || profileLoading,
        error,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('AuthProvider required')
  return ctx
}
