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

export default function SlotsClient({ slots, userTeam, coupons, whatsappLink, entryFee, isLoggedIn }: Props) {
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
        payment_status: effectiveFee === 0 ? 'paid' : 'pending',
        amount_paid: effectiveFee,
        coupon_used_id: couponToUse?.coupon_id || null,
      })
      .select()
      .single()

    if (bookErr) {
      setBooking(false)
      setError(bookErr.message.includes('unique') ? 'Your team has already booked this slot.' : bookErr.message)
      return
    }

    // Mark coupon as used if applied
    if (couponToUse) {
      await supabase
        .from('coupons')
        .update({ status: 'used' })
        .eq('coupon_id', couponToUse.coupon_id)
    }

    // Free booking (coupon or 0 fee)
    if (effectiveFee === 0) {
      // Increment booked count
      await supabase
        .from('slots')
        .update({ teams_booked_count: selectedSlot.teams_booked_count + 1 })
        .eq('slot_id', selectedSlot.slot_id)

      setBooking(false)
      setBooked({ slotId: selectedSlot.slot_id, whatsapp: whatsappLink })
      return
    }

    // Razorpay Integration for Paid Booking
    try {
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: bookingRow.booking_id,
          amount: effectiveFee * 100,
        })
      })

      const orderData = await res.json()

      if (!res.ok) {
        setBooking(false)
        setError(orderData.error || 'Failed to create payment order.')
        return
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'BGFS Esports',
        description: `Slot Booking: ${selectedSlot.date} @ ${selectedSlot.time_label}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // Verify payment on server
          const verifyRes = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: bookingRow.booking_id,
            })
          })

          const verifyData = await verifyRes.json()

          if (verifyRes.ok && verifyData.success) {
            setBooking(false)
            setBooked({ slotId: selectedSlot.slot_id, whatsapp: whatsappLink })
          } else {
            setBooking(false)
            setError(verifyData.error || 'Payment verification failed.')
          }
        },
        prefill: {
          name: userTeam.team_name,
          email: user.email,
        },
        theme: {
          color: '#fbbf24',
        },
        modal: {
          ondismiss: function () {
            setBooking(false)
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      setBooking(false)
      setError(err.message || 'Payment popup failed to load.')
    }
  }

  return (
    <main className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.title}>SLOT BOOKING</h1>
            <p className={styles.subtitle}>Choose your match time and secure your team's slot.</p>
          </div>
          {!isLoggedIn && (
            <Link href="/login" className="btn btn-primary" style={{ background: '#facc15', color: '#111' }}>
              SIGN IN TO BOOK →
            </Link>
          )}
        </div>

        {booked ? (
          <div className={styles.confirmationCard}>
            <div className={styles.confirmIcon}>🎉</div>
            <h2 className={styles.confirmTitle}>Slot Booked Successfully!</h2>
            <p className={styles.confirmSubtitle}>
              You're registered. Room ID and password will be shared on WhatsApp before match time.
            </p>
            {booked.whatsapp && (
              <a
                href={booked.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ background: '#22c55e', color: '#fff', margin: '0 auto' }}
              >
                📱 JOIN OFFICIAL WHATSAPP GROUP →
              </a>
            )}
            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/dashboard" className="btn btn-ghost">
                GO TO DASHBOARD →
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.layout}>
            {/* Slot Calendar */}
            <div className={styles.slotCalendar}>
              {Object.keys(slotsByDate).length === 0 && (
                <div style={{ color: '#888888', textAlign: 'center', padding: '3rem 0' }}>
                  No active tournament slots available right now. Check back soon!
                </div>
              )}

              {Object.entries(slotsByDate).map(([date, dateSlots]) => {
                const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })

                return (
                  <div key={date} className={styles.dayBlock}>
                    <div className={styles.dayHeader}>
                      <span className={styles.dayName}>📅 {formattedDate}</span>
                    </div>
                    <div className={styles.daySlots}>
                      {dateSlots.map(slot => {
                        const isFull = slot.teams_booked_count >= slot.capacity || slot.status === 'full'
                        const isSelected = selectedSlot?.slot_id === slot.slot_id

                        return (
                          <button
                            key={slot.slot_id}
                            disabled={isFull}
                            className={`
                              ${styles.slotBtn}
                              ${isSelected ? styles.slotBtnSelected : ''}
                              ${isFull ? styles.slotBtnFull : ''}
                            `}
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <div className={styles.slotBtnInner}>
                              <div className={styles.slotTime}>
                                ⏰ {slot.time_label} {slot.is_grand_finals ? '🏆 (Grand Finals)' : ''}
                              </div>
                              <div className={styles.slotMeta}>
                                <span className={styles.slotCapacity}>
                                  👥 {slot.teams_booked_count}/{slot.capacity} Teams
                                </span>
                                {isFull ? (
                                  <span className="badge badge-silver">FULL</span>
                                ) : (
                                  <span className="badge badge-gold">₹{slot.entry_fee || entryFee}</span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sidebar Checkout */}
            <div className={styles.sidebar}>
              <div className={styles.summaryCard}>
                <h3 className={styles.summaryTitle}>BOOKING SUMMARY</h3>

                {selectedSlot ? (
                  <>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Selected Slot</span>
                      <span className={styles.summaryValue}>{selectedSlot.time_label}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Date</span>
                      <span className={styles.summaryValue}>{selectedSlot.date}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Team</span>
                      <span className={styles.summaryValue}>
                        {userTeam ? userTeam.team_name : (isLoggedIn ? 'No team set' : 'Not signed in')}
                      </span>
                    </div>

                    {hasCoupon && (
                      <div className={styles.couponSection}>
                        <label className={styles.couponLabel}>
                          <input
                            type="checkbox"
                            className={styles.couponCheckbox}
                            checked={useCoupon}
                            onChange={e => setUseCoupon(e.target.checked)}
                          />
                          Use Free Pass Coupon (1 Available)
                        </label>
                      </div>
                    )}

                    <div className={styles.totalRow}>
                      <span className={styles.totalLabel}>TOTAL FEE</span>
                      <div>
                        {useCoupon && hasCoupon && <span className={styles.strikeThrough}>₹{entryFee}</span>}
                        <span className={styles.totalAmount}>₹{effectiveFee}</span>
                      </div>
                    </div>

                    {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '1rem' }}>{error}</p>}

                    <button
                      className={`btn btn-primary ${styles.bookBtn}`}
                      disabled={booking}
                      onClick={handleBook}
                    >
                      {booking ? <><span className="spinner" /> PROCESSING...</> : (effectiveFee === 0 ? 'CLAIM FREE SLOT →' : 'PAY & BOOK SLOT →')}
                    </button>
                  </>
                ) : (
                  <p style={{ color: '#888888', fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem 0' }}>
                    Select a slot from the list to view summary and proceed to booking.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
