'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Camera, Loader2, FolderPlus, Library, MonitorPlay, X, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { getGalleryImages, deleteGalleryPost, getAlbums, batchAddPostsToAlbum, syncAlbumPhotos, deleteAlbum } from '@/core/gallery/actions'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { AlbumCreator } from '@/components/gallery/AlbumCreator'
import { GalleryComposer } from '@/components/gallery/GalleryComposer'
import { useParams, useRouter } from 'next/navigation'
import { GalleryCinemaMode } from '@/components/gallery/GalleryCinemaMode'
import { Check, Square, CheckSquare, Trash2, FolderPlus as FolderPlusIcon } from 'lucide-react'

export default function GalleryPage() {
  const params = useParams()
  const hakoId = params.hakoId as string
  const router = useRouter()
  
  const [images, setImages] = useState<any[]>([])
  const [albums, setAlbums] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'discovery' | 'albums'>('discovery')
  const [showAlbumCreator, setShowAlbumCreator] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [showCinemaMode, setShowCinemaMode] = useState(false)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)
  const [columns, setColumns] = useState(4)

  // Selection states
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isBatchAdding, setIsBatchAdding] = useState(false)
  const [showAlbumPicker, setShowAlbumPicker] = useState(false)

  // Load column preference
  useEffect(() => {
    const saved = localStorage.getItem(`gallery_columns_${hakoId}`)
    if (saved) setColumns(parseInt(saved))
  }, [hakoId])

  const saveColumns = (val: number) => {
    setColumns(val)
    localStorage.setItem(`gallery_columns_${hakoId}`, val.toString())
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [imagesData, albumsData] = await Promise.all([
        getGalleryImages(hakoId, 'discovery'),
        getAlbums(hakoId)
      ])
      setImages(imagesData)
      setAlbums(albumsData)
    } catch (err) {
      console.error('Failed to fetch gallery data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hakoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = useCallback(async (postId: string) => {
    // We only update local state here as the actual unpinning is handled by GalleryGrid
    setImages(prev => prev.filter(img => img.id !== postId))
  }, [])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const [albumIdToDelete, setAlbumIdToDelete] = useState<string | null>(null)

  const handleCancelSelection = () => {
    const wasEditingAlbum = !!selectedAlbumId;
    setIsSelectionMode(false)
    setSelectedIds([])
    if (wasEditingAlbum) {
      setFilter('albums')
      setSelectedAlbumId(null)
    }
  }

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      const result = await deleteAlbum(albumId, hakoId)
      if (result.success) {
        fetchData()
      } else {
        alert('削除に失敗しました: ' + result.error)
      }
    } catch (err) {
      console.error('Delete Album Error:', err)
    }
  }

  const handleBatchAddToAlbum = async (albumId: string) => {
    if (!selectedAlbumId && selectedIds.length === 0) return
    setIsBatchAdding(true)
    try {
      const result = selectedAlbumId 
        ? await syncAlbumPhotos(selectedIds, albumId, hakoId)
        : await batchAddPostsToAlbum(selectedIds, albumId, hakoId)
        
      if (result.success) {
        setIsSelectionMode(false)
        setSelectedIds([])
        setShowAlbumPicker(false)
        fetchData()
        
        // Return to albums tab if we were editing one
        if (selectedAlbumId) {
          setFilter('albums')
          setSelectedAlbumId(null)
        }
      }
    } finally {
      setIsBatchAdding(false)
    }
  }

  const filteredImages = (selectedAlbumId && !isSelectionMode)
    ? images.filter(img => img.albumId === selectedAlbumId) 
    : images

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* 
          DEDICATED PICKER MODE OVERLAY 
          When in selection mode, we show a full-screen focused UI 
          to block other interactions and provide a clean picking experience.
      */}
      {isSelectionMode && (
        <div className="fixed inset-0 z-[200] theme-bg flex flex-col animate-in fade-in duration-300">
          {/* Picker Header */}
          <div className="shrink-0 bg-[#82d9bc] text-gray-800 p-6 md:p-8 shadow-2xl z-10">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button 
                  onClick={handleCancelSelection}
                  className="p-3 hover:bg-black/10 rounded-2xl transition-all active:scale-90"
                >
                  <X className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black">{selectedIds.length} 個選択中</h2>
                  <p className="text-xs font-black uppercase tracking-widest opacity-60">
                    {selectedAlbumId 
                      ? `アルバム「${albums.find(a => a.id === selectedAlbumId)?.name}」に追加します` 
                      : '追加先のアルバムを選択してください'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const allIds = filteredImages.map(img => img.id)
                    const isAllSelected = allIds.every(id => selectedIds.includes(id))
                    setSelectedIds(isAllSelected ? [] : allIds)
                  }}
                  className="px-6 py-3 bg-black/5 hover:bg-black/10 rounded-2xl text-xs font-black transition-all flex items-center gap-2"
                >
                  {filteredImages.every(img => selectedIds.includes(img.id)) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  すべて選択
                </button>
                  <button
                    onClick={() => {
                      if (selectedAlbumId) {
                        handleBatchAddToAlbum(selectedAlbumId)
                      } else {
                        setShowAlbumPicker(true)
                      }
                    }}
                    disabled={(!selectedAlbumId && selectedIds.length === 0) || isBatchAdding}
                    className="px-10 py-3 bg-white text-gray-900 rounded-2xl text-xs font-black hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center gap-3 shadow-xl shadow-black/10"
                  >
                    {isBatchAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderPlus className="w-5 h-5" />}
                    {selectedAlbumId ? '変更を保存' : '追加を確定'}
                  </button>
              </div>
            </div>
          </div>

          {/* Picker Grid Area */}
          <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar custom-scrollbar bg-black/20">
             <div className="max-w-6xl mx-auto py-8">
                <div className="px-8 mb-6">
                   <p className="text-xs theme-muted font-bold uppercase tracking-widest opacity-60 flex items-center gap-2">
                     <ImageIcon className="w-4 h-4" />
                     アルバムに追加したい写真をタップしてください
                   </p>
                </div>
                <GalleryGrid 
                  images={filteredImages} 
                  albums={albums}
                  hakoId={hakoId} 
                  onDelete={handleDelete}
                  columns={columns}
                  isSelectionMode={true}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                />
             </div>
          </div>
        </div>
      )}

      {/* NORMAL MODE UI (Always present but covered by overlay in selection mode) */}
      {/* Header Section */}
      <div className="shrink-0 border-b theme-border theme-bg sticky top-0 z-30">
        <div className="px-6 py-8 md:px-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black heading-gradient">
                共有ギャラリー
              </h1>
              <p className="text-[10px] theme-muted mt-1 uppercase tracking-[0.2em] font-black opacity-60">
                {isLoading ? '集計中...' : filter === 'albums' ? `${albums.length} ALBUMS` : `${images.length} MOMENTS`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              
              <button
                onClick={() => setShowComposer(true)}
                className="flex items-center gap-2 px-4 md:px-6 py-3 bg-white text-black rounded-2xl font-black text-xs hover:bg-gray-200 active:scale-95 transition-all shadow-xl shadow-white/5"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden md:inline">写真を投稿</span>
              </button>
              <button
                 onClick={() => setShowCinemaMode(true)}
                 disabled={images.length === 0}
                 className="flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 bg-[#82d9bc] text-gray-700 rounded-2xl font-black text-[10px] md:text-xs hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#82d9bc]/20 disabled:opacity-50"
               >
                <MonitorPlay className="w-4 h-4" />
                シネマ再生
              </button>
              <button
                onClick={() => setShowAlbumCreator(true)}
                className="flex items-center gap-2 px-3 py-2 md:px-6 md:py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[10px] md:text-xs hover:bg-white/10 active:scale-95 transition-all"
              >
                  <FolderPlusIcon className="w-4 h-4 text-[#82d9bc]" />
                 <span className="md:inline">アルバム作成</span>
               </button>
            </div>
          </div>

          {/* Inter-Tab Switcher */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto hide-scrollbar max-w-full">
            <button
              onClick={() => {
                setFilter('discovery')
                setSelectedIds([])
                setIsSelectionMode(false)
                setSelectedAlbumId(null)
              }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
                 filter === 'discovery' && !selectedAlbumId
                   ? 'bg-[#82d9bc] text-gray-700 shadow-lg shadow-[#82d9bc]/20' 
                   : 'text-gray-500 hover:text-white'
               }`}
            >
              新着写真
            </button>
            <button
              onClick={() => {
                setFilter('albums')
                setSelectedIds([])
                setIsSelectionMode(false)
              }}
              className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
                filter === 'albums' 
                  ? 'bg-[#82d9bc] text-gray-700 shadow-lg shadow-[#82d9bc]/20' 
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              アルバム
            </button>
          </div>

          {/* Column Switcher (Local ONLY) */}
          {!selectedAlbumId && filter === 'discovery' && (
            <div className="mt-6 flex items-center gap-3 bg-white/5 p-1 rounded-2xl w-fit">
              {[2, 3, 4, 5, 6].map(num => (
                <button
                   key={num}
                  onClick={() => saveColumns(num)}
                  className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all flex items-center justify-center ${
                    columns === num 
                      ? 'bg-[#82d9bc] text-gray-700 shadow-lg shadow-[#82d9bc]/20' 
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {num}
                </button>
              ))}
              <span className="text-[8px] font-black theme-muted uppercase tracking-widest px-2 opacity-40">Columns</span>
            </div>
          )}

          {/* Selected Album Indicator */}
          {selectedAlbumId && (
            <div className="mt-8 animate-in slide-in-from-top-4 duration-500">
              <div className="group relative overflow-hidden theme-elevated border border-[#82d9bc]/30 rounded-[2rem] p-6 md:p-8 shadow-2xl shadow-[#82d9bc]/5">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#82d9bc]/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#82d9bc] flex items-center justify-center shadow-lg shadow-[#82d9bc]/20">
                      <Library className="w-7 h-7 md:w-8 md:h-8 text-gray-800" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2.5 py-1 rounded-full bg-[#82d9bc]/10 border border-[#82d9bc]/20 text-[#82d9bc] text-[9px] font-black uppercase tracking-widest">
                          Collection
                        </span>
                        <p className="text-[10px] theme-muted font-bold uppercase tracking-wider opacity-60">
                          アルバム内の写真を表示中
                        </p>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-black theme-text tracking-tight">
                        {albums.find(a => a.id === selectedAlbumId)?.name || 'アルバム'}
                      </h2>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setFilter('discovery')
                        setIsSelectionMode(true)
                        const existingIds = images.filter(img => img.albumId === selectedAlbumId).map(img => img.id)
                        setSelectedIds(existingIds)
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-[#82d9bc] text-gray-800 rounded-2xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-[#82d9bc]/20"
                    >
                      <Plus className="w-4 h-4" />
                      アルバムを編集
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAlbumId(null)
                        setFilter('albums')
                      }}
                      className="p-3.5 bg-white/5 border theme-border theme-text rounded-2xl hover:bg-white/10 active:scale-95 transition-all"
                      title="アルバム一覧に戻る"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
             <Loader2 className="w-10 h-10 animate-spin text-[#82d9bc]/50" />
             <p className="text-xs font-black theme-muted uppercase tracking-widest">Memories are loading...</p>
          </div>
        ) : filter === 'albums' ? (
          <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p className="text-lg font-bold mb-2 text-white/40">アルバムはまだありません</p>
                <p className="text-sm">お気に入りの写真をコレクションにまとめてみましょう。</p>
              </div>
            ) : (
              <div 
                className={`grid gap-3 ${!columns ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : ''}`}
                style={{ 
                  gridTemplateColumns: columns 
                    ? `repeat(${columns}, minmax(0, 1fr))` 
                    : undefined 
                }}
              >
                {albums.map((album) => (
                  <div 
                    key={album.id} 
                    onClick={() => {
                      setSelectedAlbumId(album.id)
                      setFilter('discovery')
                    }}
                    className="flex flex-col gap-3 group cursor-pointer"
                  >
                    <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-white/5 hover:border-[#82d9bc]/30 hover:scale-[1.02] transition-all duration-300">
                      {album.previewPhotos && album.previewPhotos.length > 0 ? (
                        <div className={`grid h-full w-full gap-0.5 ${
                          album.previewPhotos.length === 1 ? 'grid-cols-1' :
                          album.previewPhotos.length === 2 ? 'grid-cols-2' :
                          'grid-cols-2 grid-rows-2'
                        }`}>
                          {album.previewPhotos.length === 3 ? (
                            <>
                              <div className="row-span-2 relative">
                                <Image src={album.previewPhotos[0]} alt="" fill className="object-cover" />
                              </div>
                              <div className="relative">
                                <Image src={album.previewPhotos[1]} alt="" fill className="object-cover" />
                              </div>
                              <div className="relative">
                                <Image src={album.previewPhotos[2]} alt="" fill className="object-cover" />
                              </div>
                            </>
                          ) : (
                            album.previewPhotos.map((url: string, idx: number) => (
                              <div key={idx} className="relative">
                                <Image src={url} alt="" fill className="object-cover" />
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gray-100/5 flex items-center justify-center">
                          <Library className="w-8 h-8 text-white/10" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <div className="flex flex-col">
                        <h4 className="text-sm font-black text-white group-hover:text-[#82d9bc] transition-colors truncate max-w-[140px]">
                          {album.name}
                        </h4>
                        <p className="text-[10px] text-white/40 font-bold">{album.totalCount || 0}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedAlbumId(album.id)
                            setFilter('discovery')
                            setIsSelectionMode(true)
                            // Pre-select photos already in this album
                            const existingIds = images.filter(img => img.albumId === album.id).map(img => img.id)
                            setSelectedIds(existingIds)
                          }}
                          className="p-1.5 bg-[#82d9bc]/10 hover:bg-[#82d9bc]/20 rounded-lg transition-colors"
                          title="写真を編集"
                        >
                          <Plus className="w-5 h-5 text-[#82d9bc]" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setAlbumIdToDelete(album.id)
                          }}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                          title="アルバムを削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GalleryGrid 
              images={filteredImages} 
              albums={albums}
              hakoId={hakoId} 
              onDelete={handleDelete}
              columns={columns}
              isSelectionMode={isSelectionMode}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
            />
          </div>
        )}
      </div>

      {/* Album Picker Modal */}
      {showAlbumPicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => !isBatchAdding && setShowAlbumPicker(false)} 
          />
          <div className="relative w-full max-w-md theme-elevated border theme-border rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#82d9bc]/20 flex items-center justify-center border border-[#82d9bc]/30">
                <Library className="w-6 h-6 text-[#82d9bc]" />
              </div>
              <div>
                <h3 className="text-xl font-black theme-text">アルバムを選択</h3>
                <p className="text-xs theme-muted font-bold uppercase tracking-widest">{selectedIds.length} 個の写真を追加します</p>
              </div>
            </div>

            <div className="grid gap-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
              {albums.length === 0 ? (
                <div className="text-center py-10 theme-surface rounded-3xl border border-dashed theme-border">
                  <p className="text-sm theme-muted font-bold">アルバムがありません</p>
                </div>
              ) : (
                albums.map(album => (
                  <button
                    key={album.id}
                    onClick={() => handleBatchAddToAlbum(album.id)}
                    disabled={isBatchAdding}
                    className="w-full flex items-center justify-between p-4 theme-surface hover:theme-elevated border theme-border rounded-2xl transition-all group active:scale-95"
                  >
                    <span className="font-black theme-text text-sm">{album.name}</span>
                    <Plus className="w-4 h-4 text-[#82d9bc] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowAlbumPicker(false)}
                disabled={isBatchAdding}
                className="w-full py-4 theme-surface border theme-border theme-text hover:theme-elevated rounded-2xl font-black text-sm transition-all"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Overlay */}
      {isBatchAdding && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
           <div className="theme-elevated p-8 rounded-[2rem] border theme-border shadow-2xl flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#82d9bc]" />
              <p className="text-xs font-black theme-text uppercase tracking-widest">Adding to album...</p>
           </div>
        </div>
      )}

      {showAlbumCreator && (
        <AlbumCreator 
          hakoId={hakoId}
          onClose={() => setShowAlbumCreator(false)}
          onSuccess={() => {
            setShowAlbumCreator(false)
            fetchData()
          }}
        />
      )}

      {showComposer && (
        <GalleryComposer
          hakoId={hakoId}
          onClose={() => setShowComposer(false)}
          onSuccess={() => {
            setShowComposer(false)
            fetchData()
          }}
        />
      )}

      {showCinemaMode && (
        <GalleryCinemaMode
          images={selectedAlbumId ? images.filter(img => img.albumId === selectedAlbumId) : images}
          onClose={() => setShowCinemaMode(false)}
        />
      )}
      {/* Album Deletion Confirmation */}
      {albumIdToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={() => setAlbumIdToDelete(null)}
          />
          <div className="relative w-full max-w-sm theme-elevated border theme-border rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-black theme-text mb-2">アルバムを削除しますか？</h3>
              <p className="text-sm theme-muted font-bold mb-8">
                中の写真は削除されませんが、<br />
                アルバムというまとめがなくなります。
              </p>
              
              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={async () => {
                    const id = albumIdToDelete;
                    setAlbumIdToDelete(null);
                    await handleDeleteAlbum(id);
                  }}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-red-500/20"
                >
                  削除する
                </button>
                <button
                  onClick={() => setAlbumIdToDelete(null)}
                  className="w-full py-4 bg-white/5 border theme-border theme-text rounded-2xl font-black text-xs hover:bg-white/10 active:scale-95 transition-all"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
