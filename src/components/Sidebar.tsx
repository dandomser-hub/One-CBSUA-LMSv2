import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDomainAccess } from '../hooks/useDomainAccess'
import { Domain } from '../types'
import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  Globe,
  ClipboardList,
  Bell,
  LogOut,
  GraduationCap,
  ShieldCheck,
  Server,
  FileText,
  CheckSquare,
} from 'lucide-react'

const DOMAIN_LABELS: Record<Domain, string> = {
  academic: 'Academic',
  lnd: 'Employee L&D',
  mooc: 'MOOC',
}

const DOMAIN_COLORS: Record<Domain, string> = {
  academic: 'badge-academic',
  lnd: 'badge-lnd',
  mooc: 'badge-mooc',
}

export default function Sidebar() {
  const { profile, signOut, activeDomain, setActiveDomain } = useAuth()
  const { domains, memberships } = useDomainAccess()
  const isAdmin = ['academic', 'lnd', 'mooc'].every((d) =>
    memberships.some((m) => m.domain === d && m.role === 'admin' && m.organization_id === null),
  )
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      window.alert('Sign out failed. Please retry.')
    }
  }

  const navItems: { to: string; label: string; icon: typeof LayoutDashboard; show: boolean }[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { to: '/academic', label: 'Academic Courses', icon: BookOpen, show: true },
    { to: '/lnd', label: 'L&D Programs', icon: Briefcase, show: true },
    { to: '/mooc', label: 'MOOC Catalog', icon: Globe, show: true },
    { to: '/gradebook', label: 'Gradebook', icon: ClipboardList, show: true },
    { to: '/attendance', label: 'Attendance', icon: CheckSquare, show: true },
    { to: '/competencies', label: 'Competencies', icon: ShieldCheck, show: true },
    { to: '/certificates', label: 'Certificates', icon: FileText, show: true },
    { to: '/integration', label: 'Integration Monitor', icon: Server, show: isAdmin },
    { to: '/audit', label: 'Audit Log', icon: ShieldCheck, show: isAdmin },
  ]

  return (
    <aside className="w-full md:w-64 md:shrink-0 bg-surface border-r border-border flex flex-col md:h-screen md:sticky top-0">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary-on" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">One-CBSUA VLP</h1>
            <p className="text-xs text-muted">Virtual Learning Platform</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border">
        <p className="text-xs font-medium text-muted uppercase mb-2">Signed in as</p>
        <p className="text-sm font-semibold text-foreground">{profile?.display_name ?? 'User'}</p>
        <p className="text-xs text-muted">{profile?.email}</p>
      </div>

      {domains.length > 0 && (
        <div className="p-4 border-b border-border">
          <p className="text-xs font-medium text-muted uppercase mb-2">Active Domain</p>
          <div className="space-y-1">
            {domains.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDomain(d)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition ${
                  activeDomain === d
                    ? 'bg-primary-subtle text-link font-medium'
                    : 'text-muted hover:bg-surface-alt'
                }`}
              >
                <span>{DOMAIN_LABELS[d]}</span>
                <span className={`badge ${DOMAIN_COLORS[d]}`}>{DOMAIN_LABELS[d][0]}</span>
              </button>
            ))}
            <button
              onClick={() => setActiveDomain(null)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${
                activeDomain === null
                  ? 'bg-primary-subtle text-link font-medium'
                  : 'text-muted hover:bg-surface-alt'
              }`}
            >
              All domains
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? 'bg-primary-subtle text-link font-medium'
                    : 'text-muted hover:bg-surface-alt'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted hover:bg-surface-alt transition"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
