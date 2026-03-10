import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import TeamsClient from './teams-client'

export const dynamic = 'force-dynamic'

export default async function TeamsPage() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const staffRoles = ['Admin', 'Manager', 'Staff', 'Administrador', 'Entrenador', 'Preparador Físico']
    const isStaff = staffRoles.includes(profile?.role || '')

    if (!isStaff) {
        redirect('/dashboard/parent')
    }

    const { data: teams } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true })

    const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, position, category')
        .neq('status', 'Abandonado')

    return <TeamsClient initialTeams={teams || []} allPlayers={players || []} />
}
