'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, TrendingUp, Edit3, Lock, Check, X, FlaskConical, AlertCircle, KeyRound } from 'lucide-react'
import { formatShortDate } from '@/lib/utils/formatDate'
import { createClient } from '@/lib/supabase/client'
import styles from './page.module.css'

interface SlotInfo {
  slot_id: string
  date: string
  time_label: string
  status: string
  entry_fee: number
  is_grand_finals: boolean
}

interface Booking {
  booking_id: string
  payment_status: string
  amount_paid: number
  coupon_used: boolean
  created_at: string
  room_slot_number?: number | null
  slots: any
}

interface LeaderboardEntry {
  team_id: string
  best_16_total: number
  matches_played: number
  total_kills: number
}

interface Payout {
  amount: number
  status: 'paid' | 'pending' | string
}

interface Coupon {
  coupon_id: string
  code: string
  type: string
  status: 'unused' | 'used' | string
  issued_at: string
}

interface Props {
  team: {
    team_id: string
    team_name: string
    captain_user_id: string
    name_changed?: boolean
  }
  userEmail: string
  bookings: Booking[]
  leaderboardEntry: LeaderboardEntry | null
  rank: number
  payouts: Payout[]
  coupons?: Coupon[]
  isCaptain: boolean
  isTestAccount?: boolean
}

function getSlotInfo(slots: any): SlotInfo | null {
  if (!slots) return null
  if (Array.isArray(slots)) return slots[0] || null
  return slots as SlotInfo
}

