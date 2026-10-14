import React from 'react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AttendancePage from '../src/pages/AttendancePage'
import GradebookPage from '../src/pages/GradebookPage'
const { from, rpc, context, courses } = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  context: { user: { id: 'learner' } },
  courses: { items: [] as any[], loading: false, error: null },
}))
vi.mock('../src/lib/supabase', () => ({ supabase: { from, rpc } }))
vi.mock('../src/context/AuthContext', () => ({ useAuth: () => context }))
vi.mock('../src/hooks/useOfferings', () => ({ useOfferings: () => courses }))
let requests: { table: string; filters: any[] }[]
function mockTables(tables: Record<string, any[]>) {
  from.mockImplementation((table: string) => {
    const filters: any[] = []
    requests.push({ table, filters })
    const chain: any = {
      select: () => chain,
      eq: (...v: any[]) => {
        filters.push(v)
        return chain
      },
      in: (...v: any[]) => {
        filters.push(v)
        return chain
      },
      order: () => chain,
      then: (resolve: any) =>
        Promise.resolve({
          data: (tables[table] || []).filter((row) =>
            filters.every(([k, v]) => (Array.isArray(v) ? v.includes(row[k]) : row[k] === v)),
          ),
          error: null,
        }).then(resolve),
    }
    return chain
  })
}
beforeEach(() => {
  requests = []
  rpc.mockReset()
  rpc.mockResolvedValue({ error: null })
  courses.items = [
    { offering: { id: 'course', title: 'Course' }, can_manage: true, learner: false },
  ]
  context.user = { id: 'teacher' }
})
afterEach(cleanup)
it('loads previous attendance and writes the selected historical session, not the latest', async () => {
  mockTables({
    attendance_sessions: [
      { id: 'new', offering_id: 'course', session_date: '2026-10-02' },
      { id: 'old', offering_id: 'course', session_date: '2026-10-01' },
    ],
    enrollments: [
      {
        user_id: 'learner',
        offering_id: 'course',
        status: 'active',
        role: 'student',
        profiles: { display_name: 'Learner' },
      },
    ],
    attendance_records: [
      { session_id: 'new', user_id: 'learner', status: 'late' },
      { session_id: 'old', user_id: 'learner', status: 'present' },
    ],
  })
  render(<AttendancePage />)
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'course' } })
  await waitFor(() =>
    expect((screen.getByLabelText('Attendance for Learner') as HTMLSelectElement).value).toBe(
      'late',
    ),
  )
  fireEvent.change(screen.getByLabelText('Session'), { target: { value: 'old' } })
  await waitFor(() =>
    expect((screen.getByLabelText('Attendance for Learner') as HTMLSelectElement).value).toBe(
      'present',
    ),
  )
  fireEvent.change(screen.getByLabelText('Attendance for Learner'), {
    target: { value: 'excused' },
  })
  await waitFor(() =>
    expect(rpc).toHaveBeenCalledWith('record_attendance', {
      p_session: 'old',
      p_user: 'learner',
      p_status: 'excused',
    }),
  )
})
it('shows a learner their attendance without management controls', async () => {
  context.user = { id: 'learner' }
  courses.items[0].can_manage = false
  mockTables({
    attendance_sessions: [{ id: 'session', offering_id: 'course', session_date: '2026-10-01' }],
    attendance_records: [{ session_id: 'session', user_id: 'learner', status: 'present' }],
  })
  render(<AttendancePage />)
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'course' } })
  await screen.findByText('present')
  expect(screen.queryByText('Create session')).toBeNull()
  expect(screen.queryByLabelText('Attendance for Learner')).toBeNull()
})
it('uses learner gradebook controls for a faculty member learning in another course', async () => {
  context.user = { id: 'faculty-learning' }
  courses.items[0].can_manage = false
  mockTables({
    grades: [
      {
        id: 'grade',
        offering_id: 'course',
        user_id: 'faculty-learning',
        item_name: 'Training',
        score: 8,
        max_score: 10,
        is_released: true,
        profiles: { display_name: 'Faculty learner' },
      },
    ],
  })
  render(
    <MemoryRouter>
      <GradebookPage />
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'course' } })
  await screen.findByText('Training')
  expect(screen.queryByRole('button', { name: 'Unrelease' })).toBeNull()
  expect(requests.find((r) => r.table === 'grades')?.filters).toContainEqual([
    'user_id',
    'faculty-learning',
  ])
  expect(requests.find((r) => r.table === 'grades')?.filters).toContainEqual(['is_released', true])
})
it('does not claim a grade was released when the server rejects the action', async () => {
  mockTables({
    grades: [
      {
        id: 'grade',
        offering_id: 'course',
        item_name: 'Essay',
        score: 8,
        max_score: 10,
        is_released: false,
        profiles: { display_name: 'Learner' },
      },
    ],
  })
  rpc.mockResolvedValue({ error: { message: 'Complete manual marking before release' } })
  render(<GradebookPage />)
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'course' } })
  fireEvent.click(await screen.findByRole('button', { name: 'Release' }))
  await screen.findByRole('alert')
  expect(screen.getByText('Hidden')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Unrelease' })).toBeNull()
})
