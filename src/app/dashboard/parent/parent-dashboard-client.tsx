'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
    Heart,
    Calendar,
    Trophy,
    MessageSquare,
    ChevronRight,
    Star,
    Info,
    Bell,
    Users,
    Activity,
    CheckCircle2,
    XCircle,
    BarChart3,
    ArrowRightCircle,
    ShieldCheck,
    Cake,
    User
} from 'lucide-react'
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, ResponsiveContainer
} from 'recharts'
import { useLang } from '@/components/lang-provider'
import Image from 'next/image'

interface ParentDashboardClientProps {
    profile: any
    childrenData: any[]
    billboardPosts: any[]
}

export default function ParentDashboardClient({ profile, childrenData, billboardPosts }: ParentDashboardClientProps) {
    const { t } = useLang()
    const [selectedChildIndex, setSelectedChildIndex] = useState(0)

    // Evitar errores de hidratación en fechas
    const [isMounted, setIsMounted] = useState(false)
    useEffect(() => {
        setIsMounted(true)
    }, [])

    const activeChild = childrenData.length > 0 ? childrenData[selectedChildIndex] : null

    // Listado de keys para el cálculo del OVR (igual que en Staff)
    const SKILL_KEYS = [
        'passing_receiving', 'ruck', 'tackle', 'contact', 'speed', 'endurance',
        'strength', 'tactical_positioning', 'decision_making', 'line_out',
        'scrum', 'attack', 'defense', 'mentality', 'patada', 'duelo'
    ]

    // Cálculo del Overall (OVR)
    const ovrData = useMemo(() => {
        if (!activeChild?.skills || activeChild.skills.length === 0) return { rating: 0, trend: 'equal' }

        const sortedSkills = [...activeChild.skills].sort((a, b) =>
            new Date(b.date_logged || 0).getTime() - new Date(a.date_logged || 0).getTime()
        )

        const calcScore = (s: any) => {
            let sum = 0
            SKILL_KEYS.forEach(k => sum += (s[k] || 1))
            const max = SKILL_KEYS.length * 5
            return Math.round((sum / max) * 100)
        }

        const currentScore = calcScore(sortedSkills[0])
        const prevScore = sortedSkills.length > 1 ? calcScore(sortedSkills[1]) : currentScore

        let trend = 'equal'
        if (currentScore > prevScore) trend = 'up'
        else if (currentScore < prevScore) trend = 'down'

        return { rating: currentScore, trend }
    }, [activeChild])

    const handleFixLinkage = async () => {
        const { fixLinkageAction } = await import('./fix-linkage-action')
        const res = await fixLinkageAction()
        if (res.success) alert('Vínculo creado. Recargá la página.')
        else alert('Error: ' + res.error)
    }

    // Resumen de asistencia
    const attendanceSummary = useMemo(() => {
        if (!activeChild?.event_attendance) return { present: 0, absent: 0, late: 0, total: 0 }
        const att = activeChild.event_attendance.filter((a: any) => a.events?.status !== 'Cancelado')
        return {
            present: att.filter((a: any) => a.status === 'Presente').length,
            absent: att.filter((a: any) => a.status === 'Ausente').length,
            late: att.filter((a: any) => a.status === 'Tarde').length,
            total: att.length
        }
    }, [activeChild])

    // Preparar datos del radar (con nombres de columnas reales de la DB)
    const skillData = useMemo(() => {
        // Ordenamos por fecha descendente para obtener el último log
        const sortedSkills = [...(activeChild?.skills || [])].sort((a, b) =>
            new Date(b.date_logged).getTime() - new Date(a.date_logged).getTime()
        )
        const latest = sortedSkills[0]

        if (!latest) return []

        return [
            { subject: 'Físico', A: (((latest.speed || 1) + (latest.endurance || 1) + (latest.strength || 1)) / 3).toFixed(1), fullMark: 5 },
            { subject: 'Defensa', A: (((latest.tackle || 1) + (latest.defense || 1) + (latest.contact || 1)) / 3).toFixed(1), fullMark: 5 },
            { subject: 'Mentalidad', A: latest.mentality || 1, fullMark: 5 },
            { subject: 'Táctica', A: (((latest.tactical_positioning || 1) + (latest.decision_making || 1)) / 2).toFixed(1), fullMark: 5 },
            { subject: 'Ataque', A: (((latest.attack || 1) + (latest.passing_receiving || 1) + (latest.patada || 1) + (latest.duelo || 1)) / 4).toFixed(1), fullMark: 5 },
            { subject: 'Fijos/Ruck', A: (((latest.ruck || 1) + (latest.scrum || 1) + (latest.line_out || 1)) / 3).toFixed(1), fullMark: 5 },
        ]
    }, [activeChild])

    if (!isMounted) return null // Prevenir flash de hidratación

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header / Welcome */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-liceo-gold/10 rounded-2xl flex items-center justify-center text-liceo-gold border border-liceo-gold/20">
                        <Users className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-liceo-primary dark:text-liceo-gold tracking-tight leading-tight">
                            ¡Hola, {profile?.full_name?.split(' ')[0]}!
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                            Tu portal de seguimiento M13 • Liceo Naval
                        </p>
                    </div>
                    {childrenData.length === 0 && (
                        <button
                            onClick={handleFixLinkage}
                            className="ml-4 px-3 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all uppercase"
                        >
                            Vincular con Julian (Fix)
                        </button>
                    )}
                </div>

                {childrenData.length > 1 && (
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 overflow-x-auto no-scrollbar">
                        {childrenData.map((child, idx) => (
                            <button
                                key={child.id}
                                onClick={() => setSelectedChildIndex(idx)}
                                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedChildIndex === idx
                                    ? 'bg-liceo-primary text-white dark:bg-liceo-gold dark:text-[#0B1526] shadow-lg shadow-liceo-primary/20 dark:shadow-liceo-gold/20'
                                    : 'text-gray-400 hover:text-liceo-primary dark:hover:text-white'
                                    }`}
                            >
                                {child.first_name}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {childrenData.length === 0 ? (
                <div className="bg-white dark:bg-[#111f38] rounded-3xl p-12 border border-gray-100 dark:border-white/5 text-center space-y-4 shadow-xl">
                    <div className="w-20 h-20 bg-liceo-gold/10 rounded-full flex items-center justify-center mx-auto text-liceo-gold border border-liceo-gold/20">
                        <Users className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black dark:text-white uppercase tracking-tight">Sin hijos vinculados</h2>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2 text-sm font-medium">
                            Parece que todavía no tenés hijos asociados a tu cuenta de padre. Contactá al staff para que vinculen tu acceso.
                        </p>
                    </div>
                    <Link href="/dashboard/parent/profile" className="inline-flex items-center gap-2 px-6 py-3 bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] font-black rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-transform">
                        Ir a mi Perfil <ArrowRightCircle className="w-4 h-4" />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">

                    {/* Left Column: Player Info & Skills */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Player Card (Main) */}
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#062c43] to-[#0B1526] rounded-[2.5rem] p-8 text-white shadow-2xl group border border-white/5">
                            {/* Animated Background Elements */}
                            <div className="absolute top-0 right-0 w-80 h-80 bg-liceo-gold/10 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-liceo-gold/20 transition-all duration-1000"></div>
                            <div className="absolute bottom-0 left-0 w-40 h-40 bg-liceo-primary/20 rounded-full blur-[60px] -ml-20 -mb-20"></div>

                            <div className="relative flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
                                <div className="w-36 h-36 rounded-3xl border-2 border-liceo-gold/30 p-2 flex-shrink-0 bg-white/5 backdrop-blur-sm shadow-xl transform group-hover:rotate-2 transition-transform duration-500 relative">
                                    <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-liceo-primary/40 to-transparent flex items-center justify-center overflow-hidden">
                                        {activeChild.image_url ? (
                                            <Image
                                                src={activeChild.image_url}
                                                alt={activeChild.first_name}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <Users className="w-20 h-20 text-white/20" />
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="inline-flex px-3 py-1 bg-liceo-gold text-[#0B1526] text-[10px] font-black uppercase tracking-[0.2em] rounded-md mb-2">
                                            JUGADOR M13
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase italic">{activeChild.first_name} {activeChild.last_name}</h2>
                                        {activeChild.nickname && (
                                            <p className="text-xl text-liceo-gold/80 font-bold italic">"{activeChild.nickname}"</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="h-1 w-12 bg-liceo-gold rounded-full"></div>
                                            <p className="text-xs font-bold text-liceo-gold tracking-widest uppercase">Performance Index (OVR): {ovrData.rating}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                                        <div className="flex flex-col bg-white/5 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 min-w-[90px]">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Categoría</span>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-liceo-gold" />
                                                <span className="text-xs font-black uppercase text-white">{activeChild.category || '2011'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col bg-white/5 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 min-w-[90px]">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Dorsal</span>
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-3.5 h-3.5 text-liceo-gold" />
                                                <span className="text-xs font-black uppercase text-white">#{activeChild.number || '13'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col bg-white/5 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 min-w-[90px]">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Posición</span>
                                            <div className="flex items-center gap-2">
                                                <Star className="w-3.5 h-3.5 text-liceo-gold" />
                                                <span className="text-xs font-black uppercase text-white">{activeChild.position?.split(',')[0] || 'A Definir'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col bg-white/5 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 min-w-[90px]">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Edad</span>
                                            <div className="flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 text-liceo-gold" />
                                                <span className="text-xs font-black uppercase text-white">{activeChild.age || '-'} años</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col bg-white/5 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/10 min-w-[90px]">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Cumpleaños</span>
                                            <div className="flex items-center gap-2">
                                                <Cake className="w-3.5 h-3.5 text-liceo-gold" />
                                                <span className="text-xs font-black uppercase text-white">
                                                    {activeChild.birth_date ? activeChild.birth_date.split('T')[0].split('-').reverse().slice(0, 2).join('/') : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats & Radar Group */}
                        {['Admin', 'Manager', 'Staff'].includes(profile?.role) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                {/* Radar Chart */}
                                <div className="bg-white dark:bg-[#111f38] rounded-[2.5rem] p-8 border border-gray-200 dark:border-white/5 shadow-xl">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="space-y-1">
                                            <h3 className="font-black text-liceo-primary dark:text-liceo-gold uppercase text-xs tracking-widest">Desempeño Técnico</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Evaluación de Skills</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                                            <Activity className="w-5 h-5 text-liceo-gold" />
                                        </div>
                                    </div>
                                    <div className="h-[300px] w-full">
                                        {skillData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillData}>
                                                    <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 8 }} axisLine={false} />
                                                    <Radar
                                                        name={activeChild.first_name}
                                                        dataKey="A"
                                                        stroke="#C5A059"
                                                        fill="#C5A059"
                                                        fillOpacity={0.4}
                                                        strokeWidth={2}
                                                    />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                                                <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center opacity-30">
                                                    <BarChart3 className="w-8 h-8" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase tracking-tighter">Sin evaluaciones registradas</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attendance Progress */}
                                <div className="bg-white dark:bg-[#111f38] rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-xl">
                                    <div className="flex items-center justify-between mb-10">
                                        <div className="space-y-1">
                                            <h3 className="font-black text-liceo-primary dark:text-liceo-gold uppercase text-xs tracking-widest">Presencialidad</h3>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Temporada Actual</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                                            <Calendar className="w-5 h-5 text-liceo-gold" />
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-5xl font-black text-liceo-primary dark:text-white leading-none">
                                                    {attendanceSummary.total > 0
                                                        ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
                                                        : 0}<span className="text-2xl text-liceo-gold">%</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black py-1.5 px-3 bg-green-500/10 text-green-500 rounded-lg uppercase tracking-widest">Consistente</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-green-500 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" /> Presente</span>
                                                    <span className="text-gray-400">{attendanceSummary.present}</span>
                                                </div>
                                                <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${attendanceSummary.total > 0 ? (attendanceSummary.present / attendanceSummary.total) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                                    <span className="text-red-500 flex items-center gap-1.5"><XCircle className="w-3 h-3" /> Ausente</span>
                                                    <span className="text-gray-400">{attendanceSummary.absent}</span>
                                                </div>
                                                <div className="h-2.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-red-500 rounded-full transition-all duration-1000"
                                                        style={{ width: `${attendanceSummary.total > 0 ? (attendanceSummary.absent / attendanceSummary.total) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight leading-relaxed">
                                                Basado en los últimos {attendanceSummary.total} eventos registrados por el cuerpo técnico.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white/50 dark:bg-white/5 rounded-[2.5rem] p-10 border border-gray-100 dark:border-white/5 text-center space-y-4 shadow-inner">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center mx-auto text-gray-400">
                                    <Info className="w-8 h-8 opacity-50" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black dark:text-white uppercase tracking-tight">Seguimiento de Evolución</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1 font-medium italic">
                                        Las métricas de Radar y Analítica de Asistencia son para uso interno del Staff.
                                        En esta pantalla podés ver la información básica y comunicados de {activeChild.first_name}.
                                    </p>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Right Column: Billboard & Alerts */}
                    <div className="space-y-8">

                        {/* Billboard Preview */}
                        <div className="bg-white dark:bg-[#111f38] rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-xl">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <Bell className="w-5 h-5 text-liceo-gold animate-bounce" />
                                    <h3 className="font-black text-liceo-primary dark:text-liceo-gold uppercase text-xs tracking-widest">Comunicados</h3>
                                </div>
                                <Link href="/dashboard/parent/billboard" className="text-[10px] font-black text-gray-400 hover:text-liceo-gold transition-colors uppercase tracking-widest border-b border-gray-200 dark:border-white/10 pb-0.5">Ver Todo</Link>
                            </div>

                            <div className="space-y-6">
                                {billboardPosts.length > 0 ? billboardPosts.map((post) => (
                                    <div key={post.id} className="group cursor-pointer">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[8px] font-black text-liceo-gold bg-liceo-gold/5 px-2 py-0.5 rounded uppercase tracking-[0.2em]">{post.category}</span>
                                            <span className="text-[9px] text-gray-400 font-bold">{new Date(post.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-liceo-primary dark:text-white line-clamp-1 group-hover:text-liceo-gold transition-colors mb-2 uppercase tracking-tight">{post.title}</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{post.content}</p>
                                        <div className="h-px bg-gray-100 dark:bg-white/5 mt-4 group-last:hidden"></div>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 text-gray-400 space-y-2">
                                        <MessageSquare className="w-8 h-8 mx-auto opacity-10" />
                                        <p className="text-[10px] font-bold uppercase italic">Sin comunicados pendientes</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Shortcuts */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-2 mb-2">Accesos Rápidos</h3>

                            <Link href="/dashboard/parent/calendar" className="w-full flex items-center justify-between p-5 bg-white dark:bg-[#111f38] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-liceo-gold/30 hover:scale-[1.02] transition-all group shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-liceo-primary dark:text-liceo-gold group-hover:bg-liceo-gold group-hover:text-[#0B1526] transition-all">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <p className="text-sm font-black dark:text-white uppercase tracking-tight">Calendario</p>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Eventos & Fixture</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-liceo-gold group-hover:translate-x-1 transition-all" />
                            </Link>

                            <Link href="/dashboard/parent/medical-record" className="w-full flex items-center justify-between p-5 bg-white dark:bg-[#111f38] rounded-2xl border border-gray-100 dark:border-white/5 hover:border-liceo-gold/30 hover:scale-[1.02] transition-all group shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-liceo-primary dark:text-liceo-gold group-hover:bg-liceo-gold group-hover:text-[#0B1526] transition-all">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div className="text-left space-y-0.5">
                                        <p className="text-sm font-black dark:text-white uppercase tracking-tight">Ficha Médica</p>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Documentación</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-liceo-gold group-hover:translate-x-1 transition-all" />
                            </Link>
                        </div>

                    </div>
                </div>
            )}
        </div>
    )
}
