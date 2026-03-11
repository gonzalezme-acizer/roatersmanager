import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isStaff } from '@/utils/roles'
import BillboardClient from './billboard-client'

export const dynamic = 'force-dynamic'

export default async function BillboardPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    // Fetch user profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // Fetch posts with author info
    let query = supabase
        .from('billboard_posts')
        .select('*, profiles:author_id(full_name, image_url)')

    const isStaffUser = isStaff(profile?.role)

    if (profile?.role === 'Padres') {
        query = query.eq('category', 'publico')
    } else if (profile?.role === 'Staff' || profile?.role === 'Entrenador') {
        query = query.in('category', ['publico', 'staff'])
    }
    // Admin/Manager continues with full query

    const { data: posts } = await query.order('created_at', { ascending: false })

    return (
        <BillboardClient
            initialPosts={posts || []}
            user={profile}
        />
    )
}
