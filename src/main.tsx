
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'

import './index.css'
import App from './App.tsx'
import AdminLogin from './admin/AdminLogin.tsx'
import AdminDashboard from './admin/AdminDashboard.tsx'
import { supabase } from './supabase'

type AdminStatus = 'checking' | 'login' | 'authorized' | 'denied'

function AdminArea() {
  const [status, setStatus] = useState<AdminStatus>('checking')

  useEffect(() => {
    let active = true
    let requestId = 0

    async function verifyAdmin(session: Session | null) {
      const currentRequest = ++requestId

      if (!session) {
        if (active) setStatus('login')
        return
      }

      if (active) setStatus('checking')

      try {
        const { data, error } = await supabase.rpc('is_admin')

        if (!active || currentRequest !== requestId) return

        if (error || data !== true) {
          setStatus('denied')
          return
        }

        setStatus('authorized')
      } catch {
        if (active && currentRequest === requestId) {
          setStatus('denied')
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void verifyAdmin(session)
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (active && status === 'checking') {
        void verifyAdmin(data.session)
      }
    })

    return () => {
      active = false
      requestId++
      subscription.unsubscribe()
    }
  }, [])

  if (status === 'checking') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#090909',
          color: '#D7B477',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Verifying admin access...
      </div>
    )
  }

  if (status === 'login') {
    return <AdminLogin />
  }

  if (status === 'denied') {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#090909',
          color: '#E4C78F',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div>
          <h1>Access Restricted</h1>
          <p>
            This account does not have verified admin access.
          </p>
          <button
            onClick={() => {
              void supabase.auth.signOut({ scope: 'local' })
            }}
            style={{
              marginTop: 20,
              padding: '12px 24px',
              background: '#D7B477',
              color: '#15110B',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            LOG OUT
          </button>
        </div>
      </main>
    )
  }

  return <AdminDashboard />
}

function Root() {
  const path =
    window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/admin') {
    return <AdminArea />
  }

  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
