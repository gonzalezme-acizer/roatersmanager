import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardRedirect() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Obtener el perfil del usuario para saber su rol y contexto
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_parent')
        .eq('id', user.id)
        .single()

    if (!profile) {
        // Si no hay perfil, por defecto mandamos a staff o a una página de error
        redirect('/dashboard/staff')
    }

    // Lógica de redirección por defecto según el rol principal
    const isStaffRole = profile.role === 'Admin' || profile.role === 'Administrador' || profile.role === 'Entrenador' || profile.role === 'Staff' || profile.role === 'Manager'

    if (isStaffRole) {
        redirect('/dashboard/staff')
    } else {
        redirect('/dashboard/parent')
    }
}
