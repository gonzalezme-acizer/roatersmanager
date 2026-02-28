import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_parent, is_active')
        .eq('id', user.id)
        .single()

    // Redirigir si es padre y no tiene rol de staff
    if (profile?.is_parent && profile?.role !== 'Administrador' && profile?.role !== 'Entrenador' && profile?.role !== 'Admin' && profile?.role !== 'Manager') {
        redirect('/dashboard/parent')
    }

    // Redirigir al dashboard si no es activo (opcional)
    if (profile && !profile.is_active) {
        redirect('/login?error=Cuenta inactiva')
    }

    const { data: players } = await supabase.from('players').select('*, skills(*)').neq('status', 'Abandonado')
    const { data: events } = await supabase.from('events').select('*')
    const { data: attendance } = await supabase.from('event_attendance').select('*')

    const playersWithLatestSkills = (players || []).map((p: any) => {
        const sortedSkills = p.skills?.sort((a: any, b: any) => new Date(b.date_logged || 0).getTime() - new Date(a.date_logged || 0).getTime())
        return {
            ...p,
            skills: sortedSkills?.[0] || null,
            allSkills: sortedSkills || []
        }
    })

    return <DashboardClient players={playersWithLatestSkills} events={events || []} attendance={attendance || []} />
}

