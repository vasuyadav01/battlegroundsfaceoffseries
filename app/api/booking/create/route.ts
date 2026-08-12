import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/booking/create
export async function POST(request: Request) {
  try {
    const { slot_id, team_name, phone } = await request.json()

    if (!slot_id) {
      return NextResponse.json({ error: 'slot_id is required' }, { status: 400 })
    }

    // Verify auth
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Please sign in to book a slot.' }, { status: 401 })
    }

    const admin = await createAdminClient()

    // Get user's team profile
    const { data: userProfile } = await admin
      .from('users')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let team_id = userProfile?.team_id

    // If user has no team yet, create one seamlessly on the spot!
    if (!team_id) {
      const finalTeamName = (team_name && team_name.trim()) || user.email?.split('@')[0] || 'Team User'
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

      const { data: newTeam, error: teamErr } = await admin
        .from('teams')
        .insert({
          team_name: finalTeamName,
          captain_id: user.id,
          invite_code: inviteCode,
          phone: phone || null,
        })
        .select('team_id')
        .single()

      if (teamErr) {
        return NextResponse.json({ error: 'Failed to set up team name: ' + teamErr.message }, { status: 500 })
      }

      team_id = newTeam.team_id

      // Link team to user profile
      await admin
        .from('users')
        .upsert({
          user_id: user.id,
          email: user.email,
          team_id: team_id,
          role: 'captain',
        }, { onConflict: 'user_id' })
    }

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

    // Check for duplicate booking
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
