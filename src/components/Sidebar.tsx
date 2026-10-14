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
  const { domains, isAdmin } = useDomainAccess()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
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
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">One-CBSUA</h1>
            <p className="text-xs text-gray-500">LMS v2 Prototype</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <p className="text-xs font-medium text-gray-400 uppercase mb-2">Signed in as</p>
        <p className="text-sm font-semibold text-gray-900">{profile?.display_name ?? 'User'}</p>
        <p className="text-xs text-gray-500">{profile?.email}</p>
      </div>

      {domains.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-400 uppercase mb-2">Active Domain</p>
          <div className="space-y-1">
            {domains.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDomain(d)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition ${
                  activeDomain === d
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
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
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
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
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
