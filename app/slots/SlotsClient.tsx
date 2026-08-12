'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle, Sparkles, ChevronRight, X, Lock } from 'lucide-react'
import styles from './page.module.css'

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

interface FreeCoupon {
  coupon_id: string
  code: string
}

interface Props {
  slots: Slot[]
  userTeam: any
  freeCoupon: FreeCoupon | null
  whatsappLink: string
  entryFee: number
  isLoggedIn: boolean
}

type ModalState = 'none' | 'checkout' | 'freeConfirm' | 'simulating' | 'confirmed'

interface ConfirmedData {
  whatsappLink: string
  slotDate: string
  slotTime: string
}

export default function SlotsClient({ slots, userTeam, freeCoupon, whatsappLink, entryFee, isLoggedIn }: Props) {
  const router = useRouter()

  const [modalState, setModalState] = useState<ModalState>('none')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)

  const [bookingId, setBookingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<ConfirmedData | null>(null)

  // Track if coupon has been used in current session to immediately revert cards to paid state
  const [couponUsedInSession, setCouponUsedInSession] = useState(false)
  const activeFreeCoupon = !couponUsedInSession ? freeCoupon : null

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, Slot[]> = {}
    slots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = []
      grouped[slot.date].push(slot)
    })
    return grouped
  }, [slots])

  // ── Handle Card Button Click ──
  function handleSlotAction(slot: Slot, isFreeAction: boolean) {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }
    if (!userTeam) {
      router.push('/onboard')
      return
    }

    setSelectedSlot(slot)
    setError('')
    setBookingId(null)

    if (isFreeAction && activeFreeCoupon) {
      setModalState('freeConfirm')
    } else {
      setModalState('checkout')
    }
  }

  // ── Proceed to Paid Booking ──
  async function handleProceedToPay() {
    if (!selectedSlot) return
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
        setError(data.error || 'Failed to initialize booking. Please try again.')
        setLoading(false)
        return
      }

      setBookingId(data.booking_id)
      setLoading(false)
      setModalState('simulating')
    } catch (err: any) {
      setError(err.message || 'Network connection error')
      setLoading(false)
    }
  }

  // ── Simulate Payment Success ──
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
        setError(data.error || 'Payment confirmation failed.')
        setLoading(false)
        return
      }

      setConfirmed({
        whatsappLink: data.whatsapp_link || whatsappLink,
        slotDate: data.slot_date || selectedSlot?.date || '',
        slotTime: data.slot_time || selectedSlot?.time_label || '',
      })
      setLoading(false)
      setModalState('confirmed')
    } catch (err: any) {
      setError(err.message || 'Network connection error')
      setLoading(false)
    }
  }

  // ── Redeem Free Slot Reward ──
  async function handleRedeemFreeSlot() {
    if (!selectedSlot || !activeFreeCoupon) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/coupon/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_id: activeFreeCoupon.coupon_id,
          slot_id: selectedSlot.slot_id,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Free slot redemption failed.')
        setLoading(false)
        return
      }

      setCouponUsedInSession(true)
      setConfirmed({
        whatsappLink: data.whatsapp_link || whatsappLink,
        slotDate: data.slot_date || selectedSlot?.date || '',
        slotTime: data.slot_time || selectedSlot?.time_label || '',
      })
      setLoading(false)
      setModalState('confirmed')
    } catch (err: any) {
      setError(err.message || 'Network connection error')
      setLoading(false)
    }
  }

  // Format date functions
  function fmtDateHeader(d: string) {
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
  if (modalState === 'confirmed' && confirmed) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.confirmationCard}>
            <div className={styles.confirmIconWrap}>
              <Check size={36} color="#22c55e" strokeWidth={3} />
            </div>
            <h1 className={styles.confirmTitle}>Slot Booked!</h1>
            <p className={styles.confirmSubtitle}>
              Your team <strong style={{ color: '#ffffff' }}>{userTeam?.team_name}</strong> is confirmed for{' '}
              <strong style={{ color: '#fbbf24' }}>{confirmed.slotTime}</strong> on{' '}
              <strong style={{ color: '#fbbf24' }}>{fmtDateShort(confirmed.slotDate)}</strong>.
              Match Room ID & Password will be shared in the WhatsApp group.
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
                onClick={() => { setModalState('none'); setSelectedSlot(null); setConfirmed(null) }}
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
  // RENDER — MAIN GRID UI
  // ─────────────────────────────────────────────
  return (
    <main className={styles.page}>
      <div className="container">
        {/* Banner if team has earned a free slot */}
        {activeFreeCoupon && (
          <div className={styles.freeRewardBanner}>
            <div className={styles.freeRewardBannerLeft}>
              <Sparkles size={20} className={styles.sparkleIcon} />
              <div>
                <strong style={{ color: '#ffffff' }}>FREE SLOT REWARD AVAILABLE!</strong>
                <span className={styles.bannerSubtext}>
                  You earned a free slot reward (3rd place finish). Choose any open slot below to claim for ₹0!
                </span>
              </div>
            </div>
            <span className={styles.freeRewardTag}>1 FREE SLOT</span>
          </div>
        )}

        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>MATCH SLOTS</h1>
            <p className={styles.subtitle}>
              3 Matches per Slot · ₹{entryFee} per Slot · Max 20 Teams
            </p>
          </div>
          {!isLoggedIn && (
            <Link href="/login" className="btn btn-primary" style={{ background: '#fbbf24', color: '#111' }}>
              SIGN IN TO BOOK →
            </Link>
          )}
        </div>

        {/* Empty state */}
        {Object.keys(slotsByDate).length === 0 && (
          <div className={styles.emptyState}>
            No active tournament slots available right now. Check back soon!
          </div>
        )}

        {/* Date groups with Square Card Grid */}
        {Object.entries(slotsByDate).map(([date, dateSlots]) => (
          <div key={date} className={styles.daySection}>
            <h2 className={styles.dayHeader}>📅 {fmtDateHeader(date)}</h2>

            <div className={styles.slotGrid}>
              {dateSlots.map(slot => {
                const spotsLeft = slot.capacity - slot.teams_booked_count
                const isFull = spotsLeft <= 0 || slot.status === 'full'
                const isCompleted = slot.status === 'completed'
                const isUrgent = !isFull && !isCompleted && spotsLeft <= 5

                const showFreeOption = Boolean(activeFreeCoupon && !isFull && !isCompleted)

                return (
                  <div
                    key={slot.slot_id}
                    className={`
                      ${styles.slotCard}
                      ${isFull || isCompleted ? styles.slotCardFull : ''}
                      ${showFreeOption ? styles.slotCardFree : ''}
                    `}
                  >
                    {/* Badge row */}
                    <div className={styles.cardBadgeRow}>
                      <span className={`
                        ${styles.spotsBadge}
                        ${isFull ? styles.spotsFull : ''}
                        ${isUrgent ? styles.spotsUrgent : ''}
                      `}>
                        {isCompleted
                          ? 'ENDED'
                          : isFull
                          ? '20/20 FULL'
                          : `${spotsLeft} / ${slot.capacity} SPOTS LEFT`}
                      </span>

                      {showFreeOption && (
                        <span className={styles.freeRibbon}>
                          <Sparkles size={11} /> FREE
                        </span>
                      )}
                    </div>

                    {/* Time */}
                    <div className={styles.cardTime}>
                      {slot.time_label}
                    </div>

                    {slot.is_grand_finals && (
                      <div className={styles.cardGFBadge}>
                        🏆 Grand Finals
                      </div>
                    )}

                    {/* Price Tag */}
                    <div className={styles.cardPriceRow}>
                      {showFreeOption ? (
                        <div className={styles.freePriceTag}>
                          <span className={styles.strikePrice}>₹{slot.entry_fee || entryFee}</span>
                          <span className={styles.freeText}>₹0 FREE</span>
                        </div>
                      ) : (
                        <div className={styles.normalPriceTag}>
                          ₹{slot.entry_fee || entryFee} <span className={styles.priceMeta}>/ 3 Matches</span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Pinned Action Button */}
                    <div className={styles.cardBottomAction}>
                      {isCompleted ? (
                        <button disabled className={styles.cardBtnDisabled}>
                          ENDED
                        </button>
                      ) : isFull ? (
                        <button disabled className={styles.cardBtnDisabled}>
                          <Lock size={13} /> FULL
                        </button>
                      ) : showFreeOption ? (
                        <button
                          className={styles.cardBtnFree}
                          onClick={() => handleSlotAction(slot, true)}
                        >
                          <Sparkles size={14} /> BOOK FREE →
                        </button>
                      ) : (
                        <button
                          className={styles.cardBtnNormal}
                          onClick={() => handleSlotAction(slot, false)}
                        >
                          BOOK SLOT →
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ───────────────────────────────────────────── */}
      {/* MODALS / BOTTOM SHEETS */}
      {/* ───────────────────────────────────────────── */}

      {/* ── 1. FREE SLOT ACCIDENTAL Safeguard Dialog ── */}
      {modalState === 'freeConfirm' && selectedSlot && activeFreeCoupon && (
        <div className={styles.modalOverlay} onClick={() => setModalState('none')}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setModalState('none')}>
              <X size={20} />
            </button>

            <div className={styles.modalIconWrapGold}>
              <Sparkles size={32} color="#fbbf24" />
            </div>

            <h2 className={styles.modalTitle}>Redeem Free Slot Reward?</h2>
            <p className={styles.modalBody}>
              You are using your <strong style={{ color: '#fbbf24' }}>3rd Place Free Slot Reward</strong> to book:
            </p>

            <div className={styles.modalSlotPreview}>
              <div className={styles.previewTime}>{selectedSlot.time_label}</div>
              <div className={styles.previewDate}>{fmtDateShort(selectedSlot.date)}</div>
              <div className={styles.previewFee}>Entry Fee: <span style={{ textDecoration: 'line-through' }}>₹50</span> <strong>₹0 FREE</strong></div>
            </div>

            <p className={styles.modalWarningText}>
              ⚠️ Accidental booking safeguard: Once confirmed, your 3rd-place reward will be permanently marked as used for this slot.
            </p>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.modalActionColumn}>
              <button
                className={styles.confirmFreeBtn}
                onClick={handleRedeemFreeSlot}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> REDEEMING...</> : '✓ CONFIRM & CLAIM FREE SLOT'}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setModalState('none')}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PAID CHECKOUT MODAL / BOTTOM SHEET ── */}
      {modalState === 'checkout' && selectedSlot && (
        <div className={styles.modalOverlay} onClick={() => setModalState('none')}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setModalState('none')}>
              <X size={20} />
            </button>

            <h2 className={styles.modalTitle}>BOOKING SUMMARY</h2>
            <p className={styles.modalBody}>
              Review details for your tournament entry:
            </p>

            <div className={styles.modalSummaryBox}>
              <div className={styles.summaryRow}>
                <span>Slot Time</span>
                <strong>{selectedSlot.time_label}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Date</span>
                <strong>{fmtDateShort(selectedSlot.date)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Team</span>
                <strong>{userTeam?.team_name || '—'}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Format</span>
                <strong>3 BGMI Matches</strong>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
                <span>TOTAL FEE</span>
                <strong style={{ color: '#fbbf24', fontSize: '1.3rem' }}>₹{selectedSlot.entry_fee || entryFee}</strong>
              </div>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.modalActionColumn}>
              <button
                className={styles.proceedPayBtn}
                onClick={handleProceedToPay}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> PROCESSING...</> : <><ChevronRight size={18} /> PROCEED TO PAYMENT</>}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setModalState('none')}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SIMULATE PAYMENT MODAL ── */}
      {modalState === 'simulating' && selectedSlot && (
        <div className={styles.modalOverlay} onClick={() => setModalState('none')}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.simulateDevBadge}>⚙ DEV MODE — PAYMENT SIMULATION</div>
            <h2 className={styles.modalTitle}>Payment Gateway</h2>
            <p className={styles.modalBody}>
              Click below to simulate instant payment success for testing.
            </p>

            <div className={styles.modalSummaryBox}>
              <div className={styles.summaryRow}>
                <span>Slot</span>
                <strong>{selectedSlot.time_label} ({fmtDateShort(selectedSlot.date)})</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Team</span>
                <strong>{userTeam?.team_name}</strong>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
                <span>AMOUNT</span>
                <strong style={{ color: '#fbbf24', fontSize: '1.3rem' }}>₹{selectedSlot.entry_fee || entryFee}</strong>
              </div>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.modalActionColumn}>
              <button
                className={styles.simulateBtn}
                onClick={handleSimulatePayment}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> CONFIRMING...</> : '⚡ SIMULATE PAYMENT SUCCESS'}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setModalState('checkout')}
                disabled={loading}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
