export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch user profile + team
  const { data: userProfile } = await supabase
    .from('users')
    .select('*, teams(team_id, team_name, invite_code, captain_user_id)')
    .eq('user_id', user.id)
    .single()

  if (!userProfile?.team_id) redirect('/onboard')

  const team = userProfile.teams as any

  // Fetch team roster
  const { data: roster } = await supabase
    .from('users')
    .select('user_id, display_name, email, role')
    .eq('team_id', team.team_id)
    .order('role')

  // Fetch bookings for this team (with slot info)
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, slots(slot_id, date, time_label, room_id, room_password, status)')
    .eq('team_id', team.team_id)
    .eq('payment_status', 'paid')
    .order('created_at', { ascending: false })

  // Fetch coupons
  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('team_id', team.team_id)
    .eq('status', 'unused')

  // Fetch leaderboard entry for this team
  const { data: leaderboardEntry } = await supabase
    .from('leaderboard')
    .select('matches_played, best_16_total, total_kills')
    .eq('team_id', team.team_id)
    .single()

  return (
    <>
      <Navbar />
      <DashboardClient
        userProfile={userProfile}
        team={team}
        roster={roster || []}
        bookings={bookings || []}
        coupons={coupons || []}
        leaderboardEntry={leaderboardEntry}
        isCaptain={team.captain_user_id === user.id}
      />
    </>
  )
}
