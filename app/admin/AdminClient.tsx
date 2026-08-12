'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPlacementPoints, getKillPoints } from '@/lib/scoring'
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
  const [placement, setPlacement] = useState('')
  const [kills, setKills] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [bookedTeams, setBookedTeams] = useState<any[]>([])

  async function loadBookedTeams(slotId: string) {
    if (!slotId) { setBookedTeams([]); return }
    const { data } = await supabase
      .from('bookings')
      .select('team_id, teams(team_id, team_name)')
      .eq('slot_id', slotId)
      .eq('payment_status', 'paid')
    setBookedTeams(data?.map((b: any) => b.teams).filter(Boolean) || [])
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    setSaving(true)

    const p = parseInt(placement)
    const k = parseInt(kills) || 0
    const pp = getPlacementPoints(p)
    const kp = getKillPoints(k)

    const { error } = await supabase
      .from('matches')
      .upsert({
        slot_id: selectedSlot,
        match_number: matchNum,
        team_id: selectedTeam,
        placement: p,
        kills: k,
        placement_points: pp,
        kill_points: kp,
        total_points: pp + kp,
      }, { onConflict: 'slot_id,match_number,team_id' })

    setSaving(false)
    if (error) {
      setMsg('❌ Error: ' + error.message)
    } else {
      setMsg(`✅ Saved! Match ${matchNum}: #${p} + ${k} kills = ${pp + kp} pts`)
      setPlacement('')
      setKills('')
      if (matchNum < 3) setMatchNum(matchNum + 1)
    }
  }

  return (
    <div>
      <h2 className={styles.tabTitle}>Score Entry</h2>
      <p className={styles.tabDesc}>Enter placement and kills for each team after each match.</p>

      <form onSubmit={handleSave} className={styles.scoreForm}>
        <div className={styles.formRow}>
          <div className="form-group">
            <label className="form-label">Slot</label>
            <select className="form-input" value={selectedSlot} onChange={e => { setSelectedSlot(e.target.value); setSelectedTeam(''); loadBookedTeams(e.target.value) }} required>
              <option value="">Select slot...</option>
              {slots.map((s: any) => (
                <option key={s.slot_id} value={s.slot_id}>
                  {new Date(s.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} — {s.time_label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Team {bookedTeams.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({bookedTeams.length} booked in slot)</span>}</label>
            <select className="form-input" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} required>
              <option value="">{selectedSlot ? (bookedTeams.length > 0 ? 'Select team...' : 'No paid bookings in this slot') : 'Select a slot first'}</option>
              {(bookedTeams.length > 0 ? bookedTeams : teams).map((t: any) => (
                <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className="form-group">
            <label className="form-label">Match #</label>
            <div className={styles.matchBtns}>
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`btn ${matchNum === n ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setMatchNum(n)}
                >
                  Match {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className="form-group">
            <label className="form-label">Placement (1–24)</label>
            <input
              type="number"
              className="form-input"
              min={1} max={24}
              value={placement}
              onChange={e => setPlacement(e.target.value)}
              placeholder="e.g. 3"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Kills</label>
            <input
              type="number"
              className="form-input"
              min={0} max={99}
              value={kills}
              onChange={e => setKills(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Preview</label>
            <div className={styles.pointsPreview}>
              {placement ? (
                <>
                  <span className={styles.previewPts}>
                    {getPlacementPoints(parseInt(placement)) + getKillPoints(parseInt(kills) || 0)} pts
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({getPlacementPoints(parseInt(placement))} place + {getKillPoints(parseInt(kills) || 0)} kills)
                  </span>
                </>
              ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
            </div>
          </div>
        </div>

        {msg && (
          <p className={`${styles.scoreMsg} ${msg.includes('✅') ? styles.scoreMsgOk : styles.scoreMsgErr}`}>
            {msg}
          </p>
        )}

        <button id="save-score-btn" type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <><span className="spinner" /> Saving...</> : 'Save Score →'}
        </button>
      </form>
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

  async function deleteSlot(slotId: string) {
    if (!confirm('Delete this slot? This cannot be undone.')) return
    const { error } = await supabase.from('slots').delete().eq('slot_id', slotId)
    if (error) { setMsg('❌ ' + error.message); return }
    window.location.reload()
  }

  async function markSlotComplete(slotId: string) {
    await supabase.from('slots').update({ status: 'completed' }).eq('slot_id', slotId)
    window.location.reload()
  }

  return (
    <div>
      <div className={styles.tabHeader}>
        <div>
          <h2 className={styles.tabTitle}>Slots Management</h2>
          <p className={styles.tabDesc}>Create slots, set room details, mark as completed.</p>
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
                      {slot.status !== 'completed' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => markSlotComplete(slot.slot_id)}>✓ Done</button>
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
