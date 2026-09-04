'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, X, Lock, MessageCircle, Flame, Key, FlaskConical, Ticket, BookOpen, FileText, ShieldAlert } from 'lucide-react'
import { isSlotPastOrEnded } from '@/lib/utils/slotTime'
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
  unusedCoupons?: FreeCoupon[]
  userBookedSlotIds?: string[]
  whatsappLink: string
  entryFee: number
  isLoggedIn: boolean
  isTestAccount?: boolean
}

type FilterTab = 'upcoming' | 'past' | 'all'

interface MatchTimeItem {
  name: string
  time: string
  map: string
}

function parseStartTimeToMinutes(timeLabel: string): number {
  if (!timeLabel) return 21 * 60 // Default 9:00 PM (1260 mins)

  const match = timeLabel.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!match) {
    return 21 * 60 // Fallback 9:00 PM
  }

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const meridian = match[3].toUpperCase()

  if (meridian === 'PM' && hours < 12) {
    hours += 12
  } else if (meridian === 'AM' && hours === 12) {
    hours = 0
  }

  return hours * 60 + minutes
}

function formatMinutesToTimeString(totalMinutes: number): string {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440
  let hours = Math.floor(normalizedMinutes / 60)
  const minutes = normalizedMinutes % 60

  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  if (hours === 0) hours = 12

  const minStr = String(minutes).padStart(2, '0')
  return `${hours}:${minStr} ${period}`
}

function getMatchTimes(timeLabel: string): MatchTimeItem[] {
  const startMinutes = parseStartTimeToMinutes(timeLabel)

  return [
    { name: 'MATCH 1', time: formatMinutesToTimeString(startMinutes), map: 'Erangel' },
    { name: 'MATCH 2', time: formatMinutesToTimeString(startMinutes + 42), map: 'Rondo' },
    { name: 'MATCH 3', time: formatMinutesToTimeString(startMinutes + 78), map: 'Miramar' },
  ]
}

