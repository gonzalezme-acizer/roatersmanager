'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useLang } from '@/components/lang-provider'
import { ChevronLeft, Save, Edit3, User, Activity, Phone, AlignLeft, Shield, AlertCircle, Camera, Loader2, Star, Plus, Trash2, X, CalendarDays, Trophy, MessageCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/utils/cropImage'
import { showSuccessToast, showErrorToast } from '@/utils/toast'

const FORWARDS_POSITIONS = ["Pilar", "Hooker", "Segunda línea", "Ala", "Octavo"]
const BACKS_POSITIONS = ["Medio Scrum", "Apertura", "Primer Centro", "Segundo Centro", "Wing", "Full Back"]

export default function PlayerDetailClient({ initialPlayer, initialSkills, userRole }: { initialPlayer: any, initialSkills: any, userRole: string }) {
    const { t } = useLang()
    const router = useRouter()
    const supabase = createClient()

    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [player, setPlayer] = useState(initialPlayer)
    
    // Messages state
    const [newMessage, setNewMessage] = useState('')
    const [isSendingMessage, setIsSendingMessage] = useState(false)

    const isAdminOrManager = userRole === 'Admin' || userRole === 'Manager' || userRole === 'Administrador'

    // Crop States
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)

    // Ensure we have a default skills object even if initialSkills is null
    const [skills, setSkills] = useState({
        passing_receiving: initialSkills?.passing_receiving ?? 1, ruck: initialSkills?.ruck ?? 1, tackle: initialSkills?.tackle ?? 1, contact: initialSkills?.contact ?? 1, speed: initialSkills?.speed ?? 1,
        endurance: initialSkills?.endurance ?? 1, strength: initialSkills?.strength ?? 1, tactical_positioning: initialSkills?.tactical_positioning ?? 1, decision_making: initialSkills?.decision_making ?? 1,
        line_out: initialSkills?.line_out ?? 1, scrum: initialSkills?.scrum ?? 1, attack: initialSkills?.attack ?? 1, defense: initialSkills?.defense ?? 1, mentality: initialSkills?.mentality ?? 1,
        patada: initialSkills?.patada ?? 1, duelo: initialSkills?.duelo ?? 1
    })

    const { useMemo } = require('react')

    const attendanceStats = useMemo(() => {
        if (!player.event_attendance) return null

        let matchCount = 0
        let matchPresent = 0
        let trainingCount = 0
        let trainingPresent = 0

        player.event_attendance.forEach((att: any) => {
            if (att.events?.status === 'Cancelado') return
            if (!['Presente', 'Ausente', 'Tarde', 'Justificado', 'Titular', 'Suplente'].includes(att.status)) return

            const isMatch = att.events?.event_type === 'Partido'
            const isPresent = ['Presente', 'Titular', 'Suplente'].includes(att.status)
            
            if (isMatch) {
                matchCount++
                if (isPresent) matchPresent++
            } else {
                trainingCount++
                if (isPresent) trainingPresent++
            }
        })

        const totalCount = matchCount + trainingCount
        const totalPresent = matchPresent + trainingPresent

        return {
            match: matchCount ? Math.round((matchPresent / matchCount) * 100) : 0,
            training: trainingCount ? Math.round((trainingPresent / trainingCount) * 100) : 0,
            total: totalCount ? Math.round((totalPresent / totalCount) * 100) : 0,
            matchPresent, matchCount, trainingPresent, trainingCount, totalPresent, totalCount
        }
    }, [player.event_attendance])

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            if (file.size > 10 * 1024 * 1024) {
                setError('El archivo seleccionado es demasiado grande. El límite es 10MB.')
                return
            }
            setImageSrc(URL.createObjectURL(file))
            e.target.value = '' // reset input
        }
    }

    const handleCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const uploadCroppedImage = async () => {
        try {
            setUploadingImage(true)
            setError(null)

            if (!imageSrc || !croppedAreaPixels) return

            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
            if (!croppedBlob) throw new Error("No se pudo recortar la imagen")

            const filePath = `${player.id}-${Math.floor(Math.random() * 10000)}.jpg`

            // Upload the cropped file to the 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedBlob)

            if (uploadError) {
                if (uploadError.message.includes('bucket')) {
                    throw new Error('Asegúrate de haber creado el bucket "avatars" en Supabase y de tenerlo subido en "Public".')
                }
                throw uploadError
            }

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update local state
            setPlayer({ ...player, image_url: publicUrl })

            // Close modal
            setImageSrc(null)

        } catch (err: any) {
            console.error(err)
            setError(err.message)
        } finally {
            setUploadingImage(false)
        }
    }

    const formatWhatsApp = (val: string) => {
        let raw = val.replace(/\D/g, '')
        if (raw.startsWith('549')) raw = raw.slice(3)
        else if (raw.startsWith('54')) raw = raw.slice(2)
        else if (raw.startsWith('0')) raw = raw.slice(1)
        raw = raw.slice(0, 10)

        if (raw.length === 0) return ''
        let res = '+54 9'
        if (raw.length > 0) res += raw.substring(0, 3)
        if (raw.length > 3) res += ' ' + raw.substring(3, 7)
        if (raw.length > 7) res += ' ' + raw.substring(7, 11)
        return res
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as any
        let checked = (e.target as HTMLInputElement).checked
        let finalValue = value

        if (name === 'father_name' || name === 'mother_name') {
            finalValue = value.toUpperCase()
        } else if (name === 'whatsapp_number') {
            if (value.trim() === '') finalValue = ''
            else finalValue = formatWhatsApp(value)
        }

        let newPlayerState = {
            ...player,
            [name]: type === 'checkbox' ? checked : finalValue
        }

        if (name === 'birth_date') {
            if (value) {
                const today = new Date();
                const bbd = new Date(value);
                let age = today.getFullYear() - bbd.getFullYear();
                const m = today.getMonth() - bbd.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < bbd.getDate())) {
                    age--;
                }
                newPlayerState.age = age;
            } else {
                newPlayerState.age = null;
            }
        }

        setPlayer(newPlayerState)
    }

    const handleSkillChange = (name: string, value: number) => {
        setSkills({ ...skills, [name]: value })
    }

    const handleSave = async () => {
        setLoading(true)
        setError(null)

        if (player.nickname) {
            const { data: existing } = await supabase
                .from('players')
                .select('id')
                .eq('first_name', player.first_name)
                .eq('last_name', player.last_name)
                .eq('nickname', player.nickname)
                .neq('id', player.id)

            if (existing && existing.length > 0) {
                setError('El apodo introducido ya existe para un jugador con el mismo nombre y apellido.')
                setLoading(false)
                return
            }
        }

        const { error: updateError } = await supabase
            .from('players')
            .update({
                first_name: player.first_name,
                last_name: player.last_name,
                nickname: player.nickname,
                dni: player.dni,
                blood_type: player.blood_type,
                birth_date: player.birth_date || null,
                age: player.age || null,
                father_name: player.father_name,
                mother_name: player.mother_name,
                has_whatsapp: player.has_whatsapp,
                whatsapp_number: player.whatsapp_number,
                status: player.status,
                height: player.height || null,
                weight: player.weight || null,
                dominant_foot: player.dominant_foot,
                dominant_hand: player.dominant_hand,
                category: player.category,
                position: player.position,
                image_url: player.image_url,
                medical_clearance: player.medical_clearance || false
            })
            .eq('id', player.id)

        if (updateError) {
            setLoading(false)
            console.error(updateError)
            setError(updateError.message)
            return
        }

        // Save skills - either update latest or insert new if there is none today. 
        // For simplicity, we just insert a new log unconditionally to keep historical logs.
        const { error: skillsError } = await supabase
            .from('skills')
            .insert({
                player_id: player.id,
                ...skills,
                id: undefined, // let supabase generate a new UUID
                date_logged: new Date().toISOString()
            })

        setLoading(false)

        if (skillsError) {
            console.error(skillsError)
            setError("Error al guardar la evaluación: " + skillsError.message)
        } else {
            setIsEditing(false)
            router.refresh()
        }
    }

    const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return

        setIsSendingMessage(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No auth user')

            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()

            const newMsgObj = {
                player_id: player.id,
                sender_id: user.id,
                sender_name: profile?.full_name || 'Staff',
                content: newMessage.trim()
            }

            const { data, error: sendError } = await supabase.from('player_messages').insert([newMsgObj]).select()
            
            if (sendError) throw sendError

            // Optionally notify parent (would require Edge Function or a notification table, skipped for now to keep it simple)

            // Update local state
            setPlayer({
                ...player,
                player_messages: [...(player.player_messages || []), data[0]]
            })
            setNewMessage('')
            showSuccessToast('Mensaje Enviado', 'El mensaje ha sido posteado en el perfil del jugador.')
        } catch (err: any) {
            console.error(err)
            showErrorToast('Error', 'No se pudo enviar el mensaje: ' + err.message)
        } finally {
            setIsSendingMessage(false)
        }
    }

    return (
        <div className="p-6 md:p-10 min-h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-liceo-primary/30 via-background to-background dark:from-liceo-primary/20 dark:via-background dark:to-background text-foreground transition-colors space-y-6">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Link href="/dashboard/players" className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-liceo-primary dark:text-gray-400 dark:hover:text-liceo-gold transition-colors group">
                    <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                    {t.add.back}
                </Link>

                <div className="flex bg-white/50 dark:bg-white/5 backdrop-blur-md p-1.5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            disabled={player.status === 'Abandonado'}
                            title={player.status === 'Abandonado' ? 'Jugadores abandonados no se pueden editar' : ''}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/10 text-liceo-primary dark:text-white rounded-lg font-bold text-sm shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Edit3 className="w-4 h-4" />
                            {t.player.editBtn}
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            disabled={loading || player.status === 'Abandonado'}
                            className="flex items-center gap-2 px-6 py-2 bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] rounded-lg font-bold text-sm shadow-md transition-all hover:opacity-90 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? t.player.saving : t.player.saveBtn}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* Main Profile Header */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 shadow-xl rounded-3xl p-6 md:p-8 flex items-center gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-liceo-accent/10 rounded-full blur-3xl -mx-20 -my-20 opacity-50"></div>

                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-liceo-primary to-liceo-accent shrink-0 flex items-center justify-center text-white font-extrabold text-4xl shadow-xl border-4 border-white dark:border-[#001224] z-10 overflow-hidden group/avatar">
                    {player.image_url ? (
                        <img src={player.image_url} alt={player.first_name} className="w-full h-full object-cover" />
                    ) : (
                        <>{player.first_name.charAt(0)}{player.last_name.charAt(0)}</>
                    )}

                    {isEditing && (
                        <label
                            htmlFor="photo-upload"
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm"
                        >
                            {uploadingImage ? (
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            ) : (
                                <>
                                    <Camera className="w-8 h-8 text-white mb-1 drop-shadow-md" />
                                    <span className="text-[10px] uppercase font-bold text-white tracking-widest">Cambiar</span>
                                </>
                            )}
                            <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={uploadingImage}
                                onChange={handleImageUpload}
                            />
                        </label>
                    )}
                </div>

                <div className="flex-1 z-10">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            {player.first_name} {player.last_name}
                        </h1>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm border ${player.status === 'Activo' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30' :
                            player.status === 'Lesionado' ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' :
                                'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
                            }`}>
                            {player.status}
                        </span>
                    </div>
                    {player.nickname && <p className="text-lg text-gray-500 dark:text-gray-400 font-medium italic mb-3">"{player.nickname}"</p>}
                    <p className="inline-flex items-center px-4 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-sm font-bold text-liceo-primary dark:text-liceo-gold">
                        {player.position || 'Sin Posición'} • {player.category || 'M13'}
                    </p>
                </div>
            </div>

            {/* Grid of details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Column 1: Personal & Biometry */}
                <div className="space-y-6">
                    {/* Personal Info */}
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white">
                            <User className="w-5 h-5 text-liceo-accent" />
                            {t.player.personalInfo}
                        </h3>
                        <div className="space-y-4">
                            {isEditing && (
                                <>
                                    <Field label="Nombre" name="first_name" value={player.first_name} isEditing={isEditing && isAdminOrManager} onChange={handleChange} />
                                    <Field label="Apellido" name="last_name" value={player.last_name} isEditing={isEditing && isAdminOrManager} onChange={handleChange} />
                                    <Field label="Apodo" name="nickname" value={player.nickname} isEditing={isEditing && isAdminOrManager} onChange={handleChange} />
                                    <div className="h-4"></div>
                                </>
                            )}
                            <Field label={t.player.fields.dni} name="dni" value={player.dni} isEditing={isEditing && isAdminOrManager} onChange={handleChange} />
                            <Field label={t.player.fields.birthDate} name="birth_date" value={player.birth_date} isEditing={isEditing && isAdminOrManager} onChange={handleChange} type="date" />
                            <Field label={t.player.fields.age} name="age" value={player.age} isEditing={false} type="number" />

                            {isEditing && isAdminOrManager ? (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.player.fields.bloodType}</label>
                                    <select name="blood_type" value={player.blood_type || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#0B1526]/50 text-sm focus:ring-2 focus:ring-liceo-accent outline-none font-medium text-gray-900 dark:text-white">
                                        <option value="">-</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <Field label={t.player.fields.bloodType} name="blood_type" value={player.blood_type} isEditing={false} />
                            )}

                            <div className={`flex items-center gap-2 mt-4 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border ${player.medical_clearance ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-gray-100 dark:border-white/10'}`}>
                                <input
                                    type="checkbox"
                                    name="medical_clearance"
                                    checked={player.medical_clearance || false}
                                    onChange={handleChange}
                                    disabled={!isEditing || !isAdminOrManager}
                                    className="w-4 h-4 rounded border-gray-300 text-liceo-primary focus:ring-liceo-primary dark:bg-white/10 dark:border-white/20 dark:checked:bg-liceo-gold disabled:opacity-50 cursor-pointer"
                                />
                                <label className={`text-sm font-bold ${player.medical_clearance ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                    Presenta APTO MÉDICO
                                </label>
                            </div>
                            {isEditing && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.player.fields.status}</label>
                                    <select name="status" value={player.status} onChange={handleChange} disabled={!isAdminOrManager} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#0B1526]/50 text-sm focus:ring-2 focus:ring-liceo-accent outline-none disabled:opacity-50">
                                        <option value="Activo">Activo</option>
                                        <option value="Suspendido">Suspendido</option>
                                        <option value="Lesionado">Lesionado</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Biometry */}
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            {t.player.biometry}
                        </h3>
                        <div className="space-y-4">
                            <Field label={t.player.fields.height} name="height" value={player.height} isEditing={isEditing && isAdminOrManager} onChange={handleChange} type="number" step="0.01" />
                            <Field label={t.player.fields.weight} name="weight" value={player.weight} isEditing={isEditing && isAdminOrManager} onChange={handleChange} type="number" step="0.01" />

                            {isEditing && isAdminOrManager ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.player.fields.dominantFoot}</label>
                                        <select name="dominant_foot" value={player.dominant_foot || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#0B1526]/50 text-sm focus:ring-2 focus:ring-liceo-accent outline-none">
                                            <option value="">-</option>
                                            <option value="Izquierdo">Izquierdo</option>
                                            <option value="Derecho">Derecho</option>
                                            <option value="Ambidiestro">Ambidiestro</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.player.fields.dominantHand}</label>
                                        <select name="dominant_hand" value={player.dominant_hand || ''} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#0B1526]/50 text-sm focus:ring-2 focus:ring-liceo-accent outline-none">
                                            <option value="">-</option>
                                            <option value="Izquierda">Izquierda</option>
                                            <option value="Derecha">Derecha</option>
                                            <option value="Ambidiestro">Ambidiestro</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Field label={t.player.fields.dominantFoot} name="dominant_foot" value={player.dominant_foot} isEditing={false} onChange={handleChange} />
                                    <Field label={t.player.fields.dominantHand} name="dominant_hand" value={player.dominant_hand} isEditing={false} onChange={handleChange} />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 2: Rugby Info & Contact */}
                <div className="space-y-6">
                    {/* Rugby Info */}
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white">
                            <Shield className="w-5 h-5 text-amber-500" />
                            {t.player.rugbyInfo}
                        </h3>
                        <div className="space-y-4">
                            {isEditing ? (
                                <>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.player.fields.category}</label>
                                        <select
                                            name="category"
                                            value={player.category || ''}
                                            onChange={(e) => {
                                                handleChange(e)
                                                if (e.target.value !== player.category) {
                                                    setPlayer((p: any) => ({ ...p, position: '' }))
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#0B1526]/50 text-sm focus:ring-2 focus:ring-liceo-accent outline-none font-medium dark:text-white"
                                        >
                                            <option value="">-</option>
                                            <option value="Forwards">Forwards</option>
                                            <option value="Backs">Backs</option>
                                        </select>
                                    </div>

                                    {player.category && (
                                        <div className="space-y-2 pt-2">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex justify-between">
                                                <span>{t.player.fields.position}</span>
                                                <span className="text-[9px] lowercase normal-case opacity-70">(Max 3 - La 1° es Principal)</span>
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {(player.category === 'Forwards' ? FORWARDS_POSITIONS : BACKS_POSITIONS).map(pos => {
                                                    const currentPositions = player.position ? player.position.split(', ').filter(Boolean) : []
                                                    const isSelected = currentPositions.includes(pos)
                                                    const isPrimary = isSelected && currentPositions[0] === pos
                                                    const isDisabled = !isSelected && currentPositions.length >= 3

                                                    return (
                                                        <button
                                                            key={pos}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setPlayer({ ...player, position: currentPositions.filter((p: string) => p !== pos).join(', ') })
                                                                } else {
                                                                    setPlayer({ ...player, position: [...currentPositions, pos].join(', ') })
                                                                }
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${isSelected
                                                                ? isPrimary
                                                                    ? 'bg-liceo-primary text-white border-liceo-primary dark:bg-liceo-gold dark:text-[#0B1526] dark:border-liceo-gold shadow-md'
                                                                    : 'bg-liceo-primary/10 text-liceo-primary border-liceo-primary/30 dark:bg-liceo-gold/10 dark:text-liceo-gold dark:border-liceo-gold/30'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 dark:bg-white/5 dark:text-gray-400 dark:border-white/10 dark:hover:border-white/20'
                                                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                        >
                                                            {pos} {isPrimary && '★'}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Field label={t.player.fields.category} name="category" value={player.category} isEditing={false} onChange={handleChange} />
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t.player.fields.position}</label>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {player.position ? player.position.split(', ').filter(Boolean).map((pos: string, idx: number) => (
                                                <span key={pos} className={`px-2 py-1 rounded text-xs font-bold ${idx === 0 ? 'bg-liceo-primary text-white dark:bg-liceo-gold dark:text-[#0B1526]' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'}`}>
                                                    {pos} {idx === 0 && '★'}
                                                </span>
                                            )) : (
                                                <span className="text-sm font-bold text-gray-800 dark:text-white">-</span>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                        <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white">
                            <Phone className="w-5 h-5 text-blue-500" />
                            {t.player.contactInfo}
                        </h3>
                        <div className="space-y-4">
                            <Field label={t.player.fields.fatherName} name="father_name" value={player.father_name?.toUpperCase()} isEditing={isEditing} onChange={handleChange} />
                            <Field label={t.player.fields.motherName} name="mother_name" value={player.mother_name?.toUpperCase()} isEditing={isEditing} onChange={handleChange} />
                            <Field label={t.player.fields.whatsappNumber} name="whatsapp_number" value={player.whatsapp_number} isEditing={isEditing} onChange={handleChange} placeholder="+54 9zzz xxxx yyyy" />

                            {isEditing ? (
                                <div className="flex items-center gap-2 mt-4 bg-gray-50 dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/10">
                                    <input type="checkbox" id="has_whatsapp" name="has_whatsapp" checked={player.has_whatsapp || false} onChange={handleChange} className="w-4 h-4 text-liceo-primary rounded-sm border-gray-300 focus:ring-liceo-accent" />
                                    <label htmlFor="has_whatsapp" className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.player.fields.hasWhatsapp}</label>
                                </div>
                            ) : (
                                <div className="pt-2">
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${player.has_whatsapp ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'}`}>
                                        {player.has_whatsapp ? 'Whatsapp Registrado' : 'Sin Whatsapp'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attendance Info */}
                    {!isEditing && attendanceStats && (
                        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white">
                                <CalendarDays className="w-5 h-5 text-purple-500" />
                                Presencialidad Total ({attendanceStats.total}%)
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                                    <div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-liceo-primary dark:text-liceo-gold" /><span className="text-sm font-bold text-gray-800 dark:text-white">Partidos</span></div>
                                    <span className="text-sm font-black text-liceo-primary dark:text-[#5EE5F8]">{attendanceStats.match}% ({attendanceStats.matchPresent}/{attendanceStats.matchCount})</span>
                                </div>
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10 shadow-sm">
                                    <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-500" /><span className="text-sm font-bold text-gray-800 dark:text-white">Entrenamientos</span></div>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{attendanceStats.training}% ({attendanceStats.trainingPresent}/{attendanceStats.trainingCount})</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Mensajes Directos (Staff to Player) */}
                    {!isEditing && (
                        <div className="bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg">
                            <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white">
                                <MessageCircle className="w-5 h-5 text-blue-400" />
                                Mensajes al Jugador
                            </h3>
                            <div className="space-y-4">
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                    {player.player_messages && player.player_messages.length > 0 ? (
                                        [...player.player_messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((msg: any) => (
                                            <div key={msg.id} className="bg-gray-50 dark:bg-white/5 p-3.5 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-white/10 shadow-sm relative">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="text-[10px] font-black uppercase text-liceo-primary dark:text-liceo-gold tracking-widest">{msg.sender_name || 'Staff'}</span>
                                                    <span className="text-[9px] text-gray-400 font-bold">{new Date(msg.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})}</span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed">{msg.content}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                                            <MessageCircle className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                            <p className="text-xs text-gray-500 font-bold tracking-tight">Aún no hay mensajes para {player.first_name}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage() }}
                                        placeholder="Escribir feedback o novedad para los padres..." 
                                        className="flex-1 bg-white dark:bg-[#0B1526] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-xs md:text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-liceo-primary outline-none transition-all placeholder:text-gray-400"
                                    />
                                    <button 
                                        onClick={handleSendMessage}
                                        disabled={isSendingMessage || !newMessage.trim()}
                                        className="bg-liceo-primary text-white p-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center shrink-0"
                                    >
                                        {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Column 3: Custom Features / Radar */}
                <div className={`bg-white/70 dark:bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-gray-200 dark:border-white/10 shadow-lg flex flex-col ${isEditing ? 'lg:col-span-3' : ''}`}>
                    <h3 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-gray-100 dark:border-white/10 pb-4 text-gray-900 dark:text-white justify-between">
                        <span className="flex items-center gap-2"><Star className="w-5 h-5 text-yellow-500" /> Evaluación 360°</span>
                        {!isEditing && (
                            <span className="text-xs font-bold text-gray-400">
                                {initialSkills ? `Última eval: ${new Date(initialSkills.date_logged).toLocaleDateString()}` : 'Sin evaluar'}
                            </span>
                        )}
                    </h3>

                    {!isEditing ? (
                        <div className="w-full h-[350px] flex items-center justify-center">
                            {initialSkills ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                                        { subject: 'Físico', A: ((initialSkills.speed + initialSkills.endurance + initialSkills.strength) / 3).toFixed(1), fullMark: 5 },
                                        { subject: 'Defensa', A: ((initialSkills.tackle + initialSkills.defense + initialSkills.contact) / 3).toFixed(1), fullMark: 5 },
                                        { subject: 'Mentalidad', A: initialSkills.mentality, fullMark: 5 },
                                        { subject: 'Táctica', A: ((initialSkills.tactical_positioning + initialSkills.decision_making) / 2).toFixed(1), fullMark: 5 },
                                        { subject: 'Ataque', A: ((initialSkills.attack + initialSkills.passing_receiving + (initialSkills.patada || 1) + (initialSkills.duelo || 1)) / 4).toFixed(1), fullMark: 5 },
                                        { subject: 'Fijos/Ruck', A: ((initialSkills.ruck + initialSkills.scrum + initialSkills.line_out) / 3).toFixed(1), fullMark: 5 },
                                    ]}>
                                        <PolarGrid strokeOpacity={0.2} stroke="currentColor" className="text-gray-500 dark:text-gray-300" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }} className="text-gray-700 dark:text-gray-300" />
                                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} strokeOpacity={0.2} />
                                        <Radar name={player.nickname || player.first_name} dataKey="A" stroke="#001F3F" fill="#3A86FF" fillOpacity={0.5} strokeWidth={2} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', background: 'rgba(255,255,255,0.95)', fontWeight: 'bold', fontSize: '12px' }}
                                            itemStyle={{ color: '#3A86FF' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center opacity-50 flex flex-col items-center">
                                    <AlignLeft className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-sm font-semibold max-w-[200px]">Haz clic en Editar para cargar la primera evaluación de este jugador.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { group: "Ataque y Destrezas", keys: ['attack', 'passing_receiving', 'patada', 'duelo'] },
                                { group: "Defensa y Contacto", keys: ['defense', 'tackle', 'contact'] },
                                { group: "Estructuras Fijas", keys: ['ruck', 'scrum', 'line_out'] },
                                { group: "Táctica y Mental", keys: ['tactical_positioning', 'decision_making', 'mentality'] },
                                { group: "Físico", keys: ['speed', 'endurance', 'strength'] }
                            ].map(g => (
                                <div key={g.group} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wide text-liceo-primary dark:text-liceo-gold mb-4">{g.group}</h4>
                                    <div className="space-y-4">
                                        {g.keys.map(k => (
                                            <div key={k} className="flex justify-between items-center gap-2">
                                                <label className="text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400 w-1/2">
                                                    {k.replace('_', ' ')}
                                                </label>
                                                <div className="flex-1">
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="5"
                                                        step="1"
                                                        value={(skills as any)[k]}
                                                        onChange={(e) => handleSkillChange(k, parseInt(e.target.value))}
                                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-liceo-primary dark:accent-liceo-gold"
                                                    />
                                                    <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-1 px-1">
                                                        <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                                                    </div>
                                                </div>
                                                <span className="w-4 text-center text-xs font-black text-liceo-accent">
                                                    {(skills as any)[k]}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* CROPPING MODAL */}
            {imageSrc && (
                <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm p-4 md:p-10 animate-in fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold tracking-tight text-white">Ajustar Foto de Perfil</h2>
                        <button onClick={() => setImageSrc(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative flex-1 bg-black/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={handleCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 max-w-xl mx-auto w-full">
                        <div className="flex-1 w-full space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-white/50">Acercar/Alejar</label>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-liceo-primary"
                            />
                        </div>
                        <button
                            onClick={uploadCroppedImage}
                            disabled={uploadingImage}
                            className="w-full md:w-auto px-8 py-3.5 bg-liceo-primary hover:bg-liceo-primary/90 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                            {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {uploadingImage ? 'Guardando...' : 'Guardar y Recortar'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function Field({ label, name, value, isEditing, onChange, type = "text", step, placeholder }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</label>
            {isEditing ? (
                <input
                    type={type}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    step={step}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-[#0B1526]/50 text-sm focus:ring-2 focus:ring-liceo-accent outline-none font-medium text-gray-900 dark:text-white transition-all shadow-inner"
                />
            ) : (
                <div className="px-3 py-2 border border-transparent rounded-lg bg-transparent text-sm font-bold text-gray-800 dark:text-white">
                    {value ? value : '-'}
                </div>
            )}
        </div>
    )
}
