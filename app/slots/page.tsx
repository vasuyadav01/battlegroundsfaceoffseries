export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
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

  // Check if user is logged in and has a team + unused free slot coupon
  const { data: { user } } = await supabase.auth.getUser()
  let userTeam = null
  let freeCoupon = null

  if (user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('team_id, teams(team_id, team_name)')
      .eq('user_id', user.id)
      .single()

    if (userProfile?.team_id) {
      userTeam = userProfile.teams

      // Fetch first available unused coupon for auto free slot detection
      const { data: couponData } = await supabase
        .from('coupons')
        .select('coupon_id, code')
        .eq('team_id', userProfile.team_id)
        .eq('status', 'unused')
        .limit(1)
        .maybeSingle()

      freeCoupon = couponData
    }
  }

  // Fetch global config fallbacks (WhatsApp link & entry fee)
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
      whatsappLink={config.whatsapp_invite_link || ''}
      entryFee={parseInt(config.slot_entry_fee || '50')}
      isLoggedIn={!!user}
    />
  )
}
