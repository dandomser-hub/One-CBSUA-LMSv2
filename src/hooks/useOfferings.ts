import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/errors'
import { Offering } from '../types'
export interface OfferingAccess {
  offering: Offering
  can_manage: boolean
  learner: boolean
}
export function useOfferings() {
  const { user, activeDomain } = useAuth()
  const [items, setItems] = useState<OfferingAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let current = true
    setLoading(true)
    setItems([])
    setError(null)
    if (!user) {
      setLoading(false)
      return
    }
    supabase.rpc('my_offerings').then(({ data, error }) => {
      if (!current) return
      if (error) setError(errorMessage(error))
      else setItems(data || [])
      setLoading(false)
    })
    return () => {
      current = false
    }
  }, [user?.id])
  return {
    items: items.filter((x) => !activeDomain || x.offering.domain === activeDomain),
    loading,
    error,
  }
}
export function useOfferingAccess(offeringId?: string) {
  const { user } = useAuth()
  const [state, setState] = useState({
    id: '',
    can_manage: false,
    learner: false,
    error: null as string | null,
  })
  useEffect(() => {
    let current = true
    if (!offeringId || !user) return
    supabase.rpc('offering_access', { p_offering: offeringId }).then(({ data, error }) => {
      if (current)
        setState({
          id: offeringId,
          can_manage: !!data?.can_manage,
          learner: !!data?.learner,
          error: error ? errorMessage(error) : null,
        })
    })
    return () => {
      current = false
    }
  }, [offeringId, user?.id])
  return {
    canManage: state.id === offeringId && state.can_manage,
    learner: state.id === offeringId && state.learner,
    loading: state.id !== offeringId,
    error: state.id === offeringId ? state.error : null,
  }
}
