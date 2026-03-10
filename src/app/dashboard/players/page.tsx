import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PlayersClient from './players-client'

export default async function PlayersPage() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    // Check user role
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

    // Fetch players from supabase
    const { data: players, error } = await supabase
        .from('players')
        .select('*, skills(*)')
        .order('first_name', { ascending: true })

    return <PlayersClient initialPlayers={players || []} />
}
