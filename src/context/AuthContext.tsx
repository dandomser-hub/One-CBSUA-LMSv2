import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile, DomainMembership, Domain } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  memberships: DomainMembership[]
  activeDomain: Domain | null
  setActiveDomain: (domain: Domain | null) => void
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [memberships, setMemberships] = useState<DomainMembership[]>([])
  const [activeDomain, setActiveDomain] = useState<Domain | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfileAndMemberships = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    setProfile(profileData as Profile | null)

    const { data: membershipData } = await supabase
      .from('domain_memberships')
      .select('*')
      .eq('user_id', userId)

    setMemberships((membershipData || []) as DomainMembership[])
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfileAndMemberships(user.id)
    }
  }, [user, loadProfileAndMemberships])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadProfileAndMemberships(s.user.id).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      ;(async () => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          await loadProfileAndMemberships(s.user.id)
        } else {
          setProfile(null)
          setMemberships([])
          setActiveDomain(null)
        }
        setLoading(false)
      })()
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfileAndMemberships])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) return { error: error.message }
    if (data.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        display_name: displayName,
        email,
      })
    }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setMemberships([])
    setActiveDomain(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        memberships,
        activeDomain,
        setActiveDomain,
        loading,
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
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
