'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

interface Props {
  slots: Slot[]
  userTeam: any
  coupons: any[]
  whatsappLink: string
  entryFee: number
  isLoggedIn: boolean
}

export default function RegisterClient({ slots, userTeam, coupons, whatsappLink, entryFee, isLoggedIn }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [useCoupon, setUseCoupon] = useState(false)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState<{ slotId: string; whatsapp: string } | null>(null)
  const [error, setError] = useState('')

  // Load Razorpay script dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  // Group slots by date
  const slotsByDate = useMemo(() => {
    const grouped: Record<string, Slot[]> = {}
    slots.forEach(slot => {
      if (!grouped[slot.date]) grouped[slot.date] = []
      grouped[slot.date].push(slot)
    })
    return grouped
  }, [slots])

  const hasCoupon = coupons.length > 0
  const effectiveFee = useCoupon && hasCoupon ? 0 : entryFee

  async function handleBook() {
    if (!selectedSlot) return
    if (!isLoggedIn) { router.push('/login'); return }
    if (!userTeam) { router.push('/onboard'); return }

    setError('')
    setBooking(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const couponToUse = useCoupon && hasCoupon ? coupons[0] : null

    // Create booking record (pending or paid if free/coupon)
    const { data: bookingRow, error: bookErr } = await supabase
      .from('bookings')
      .insert({
        team_id: userTeam.team_id,
        slot_id: selectedSlot.slot_id,
        payment_status: couponToUse ? 'paid' : 'pending',
        coupon_used: !!couponToUse,
        coupon_id: couponToUse?.coupon_id || null,
      })
      .select()
      .single()

    if (bookErr) {
      setBooking(false)
      setError(bookErr.message.includes('unique') ? 'You\'ve already booked this slot.' : bookErr.message)
      return
    }

    // Free coupon flow
    if (couponToUse) {
      await supabase
        .from('coupons')
        .update({ status: 'used', used_at: new Date().toISOString() })
        .eq('coupon_id', couponToUse.coupon_id)

      setBooking(false)
      setBooked({ slotId: selectedSlot.slot_id, whatsapp: whatsappLink })
      return
    }

    // Razorpay Paid flow
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingRow.booking_id,
          amount: effectiveFee,
        }),
      })

      const orderData = await res.json()

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || 'Failed to initialize payment gateway')
      }

      if (typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.')
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BGFS Tournament',
        description: `Slot Booking — ${selectedSlot.date} (${selectedSlot.time_label})`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature,
                bookingId: bookingRow.booking_id,
              }),
            })

            if (verifyRes.ok) {
              setBooked({ slotId: selectedSlot.slot_id, whatsapp: whatsappLink })
            } else {
              setError('Payment completed but verification failed. Admin will confirm shortly.')
            }
          } catch {
            setError('Payment completed. Order reference: ' + bookingRow.booking_id)
          } finally {
            setBooking(false)
          }
        },
        prefill: {
          email: user.email || '',
        },
        theme: {
          color: '#F59E0B',
        },
        modal: {
          ondismiss: function () {
            setBooking(false)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', function (response: any) {
        setError('Payment failed: ' + (response.error.description || 'Transaction declined'))
        setBooking(false)
      })
      rzp.open()
    } catch (err: any) {
      setBooking(false)
      setError(err.message || 'Payment initiation failed')
    }
  }

  if (booked) {
    return (
      <main className={styles.page}>
        <div className="container">
          <div className={styles.successCard}>
            <div className={styles.successIcon}>✅</div>
            <h1 className={styles.successTitle}>Slot Booked!</h1>
            <p className={styles.successDesc}>
              You're registered. Room ID and password will be shared on WhatsApp before match time.
              You can also find them in your dashboard.
            </p>
            {booked.whatsapp && (
              <a
                href={booked.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg"
                id="join-whatsapp-btn"
              >
                📱 Join WhatsApp Community
              </a>
            )}
            <div className={styles.successLinks}>
              <Link href="/dashboard" className="btn btn-secondary">Go to Dashboard</Link>
              <button className="btn btn-ghost" onClick={() => setBooked(null)}>Book Another Slot</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div>
            <h1 className="text-heading" style={{ fontSize: '2rem' }}>Book a Slot</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Each slot = 3 matches. Pick a day and time that works for your team.
            </p>
          </div>
          {!isLoggedIn && (
            <Link href="/login" className="btn btn-primary">
              Login to Book →
            </Link>
          )}
        </div>

        {!userTeam && isLoggedIn && (
          <div className={styles.infoBox}>
            ⚠️ You need a team before booking a slot. <Link href="/onboard" style={{ color: 'var(--brand-primary)' }}>Create or join a team →</Link>
          </div>
        )}

        <div className={styles.layout}>
          {/* Calendar / Slot List */}
          <div className={styles.slotCalendar}>
            {Object.entries(slotsByDate).map(([date, daySlots]) => (
              <div key={date} className={styles.dayBlock}>
                <div className={styles.dayHeader}>
                  <span className={styles.dayName}>
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </span>
                  {daySlots.some(s => s.is_grand_finals) && (
                    <span className="badge badge-gold">Grand Finals</span>
                  )}
                </div>
                <div className={styles.daySlots}>
                  {daySlots.map(slot => {
                    const isFull = slot.status === 'full' || slot.teams_booked_count >= slot.capacity
                    const isCompleted = slot.status === 'completed'
                    const isSelected = selectedSlot?.slot_id === slot.slot_id
                    const fillPct = (slot.teams_booked_count / slot.capacity) * 100

                    return (
                      <button
                        key={slot.slot_id}
                        className={`${styles.slotBtn} ${isSelected ? styles.slotSelected : ''} ${isFull || isCompleted ? styles.slotDisabled : ''}`}
                        onClick={() => !isFull && !isCompleted && setSelectedSlot(slot)}
                        disabled={isFull || isCompleted}
                      >
                        <div className={styles.slotBtnTop}>
                          <span className={styles.slotTime}>{slot.time_label}</span>
                          <span className={`badge ${isFull ? 'badge-danger' : isCompleted ? 'badge-neutral' : 'badge-success'}`}>
                            {isCompleted ? 'Done' : isFull ? 'Full' : 'Open'}
                          </span>
                        </div>
                        <div className={styles.slotBtnBottom}>
                          <div className={styles.fillBar}>
                            <div
                              className={styles.fillBarInner}
                              style={{ width: `${fillPct}%`, background: fillPct > 80 ? 'var(--status-danger)' : 'var(--status-success)' }}
                            />
                          </div>
                          <span className={styles.slotCount}>
                            {slot.teams_booked_count}/{slot.capacity} teams
                          </span>
                        </div>
                        {slot.is_grand_finals && (
                          <p className={styles.grandFinalsNote}>🏆 Grand Finals — Free entry for qualified teams</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {slots.length === 0 && (
              <div className={styles.noSlots}>
                <p>No slots available yet. Check back soon.</p>
              </div>
            )}
          </div>

          {/* Booking Summary Panel */}
          <div className={styles.summaryPanel}>
            <div className={styles.summaryCard}>
              <h2 className={styles.summaryTitle}>Booking Summary</h2>

              {!selectedSlot ? (
                <p className={styles.summaryEmpty}>← Select a slot to continue</p>
              ) : (
                <>
                  <div className={styles.summaryRow}>
                    <span className="text-label">Date</span>
                    <span>{new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className="text-label">Time</span>
                    <span>{selectedSlot.time_label}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className="text-label">Matches</span>
                    <span>3 matches</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className="text-label">Teams</span>
                    <span>{selectedSlot.teams_booked_count}/{selectedSlot.capacity}</span>
                  </div>

                  <hr className="divider" />

                  {hasCoupon && (
                    <label className={styles.couponToggle}>
                      <input
                        type="checkbox"
                        checked={useCoupon}
                        onChange={e => setUseCoupon(e.target.checked)}
                      />
                      <div>
                        <span className="badge badge-success">🎟️ Free Slot Coupon</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Apply to waive ₹{entryFee} entry fee
                        </p>
                      </div>
                    </label>
                  )}

                  <div className={styles.summaryFee}>
                    <span className="text-label">Entry Fee</span>
                    <div>
                      {useCoupon && hasCoupon && (
                        <span style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: 'var(--text-muted)', marginRight: '0.5rem' }}>
                          ₹{entryFee}
                        </span>
                      )}
                      <span className={styles.feeAmount}>
                        {effectiveFee === 0 ? 'FREE' : `₹${effectiveFee}`}
                      </span>
                    </div>
                  </div>

                  {error && <p className={styles.error}>{error}</p>}

                  {isLoggedIn && userTeam ? (
                    <button
                      id="book-slot-btn"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.5rem' }}
                      onClick={handleBook}
                      disabled={booking}
                    >
                      {booking
                        ? <><span className="spinner" /> Processing...</>
                        : effectiveFee === 0
                          ? 'Confirm Free Booking →'
                          : `Pay ₹${effectiveFee} & Book →`}
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '0.5rem', textAlign: 'center' }}
                    >
                      Login to Book →
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Info box */}
            <div className={styles.infoPanel}>
              <h3 className={styles.infoPanelTitle}>📋 What happens next?</h3>
              <ol className={styles.infoSteps}>
                <li>Slot is confirmed immediately after payment via Razorpay</li>
                <li>Join the WhatsApp Community (link shown after booking)</li>
                <li>Room ID/password posted 15 mins before match time</li>
                <li>Play 3 matches, scores are entered by admin</li>
                <li>Leaderboard auto-updates after each slot</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
