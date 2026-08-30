'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPlacementPoints, getPositionPoints, getKillPoints } from '@/lib/scoring'
import styles from './page.module.css'

type AdminTab = 'scores' | 'slots' | 'payouts' | 'bookings' | 'coupons' | 'config' | 'users'

interface Props {
  userRole?: string
  slots: any[]
  teams: any[]
  payouts: any[]
  bookings: any[]
  coupons: any[]
  config: Record<string, string>
  usersList?: any[]
}

export default function AdminClient({ userRole = 'admin', slots, teams, payouts: initialPayouts, bookings, coupons, config, usersList = [] }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<AdminTab>('scores')
  const [payouts, setPayouts] = useState(initialPayouts)
  const [users, setUsers] = useState(usersList)

  const isSuperAdmin = userRole === 'admin'

  const allTabs: { id: AdminTab; label: string; superOnly?: boolean }[] = [
    { id: 'scores', label: '📊 Score Entry' },
    { id: 'slots', label: '📅 Slots', superOnly: true },
    { id: 'payouts', label: `💸 Payouts (${payouts.filter(p => p.status === 'pending').length})`, superOnly: true },
    { id: 'bookings', label: '📋 Bookings', superOnly: true },
    { id: 'coupons', label: '🎟️ Coupons', superOnly: true },
    { id: 'config', label: '⚙️ Config', superOnly: true },
    { id: 'users', label: '👥 Admin Roles', superOnly: true },
  ]

  const visibleTabs = isSuperAdmin ? allTabs : allTabs.filter(t => !t.superOnly)

  async function markPayoutPaid(payoutId: string) {
    await supabase
      .from('payouts')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('payout_id', payoutId)

    setPayouts(prev => prev.map(p =>
      p.payout_id === payoutId ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p
    ))
  }

  async function updateUserRole(userId: string, newRole: string) {
    await supabase
      .from('users')
      .update({ role: newRole })
      .eq('user_id', userId)

    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
  }

  return (
    <div className={styles.adminPage}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.logoText}>BGFS</span>
          <span className={styles.logoLabel}>
            {isSuperAdmin ? 'Super Admin' : 'Score Admin'}
          </span>
        </div>
        <nav className={styles.sidebarNav}>
          {visibleTabs.map(t => (
            <button
              key={t.id}
              className={`${styles.sidebarBtn} ${tab === t.id ? styles.sidebarActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className={styles.adminMain}>
        <div className={styles.adminContent}>
          {tab === 'scores' && <ScoreEntryTab slots={slots} teams={teams} supabase={supabase} />}
          {isSuperAdmin && tab === 'slots' && <SlotsTab slots={slots} supabase={supabase} teams={teams} />}
          {isSuperAdmin && tab === 'payouts' && <PayoutsTab payouts={payouts} onMarkPaid={markPayoutPaid} />}
          {isSuperAdmin && tab === 'bookings' && <BookingsTab bookings={bookings} />}
          {isSuperAdmin && tab === 'coupons' && <CouponsTab coupons={coupons} teams={teams} supabase={supabase} />}
          {isSuperAdmin && tab === 'config' && <ConfigTab config={config} supabase={supabase} />}
          {isSuperAdmin && tab === 'users' && <UsersTab users={users} onUpdateRole={updateUserRole} />}
        </div>
      </main>
    </div>
  )
}

// ── SCORE ENTRY TAB ──────────────────────────────────────────────
function ScoreEntryTab({ slots, teams, supabase }: any) {
  const [selectedSlot, setSelectedSlot] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [matchNum, setMatchNum] = useState(1)
  const [position, setPosition] = useState('')
  const [kills, setKills] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [bookedTeams, setBookedTeams] = useState<any[]>([])
  const [recordedMatches, setRecordedMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  // Live Mathematical Auto-Calculations
  const posNum = parseInt(position)
  const killsNum = parseInt(kills) || 0
  const positionPoints = position && posNum >= 1 && posNum <= 24 ? getPositionPoints(posNum) : 0
  const eliminationPoints = killsNum * 1
  const totalPoints = positionPoints + eliminationPoints

  async function loadSlotData(slotId: string) {
    if (!slotId) {
      setBookedTeams([])
      setRecordedMatches([])
      return
    }

    // Load booked teams for slot
    const { data: bData } = await supabase
      .from('bookings')
      .select('team_id, teams(team_id, team_name)')
      .eq('slot_id', slotId)
      .eq('payment_status', 'paid')
    setBookedTeams(bData?.map((b: any) => b.teams).filter(Boolean) || [])

    // Load recorded matches for slot
    setLoadingMatches(true)
    const { data: mData } = await supabase
      .from('matches')
      .select('*, teams(team_name)')
      .eq('slot_id', slotId)
      .order('match_number', { ascending: true })
    setRecordedMatches(mData || [])
    setLoadingMatches(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setSaving(true)

    const pos = parseInt(position)
    const k = parseInt(kills) || 0
    const posPts = getPositionPoints(pos)
    const elimPts = k * 1
    const total = posPts + elimPts

    const { error } = await supabase
      .from('matches')
      .upsert({
        slot_id: selectedSlot,
        match_number: matchNum,
        team_id: selectedTeam,
        placement: pos,
        kills: k,
        placement_points: posPts,
        kill_points: elimPts,
        total_points: total,
      }, { onConflict: 'slot_id,match_number,team_id' })

    setSaving(false)
    if (error) {
      setMsg('❌ Error: ' + error.message)
    } else {
      setMsg(`✅ Saved! Match ${matchNum}: Position #${pos} (${posPts} Pts) + ${k} Elims (${elimPts} Pts) = ${total} Total Pts`)
      setPosition('')
      setKills('')
      loadSlotData(selectedSlot)
      if (matchNum < 3) setMatchNum(matchNum + 1)
    }
  }

  async function handleDeleteMatch(matchId: string) {
    if (!confirm('Delete this match score entry?')) return
    await supabase.from('matches').delete().eq('match_id', matchId)
    loadSlotData(selectedSlot)
  }

  return (
    <div>
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>📊 Points Table Score Entry</h2>
          <p className={styles.tabDesc}>
            Fill in team finish position &amp; eliminations. Position points and total points are calculated automatically using the mathematical tool based on the official BGIS points table.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem', marginTop: '1rem' }}>
        {/* Main Entry Form */}
        <form onSubmit={handleSave} className={styles.scoreForm}>
          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Select Slot</label>
              <select
                className="form-input"
                value={selectedSlot}
                onChange={e => {
                  setSelectedSlot(e.target.value)
                  setSelectedTeam('')
                  loadSlotData(e.target.value)
                }}
                required
              >
                <option value="">Select slot...</option>
                {slots.map((s: any) => (
                  <option key={s.slot_id} value={s.slot_id}>
                    {new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} • {s.time_label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">
                Select Team {bookedTeams.length > 0 && <span style={{ color: '#22c55e', fontWeight: 600 }}>({bookedTeams.length} booked)</span>}
              </label>
              <select
                className="form-input"
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                required
              >
                <option value="">
                  {selectedSlot ? (bookedTeams.length > 0 ? 'Select booked team...' : 'Select team...') : 'Select a slot first'}
                </option>
                {(bookedTeams.length > 0 ? bookedTeams : teams).map((t: any) => (
                  <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Match Number</label>
              <div className={styles.matchBtns}>
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`btn ${matchNum === n ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                    style={matchNum === n ? { background: '#fbbf24', color: '#111', fontWeight: 800 } : {}}
                    onClick={() => setMatchNum(n)}
                  >
                    Match {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Position / Rank (1 – 24)</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={24}
                value={position}
                onChange={e => setPosition(e.target.value)}
                placeholder="e.g. 1 (for 1st place)"
                required
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Eliminations / Kills</label>
              <input
                type="number"
                className="form-input"
                min={0}
                max={99}
                value={kills}
                onChange={e => setKills(e.target.value)}
                placeholder="e.g. 5 (1 pt / kill)"
              />
            </div>
          </div>

          {/* Automatic Mathematical Calculation Box */}
          <div
            style={{
              background: '#121212',
              border: '1.5px solid #fbbf24',
              borderRadius: '12px',
              padding: '1rem',
              margin: '1rem 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#fbbf24',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
              }}
            >
              <span>🧮 AUTOMATIC MATHEMATICAL SCORE CALCULATOR</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr auto 1.2fr',
                alignItems: 'center',
                gap: '0.5rem',
                textAlign: 'center',
              }}
            >
              {/* Position Points */}
              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '8px',
                  padding: '0.6rem 0.4rem',
                }}
              >
                <div style={{ fontSize: '0.6rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                  POSITION POINTS
                </div>
                <div style={{ fontSize: '1.2rem', color: '#fbbf24', fontWeight: 900, marginTop: '2px' }}>
                  {position ? `${positionPoints} Pts` : '—'}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#6b7280', marginTop: '2px' }}>
                  {position ? `Pos #${posNum} auto-filled` : 'Fill position above'}
                </div>
              </div>

              <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.2rem' }}>+</div>

              {/* Elimination Points */}
              <div
                style={{
                  background: '#1a1a1a',
                  border: '1px solid #333333',
                  borderRadius: '8px',
                  padding: '0.6rem 0.4rem',
                }}
              >
                <div style={{ fontSize: '0.6rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase' }}>
                  ELIMINATION POINTS
                </div>
                <div style={{ fontSize: '1.2rem', color: '#22c55e', fontWeight: 900, marginTop: '2px' }}>
                  {eliminationPoints} Pts
                </div>
                <div style={{ fontSize: '0.58rem', color: '#6b7280', marginTop: '2px' }}>
                  {killsNum} Kills × 1 pt
                </div>
              </div>

              <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '1.2rem' }}>=</div>

              {/* Total Points */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)',
                  border: '1.5px solid #fbbf24',
                  borderRadius: '8px',
                  padding: '0.6rem 0.4rem',
                  boxShadow: '0 0 12px rgba(251, 191, 36, 0.2)',
                }}
              >
                <div style={{ fontSize: '0.62rem', color: '#ffffff', fontWeight: 800, textTransform: 'uppercase' }}>
                  TOTAL MATCH POINTS
                </div>
                <div style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 900, marginTop: '2px' }}>
                  {position ? `${totalPoints} PTS` : '—'}
                </div>
                <div style={{ fontSize: '0.58rem', color: '#fbbf24', fontWeight: 700, marginTop: '2px' }}>
                  Auto Calculated
                </div>
              </div>
            </div>
          </div>

          {msg && (
            <p className={`${styles.scoreMsg} ${msg.includes('✅') ? styles.scoreMsgOk : styles.scoreMsgErr}`}>
              {msg}
            </p>
          )}

          <button id="save-score-btn" type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontWeight: 800 }} disabled={saving}>
            {saving ? 'Saving Match Score...' : '💾 Save Match Score →'}
          </button>
        </form>

        {/* Reference Cheat Sheet Box */}
        <div
          style={{
            background: '#151515',
            border: '1px solid #262626',
            borderRadius: '12px',
            padding: '1rem',
            height: 'fit-content',
          }}
        >
          <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fbbf24', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            📜 BGIS Position Points Table
          </h3>
          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', textAlign: 'left', color: '#888' }}>
                <th style={{ padding: '4px 6px' }}>Position</th>
                <th style={{ padding: '4px 6px', textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['1st Place', '10 Pts'],
                ['2nd Place', '6 Pts'],
                ['3rd Place', '5 Pts'],
                ['4th Place', '4 Pts'],
                ['5th Place', '3 Pts'],
                ['6th–10th Place', '2 Pts'],
                ['11th–15th Place', '1 Pt'],
                ['16th–24th Place', '0 Pts'],
              ].map(([posStr, ptStr]) => (
                <tr key={posStr} style={{ borderBottom: '1px solid #1f1f1f' }}>
                  <td style={{ padding: '5px 6px', color: '#e5e7eb', fontWeight: 600 }}>{posStr}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#fbbf24', fontWeight: 800 }}>{ptStr}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid #333' }}>
                <td style={{ padding: '6px 6px', color: '#4ade80', fontWeight: 700 }}>Each Elimination</td>
                <td style={{ padding: '6px 6px', textAlign: 'right', color: '#4ade80', fontWeight: 800 }}>1 Pt</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recorded Scores List for Selected Slot */}
      {selectedSlot && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem' }}>
            Recorded Match Scores for Selected Slot ({recordedMatches.length})
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Match #</th>
                  <th>Team</th>
                  <th>Position</th>
                  <th>Position Points</th>
                  <th>Elimination Points</th>
                  <th>Total Points</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recordedMatches.map((m: any) => (
                  <tr key={m.match_id}>
                    <td><strong style={{ color: '#fbbf24' }}>Match {m.match_number}</strong></td>
                    <td><strong>{m.teams?.team_name || m.team_id}</strong></td>
                    <td>#{m.placement}</td>
                    <td style={{ color: '#fbbf24', fontWeight: 700 }}>{m.placement_points} pts</td>
                    <td style={{ color: '#4ade80', fontWeight: 700 }}>{m.kills} elims ({m.kill_points} pts)</td>
                    <td><strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>{m.total_points} PTS</strong></td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#ef4444', borderColor: '#ef4444', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteMatch(m.match_id)}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {recordedMatches.length === 0 && !loadingMatches && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#888888', padding: '1.5rem' }}>
                      No score entries recorded for this slot yet. Use the form above to add scores.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SLOTS MANAGEMENT TAB ──────────────────────────────────────────
function SlotsTab({ slots, supabase }: any) {
  const [creating, setCreating] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newCapacity, setNewCapacity] = useState('20')
  const [newFee, setNewFee] = useState('50')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editRooms, setEditRooms] = useState<Record<string, { roomId: string; roomPw: string; whatsapp: string }>>({})

  async function createSlot(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('slots').insert({
      date: newDate,
      time_label: newTime,
      capacity: parseInt(newCapacity) || 20,
      entry_fee: parseInt(newFee) || 50,
      whatsapp_link: newWhatsapp.trim() || null,
    })
    setSaving(false)
    if (error) { setMsg('❌ ' + error.message); return }
    setMsg('✅ Slot created!')
    setCreating(false)
    setNewDate(''); setNewTime(''); setNewWhatsapp('')
    window.location.reload()
  }

  async function saveRoomDetails(slotId: string) {
    const details = editRooms[slotId]
    if (!details) return
    await supabase
      .from('slots')
      .update({ room_id: details.roomId, room_password: details.roomPw, whatsapp_link: details.whatsapp || null })
      .eq('slot_id', slotId)
    setMsg('✅ Slot details saved!')
  }

  async function changeSlotStatus(slotId: string, newStatus: 'open' | 'full' | 'completed') {
    const { error } = await supabase.from('slots').update({ status: newStatus }).eq('slot_id', slotId)
    if (error) { setMsg('❌ ' + error.message); return }
    setMsg(`✅ Slot status updated to ${newStatus.toUpperCase()}`)
    window.location.reload()
  }

  async function deleteSlot(slotId: string) {
    if (!confirm('Delete this slot? This cannot be undone.')) return
    const { error } = await supabase.from('slots').delete().eq('slot_id', slotId)
    if (error) { setMsg('❌ ' + error.message); return }
    window.location.reload()
  }

  return (
    <div>
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>Slots Management</h2>
          <p className={styles.tabDesc}>Create slots, set room details, mark completed, or revert open.</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(!creating)}>
          + New Slot
        </button>
      </div>

      {creating && (
        <form onSubmit={createSlot} className={styles.createSlotForm}>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={newDate} onChange={e => setNewDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Time Label</label>
              <input type="text" className="form-input" placeholder="e.g. 7:00 PM – 9:00 PM" value={newTime} onChange={e => setNewTime(e.target.value)} required />
            </div>
          </div>
          <div className={styles.formRow}>
            <div className="form-group">
              <label className="form-label">Capacity (teams)</label>
              <input type="number" className="form-input" min={1} max={100} value={newCapacity} onChange={e => setNewCapacity(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Fee (₹)</label>
              <input type="number" className="form-input" min={0} value={newFee} onChange={e => setNewFee(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp Group Link (optional)</label>
            <input type="url" className="form-input" placeholder="https://chat.whatsapp.com/..." value={newWhatsapp} onChange={e => setNewWhatsapp(e.target.value)} />
          </div>
          {msg && <p className={styles.scoreMsg}>{msg}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Creating...' : 'Create Slot'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="table-wrapper" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Date / Time</th>
              <th>Teams</th>
              <th>Status</th>
              <th>Room ID / PW / WhatsApp</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot: any) => {
              const edit = editRooms[slot.slot_id] || { roomId: slot.room_id || '', roomPw: slot.room_password || '', whatsapp: slot.whatsapp_link || '' }
              return (
                <tr key={slot.slot_id}>
                  <td>
                    <div><strong>{new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</strong></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{slot.time_label}</div>
                  </td>
                  <td>{slot.teams_booked_count}/{slot.capacity}</td>
                  <td>
                    <span className={`badge ${slot.status === 'open' ? 'badge-success' : slot.status === 'full' ? 'badge-warning' : 'badge-neutral'}`}>
                      {slot.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
                      <input type="text" className="form-input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} placeholder="Room ID"
                        value={edit.roomId} onChange={e => setEditRooms(prev => ({ ...prev, [slot.slot_id]: { ...edit, roomId: e.target.value } }))} />
                      <input type="text" className="form-input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} placeholder="Password"
                        value={edit.roomPw} onChange={e => setEditRooms(prev => ({ ...prev, [slot.slot_id]: { ...edit, roomPw: e.target.value } }))} />
                      <input type="text" className="form-input" style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }} placeholder="WhatsApp link (optional)"
                        value={edit.whatsapp} onChange={e => setEditRooms(prev => ({ ...prev, [slot.slot_id]: { ...edit, whatsapp: e.target.value } }))} />
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexDirection: 'column' }}>
                      <button className="btn btn-success btn-sm" onClick={() => saveRoomDetails(slot.slot_id)}>💾 Save</button>

                      {slot.status === 'completed' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ background: '#fbbf24', color: '#111', fontWeight: 'bold' }}
                          onClick={() => changeSlotStatus(slot.slot_id, 'open')}
                          title="Revert back to Open status if clicked by mistake"
                        >
                          ↺ REVERT TO OPEN
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, fontSize: '0.75rem' }}
                            onClick={() => changeSlotStatus(slot.slot_id, 'completed')}
                          >
                            ✓ Done
                          </button>
                          {slot.status === 'open' ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.75rem', borderColor: '#eab308', color: '#eab308' }}
                              onClick={() => changeSlotStatus(slot.slot_id, 'full')}
                            >
                              Full
                            </button>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ fontSize: '0.75rem', borderColor: '#22c55e', color: '#22c55e' }}
                              onClick={() => changeSlotStatus(slot.slot_id, 'open')}
                            >
                              Open
                            </button>
                          )}
                        </div>
                      )}

                      <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => deleteSlot(slot.slot_id)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {msg && <p className={styles.scoreMsg} style={{ marginTop: '0.75rem' }}>{msg}</p>}
    </div>
  )
}

// ── PAYOUTS TAB ──────────────────────────────────────────────────
function PayoutsTab({ payouts, onMarkPaid }: { payouts: any[]; onMarkPaid: (id: string) => void }) {
  const pending = payouts.filter(p => p.status === 'pending')
  const paid = payouts.filter(p => p.status === 'paid')

  return (
    <div>
      <h2 className={styles.tabTitle}>Payouts</h2>
      <p className={styles.tabDesc}>Manual UPI payouts. Mark as paid after sending.</p>

      {pending.length > 0 && (
        <div className={styles.payoutSection}>
          <h3 className={styles.payoutSubhead}>⏳ Pending ({pending.length})</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Place</th>
                  <th>Amount</th>
                  <th>UPI ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(p => (
                  <tr key={p.payout_id}>
                    <td><strong>{p.teams?.team_name}</strong></td>
                    <td>
                      <span className={`badge ${p.place === '1st' ? 'badge-gold' : 'badge-silver'}`}>
                        {p.place}
                      </span>
                    </td>
                    <td><strong style={{ color: 'var(--brand-primary)' }}>₹{p.amount}</strong></td>
                    <td>
                      <code style={{ fontSize: '0.85rem' }}>{p.upi_id || 'No UPI on file'}</code>
                    </td>
                    <td>
                      <button
                        id={`mark-paid-${p.payout_id}`}
                        className="btn btn-success btn-sm"
                        onClick={() => onMarkPaid(p.payout_id)}
                      >
                        ✓ Mark Paid
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paid.length > 0 && (
        <div className={styles.payoutSection} style={{ marginTop: '1.5rem' }}>
          <h3 className={styles.payoutSubhead}>✅ Paid ({paid.length})</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Place</th>
                  <th>Amount</th>
                  <th>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {paid.map(p => (
                  <tr key={p.payout_id}>
                    <td>{p.teams?.team_name}</td>
                    <td><span className={`badge ${p.place === '1st' ? 'badge-gold' : 'badge-silver'}`}>{p.place}</span></td>
                    <td>₹{p.amount}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payouts.length === 0 && (
        <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center' }}>
          No payouts yet. Enter slot scores to generate payout records.
        </p>
      )}
    </div>
  )
}

// ── BOOKINGS TAB ─────────────────────────────────────────────────
function BookingsTab({ bookings }: { bookings: any[] }) {
  return (
    <div>
      <h2 className={styles.tabTitle}>Bookings</h2>
      <p className={styles.tabDesc}>All paid slot bookings. Payment confirmed automatically by Razorpay.</p>
      <div className="table-wrapper" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Slot Date</th>
              <th>Slot Time</th>
              <th>Payment</th>
              <th>Coupon Used</th>
              <th>Booked At</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map(b => (
              <tr key={b.booking_id}>
                <td><strong>{b.teams?.team_name}</strong></td>
                <td>{b.slots?.date ? new Date(b.slots.date + 'T00:00:00').toLocaleDateString('en-IN') : '—'}</td>
                <td style={{ fontSize: '0.85rem' }}>{b.slots?.time_label || '—'}</td>
                <td><span className="badge badge-success">{b.payment_status}</span></td>
                <td>
                  {b.coupon_used
                    ? <span className="badge badge-info">Coupon Applied</span>
                    : <span className="badge badge-neutral">No</span>}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(b.created_at).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No bookings yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── COUPONS TAB ──────────────────────────────────────────────────
function CouponsTab({ coupons, teams, supabase }: { coupons: any[]; teams: any[]; supabase: any }) {
  const [list, setList] = useState(coupons)
  const [issueTeam, setIssueTeam] = useState('')
  const [issuing, setIssuing] = useState(false)
  const [msg, setMsg] = useState('')

  async function issueCoupon(e: React.FormEvent) {
    e.preventDefault()
    if (!issueTeam) return
    setIssuing(true); setMsg('')
    // Generate code client-side (server will also auto-generate if blank, but we want to show it)
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    const { data, error } = await supabase
      .from('coupons')
      .insert({ team_id: issueTeam, type: 'free_slot', status: 'unused', code })
      .select('*, teams(team_name)')
      .single()
    setIssuing(false)
    if (error) { setMsg('❌ ' + error.message); return }
    setList(prev => [data, ...prev])
    setMsg(`✅ Coupon issued! Code: ${data.code} — share this with the team via WhatsApp.`)
    setIssueTeam('')
  }

  return (
    <div>
      <h2 className={styles.tabTitle}>Coupons</h2>
      <p className={styles.tabDesc}>Issue free slot coupons to 3rd-place teams. Share the code with them via WhatsApp.</p>

      {/* Issue Form */}
      <form onSubmit={issueCoupon} className={styles.createSlotForm}>
        <div className={styles.formRow}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Issue Coupon To Team</label>
            <select className="form-input" value={issueTeam} onChange={e => setIssueTeam(e.target.value)} required>
              <option value="">Select team...</option>
              {teams.map((t: any) => (
                <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={issuing}>
              {issuing ? 'Issuing...' : '+ Issue Free Coupon'}
            </button>
          </div>
        </div>
        {msg && <p className={`${styles.scoreMsg} ${msg.includes('✅') ? styles.scoreMsgOk : styles.scoreMsgErr}`}>{msg}</p>}
      </form>

      <div className="table-wrapper" style={{ marginTop: '1.25rem' }}>
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>Code</th>
              <th>Status</th>
              <th>Issued</th>
              <th>Used</th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <tr key={c.coupon_id}>
                <td><strong>{c.teams?.team_name}</strong></td>
                <td><code style={{ background: '#1a1a1a', padding: '0.2rem 0.5rem', borderRadius: '4px', letterSpacing: '0.08em', color: '#fbbf24' }}>{c.code || '—'}</code></td>
                <td>
                  <span className={`badge ${c.status === 'unused' ? 'badge-success' : 'badge-neutral'}`}>
                    {c.status}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(c.issued_at).toLocaleDateString('en-IN')}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {c.used_at ? new Date(c.used_at).toLocaleDateString('en-IN') : '—'}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No coupons issued yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── CONFIG TAB ───────────────────────────────────────────────────
function ConfigTab({ config, supabase }: { config: Record<string, string>; supabase: any }) {
  const [values, setValues] = useState(config)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const fields = [
    { key: 'grand_finals_date', label: 'Grand Finals Date (ISO)', placeholder: '2025-09-14T18:00:00+05:30', type: 'text' },
    { key: 'whatsapp_invite_link', label: 'WhatsApp Community Link', placeholder: 'https://chat.whatsapp.com/...', type: 'text' },
    { key: 'cycle_start_date', label: 'Cycle Start Date', placeholder: '2025-09-01', type: 'date' },
    { key: 'cycle_end_date', label: 'Cycle End Date', placeholder: '2025-09-14', type: 'date' },
    { key: 'slot_entry_fee', label: 'Slot Entry Fee (₹)', placeholder: '50', type: 'number' },
  ]

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMsg('')

    const updates = Object.entries(values).map(([key, value]) => ({ key, value }))
    const { error } = await supabase.from('config').upsert(updates, { onConflict: 'key' })

    setSaving(false)
    if (error) { setMsg('❌ ' + error.message) }
    else { setMsg('✅ Configuration saved!') }
  }

  return (
    <div>
      <h2 className={styles.tabTitle}>Configuration</h2>
      <p className={styles.tabDesc}>Platform-wide settings. Changes take effect immediately.</p>

      <form onSubmit={handleSave} className={styles.configForm}>
        {fields.map(field => (
          <div className="form-group" key={field.key}>
            <label className="form-label">{field.label}</label>
            <input
              type={field.type}
              className="form-input"
              placeholder={field.placeholder}
              value={values[field.key] || ''}
              onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
            />
          </div>
        ))}

        {msg && <p className={styles.scoreMsg}>{msg}</p>}
        <button id="save-config-btn" type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  )
}

// ── USERS & ROLES TAB ─────────────────────────────────────────────
function UsersTab({ users, onUpdateRole }: { users: any[]; onUpdateRole: (id: string, role: string) => void }) {
  return (
    <div>
      <h2 className={styles.tabTitle}>User & Role Management</h2>
      <p className={styles.tabDesc}>Assign special admin roles to staff members.</p>
      <div className="table-wrapper" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Email</th>
              <th>Display Name</th>
              <th>Current Role</th>
              <th>Change Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td><strong>{u.email}</strong></td>
                <td>{u.display_name || '—'}</td>
                <td>
                  <span className={`badge ${u.role === 'admin' ? 'badge-gold' : u.role === 'admin_scores' ? 'badge-info' : 'badge-neutral'}`}>
                    {u.role || 'player'}
                  </span>
                </td>
                <td>
                  <select
                    className="form-input"
                    style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem', width: 'auto' }}
                    value={u.role || 'player'}
                    onChange={e => onUpdateRole(u.user_id, e.target.value)}
                  >
                    <option value="player">Player</option>
                    <option value="captain">Captain</option>
                    <option value="admin_scores">Score Admin (Leaderboard only)</option>
                    <option value="admin">Super Admin (Full Access)</option>
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
