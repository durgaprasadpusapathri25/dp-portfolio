
import { useState, type FormEvent } from 'react'
import { supabase } from '../supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage('Login failed. Please check your credentials.')
        return
      }

      setPassword('')
      setMessage('Login successful! Dashboard setup is next.')
    } catch {
      setMessage('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '15px',
    border: '1px solid rgba(229,9,20,0.35)',
    borderRadius: '8px',
    background: '#141414',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    outlineColor: '#E50914',
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#F5F5F1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '42px 32px',
          border: '1px solid rgba(229,9,20,0.4)',
          borderRadius: '18px',
          background: 'linear-gradient(145deg, #181818, #111111)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.45)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <img
            src="/dp-logo.png"
            alt="DP Logo"
            style={{
              width: '90px',
              height: '90px',
              objectFit: 'contain',
              marginBottom: '18px',
            }}
          />

          <p
            style={{
              color: '#E50914',
              fontSize: '11px',
              letterSpacing: '3px',
              marginBottom: '12px',
            }}
          >
            PRIVATE ADMIN ACCESS
          </p>

          <h1
            style={{
              fontSize: 'clamp(26px, 5vw, 34px)',
              margin: '0 0 12px',
            }}
          >
            DP <span style={{ color: '#E50914' }}>Dashboard.</span>
          </h1>

          <p style={{ color: '#B3B3B3', fontSize: '14px' }}>
            Manage your creative business in one place.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="admin-email"
            style={{
              display: 'block',
              marginBottom: '10px',
              fontSize: '13px',
            }}
          >
            Email Address
          </label>

          <input
            id="admin-email"
            type="email"
            placeholder="Enter your email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={inputStyle}
          />

          <label
            htmlFor="admin-password"
            style={{
              display: 'block',
              marginTop: '24px',
              marginBottom: '10px',
              fontSize: '13px',
            }}
          >
            Password
          </label>

          <input
            id="admin-password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: '30px',
              padding: '16px',
              border: 'none',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #E50914, #B20710)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN →'}
          </button>

          {message && (
            <p
              role="status"
              style={{
                marginTop: '20px',
                color: '#E50914',
                fontSize: '13px',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              {message}
            </p>
          )}
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '25px',
            color: '#8B8B8B',
            fontSize: '12px',
          }}
        >
          Authorized access only · DP Creative Studio
        </p>
      </section>
    </main>
  )
}

