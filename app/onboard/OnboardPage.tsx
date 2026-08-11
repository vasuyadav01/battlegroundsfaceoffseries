'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'


type Mode = 'choose' | 'create' | 'join'

export default function OnboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<Mode>('choose')
  const [teamName, setTeamName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const user = await getUser()
    if (!user) { router.push('/login'); return }

    // Create team
    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ team_name: teamName.trim(), captain_user_id: user.id })
      .select()
      .single()

    if (teamErr) {
      setLoading(false)
      setError(teamErr.message.includes('unique') ? 'Team name already taken. Try another.' : teamErr.message)
      return
    }

    // Update user profile
    const { error: userErr } = await supabase
      .from('users')
      .update({ team_id: team.team_id, role: 'captain', display_name: displayName.trim() || null })
      .eq('user_id', user.id)

    if (userErr) {
      setLoading(false)
      setError(userErr.message)
      return
    }

    router.push('/dashboard?welcome=created')
  }

  async function handleJoinTeam(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const user = await getUser()
    if (!user) { router.push('/login'); return }

    // Find team by invite code
    const { data: team, error: findErr } = await supabase
      .from('teams')
      .select('team_id, team_name')
      .eq('invite_code', inviteCode.trim().toLowerCase())
      .single()

    if (findErr || !team) {
      setLoading(false)
      setError('Invalid invite code. Please check and try again.')
      return
    }

    // Link user to team
    const { error: userErr } = await supabase
      .from('users')
      .update({ team_id: team.team_id, role: 'player', display_name: displayName.trim() || null })
      .eq('user_id', user.id)

    if (userErr) {
      setLoading(false)
      setError(userErr.message)
      return
    }

    router.push('/dashboard?welcome=joined')
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} />

      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoText}>BGFS</span>
        </div>

        <h1 className={styles.title}>Set Up Your Team</h1>
        <p className={styles.subtitle}>One last step before you can book slots.</p>

        {/* Choose mode */}
        {mode === 'choose' && (
          <div className={styles.choiceGrid}>
            <button id="create-team-btn" className={styles.choiceCard} onClick={() => setMode('create')}>
              <span className={styles.choiceIcon}>⚔️</span>
              <h2 className={styles.choiceTitle}>Create a Team</h2>
              <p className={styles.choiceDesc}>Start a new team. You'll get an invite code to share with your squad.</p>
              <span className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                Create Team →
              </span>
            </button>

            <button id="join-team-btn" className={styles.choiceCard} onClick={() => setMode('join')}>
              <span className={styles.choiceIcon}>🤝</span>
              <h2 className={styles.choiceTitle}>Join a Team</h2>
              <p className={styles.choiceDesc}>Got an invite code? Enter it to link yourself to an existing team.</p>
              <span className="btn btn-secondary" style={{ marginTop: '1rem', width: '100%' }}>
                Join Team →
              </span>
            </button>
          </div>
        )}

        {/* Create team form */}
        {mode === 'create' && (
          <form onSubmit={handleCreateTeam} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="displayName">Your in-game name</label>
              <input
                id="displayName"
                type="text"
                className="form-input"
                placeholder="e.g. xShadowOP"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="teamName">Team name *</label>
              <input
                id="teamName"
                type="text"
                className="form-input"
                placeholder="e.g. Team Nemesis"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                maxLength={30}
                required
                autoFocus
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button id="submit-create-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Creating...</> : 'Create Team & Continue →'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setMode('choose'); setError('') }}>
              ← Back
            </button>
          </form>
        )}

        {/* Join team form */}
        {mode === 'join' && (
          <form onSubmit={handleJoinTeam} className={styles.form}>
            <div className="form-group">
              <label className="form-label" htmlFor="displayNameJoin">Your in-game name</label>
              <input
                id="displayNameJoin"
                type="text"
                className="form-input"
                placeholder="e.g. xShadowOP"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={30}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="inviteCode">Team invite code *</label>
              <input
                id="inviteCode"
                type="text"
                className={`form-input ${styles.codeInput}`}
                placeholder="e.g. ab3x9k2m"
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                maxLength={8}
                required
                autoFocus
              />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <button id="submit-join-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><span className="spinner" /> Joining...</> : 'Join Team & Continue →'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setMode('choose'); setError('') }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
