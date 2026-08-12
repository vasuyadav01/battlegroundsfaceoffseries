'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, AlertCircle, Ticket, Zap, ChevronRight } from 'lucide-react'
import styles from './page.module.css'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Slot {
  slot_id: string
  date: string
  time_label: string
  capacity: number
  teams_booked_count: number
  entry_fee: number
  status: 'open' | 'full' | 'completed'
  is_grand_finals: boolean
}

interface Props {
  slots: Slot[]
  userTeam: any
  whatsappLink: string   // global fallback
  entryFee: number
  isLoggedIn: boolean
}

// ─────────────────────────────────────────────
// Step machine: browse → checkout → simulating → confirmed
//              browse → checkout → couponConfirm → confirmed
// ─────────────────────────────────────────────
type Step = 'browse' | 'checkout' | 'simulating' | 'couponConfirm' | 'confirmed'

interface ConfirmedData {
  whatsappLink: string
  slotDate: string
  slotTime: string
}

export default function SlotsClient({ slots, userTeam, whatsappLink, entryFee, isLoggedIn }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('browse')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [couponState, setCouponState] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const [couponId, setCouponId] = useState<string | null>(null)
  const [couponError, setCouponError] = useState('')

  // Booking state
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(null)

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, Slot[]> = {}
    slots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = []
      grouped[slot.date].push(slot)
    })
    return grouped
  }, [slots])

  // ── Select a slot and go to checkout ──
  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot)
    setError('')
    setCouponCode('')
    setCouponState('idle')
    setCouponId(null)
    setCouponError('')
    setBookingId(null)
    setStep('checkout')
  }

  function handleBack() {
    setStep('browse')
    setError('')
  }

  // ── Validate coupon code ──
  const handleValidateCoupon = useCallback(async () => {
    if (!couponCode.trim()) return
    setCouponState('validating')
    setCouponError('')

    try {
      const res = await fetch('/api/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() }),
      })
      const data = await res.json()
      if (data.valid) {
        setCouponState('valid')
        setCouponId(data.coupon_id)
      } else {
        setCouponState('invalid')
        setCouponError(data.error || 'Invalid coupon code')
      }
    } catch {
      setCouponState('invalid')
      setCouponError('Failed to validate coupon')
    }
  }, [couponCode])

  // ── Proceed to payment (no coupon) ──
  async function handleProceedToPay() {
    if (!selectedSlot) return
    if (!isLoggedIn) { router.push('/login'); return }
    if (!userTeam) { router.push('/onboard'); return }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: selectedSlot.slot_id }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create booking. Please try again.')
        setLoading(false)
        return
      }

      setBookingId(data.booking_id)
      setLoading(false)
      setStep('simulating')
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  // ── Simulate payment success ──
  async function handleSimulatePayment() {
    if (!bookingId) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/booking/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Confirmation failed. Please contact support.')
        setLoading(false)
        return
      }

      setConfirmed({
        whatsappLink: data.whatsapp_link || whatsappLink,
        slotDate: data.slot_date || selectedSlot?.date || '',
        slotTime: data.slot_time || selectedSlot?.time_label || '',
      })
      setLoading(false)
      setStep('confirmed')
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
    }
  }

  // ── Coupon: show confirm dialog ──
  function handleCouponConfirmStep() {
    if (couponState !== 'valid') return
    setStep('couponConfirm')
  }

  // ── Coupon: final redeem ──
  async function handleRedeemCoupon() {
    if (!selectedSlot || !couponId) return
    if (!isLoggedIn) { router.push('/login'); return }
    if (!userTeam) { router.push('/onboard'); return }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/coupon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_id: couponId, slot_id: selectedSlot.slot_id }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Redemption failed. Please contact support.')
        setLoading(false)
        setStep('checkout')
        return
      }

      setConfirmed({
        whatsappLink: data.whatsapp_link || whatsappLink,
        slotDate: data.slot_date || selectedSlot?.date || '',
        slotTime: data.slot_time || selectedSlot?.time_label || '',
      })
      setLoading(false)
      setStep('confirmed')
    } catch (err: any) {
      setError(err.message || 'Network error')
      setLoading(false)
      setStep('checkout')
    }
  }

  // ── Format date ──
  function fmtDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    })
  }

  function fmtDateShort(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
  }

  // ─────────────────────────────────────────────
  // RENDER — CONFIRMED STATE
  // ─────────────────────────────────────────────
  if (step === 'confirmed' && confirmed) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.confirmationCard}>
            <div className={styles.confirmIconWrap}>
              <Check size={36} color="#22c55e" strokeWidth={3} />
            </div>
            <h1 className={styles.confirmTitle}>Slot Booked!</h1>
            <p className={styles.confirmSubtitle}>
              You're confirmed for{' '}
              <strong style={{ color: '#fbbf24' }}>{confirmed.slotTime}</strong>{' '}
              on <strong style={{ color: '#fbbf24' }}>{fmtDateShort(confirmed.slotDate)}</strong>.
              Room ID and password will be shared on the official WhatsApp group before match time.
            </p>

            {confirmed.whatsappLink && (
              <a
                href={confirmed.whatsappLink}
                target="_blank"
                rel="noreferrer"
                className={styles.whatsappBtn}
              >
                📱 JOIN OFFICIAL WHATSAPP GROUP →
              </a>
            )}

            <div className={styles.confirmActions}>
              <Link href="/leaderboard" className="btn btn-secondary">
                VIEW LEADERBOARD →
              </Link>
              <button
                className="btn btn-ghost"
                onClick={() => { setStep('browse'); setSelectedSlot(null); setConfirmed(null) }}
              >
                BOOK ANOTHER SLOT
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER — COUPON CONFIRM DIALOG
  // ─────────────────────────────────────────────
  if (step === 'couponConfirm' && selectedSlot) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.couponConfirmCard}>
            <div className={styles.couponConfirmIcon}>
              <Ticket size={32} color="#fbbf24" strokeWidth={1.75} />
            </div>
            <h2 className={styles.couponConfirmTitle}>Use Your Free Slot Reward?</h2>
            <p className={styles.couponConfirmBody}>
              You are about to use your{' '}
              <strong style={{ color: '#fbbf24' }}>Free Slot Coupon</strong> to book:
            </p>
            <div className={styles.couponConfirmSlot}>
              <div className={styles.couponConfirmSlotTime}>{selectedSlot.time_label}</div>
              <div className={styles.couponConfirmSlotDate}>{fmtDate(selectedSlot.date)}</div>
            </div>
            <p className={styles.couponConfirmWarning}>
              ⚠️ This action is irreversible. Your coupon will be marked as used permanently.
            </p>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.couponConfirmBtns}>
              <button
                className={styles.couponConfirmYes}
                onClick={handleRedeemCoupon}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> REDEEMING...</> : '✓ YES, CLAIM FREE SLOT'}
              </button>
              <button
                className={styles.couponConfirmNo}
                onClick={() => setStep('checkout')}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER — SIMULATE PAYMENT SCREEN
  // ─────────────────────────────────────────────
  if (step === 'simulating' && selectedSlot) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.simulateCard}>
            <div className={styles.simulateDevBadge}>⚙ DEV MODE — PAYMENT SIMULATION</div>
            <h2 className={styles.simulateTitle}>Payment Gateway</h2>
            <p className={styles.simulateSubtitle}>
              In production this will open the Razorpay checkout. For now, click below to simulate a successful payment.
            </p>

            <div className={styles.simulateSummary}>
              <div className={styles.simulateRow}>
                <span>Slot</span>
                <strong>{selectedSlot.time_label}</strong>
              </div>
              <div className={styles.simulateRow}>
                <span>Date</span>
                <strong>{fmtDateShort(selectedSlot.date)}</strong>
              </div>
              <div className={styles.simulateRow}>
                <span>Team</span>
                <strong>{userTeam?.team_name || '—'}</strong>
              </div>
              <div className={`${styles.simulateRow} ${styles.simulateTotal}`}>
                <span>TOTAL</span>
                <strong style={{ color: '#fbbf24', fontSize: '1.4rem' }}>₹{selectedSlot.entry_fee || entryFee}</strong>
              </div>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <button
              className={styles.simulateBtn}
              onClick={handleSimulatePayment}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> CONFIRMING...</> : '⚡ SIMULATE PAYMENT SUCCESS'}
            </button>

            <button
              className="btn btn-ghost"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => setStep('checkout')}
              disabled={loading}
            >
              ← BACK TO BOOKING
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ─────────────────────────────────────────────
  // RENDER — MAIN BROWSE + CHECKOUT
  // ─────────────────────────────────────────────
  return (
    <main className={styles.page}>
      <div className="container">
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>SLOT BOOKING</h1>
            <p className={styles.subtitle}>
              {step === 'checkout' && selectedSlot
                ? `Booking ${selectedSlot.time_label} · ${fmtDateShort(selectedSlot.date)}`
                : 'Choose your match time and secure your team\'s spot.'
              }
            </p>
          </div>
          {!isLoggedIn && (
            <Link href="/login" className="btn btn-primary" style={{ background: '#facc15', color: '#111' }}>
              SIGN IN TO BOOK →
            </Link>
          )}
          {step === 'checkout' && (
            <button className="btn btn-ghost" onClick={handleBack}>← BACK TO SLOTS</button>
          )}
        </div>

        <div className={styles.layout}>
          {/* ── LEFT: Slot Calendar ── */}
          <div className={styles.slotCalendar}>
            {Object.keys(slotsByDate).length === 0 && (
              <div className={styles.emptyState}>
                No active tournament slots available right now. Check back soon!
              </div>
            )}

            {Object.entries(slotsByDate).map(([date, dateSlots]) => (
              <div key={date} className={styles.dayBlock}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayName}>📅 {fmtDate(date)}</span>
                </div>
                <div className={styles.daySlots}>
                  {dateSlots.map(slot => {
                    const spotsLeft = slot.capacity - slot.teams_booked_count
                    const isFull = spotsLeft <= 0 || slot.status === 'full'
                    const isCompleted = slot.status === 'completed'
                    const isSelected = selectedSlot?.slot_id === slot.slot_id && step === 'checkout'
                    const isUrgent = !isFull && spotsLeft <= 5

                    return (
                      <button
                        key={slot.slot_id}
                        disabled={isFull || isCompleted}
                        className={`
                          ${styles.slotBtn}
                          ${isSelected ? styles.slotBtnSelected : ''}
                          ${isFull || isCompleted ? styles.slotBtnFull : ''}
                        `}
                        onClick={() => handleSelectSlot(slot)}
                      >
                        <div className={styles.slotBtnInner}>
                          <div className={styles.slotTime}>
                            ⏰ {slot.time_label}
                            {slot.is_grand_finals && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#fbbf24' }}>
                                🏆 Grand Finals
                              </span>
                            )}
                          </div>
                          <div className={styles.slotMeta}>
                            <span className={`${styles.slotCapacity} ${isUrgent ? styles.slotCapacityUrgent : ''}`}>
                              👥 {slot.teams_booked_count}/{slot.capacity}
                              {isUrgent && <span className={styles.urgentPill}>{spotsLeft} LEFT!</span>}
                            </span>
                            {isCompleted ? (
                              <span className="badge badge-neutral">ENDED</span>
                            ) : isFull ? (
                              <span className="badge badge-silver">FULL</span>
                            ) : (
                              <span className="badge badge-gold">₹{slot.entry_fee || entryFee}</span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className={styles.slotSelectedBar} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ── RIGHT: Booking Sidebar ── */}
          <div className={styles.sidebar}>
            {step === 'browse' && (
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>BOOKING SUMMARY</h3>
                <p style={{ color: '#666666', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  Select a slot from the list to view details and book.
                </p>
                {!isLoggedIn && (
                  <div className={styles.signInNudge}>
                    <AlertCircle size={16} color="#fbbf24" />
                    <span>You must be signed in to book a slot.</span>
                    <Link href="/login" style={{ color: '#fbbf24', fontWeight: 700 }}>Sign In →</Link>
                  </div>
                )}
              </div>
            )}

            {step === 'checkout' && selectedSlot && (
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>BOOKING SUMMARY</h3>

                {/* Slot info */}
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Slot Time</span>
                  <span className={styles.summaryValue}>{selectedSlot.time_label}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Date</span>
                  <span className={styles.summaryValue}>{fmtDateShort(selectedSlot.date)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Team</span>
                  <span className={styles.summaryValue}>
                    {userTeam ? userTeam.team_name : (isLoggedIn ? 'No team set' : 'Not signed in')}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Matches</span>
                  <span className={styles.summaryValue}>3 Matches</span>
                </div>

                {/* Coupon input */}
                <div className={styles.couponSection}>
                  <div className={styles.couponHeader}>
                    <Ticket size={14} color="#fbbf24" />
                    <span className={styles.couponHeaderLabel}>Have a free slot coupon?</span>
                  </div>
                  <div className={styles.couponInputRow}>
                    <input
                      type="text"
                      className={`form-input ${styles.couponInput} ${
                        couponState === 'valid' ? styles.couponInputValid :
                        couponState === 'invalid' ? styles.couponInputInvalid : ''
                      }`}
                      placeholder="Enter code (e.g. A3F9BC21)"
                      value={couponCode}
                      onChange={e => {
                        setCouponCode(e.target.value.toUpperCase())
                        setCouponState('idle')
                        setCouponError('')
                      }}
                      maxLength={12}
                      disabled={couponState === 'validating' || couponState === 'valid'}
                    />
                    {couponState !== 'valid' ? (
                      <button
                        className={styles.couponApplyBtn}
                        onClick={handleValidateCoupon}
                        disabled={!couponCode.trim() || couponState === 'validating'}
                      >
                        {couponState === 'validating' ? <span className="spinner" /> : 'APPLY'}
                      </button>
                    ) : (
                      <button
                        className={styles.couponRemoveBtn}
                        onClick={() => {
                          setCouponCode('')
                          setCouponState('idle')
                          setCouponId(null)
                          setCouponError('')
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {couponState === 'valid' && (
                    <p className={styles.couponValid}>
                      <Check size={13} /> Coupon valid — this slot will be FREE!
                    </p>
                  )}
                  {couponState === 'invalid' && (
                    <p className={styles.couponInvalid}>
                      <AlertCircle size={13} /> {couponError}
                    </p>
                  )}
                </div>

                {/* Total */}
                <div className={styles.totalRow}>
                  <span className={styles.totalLabel}>TOTAL</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {couponState === 'valid' && (
                      <span className={styles.strikeThrough}>₹{selectedSlot.entry_fee || entryFee}</span>
                    )}
                    <span className={styles.totalAmount}>
                      {couponState === 'valid' ? '₹0' : `₹${selectedSlot.entry_fee || entryFee}`}
                    </span>
                  </div>
                </div>

                {error && <p className={styles.errorMsg} style={{ marginTop: '0.75rem' }}>{error}</p>}

                {/* CTA */}
                {couponState === 'valid' ? (
                  <button
                    className={styles.couponBookBtn}
                    onClick={handleCouponConfirmStep}
                    disabled={loading}
                  >
                    <Ticket size={16} />
                    CLAIM FREE SLOT →
                  </button>
                ) : (
                  <button
                    className={styles.bookBtn}
                    onClick={handleProceedToPay}
                    disabled={loading || !isLoggedIn || !userTeam}
                  >
                    {loading
                      ? <><span className="spinner" /> PROCESSING...</>
                      : <><ChevronRight size={16} /> PROCEED TO PAYMENT</>
                    }
                  </button>
                )}

                {!isLoggedIn && (
                  <div className={styles.signInNudge} style={{ marginTop: '0.75rem' }}>
                    <AlertCircle size={14} color="#fbbf24" />
                    <Link href="/login" style={{ color: '#fbbf24' }}>Sign in to book</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
