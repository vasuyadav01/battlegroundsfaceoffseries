import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/register-team
// Called client-side after signUp+signIn succeeds.
// Uses service role to bypass RLS and reliably write team + user profile.
export async function POST(request: Request) {
  try {
    const { teamName, displayName } = await request.json()

    if (!teamName?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // Get the authenticated user from the session cookie
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Use admin client (service role) — bypasses RLS entirely
    const admin = await createAdminClient()

    // Insert team
    const { data: team, error: teamErr } = await admin
      .from('teams')
      .insert({
        team_name: teamName.trim(),
        captain_user_id: user.id,
      })
      .select()
      .single()

    if (teamErr) {
      const isUnique = teamErr.message.toLowerCase().includes('unique') ||
        teamErr.code === '23505'
      return NextResponse.json(
        { error: isUnique ? 'Team name already taken. Please choose a different team name.' : teamErr.message },
        { status: isUnique ? 409 : 500 }
      )
    }

    // Upsert user profile — service role ignores RLS
    const { error: userErr } = await admin
      .from('users')
      .upsert({
        user_id: user.id,
        email: user.email,
        team_id: team.team_id,
        role: 'captain',
        display_name: displayName?.trim() || teamName.trim(),
      }, { onConflict: 'user_id' })

    if (userErr) {
      return NextResponse.json({ error: `Profile setup failed: ${userErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, team_id: team.team_id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
