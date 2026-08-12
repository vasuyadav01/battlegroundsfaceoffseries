export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import SlotsClient from './SlotsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Slot Booking — BGFS',
  description: 'Book your match slots for Battlegrounds Faceoff Series.',
}

export default async function SlotsPage() {
  const supabase = await createClient()

  // Fetch all slots
  const { data: slots } = await supabase
    .from('slots')
    .select('*')
    .order('date', { ascending: true })
    .order('time_label', { ascending: true })

  // Check if user is logged in and fetch team details via Admin client (bypasses RLS)
  const { data: { user } } = await supabase.auth.getUser()
  let userTeam = null
  let freeCoupon = null
  let userBookedSlotIds: string[] = []

  if (user) {
    const admin = await createAdminClient()

    // 1. Fetch user's linked team ID from users table
    let { data: userProfile } = await admin
      .from('users')
      .select('team_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let teamId = userProfile?.team_id

    // 2. Fallback: Check if user is a captain of a team in teams table
    if (!teamId) {
      const { data: teamByCaptain } = await admin
        .from('teams')
        .select('team_id, team_name')
        .eq('captain_user_id', user.id)
        .maybeSingle()

      if (teamByCaptain) {
        teamId = teamByCaptain.team_id
        userTeam = teamByCaptain

        // Link team_id to user profile
        await admin
          .from('users')
          .upsert({ user_id: user.id, email: user.email, team_id: teamId, role: 'captain' }, { onConflict: 'user_id' })
      }
    } else {
      // Fetch team details
      const { data: teamData } = await admin
        .from('teams')
        .select('team_id, team_name')
        .eq('team_id', teamId)
        .maybeSingle()

      userTeam = teamData
    }

    if (teamId) {
      // 3. Fetch unused free slot coupon for this team if available
      const { data: couponData } = await admin
        .from('coupons')
        .select('coupon_id, code')
        .eq('team_id', teamId)
        .eq('status', 'unused')
        .limit(1)
        .maybeSingle()

      freeCoupon = couponData

      // 4. Fetch all slot IDs already booked by this team (paid)
      const { data: userBookings } = await admin
        .from('bookings')
        .select('slot_id')
        .eq('team_id', teamId)
        .eq('payment_status', 'paid')

      userBookedSlotIds = userBookings?.map(b => b.slot_id) || []
    }
  }

  // Fetch global config fallbacks
  const { data: configRows } = await supabase
    .from('config')
    .select('key, value')
    .in('key', ['whatsapp_invite_link', 'slot_entry_fee'])

  const config: Record<string, string> = {}
  configRows?.forEach(row => { config[row.key] = row.value })

  return (
    <SlotsClient
      slots={slots || []}
      userTeam={userTeam}
      freeCoupon={freeCoupon}
      userBookedSlotIds={userBookedSlotIds}
      whatsappLink={config.whatsapp_invite_link || ''}
      entryFee={parseInt(config.slot_entry_fee || '50')}
      isLoggedIn={!!user}
    />
  )
}