export default function DashboardClient({
  team,
  userEmail,
  bookings,
  leaderboardEntry,
  rank,
  payouts,
  coupons = [],
  isCaptain,
  isTestAccount = false,
}: Props) {
  const unusedCoupons = coupons.filter(c => c.status === 'unused')
  // Team name edit state
  const [currentTeamName, setCurrentTeamName] = useState(team.team_name)
  const [hasChangedName, setHasChangedName] = useState(!!team.name_changed)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newTeamNameInput, setNewTeamNameInput] = useState(team.team_name)
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [renameSuccessMsg, setRenameSuccessMsg] = useState('')

  // Password Change state
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passErr, setPassErr] = useState('')
  const [passMsg, setPassMsg] = useState('')

  async function handleChangePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPassErr('')
    setPassMsg('')

    if (newPass.length < 6) {
      setPassErr('Password must be at least 6 characters.')
      return
    }
    if (newPass !== confirmPass) {
      setPassErr('Passwords do not match.')
      return
    }

    setPassLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setPassLoading(false)

    if (error) {
      setPassErr(error.message)
      return
    }

    setPassMsg('Password updated successfully!')
    setNewPass('')
    setConfirmPass('')
    setTimeout(() => {
      setIsChangingPassword(false)
      setPassMsg('')
    }, 2000)
  }

  // Handle Team Rename submit
  async function handleRenameSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamNameInput.trim()) return

    setRenameError('')
    setRenameSuccessMsg('')
    setRenameLoading(true)

    try {
      const res = await fetch('/api/team/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_team_name: newTeamNameInput.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setRenameError(data.error || 'Failed to update team name.')
        setRenameLoading(false)
        return
      }

      setCurrentTeamName(data.new_team_name)
      setHasChangedName(true)
      setIsEditingName(false)
      setRenameSuccessMsg('Team name updated successfully! (Locked)')
      setRenameLoading(false)
    } catch (err: any) {
      setRenameError(err.message || 'Network error')
      setRenameLoading(false)
    }
  }

  // Normalize slot info for each booking
  const normalizedBookings = bookings.map(b => ({
    ...b,
    slotData: getSlotInfo(b.slots),
  }))

  // Filter upcoming paid/pending slots
  const upcomingBookings = normalizedBookings.filter(
    b => b.slotData && b.slotData.status !== 'completed'
  )

  // Calculate total entry fees paid
  const totalEntryFees = normalizedBookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => {
      if (b.coupon_used) return sum
      return sum + (b.amount_paid || b.slotData?.entry_fee || 50)
    }, 0)

  // Calculate prize money earned
  const paidPrize = payouts
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const pendingPrize = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const totalPrizeEarned = paidPrize + pendingPrize
  const isQualified = rank > 0 && rank <= 16

  function formatDate(dateStr: string) {
    return formatShortDate(dateStr)
  }

  return (
    <main className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>PLAYER DASHBOARD</h1>

            {/* Team Name display & 1-time Edit */}
            <div className={styles.teamNameRow}>
              {!isEditingName ? (
                <div className={styles.teamNameBadgeWrap}>
                  <span className={styles.teamNameDisplay}>{currentTeamName}</span>

                  {userEmail && <span className={styles.emailText}>({userEmail})</span>}
                  {isCaptain && <span className={styles.captainBadge}>CAPTAIN</span>}
                  {isTestAccount && (
                    <span style={{
                      background: '#1f1f1f',
                      border: '1px solid #333333',
                      color: '#aaaaaa',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <FlaskConical size={11} /> TEST ACCOUNT
                    </span>
                  )}

                  {!hasChangedName ? (
                    <button
                      className={styles.renameTriggerBtn}
                      onClick={() => { setIsEditingName(true); setRenameError(''); setRenameSuccessMsg('') }}
                      title="Change Team Name (1-time only)"
                    >
                      <Edit3 size={13} /> Edit Name
                    </button>
                  ) : (
                    <span className={styles.nameLockedBadge} title="Team name cannot be changed again">
                      <Lock size={11} /> Name Locked
                    </span>
                  )}

                  <button
                    className={styles.renameTriggerBtn}
                    style={{ borderColor: 'rgba(250, 204, 21, 0.4)', color: '#facc15' }}
                    onClick={() => { setIsChangingPassword(!isChangingPassword); setPassErr(''); setPassMsg('') }}
                  >
                    <KeyRound size={13} /> {isChangingPassword ? 'Cancel Password' : 'Change Password'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRenameSubmit} className={styles.renameForm}>
                  <input
                    type="text"
                    className={styles.renameInput}
                    value={newTeamNameInput}
                    onChange={e => setNewTeamNameInput(e.target.value)}
                    placeholder="Enter new team name"
                    autoFocus
                    required
                  />
                  <button type="submit" className={styles.renameSaveBtn} disabled={renameLoading}>
                    {renameLoading ? 'Saving...' : <><Check size={14} /> Save</>}
                  </button>
                  <button
                    type="button"
                    className={styles.renameCancelBtn}
                    onClick={() => setIsEditingName(false)}
                    disabled={renameLoading}
                  >
                    <X size={14} />
                  </button>
                  <span className={styles.renameNotice}><AlertCircle size={11} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '3px' }} /> 1-time change only</span>
                </form>
              )}

              {/* Password Change Inline Form */}
              {isChangingPassword && (
                <form onSubmit={handleChangePasswordSubmit} className={styles.renameForm} style={{ marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <input
                    type="password"
                    className={styles.renameInput}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    placeholder="New Password (min 6 chars)"
                    minLength={6}
                    required
                    style={{ minWidth: '180px' }}
                  />
                  <input
                    type="password"
                    className={styles.renameInput}
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Confirm New Password"
                    minLength={6}
                    required
                    style={{ minWidth: '180px' }}
                  />
                  <button type="submit" className={styles.renameSaveBtn} disabled={passLoading}>
                    {passLoading ? 'Updating...' : <><Check size={14} /> Update Password</>}
                  </button>
                  {passErr && <p style={{ color: '#ef4444', fontSize: '0.8rem', margin: 0, width: '100%' }}>{passErr}</p>}
                  {passMsg && <p style={{ color: '#4ade80', fontSize: '0.8rem', margin: 0, width: '100%' }}>{passMsg}</p>}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Free Slot Reward Banner */}
        {unusedCoupons.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(250, 204, 21, 0.15) 0%, rgba(202, 138, 4, 0.08) 100%)',
            border: '1px solid #facc15',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: '0 4px 20px rgba(250, 204, 21, 0.1)',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '1.25rem' }}>🎁</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#facc15', fontFamily: 'Inter, sans-serif' }}>
                  {unusedCoupons.length === 1
                    ? '1 Free Slot Reward Available!'
                    : `${unusedCoupons.length} Free Slot Rewards Available!`}
                </h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#d4d4d4', fontFamily: 'Inter, sans-serif' }}>
                Earned from placing 3rd in slot matches. Redeem on any open tournament slot with zero entry fee!
              </p>
            </div>
            <Link
              href="/slots"
              className="btn btn-primary"
              style={{
                background: '#facc15',
                color: '#000000',
                fontWeight: 800,
                fontSize: '0.875rem',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              Redeem on Open Slots →
            </Link>
          </div>
        )}

        {/* 3-Card Grid */}
        <div className={styles.cardGrid}>
          {/* ── CARD 1: MY SLOTS ── */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <Calendar size={18} color="#facc15" />
              </div>
              <h2 className={styles.cardTitle}>MY SLOTS</h2>
            </div>

            <div className={styles.cardBody}>
              {upcomingBookings.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No slots registered yet</p>
                  <Link href="/slots" className={styles.primaryBtn}>
                    REGISTER FOR A SLOT →
                  </Link>
                </div>
              ) : (
                <div className={styles.slotsWrapper}>
                  <div className={styles.slotList}>
                    {upcomingBookings.map(b => (
                      <div key={b.booking_id} className={styles.slotItem}>
                        <div className={styles.slotDetails}>
                          <span className={styles.slotDate}>
                            {formatDate(b.slotData?.date || '')}
                          </span>
                          <span className={styles.slotTime}>
                            {b.slotData?.time_label}
                          </span>
                          {b.room_slot_number && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#facc15', marginTop: '3px', letterSpacing: '0.04em' }}>
                              ROOM SLOT: SLOT {b.room_slot_number}
                            </span>
                          )}
                        </div>
                        <span
                          className={
                            b.payment_status === 'paid'
                              ? styles.badgePaid
                              : styles.badgePending
                          }
                        >
                          {b.payment_status === 'paid' ? 'PAID' : 'PENDING'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link href="/slots" className={styles.secondaryBtn}>
                    REGISTER ANOTHER SLOT →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ── CARD 2: MY STANDING ── */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.iconWrapper}>
                <TrendingUp size={18} color="#facc15" />
              </div>
              <h2 className={styles.cardTitle}>MY STANDING</h2>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.standingSummary}>
                <div className={styles.rankContainer}>
                  <span className={styles.rankValue}>
                    {rank > 0 ? `#${rank}` : '—'}
                  </span>
                  <span className={styles.rankLabel}>OVERALL RANK</span>
                </div>

                <div className={styles.metricsGrid}>
                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>
                      {leaderboardEntry?.best_16_total ?? 0}
                    </span>
                    <span className={styles.metricLabel}>BEST-16 SCORE</span>
                  </div>

                  <div className={styles.metricDivider} />

                  <div className={styles.metricBox}>
                    <span className={styles.metricValue}>
                      {leaderboardEntry?.matches_played ?? 0}
                    </span>
                    <span className={styles.metricLabel}>MATCHES PLAYED</span>
                  </div>
                </div>

                <div
                  className={
                    isQualified ? styles.badgeQualified : styles.badgeNotQualified
                  }
                >
                  {isQualified ? 'QUALIFIED ✓' : 'NOT YET QUALIFIED'}
                </div>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <Link href="/leaderboard" className={styles.footerLink}>
                VIEW FULL LEADERBOARD →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
