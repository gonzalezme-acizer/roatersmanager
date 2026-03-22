'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ChevronLeft, Save, Plus, X, Search, Settings, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const POSITIONS_13 = [
    { id: '1', name: 'LH', label: '1', top: '12%', left: '30%' },
    { id: '2', name: 'HK', label: '2', top: '12%', left: '50%' },
    { id: '3', name: 'TH', label: '3', top: '12%', left: '70%' },
    { id: '4', name: 'LO', label: '4', top: '28%', left: '40%' },
    { id: '5', name: 'LO', label: '5', top: '28%', left: '60%' },
    { id: '8', name: 'No8', label: '8', top: '44%', left: '50%' },
    { id: '9', name: 'SH', label: '9', top: '60%', left: '35%' },
    { id: '10', name: 'FH', label: '10', top: '60%', left: '65%' },
    { id: '12', name: 'IC', label: '12', top: '76%', left: '35%' },
    { id: '13', name: 'OC', label: '13', top: '76%', left: '65%' },
    { id: '11', name: 'LW', label: '11', top: '92%', left: '20%' },
    { id: '15', name: 'FB', label: '15', top: '92%', left: '50%' },
    { id: '14', name: 'RW', label: '14', top: '92%', left: '80%' },
]

const POSITIONS_15 = [
    { id: '1', name: 'LH', label: '1', top: '12%', left: '30%' },
    { id: '2', name: 'HK', label: '2', top: '12%', left: '50%' },
    { id: '3', name: 'TH', label: '3', top: '12%', left: '70%' },
    { id: '4', name: 'LO', label: '4', top: '26%', left: '40%' },
    { id: '5', name: 'LO', label: '5', top: '26%', left: '60%' },
    { id: '6', name: 'BS', label: '6', top: '40%', left: '25%' },
    { id: '8', name: 'No8', label: '8', top: '40%', left: '50%' },
    { id: '7', name: 'OS', label: '7', top: '40%', left: '75%' },
    { id: '9', name: 'SH', label: '9', top: '56%', left: '40%' },
    { id: '10', name: 'FH', label: '10', top: '56%', left: '60%' },
    { id: '12', name: 'IC', label: '12', top: '72%', left: '40%' },
    { id: '13', name: 'OC', label: '13', top: '72%', left: '60%' },
    { id: '11', name: 'LW', label: '11', top: '88%', left: '20%' },
    { id: '15', name: 'FB', label: '15', top: '88%', left: '50%' },
    { id: '14', name: 'RW', label: '14', top: '88%', left: '80%' },
]

const POSITIONS_ORDER = [
    "Pilar", "Hooker", "Segunda línea", "Ala", "Octavo",
    "Medio Scrum", "Apertura", "Primer Centro", "Segundo Centro", "Wing", "Full Back"
]

