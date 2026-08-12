import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/team/rename
// Allows teams to change their team name ONCE
export async function POST(request: Request) {
  try {
    const { new_team_name } = await request.json()

    if (!new_team_name || !new_team_name.trim()) {
      return NextResponse.json({ error: 'New team name is required' }, { status: 400 })
    }

    const trimmedName = new_team_name.trim()
    if (trimmedName.length < 2 || trimmedName.length > 30) {
      return NextResponse.json({ error: 'Team name must be between 2 and 30 characters' }, { status: 400 })
    }

    // Verify auth
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const admin = await createAdminClient()

    // Get user's team ID
    const { data: userProfile } = await admin
      .from('users')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (!userProfile?.team_id) {
      return NextResponse.json({ error: 'No team found for user' }, { status: 404 })
    }

    // Get team details
    const { data: team, error: teamErr } = await admin
      .from('teams')
      .select('team_id, team_name, name_changed')
      .eq('team_id', userProfile.team_id)
      .single()

    if (teamErr || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Guard: Enforce 1-time name change limit
    if (team.name_changed) {
      return NextResponse.json({
        error: 'Your team name has already been changed once and is now locked.'
      }, { status: 403 })
    }

    // Check if new name is already taken by another team
    const { data: existingTeam } = await admin
      .from('teams')
      .select('team_id')
      .ilike('team_name', trimmedName)
      .neq('team_id', team.team_id)
      .maybeSingle()

    if (existingTeam) {
      return NextResponse.json({ error: 'This team name is already taken. Please pick another name.' }, { status: 409 })
    }

    // Update team name and lock further edits
    const { error: updateErr } = await admin
      .from('teams')
      .update({
        team_name: trimmedName,
        name_changed: true,
      })
      .eq('team_id', team.team_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      new_team_name: trimmedName,
      message: 'Team name updated successfully (1-time edit used).',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