export default function SlotsClient({
  slots,
  userTeam,
  freeCoupon,
  unusedCoupons = [],
  userBookedSlotIds = [],
  whatsappLink,
  entryFee,
  isLoggedIn,
  isTestAccount = false,
}: Props) {
  const router = useRouter()

  const [bookedSlotIds, setBookedSlotIds] = useState<string[]>(userBookedSlotIds)
  const [bookingSlotId, setBookingSlotId] = useState<string | null>(null)
  const [confirmFreeSlot, setConfirmFreeSlot] = useState<Slot | null>(null)
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false)

  const [remainingCoupons, setRemainingCoupons] = useState<FreeCoupon[]>(() => {
    if (unusedCoupons && unusedCoupons.length > 0) return unusedCoupons
    if (freeCoupon) return [freeCoupon]
    return []
  })
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('upcoming')

  const [testModeEnabled, setTestModeEnabled] = useState<boolean>(true)

  async function toggleTestMode() {
    const nextState = !testModeEnabled
    setTestModeEnabled(nextState)
    try {
      await fetch('/api/user/toggle-test-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      })
    } catch (e) {}
  }

  // Filter slots based on date/time expiration
  const filteredSlots = useMemo(() => {
    return slots.filter(slot => {
      const isPast = isSlotPastOrEnded(slot.date, slot.time_label, slot.status)
      if (filterTab === 'upcoming') return !isPast
      if (filterTab === 'past') return isPast
      return true
    })
  }, [slots, filterTab])

  // Group filtered slots by date
  const slotsByDate = useMemo(() => {
    const groups: Record<string, Slot[]> = {}
    filteredSlots.forEach(slot => {
      if (!groups[slot.date]) groups[slot.date] = []
      groups[slot.date].push(slot)
    })
    return groups
  }, [filteredSlots])

// Helper to load Razorpay Checkout JS script dynamically
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

  // Handle Free Slot button click -> opens confirm dialog
  function handleFreeButtonClick(slot: Slot) {
    if (!isLoggedIn) {
      router.push(`/login?redirectTo=/slots`)
      return
    }
    setConfirmFreeSlot(slot)
  }

  // ── DIRECT SLOT BOOKING (PAID OR FREE) ──
  async function handleDirectBookSlot(slot: Slot, isFree: boolean = false) {
    if (!isLoggedIn) {
      router.push(`/login?redirectTo=/slots`)
      return
    }

    setBookingSlotId(slot.slot_id)

    try {
      if (isFree && remainingCoupons.length > 0) {
        const couponToUse = remainingCoupons[0]
        // Redeem free slot reward
        const res = await fetch('/api/coupon/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coupon_id: couponToUse.coupon_id,
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

        setRemainingCoupons(prev => prev.slice(1))
      } else {
        // Create booking record first
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

        // Test Mode Auto-Confirmation
        if (createData.auto_confirmed || createData.is_test_booking) {
          setBookedSlotIds(prev => [...prev, slot.slot_id])
          setSuccessToast(`🧪 TEST MODE: Slot for ${slot.time_label} registered successfully!`)
          setBookingSlotId(null)
          return
        }

        // Check if live Razorpay keys are configured on the server
        const orderRes = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: createData.booking_id,
            amount: slot.entry_fee || 50,
          }),
        })

        if (orderRes.ok) {
          const orderData = await orderRes.json()
          const loaded = await loadRazorpayScript()

          if (loaded && (window as any).Razorpay) {
            const rzp = new (window as any).Razorpay({
              key: orderData.keyId,
              amount: orderData.amount,
              currency: orderData.currency,
              name: 'Battlegrounds Faceoff Series',
              description: `Slot Registration: ${slot.time_label}`,
              order_id: orderData.orderId,
              handler: async function (response: any) {
                const verifyRes = await fetch('/api/payment/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    bookingId: createData.booking_id,
                    razorpayPaymentId: response.razorpay_payment_id,
                    razorpayOrderId: response.razorpay_order_id,
                    razorpaySignature: response.razorpay_signature,
                  }),
                })
                const verifyData = await verifyRes.json()
                if (verifyRes.ok && verifyData.success) {
                  setBookedSlotIds(prev => [...prev, slot.slot_id])
                  setSuccessToast(`Slot for ${slot.time_label} booked! Join WhatsApp group below.`)
                } else {
                  alert(verifyData.error || 'Payment verification failed. Please contact support.')
                }
                setBookingSlotId(null)
              },
              modal: {
                ondismiss: function () {
                  setBookingSlotId(null)
                },
              },
              prefill: {},
              theme: { color: '#fbbf24' },
            })
            rzp.open()
            return
          }
        }

        // Fallback confirmation if Razorpay keys are not configured yet
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
        {/* Banner for Admin Test Mode */}
        {isTestAccount && (
          <div style={{
            background: '#151515',
            border: '1px solid #262626',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FlaskConical size={16} style={{ color: testModeEnabled ? '#fbbf24' : '#666666', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#ffffff', fontSize: '0.9rem', display: 'block' }}>
                  ADMIN TEST MODE
                </strong>
                <span style={{ color: '#888888', fontSize: '0.8rem' }}>
                  {testModeEnabled ? 'Auto-confirms for ₹0 without Razorpay' : 'Standard user payment flow'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTestMode}
              style={{
                background: testModeEnabled ? '#fbbf24' : '#262626',
                color: testModeEnabled ? '#111111' : '#aaaaaa',
                border: testModeEnabled ? 'none' : '1px solid #333333',
                borderRadius: '20px',
                padding: '5px 14px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
              }}
            >
              TEST MODE: {testModeEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        )}

        {/* Banner if team has earned a free slot */}
        {remainingCoupons.length > 0 && (
          <div className={styles.freeRewardBanner}>
            <div className={styles.freeRewardBannerLeft}>
              <Sparkles size={20} className={styles.sparkleIcon} />
              <div>
                <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>FREE SLOT REWARD UNLOCKED!</strong>
                <span className={styles.bannerSubtext}>
                  You earned free slot reward pass(es) from placing 3rd in slot matches. Select any open slot below to claim for ₹0!
                </span>
              </div>
            </div>
            <span className={styles.freeRewardTag}>{remainingCoupons.length} FREE REWARD{remainingCoupons.length > 1 ? 'S' : ''}</span>
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
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={styles.rulesBtnHeader}
              onClick={() => setShowRulesModal(true)}
            >
              <BookOpen size={16} color="#fbbf24" />
              <span>TOURNAMENT RULES</span>
            </button>
            {!isLoggedIn && (
              <Link href="/login?redirectTo=/slots" className="btn btn-primary" style={{ background: '#fbbf24', color: '#111' }}>
                SIGN IN TO REGISTER →
              </Link>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterBtn} ${filterTab === 'upcoming' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterTab('upcoming')}
          >
            OPEN / UPCOMING SLOTS
          </button>
          <button
            className={`${styles.filterBtn} ${filterTab === 'past' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterTab('past')}
          >
            PAST SLOTS
          </button>
          <button
            className={`${styles.filterBtn} ${filterTab === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterTab('all')}
          >
            ALL SLOTS
          </button>
        </div>

        {/* Empty state */}
        {Object.keys(slotsByDate).length === 0 && (
          <div className={styles.emptyState}>
            {filterTab === 'upcoming'
              ? 'No upcoming tournament slots available right now. Check back soon or view past slots!'
              : 'No tournament slots found.'}
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
                const spotsLeft = Math.max(0, slot.capacity - slot.teams_booked_count)

                // Strict expiration check
                const isEnded = isSlotPastOrEnded(slot.date, slot.time_label, slot.status)
                const isCompleted = isEnded || slot.status === 'completed'
                const isFull = !isCompleted && (spotsLeft <= 0 || slot.status === 'full')
                const isUrgent = !isFull && !isCompleted && !isAlreadyBooked && spotsLeft < 5

                const showFreeOption = Boolean(remainingCoupons.length > 0 && !isFull && !isCompleted && !isAlreadyBooked)
                const currentFee = slot.entry_fee || entryFee

                if (isAlreadyBooked) {
                  const matchTimes = getMatchTimes(slot.time_label)

                  return (
                    <div key={slot.slot_id} className={styles.slotCardBooked}>
                      <div className={styles.cardTopRow}>
                        <span className={styles.bookedBadge}>
                          <Check size={10} /> REGISTERED
                        </span>
                      </div>

                      <div className={styles.bookedCenter}>
                        <div className={styles.bookedTime}>{slot.time_label}</div>

                        <div className={styles.matchCellsGrid}>
                          {matchTimes.map((m, idx) => (
                            <div key={idx} className={styles.matchCellBooked}>
                              <div className={styles.matchCellLabelBooked}>
                                MATCH {idx + 1}
                              </div>
                              <div className={styles.matchCellTime}>
                                {m.time}
                              </div>
                              <div className={styles.matchCellMap}>
                                {m.map}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div
                          className={styles.whatsappReasonBanner}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            width: '100%',
                            margin: '0.2rem 0 0.35rem 0',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              color: '#ffffff',
                              fontSize: '0.66rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              width: '100%',
                            }}
                          >
                            <Key size={11} color="#fbbf24" style={{ flexShrink: 0 }} />
                            <span>Join WhatsApp group for Room ID &amp; Pass</span>
                          </div>
                          <div
                            style={{
                              color: '#9ca3af',
                              fontSize: '0.55rem',
                              fontWeight: 500,
                              whiteSpace: 'nowrap',
                              lineHeight: 1,
                            }}
                          >
                            Posted 10 mins before each match
                          </div>
                        </div>
                      </div>

                      <a
                        href={slot.whatsapp_link || whatsappLink || 'https://chat.whatsapp.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.bookedBtn}
                      >
                        <MessageCircle size={13} /> Join WhatsApp Group
                      </a>
                    </div>
                  )
                }

                const matchTimes = getMatchTimes(slot.time_label)

                return (
                  <div
                    key={slot.slot_id}
                    className={`
                      ${styles.slotCard}
                      ${isFull || isCompleted ? styles.slotCardFull : ''}
                      ${showFreeOption ? styles.slotCardFree : ''}
                    `}
                  >
                    {/* Top Row: Spots Left Pill (Top-Left) & FREE Ribbon (Top-Right) */}
                    <div className={styles.cardTopRow}>
                      <span className={`
                        ${styles.spotsBadge}
                        ${isFull || isCompleted ? styles.spotsFull : ''}
                        ${isUrgent ? styles.spotsUrgent : ''}
                      `}>
                        {isCompleted ? (
                          'ENDED'
                        ) : isFull ? (
                          'FULL (20/20)'
                        ) : isUrgent ? (
                          <><Flame size={11} className={styles.flameIcon} /> {spotsLeft} SPOTS LEFT</>
                        ) : (
                          `${spotsLeft}/${slot.capacity} SPOTS`
                        )}
                      </span>

                      {showFreeOption && (
                        <span className={styles.freeRibbon}>
                          <Sparkles size={10} /> FREE
                        </span>
                      )}
                    </div>

                    {/* Time Label (Large) */}
                    <div className={styles.cardTime}>
                      {slot.time_label}
                    </div>

                    {slot.is_grand_finals && (
                      <div className={styles.cardGFBadge}>
                        🏆 Grand Finals
                      </div>
                    )}

                    {/* Price / Reward Available Line */}
                    <div className={styles.cardPriceRow}>
                      {isCompleted ? (
                        <div className={styles.priceMeta}>MATCH ENDED</div>
                      ) : showFreeOption ? (
                        <div className={styles.rewardAvailableText}>
                          <Check size={13} color="#22c55e" /> Reward available
                        </div>
                      ) : (
                        <div className={styles.normalPriceTag}>
                          ₹{currentFee} <span className={styles.priceMeta}>/ 3 Matches</span>
                        </div>
                      )}
                    </div>

                    {/* 3-cell match timings grid */}
                    <div className={styles.matchCellsGrid}>
                      {matchTimes.map((m, idx) => (
                        <div key={idx} className={styles.matchCellOpen}>
                          <div className={styles.matchCellLabelOpen}>
                            MATCH {idx + 1}
                          </div>
                          <div className={styles.matchCellTime}>
                            {m.time}
                          </div>
                          <div className={styles.matchCellMap}>
                            {m.map}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Action Button (Pinned) */}
                    <div className={styles.cardBottomAction}>
                      {isCompleted ? (
                        <button disabled className={styles.cardBtnDisabled}>
                          SLOT ENDED
                        </button>
                      ) : isFull ? (
                        <button disabled className={styles.cardBtnDisabled}>
                          <Lock size={13} /> Full
                        </button>
                      ) : showFreeOption ? (
                        <button
                          className={styles.cardBtnFreeOutline}
                          onClick={() => handleFreeButtonClick(slot)}
                          disabled={isBookingThis}
                        >
                          {isBookingThis ? (
                            <><span className="spinner" /> REGISTERING...</>
                          ) : (
                            <><Sparkles size={13} /> Register Free</>
                          )}
                        </button>
                      ) : (
                        <button
                          className={styles.cardBtnNormal}
                          onClick={() => handleDirectBookSlot(slot, false)}
                          disabled={isBookingThis}
                        >
                          {isBookingThis ? (
                            <><span className="spinner" /> REGISTERING...</>
                          ) : isTestAccount && testModeEnabled ? (
                            <><FlaskConical size={13} /> Register (Test Mode)</>
                          ) : (
                            'Register'
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

      {/* ── CONFIRM DIALOG FOR FREE SLOT ── */}
      {confirmFreeSlot && (
        <div className={styles.modalOverlay} onClick={() => setConfirmFreeSlot(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setConfirmFreeSlot(null)}>
              <X size={20} />
            </button>

            <div className={styles.modalIconWrapGold}>
              <Sparkles size={28} color="#fbbf24" />
            </div>

            <h2 className={styles.modalTitle}>Redeem Free Slot Pass?</h2>
            <p className={styles.modalBody}>
              You are using 1 of your 3rd-place Free Slot Pass Rewards for:
            </p>

            <div className={styles.modalSlotPreview}>
              <div className={styles.previewTime}>{confirmFreeSlot.time_label}</div>
              <div className={styles.previewDate}>{fmtDateHeader(confirmFreeSlot.date)}</div>
              <div className={styles.previewFee}>
                Entry Fee: <span style={{ textDecoration: 'line-through' }}>₹{confirmFreeSlot.entry_fee || entryFee}</span>{' '}
                <strong style={{ color: '#22c55e' }}>₹0 FREE (Reward Applied)</strong>
              </div>
            </div>

            <p className={styles.modalWarningText}>
              Confirming will redeem 1 free slot reward and immediately register your team into this slot without payment.
            </p>

            <div className={styles.modalActionColumn}>
              <button
                className={styles.confirmFreeBtn}
                onClick={() => {
                  const slotToBook = confirmFreeSlot
                  setConfirmFreeSlot(null)
                  handleDirectBookSlot(slotToBook, true)
                }}
              >
                ✓ CONFIRM FREE REGISTRATION
              </button>
              <button
                className={styles.cancelBtn}
                onClick={() => setConfirmFreeSlot(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── TOURNAMENT RULES & GUIDELINES MODAL ── */}
      {showRulesModal && (
        <div className={styles.modalOverlay} onClick={() => setShowRulesModal(false)}>
          <div className={styles.rulesModalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.rulesModalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={22} color="#fbbf24" />
                <h2 className={styles.rulesModalTitle}>BGFS TOURNAMENT RULES &amp; GUIDELINES</h2>
              </div>
              <button className={styles.modalCloseBtn} onClick={() => setShowRulesModal(false)}>
                <X size={20} />
              </button>
            </div>
            <p className={styles.rulesModalSubtitle}>
              Please read all rules carefully before participating. All players and teams must adhere to these guidelines.
            </p>

            <div className={styles.rulesListScroll}>
              <div className={styles.ruleCard}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumber}>1</span>
                  <h3>Player Removal / Extra Players</h3>
                </div>
                <p>
                  If a team has an extra player who has already joined the custom room and the team wants that player removed, the team must mention it in the <strong>room chat section</strong>.
                </p>
                <p className={styles.ruleNote}>
                  * The player being removed <strong>must belong to the same slot/team</strong> for the request to be considered and checked by the BGFS team.
                </p>
              </div>

              <div className={styles.ruleCardDanger}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumberDanger}>2</span>
                  <h3 style={{ color: '#ef4444' }}>Hacking &amp; Illegal Methods</h3>
                </div>
                <p>
                  Any team or player found using <strong>hacks, cheats, exploits, unauthorized software, or any other illegal method</strong> will be <strong>immediately banned from the tournament</strong>.
                </p>
                <p>
                  Depending on the violation, the player/team may also be banned from participating in <strong>future BGFS matches and tournaments</strong>.
                </p>
                <p className={styles.ruleNoteDanger}>
                  ⚠️ BGFS reserves the right to take action against any player or team found violating fair-play rules.
                </p>
              </div>

              <div className={styles.ruleCard}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumber}>3</span>
                  <h3>Match Timings</h3>
                </div>
                <p>
                  All matches will start <strong>on time according to the announced schedule</strong>.
                </p>
                <p>
                  Players and teams are responsible for being ready before the scheduled match time. Delays caused by a player or team will not automatically result in a delayed match.
                </p>
              </div>

              <div className={styles.ruleCard}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumber}>4</span>
                  <h3>Custom Room ID &amp; Password</h3>
                </div>
                <p>
                  The Custom Room <strong>ID and password must not be shared or leaked</strong> outside the participating players/team.
                </p>
                <p>
                  If any player is found responsible for leaking the Custom Room ID or password, that player will be <strong>removed from the tournament</strong>.
                </p>
                <p className={styles.ruleNoteDanger}>
                  🚫 <strong>No refund</strong> will be provided in such cases.
                </p>
              </div>

              <div className={styles.ruleCard}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumber}>5</span>
                  <h3>Finals Match Recordings</h3>
                </div>
                <p>
                  All teams qualifying for the <strong>Finals must record their Finals matches</strong>.
                </p>
                <p>
                  If another team or player raises a hacking/cheating complaint against a finalist, the concerned team may be required to provide their <strong>match recording(s)</strong> for verification.
                </p>
                <p>
                  Teams qualifying for the Finals are therefore responsible for ensuring that their Finals matches are properly recorded and retained.
                </p>
              </div>

              <div className={styles.ruleCardGold}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumberGold}>6</span>
                  <h3 style={{ color: '#fbbf24' }}>₹200 Refundable Security Fee</h3>
                </div>
                <p>
                  A <strong>₹200 fee must be paid before the matches</strong>.
                </p>
                <p>
                  This amount is <strong>fully refundable after the matches</strong>, provided the team/player has not been disqualified for hacking or related violations.
                </p>
                <p className={styles.ruleNoteDanger}>
                  In case a team is found to be using hacks or other prohibited methods, the <strong>₹200 fee will not be refunded</strong>.
                </p>
              </div>

              <div className={styles.ruleCard}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumber}>7</span>
                  <h3>Points &amp; Score Verification</h3>
                </div>
                <p>
                  Players/teams are strongly advised to take a <strong>screenshot of their points/score immediately after every match</strong>.
                </p>
                <p>
                  If there is an incorrect score or points displayed on the BGFS leaderboard/table, the screenshot can be used as supporting evidence when submitting a complaint.
                </p>
                <p>
                  Players should retain these screenshots until the final results have been confirmed.
                </p>
              </div>

              <div className={styles.ruleCardGold}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumberGold}>8</span>
                  <h3 style={{ color: '#fbbf24' }}>Finals Prize &amp; Trophy</h3>
                </div>
                <p>After the Finals have been completed and the results have been finalized:</p>
                <ul style={{ margin: '0.25rem 0 0 1.2rem', padding: 0, color: '#cccccc', fontSize: '0.8rem' }}>
                  <li>The applicable <strong>prize pool amount</strong> will be provided to the winning team.</li>
                  <li>The <strong>trophy will be delivered to the winning team's registered address</strong>.</li>
                </ul>
                <p className={styles.ruleNote} style={{ marginTop: '0.35rem' }}>
                  Teams should ensure that the address and contact information provided during registration are accurate.
                </p>
              </div>

              <div className={styles.ruleCard}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumber}>9</span>
                  <h3>Communication</h3>
                </div>
                <p>
                  For teams qualifying for the Finals, the BGFS team will contact you through the <strong>WhatsApp number provided during registration</strong>.
                </p>
                <p>
                  Players and teams are responsible for providing a valid and active WhatsApp number and checking it for tournament-related communication.
                </p>
              </div>

              <div className={styles.ruleCardReminder}>
                <div className={styles.ruleCardHeader}>
                  <span className={styles.ruleNumberReminder}>10</span>
                  <h3 style={{ color: '#ffffff' }}>Important Reminder</h3>
                </div>
                <p>
                  By participating in a BGFS tournament, players and teams agree to follow these rules.
                </p>
                <p>
                  BGFS reserves the right to investigate suspected cheating, hacking, room leaks, score discrepancies, and other violations and take appropriate action based on the available evidence.
                </p>
                <div className={styles.playFairBadge}>
                  🔥 Play fair. Respect the rules. Respect the competition.
                </div>
              </div>
            </div>

            <div className={styles.rulesModalFooter}>
              <button className={styles.rulesAgreeBtn} onClick={() => setShowRulesModal(false)}>
                ✓ I UNDERSTAND &amp; AGREE TO RULES
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
