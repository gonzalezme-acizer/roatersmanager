'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
    Megaphone,
    Plus,
    X,
    Image as ImageIcon,
    Search,
    Filter,
    Link as LinkIcon,
    MapPin,
    Youtube,
    MoreVertical,
    Trash2,
    Calendar,
    Globe,
    ShieldCheck,
    Lock,
    Loader2
} from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/utils/toast'
import Image from 'next/image'

export default function BillboardClient({ initialPosts, user }: any) {
    const supabase = createClient()
    const [posts, setPosts] = useState(initialPosts || [])
    const [isAdding, setIsAdding] = useState(false)
    const [filter, setFilter] = useState('all')
    const [loading, setLoading] = useState(false)

    // Form state
    const [title, setTitle] = useState('')
    const [content, setContent] = useState('')
    const [category, setCategory] = useState<'publico' | 'staff' | 'privado'>('publico')
    const [image, setImage] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setImage(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !content.trim()) return

        setLoading(true)
        let image_url = null

        try {
            // Upload image if exists
            if (image) {
                const fileExt = image.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `posts/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('billboard')
                    .upload(filePath, image)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('billboard')
                    .getPublicUrl(filePath)

                image_url = publicUrl
            }

            const { data, error } = await supabase
                .from('billboard_posts')
                .insert([{
                    title,
                    content,
                    category,
                    image_url,
                    author_id: user.id
                }])
                .select('*, profiles:author_id(full_name, image_url)')
                .single()

            if (error) throw error

            setPosts([data, ...posts])
            setIsAdding(false)
            resetForm()
            showSuccessToast('¡Publicado!', 'El mensaje se ha subido a la cartelera.')
        } catch (err: any) {
            console.error(err)
            showErrorToast('Error', 'No se pudo crear el mensaje.')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setTitle('')
        setContent('')
        setCategory('publico')
        setImage(null)
        setImagePreview(null)
    }

    const handleDelete = async (id: string, authorId: string) => {
        if (authorId !== user.id) return
        if (!confirm('¿Seguro que quieres borrar este mensaje?')) return

        const { error } = await supabase
            .from('billboard_posts')
            .delete()
            .eq('id', id)

        if (error) {
            showErrorToast('Error', 'No se pudo borrar el mensaje.')
        } else {
            setPosts(posts.filter((p: any) => p.id !== id))
            showSuccessToast('Borrado', 'Mensaje eliminado correctamente.')
        }
    }

    const filteredPosts = posts.filter((p: any) => {
        if (filter === 'all') return true
        return p.category === filter
    })

    const formatContent = (text: string) => {
        // Simple link detection and conversion
        const urlRegex = /(https?:\/\/[^\s]+)/g
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                let icon = <LinkIcon className="w-3 h-3 inline mr-1" />
                let label = "Enlace"

                if (part.includes('maps.google') || part.includes('goo.gl/maps')) {
                    icon = <MapPin className="w-3 h-3 inline mr-1 text-red-500" />
                    label = "Ver Ubicación"
                } else if (part.includes('youtube.com') || part.includes('youtu.be')) {
                    icon = <Youtube className="w-3 h-3 inline mr-1 text-red-600" />
                    label = "Ver Video"
                }

                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-bold inline-flex items-center bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md mx-0.5">
                        {icon} {label}
                    </a>
                )
            }
            return part
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header / New Post Trigger */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-liceo-primary dark:text-[#5EE5F8] flex items-center gap-3">
                        <Megaphone className="w-8 h-8" />
                        Cartelera M13
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Anuncios, noticias y mensajes para el plantel.</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-liceo-primary hover:bg-liceo-primary/90 text-white dark:bg-liceo-gold dark:text-[#0B1526] font-black px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-liceo-primary/20 dark:shadow-liceo-gold/20"
                >
                    <Plus className="w-5 h-5" />
                    NUEVO MENSAJE
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 ${filter === 'all' ? 'bg-liceo-primary text-white dark:bg-[#5EE5F8] dark:text-[#0B1526]' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                    Todos
                </button>
                <button
                    onClick={() => setFilter('publico')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 flex items-center gap-1.5 ${filter === 'publico' ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                    <Globe className="w-3.5 h-3.5" /> Públicos
                </button>
                <button
                    onClick={() => setFilter('staff')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 flex items-center gap-1.5 ${filter === 'staff' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                    <ShieldCheck className="w-3.5 h-3.5" /> Staff
                </button>
                <button
                    onClick={() => setFilter('privado')}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex-shrink-0 flex items-center gap-1.5 ${filter === 'privado' ? 'bg-amber-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                >
                    <Lock className="w-3.5 h-3.5" /> Privados
                </button>
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
                {filteredPosts.length === 0 ? (
                    <div className="text-center py-20 bg-white/50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10">
                        <Megaphone className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-500 font-bold">No hay mensajes en esta categoría.</p>
                    </div>
                ) : (
                    filteredPosts.map((post: any) => (
                        <div key={post.id} className="bg-white dark:bg-[#102035] rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                            {/* Author Header */}
                            <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-liceo-primary to-liceo-accent overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                                        {post.profiles?.image_url ? (
                                            <img src={post.profiles.image_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            post.profiles?.full_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{post.profiles?.full_name}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(post.created_at).toLocaleDateString('es-AR')}</span>
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${post.category === 'publico' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' :
                                                    post.category === 'staff' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20' :
                                                        'bg-amber-100 text-amber-600 dark:bg-amber-500/20'
                                                }`}>
                                                {post.category}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {post.author_id === user.id && (
                                    <button
                                        onClick={() => handleDelete(post.id, post.author_id)}
                                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <h2 className="text-xl font-black text-liceo-primary dark:text-white uppercase tracking-tight leading-none">{post.title}</h2>
                                <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {formatContent(post.content)}
                                </div>
                                {post.image_url && (
                                    <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 group cursor-zoom-in">
                                        <img src={post.image_url} alt="" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Nuevo Mensaje */}
            {isAdding && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0B1526] w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <h2 className="text-2xl font-black tracking-tight text-liceo-primary dark:text-[#5EE5F8] uppercase">Nuevo Anuncio</h2>
                            <button onClick={() => setIsAdding(false)} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500 dark:text-white" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Título del Mensaje</label>
                                <input
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Suspensión de entrenamiento..."
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-liceo-primary dark:focus:border-liceo-gold rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 dark:text-white transition-all focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Desarrollo / Mensaje</label>
                                <textarea
                                    required
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Usa emojis y pega links de Maps o YouTube..."
                                    rows={5}
                                    className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-liceo-primary dark:focus:border-liceo-gold rounded-2xl px-5 py-4 text-sm font-medium text-gray-900 dark:text-white transition-all focus:outline-none resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Visibilidad</label>
                                    <select
                                        value={category}
                                        onChange={(e: any) => setCategory(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black/20 border-2 border-transparent focus:border-liceo-primary dark:focus:border-liceo-gold rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 dark:text-white transition-all focus:outline-none uppercase"
                                    >
                                        <option value="publico">🌍 Público</option>
                                        <option value="staff">🛡️ Staff Only</option>
                                        <option value="privado">🔒 Privado</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block">Imágenes</label>
                                    <label className="w-full bg-gray-50 dark:bg-black/20 border-2 border-dashed border-gray-300 dark:border-white/10 hover:border-liceo-primary dark:hover:border-liceo-gold rounded-2xl px-4 py-3 text-sm font-bold text-gray-500 dark:text-gray-400 cursor-pointer flex items-center justify-center gap-2 transition-all">
                                        <ImageIcon className="w-5 h-5" />
                                        {image ? 'Cargada ✓' : 'Subir Foto'}
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                </div>
                            </div>

                            {imagePreview && (
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-liceo-primary/20">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button onClick={() => { setImage(null); setImagePreview(null) }} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    disabled={loading}
                                    type="submit"
                                    className="w-full bg-liceo-primary dark:bg-liceo-gold text-white dark:text-[#0B1526] font-black py-5 rounded-2xl shadow-xl shadow-liceo-primary/20 dark:shadow-liceo-gold/20 flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            PUBLICANDO...
                                        </>
                                    ) : (
                                        <>
                                            <Megaphone className="w-5 h-5" />
                                            PUBLICAR ANUNCIO
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