const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function TeamBuilderClient({ initialTeam, allPlayers, allTeams }: { initialTeam: any, allPlayers: any[], allTeams: any[] }) {
    const supabase = createClient()
    const router = useRouter()

    // lineup is a mapping of position ID to player ID
    // e.g. { '1': 'uuid', 'sub_1': 'uuid' }
    const [lineup, setLineup] = useState<Record<string, string>>(initialTeam.lineup || {})
    const [subsCount, setSubsCount] = useState(initialTeam.substitutes_count || 0)
    const [captainId, setCaptainId] = useState<string | null>(initialTeam.captain_id || null)
    const [saving, setSaving] = useState(false)
    const [activeNode, setActiveNode] = useState<{ id: string, name: string } | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

    const layout = initialTeam.player_count === 13 ? POSITIONS_13 : POSITIONS_15.slice(0, initialTeam.player_count)
    const substitutes = Array.from({ length: subsCount }, (_, i) => ({
        id: `sub_${i + 1}`, name: 'SUB', label: `S${i + 1}`
    }))

    const playerToTeamMap = useMemo(() => {
        const map = new Map<string, string>()
        allTeams?.forEach(t => {
            if (t.id === initialTeam.id) return // Skip current team

            // Si el equipo que estamos editando pertenece a un "Agrupador" (group_name),
            // solo filtramos jugadores de otros equipos que pertenezcan AL MISMO agrupador.
            // Si el equipo que estamos editando NO tiene agrupador, se filtra contra otros equipos sin agrupador (comportamiento de equipos independientes antiguos).
            if ((initialTeam.group_name && t.group_name === initialTeam.group_name) || (!initialTeam.group_name && !t.group_name)) {
                if (t.lineup) {
                    Object.values(t.lineup).forEach((pId: any) => {
                        map.set(pId, t.name)
                    })
                }
            }
        })
        return map
    }, [allTeams, initialTeam.id, initialTeam.group_name])

    const handleSave = async () => {
        setSaving(true)
        const { error } = await supabase.from('teams').update({ lineup, substitutes_count: subsCount, captain_id: captainId }).eq('id', initialTeam.id)
        if (!error) {
            showSuccessToast('Alineación Guardada', 'La alineación del equipo se actualizó correctamente.')
            router.refresh()
        } else {
            console.error('Error saving lineup:', error)
            showErrorToast('Error al Guardar', 'Hubo un problema guardando tu alineación. Intenta nuevamente.')
        }
        setSaving(false)
        setActiveNode(null)
    }

    const unassignPlayer = (posId: string) => {
        setLineup(prev => {
            const next = { ...prev }
            if (next[posId] === captainId) setCaptainId(null)
            delete next[posId]
            return next
        })
    }

    const assignPlayer = (playerId: string) => {
        if (!activeNode) return

        // Remove player if already assigned somewhere else
        const newMap = { ...lineup }
        for (const [key, val] of Object.entries(newMap)) {
            if (val === playerId) delete newMap[key]
        }

        newMap[activeNode.id] = playerId
        setLineup(newMap)
        setActiveNode(null)
        setSearchTerm('')
    }

    const usedPlayerIds = new Set(Object.values(lineup))

    // Team Radar stats based on starters only
    const startersSkills = layout.map(pos => {
        const pId = lineup[pos.id]
        if (!pId) return null
        const p = allPlayers.find(pl => pl.id === pId)
        return p?.skills || null
    }).filter(Boolean)

    const aggregateSkills = useMemo(() => {
        if (startersSkills.length === 0) return null

        const sum = startersSkills.reduce((acc, curr) => ({
            fis: acc.fis + (curr.speed + curr.endurance + curr.strength) / 3,
            def: acc.def + (curr.tackle + curr.defense + curr.contact) / 3,
            men: acc.men + curr.mentality,
            tac: acc.tac + (curr.tactical_positioning + curr.decision_making) / 2,
            ata: acc.ata + (curr.attack + curr.passing_receiving + (curr.patada || 1) + (curr.duelo || 1)) / 4,
            fij: acc.fij + (curr.ruck + curr.scrum + curr.line_out) / 3,
        }), { fis: 0, def: 0, men: 0, tac: 0, ata: 0, fij: 0 })

        const N = startersSkills.length
        return [
            { subject: 'Físico', A: (sum.fis / N).toFixed(1), fullMark: 5 },
            { subject: 'Defensa', A: (sum.def / N).toFixed(1), fullMark: 5 },
            { subject: 'Mentalidad', A: (sum.men / N).toFixed(1), fullMark: 5 },
            { subject: 'Táctica', A: (sum.tac / N).toFixed(1), fullMark: 5 },
            { subject: 'Ataque', A: (sum.ata / N).toFixed(1), fullMark: 5 },
            { subject: 'Fijos/Ruck', A: (sum.fij / N).toFixed(1), fullMark: 5 },
        ]
    }, [startersSkills])

    return (
        <div className="min-h-full bg-gray-50 dark:bg-[#0B1526] text-gray-900 dark:text-white flex flex-col font-sans relative overflow-hidden">
            {/* Dark background pattern mimicking pitch outline */}
            <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20">
                <div className="absolute top-0 w-full h-full bg-[linear-gradient(to_bottom,#164E87_1px,transparent_1px)] dark:bg-[linear-gradient(to_bottom,#082747_1px,transparent_1px)] bg-[size:100%_40px]" />
                <div className="absolute left-0 w-full h-full bg-[linear-gradient(to_right,#164E87_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#082747_1px,transparent_1px)] bg-[size:40px_100%]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 lg:py-6 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#041221] shadow-sm dark:shadow-none">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/teams" className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-liceo-primary dark:text-[#5EE5F8]" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-black uppercase tracking-widest text-liceo-primary dark:text-[#5EE5F8]">{initialTeam.name}</h1>
                        <p className="text-xs text-gray-500 dark:text-cyan-500/60 font-medium">Starting {initialTeam.player_count} Lineup</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-liceo-primary hover:bg-liceo-primary/90 text-white dark:bg-[#5EE5F8] dark:hover:bg-[#4bc8da] dark:text-[#061B30] px-4 py-2 rounded-full font-bold text-sm transition-all shadow-md dark:shadow-[0_0_15px_rgba(94,229,248,0.3)] disabled:opacity-50">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Lineup
                    </button>
                    <button className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors hidden sm:flex">
                        <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-auto flex flex-col lg:flex-row relative z-10 w-full max-w-7xl mx-auto">
                {/* Visualizer - Pitch */}
                <div className="flex-1 w-full flex justify-center items-start lg:items-center py-6 px-2 min-h-[500px] lg:min-h-0 relative">
                    <div className="relative w-full max-w-[450px] lg:max-w-[500px] aspect-[1/1.6] border-2 border-emerald-500/30 bg-emerald-50/50 dark:bg-transparent dark:border-[#164E87] rounded-[40px] shadow-[inset_0_0_50px_rgba(16,185,129,0.1)] dark:shadow-[inset_0_0_50px_rgba(22,78,135,0.2)]">
                        {/* Lines */}
                        <div className="absolute top-[22%] w-full h-px bg-emerald-500/40 dark:bg-[#164E87]/50 border-t border-dashed border-emerald-500/40 dark:border-[#164E87]"></div>
                        <div className="absolute top-[50%] w-full h-[2px] bg-emerald-500/60 dark:bg-[#164E87]"></div>
                        <div className="absolute top-[78%] w-full h-px bg-emerald-500/40 dark:bg-[#164E87]/50 border-t border-dashed border-emerald-500/40 dark:border-[#164E87]"></div>

                        {/* Nodes */}
                        {layout.map(pos => {
                            const pId = lineup[pos.id]
                            const p = allPlayers.find(pl => pl.id === pId)

                            return (
                                <div key={pos.id} className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 group" style={{ top: pos.top, left: pos.left }}>
                                    <button
                                        onClick={() => setActiveNode({ id: pos.id, name: pos.label })}
                                        className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 shadow-lg transition-all bg-white dark:bg-[#0a213a] ${p ? 'border-liceo-primary dark:border-[#5EE5F8] dark:shadow-[0_0_25px_rgba(94,229,248,0.4)]' : 'border-gray-300 dark:border-[#1A5c99] hover:border-liceo-primary/50 dark:hover:border-[#5EE5F8]/50'
                                            }`}
                                    >
                                        {p ? (
                                            p.image_url ? (
                                                <img src={p.image_url} alt={p.first_name} className="w-full h-full object-cover rounded-full p-0.5" />
                                            ) : (
                                                <span className="text-liceo-primary dark:text-[#5EE5F8] font-bold text-sm uppercase">{p.first_name.charAt(0)}{p.last_name.charAt(0)}</span>
                                            )
                                        ) : (
                                            <span className="text-xl font-black text-gray-300 dark:text-[#5EE5F8]/80">{pos.label}</span>
                                        )}
                                    </button>
                                    <div className="mt-1 text-center leading-tight">
                                        {p ? (
                                            <>
                                                <div className="text-[9px] sm:text-[10px] md:text-xs font-bold text-gray-800 dark:text-white whitespace-nowrap bg-white/80 dark:bg-black/50 px-1.5 py-0.5 rounded-full backdrop-blur-sm shadow-sm dark:shadow-none">{p.last_name}</div>
                                                <div className="text-[7px] sm:text-[8px] md:text-[9px] font-black text-liceo-accent dark:text-[#5EE5F8] uppercase tracking-widest mt-0.5">{pos.label}. {pos.name}</div>
                                            </>
                                        ) : (
                                            <div className="text-[8px] sm:text-[9px] font-black text-gray-500 dark:text-[#1A5c99] uppercase tracking-widest">{pos.name}</div>
                                        )}
                                    </div>
                                    {p && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setCaptainId(captainId === p.id ? null : p.id) }}
                                                className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md flex-shrink-0 ${captainId === p.id ? 'bg-yellow-400 opacity-100' : 'bg-gray-300 dark:bg-gray-700 hover:bg-yellow-400'}`}
                                                title="Alternar Capitán"
                                            >
                                                <span className="text-[10px] items-center text-white dark:text-[#0a213a] font-black pointer-events-none">C</span>
                                            </button>
                                            {captainId === p.id && (
                                                <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center bg-yellow-400 z-0 shadow-md border-2 border-white dark:border-[#0a213a]">
                                                    <span className="text-[9px] text-white dark:text-[#0a213a] font-black ml-0.5">C</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {p && (
                                        <button onClick={(e) => { e.stopPropagation(); unassignPlayer(pos.id) }} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md flex-shrink-0">
                                            <X className="w-3 h-3 text-white" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right Panel - Substitutes & Radar */}
                <div className="w-full lg:w-[400px] bg-white dark:bg-[#0A1628] border-l border-gray-200 dark:border-white/5 flex flex-col pt-8">
                    {/* Radar Chart */}
                    <div className="px-6 mb-8">
                        <h3 className="text-xs font-black uppercase text-liceo-primary dark:text-[#5EE5F8] tracking-widest mb-4">Balance General del Equipo</h3>
                        <div className="bg-gray-50 dark:bg-white/5 rounded-3xl p-4 h-[250px] border border-gray-100 dark:border-white/5 shadow-inner">
                            {aggregateSkills ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={aggregateSkills}>
                                        <PolarGrid strokeOpacity={0.2} stroke="currentColor" className="text-liceo-primary dark:text-[#5EE5F8]" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 10, fontWeight: 700 }} className="text-gray-500 dark:text-[#809bbb]" />
                                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                                        <Radar name="Equipo" dataKey="A" stroke="#3A86FF" fill="#3A86FF" fillOpacity={0.4} strokeWidth={2} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#000' }}
                                            itemStyle={{ color: '#3A86FF', fontWeight: 'bold' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 font-bold text-center px-6">
                                    Agrega jugadores titulares para ver la media estadística del equipo.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bench Section */}
                    <div className="flex-1 bg-gray-50 dark:bg-[#102035] rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden border-t border-gray-200/50 dark:border-none">
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 dark:bg-white/10 rounded-full"></div>
                        <div className="p-6 pt-10 flex justify-between items-center mb-2">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Available Bench</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setSubsCount(Math.max(0, subsCount - 1))} className="w-6 h-6 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">
                                    <span className="text-gray-600 dark:text-gray-300 font-bold leading-none -mt-0.5">-</span>
                                </button>
                                <span className="text-liceo-primary bg-liceo-primary/10 dark:text-[#5EE5F8] dark:bg-[#5EE5F8]/10 px-3 py-1 rounded-full text-[10px] font-bold">
                                    {subsCount} Slots
                                </span>
                                <button onClick={() => setSubsCount(subsCount + 1)} className="w-6 h-6 rounded-full bg-liceo-primary dark:bg-[#5EE5F8] flex items-center justify-center hover:bg-liceo-primary/90 dark:hover:bg-[#4bc8da] transition-colors">
                                    <Plus className="w-3.5 h-3.5 text-white dark:text-[#061B30]" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                            {substitutes.map(sub => {
                                const pId = lineup[sub.id]
                                const p = allPlayers.find(pl => pl.id === pId)

                                return (
                                    <div key={sub.id} className="bg-white dark:bg-white/5 rounded-2xl p-3 flex items-center gap-4 group hover:bg-gray-100 dark:hover:bg-white/10 transition-colors border border-gray-100 hover:border-gray-200 dark:border-transparent dark:hover:border-white/10 cursor-pointer shadow-sm dark:shadow-none" onClick={() => setActiveNode({ id: sub.id, name: sub.label })}>
                                        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-[#0A1628] flex items-center justify-center overflow-hidden border border-gray-200 dark:border-[#164E87]">
                                            {p ? (
                                                p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-liceo-primary dark:text-[#5EE5F8] font-bold text-xs">{p.last_name.charAt(0)}</span>
                                            ) : (
                                                <Plus className="w-5 h-5 text-gray-400 dark:text-[#164E87] group-hover:text-liceo-primary dark:group-hover:text-[#5EE5F8]" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            {p ? (
                                                <>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{p.first_name} {p.last_name}</h4>
                                                    <p className="text-[10px] text-liceo-primary dark:text-[#5EE5F8] font-bold uppercase">{p.position || 'Sin Pos'}</p>
                                                </>
                                            ) : (
                                                <h4 className="font-bold text-gray-400 dark:text-gray-500 text-sm">Vacío</h4>
                                            )}
                                        </div>
                                        {p && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setCaptainId(captainId === p.id ? null : p.id) }}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${captainId === p.id ? 'bg-yellow-400 text-white dark:text-[#0A1628]' : 'bg-gray-100 hover:bg-yellow-400 dark:bg-white/10 dark:hover:bg-yellow-400 text-gray-400 hover:text-white dark:hover:text-[#0A1628]'}`}
                                                    title="Alternar Capitán"
                                                >
                                                    <span className="font-black text-xs pointer-events-none">C</span>
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); unassignPlayer(sub.id) }} className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* SELECTION MODAL */}
            {activeNode && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm dark:backdrop-blur-md pb-0 sm:p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-[#0A1628] w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl border border-gray-200 dark:border-white/10 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-[#102035] flex-shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Select Player</h3>
                                <p className="text-xs text-liceo-primary dark:text-[#5EE5F8] tracking-widest font-bold">POSITION: {activeNode.name}</p>
                            </div>
                            <button onClick={() => setActiveNode(null)} className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                        </div>

                        <div className="p-4 bg-white dark:bg-[#0A1628] flex-shrink-0">
                            <div className="relative">
                                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search players..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-[#102035] border border-gray-200 dark:border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-gray-900 dark:text-white focus:border-liceo-primary dark:focus:border-[#5EE5F8] focus:outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-colors"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {(() => {
                                const filteredPlayers = allPlayers
                                    .filter(p => !usedPlayerIds.has(p.id))
                                    .filter(p => p.status === 'Activo')
                                    .filter(p => normalizeText(`${p.first_name || ''} ${p.last_name || ''} ${p.position || ''}`).includes(normalizeText(searchTerm)))
                                    .sort((a, b) => {
                                        const wA = POSITIONS_ORDER.indexOf(a.position) === -1 ? 99 : POSITIONS_ORDER.indexOf(a.position)
                                        const wB = POSITIONS_ORDER.indexOf(b.position) === -1 ? 99 : POSITIONS_ORDER.indexOf(b.position)
                                        if (wA !== wB) return wA - wB
                                        return a.last_name.localeCompare(b.last_name)
                                    });

                                if (filteredPlayers.length === 0) {
                                    return (
                                        <div className="text-center py-12 px-4 text-gray-500 flex flex-col items-center gap-3">
                                            <Shield className="w-12 h-12 opacity-20" />
                                            <div>
                                                <p className="font-bold text-sm">No hay jugadores disponibles.</p>
                                                <p className="text-xs mt-1">Es posible que estén todos asignados, lesionados o suspendidos.</p>
                                            </div>
                                        </div>
                                    )
                                }

                                return filteredPlayers.map(p => {
                                    const otherTeam = playerToTeamMap.get(p.id)
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => !otherTeam && assignPlayer(p.id)}
                                            disabled={!!otherTeam}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left group ${otherTeam ? 'opacity-80 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#102035] flex items-center justify-center overflow-hidden border border-gray-200 dark:border-none">
                                                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-liceo-primary dark:text-[#5EE5F8] font-bold text-[10px]">{p.first_name.charAt(0)}</span>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                                                        {p.first_name} {p.last_name}
                                                        {otherTeam && (
                                                            <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-liceo-gold text-liceo-primary dark:text-liceo-primary border-2 border-liceo-primary shadow-sm ml-1">
                                                                {otherTeam}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">{p.position || 'Sin Pos'} • {p.age ? `${p.age} años` : ''}</p>
                                                </div>
                                            </div>
                                            <div className={`p-2 rounded-full transition-colors ${otherTeam ? 'bg-transparent text-gray-300 dark:text-gray-600' : 'bg-gray-100 dark:bg-white/5 group-hover:bg-liceo-primary group-hover:text-white dark:group-hover:bg-[#5EE5F8] dark:group-hover:text-[#061B30] text-liceo-primary dark:text-[#5EE5F8]'}`}>
                                                <Plus className="w-4 h-4" />
                                            </div>
                                        </button>
                                    )
                                })
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
