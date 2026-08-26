export const dynamic = 'force-dynamic'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import SlotsClient from './SlotsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Slot Booking | BGFS',
  description: 'Book your match slots for Battlegrounds Faceoff Series.',
}

export default async function SlotsPage() {
  const supabase = await createClient()

  // Fetch all slots
  const { data: rawSlots } = await supabase
    .from('slots')
    .select('*')
    .order('date', { ascending: true })
    .order('time_label', { ascending: true })

  let slots = rawSlots || []

  // Ensure 9:00 PM – 11:00 PM slots exist for the next 7 days (today + 6 days)
  try {
    const admin = await createAdminClient()
    const now = new Date()
    const targetLabel = '9:00 PM – 11:00 PM'
    const missingToInsert: any[] = []

    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i)
      const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`

      const exists = slots.some(s => s.date === dateStr && (s.time_label.includes('9') && s.time_label.includes('11')))
      if (!exists) {
        missingToInsert.push({
          date: dateStr,
          time_label: targetLabel,
          capacity: 20,
          teams_booked_count: 0,
          entry_fee: 50,
          status: 'open',
          whatsapp_link: 'https://chat.whatsapp.com/KjNw5o6aktB6Xbe3J3ZgYt',
        })
      }
    }

    if (missingToInsert.length > 0) {
      const { data: inserted } = await admin
        .from('slots')
        .insert(missingToInsert)
        .select('*')

      if (inserted && inserted.length > 0) {
        slots = [...slots, ...inserted].sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // Automatically mark past open slots as completed in DB
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    const pastOpenSlotIds = slots
      .filter(s => String(s.date).split('T')[0] < todayStr && s.status === 'open')
      .map(s => s.slot_id)

    if (pastOpenSlotIds.length > 0) {
      await admin
        .from('slots')
        .update({ status: 'completed' })
        .in('slot_id', pastOpenSlotIds)

      slots = slots.map(s => pastOpenSlotIds.includes(s.slot_id) ? { ...s, status: 'completed' } : s)
    }
  } catch (err) {
    console.error('Error seeding next 7 days 9-11 PM slots:', err)
  }

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
