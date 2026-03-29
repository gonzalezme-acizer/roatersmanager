import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ParentRosterClient from './roster-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ParentRosterPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // 1. Obtener los hijos vinculados para saber las categorías
    const { data: linkages } = await supabase
        .from('player_parents')
        .select('player_id')
        .eq('parent_profile_id', user.id)

    const childIds = linkages?.map((l: any) => l.player_id) || []
    
    if (childIds.length === 0) {
        return (
            <div className="p-10 text-center">
                <h1 className="text-2xl font-black uppercase text-gray-500">Sin hijos vinculados</h1>
                <p className="mt-2 text-gray-400">No podemos mostrar el plantel si no hay hijos asociados.</p>
            </div>
        )
    }

    // 3. Obtener todos los jugadores de la base (asumiendo que la app es de M13) que NO estén suspendidos
    const { data: squad } = await supabase
        .from('players')
        .select('id, first_name, last_name, nickname, position, birth_date, image_url, category, status')
        .neq('status', 'Suspendido')
        .order('first_name', { ascending: true })

    return (
        <ParentRosterClient squad={squad || []} />
    )
}
