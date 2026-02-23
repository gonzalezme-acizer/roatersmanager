import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './dashboard-client'

export default async function DashboardPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    const { data: players } = await supabase.from('players').select('*, skills(*)').neq('status', 'Abandonado')
    const { data: events } = await supabase.from('events').select('*')
    const { data: attendance } = await supabase.from('event_attendance').select('*')

    const playersWithLatestSkills = (players || []).map(p => {
        const sortedSkills = p.skills?.sort((a: any, b: any) => new Date(b.date_logged || 0).getTime() - new Date(a.date_logged || 0).getTime())
        return {
            ...p,
            skills: sortedSkills?.[0] || null,
            allSkills: sortedSkills || []
        }
    })

    return <DashboardClient players={playersWithLatestSkills} events={events || []} attendance={attendance || []} />
}

