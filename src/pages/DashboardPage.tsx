import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useOfferings } from '../hooks/useOfferings'
import ErrorNotice from '../components/ErrorNotice'
export default function DashboardPage() {
  const { profile, memberships, activeDomain } = useAuth()
  const { items, loading, error } = useOfferings()
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Welcome, {profile?.display_name}</h1>
      <p>
        {activeDomain ? `Showing ${activeDomain.toUpperCase()}` : 'All your learning domains'}.
        Permissions follow your role in each course.
      </p>
      <ErrorNotice message={error} />
      <section className="card">
        <h2 className="font-semibold">Your memberships</h2>
        <div className="flex flex-wrap gap-2 mt-2">
          {memberships
            .filter((m) => !activeDomain || m.domain === activeDomain)
            .map((m) => (
              <span className="badge badge-academic" key={m.id}>
                {m.domain.toUpperCase()} · {m.role}
              </span>
            ))}
        </div>
      </section>
      {loading ? (
        <p>Loading courses…</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {(['academic', 'lnd', 'mooc'] as const).map((d) => (
              <div className="card" key={d}>
                <h2>{d.toUpperCase()}</h2>
                <p className="text-2xl">{items.filter((x) => x.offering.domain === d).length}</p>
              </div>
            ))}
          </div>
          <h2 className="font-bold">Your courses and programs</h2>
          {items.length === 0 ? (
            <p>
              No courses yet.{' '}
              <Link className="text-primary-600" to="/mooc">
                Browse the MOOC catalog
              </Link>
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {items.map(({ offering: o, can_manage }) => (
                <Link className="card" to={`/offering/${o.id}`} key={o.id}>
                  <span className="badge badge-academic">{o.domain}</span>
                  <h3 className="font-bold mt-2">{o.title}</h3>
                  <p>{o.description}</p>
                  <p>{can_manage ? 'Instructor / administrator' : 'Learner'}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
