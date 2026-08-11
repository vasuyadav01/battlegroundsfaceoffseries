export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check admin or admin_scores role
  const { data: userProfile } = await supabase
    .from('users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const role = userProfile?.role

  if (role !== 'admin' && role !== 'admin_scores') {
    redirect('/')
  }

  // Fetch data for admin
  const [
    { data: slots },
    { data: teams },
    { data: payouts },
    { data: bookings },
    { data: coupons },
    { data: configRows },
    { data: userList },
  ] = await Promise.all([
    supabase.from('slots').select('*').order('date', { ascending: true }),
    supabase.from('teams').select('team_id, team_name, invite_code').order('team_name'),
    supabase.from('payouts').select('*, teams(team_name)').order('created_at', { ascending: false }),
    supabase.from('bookings').select('*, teams(team_name), slots(date, time_label)').eq('payment_status', 'paid').order('created_at', { ascending: false }),
    supabase.from('coupons').select('*, teams(team_name)').order('issued_at', { ascending: false }),
    supabase.from('config').select('key, value'),
    role === 'admin' ? supabase.from('users').select('user_id, email, display_name, role').order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ])

  const config: Record<string, string> = {}
  configRows?.forEach(row => { config[row.key] = row.value })

  return (
    <AdminClient
      userRole={role}
      slots={slots || []}
      teams={teams || []}
      payouts={payouts || []}
      bookings={bookings || []}
      coupons={coupons || []}
      config={config}
      usersList={userList || []}
    />
  )
}
