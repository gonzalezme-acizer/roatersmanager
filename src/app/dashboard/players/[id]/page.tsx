import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PlayerDetailClient from './player-detail-client'

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params
    const id = resolvedParams.id
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/login')
    }

    // Fetch player data
    const { data: player, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !player) {
        redirect('/dashboard/players')
    }

    // Fetch latest skills
    const { data: skills } = await supabase
        .from('skills')
        .select('*')
        .eq('player_id', id)
        .order('date_logged', { ascending: false })
        .limit(1)
        .single()

    // Fetch user profile for role verification
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

    return <PlayerDetailClient initialPlayer={player} initialSkills={skills || null} userRole={profile?.role || 'Staff'} />
}
