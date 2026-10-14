import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, THEME_KEY } from '../src/context/ThemeContext'
import ThemeSelector from '../src/components/ThemeSelector'
import LoginPage from '../src/pages/LoginPage'
import Header from '../src/components/Header'

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))
vi.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ signIn, signUp: vi.fn(), session: null, loading: false, user: null }),
}))
vi.mock('../src/lib/supabase', () => ({ supabase: {} }))
beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  signIn.mockResolvedValue({ error: null })
})
afterEach(cleanup)

it('persists explicit themes and restores the system-controlled selector', () => {
  const view = render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  )
  fireEvent.change(screen.getByRole('combobox', { name: 'Color theme' }), {
    target: { value: 'dark' },
  })
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  view.unmount()
  render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  )
  expect((screen.getByRole('combobox', { name: 'Color theme' }) as HTMLSelectElement).value).toBe(
    'dark',
  )
  fireEvent.change(screen.getByRole('combobox', { name: 'Color theme' }), {
    target: { value: 'light' },
  })
  expect(document.documentElement.dataset.theme).toBe('light')
  fireEvent.change(screen.getByRole('combobox', { name: 'Color theme' }), {
    target: { value: 'system' },
  })
  expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  expect(localStorage.getItem(THEME_KEY)).toBe('system')
})

it('carries the landing preference into the shared module header', () => {
  const view = render(
    <ThemeProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
  expect(screen.getByRole('heading', { name: 'One-CBSUA VLP' })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Color theme' }), {
    target: { value: 'dark' },
  })
  view.rerender(
    <ThemeProvider>
      <Header />
    </ThemeProvider>,
  )
  expect((screen.getByRole('combobox', { name: 'Color theme' }) as HTMLSelectElement).value).toBe(
    'dark',
  )
  expect(document.documentElement.dataset.theme).toBe('dark')
})

it('authenticates a test account normally and reports rejected credentials', async () => {
  signIn.mockResolvedValue({ error: 'Invalid login credentials' })
  render(
    <ThemeProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /Administrator admin@vlpv2.test/ }))
  await waitFor(() => expect(signIn).toHaveBeenCalledWith('admin@vlpv2.test', 'Password123!'))
  expect(await screen.findByText('Invalid login credentials')).toBeTruthy()
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('admin@vlpv2.test')
})

it('follows preference changes from another tab', () => {
  render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  )
  localStorage.setItem(THEME_KEY, 'dark')
  fireEvent(window, new StorageEvent('storage', { key: THEME_KEY, newValue: 'dark' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
})

it('defaults to Light when there is no saved preference', () => {
  render(
    <ThemeProvider>
      <ThemeSelector />
    </ThemeProvider>,
  )
  expect(document.documentElement.dataset.theme).toBe('light')
  expect((screen.getByRole('combobox', { name: 'Color theme' }) as HTMLSelectElement).value).toBe(
    'light',
  )
})

it('renders test-user cards with exactly two lines', () => {
  render(
    <ThemeProvider>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>,
  )
  const card = screen.getByRole('button', { name: /Administrator admin@vlpv2.test/ })
  expect(card.querySelectorAll('span').length).toBe(2)
})
