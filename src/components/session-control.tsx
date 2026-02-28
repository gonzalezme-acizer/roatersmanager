'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export function SessionControl() {
    const router = useRouter()
    const supabase = createClient()
    const INACTIVITY_TIME = 20 * 60 * 1000 // 20 minutes

    const logout = useCallback(async (reason: string) => {
        await supabase.auth.signOut()
        document.cookie = 'roaster_session_token=; Max-Age=0; path=/;'
        router.push(`/login?error=${encodeURIComponent(reason)}`)
    }, [router, supabase])

    useEffect(() => {
        let timeout: NodeJS.Timeout

        const resetTimer = () => {
            clearTimeout(timeout)
            timeout = setTimeout(() => {
                logout('Sesión expirada por inactividad. Por favor, vuelve a ingresar.')
            }, INACTIVITY_TIME)
        }

        const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart']
        events.forEach(e => window.addEventListener(e, resetTimer))
        resetTimer()

        return () => {
            events.forEach(e => window.removeEventListener(e, resetTimer))
            clearTimeout(timeout)
        }
    }, [logout])

    useEffect(() => {
        const interval = setInterval(async () => {
            const browserToken = document.cookie.split('; ').find(row => row.startsWith('roaster_session_token='))?.split('=')[1]
            if (!browserToken) return

            const { data: { user } } = await supabase.auth.getUser()

            if (user && user.user_metadata) {
                const currentToken = user.user_metadata.current_session_token
                if (currentToken && currentToken !== browserToken) {
                    console.log('Session mismatch! Another login detected.')
                    logout('Se ha iniciado sesión en otro dispositivo. Tu sesión actual ha sido cerrada.')
                }
            }
        }, 30000) // Check every 30 seconds

        return () => clearInterval(interval)
    }, [logout, supabase])

    return null
}
