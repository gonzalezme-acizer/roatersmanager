'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChevronLeft, Save, Plus, X, Search, Settings, Loader2, CalendarDays, BookOpen, Clock, Users, Shield, CheckCircle2, UserCheck, MessageSquare, Mic, Droplet, Coffee, Share2, Copy, Youtube, Star, Trophy } from 'lucide-react'
import Link from 'next/link'
import { showSuccessToast, showErrorToast } from '@/utils/toast'

export default function EventDetailClient({ event, drills, initialSlots, initialAttendance, initialNotes, players, coaches, teams, currentUser }: any) {
    const supabase = createClient()

    const [activeTab, setActiveTab] = useState<'plan' | 'attendance' | 'notes'>(event.event_type === 'Partido' ? 'attendance' : 'plan')

    const [slots, setSlots] = useState<any[]>(initialSlots)
    const [isAddingSlot, setIsAddingSlot] = useState(false)
    const [slotToDelete, setSlotToDelete] = useState<string | null>(null)
    const [isSharing, setIsSharing] = useState(false)
    const [shareText, setShareText] = useState('')
    const [newSlot, setNewSlot] = useState({ slot_type: 'drill', drill_id: '', custom_title: 'Hidratación', duration_minutes: 15, division_criteria: '', coaches_assigned: [] as string[], teams_level_1: [] as string[], teams_level_2: [] as string[] })

    // Attendance State
    const [attendance, setAttendance] = useState<any[]>(initialAttendance)

    // Notes State
    const [notes, setNotes] = useState<any[]>(initialNotes)
    const [newNoteText, setNewNoteText] = useState('')
    const [isSavingNote, setIsSavingNote] = useState(false)

    // Awards State
    const [awards, setAwards] = useState<any>(event.match_awards || {})

    // UI Loading states
    const [loadingSlot, setLoadingSlot] = useState(false)

    const getYoutubeEmbedUrl = (url: string) => {
        if (!url) return null;
        try {
            let videoId = '';
            if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1].split(/[?#]/)[0];
            } else if (url.includes('youtube.com/watch')) {
                videoId = new URL(url).searchParams.get('v') || '';
            } else if (url.includes('youtube.com/embed/')) {
                videoId = url.split('youtube.com/embed/')[1].split(/[?#]/)[0];
            }
            return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        } catch (e) {
            return null;
        }
    }

    // --- PLANIFICACION --- //
    const handleAddSlot = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoadingSlot(true)
        const selectedDrill = drills.find((d: any) => d.id === newSlot.drill_id)

        const slotData: any = {
            event_id: event.id,
            slot_type: newSlot.slot_type,
            duration_minutes: newSlot.duration_minutes,
            division_criteria: newSlot.division_criteria,
            coaches_assigned: newSlot.coaches_assigned,
            order_index: slots.length
        }

        if (newSlot.slot_type === 'drill') {
            slotData.drill_id = newSlot.drill_id
            slotData.teams_level_1 = newSlot.teams_level_1
            slotData.teams_level_2 = newSlot.teams_level_2
        } else {
            slotData.custom_title = newSlot.custom_title
        }

        const { data, error } = await supabase.from('event_plan_slots').insert([slotData]).select('*, drills(*)')

        if (!error && data) {
            setSlots([...slots, data[0]])
            setIsAddingSlot(false)
            setNewSlot({ slot_type: 'drill', drill_id: '', custom_title: 'Hidratación', duration_minutes: 15, division_criteria: '', coaches_assigned: [], teams_level_1: [], teams_level_2: [] })
            showSuccessToast('Bloque Agregado', 'Añadido a la planificación con éxito.')
        } else {
            console.error('Insert slot error:', error, JSON.stringify(error))
            showErrorToast('Error', 'No se pudo agregar a la planificación.')
        }
        setLoadingSlot(false)
    }

    const handleDeleteSlot = (id: string) => {
        setSlotToDelete(id)
    }

    const confirmDeleteSlot = async () => {
        if (!slotToDelete) return
        await supabase.from('event_plan_slots').delete().eq('id', slotToDelete)
        setSlots(slots.filter(s => s.id !== slotToDelete))
        setSlotToDelete(null)
        showSuccessToast('Bloque Eliminado', 'Se quitó de la planificación.')
    }

    const toggleCoachForSlot = (coachId: string) => {
        setNewSlot(prev => {
            if (prev.coaches_assigned.includes(coachId)) return { ...prev, coaches_assigned: prev.coaches_assigned.filter(id => id !== coachId) }
            return { ...prev, coaches_assigned: [...prev.coaches_assigned, coachId] }
        })
    }

    const toggleTeamForLevel = (teamId: string, level: 1 | 2) => {
        setNewSlot(prev => {
            const listKey = level === 1 ? 'teams_level_1' : 'teams_level_2'
            const currentList = prev[listKey]
            if (currentList.includes(teamId)) {
                return { ...prev, [listKey]: currentList.filter(id => id !== teamId) }
            }
            return { ...prev, [listKey]: [...currentList, teamId] }
        })
    }

    // --- ASISTENCIA --- //
    const handleAttendance = async (playerId: string, statusText: string) => {
        // Find existing record
        const existing = attendance.find(a => a.player_id === playerId)

        if (existing) {
            // Update
            const { error } = await supabase.from('event_attendance').update({ status: statusText }).eq('id', existing.id)
            if (!error) {
                setAttendance(attendance.map(a => a.id === existing.id ? { ...existing, status: statusText } : a))
            }
        } else {
            // Insert
            const { data, error } = await supabase.from('event_attendance').insert([{
                event_id: event.id, player_id: playerId, status: statusText
            }]).select()
            if (!error && data) {
                setAttendance([...attendance, data[0]])
            }
        }
    }

    // --- AWARDS --- //
    const handleSaveAward = async (teamId: string, type: 'motm' | 'tryman', playerId: string) => {
        const newAwards = {
            ...awards,
            [teamId]: {
                ...awards[teamId],
                [type]: playerId
            }
        };
        setAwards(newAwards);

        // This will attempt to save if the column exists, we fail gracefully if it doesn't
        await supabase.from('events').update({ match_awards: newAwards }).eq('id', event.id);
        showSuccessToast('Premios Actualizados', 'Se ha guardado el jugador destacado.');
    }

    // --- NOTAS --- //
    const handleSaveNote = async () => {
        if (!newNoteText.trim()) return
        setIsSavingNote(true)

        const { data, error } = await supabase.from('event_notes').insert([{
            event_id: event.id,
            created_by: currentUser.id,
            content: newNoteText,
            note_type: 'manual'
        }]).select('*, profiles(full_name, image_url)')

        if (!error && data) {
            setNotes([data[0], ...notes])
            setNewNoteText('')
        } else {
            showErrorToast('Error', 'No se pudo guardar la nota.')
        }
        setIsSavingNote(false)
    }

    const handleShareWhatsApp = () => {
        let msg = ''
        if (event.event_type === 'Partido') {
            msg = `🏆 *PARTIDO: ${event.title}*\n`
            msg += `📅 ${new Date(event.event_date + 'T00:00:00').toLocaleDateString('es-AR')}\n`
            if (event.call_time) msg += `⏰ Citación: ${event.call_time.slice(0, 5)}hs\n`
            if (event.event_time) msg += `⏱️ Kick Off: ${event.event_time.slice(0, 5)}hs\n`
            if (event.location) msg += `📍 Lugar: ${event.location}\n\n`
            if (event.objectives) msg += `📝 Detalles: ${event.objectives}\n\n`
        } else {
            msg = `🏉 *ENTRENAMIENTO: ${event.title}*\n`
            msg += `📅 ${new Date(event.event_date + 'T00:00:00').toLocaleDateString('es-AR')} - ${event.event_time.slice(0, 5)}hs\n`
            if (event.location) msg += `📍 Lugar: ${event.location}\n`

            const totalDuration = slots.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0)
            msg += `⏱️ Duración total aprox: ${totalDuration} min\n\n`
            if (event.objectives) msg += `🎯 *Objetivos:* ${event.objectives}\n\n`
        }

        if (slots.length > 0) {
            msg += `📋 *PLANIFICACIÓN:*\n`
            slots.forEach((s, i) => {
                const isDrill = s.slot_type === 'drill' || !s.slot_type
                const icon = isDrill ? '🏃' : (s.slot_type === 'hydration' ? '💧' : '☕')
                const title = isDrill ? s.drills?.name : s.custom_title
                msg += `${i + 1}. ${icon} *${title}* (${s.duration_minutes}m)\n`

                if (isDrill) {
                    msg += `   🔸 N1: ${s.drills?.focus_level_1 || 'General'}\n`
                    msg += `   🔹 N2: ${s.drills?.focus_level_2 || 'General'}\n`

                    const coachesForSlot = (s.coaches_assigned || []).map((cid: string) => coaches.find((c: any) => c.id === cid)?.full_name).filter(Boolean)
                    if (coachesForSlot.length > 0) {
                        msg += `   🗣️ Coaches: ${coachesForSlot.join(', ')}\n`
                    }

                    if (s.drills?.youtube_link) {
                        msg += `   📺 Video: ${s.drills.youtube_link}\n`
                    }
                }
            })

            // Aggregating teams
            const level1Teams = new Set<string>()
            const level2Teams = new Set<string>()

            slots.forEach(s => {
                if (s.slot_type === 'drill' || !s.slot_type) {
                    (s.teams_level_1 || []).forEach((tId: string) => level1Teams.add(tId));
                    (s.teams_level_2 || []).forEach((tId: string) => level2Teams.add(tId));
                }
            })

            const level1TeamObjects = teams?.filter((t: any) => level1Teams.has(t.id)) || []
            const level2TeamObjects = teams?.filter((t: any) => level2Teams.has(t.id)) || []

            const playerIdsLevel1 = new Set<string>()
            level1TeamObjects.forEach((t: any) => {
                if (t.lineup) {
                    Object.values(t.lineup).forEach((pid: any) => playerIdsLevel1.add(pid))
                }
            })

            const playerIdsLevel2 = new Set<string>()
            level2TeamObjects.forEach((t: any) => {
                if (t.lineup) {
                    Object.values(t.lineup).forEach((pid: any) => playerIdsLevel2.add(pid))
                }
            })

            const level1Players = players.filter((p: any) => playerIdsLevel1.has(p.id))
            const level2Players = players.filter((p: any) => playerIdsLevel2.has(p.id))

            if (level1Teams.size > 0) {
                msg += `\n🔵 *ASIGNACIÓN NIVEL 1*\n`
                const assignedTeams1 = teams?.filter((t: any) => level1Teams.has(t.id)) || []
                if (assignedTeams1.length > 0) msg += `Equipos: ${assignedTeams1.map((t: any) => t.name).join(', ')}\n`

                if (level1Players.length > 0) {
                    level1Players.forEach((p: any) => {
                        msg += `  - ${p.last_name}, ${p.first_name}\n`
                    })
                } else {
                    msg += `  _(Aún no hay jugadores asignados a estos equipos)_\n`
                }
            }

            if (level2Teams.size > 0) {
                msg += `\n🟣 *ASIGNACIÓN NIVEL 2*\n`
                const assignedTeams2 = teams?.filter((t: any) => level2Teams.has(t.id)) || []
                if (assignedTeams2.length > 0) msg += `Equipos: ${assignedTeams2.map((t: any) => t.name).join(', ')}\n`

                if (level2Players.length > 0) {
                    level2Players.forEach((p: any) => {
                        msg += `  - ${p.last_name}, ${p.first_name}\n`
                    })
                } else {
                    msg += `  _(Aún no hay jugadores asignados a estos equipos)_\n`
                }
            }
        }

        setShareText(msg)
        setIsSharing(true)
    }

    const filteredPlayers = players.filter((p: any) => {
        if (event.event_type !== 'Partido' || !event.match_teams || event.match_teams.length === 0) {
            return true;
        }

        const isCalled = event.match_teams.some((teamId: string) => {
            const team = teams.find((t: any) => t.id === teamId);
            if (!team || !team.lineup) return false;
            return Object.values(team.lineup).includes(p.id);
        });
        return isCalled;
    });

    return (
        <div className="min-h-full bg-gray-50 dark:bg-[#0B1526] text-gray-900 dark:text-white flex flex-col font-sans">
            {/* Header */}
            <header className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#041221] shadow-sm flex-shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <Link href={event.event_type === 'Partido' ? '/dashboard/matches' : '/dashboard/training'} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors flex-shrink-0">
                        <ChevronLeft className="w-5 h-5 text-liceo-primary dark:text-[#5EE5F8]" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${event.status === 'Planeado' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                {event.status}
                            </span>
                            <span suppressHydrationWarning className="text-xs text-gray-500 dark:text-cyan-500/60 font-medium border-l border-gray-200 dark:border-white/10 pl-2">
                                {new Date(event.event_date + 'T00:00:00').toLocaleDateString('es-AR')}
                                {event.event_type === 'Partido' ? ` | Citación: ${event.call_time?.slice(0, 5) || '--:--'} - KO: ${event.event_time.slice(0, 5)}hs` : ` a las ${event.event_time.slice(0, 5)}hs`}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-widest text-liceo-primary dark:text-[#5EE5F8]">{event.title}</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1 font-medium max-w-lg">
                            {event.objectives}
                        </p>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex bg-white dark:bg-[#0A1628] border-b border-gray-200 dark:border-white/5 px-6">
                {event.event_type !== 'Partido' && (
                    <button onClick={() => setActiveTab('plan')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'plan' ? 'border-liceo-primary text-liceo-primary dark:border-[#5EE5F8] dark:text-[#5EE5F8]' : 'border-transparent text-gray-500 hover:text-gray-900 border-b-transparent dark:text-gray-400 dark:hover:text-white'}`}>
                        <BookOpen className="w-4 h-4" /> Planificación
                    </button>
                )}
                <button onClick={() => setActiveTab('attendance')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'attendance' ? 'border-liceo-primary text-liceo-primary dark:border-[#5EE5F8] dark:text-[#5EE5F8]' : 'border-transparent text-gray-500 hover:text-gray-900 border-b-transparent dark:text-gray-400 dark:hover:text-white'}`}>
                    <UserCheck className="w-4 h-4" /> Asistencia y Evaluaciones
                </button>
                <button onClick={() => setActiveTab('notes')} className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'notes' ? 'border-liceo-primary text-liceo-primary dark:border-[#5EE5F8] dark:text-[#5EE5F8]' : 'border-transparent text-gray-500 hover:text-gray-900 border-b-transparent dark:text-gray-400 dark:hover:text-white'}`}>
                    <MessageSquare className="w-4 h-4" /> Libreta / Notas
                </button>
            </div>

            <div className="flex-1 overflow-auto p-6 md:p-8 relative w-full max-w-6xl mx-auto space-y-6">

                {/* --- PLANIFICACION TAB --- */}
                {activeTab === 'plan' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Bloques de Entrenamiento</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Duración Total Estimada: {slots.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0)} min</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleShareWhatsApp} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-md">
                                    <Share2 className="w-4 h-4" /> Enviar por WhatsApp
                                </button>
                                <button onClick={() => setIsAddingSlot(true)} className="bg-liceo-primary hover:bg-liceo-primary/90 text-white dark:bg-[#5EE5F8] dark:hover:bg-[#4bc8da] dark:text-[#061B30] px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-md">
                                    <Plus className="w-4 h-4" /> Agregar Drill
                                </button>
                            </div>
                        </div>

                        {slots.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-3xl">
                                <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-500">Planificación Vacía</h3>
                                <p className="text-sm text-gray-400">Carga ejercicios de tu librería para armar el día.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {slots.map((s, idx) => {
                                    const isDrill = s.slot_type === 'drill' || !s.slot_type; // Fallback for old ones
                                    return (
                                        <div key={s.id} className={`border rounded-2xl p-5 shadow-sm flex items-start gap-4 flex-col md:flex-row relative group transition-colors ${!isDrill ? 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-100 dark:border-blue-500/10' : 'bg-white dark:bg-[#102035] border-gray-200 dark:border-white/10'}`}>
                                            <button onClick={() => handleDeleteSlot(s.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-500 bg-red-50 hover:bg-red-100 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity dark:bg-red-500/10 z-10">
                                                <X className="w-4 h-4" />
                                            </button>

                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 shadow-sm ${!isDrill ? 'bg-blue-100 text-blue-500 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-liceo-primary/10 dark:bg-[#5EE5F8]/10 text-liceo-primary dark:text-[#5EE5F8]'}`}>
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 w-full">
                                                <div className="flex items-center gap-3 mb-1">
                                                    {!isDrill && s.slot_type === 'hydration' && <Droplet className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
                                                    {!isDrill && s.slot_type === 'rest' && <Coffee className="w-5 h-5 text-amber-500 dark:text-amber-400" />}
                                                    <h3 className="font-black text-gray-900 dark:text-white text-lg">{isDrill ? s.drills?.name : s.custom_title}</h3>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${!isDrill ? 'text-blue-600 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300' : 'text-gray-500 bg-gray-100 dark:bg-white/5'}`}><Clock className="w-3 h-3" /> {s.duration_minutes}m</span>
                                                </div>

                                                {isDrill && (
                                                    <>
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{s.drills?.description}</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-black/20 p-4 rounded-xl">
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Focos de Nivel</p>
                                                                <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-3">
                                                                    <li>
                                                                        <strong className="text-blue-500 block mb-1">N1: {s.drills?.focus_level_1 || 'General'}</strong>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(s.teams_level_1 || []).map((tId: string) => {
                                                                                const t = teams?.find((x: any) => x.id === tId)
                                                                                return t ? <span key={tId} className="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{t.name}</span> : null
                                                                            })}
                                                                            {!(s.teams_level_1?.length > 0) && <span className="text-[10px] text-gray-400 italic">Todos</span>}
                                                                        </div>
                                                                    </li>
                                                                    <li>
                                                                        <strong className="text-purple-500 block mb-1">N2: {s.drills?.focus_level_2 || 'General'}</strong>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {(s.teams_level_2 || []).map((tId: string) => {
                                                                                const t = teams?.find((x: any) => x.id === tId)
                                                                                return t ? <span key={tId} className="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{t.name}</span> : null
                                                                            })}
                                                                            {!(s.teams_level_2?.length > 0) && <span className="text-[10px] text-gray-400 italic">Todos</span>}
                                                                        </div>
                                                                    </li>
                                                                </ul>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">Organización / Coaches</p>
                                                                <p className="text-xs text-gray-700 dark:text-gray-300 mb-1"><strong className="text-gray-900 dark:text-white">División:</strong> {s.division_criteria || 'Todo el plantel junto'}</p>
                                                                <div className="flex gap-1 flex-wrap mt-2">
                                                                    {(s.coaches_assigned || []).map((cId: string) => {
                                                                        const c = coaches.find((x: any) => x.id === cId)
                                                                        if (!c) return null
                                                                        return <span key={cId} className="bg-liceo-primary text-white dark:bg-[#164E87] text-[9px] font-bold px-2 py-0.5 rounded-full">{c.full_name}</span>
                                                                    })}
                                                                </div>

                                                                {s.drills?.youtube_link && (
                                                                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-white/10">
                                                                        <p className="text-[10px] font-bold uppercase text-red-500 mb-2 flex items-center gap-1"><Youtube className="w-3 h-3" /> Material de Apoyo (Video)</p>
                                                                        {(() => {
                                                                            const embedUrl = getYoutubeEmbedUrl(s.drills.youtube_link);
                                                                            return embedUrl ? (
                                                                                <div className="aspect-video w-full rounded-xl overflow-hidden shadow-md border border-gray-200 dark:border-white/10 bg-black">
                                                                                    <iframe src={embedUrl} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                                                                                </div>
                                                                            ) : (
                                                                                <a href={s.drills.youtube_link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors">
                                                                                    <Youtube className="w-4 h-4" /> Abrir en YouTube
                                                                                </a>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* --- ASISTENCIA TAB --- */}
                {activeTab === 'attendance' && (
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/5 text-sm font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                            <span>{event.event_type === 'Partido' ? 'Jugadores Convocados' : 'Lista Oficial de Plantel Activo'}</span>
                            <span className="text-xs bg-gray-100 dark:bg-black/50 px-3 py-1 rounded-full">{filteredPlayers.length} Jugadores</span>
                        </div>

                        <div className="bg-white dark:bg-[#102035] border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 dark:bg-[#0A1628] uppercase text-[10px] font-bold tracking-widest text-gray-500 border-b border-gray-200 dark:border-white/10">
                                    <tr>
                                        <th className="px-6 py-4">Jugador</th>
                                        <th className="px-6 py-4">Posición</th>
                                        <th className="px-6 py-4 text-center">Estado Asistencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {filteredPlayers.map((p: any) => {
                                        const record = attendance.find(a => a.player_id === p.id)
                                        const currentStatus = record?.status || 'Pendiente'

                                        return (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-3 font-bold text-gray-900 dark:text-white">
                                                    {p.last_name}, {p.first_name}
                                                </td>
                                                <td className="px-6 py-3 text-xs font-semibold text-gray-500">
                                                    {p.position || 'Sin Pos'}
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleAttendance(p.id, 'Presente')}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentStatus === 'Presente' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'}`}
                                                        >
                                                            Presente
                                                        </button>
                                                        <button
                                                            onClick={() => handleAttendance(p.id, 'Ausente')}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentStatus === 'Ausente' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'}`}
                                                        >
                                                            Ausente
                                                        </button>
                                                        <button
                                                            onClick={() => handleAttendance(p.id, 'Tarde')}
                                                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${currentStatus === 'Tarde' ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10'}`}
                                                        >
                                                            Tarde
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* --- PREMIOS DEL PARTIDO --- */}
                        {event.event_type === 'Partido' && event.match_teams?.length > 0 && (
                            <div className="mt-8 space-y-4">
                                <h3 className="font-black text-lg text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-500" />
                                    Destacados del Partido por Equipo
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {event.match_teams.map((teamId: string) => {
                                        const team = teams.find((t: any) => t.id === teamId);
                                        if (!team) return null;

                                        const teamPlayerIds = Object.values(team.lineup || {});
                                        const teamPlayersList = players.filter((p: any) => teamPlayerIds.includes(p.id));

                                        return (
                                            <div key={teamId} className="bg-white dark:bg-[#102035] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
                                                <h4 className="font-bold text-liceo-primary dark:text-[#5EE5F8] border-b border-gray-100 dark:border-white/5 pb-2 mb-4">{team.name}</h4>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5 mb-1.5">
                                                            <Star className="w-3 h-3 text-yellow-500" /> Jugador de la Fecha
                                                        </label>
                                                        <select
                                                            value={awards[teamId]?.motm || ''}
                                                            onChange={(e) => handleSaveAward(teamId, 'motm', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-liceo-primary text-sm font-semibold dark:text-white"
                                                        >
                                                            <option value="">Seleccionar Jugador...</option>
                                                            {teamPlayersList.map((p: any) => (
                                                                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5 mb-1.5">
                                                            <Trophy className="w-3 h-3 text-orange-500" /> Tryman
                                                        </label>
                                                        <select
                                                            value={awards[teamId]?.tryman || ''}
                                                            onChange={(e) => handleSaveAward(teamId, 'tryman', e.target.value)}
                                                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-liceo-primary text-sm font-semibold dark:text-white"
                                                        >
                                                            <option value="">Seleccionar Jugador...</option>
                                                            {teamPlayersList.map((p: any) => (
                                                                <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- NOTAS TAB --- */}
                {activeTab === 'notes' && (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        <div className="bg-white dark:bg-[#102035] rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-white/10">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-4 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-liceo-primary dark:text-[#5EE5F8]" />
                                Sumar Nota o Reporte al Evento
                            </h3>
                            <textarea
                                value={newNoteText}
                                onChange={(e) => setNewNoteText(e.target.value)}
                                placeholder="Escribe observaciones sobre el entrenamiento, lesiones detectadas, o rendimiento..."
                                className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-liceo-primary text-sm dark:text-white"
                            ></textarea>
                            <div className="flex justify-between items-center mt-4">
                                <button className="flex items-center gap-2 text-xs font-bold text-liceo-primary dark:text-[#5EE5F8] hover:opacity-80 transition-opacity bg-liceo-primary/10 dark:bg-[#5EE5F8]/10 px-3 py-2 rounded-lg">
                                    <Mic className="w-4 h-4" /> Activar Dictado IA (Pronto)
                                </button>
                                <button
                                    onClick={handleSaveNote}
                                    disabled={!newNoteText.trim() || isSavingNote}
                                    className="bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    Guardar Nota
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {notes.map(note => (
                                <div key={note.id} className="bg-white dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 flex gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-black/50 overflow-hidden flex-shrink-0">
                                        {note.profiles?.image_url ? (
                                            <img src={note.profiles?.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center font-black text-gray-400">{note.profiles?.full_name?.charAt(0) || 'U'}</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-sm text-gray-900 dark:text-white">{note.profiles?.full_name || 'Usuario'}</span>
                                            <span suppressHydrationWarning className="text-[10px] text-gray-400 font-medium"> • {new Date(note.created_at).toLocaleString('es-AR')}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ADD SLOT MODAL */}
            {isAddingSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#0B1526] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><BookOpen className="w-6 h-6 text-liceo-primary dark:text-[#5EE5F8]" /> Vincular Bloque</h2>
                            <button onClick={() => setIsAddingSlot(false)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full"><X className="w-5 h-5 dark:text-white" /></button>
                        </div>

                        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-white/5 p-1.5 rounded-xl text-sm font-bold">
                            <button onClick={() => setNewSlot({ ...newSlot, slot_type: 'drill', duration_minutes: 15 })} className={`flex-1 py-2 rounded-lg transition-all ${newSlot.slot_type === 'drill' ? 'bg-white dark:bg-[#0B1526] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}>Drill</button>
                            <button onClick={() => setNewSlot({ ...newSlot, slot_type: 'hydration', custom_title: 'Hidratación', duration_minutes: 5, drill_id: '' })} className={`flex-1 py-2 rounded-lg transition-all flex justify-center items-center gap-1.5 ${newSlot.slot_type === 'hydration' ? 'bg-white dark:bg-[#0B1526] text-blue-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}><Droplet className="w-4 h-4" /> Agua</button>
                            <button onClick={() => setNewSlot({ ...newSlot, slot_type: 'rest', custom_title: 'Descanso', duration_minutes: 10, drill_id: '' })} className={`flex-1 py-2 rounded-lg transition-all flex justify-center items-center gap-1.5 ${newSlot.slot_type === 'rest' ? 'bg-white dark:bg-[#0B1526] text-amber-500 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'}`}><Coffee className="w-4 h-4" /> Libre</button>
                        </div>

                        <form onSubmit={handleAddSlot} className="space-y-4">

                            {newSlot.slot_type === 'drill' ? (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Seleccionar Módulo (Librería)</label>
                                    <select
                                        required
                                        value={newSlot.drill_id}
                                        onChange={e => {
                                            const d = drills.find((x: any) => x.id === e.target.value)
                                            if (d) {
                                                setNewSlot({ ...newSlot, drill_id: d.id, duration_minutes: d.duration_minutes })
                                            }
                                        }}
                                        className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold"
                                    >
                                        <option value="" disabled>Elegir ejercicio...</option>
                                        {drills.map((d: any) => (
                                            <option key={d.id} value={d.id}>{d.name} ({d.duration_minutes}m)</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Título Personalizado</label>
                                    <input required value={newSlot.custom_title} onChange={e => setNewSlot({ ...newSlot, custom_title: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-bold" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Duración Efectiva (min)</label>
                                    <input type="number" required value={newSlot.duration_minutes} onChange={e => setNewSlot({ ...newSlot, duration_minutes: parseInt(e.target.value) })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                </div>
                                {newSlot.slot_type === 'drill' && (
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Estrategia División Niveles</label>
                                        <input value={newSlot.division_criteria} onChange={e => setNewSlot({ ...newSlot, division_criteria: e.target.value })} placeholder="Ej: Fw separados por nivel" className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white text-sm" />
                                    </div>
                                )}
                            </div>

                            {newSlot.slot_type === 'drill' && (
                                <>
                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2 block">Asignar Equipos a Nivel 1</label>
                                        <div className="flex flex-wrap gap-2">
                                            {teams?.map((t: any) => (
                                                <button
                                                    key={`l1-${t.id}`}
                                                    type="button"
                                                    onClick={() => toggleTeamForLevel(t.id, 1)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${newSlot.teams_level_1.includes(t.id) ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="pb-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-2 block">Asignar Equipos a Nivel 2</label>
                                        <div className="flex flex-wrap gap-2">
                                            {teams?.map((t: any) => (
                                                <button
                                                    key={`l2-${t.id}`}
                                                    type="button"
                                                    onClick={() => toggleTeamForLevel(t.id, 2)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${newSlot.teams_level_2.includes(t.id) ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                                >
                                                    {t.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Asignar Coaches a Cargo</label>
                                        <div className="flex flex-wrap gap-2">
                                            {coaches.map((c: any) => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => toggleCoachForSlot(c.id)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${newSlot.coaches_assigned.includes(c.id) ? 'bg-liceo-primary text-white border-liceo-primary shadow-sm dark:bg-[#5EE5F8] dark:text-[#061B30] dark:border-[#5EE5F8]' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                                >
                                                    {c.full_name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            <button type="submit" disabled={loadingSlot || (newSlot.slot_type === 'drill' && !newSlot.drill_id)} className="w-full mt-6 py-3 rounded-xl font-bold bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50">
                                {loadingSlot ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Vincular a Planificación'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE SLOT MODAL */}
            {slotToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#0B1526] w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <X className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black dark:text-white mb-2">¿Eliminar Bloque?</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Esta acción quitará el bloque de la planificación actual. No se puede deshacer.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setSlotToDelete(null)} className="flex-1 py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={confirmDeleteSlot} className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SHARE MODAL */}
            {isSharing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#0B1526] w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black dark:text-white flex items-center gap-2"><Share2 className="w-5 h-5 text-green-500" /> Compartir Planificación</h2>
                            <button onClick={() => setIsSharing(false)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full"><X className="w-5 h-5 dark:text-white" /></button>
                        </div>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Revisá y editá el mensaje antes de enviarlo por WhatsApp o compartirlo con el staff.</p>

                        <textarea
                            value={shareText}
                            onChange={(e) => setShareText(e.target.value)}
                            className="flex-1 w-full min-h-[300px] p-4 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-gray-200 resize-none font-mono"
                        />

                        <div className="mt-6 flex flex-col md:flex-row gap-3">
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(shareText)
                                    showSuccessToast('Copiado', 'Mensaje copiado al portapapeles')
                                }}
                                className="flex-1 py-3 focus:outline-none rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
                            >
                                <Copy className="w-4 h-4" /> Copiar Texto
                            </button>
                            <button
                                onClick={() => {
                                    const encodedMsg = encodeURIComponent(shareText)
                                    window.open(`https://wa.me/?text=${encodedMsg}`, '_blank')
                                }}
                                className="flex-1 py-3 focus:outline-none rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" /> Ir a WhatsApp Web
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
