'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

export default function RegisterClient() {
  const router = useRouter()
  const supabase = createClient()

  const [teamName, setTeamName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState(false)

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Step 1: Register the auth user
    // signUp returns a session immediately when email confirmation is DISABLED in Supabase
    // When confirmation is ENABLED, session is null and user must verify email first
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Store team name so onboard page can use it after email confirmation
        data: { display_name: teamName.trim() },
      },
    })

    if (authErr) {
      setLoading(false)
      setError(
        authErr.message.toLowerCase().includes('already registered') || authErr.message.toLowerCase().includes('already exists')
          ? 'This email is already registered. Please sign in instead.'
          : authErr.message
      )
      return
    }

    const user = authData.user
    if (!user) {
      setLoading(false)
      setError('Failed to create account. Please try again.')
      return
    }

    // Step 2: Check if we have a live session (email confirmation is OFF)
    // If authData.session is null, email confirmation is ON — redirect to confirm page
    if (!authData.session) {
      setLoading(false)
      setConfirmEmail(true) // Show "check your email" screen
      return
    }


    // Step 3: Call server API to create team + user profile using service role
    // This bypasses RLS entirely — no more silent permission failures
    const res = await fetch('/api/register-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName: teamName.trim(), displayName: teamName.trim() }),
    })

    const result = await res.json()

    if (!res.ok) {
      setLoading(false)
      setError(result.error || 'Registration failed. Please try again.')
      return
    }

    // All done — redirect to slot booking
    router.push('/slots?welcome=registered')
  }

  // ── Email confirmation required screen ──
  if (confirmEmail) {
    return (
      <div className={styles.page}>
        <div className={styles.bgGlow} />
        <div className={styles.card}>
          <div className={styles.logoWrapper}>
            <Image
              src="/images/faceofflogo.png"
              alt="BGFS Faceoff Series"
              width={600}
              height={200}
              style={{ width: 'auto', height: '160px', maxWidth: '100%', objectFit: 'contain' }}
              priority
            />
          </div>
          <h1 className={styles.title} style={{ fontSize: '1.4rem' }}>CHECK YOUR EMAIL</h1>
          <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
            We sent a confirmation link to <strong style={{ color: '#facc15' }}>{email}</strong>.
            Click the link in your email to verify your account, then sign in.
          </p>
          <div style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: '#888',
            lineHeight: '1.6',
          }}>
            💡 <strong style={{ color: '#facc15' }}>Tip for organizers:</strong> To skip email confirmation
            entirely, go to <strong style={{ color: '#ccc' }}>Supabase Dashboard → Authentication → Providers → Email</strong>
            {' '}and disable <em>"Confirm email"</em>.
          </div>
          <Link href="/login" className={styles.loginLink} style={{
            display: 'block',
            textAlign: 'center',
            background: '#facc15',
            color: '#111',
            padding: '12px',
            borderRadius: '8px',
            fontWeight: '800',
            textTransform: 'uppercase',
            marginBottom: '1rem',
          }}>
            GO TO SIGN IN →
          </Link>
          <div className={styles.homeLinkWrapper}>
            <Link href="/" className={styles.homeLink}>← BACK TO HOME</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.card}>
        {/* Logo Placement */}
        <div className={styles.logoWrapper}>
          <Image
            src="/images/faceofflogo.png"
            alt="BGFS Faceoff Series"
            width={600}
            height={200}
            style={{ width: 'auto', height: '200px', maxWidth: '100%', objectFit: 'contain' }}
            className={styles.logoImg}
            priority
          />
        </div>

        <h1 className={styles.title}>CREATE AN ACCOUNT</h1>
        <p className={styles.subtitle}>
          Register your team for Battlegrounds Faceoff Series and start competing.
        </p>

        <form onSubmit={handleCreateAccount} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-teamname">
              TEAM NAME *
            </label>
            <input
              id="register-teamname"
              type="text"
              className="form-input"
              placeholder="e.g. Team Nemesis"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">
              EMAIL ADDRESS *
            </label>
            <input
              id="register-email"
              type="email"
              className="form-input"
              placeholder="captain@bgfsesports.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-password">
              CREATE PASSWORD *
            </label>
            <input
              id="register-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {error && <p className={styles.errorMsg}>{error}</p>}

          <button
            id="register-account-btn"
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              background: '#facc15',
              color: '#111111',
              fontWeight: '800',
              textTransform: 'uppercase',
              padding: '12px',
              marginTop: '0.5rem',
            }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> CREATING ACCOUNT...</> : 'CREATE ACCOUNT & CONTINUE →'}
          </button>
        </form>

        {/* Existing User Link */}
        <div className={styles.loginFooter}>
          <p className={styles.loginText}>Already have an account?</p>
          <Link href="/login" className={styles.loginLink}>
            SIGN IN TO YOUR ACCOUNT →
          </Link>
        </div>

        <div className={styles.homeLinkWrapper}>
          <Link href="/" className={styles.homeLink}>
            ← BACK TO HOME
          </Link>
        </div>
      </div>
    </div>
  )
}
