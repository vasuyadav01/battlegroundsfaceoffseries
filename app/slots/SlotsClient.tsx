'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, X, Lock, MessageCircle, Flame, Clock, Info, Calendar, FileText } from 'lucide-react'
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
  userBookedSlotIds?: string[]
  whatsappLink: string
  entryFee: number
  isLoggedIn: boolean
}

type FilterTab = 'upcoming' | 'past' | 'all'

interface MatchTimeItem {
  name: string
  time: string
}

function getMatchTimes(timeLabel: string): MatchTimeItem[] {
  if (timeLabel.includes('9:00 PM')) {
    return [
      { name: 'Match 1', time: '9:00 PM' },
      { name: 'Match 2', time: '9:42 PM' },
      { name: 'Match 3', time: '10:18 PM' },
    ]
  }
  if (timeLabel.includes('7:00 PM')) {
    return [
      { name: 'Match 1', time: '7:00 PM' },
      { name: 'Match 2', time: '7:42 PM' },
      { name: 'Match 3', time: '8:18 PM' },
    ]
  }
  if (timeLabel.includes('5:00 PM')) {
    return [
      { name: 'Match 1', time: '5:00 PM' },
      { name: 'Match 2', time: '5:42 PM' },
      { name: 'Match 3', time: '6:18 PM' },
    ]
  }
  if (timeLabel.includes('3:00 PM')) {
    return [
      { name: 'Match 1', time: '3:00 PM' },
      { name: 'Match 2', time: '3:42 PM' },
      { name: 'Match 3', time: '4:18 PM' },
    ]
  }

  const startPart = timeLabel.split('-')[0]?.trim() || timeLabel.split('–')[0]?.trim() || 'Start'
  return [
    { name: 'Match 1', time: startPart },
    { name: 'Match 2', time: '+42 min' },
    { name: 'Match 3', time: '+78 min' },
  ]
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
  const [confirmFreeSlot, setConfirmFreeSlot] = useState<Slot | null>(null)
  const [receiptModalSlot, setReceiptModalSlot] = useState<Slot | null>(null)
  const [couponUsedInSession, setCouponUsedInSession] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('upcoming')

  // Auto free slot detection
  const activeFreeCoupon = couponUsedInSession ? null : freeCoupon

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

  // Add to Calendar helper
  function handleAddToCalendar(slot: Slot) {
    const title = encodeURIComponent(`BGFS Match Slot - ${slot.time_label}`)
    const details = encodeURIComponent(
      `BGFS BGMI Tournament Slot.\nTeam: ${userTeam?.team_name || 'My Squad'}\nDate: ${slot.date}\nTime: ${slot.time_label}\nRoom ID & Password posted in official WhatsApp group 10 minutes before each match.`
    )
    const location = encodeURIComponent('BGFS Platform / Official WhatsApp Group')

    const cleanDate = (slot.date || '').replace(/-/g, '')
    let startTimeStr = '153000Z'
    let endTimeStr = '173000Z'

    if (slot.time_label.includes('7:00 PM')) {
      startTimeStr = '133000Z'
      endTimeStr = '153000Z'
    } else if (slot.time_label.includes('5:00 PM')) {
      startTimeStr = '113000Z'
      endTimeStr = '133000Z'
    } else if (slot.time_label.includes('3:00 PM')) {
      startTimeStr = '093000Z'
      endTimeStr = '113000Z'
    }

    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${cleanDate}T${startTimeStr}/${cleanDate}T${endTimeStr}`
    window.open(googleCalUrl, '_blank')
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
      if (isFree && activeFreeCoupon) {
        // Redeem free slot reward
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
              SIGN IN TO REGISTER →
            </Link>
          )}
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

                const showFreeOption = Boolean(activeFreeCoupon && !isFull && !isCompleted && !isAlreadyBooked)
                const currentFee = slot.entry_fee || entryFee

                if (isAlreadyBooked) {
                  return (
                    <div
                      key={slot.slot_id}
                      className={`${styles.slotCard} ${styles.slotCardBooked}`}
                    >
                      {/* Top Row: Simple Registered Badge */}
                      <div className={styles.cardTopRow}>
                        <span className={styles.spotsBooked}>
                          <Check size={11} /> REGISTERED
                        </span>
                      </div>

                      {/* Header Block: Time + Inline Team Name */}
                      <div className={styles.bookedHeaderBlock}>
                        <div className={styles.cardTimeBooked}>{slot.time_label}</div>
                        <div className={styles.bookedSubMeta}>
                          Team: <strong>{userTeam?.team_name || 'My Squad'}</strong>
                        </div>
                      </div>

                      {/* Light Match Schedule (No individual box chips) */}
                      <div className={styles.matchScheduleLight}>
                        {getMatchTimes(slot.time_label).map((m, idx) => (
                          <div key={idx} className={styles.matchTimeCol}>
                            <span className={styles.matchLabel}>{m.name}</span>
                            <span className={styles.matchTimeVal}>{m.time}</span>
                          </div>
                        ))}
                      </div>

                      {/* Room Info Line */}
                      <div className={styles.roomInfoLine}>
                        <Info size={12} color="#9e9e9e" className={styles.infoIconFlex} />
                        <span>Room ID &amp; password posted in WhatsApp group 10m before matches.</span>
                      </div>

                      {/* Primary Action: Join WhatsApp Group */}
                      <a
                        href={slot.whatsapp_link || whatsappLink || 'https://chat.whatsapp.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.cardBtnWhatsapp}
                      >
                        <MessageCircle size={14} /> Join WhatsApp Group
                      </a>

                      {/* Secondary Actions: Add to Calendar & View Receipt */}
                      <div className={styles.secondaryActionsRow}>
                        <button
                          type="button"
                          className={styles.secondaryActionBtn}
                          onClick={() => handleAddToCalendar(slot)}
                        >
                          <Calendar size={12} /> Add to Calendar
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryActionBtn}
                          onClick={() => setReceiptModalSlot(slot)}
                        >
                          <FileText size={12} /> View Receipt
                        </button>
                      </div>
                    </div>
                  )
                }

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

            <h2 className={styles.modalTitle}>Redeem Next Slot Pass?</h2>
            <p className={styles.modalBody}>
              You are claiming your 3rd-place Next Slot Pass Reward for:
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
              Confirming will mark your 3rd-place reward as redeemed and immediately register your team into this slot.
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
                ✓ CONFIRM &amp; REGISTER SLOT PASS
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

      {/* ── RECEIPT MODAL ── */}
      {receiptModalSlot && (
        <div className={styles.modalOverlay} onClick={() => setReceiptModalSlot(null)}>
          <div className={styles.receiptModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleRow}>
                <FileText size={18} color="#22c55e" />
                <h3 className={styles.modalTitle}>BOOKING RECEIPT</h3>
              </div>
              <button
                className={styles.closeModalBtn}
                onClick={() => setReceiptModalSlot(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.receiptBody}>
              <div className={styles.receiptRefBadge}>
                TRANSACTION CONFIRMED • RECEIPT #{receiptModalSlot.slot_id.slice(0, 8).toUpperCase()}
              </div>

              <div className={styles.receiptGrid}>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Tournament</span>
                  <span className={styles.receiptValue}>Battlegrounds Faceoff Series</span>
                </div>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Registered Team</span>
                  <span className={styles.receiptValueGold}>{userTeam?.team_name || 'My Squad'}</span>
                </div>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Match Date</span>
                  <span className={styles.receiptValue}>{fmtDateHeader(receiptModalSlot.date)}</span>
                </div>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Time Window</span>
                  <span className={styles.receiptValue}>{receiptModalSlot.time_label}</span>
                </div>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Matches Included</span>
                  <span className={styles.receiptValue}>3 Custom Matches</span>
                </div>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Entry Fee Paid</span>
                  <span className={styles.receiptValueHighlight}>₹{receiptModalSlot.entry_fee || entryFee}</span>
                </div>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptLabel}>Payment Status</span>
                  <span className={styles.receiptStatusGreen}>PAID &amp; VERIFIED</span>
                </div>
              </div>

              <p className={styles.receiptFooterNote}>
                Room ID &amp; password are posted in the official WhatsApp match group 10 minutes before each match start time.
              </p>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.closeReceiptBtn}
                onClick={() => setReceiptModalSlot(null)}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
