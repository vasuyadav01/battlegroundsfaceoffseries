'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface Props {
  userProfile: any
  team: any
  roster: any[]
  bookings: any[]
  coupons: any[]
  leaderboardEntry: any
  isCaptain: boolean
}

export default function DashboardClient({ userProfile, team, roster, bookings, coupons, leaderboardEntry, isCaptain }: Props) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'slots' | 'roster'>('overview')

  function copyInviteCode() {
    navigator.clipboard.writeText(team.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const upcomingBookings = bookings.filter(b => {
    const slot = b.slots
    return slot && slot.status !== 'completed' && new Date(slot.date) >= new Date()
  })

  const pastBookings = bookings.filter(b => {
    const slot = b.slots
    return !slot || slot.status === 'completed' || new Date(slot.date) < new Date()
  })

  return (
    <main className={styles.page}>
      <div className="container">

        {/* Header */}
        <div className={styles.header}>
          <div>
            <p className="text-label" style={{ marginBottom: '0.25rem' }}>Team Dashboard</p>
            <h1 className={`text-heading ${styles.teamName}`}>{team.team_name}</h1>
            {isCaptain && <span className="badge badge-gold" style={{ marginTop: '0.25rem' }}>Captain</span>}
          </div>
          <Link href="/register" className="btn btn-primary">
            + Book New Slot
          </Link>
        </div>

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className="stat-box">
            <div className="stat-value">{leaderboardEntry?.matches_played ?? 0}</div>
            <div className="stat-label">Matches Played</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: 'var(--brand-primary)' }}>{leaderboardEntry?.best_16_total ?? 0}</div>
            <div className="stat-label">Best-16 Total</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{leaderboardEntry?.total_kills ?? 0}</div>
            <div className="stat-label">Total Kills</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{coupons.length}</div>
            <div className="stat-label">Free Slot Coupons</div>
          </div>
        </div>

        {/* Invite code card */}
        <div className={styles.inviteCard}>
          <div>
            <p className="text-label" style={{ marginBottom: '0.25rem' }}>Team Invite Code</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Share this with teammates so they can join your team
            </p>
          </div>
          <div className={styles.inviteCodeBlock}>
            <code className={styles.inviteCode}>{team.invite_code}</code>
            <button
              id="copy-invite-btn"
              className="btn btn-secondary btn-sm"
              onClick={copyInviteCode}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { id: 'overview', label: 'Upcoming Slots' },
            { id: 'slots', label: `Past Slots (${pastBookings.length})` },
            { id: 'roster', label: `Roster (${roster.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab — Upcoming slots */}
        {activeTab === 'overview' && (
          <div>
            {upcomingBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No upcoming slots booked.</p>
                <Link href="/register" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  Book a Slot →
                </Link>
              </div>
            ) : (
              <div className={styles.slotList}>
                {upcomingBookings.map(booking => (
                  <SlotCard key={booking.booking_id} booking={booking} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Past Slots Tab */}
        {activeTab === 'slots' && (
          <div>
            {pastBookings.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No past slots yet. Start playing!</p>
              </div>
            ) : (
              <div className={styles.slotList}>
                {pastBookings.map(booking => (
                  <SlotCard key={booking.booking_id} booking={booking} past />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === 'roster' && (
          <div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Email</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {roster.map(member => (
                    <tr key={member.user_id}>
                      <td>
                        <div className={styles.playerName}>
                          {member.display_name || '(no name set)'}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {member.email}
                      </td>
                      <td>
                        <span className={`badge ${member.role === 'captain' ? 'badge-gold' : 'badge-neutral'}`}>
                          {member.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {coupons.length > 0 && (
              <div className={styles.couponsSection}>
                <h3 className={styles.couponsTitle}>🎟️ Available Coupons</h3>
                <div className={styles.couponsList}>
                  {coupons.map(c => (
                    <div key={c.coupon_id} className={styles.coupon}>
                      <span className="badge badge-success">Free Slot</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Issued {new Date(c.issued_at).toLocaleDateString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Applied automatically at checkout
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function SlotCard({ booking, past = false }: { booking: any; past?: boolean }) {
  const slot = booking.slots
  if (!slot) return null

  return (
    <div className={`${styles.slotCard} ${past ? styles.slotCardPast : ''}`}>
      <div className={styles.slotInfo}>
        <div className={styles.slotDate}>
          {new Date(slot.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
        <div className={styles.slotTime}>{slot.time_label}</div>
        <span className={`badge ${slot.status === 'completed' ? 'badge-neutral' : slot.status === 'open' ? 'badge-success' : 'badge-warning'}`}>
          {slot.status}
        </span>
      </div>

      {!past && slot.room_id && (
        <div className={styles.roomInfo}>
          <div className={styles.roomRow}>
            <span className="text-label">Room ID</span>
            <code className={styles.roomCode}>{slot.room_id}</code>
          </div>
          <div className={styles.roomRow}>
            <span className="text-label">Password</span>
            <code className={styles.roomCode}>{slot.room_password || '—'}</code>
          </div>
        </div>
      )}
    </div>
  )
}
