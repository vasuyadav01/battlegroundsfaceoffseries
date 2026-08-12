import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/coupon/redeem
// Atomically redeems a coupon for a slot booking.
// Uses admin client to perform all DB ops as a logical transaction
// (Supabase JS doesn't support multi-statement transactions directly;
//  we use a select-then-update pattern with a re-validation guard).
export async function POST(request: Request) {
  try {
    const { coupon_id, slot_id } = await request.json()

    if (!coupon_id || !slot_id) {
      return NextResponse.json({ error: 'coupon_id and slot_id are required' }, { status: 400 })
    }

    // Verify auth
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = await createAdminClient()

    // Get user's team
    const { data: userProfile } = await admin
      .from('users')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!userProfile?.team_id) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 })
    }

    const team_id = userProfile.team_id

    // ── ATOMIC GUARD: Re-verify coupon is still valid ──
    const { data: coupon, error: couponErr } = await admin
      .from('coupons')
      .select('coupon_id, status, team_id')
      .eq('coupon_id', coupon_id)
      .single()

    if (couponErr || !coupon) {
      return NextResponse.json({ error: 'Coupon not found' }, { status: 404 })
    }
    if (coupon.team_id !== team_id) {
      return NextResponse.json({ error: 'This coupon does not belong to your team' }, { status: 403 })
    }
    if (coupon.status === 'used') {
      return NextResponse.json({ error: 'This coupon has already been used' }, { status: 409 })
    }

    // ── Check slot capacity ──
    const { data: slot, error: slotErr } = await admin
      .from('slots')
      .select('slot_id, capacity, teams_booked_count, status, whatsapp_link, date, time_label')
      .eq('slot_id', slot_id)
      .single()

    if (slotErr || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }
    if (slot.status === 'full' || slot.teams_booked_count >= slot.capacity) {
      return NextResponse.json({ error: 'This slot is full. Please choose another slot.' }, { status: 409 })
    }

    // ── Check no duplicate booking ──
    const { data: existingBooking } = await admin
      .from('bookings')
      .select('booking_id, payment_status')
      .eq('team_id', team_id)
      .eq('slot_id', slot_id)
      .maybeSingle()

    if (existingBooking?.payment_status === 'paid') {
      return NextResponse.json({ error: 'Your team has already booked this slot.' }, { status: 409 })
    }

    // ── Mark coupon as used FIRST (prevents double-spend race condition) ──
    const { error: couponUpdateErr } = await admin
      .from('coupons')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('coupon_id', coupon_id)
      .eq('status', 'unused') // Double-guard: only succeeds if still unused

    if (couponUpdateErr) {
      return NextResponse.json({ error: 'Coupon could not be redeemed — it may have just been used.' }, { status: 409 })
    }

    // ── Create or update booking as paid ──
    let bookingId: string

    if (existingBooking) {
      // Upgrade existing pending booking to paid
      await admin
        .from('bookings')
        .update({
          payment_status: 'paid',
          amount_paid: 0,
          coupon_used: true,
          coupon_id,
        })
        .eq('booking_id', existingBooking.booking_id)
      bookingId = existingBooking.booking_id
    } else {
      const { data: newBooking, error: bookErr } = await admin
        .from('bookings')
        .insert({
          team_id,
          slot_id,
          payment_status: 'paid',
          amount_paid: 0,
          coupon_used: true,
          coupon_id,
        })
        .select('booking_id')
        .single()

      if (bookErr) {
        // Rollback: un-use the coupon
        await admin.from('coupons').update({ status: 'unused', used_at: null }).eq('coupon_id', coupon_id)
        return NextResponse.json({ error: bookErr.message }, { status: 500 })
      }
      bookingId = newBooking.booking_id
    }

    // Fetch global whatsapp fallback if slot has none
    let whatsappLink = slot.whatsapp_link || null
    if (!whatsappLink) {
      const { data: config } = await admin
        .from('config')
        .select('value')
        .eq('key', 'whatsapp_invite_link')
        .single()
      whatsappLink = config?.value || null
    }

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      whatsapp_link: whatsappLink,
      slot_date: slot.date,
      slot_time: slot.time_label,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
