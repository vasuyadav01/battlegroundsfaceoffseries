'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
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

    if (!authData.session) {
      setLoading(false)
      setConfirmEmail(true)
      return
    }

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

    router.push('/slots?welcome=registered')
  }

  if (confirmEmail) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>
        </div>
        <div className={styles.card}>
          <div className={styles.headerArea}>
            <span className={styles.brandTag}>BGMI FACEOFF SERIES</span>
            <h1 className={styles.title}>CHECK YOUR EMAIL</h1>
          </div>
          <p className={styles.subtitle} style={{ marginBottom: '1.25rem' }}>
            We sent a confirmation link to <strong style={{ color: '#fbbf24' }}>{email}</strong>.
            Click the link in your email to verify your account, then sign in.
          </p>
          <Link href="/login" className={styles.submitBtn} style={{ textDecoration: 'none' }}>
            GO TO SIGN IN →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Top Left Back Button */}
      <div className={styles.topBar}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>
      </div>

      <div className={styles.card}>
        <div className={styles.headerArea}>
          <span className={styles.brandTag}>BGMI FACEOFF SERIES</span>
          <h1 className={styles.title}>CREATE AN ACCOUNT</h1>
          <p className={styles.subtitle}>
            Register your squad &amp; compete in daily BGMI slots.
          </p>
        </div>

        <form onSubmit={handleCreateAccount} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="register-teamname">
              TEAM NAME *
            </label>
            <input
              id="register-teamname"
              type="text"
              className={styles.input}
              placeholder="e.g. Team Nemesis"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="register-email">
              EMAIL ADDRESS *
            </label>
            <input
              id="register-email"
              type="email"
              className={styles.input}
              placeholder="captain@bgfsesports.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="register-password">
              CREATE PASSWORD *
            </label>
            <input
              id="register-password"
              type="password"
              className={styles.input}
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
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> CREATING ACCOUNT...</> : 'CREATE ACCOUNT & CONTINUE →'}
          </button>
        </form>

        <div className={styles.loginFooter}>
          <p className={styles.loginText}>Already have an account?</p>
          <Link href="/login" className={styles.loginLink}>
            SIGN IN TO YOUR ACCOUNT →
          </Link>
        </div>
      </div>
    </div>
  )
}
