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

    // Fetch posts
    let query = supabase
        .from('billboard_posts')
        .select('*')

    const isStaffUser = isStaff(profile?.role)

    if (profile?.role === 'Padres') {
        query = query.eq('category', 'publico')
    } else if (profile?.role === 'Staff' || profile?.role === 'Entrenador') {
        query = query.in('category', ['publico', 'staff'])
    }
    // Admin/Manager continues with full query

    const { data: postsData } = await query.order('created_at', { ascending: false })
    
    // Manually join profiles because FK might be missing
    let posts = postsData || []
    if (posts.length > 0) {
        const authorIds = Array.from(new Set(posts.map((p: any) => p.author_id).filter(Boolean)))
        if (authorIds.length > 0) {
            const { data: profiles } = await supabase.from('profiles').select('id, full_name, image_url').in('id', authorIds)
            const profileMap = (profiles || []).reduce((acc: any, p: any) => {
                acc[p.id] = p
                return acc
            }, {})
            posts = posts.map((p: any) => ({
                ...p,
                profiles: profileMap[p.author_id] || null
            }))
        }
    }

    return (
        <BillboardClient
            initialPosts={posts || []}
            user={profile}
        />
    )
}
