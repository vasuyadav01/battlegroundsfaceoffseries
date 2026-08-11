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

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Register Auth User in Supabase
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (authErr) {
      setLoading(false)
      setError(authErr.message)
      return
    }

    const user = authData.user
    if (!user) {
      setLoading(false)
      setError('Failed to create account. Please try again.')
      return
    }

    // 2. Create Team in 'teams' table
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({
        team_name: teamName.trim(),
        captain_user_id: user.id,
      })
      .select()
      .single()

    if (teamErr) {
      setLoading(false)
      setError(
        teamErr.message.includes('unique')
          ? 'Team name already taken. Please choose another team name.'
          : teamErr.message
      )
      return
    }

    // 3. Insert/Upsert profile in 'users' table
    const { error: userErr } = await supabase
      .from('users')
      .upsert({
        user_id: user.id,
        team_id: team.team_id,
        role: 'captain',
        display_name: teamName.trim(),
      })

    if (userErr) {
      setLoading(false)
      setError(userErr.message)
      return
    }

    // 4. Automatically sign user in
    await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    // Redirect to slot booking page
    router.push('/slots?welcome=registered')
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
            width={360}
            height={100}
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
