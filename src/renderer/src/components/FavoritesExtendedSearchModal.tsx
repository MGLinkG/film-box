import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Film, Heart } from 'lucide-react'

export function FavoritesExtendedSearchModal({
  movie,
  onClose,
  onMovieClick,
  favorites,
  onToggleFavorite,
  isMovieBlocked
}: {
  movie: any | null
  onClose: () => void
  onMovieClick: (movie: any) => void
  favorites: any[]
  onToggleFavorite: (movie: any, e: React.MouseEvent) => void
  isMovieBlocked: (movie: any) => boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [groups, setGroups] = useState<{ keyword: string; results: any[] }[]>([])

  const runSearch = useCallback(async () => {
    if (!movie) return
    const title = (movie.titleZh || movie.title || '').trim()
    if (!title) return

    setLoading(true)
    setError(null)
    setGroups([])

    try {
      const keywords = new Set(['电影', '剧场版', 'OVA', '特别篇'])

      // 智能推断季数：如果带有“第一季”，自动加搜二、三、四季
      const seasonMatch = title.match(/第([一二三四五六七八九十\d]+)季/)
      if (seasonMatch) {
        keywords.add('第一季')
        keywords.add('第二季')
        keywords.add('第三季')
        keywords.add('第四季')
      }
      const sMatch = title.match(/S(\d+)/i)
      if (sMatch) {
        keywords.add('S01')
        keywords.add('S02')
        keywords.add('S03')
        keywords.add('S04')
      }
      if (!seasonMatch && !sMatch) {
        keywords.add('第二季')
        keywords.add('第三季')
      }

      // 提取纯片名，去除季数干扰以提高命中率
      let baseTitle = title
        .replace(/第[一二三四五六七八九十\d]+季/g, '')
        .replace(/S\d+/ig, '')
        .trim()

      if (!baseTitle) baseTitle = title

      const newGroups: { keyword: string; results: any[] }[] = []

      for (const keyword of Array.from(keywords)) {
        // @ts-ignore
        const res = await window.api.searchSites(`${baseTitle} ${keyword}`)
        const list = Array.isArray(res?.results) ? res.results : []
        const uniqByUrl = new Map<string, any>()

        for (const item of list) {
          if (!item?.url) continue
          if (movie.url && item.url === movie.url) continue // 排除自己
          if (isMovieBlocked(item)) continue
          if (!uniqByUrl.has(item.url)) uniqByUrl.set(item.url, item)
        }

        if (uniqByUrl.size > 0) {
          newGroups.push({ keyword, results: Array.from(uniqByUrl.values()) })
        }
      }

      setGroups(newGroups)
    } catch (e: any) {
      setError(e?.message || '扩展检索失败')
    } finally {
      setLoading(false)
    }
  }, [movie, isMovieBlocked])

  useEffect(() => {
    if (movie) {
      runSearch()
    }
  }, [movie, runSearch])

  if (!movie) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.98, opacity: 0 }}
          className="w-full max-w-4xl bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
            <div className="min-w-0">
              <div className="text-lg font-bold truncate">扩展检索</div>
              <div className="text-xs text-secondary mt-1 truncate">
                正在为您寻找《{movie.titleZh || movie.title}》的相关系列作品...
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-secondary hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-secondary space-y-4">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm">正在全网深度检索中，请稍候...</div>
              </div>
            )}

            {!loading && error && (
              <div className="text-sm text-red-400 text-center py-8">{error}</div>
            )}

            {!loading && !error && groups.length === 0 && (
              <div className="text-sm text-secondary text-center py-8">未找到其他相关扩展作品</div>
            )}

            {!loading && !error && groups.length > 0 && (
              <div className="space-y-8">
                {groups.map((g) => (
                  <div key={g.keyword} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{g.keyword}</h3>
                      <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                        {g.results.length} 部
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {g.results.map((m: any) => {
                        const isFav = favorites.some((f) => f.id === m.id || f.url === m.url)
                        return (
                          <div
                            key={m.url}
                            className="group relative flex flex-col rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition-all text-left"
                          >
                            <div 
                              className="aspect-[2/3] w-full relative bg-black/40 flex items-center justify-center overflow-hidden cursor-pointer"
                              onClick={() => {
                                onClose()
                                onMovieClick(m)
                              }}
                            >
                              {m.poster ? (
                                <img src={m.poster} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                              ) : (
                                <Film size={24} className="text-white/10" />
                              )}
                              
                              {/* 卡片级快速收藏按钮 */}
                              <button
                                onClick={(e) => onToggleFavorite(m, e)}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 transition-all duration-300 hover:bg-white/20 z-10 opacity-0 group-hover:opacity-100"
                                title={isFav ? "取消收藏" : "加入收藏"}
                              >
                                <Heart
                                  size={14}
                                  className={isFav ? 'fill-red-500 text-red-500' : 'text-white'}
                                />
                              </button>

                              {m.rating && m.rating !== 'N/A' && (
                                <div className="absolute bottom-2 left-2 bg-accent/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg">
                                  {m.rating}
                                </div>
                              )}
                            </div>
                            <div 
                              className="p-3 flex flex-col flex-1 cursor-pointer"
                              onClick={() => {
                                onClose()
                                onMovieClick(m)
                              }}
                            >
                              <div className="text-sm font-medium text-white/90 line-clamp-2 leading-snug" style={{ textWrap: 'balance' }}>
                                {m.titleZh || m.title}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}