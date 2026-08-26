'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, TrendingUp, Edit3, Lock, Check, X } from 'lucide-react'
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
  isCaptain: boolean
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
  isCaptain,
}: Props) {
  // Team name edit state
  const [currentTeamName, setCurrentTeamName] = useState(team.team_name)
  const [hasChangedName, setHasChangedName] = useState(!!team.name_changed)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newTeamNameInput, setNewTeamNameInput] = useState(team.team_name)
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameError, setRenameError] = useState('')
  const [renameSuccessMsg, setRenameSuccessMsg] = useState('')

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
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
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
                  <span className={styles.renameNotice}>⚠️ 1-time change only</span>
                </form>
              )}

              {renameError && <div className={styles.renameErrorMsg}>{renameError}</div>}
              {renameSuccessMsg && <div className={styles.renameSuccessMsg}>{renameSuccessMsg}</div>}
            </div>
          </div>
        </div>

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
