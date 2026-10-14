import { Link } from 'react-router-dom'
import { useOfferings } from '../hooks/useOfferings'
import ErrorNotice from '../components/ErrorNotice'
export default function DomainListPage({ domain }: { domain: 'academic' | 'lnd' }) {
  const { items, loading, error } = useOfferings()
  const courses = items.filter((x) => x.offering.domain === domain)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {domain === 'academic' ? 'Academic Courses' : 'L&D Programs'}
      </h1>
      <ErrorNotice message={error} />
      {loading ? (
        <p>Loading courses…</p>
      ) : courses.length === 0 ? (
        <p>No courses in your current domain selection.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {courses.map(({ offering: o, can_manage }) => (
            <Link className="card" key={o.id} to={`/offering/${o.id}`}>
              <h2 className="font-bold">{o.title}</h2>
              <p>{o.description}</p>
              <p>
                {can_manage ? 'Instructor / administrator' : 'Learner'} · {o.code}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
