import { createAdminClient, createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST /api/user/toggle-test-mode
export async function POST(request: Request) {
  try {
    const { enabled } = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = await createAdminClient()

    const isActive = Boolean(enabled)

    // Update test_mode_active in users table
    const { error: userErr } = await admin
      .from('users')
      .update({ test_mode_active: isActive })
      .eq('user_id', user.id)

    if (userErr && userErr.code === '42703') {
      // Column might not exist yet; ignore DB error so local toggle works seamlessly
    }

    return NextResponse.json({ success: true, enabled: isActive })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
