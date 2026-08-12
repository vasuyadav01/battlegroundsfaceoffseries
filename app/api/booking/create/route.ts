import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/booking/create
// Creates a PENDING booking record before payment.
// Returns booking_id so the confirm step can reference it.
export async function POST(request: Request) {
  try {
    const { slot_id } = await request.json()

    if (!slot_id) {
      return NextResponse.json({ error: 'slot_id is required' }, { status: 400 })
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
      return NextResponse.json({ error: 'No team found. Please complete onboarding first.' }, { status: 400 })
    }

    const team_id = userProfile.team_id

    // Check slot exists and has capacity
    const { data: slot, error: slotErr } = await admin
      .from('slots')
      .select('slot_id, capacity, teams_booked_count, status, entry_fee, whatsapp_link')
      .eq('slot_id', slot_id)
      .single()

    if (slotErr || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    }

    if (slot.status === 'full' || slot.teams_booked_count >= slot.capacity) {
      return NextResponse.json({ error: 'This slot is full. Please choose another slot.' }, { status: 409 })
    }

    // Check for duplicate booking (any status — prevent ghost pending records too)
    const { data: existingBooking } = await admin
      .from('bookings')
      .select('booking_id, payment_status')
      .eq('team_id', team_id)
      .eq('slot_id', slot_id)
      .maybeSingle()

    if (existingBooking) {
      if (existingBooking.payment_status === 'paid') {
        return NextResponse.json({ error: 'Your team has already booked this slot.' }, { status: 409 })
      }
      // Reuse existing pending booking
      return NextResponse.json({
        success: true,
        booking_id: existingBooking.booking_id,
        amount: slot.entry_fee ?? 50,
      })
    }

    // Create pending booking
    const { data: booking, error: bookErr } = await admin
      .from('bookings')
      .insert({
        team_id,
        slot_id,
        payment_status: 'pending',
        amount_paid: 0,
      })
      .select('booking_id')
      .single()

    if (bookErr) {
      return NextResponse.json({ error: bookErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      booking_id: booking.booking_id,
      amount: slot.entry_fee ?? 50,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
