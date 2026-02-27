import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import BillboardClient from './billboard-client'

export const dynamic = 'force-dynamic'

export default async function BillboardPage() {
    const supabase = await createClient()

    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        redirect('/login')
    }

    // Fetch posts with author info
    // Only fetch public and staff posts (for now, staff posts can be seen by auth users)
    const { data: posts } = await supabase
        .from('billboard_posts')
        .select('*, profiles:author_id(full_name, image_url)')
        .order('created_at', { ascending: false })

    return (
        <BillboardClient
            initialPosts={posts || []}
            user={user}
        />
    )
}
