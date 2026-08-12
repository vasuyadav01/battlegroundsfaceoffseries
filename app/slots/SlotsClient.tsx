'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, X, Lock, MessageCircle } from 'lucide-react'
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
  whatsapp_link?: string
}

interface FreeCoupon {
  coupon_id: string
  code: string
}

interface Props {
  slots: Slot[]
  userTeam: any
  freeCoupon: FreeCoupon | null
  userBookedSlotIds?: string[]
  whatsappLink: string
  entryFee: number
  isLoggedIn: boolean
}

export default function SlotsClient({
  slots,
  userTeam,
  freeCoupon,
  userBookedSlotIds = [],
  whatsappLink,
  entryFee,
  isLoggedIn,
}: Props) {
  const router = useRouter()

  const [bookedSlotIds, setBookedSlotIds] = useState<string[]>(userBookedSlotIds)
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [couponUsedInSession, setCouponUsedInSession] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Auto free slot detection
  const activeFreeCoupon = couponUsedInSession ? null : freeCoupon

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const groups: Record<string, Slot[]> = {}
    slots.forEach(slot => {
      if (!groups[slot.date]) groups[slot.date] = []
      groups[slot.date].push(slot)
    })
    return groups
  }, [slots])

  // ── 1-CLICK DIRECT SLOT BOOKING ──
  async function handleDirectBookSlot(slot: Slot, isFree: boolean = false) {
    if (!isLoggedIn) {
      router.push(`/login?redirectTo=/slots`)
      return
    }

    setBookingSlotId(slot.slot_id)

    try {
      if (isFree && activeFreeCoupon) {
        // Redeem free slot coupon
        const res = await fetch('/api/coupon/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupon_id: activeFreeCoupon.coupon_id,
            slot_id: slot.slot_id,
            team_name: userTeam?.team_name || 'My Team',
          }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) {
          alert(data.error || 'Failed to claim free slot.')
          setBookingSlotId(null)
          return
        }

        setCouponUsedInSession(true)
      } else {
        // 1. Create booking
        const createRes = await fetch('/api/booking/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slot_id: slot.slot_id,
            team_name: userTeam?.team_name || 'My Team',
          }),
        })
        const createData = await createRes.json()

        if (!createRes.ok || !createData.booking_id) {
          alert(createData.error || 'Failed to book slot.')
          setBookingSlotId(null)
          return
        }

        // 2. Confirm booking
        const confirmRes = await fetch('/api/booking/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            booking_id: createData.booking_id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_order_id: `order_sim_${Date.now()}`,
            razorpay_signature: 'simulated_signature',
          }),
        })
        const confirmData = await confirmRes.json()

        if (!confirmRes.ok) {
          alert(confirmData.error || 'Payment confirmation failed.')
          setBookingSlotId(null)
          return
        }
      }

      // Success: Lock slot as booked immediately
      setBookedSlotIds(prev => [...prev, slot.slot_id])
      setSuccessToast(`Slot for ${slot.time_label} booked! Join WhatsApp group below.`)
      setBookingSlotId(null)

      setTimeout(() => setSuccessToast(null), 5000)
    } catch (err: any) {
      alert(err.message || 'Connection error during booking.')
      setBookingSlotId(null)
    }
  }

  // Deterministic date formatters
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  function fmtDateHeader(dStr: string) {
    const d = new Date(dStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dStr
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
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
                <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>FREE SLOT REWARD UNLOCKED!</strong>
                <span className={styles.bannerSubtext}>
                  You earned a free slot reward (3rd place finish). Choose any open slot below to claim for ₹0!
                </span>
              </div>
            </div>
            <span className={styles.freeRewardTag}>1 FREE REWARD</span>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className={styles.successToast}>
            <Check size={18} color="#22c55e" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>MATCH SLOTS</h1>
            <p className={styles.subtitle}>
              3 Matches per Slot · ₹{entryFee} Entry · Max 20 Teams
            </p>
          </div>
          {!isLoggedIn && (
            <Link href="/login?redirectTo=/slots" className="btn btn-primary" style={{ background: '#fbbf24', color: '#111' }}>
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
                const isAlreadyBooked = bookedSlotIds.includes(slot.slot_id)
                const isBookingThis = bookingSlotId === slot.slot_id
                const spotsLeft = slot.capacity - slot.teams_booked_count
                const isFull = spotsLeft <= 0 || slot.status === 'full'
                const isCompleted = slot.status === 'completed'
                const isUrgent = !isFull && !isCompleted && !isAlreadyBooked && spotsLeft <= 5

                const showFreeOption = Boolean(activeFreeCoupon && !isFull && !isCompleted && !isAlreadyBooked)
                const currentFee = slot.entry_fee || entryFee

                return (
                  <div
                    key={slot.slot_id}
                    className={`
                      ${styles.slotCard}
                      ${isAlreadyBooked ? styles.slotCardBooked : ''}
                      ${isFull || isCompleted ? styles.slotCardFull : ''}
                      ${showFreeOption ? styles.slotCardFree : ''}
                    `}
                  >
                    {/* Top Row: Spots Pill / Booked Badge & Free Ribbon */}
                    <div className={styles.cardTopRow}>
                      {isAlreadyBooked ? (
                        <span className={styles.spotsBooked}>
                          <Check size={11} /> BOOKED ✓
                        </span>
                      ) : (
                        <span className={`
                          ${styles.spotsBadge}
                          ${isFull ? styles.spotsFull : ''}
                          ${isUrgent ? styles.spotsUrgent : ''}
                        `}>
                          {isCompleted
                            ? 'ENDED'
                            : isFull
                            ? 'FULL'
                            : `${spotsLeft} / ${slot.capacity} SPOTS`}
                        </span>
                      )}

                      {showFreeOption && (
                        <span className={styles.freeRibbon}>
                          <Sparkles size={10} /> FREE
                        </span>
                      )}
                    </div>

                    {/* Time Label */}
                    <div className={styles.cardTime}>
                      {slot.time_label}
                    </div>

                    {slot.is_grand_finals && (
                      <div className={styles.cardGFBadge}>
                        🏆 Grand Finals
                      </div>
                    )}

                    {/* Fee / Reserved Tag */}
                    <div className={styles.cardPriceRow}>
                      {isAlreadyBooked ? (
                        <div className={styles.bookedText}>SLOT RESERVED ✓</div>
                      ) : showFreeOption ? (
                        <div className={styles.freePriceTag}>
                          <span className={styles.strikePrice}>₹{currentFee}</span>
                          <span className={styles.freeText}>₹0 FREE</span>
                        </div>
                      ) : (
                        <div className={styles.normalPriceTag}>
                          ₹{currentFee} <span className={styles.priceMeta}>/ 3 Matches</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Button */}
                    <div className={styles.cardBottomAction}>
                      {isAlreadyBooked ? (
                        <a
                          href={slot.whatsapp_link || whatsappLink || 'https://chat.whatsapp.com'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.cardBtnWhatsapp}
                        >
                          <MessageCircle size={14} /> JOIN GROUP 💬
                        </a>
                      ) : isCompleted ? (
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
                          onClick={() => handleDirectBookSlot(slot, true)}
                          disabled={isBookingThis}
                        >
                          {isBookingThis ? (
                            <><span className="spinner" /> BOOKING...</>
                          ) : (
                            <><Sparkles size={13} /> BOOK FREE (₹0)</>
                          )}
                        </button>
                      ) : (
                        <button
                          className={styles.cardBtnNormal}
                          onClick={() => handleDirectBookSlot(slot, false)}
                          disabled={isBookingThis}
                        >
                          {isBookingThis ? (
                            <><span className="spinner" /> BOOKING...</>
                          ) : (
                            `BOOK SLOT (₹${currentFee})`
                          )}
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
    </main>
  )
}
