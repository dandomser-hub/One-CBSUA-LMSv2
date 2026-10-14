import React from 'react'
import { ThemeProvider } from './context/ThemeContext'
import ThemeSelector from './components/ThemeSelector'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'
import { configurationError } from './lib/supabase'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      {configurationError ? (
        <main className="p-8">
          <ThemeSelector />
          <h1 className="text-xl font-bold mt-4">One-CBSUA VLP setup required</h1>
          <p role="alert">{configurationError}</p>
        </main>
      ) : (
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      )}
    </ThemeProvider>
  </React.StrictMode>,
)
