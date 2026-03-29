'use client'

import { useState } from 'react'
import { Plus, Database, CalendarDays, BookOpen, AlertCircle, X, Loader2, ArrowRight, Shield, Clock, ExternalLink, Edit2, Trash2, MapPin, Globe, Trophy, LayoutGrid, List, MessageCircle, UserCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import { useLang } from '@/components/lang-provider'
import Link from 'next/link'

export default function MatchesClient({ initialEvents, initialClubs, coaches, teams, needsSetup }: { initialEvents: any[], initialClubs: any[], coaches: any[], teams: any[], needsSetup: boolean }) {
    const supabase = createClient()
    const [events, setEvents] = useState(initialEvents)
    const [clubs, setClubs] = useState(initialClubs)
    const [viewMode, setViewMode] = useState<'events' | 'clubs'>('events')
    const [eventsLayout, setEventsLayout] = useState<'grid' | 'list'>('grid')
    const [clubsLayout, setClubsLayout] = useState<'grid' | 'list'>('grid')
    const { t } = useLang()

    // Modals
    const [isCreatingEvent, setIsCreatingEvent] = useState(false)
    const [editingEventId, setEditingEventId] = useState<string | null>(null)
    const [isCreatingClub, setIsCreatingClub] = useState(false)
    const [editingClubId, setEditingClubId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Form states
    const [newEvent, setNewEvent] = useState({ title: '', event_date: '', event_time: '', call_time: '', location: '', objectives: '', match_opponents: [] as string[], match_teams: [] as string[], match_team_coaches: {} as Record<string, string[]>, is_home: false })
    const [newClub, setNewClub] = useState({ name: '', website_url: '', address: '', logo_url: '', contacts: [] as { name: string, last_name: string, division: string, phone: string | number }[] })

    if (needsSetup) {
        return (
            <div className="p-6 md:p-10 min-h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] flex items-center justify-center">
                <div className="bg-white dark:bg-[#0B1526] p-8 rounded-3xl shadow-xl max-w-xl text-center border border-gray-200 dark:border-white/10">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Database className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black mb-4 dark:text-white">Se Requiere Actualización de Base de Datos</h2>
                    <p className="text-gray-500 mb-6">Parece que aún no corriste el script SQL para habilitar la funcionalidad de Partidos y Clubes.</p>
                    <p className="bg-gray-100 dark:bg-white/5 p-4 rounded-xl text-red-500 font-mono text-sm mb-6 font-bold">Por favor copiá y ejecutá el contenido del archivo `alter_matches.sql` en la consola SQL de Supabase.</p>
                    <button onClick={() => window.location.reload()} className="bg-liceo-primary text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:opacity-90">
                        Recargar Página una vez ejecutado
                    </button>
                </div>
            </div>
        )
    }

    const handleSaveClub = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        if (editingClubId) {
            const { data, error } = await supabase.from('clubs').update(newClub).eq('id', editingClubId).select()
            if (!error && data) {
                setClubs(clubs.map((c: any) => c.id === editingClubId ? data[0] : c))
                closeClubModal()
                showSuccessToast('Club Actualizado', 'La información del club fue modificada con éxito.')
            } else {
                console.error(error)
                showErrorToast('Error', 'No se pudo actualizar el club.')
            }
        } else {
            const { data, error } = await supabase.from('clubs').insert([newClub]).select()
            if (!error && data) {
                setClubs([...clubs, data[0]])
                closeClubModal()
                showSuccessToast('Club Guardado', 'El club rival se guardó en la base de datos.')
            } else {
                console.error(error)
                showErrorToast('Error', 'No se pudo crear el club rival.')
            }
        }
        setLoading(false)
    }

    const openEditClub = (club: any) => {
        setNewClub({
            name: club.name,
            website_url: club.website_url || '',
            address: club.address || '',
            logo_url: club.logo_url || '',
            contacts: club.contacts || []
        })
        setEditingClubId(club.id)
        setIsCreatingClub(true)
    }

    const closeClubModal = () => {
        setIsCreatingClub(false)
        setEditingClubId(null)
        setNewClub({ name: '', website_url: '', address: '', logo_url: '', contacts: [] })
    }

    const openEditEvent = (ev: any) => {
        const isHome = ev.location?.includes('Liceo') || false;
        setNewEvent({
            title: ev.title,
            event_date: ev.event_date,
            event_time: ev.event_time,
            call_time: ev.call_time || '',
            location: ev.location || '',
            objectives: ev.objectives || '',
            match_opponents: ev.match_opponents || [],
            match_teams: ev.match_teams || [],
            match_team_coaches: ev.match_coaches || {},
            is_home: isHome
        })
        setEditingEventId(ev.id)
        setIsCreatingEvent(true)
    }

    const closeEventModal = () => {
        setIsCreatingEvent(false)
        setEditingEventId(null)
        setNewEvent({ title: '', event_date: '', event_time: '', call_time: '', location: '', objectives: '', match_opponents: [], match_teams: [], match_team_coaches: {}, is_home: false })
    }

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const firstOpponent = clubs.find(c => c.id === newEvent.match_opponents[0])
        const opponentsNames = newEvent.match_opponents.map(id => clubs.find(c => c.id === id)?.name).filter(Boolean).join(' y ')

        const eventPayload = {
            title: `vs ${opponentsNames || 'Rival'}`,
            event_type: 'Partido',
            event_date: newEvent.event_date,
            event_time: newEvent.event_time,
            call_time: newEvent.call_time,
            location: newEvent.is_home ? (newEvent.location || 'Liceo Naval') : (newEvent.location || firstOpponent?.address || null),
            objectives: newEvent.objectives,
            opponent_id: newEvent.match_opponents[0] || null,
            match_opponents: newEvent.match_opponents,
            match_teams: newEvent.match_teams,
            match_coaches: newEvent.match_team_coaches, // Save as object/record mapping teamId -> coachIds
            status: 'Planeado'
        }

        if (editingEventId) {
            const updatePayload = { ...eventPayload }
            delete (updatePayload as any).status // Don't overwrite status on edit

            const { data, error } = await supabase.from('events').update(updatePayload).eq('id', editingEventId).select('*, clubs(*)')
            if (!error && data) {
                setEvents(events.map((ev: any) => ev.id === editingEventId ? data[0] : ev))
                closeEventModal()
                showSuccessToast('Partido Actualizado', 'Los datos del partido fueron modificados con éxito.')
            } else {
                console.error(error)
                showErrorToast('Error', 'No se pudo actualizar el partido.')
            }
        } else {
            const { data, error } = await supabase.from('events').insert([eventPayload]).select('*, clubs(*)')
            if (!error && data) {
                setEvents([data[0], ...events])
                closeEventModal()
                showSuccessToast('Partido Agendado', 'El partido se creó en el calendario.')
            } else {
                console.error(error)
                showErrorToast('Error', 'No se pudo agendar el partido. Verifique que actualizó la BD.')
            }
        }
        setLoading(false)
    }

    const toggleMatchOpponent = (clubId: string) => {
        setNewEvent(prev => ({
            ...prev,
            match_opponents: prev.match_opponents.includes(clubId)
                ? prev.match_opponents.filter(id => id !== clubId)
                : [...prev.match_opponents, clubId]
        }))
    }

    const addClubContact = () => {
        setNewClub(prev => ({
            ...prev,
            contacts: [...prev.contacts, { name: '', last_name: '', division: '', phone: '' }]
        }))
    }

    const removeClubContact = (index: number) => {
        setNewClub(prev => ({
            ...prev,
            contacts: prev.contacts.filter((_, i) => i !== index)
        }))
    }

    const updateClubContact = (index: number, field: string, value: string) => {
        setNewClub(prev => ({
            ...prev,
            contacts: prev.contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
        }))
    }

    const toggleMatchTeam = (teamId: string) => {
        setNewEvent(prev => ({
            ...prev,
            match_teams: prev.match_teams.includes(teamId)
                ? prev.match_teams.filter(id => id !== teamId)
                : [...prev.match_teams, teamId]
        }))
    }

    const toggleMatchTeamCoach = (teamId: string, coachId: string) => {
        setNewEvent(prev => {
            const teamCoaches = prev.match_team_coaches[teamId] || []
            const newTeamCoaches = teamCoaches.includes(coachId)
                ? teamCoaches.filter(id => id !== coachId)
                : [...teamCoaches, coachId]

            return {
                ...prev,
                match_team_coaches: {
                    ...prev.match_team_coaches,
                    [teamId]: newTeamCoaches
                }
            }
        })
    }

    const copyWhatsAppMessage = (ev: any) => {
        const oppNames = ev.match_opponents?.map((id: string) => clubs.find((c: any) => c.id === id)?.name).filter(Boolean) || [ev.clubs?.name || 'Rival'];
        const opponentsText = oppNames.join(' y ');
        const dateStr = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('es-AR');
        let msg = `🏉 *CONVOCATORIA PARTIDO*\n\n`;
        msg += `🏆 *vs ${opponentsText}*\n`;
        msg += `📅 Fecha: ${dateStr}\n`;
        msg += `⏰ Citación: ${ev.call_time?.slice(0, 5) || '--:--'}hs\n`;
        msg += `⏱️ Kick Off: ${ev.event_time?.slice(0, 5)}hs\n`;

        const locationName = ev.location || ev.clubs?.address;
        if (locationName) {
            msg += `📍 Lugar: ${locationName}`;
            const searchLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`;
            msg += `\n🗺️ Mapa: ${searchLink}\n`;
        }

        if (ev.objectives) {
            msg += `\n📝 Notas:\n${ev.objectives}\n`;
        }

        navigator.clipboard.writeText(msg);
        showSuccessToast('Copiado', 'Mensaje de WhatsApp copiado al portapapeles');
    }

    return (
        <div className="p-6 md:p-10 min-h-full flex flex-col items-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-50 to-white dark:from-[#0B1526] dark:to-[#040A14] font-sans">
            <div className="w-full max-w-7xl mx-auto space-y-8">

                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-liceo-primary to-liceo-accent dark:from-white dark:to-liceo-accent mb-2 flex items-center gap-3">
                            <Trophy className="w-10 h-10 text-liceo-primary dark:text-liceo-gold hidden md:block" /> {t.matches.title}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">{t.matches.subtitle}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl shadow-inner border border-gray-200 dark:border-white/10 w-full sm:w-auto self-start sm:self-auto">
                            <button onClick={() => viewMode === 'events' ? setEventsLayout('grid') : setClubsLayout('grid')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${(viewMode === 'events' ? eventsLayout : clubsLayout) === 'grid' ? 'bg-white dark:bg-[#0B1526] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button onClick={() => viewMode === 'events' ? setEventsLayout('list') : setClubsLayout('list')} className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${(viewMode === 'events' ? eventsLayout : clubsLayout) === 'list' ? 'bg-white dark:bg-[#0B1526] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                <List className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl shadow-inner border border-gray-200 dark:border-white/10 w-full md:w-auto">
                            <button onClick={() => setViewMode('events')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'events' ? 'bg-white dark:bg-[#111f38] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                <CalendarDays className="w-4 h-4" /> {t.matches.calendar}
                            </button>
                            <button onClick={() => setViewMode('clubs')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${viewMode === 'clubs' ? 'bg-white dark:bg-[#111f38] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>
                                <Shield className="w-4 h-4" /> {t.matches.clubs}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {viewMode === 'events' ? (
                            <button onClick={() => setIsCreatingEvent(true)} className="flex-1 md:flex-none bg-liceo-primary hover:bg-liceo-primary/90 dark:bg-liceo-gold dark:hover:bg-yellow-400 text-white dark:text-[#0B1526] px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg dark:shadow-[0_4px_20px_rgba(255,217,0,0.3)]">
                                <Plus className="w-5 h-5" /> {t.matches.scheduleMatch}
                            </button>
                        ) : (
                            <button onClick={() => setIsCreatingClub(true)} className="flex-1 md:flex-none bg-liceo-primary hover:bg-liceo-primary/90 dark:bg-[#5EE5F8] dark:hover:bg-[#4bc8da] text-white dark:text-[#061B30] px-5 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg">
                                <Plus className="w-5 h-5" /> {t.matches.addClub}
                            </button>
                        )}
                    </div>
                </header>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-white/10 to-transparent"></div>

                {/* CREATE EVENT MODAL */}
                {isCreatingEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto pt-24 pb-12">
                        <div className="bg-white dark:bg-[#0B1526] w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 my-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><Trophy className="w-6 h-6 text-liceo-primary dark:text-[#5EE5F8]" /> {editingEventId ? 'Editar Partido' : 'Nuevo Partido'}</h2>
                                <button onClick={closeEventModal} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full"><X className="w-5 h-5 dark:text-white" /></button>
                            </div>
                            <form onSubmit={handleSaveEvent} className="space-y-4">
                                <div className="flex gap-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 w-fit mb-2">
                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, is_home: true })} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${newEvent.is_home ? 'bg-white dark:bg-[#0B1526] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>Local</button>
                                    <button type="button" onClick={() => setNewEvent({ ...newEvent, is_home: false })} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!newEvent.is_home ? 'bg-white dark:bg-[#0B1526] text-liceo-primary dark:text-[#5EE5F8] shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}>Visitante</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-rose-500 mb-2 block">{newEvent.is_home ? 'Clubes Rivales' : 'Clubes Rivales (El primero en seleccionar será la Sede)'}</label>
                                        <div className="flex flex-wrap gap-2">
                                            {clubs?.map((c: any) => {
                                                const isSelected = newEvent.match_opponents.includes(c.id)
                                                const isSede = !newEvent.is_home && newEvent.match_opponents[0] === c.id
                                                return (
                                                    <button
                                                        key={`opponent-${c.id}`}
                                                        type="button"
                                                        onClick={() => toggleMatchOpponent(c.id)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${isSelected ? 'bg-rose-500 text-white border-rose-500 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                                    >
                                                        {c.name} {isSede && <span className="text-[9px] bg-white text-rose-500 px-1.5 rounded-full ml-1">Sede</span>}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Fecha del Partido</label>
                                        <input type="date" required value={newEvent.event_date} onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 text-orange-500">Horario Citación</label>
                                        <input type="time" required value={newEvent.call_time} onChange={e => setNewEvent({ ...newEvent, call_time: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-green-500">Horario Kick Off</label>
                                        <input type="time" required value={newEvent.event_time} onChange={e => setNewEvent({ ...newEvent, event_time: e.target.value })} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Sede / Ubicación {newEvent.is_home ? '(Automático: Liceo Naval)' : '(Opcional, sino usa del club)'}</label>
                                    <input value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder={newEvent.is_home ? "Ej: Anexo Campo Deportes (por defecto Liceo Naval)" : "Ej: Anexo Campo Deportes"} className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Anotaciones / Instrucciones</label>
                                    <textarea value={newEvent.objectives} onChange={e => setNewEvent({ ...newEvent, objectives: e.target.value })} placeholder="Llevar camiseta suplente y viandas..." className="w-full mt-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white min-h-[60px]" />
                                </div>

                                <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2 block">Equipos Convocados</label>
                                    <div className="flex flex-wrap gap-2">
                                        {teams?.map((t: any) => (
                                            <button
                                                key={`team-${t.id}`}
                                                type="button"
                                                onClick={() => toggleMatchTeam(t.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${newEvent.match_teams.includes(t.id) ? 'bg-blue-500 text-white border-blue-500 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                            >
                                                {t.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newEvent.match_teams.length > 0 && (
                                    <div className="pt-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-2 block">Asignación de Entrenadores</label>
                                        <div className="space-y-4">
                                            {newEvent.match_teams.map(teamId => {
                                                const team = teams?.find((t: any) => t.id === teamId)
                                                const teamCoaches = newEvent.match_team_coaches[teamId] || []
                                                return (
                                                    <div key={`assign-${teamId}`} className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-200 dark:border-white/10">
                                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Entrenadores para {team?.name} <span className="font-normal text-[10px] text-gray-500">(El primero es el Principal)</span></p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {coaches?.map((c: any) => {
                                                                const isAssigned = teamCoaches.includes(c.id)
                                                                const isMainCoach = teamCoaches[0] === c.id
                                                                return (
                                                                    <button
                                                                        key={`coach-${teamId}-${c.id}`}
                                                                        type="button"
                                                                        onClick={() => toggleMatchTeamCoach(teamId, c.id)}
                                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1 ${isAssigned ? 'bg-purple-500 text-white border-purple-500 shadow-sm' : 'bg-transparent text-gray-500 border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5'}`}
                                                                    >
                                                                        {c.full_name} {isMainCoach && <span className="text-[9px] bg-white text-purple-500 px-1.5 rounded-full ml-1">Principal</span>}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="w-full mt-6 py-3 rounded-xl font-bold bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] hover:opacity-90 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingEventId ? 'Guardar Cambios' : 'Confirmar Evento'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
                }

                {/* CREATE CLUB MODAL */}
                {
                    isCreatingClub && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="bg-white dark:bg-[#0B1526] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-white/10 animate-in fade-in zoom-in-95 my-auto">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-black dark:text-white flex items-center gap-2"><Shield className="w-6 h-6 text-liceo-primary dark:text-[#5EE5F8]" /> {editingClubId ? 'Editar Club' : 'Nuevo Club Rival'}</h2>
                                    <button onClick={closeClubModal} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full"><X className="w-5 h-5 dark:text-white" /></button>
                                </div>
                                <form onSubmit={handleSaveClub} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Nombre del Club</label>
                                        <input required value={newClub.name} onChange={e => setNewClub({ ...newClub, name: e.target.value })} placeholder="Ej. CUBA" className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Logo (URL de Internet)</label>
                                        <input value={newClub.logo_url} onChange={e => setNewClub({ ...newClub, logo_url: e.target.value })} placeholder="https://ejemplo.com/logo.png" className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dirección</label>
                                            <input value={newClub.address} onChange={e => setNewClub({ ...newClub, address: e.target.value })} placeholder="Villa de Mayo" className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Página Web</label>
                                            <input value={newClub.website_url} onChange={e => setNewClub({ ...newClub, website_url: e.target.value })} placeholder="https://..." className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-liceo-accent dark:text-white font-bold" />
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Contactos del Club</label>
                                            <button type="button" onClick={addClubContact} className="text-xs font-bold text-liceo-primary dark:text-[#5EE5F8] flex items-center gap-1 hover:underline">
                                                <Plus className="w-3 h-3" /> Agregar Contacto
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {newClub.contacts.map((contact, idx) => (
                                                <div key={`contact-${idx}`} className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-200 dark:border-white/10 relative group/contact">
                                                    <button type="button" onClick={() => removeClubContact(idx)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/contact:opacity-100 transition-opacity">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[9px] font-bold uppercase text-gray-400">Nombre</label>
                                                            <input required value={contact.name} onChange={e => updateClubContact(idx, 'name', e.target.value)} placeholder="Nombre" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111f38] text-xs font-bold dark:text-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold uppercase text-gray-400">Apellido</label>
                                                            <input required value={contact.last_name} onChange={e => updateClubContact(idx, 'last_name', e.target.value)} placeholder="Apellido" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111f38] text-xs font-bold dark:text-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold uppercase text-gray-400">División</label>
                                                            <input value={contact.division} onChange={e => updateClubContact(idx, 'division', e.target.value)} placeholder="Ej. M15 / Referente" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111f38] text-xs font-bold dark:text-white" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold uppercase text-gray-400">Teléfono</label>
                                                            <input value={contact.phone} onChange={e => updateClubContact(idx, 'phone', e.target.value)} placeholder="Ej. 11 1234 5678" className="w-full mt-0.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111f38] text-xs font-bold dark:text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {newClub.contacts.length === 0 && (
                                                <p className="text-[10px] text-gray-500 italic text-center py-2">No hay contactos agregados.</p>
                                            )}
                                        </div>
                                    </div>

                                    <button type="submit" disabled={loading} className="w-full mt-6 py-3 rounded-xl font-bold bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] hover:opacity-90 flex items-center justify-center gap-2">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : editingClubId ? 'Guardar Cambios' : 'Agendar Club'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* VIEWS */}
                {
                    viewMode === 'events' && (
                        <div className={eventsLayout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                            {events.map((ev: any) => {
                                const opponents = ev.match_opponents?.map((id: string) => clubs.find((c: any) => c.id === id)).filter(Boolean) || [ev.clubs];
                                const hasLogos = opponents.some((c: any) => c?.logo_url);

                                return eventsLayout === 'grid' ? (
                                    <div key={ev.id} className="bg-white/80 dark:bg-[#0B1526]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all flex flex-col relative group">
                                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <button onClick={(e) => { e.preventDefault(); openEditEvent(ev); }} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-500 rounded-full transition-colors dark:bg-blue-500/10 dark:hover:bg-blue-500/20 shadow-sm">
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex h-12 w-32 bg-white dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10 items-center justify-center p-1 gap-1">
                                                {!ev.location?.includes('Liceo') && ev.location && opponents[0]?.logo_url ? (
                                                    <img src={opponents[0]?.logo_url} alt="Visitante" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                ) : (
                                                    <img src="/logo-cglnm-liceo-naval.png" alt="Liceo Naval" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                )}
                                                <span className="text-gray-300 dark:text-gray-600 text-[10px] font-black italic -mx-0.5 mt-0.5">vs</span>
                                                {!ev.location?.includes('Liceo') && ev.location && opponents[0]?.logo_url ? (
                                                    <img src="/logo-cglnm-liceo-naval.png" alt="Liceo Naval" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                ) : hasLogos ? (
                                                    opponents.filter((c: any) => c?.logo_url).map((c: any, idx: number) => (
                                                        <img key={idx} src={c.logo_url} alt="Logo" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                    ))
                                                ) : (
                                                    <Shield className="w-6 h-6 text-gray-300 dark:text-white/20 flex-1" />
                                                )}
                                            </div>
                                            <div className={`text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold ${ev.status === 'Cancelado' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                                {ev.status}
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{ev.title}</h3>

                                        <div className="space-y-2 mb-4">
                                            <p suppressHydrationWarning className="text-sm text-liceo-primary dark:text-[#5EE5F8] font-bold flex items-center gap-2">
                                                <CalendarDays className="w-4 h-4" />
                                                {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('es-AR')}
                                            </p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 font-medium">
                                                <span className="text-orange-500 font-bold">Citación: {ev.call_time?.slice(0, 5) || '--:--'}</span> •
                                                <span className="text-green-500 font-bold">KO: {ev.event_time?.slice(0, 5)}hs</span>
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <MapPin className="w-4 h-4" /> {ev.location || ev.clubs?.address || 'Sede sin cargar'}
                                            </p>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 line-clamp-2">{ev.objectives}</p>

                                        <div className="mt-auto flex gap-2 w-full">
                                            <button onClick={() => copyWhatsAppMessage(ev)} title="Copiar mensaje WhatsApp" className="flex-shrink-0 flex items-center justify-center w-12 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl transition-colors">
                                                <MessageCircle className="w-5 h-5" />
                                            </button>
                                            <Link href={`/dashboard/training/${ev.id}`} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 dark:bg-white/5 hover:bg-liceo-primary hover:text-white dark:hover:bg-liceo-gold dark:hover:text-[#0B1526] text-liceo-primary dark:text-liceo-gold py-3 rounded-xl font-bold transition-colors">
                                                {t.matches.openControl}
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div key={ev.id} className="bg-white dark:bg-[#0B1526] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="w-32 h-12 shrink-0 flex items-center justify-center gap-1 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden p-1">
                                                {!ev.location?.includes('Liceo') && ev.location && opponents[0]?.logo_url ? (
                                                    <img src={opponents[0]?.logo_url} alt="Visitante" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                ) : (
                                                    <img src="/logo-cglnm-liceo-naval.png" alt="Liceo Naval" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                )}
                                                <span className="text-gray-300 dark:text-gray-600 text-[10px] font-black italic -mx-0.5 mt-0.5">vs</span>
                                                {!ev.location?.includes('Liceo') && ev.location && opponents[0]?.logo_url ? (
                                                    <img src="/logo-cglnm-liceo-naval.png" alt="Liceo Naval" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                ) : hasLogos ? (
                                                    opponents.filter((c: any) => c?.logo_url).map((c: any, idx: number) => (
                                                        <img key={idx} src={c.logo_url} alt="Logo" className="object-contain h-full flex-1 min-w-0 max-w-full" />
                                                    ))
                                                ) : (
                                                    <Shield className="w-6 h-6 text-gray-300 dark:text-white/20 flex-1" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <div className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest font-bold ${ev.status === 'Cancelado' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                                                        {ev.status}
                                                    </div>
                                                    <p suppressHydrationWarning className="text-xs text-liceo-primary dark:text-[#5EE5F8] font-bold flex items-center gap-1.5">
                                                        <CalendarDays className="w-3 h-3" />
                                                        {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('es-AR')}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold flex items-center gap-1.5 hidden md:flex">
                                                        <span className="text-orange-500">Cit: {ev.call_time?.slice(0, 5) || '--:--'}</span> • <span className="text-green-500">KO: {ev.event_time?.slice(0, 5)}hs</span>
                                                    </p>
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">{ev.title}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" /> {ev.location || ev.clubs?.address || 'Sede sin cargar'}
                                                    <span className="md:hidden"> • <span className="text-orange-500">Cit: {ev.call_time?.slice(0, 5) || '--'}</span> • <span className="text-green-500">KO: {ev.event_time?.slice(0, 5)}hs</span></span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 flex items-center gap-2 w-full md:w-auto">
                                            <button onClick={(e) => { e.preventDefault(); openEditEvent(ev); }} title="Editar Partido" className="opacity-0 group-hover:opacity-100 flex items-center justify-center p-2 sm:p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-500 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 rounded-xl transition-all">
                                                <Edit2 className="w-5 h-5 sm:w-4 sm:h-4" />
                                            </button>
                                            <button onClick={() => copyWhatsAppMessage(ev)} title="Copiar mensaje WhatsApp" className="flex items-center justify-center p-2 sm:p-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl transition-colors">
                                                <MessageCircle className="w-5 h-5 sm:w-5 sm:h-5" />
                                            </button>
                                            <Link href={`/dashboard/training/${ev.id}`} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-50 dark:bg-white/5 hover:bg-liceo-primary hover:text-white dark:hover:bg-liceo-gold dark:hover:text-[#0B1526] text-liceo-primary dark:text-liceo-gold px-6 py-2.5 rounded-xl font-bold transition-colors">
                                                {t.matches.openControl}
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                )
                            })}
                            {events.length === 0 && (
                                <div className="col-span-full py-16 text-center">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 dark:border-white/10">
                                        <Trophy className="w-10 h-10 text-gray-400 dark:text-gray-600" />
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-2">{t.matches.noMatches}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">{t.matches.noMatchesDesc}</p>
                                    <button onClick={() => setIsCreatingEvent(true)} className="bg-liceo-primary hover:bg-liceo-primary/90 text-white dark:bg-liceo-gold dark:hover:bg-yellow-400 dark:text-[#0B1526] px-6 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-liceo-primary/30 dark:shadow-[0_4px_20px_rgba(255,217,0,0.3)]">
                                        {t.matches.scheduleFirst}
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                }

                {
                    viewMode === 'clubs' && (
                        <div className={clubsLayout === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
                            {clubs.map((club: any) => (
                                clubsLayout === 'grid' ? (
                                    <div key={club.id} className="bg-white/80 dark:bg-[#0B1526]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all relative group flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
                                                    {club.logo_url ? (
                                                        <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain p-2" />
                                                    ) : (
                                                        <Shield className="w-8 h-8 text-gray-300 dark:text-white/20" />
                                                    )}
                                                </div>
                                                <button onClick={() => openEditClub(club)} className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-400 hover:text-liceo-primary bg-gray-50 dark:bg-white/5 rounded-full">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{club.name}</h3>
                                            <div className="space-y-1 mb-4">
                                                {club.address && <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2"><MapPin className="w-4 h-4" /> {club.address}</p>}
                                                {club.website_url && <a href={club.website_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-500 hover:underline flex items-center gap-2"><Globe className="w-4 h-4" /> Sitio Web</a>}
                                            </div>

                                            {club.contacts && club.contacts.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Contactos</p>
                                                    {club.contacts.map((c: any, i: number) => (
                                                        <div key={i} className="flex flex-col bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                                                            <div className="flex justify-between items-start">
                                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase leading-tight">{c.name} {c.last_name}</p>
                                                                {c.division && <span className="text-[9px] bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">{c.division}</span>}
                                                            </div>
                                                            {c.phone && (
                                                                <a href={`https://wa.me/${c.phone.toString().replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="mt-2 text-xs font-bold text-green-500 hover:text-green-600 flex items-center gap-1.5 transition-colors">
                                                                    <MessageCircle className="w-3.5 h-3.5" />
                                                                    {c.phone}
                                                                </a>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div key={club.id} className="bg-white dark:bg-[#0B1526] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 shrink-0 bg-white dark:bg-white/5 rounded-xl flex items-center justify-center border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                                                {club.logo_url ? (
                                                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain p-2" />
                                                ) : (
                                                    <Shield className="w-6 h-6 text-gray-300 dark:text-white/20" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1 group-hover:text-liceo-primary transition-colors">{club.name}</h3>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                                    {club.address && <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {club.address}</p>}
                                                    {club.website_url && <a href={club.website_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-blue-500 hover:underline flex items-center gap-1.5"><Globe className="w-3 h-3" /> Sitio Web</a>}
                                                    {club.contacts && club.contacts.length > 0 && (
                                                        <div className="flex gap-2">
                                                            {club.contacts.map((c: any, i: number) => (
                                                                <span key={i} title={`${c.name} ${c.last_name} (${c.division})`} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                                    <UserCircle className="w-3 h-3 text-liceo-primary dark:text-[#5EE5F8]" /> {c.name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => openEditClub(club)} className="p-3 text-gray-400 hover:text-liceo-primary hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all self-end sm:self-auto sm:opacity-0 group-hover:opacity-100">
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                )
                            ))}
                        </div>
                    )
                }
            </div >
        </div >
    )
}
