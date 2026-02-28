'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: 'Por favor completá todos los campos.' }
    }

    const supabase = await createClient()

    const entryPoint = formData.get('entryPoint') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: 'Credenciales inválidas.' }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_parent')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single()

    const isStaffRole = profile?.role === 'Admin' || profile?.role === 'Administrador' || profile?.role === 'Entrenador' || profile?.role === 'Staff' || profile?.role === 'Manager'

    if (entryPoint === 'staff' && !isStaffRole) {
        // Si intenta entrar como staff pero NO tiene rol de staff
        return { error: 'Esta cuenta no tiene permisos de Staff. Por favor, selecciona "Soy Familiar" para ingresar.' }
    }

    if (entryPoint === 'parent' && !profile?.is_parent) {
        // Si intenta entrar como padre pero no tiene marcado is_parent
        return { error: 'Esta cuenta no tiene acceso Familiar asignado. Ingresa como Staff.' }
    }

    if (entryPoint === 'parent') {
        redirect('/dashboard/parent')
    } else {
        redirect('/dashboard/staff')
    }
}

export async function signup(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string

    if (!email || !password || !fullName) {
        return { error: 'Por favor completá todos los campos.' }
    }

    // Password Validation
    if (password.length < 8) {
        return { error: 'La contraseña debe tener al menos 8 caracteres.' }
    }
    if (!/[A-Z]/.test(password)) {
        return { error: 'La contraseña debe incluir al menos una mayúscula.' }
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { error: 'La contraseña debe incluir al menos un carácter especial.' }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            }
        }
    })

    if (error) {
        return { error: error.message }
    }

    redirect('/dashboard')
}
