'use client'

import React, { useState } from 'react'
import {
    ChevronLeft,
    ChevronRight,
    Search,
    User,
    Star,
    Cake,
    Shield,
    Users
} from 'lucide-react'
import Image from 'next/image'

interface SquadPlayer {
    id: string
    first_name: string
    last_name: string
    nickname: string | null
    position: string | null
    birth_date: string | null
    image_url: string | null
    category: string | null
    status: string | null
}

export default function ParentRosterClient({ squad }: { squad: SquadPlayer[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [currentIndex, setCurrentIndex] = useState(0)

    const filteredSquad = squad.filter(p =>
        `${p.first_name} ${p.last_name} ${p.nickname || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const nextPlayer = () => {
        if (filteredSquad.length === 0) return
        setCurrentIndex((prev) => (prev + 1) % filteredSquad.length)
    }

    const prevPlayer = () => {
        if (filteredSquad.length === 0) return
        setCurrentIndex((prev) => (prev - 1 + filteredSquad.length) % filteredSquad.length)
    }

    const currentPlayer = filteredSquad[currentIndex]

    if (squad.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-400">
                    <Users className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black uppercase text-gray-500">Plantel No Disponible</h2>
                <p className="text-gray-400 max-w-sm">No se encontraron jugadores en la categoría de tu hijo.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-liceo-primary dark:text-liceo-gold uppercase tracking-tight">Plantel del Liceo</h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">Conocé a los compañeros de equipo de tu hijo.</p>
                </div>
                
                <div className="relative w-full md:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-liceo-gold transition-colors" />
                    <input 
                        type="search" 
                        placeholder="Buscar jugador..." 
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentIndex(0)
                        }}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-white/5 border border-transparent focus:border-liceo-gold/30 dark:focus:border-liceo-gold/30 rounded-xl outline-none text-xs font-bold transition-all text-gray-900 dark:text-white"
                    />
                </div>
            </header>

            {filteredSquad.length > 0 ? (
                <div className="flex flex-col items-center space-y-8">
                    {/* Carousel Container */}
                    <div className="relative w-full max-w-[400px] aspect-[4/6] group">
                        
                        {/* Navigation Buttons (Floating) */}
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:-mx-16 z-20 pointer-events-none">
                            <button 
                                onClick={prevPlayer}
                                className="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center justify-center text-white hover:bg-liceo-gold hover:text-[#0B1526] hover:scale-110 transition-all shadow-xl pointer-events-auto active:scale-95"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button 
                                onClick={nextPlayer}
                                className="w-12 h-12 rounded-full bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 flex items-center justify-center text-white hover:bg-liceo-gold hover:text-[#0B1526] hover:scale-110 transition-all shadow-xl pointer-events-auto active:scale-95"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Player card */}
                        <div className="w-full h-full relative rounded-[2rem] overflow-hidden shadow-2xl border-[6px] border-white dark:border-[#111f38] transition-transform duration-500 overflow-hidden group-hover:shadow-liceo-gold/20">
                            
                            {/* Player Image */}
                            <div className="absolute inset-0 bg-gray-200 dark:bg-[#0B1526]">
                               {currentPlayer.image_url ? (
                                    <Image 
                                        src={currentPlayer.image_url} 
                                        alt={currentPlayer.first_name} 
                                        fill
                                        className="object-cover"
                                        priority
                                    />
                               ) : (
                                   <div className="w-full h-full flex items-center justify-center opacity-10">
                                       <User className="w-32 h-32" />
                                   </div>
                               )}
                            </div>

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>

                            {/* Card Content Top/Bottom */}
                            <div className="relative h-full flex flex-col justify-between p-6 md:p-8 text-white">
                                
                                {/* Top Stats Overlay */}
                                <div className="flex justify-between items-start pt-2">
                                    <div className="flex flex-col items-center">
                                         <div className="w-10 h-10 md:w-12 md:h-12 bg-liceo-gold rounded-full flex items-center justify-center text-[#0B1526] border-2 border-white shadow-lg mb-1">
                                             <Shield className="w-5 h-5 md:w-6 md:h-6" />
                                         </div>
                                         <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-shadow shadow-black/50">M13</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-white/10 backdrop-blur-md rounded-lg px-2 py-1 border border-white/10 inline-block mb-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-liceo-gold leading-none">Categoría</p>
                                        </div>
                                        <p className="text-xl font-black text-white italic tracking-tighter">{currentPlayer.category || '2011'}</p>
                                    </div>
                                </div>

                                {/* Bottom Info */}
                                <div className="space-y-4">
                                    <div className="space-y-0.5 animate-in slide-in-from-left duration-500">
                                        <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">{currentPlayer.first_name} {currentPlayer.last_name}</h2>
                                        {currentPlayer.nickname && (
                                            <p className="text-xl font-bold text-liceo-gold italic tracking-tight leading-none leading-none">"{currentPlayer.nickname}"</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="flex flex-col bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-300 opacity-60 mb-1">Posición</span>
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                <Star className="w-3.5 h-3.5 text-liceo-gold flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs font-black uppercase truncate">{currentPlayer.position || 'A Definir'}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-gray-300 opacity-60 mb-1">Cumpleaños</span>
                                            <div className="flex items-center gap-1.5">
                                                <Cake className="w-3.5 h-3.5 text-liceo-gold flex-shrink-0" />
                                                <span className="text-[10px] md:text-xs font-black">
                                                    {currentPlayer.birth_date ? currentPlayer.birth_date.split('T')[0].split('-').reverse().slice(0, 2).join(' / ') : '-- / --'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                         {/* Card Reflection/Glow */}
                         <div className="absolute -inset-2 bg-liceo-gold/10 rounded-[2.5rem] blur-2xl opacity-50 -z-10 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    {/* Pagination Indicator */}
                    <div className="flex items-center gap-2 pb-10">
                        {filteredSquad.map((_, idx) => (
                            <button 
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'w-10 bg-liceo-gold' : 'w-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300'}`}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center space-y-4">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs italic">No se encontraron resultados para "{searchTerm}"</p>
                    <button onClick={() => setSearchTerm('')} className="text-liceo-gold text-xs font-black underline uppercase">Limpiar búsqueda</button>
                </div>
            )}
        </div>
    )
}
