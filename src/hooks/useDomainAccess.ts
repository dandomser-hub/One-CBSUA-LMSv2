import { useAuth } from '../context/AuthContext'
import { Domain, DomainRole } from '../types'

export function useDomainAccess() {
  const { memberships, activeDomain } = useAuth()

  const hasRole = (role: DomainRole): boolean => {
    return memberships.some((m) => m.role === role && (!activeDomain || m.domain === activeDomain))
  }

  const hasDomain = (domain: Domain): boolean => {
    return memberships.some((m) => m.domain === domain)
  }

  const hasDomainRole = (domain: Domain, role: DomainRole): boolean => {
    return memberships.some((m) => m.domain === domain && m.role === role)
  }

  const isAdmin = hasRole('admin')
  const isFaculty = hasDomainRole('academic', 'faculty')
  const isFacilitator = hasDomainRole('lnd', 'facilitator')
  const isStudent = hasDomainRole('academic', 'student')
  const isLndLearner = hasDomainRole('lnd', 'learner')
  const isMoocLearner = hasDomainRole('mooc', 'mooc_learner')

  const domains: Domain[] = Array.from(new Set(memberships.map((m) => m.domain)))

  return {
    memberships,
    activeDomain,
    hasRole,
    hasDomain,
    hasDomainRole,
    isAdmin,
    isFaculty,
    isFacilitator,
    isStudent,
    isLndLearner,
    isMoocLearner,
    domains,
  }
}
