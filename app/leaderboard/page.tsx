import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import LeaderboardClient from './LeaderboardClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Leaderboard — BGFS',
  description: 'Live BGFS Battlegrounds Faceoff Series standings. Best-16 match system — updated after every slot.',
}

// Revalidate every 60 seconds
export const revalidate = 60

export default async function LeaderboardPage() {
  const supabase = await createClient()

  // Fetch leaderboard
  const { data: rows } = await supabase
    .from('leaderboard')
    .select('team_id, team_name, matches_played, best_16_total, total_kills')
    .order('best_16_total', { ascending: false })
    .order('total_kills', { ascending: false })

  // Fetch all match scores per team (for full match-by-match breakdown)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allMatchesRaw } = await (supabase
    .from('matches')
    .select('team_id, slot_id, match_number, total_points, placement, kills, slots(date, time_label)')
    .order('created_at', { ascending: true }) as any)
  const allMatches = (allMatchesRaw || []) as any[]

  // Rank the rows
  const ranked = (rows || []).map((row, idx) => ({ ...row, rank: idx + 1 }))

  return (
    <>
      <Navbar />
      <LeaderboardClient rows={ranked} allMatches={allMatches || []} />
    </>
  )
}
