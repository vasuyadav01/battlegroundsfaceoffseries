export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | BGFS',
  description: 'Player dashboard: slots, standings, and wallet overview.',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const admin = await createAdminClient()

  // Fetch user profile
  let { data: userProfile } = await admin
    .from('users')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  let teamId = userProfile?.team_id

  // If user has no team or no profile yet, automatically set up a default team so they never get trapped in an onboard redirect
  if (!teamId) {
    // Check if team already exists for this captain
    let { data: existingTeam } = await admin
      .from('teams')
      .select('*')
      .eq('captain_user_id', user.id)
      .maybeSingle()

    if (!existingTeam) {
      const defaultTeamName = user.email
        ? `${user.email.split('@')[0]} Squad`
        : `Team ${user.id.slice(0, 5)}`

      const { data: newTeam } = await admin
        .from('teams')
        .insert({
          team_name: defaultTeamName,
          captain_user_id: user.id,
        })
        .select()
        .single()

      existingTeam = newTeam
    }

    if (existingTeam) {
      teamId = existingTeam.team_id
      await admin
        .from('users')
        .upsert(
          {
            user_id: user.id,
            email: user.email,
            team_id: teamId,
            role: 'captain',
            display_name: existingTeam.team_name,
          },
          { onConflict: 'user_id' }
        )
    }
  }

  // Fetch team info
  const { data: team } = await admin
    .from('teams')
    .select('team_id, team_name, captain_user_id, name_changed')
    .eq('team_id', teamId)
    .maybeSingle()

  const safeTeam = team || {
    team_id: teamId || 'default',
    team_name: 'My Team',
    captain_user_id: user.id,
    name_changed: false,
  }

  // Fetch booked slots for this team
  let { data: bookings, error: bookingErr } = await admin
    .from('bookings')
    .select(
      'booking_id, payment_status, amount_paid, coupon_used, created_at, room_slot_number, slots(slot_id, date, time_label, status, entry_fee, is_grand_finals)'
    )
    .eq('team_id', safeTeam.team_id)
    .order('created_at', { ascending: false })

  if (bookingErr && bookingErr.message?.includes('room_slot_number')) {
    const fallback = await admin
      .from('bookings')
      .select(
        'booking_id, payment_status, amount_paid, coupon_used, created_at, slots(slot_id, date, time_label, status, entry_fee, is_grand_finals)'
      )
      .eq('team_id', safeTeam.team_id)
      .order('created_at', { ascending: false })
    bookings = fallback.data as any[]
  }

  // Fetch full leaderboard standings to calculate team rank and stats
  const { data: allLeaderboard } = await admin
    .from('leaderboard')
    .select('team_id, best_16_total, matches_played, total_kills')
    .order('best_16_total', { ascending: false })
    .order('total_kills', { ascending: false })

  const rankedList = allLeaderboard || []
  const teamIndex = rankedList.findIndex(r => r.team_id === safeTeam.team_id)
  const rank = teamIndex >= 0 ? teamIndex + 1 : 0
  const leaderboardEntry = teamIndex >= 0 ? rankedList[teamIndex] : null

  // Fetch payouts for this team
  const { data: payouts } = await admin
    .from('payouts')
    .select('amount, status')
    .eq('team_id', safeTeam.team_id)

  // Fetch coupons/rewards for this team
  const { data: coupons } = await admin
    .from('coupons')
    .select('coupon_id, code, type, status, issued_at')
    .eq('team_id', safeTeam.team_id)
    .order('issued_at', { ascending: false })

  // Check test account status from user profile or team
  const isTestAccount = Boolean(userProfile?.is_test_account || (team as any)?.is_test_account)

  return (
    <DashboardClient
      team={safeTeam}
      userEmail={user.email || ''}
      bookings={bookings || []}
      leaderboardEntry={leaderboardEntry}
      rank={rank}
      payouts={payouts || []}
      coupons={coupons || []}
      isCaptain={safeTeam.captain_user_id === user.id}
      isTestAccount={isTestAccount}
    />
  )
}
