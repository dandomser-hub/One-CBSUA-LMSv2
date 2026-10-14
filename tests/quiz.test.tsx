import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { act, renderHook, waitFor, cleanup } from '@testing-library/react'
import { useQuizAttempt } from '../src/hooks/useQuizAttempt'
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../src/lib/supabase', () => ({ supabase: { rpc } }))
const attempt = {
  id: 'attempt',
  quiz_id: 'quiz',
  user_id: 'learner',
  status: 'in_progress',
  autosave_state: {},
  deadline: null,
  server_now: new Date().toISOString(),
}
beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  rpc.mockReset()
  rpc.mockImplementation(async (name: string) => ({
    data:
      name === 'start_quiz'
        ? attempt
        : name === 'submit_quiz'
          ? { id: 'attempt', status: 'graded' }
          : null,
    error: null,
  }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
describe('quiz persistence and submission', () => {
  it('submits the latest answers immediately, even before autosave runs', async () => {
    const { result } = renderHook(() => useQuizAttempt('quiz', 'learner'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setAnswer('question', 'last-second answer'))
    await act(async () => {
      await result.current.submit()
    })
    expect(rpc).toHaveBeenCalledWith('submit_quiz', {
      p_attempt: 'attempt',
      p_answers: { question: 'last-second answer' },
    })
    expect(result.current.result?.status).toBe('graded')
    expect(localStorage.getItem('vlpv2:quiz:learner:attempt')).toBeNull()
  })
  it('reports server errors as failed saves and keeps the local draft', async () => {
    const { result } = renderHook(() => useQuizAttempt('quiz', 'learner'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setAnswer('question', 'answer'))
    rpc.mockImplementation(async () => ({ data: null, error: { message: 'Database unavailable' } }))
    await act(async () => {
      await result.current.save()
    })
    expect(result.current.status).toContain('failed')
    expect(result.current.error).toBe('Database unavailable')
    expect(JSON.parse(localStorage.getItem('vlpv2:quiz:learner:attempt')!)).toEqual({
      question: 'answer',
    })
  })
  it('restores an offline draft after remount and saves it on reconnection', async () => {
    const first = renderHook(() => useQuizAttempt('quiz', 'learner'))
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('offline'))
      first.result.current.setAnswer('question', 'offline draft')
    })
    first.unmount()
    const second = renderHook(() => useQuizAttempt('quiz', 'learner'))
    await waitFor(() => expect(second.result.current.loading).toBe(false))
    expect(second.result.current.answers.question).toBe('offline draft')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    act(() => window.dispatchEvent(new Event('online')))
    await act(async () => {
      await second.result.current.save()
    })
    expect(rpc).toHaveBeenCalledWith('save_quiz_answers', {
      p_attempt: 'attempt',
      p_answers: { question: 'offline draft' },
    })
  })
  it('automatic deadline submission uses current answers rather than the initial render', async () => {
    rpc.mockImplementation(async (name: string) => ({
      data:
        name === 'start_quiz'
          ? {
              ...attempt,
              deadline: new Date(Date.now() + 2000).toISOString(),
              server_now: new Date().toISOString(),
            }
          : { id: 'attempt', status: 'graded' },
      error: null,
    }))
    const { result } = renderHook(() => useQuizAttempt('quiz', 'learner'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setAnswer('question', 'new answer'))
    await waitFor(() => expect(result.current.result?.status).toBe('graded'), { timeout: 3500 })
    expect(rpc).toHaveBeenCalledWith('submit_quiz', {
      p_attempt: 'attempt',
      p_answers: { question: 'new answer' },
    })
  })
  it('prevents duplicate clicks while a submission is pending and retains drafts on failure', async () => {
    const { result } = renderHook(() => useQuizAttempt('quiz', 'learner'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.setAnswer('question', 'work'))
    let finish: (value: any) => void = () => {}
    rpc.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    let submitting: Promise<void>
    await act(async () => {
      submitting = result.current.submit()
      await Promise.resolve()
    })
    await act(async () => {
      await result.current.submit()
    })
    expect(rpc.mock.calls.filter((c) => c[0] === 'submit_quiz')).toHaveLength(1)
    await act(async () => {
      finish({ data: null, error: { message: 'Connection interrupted' } })
      await submitting!
    })
    expect(result.current.result).toBeNull()
    expect(localStorage.getItem('vlpv2:quiz:learner:attempt')).not.toBeNull()
  })
})
