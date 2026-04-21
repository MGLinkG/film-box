import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Search,
  Settings as SettingsIcon,
  Film,
  Magnet,
  X,
  Globe,
  LogIn,
  ExternalLink,
  Copy,
  Check,
  Info,
  Compass,
  RefreshCw,
  DownloadCloud,
  PlayCircle,
  PauseCircle,
  Trash2,
  Heart,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Folder,
  ShieldAlert
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FavoritesExtendedSearchModal } from './components/FavoritesExtendedSearchModal'

const CHANNELS = [
  { label: '电影', value: '1' },
  { label: '剧集', value: '2' },
  { label: '综艺', value: '3' },
  { label: '动漫', value: '4' },
  { label: '短剧', value: '30' },
  { label: '伦理', value: '23' }
]

const GENRES = [
  '全部',
  '剧情',
  '喜剧',
  '动作',
  '爱情',
  '科幻',
  '动画',
  '悬疑',
  '惊悚',
  '恐怖',
  '犯罪',
  '同性',
  '音乐',
  '歌舞',
  '传记',
  '历史',
  '战争',
  '西部',
  '奇幻',
  '冒险',
  '灾难',
  '武侠',
  '伦理',
  '情色',
  'R18'
]
const YEARS = [
  '全部',
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2014',
  '2013',
  '2012',
  '2011',
  '2010'
]
const REGIONS = [
  '全部',
  '大陆',
  '美国',
  '香港',
  '台湾',
  '韩国',
  '日本',
  '法国',
  '英国',
  '德国',
  '泰国',
  '印度',
  '欧洲地区',
  '东南亚地区',
  '其他'
]
const SORTS = [
  { label: '最近更新', value: 'time' },
  { label: '最多播放', value: 'hits' },
  { label: '豆瓣评分', value: 'score' }
]

export default function App() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<
    'discover' | 'favorites' | 'local' | 'downloads' | 'settings'
  >('discover')

  // Favorites State
  const [favorites, setFavorites] = useState<any[]>(() => {
    const saved = localStorage.getItem('movie_favorites')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {}
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('movie_favorites', JSON.stringify(favorites))
  }, [favorites])

  // Blocked Tags State
  const [blockedTags, setBlockedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('movie_blocked_tags')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {}
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('movie_blocked_tags', JSON.stringify(blockedTags))
  }, [blockedTags])

  const [deepFilterEnabled, setDeepFilterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('movie_deep_filter_enabled')
    if (saved === 'true') return true
    if (saved === 'false') return false
    return false
  })

  useEffect(() => {
    localStorage.setItem('movie_deep_filter_enabled', deepFilterEnabled ? 'true' : 'false')
  }, [deepFilterEnabled])

  const metaCacheRef = useRef<Map<string, string[]>>(new Map())

  const normalizeFilterTag = (tag: string) => {
    return tag.replace(/\s+/g, '').replace(/片$/g, '').trim()
  }

  const isMovieBlocked = (movie: any) => {
    if (!blockedTags || blockedTags.length === 0) return false
    const blocked = blockedTags.map(normalizeFilterTag)
    const tags = Array.isArray(movie?.tags) ? movie.tags : movie?.tags ? [movie.tags] : []
    const normalizedTags = tags
      .filter(Boolean)
      .map((t: string) => normalizeFilterTag(String(t)))
      .filter(Boolean)
    const titleText = `${movie?.titleZh || ''}${movie?.title || ''}`.replace(/\s+/g, '').trim()
    return blocked.some((b) => {
      if (b && titleText.includes(b)) return true
      return normalizedTags.some((t) => t === b || t.includes(b) || b.includes(t))
    })
  }

  const [localPaths, setLocalPaths] = useState<string[]>(() => {
    const saved = localStorage.getItem('movie_local_paths')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return []
  })

  const [localBindings, setLocalBindings] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('movie_local_bindings')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return {}
  })
  const localBindingsRef = useRef<Record<string, string>>({})

  const [localSeries, setLocalSeries] = useState<
    { id: string; title: string; folderPath: string; episodes: number[]; fileCount: number }[]
  >([])

  const [localMissingMap, setLocalMissingMap] = useState<
    Record<string, { loading: boolean; missing: { name: string; urls: string[] }[] }>
  >({})

  useEffect(() => {
    localStorage.setItem('movie_local_paths', JSON.stringify(localPaths))
  }, [localPaths])

  useEffect(() => {
    localStorage.setItem('movie_local_bindings', JSON.stringify(localBindings))
  }, [localBindings])
  useEffect(() => {
    localBindingsRef.current = localBindings
  }, [localBindings])

  const parseEpisodeFromName = (name: string): number | null => {
    const m1 = name.match(/第\s*0*([0-9]{1,4})\s*集/)
    if (m1) return Number(m1[1])
    const m2 = name.match(/S[0-9]{1,2}E\s*0*([0-9]{1,4})/i)
    if (m2) return Number(m2[1])
    const m3 = name.match(/\bEP?\s*0*([0-9]{1,4})\b/i)
    if (m3) return Number(m3[1])
    const m4 = name.match(/\bE\s*0*([0-9]{1,4})\b/i)
    if (m4) return Number(m4[1])
    return null
  }

  const refreshLocalLibrary = useCallback(async () => {
    if (localPaths.length === 0) {
      setLocalSeries([])
      return
    }
    try {
      // @ts-ignore
      const res = await window.api.scanLocalLibrary(localPaths)
      setLocalSeries(res)

      for (const s of res) {
        const folderPath = s.folderPath
        if (!folderPath) continue
        const exists = localBindingsRef.current[folderPath]
        if (exists) continue
        try {
          // @ts-ignore
          const searchRes = await window.api.searchSites(s.title)
          const first = searchRes?.results?.[0]
          if (first?.url) {
            setLocalBindings((prev) => {
              if (prev[folderPath]) return prev
              return { ...prev, [folderPath]: first.url }
            })
          }
        } catch {}
      }
    } catch (e) {
      console.error(e)
      setLocalSeries([])
    }
  }, [localPaths])

  const checkLocalMissing = useCallback(
    async (series: { folderPath: string; episodes: number[] }) => {
      const movieUrl = localBindings[series.folderPath]
      if (!movieUrl) return

      setLocalMissingMap((prev) => ({
        ...prev,
        [series.folderPath]: { loading: true, missing: prev[series.folderPath]?.missing || [] }
      }))

      try {
        // @ts-ignore
        const { onlineLinks } = await window.api.fetchMovieDetails(movieUrl)
        const localSet = new Set(series.episodes)
        const missing = (onlineLinks as { name: string; urls: string[] }[]).filter((l) => {
          const ep = parseEpisodeFromName(l.name)
          if (!ep) return false
          return !localSet.has(ep)
        })
        setLocalMissingMap((prev) => ({
          ...prev,
          [series.folderPath]: { loading: false, missing }
        }))
      } catch (e) {
        console.error(e)
        setLocalMissingMap((prev) => ({
          ...prev,
          [series.folderPath]: { loading: false, missing: prev[series.folderPath]?.missing || [] }
        }))
      }
    },
    [localBindings]
  )

  useEffect(() => {
    if (activeTab === 'local') {
      refreshLocalLibrary()
    }
  }, [activeTab, refreshLocalLibrary])

  const toggleFavorite = (movie: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === movie.id)
      if (exists) {
        return prev.filter((f) => f.id !== movie.id)
      } else {
        return [...prev, movie]
      }
    })
  }

    // Downloads State
  const [downloads, setDownloads] = useState<
    {
      id: string
      title: string
      name: string
      poster?: string
      progress: number
      speed?: string
      status: string
      error?: string
      filePath?: string
    }[]
  >([])
  const [expandedDownloadGroups, setExpandedDownloadGroups] = useState<Record<string, boolean>>({})

  const toggleDownloadGroup = (title: string) => {
    setExpandedDownloadGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  const handleCancelAllDownloads = () => {
    if (confirm('确定要取消所有下载任务吗？')) {
      const activeDls = downloads.filter(
        (d) => d.status === 'downloading' || d.status === 'parsing' || d.status === 'paused'
      )
      activeDls.forEach((dl) => {
        // @ts-ignore
        window.api.cancelDownload(dl.id)
      })
      setDownloads((prev) =>
        prev.map((d) =>
          d.status === 'downloading' || d.status === 'parsing' || d.status === 'paused'
            ? { ...d, status: 'aborted' }
            : d
        )
      )
    }
  }

  const handleCancelGroupDownloads = (e: React.MouseEvent, groupDls: any[]) => {
    e.stopPropagation()
    if (confirm('确定要取消该影视的所有下载任务吗？')) {
      const activeDls = groupDls.filter(
        (d) => d.status === 'downloading' || d.status === 'parsing' || d.status === 'paused'
      )
      activeDls.forEach((dl) => {
        // @ts-ignore
        window.api.cancelDownload(dl.id)
      })
      const idsToAbort = new Set(activeDls.map((d) => d.id))
      setDownloads((prev) =>
        prev.map((d) => (idsToAbort.has(d.id) ? { ...d, status: 'aborted' } : d))
      )
    }
  }

  const groupedDownloads = downloads.reduce(
    (acc, curr) => {
      if (!acc[curr.title]) {
        acc[curr.title] = []
      }
      acc[curr.title].push(curr)
      return acc
    },
    {} as Record<string, typeof downloads>
  )

  useEffect(() => {
    // @ts-ignore
    window.api.onDownloadProgress((data: any) => {
      setDownloads((prev) => {
        const existing = prev.find((d) => d.id === data.id)
        if (existing) {
          return prev.map((d) => (d.id === data.id ? { ...d, ...data } : d))
        }
        // Need title and name for new download. But the event only gives id and status.
        // We can store title and name when starting download!
        return prev
      })
    })
  }, [])

  const handleStartDownload = async (
    link: { name: string; urls: string[] },
    folderPath?: string,
    skipNavigation?: boolean,
    overrideTitle?: string,
    overridePoster?: string
  ) => {
    const movieTitle =
      overrideTitle || selectedMovie?.titleZh || selectedMovie?.title || '未命名'
    const moviePoster = overridePoster || selectedMovie?.poster
    // @ts-ignore
        const res = await window.api.startDownload({
          playUrls: link.urls,
          name: link.name,
          title: movieTitle,
          folderPath
        })
        if (res.success) {
          setDownloads((prev) => [
            ...prev,
            {
              id: res.downloadId || Date.now().toString(),
              title: movieTitle,
              name: link.name,
              poster: moviePoster,
              progress: 0,
              status: 'parsing',
              filePath: res.finalFilePath
            }
          ])
      if (!skipNavigation) {
        setActiveTab('downloads')
      }
    } else {
      if (res.error !== '已取消') {
        alert(`下载失败：${res.error}`)
      }
    }
  }

  const handleDownloadAll = async () => {
    if (onlineLinks.length === 0) return

    // @ts-ignore
    const folderPath = await window.api.selectFolder()
    if (!folderPath) return

    // Give user a feedback immediately
    alert(`已选择保存目录，准备开始下载 ${onlineLinks.length} 个任务...`)

    setActiveTab('downloads')

    for (const link of onlineLinks) {
      await handleStartDownload(link, folderPath, true)
    }
  }
  const [query, setQuery] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [activeBrowserUrl, setActiveBrowserUrl] = useState<string | null>(null)

  // Removed copiedUrl state and handleCopyUrl function
  const [selectedMovie, setSelectedMovie] = useState<any>(null)
  const [extendedSearchMovie, setExtendedSearchMovie] = useState<any>(null)
  const [resourceLinks, setResourceLinks] = useState<{ title: string; url: string }[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Discover Movies State
  const [discoverFilters, setDiscoverFilters] = useState({
    channel: '1',
    type: '全部',
    region: '全部',
    language: '全部',
    year: '全部',
    sort: 'time'
  })
  const [discoverResults, setDiscoverResults] = useState<any[]>([])
  const [isDiscoveringMovies, setIsDiscoveringMovies] = useState(false)
  const [discoverMoviesPage, setDiscoverMoviesPage] = useState(1)
  const [hasMoreDiscoverMovies, setHasMoreDiscoverMovies] = useState(true)
  const discoverMoviesObserverTarget = useRef<HTMLDivElement>(null)

  const handleFetchDiscoverMovies = useCallback(
    async (pageToFetch = 1, filters = discoverFilters) => {
      if (isDiscoveringMovies || (pageToFetch > 1 && !hasMoreDiscoverMovies)) return

      setIsDiscoveringMovies(true)
      try {
        // @ts-ignore
        const res = await window.api.fetchDiscoverMovies({
          channel: filters.channel,
          type: filters.type === '全部' ? '' : filters.type,
          region: filters.region === '全部' ? '' : filters.region,
          language: filters.language === '全部' ? '' : filters.language,
          year: filters.year === '全部' ? '' : filters.year,
          sort: filters.sort,
          page: pageToFetch
        })

        if (pageToFetch === 1) {
          setDiscoverResults(res)
        } else {
          setDiscoverResults((prev) => {
            const newItems = res.filter((item: any) => !prev.some((p) => p.id === item.id))
            return [...prev, ...newItems]
          })
        }
        setDiscoverMoviesPage(pageToFetch)
        // Pdy3 usually returns 72 items per page, if less, it's the end.
        setHasMoreDiscoverMovies(res.length >= 20)
      } catch (e) {
        console.error(e)
      } finally {
        setIsDiscoveringMovies(false)
      }
    },
    [isDiscoveringMovies, hasMoreDiscoverMovies, discoverFilters]
  )

  // Initial fetch for discover
  useEffect(() => {
    if (activeTab === 'discover' && discoverResults.length === 0) {
      handleFetchDiscoverMovies(1)
    }
  }, [activeTab])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreDiscoverMovies &&
          !isDiscoveringMovies &&
          discoverResults.length > 0
        ) {
          handleFetchDiscoverMovies(discoverMoviesPage + 1)
        }
      },
      { threshold: 0.1 }
    )

    if (discoverMoviesObserverTarget.current) {
      observer.observe(discoverMoviesObserverTarget.current)
    }

    return () => {
      if (discoverMoviesObserverTarget.current) {
        observer.unobserve(discoverMoviesObserverTarget.current)
      }
    }
  }, [
    discoverMoviesObserverTarget.current,
    hasMoreDiscoverMovies,
    isDiscoveringMovies,
    discoverMoviesPage,
    discoverResults.length,
    handleFetchDiscoverMovies
  ])

  // Removed handleCopyUrl definition

  const [onlineLinks, setOnlineLinks] = useState<{ name: string; urls: string[] }[]>([])

  const handleMovieClick = (movie: any) => {
    setSelectedMovie(movie)
    setIsLoadingLinks(true)
    setResourceLinks([])
    setOnlineLinks([])
    // @ts-ignore
    window.api
      .fetchMovieDetails(movie.url)
      .then(({ onlineLinks, magnetLinks }) => {
        setResourceLinks(magnetLinks)
        setOnlineLinks(onlineLinks)
        setIsLoadingLinks(false)
      })
      .catch((e) => {
        console.error(e)
        setIsLoadingLinks(false)
      })
  }

  const handleCopyResource = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedLink(url)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsTranslating(true) // Re-using isTranslating as loading state
    setHasSearched(false)

    try {
      // Call the Electron main process via our exposed API
      // @ts-ignore - defined in preload.d.ts
      const response = await window.api.searchSites(query)

      let nextResults = response.results || []
      if (deepFilterEnabled && blockedTags.length > 0) {
        const batchSize = 5
        const enriched = [...nextResults]
        for (let i = 0; i < enriched.length; i += batchSize) {
          const batch = enriched.slice(i, i + batchSize)
          // @ts-ignore
          const metas = await Promise.all(
            batch.map(async (m: any) => {
              const url = m?.url
              if (!url) return { tags: [] }
              const cached = metaCacheRef.current.get(url)
              if (cached) return { tags: cached }
              try {
                // @ts-ignore
                const meta = await window.api.fetchMovieMeta(url)
                const tags = Array.isArray(meta?.tags) ? meta.tags : []
                metaCacheRef.current.set(url, tags)
                return { tags }
              } catch {
                metaCacheRef.current.set(url, [])
                return { tags: [] }
              }
            })
          )
          for (let j = 0; j < batch.length; j++) {
            const idx = i + j
            const baseTags = Array.isArray(enriched[idx]?.tags) ? enriched[idx].tags : []
            const extraTags = metas[j]?.tags || []
            enriched[idx] = { ...enriched[idx], tags: [...baseTags, ...extraTags] }
          }
        }
        nextResults = enriched
      }

      setResults(nextResults)

      if (response.authRequired) {
        setShowLoginPrompt(true)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setIsTranslating(false)
      setHasSearched(true)
    }
  }

  return (
    <div className="flex h-screen w-full bg-background text-primary overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-white/5 flex flex-col p-4 z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Film size={18} className="text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">MovieFinder</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab('discover')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'discover'
                ? 'bg-white/10 text-white'
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass size={18} />
            发现影视
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'favorites'
                ? 'bg-white/10 text-white'
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Heart size={18} />
            我的收藏
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'local'
                ? 'bg-white/10 text-white'
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Folder size={18} />
            本地资源
          </button>
          <button
            onClick={() => setActiveTab('downloads')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'downloads'
                ? 'bg-white/10 text-white'
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <DownloadCloud size={18} />
            下载管理
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'settings'
                ? 'bg-white/10 text-white'
                : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <SettingsIcon size={18} />
            {t('settings')}
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Discover Content */}
        <div
          className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'discover' ? 'block' : 'hidden'}`}
        >
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Search Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">发现影视</h2>
                <button
                  onClick={() => {
                    if (hasSearched) {
                      handleSearch()
                    } else {
                      setDiscoverResults([])
                      handleFetchDiscoverMovies(1)
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <RefreshCw
                    size={16}
                    className={isDiscoveringMovies || isTranslating ? 'animate-spin' : ''}
                  />
                  刷新
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search
                    size={20}
                    className="text-secondary group-focus-within:text-accent transition-colors"
                  />
                </div>
                <input
                  type="text"
                  value={query}
                  aria-label={t('searchPlaceholder')}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    if (e.target.value === '') {
                      setHasSearched(false)
                      setResults([])
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t('searchPlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-transparent transition-all"
                />
                <button
                  onClick={handleSearch}
                  disabled={isTranslating || !query.trim()}
                  className="absolute inset-y-2 right-2 px-6 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {t('search')}
                </button>
              </div>
              {/* Loading hint */}
              {isTranslating && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-accent flex items-center gap-2"
                >
                  <Globe size={14} className="animate-spin" />
                  {t('search')}...
                </motion.p>
              )}
            </div>

            {/* Results Grid (Shows when searching) */}
            {hasSearched && !isTranslating ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {results.filter((m) => !isMovieBlocked(m)).length > 0 ? (
                  results.filter((m) => !isMovieBlocked(m)).map((movie) => (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={movie.id}
                      className="group relative flex flex-col rounded-xl overflow-hidden bg-surface border border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => handleMovieClick(movie)}
                      aria-label={`View details for ${movie.title}`}
                    >
                      <div className="aspect-[2/3] w-full relative bg-black/40 flex items-center justify-center overflow-hidden">
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                              ;(e.target as HTMLImageElement).parentElement?.classList.add(
                                'fallback-bg'
                              )
                            }}
                          />
                        ) : (
                          <Film size={32} className="text-white/10" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExtendedSearchMovie(movie)
                          }}
                          className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title="扩展检索：自动匹配电影/OVA/相关季数"
                        >
                          <Search size={12} className="text-accent" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                            扩展检索
                          </span>
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(movie, e)}
                          className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 hover:bg-white/20"
                        >
                          <Heart
                            size={14}
                            className={
                              favorites.some((f) => f.id === movie.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-white'
                            }
                          />
                        </button>
                        {movie.rating && movie.rating !== 'N/A' && (
                          <div className="absolute top-10 left-2 bg-accent/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg">
                            {movie.rating}
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1 w-full">
                        <h3
                          className="text-sm font-bold text-white mb-1 line-clamp-1"
                          style={{ textWrap: 'balance' }}
                        >
                          {i18n.language === 'zh' || i18n.language === 'zh_TW'
                            ? movie.titleZh || movie.title
                            : movie.title}
                        </h3>
                        {movie.title !== movie.titleZh && movie.titleZh && (
                          <p className="text-[10px] text-white/50 mb-2 truncate">{movie.title}</p>
                        )}
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center text-secondary border border-dashed border-white/10 rounded-xl">
                    {t('noResults')}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Filters */}
                <div className="bg-surface border border-white/5 rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-secondary text-sm font-medium w-12 shrink-0">频道</span>
                    <div className="flex flex-wrap gap-2">
                      {CHANNELS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => {
                            const newFilters = {
                              ...discoverFilters,
                              channel: c.value,
                              type: '全部'
                            }
                            setDiscoverFilters(newFilters)
                            handleFetchDiscoverMovies(1, newFilters)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${discoverFilters.channel === c.value ? 'bg-accent text-white font-medium' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-secondary text-sm font-medium w-12 shrink-0">类型</span>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, type: c }
                            setDiscoverFilters(newFilters)
                            handleFetchDiscoverMovies(1, newFilters)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${discoverFilters.type === c ? 'bg-accent text-white font-medium' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-secondary text-sm font-medium w-12 shrink-0">地区</span>
                    <div className="flex flex-wrap gap-2">
                      {REGIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, region: c }
                            setDiscoverFilters(newFilters)
                            handleFetchDiscoverMovies(1, newFilters)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${discoverFilters.region === c ? 'bg-accent text-white font-medium' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-secondary text-sm font-medium w-12 shrink-0">年份</span>
                    <div className="flex flex-wrap gap-2">
                      {YEARS.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, year: c }
                            setDiscoverFilters(newFilters)
                            handleFetchDiscoverMovies(1, newFilters)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${discoverFilters.year === c ? 'bg-accent text-white font-medium' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-secondary text-sm font-medium w-12 shrink-0">排序</span>
                    <div className="flex flex-wrap gap-2">
                      {SORTS.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, sort: c.value }
                            setDiscoverFilters(newFilters)
                            handleFetchDiscoverMovies(1, newFilters)
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${discoverFilters.sort === c.value ? 'bg-accent text-white font-medium' : 'text-secondary hover:bg-white/5 hover:text-white'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Discover Results Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                {discoverResults
                   .filter((m) => !isMovieBlocked(m))
                  .map((movie) => (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={movie.id}
                      className="group relative flex flex-col rounded-xl overflow-hidden bg-surface border border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={() => handleMovieClick(movie)}
                      aria-label={`View details for ${movie.title}`}
                    >
                      <div className="aspect-[2/3] w-full relative bg-black/40 flex items-center justify-center overflow-hidden">
                        {movie.poster ? (
                          <img
                            src={movie.poster}
                            alt=""
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).style.display = 'none'
                              ;(e.target as HTMLImageElement).parentElement?.classList.add(
                                'fallback-bg'
                              )
                            }}
                          />
                        ) : (
                          <Film size={32} className="text-white/10" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExtendedSearchMovie(movie)
                          }}
                          className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title="扩展检索：自动匹配电影/OVA/相关季数"
                        >
                          <Search size={12} className="text-accent" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                            扩展检索
                          </span>
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(movie, e)}
                          className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 hover:bg-white/20"
                        >
                          <Heart
                            size={14}
                            className={
                              favorites.some((f) => f.id === movie.id)
                                ? 'fill-red-500 text-red-500'
                                : 'text-white'
                            }
                          />
                        </button>
                        {movie.rating && movie.rating !== 'N/A' && movie.rating !== '--' && (
                          <div className="absolute top-10 left-2 bg-accent/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg">
                            {movie.rating}
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1 w-full">
                        <h3
                          className="text-sm font-bold text-white mb-1 line-clamp-1"
                          style={{ textWrap: 'balance' }}
                        >
                          {i18n.language === 'zh' || i18n.language === 'zh_TW'
                            ? movie.titleZh || movie.title
                            : movie.title}
                        </h3>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Discover Loader */}
                {hasMoreDiscoverMovies && discoverResults.length > 0 && (
                  <div
                    ref={discoverMoviesObserverTarget}
                    className="py-12 flex justify-center items-center"
                  >
                    <div className="flex items-center gap-2 text-secondary text-sm">
                      <Globe size={16} className="animate-spin" aria-hidden="true" />
                      <span aria-live="polite">加载更多…</span>
                    </div>
                  </div>
                )}
                {!hasMoreDiscoverMovies && discoverResults.length > 0 && (
                  <div className="py-12 text-center text-secondary text-sm border-t border-white/5">
                    没有更多影视了
                  </div>
                )}
                {isDiscoveringMovies && discoverResults.length === 0 && (
                  <div className="py-24 flex justify-center items-center">
                    <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Magnet Links Modal */}
        <AnimatePresence>
          {selectedMovie && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-surface border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
              >
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold truncate pr-4">
                      {i18n.language === 'zh' || i18n.language === 'zh_TW'
                        ? selectedMovie.titleZh || selectedMovie.title
                        : selectedMovie.title}
                    </h3>
                    <button
                      onClick={() => toggleFavorite(selectedMovie)}
                      className="p-1.5 hover:bg-white/10 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      title={
                        favorites.some((f) => f.id === selectedMovie.id) ? '取消收藏' : '加入收藏'
                      }
                    >
                      <Heart
                        size={20}
                        className={
                          favorites.some((f) => f.id === selectedMovie.id)
                            ? 'fill-red-500 text-red-500'
                            : 'text-white/50 hover:text-white'
                        }
                      />
                    </button>
                  </div>
                  <button
                    onClick={() => setSelectedMovie(null)}
                    aria-label="Close modal"
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                  <div className="w-full md:w-1/3 p-6 bg-black/20 hidden md:block">
                    {selectedMovie.poster ? (
                      <img
                        src={selectedMovie.poster}
                        alt={selectedMovie.title}
                        className="w-full rounded-xl object-cover shadow-lg border border-white/5 aspect-[2/3]"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full rounded-xl shadow-lg border border-white/5 aspect-[2/3] bg-white/5 flex items-center justify-center">
                        <Film size={48} className="text-white/20" />
                      </div>
                    )}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {selectedMovie.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white/10 rounded text-xs text-secondary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        <Film size={18} className="text-accent" />
                        在线资源 ({onlineLinks.length})
                      </h4>
                      <div className="flex gap-2">
                        {onlineLinks.length > 0 && (
                          <button
                            onClick={handleDownloadAll}
                            className="text-xs flex items-center gap-1 text-white bg-accent hover:bg-accent/90 px-3 py-1.5 rounded transition-colors"
                          >
                            <DownloadCloud size={14} />
                            一键下载全集
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setActiveBrowserUrl(selectedMovie.url)
                            setSelectedMovie(null)
                          }}
                          className="text-xs flex items-center gap-1 text-secondary hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                        >
                          <ExternalLink size={14} />
                          网页原站打开
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                      {/* Online Links Section */}
                      {isLoadingLinks ? (
                        <div className="flex flex-col items-center justify-center space-y-4 py-8">
                          <div
                            className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin"
                            aria-hidden="true"
                          ></div>
                          <p className="text-secondary text-sm" aria-live="polite">
                            正在深度解析网页提取资源…
                          </p>
                        </div>
                      ) : onlineLinks.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {onlineLinks.map((link, idx) => (
                            <button
                              key={`online-${idx}`}
                              onClick={() => handleStartDownload(link)}
                              className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-accent/50 hover:bg-accent/10 transition-colors flex items-center justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            >
                              <span className="text-sm font-medium text-white/90 truncate">
                                {link.name}
                              </span>
                              <DownloadCloud
                                size={16}
                                className="text-secondary group-hover:text-accent"
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {/* Magnet Links Section */}
                      {resourceLinks.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-white flex items-center gap-2 text-sm border-t border-white/5 pt-4">
                            <Magnet size={16} className="text-accent" />
                            磁力链接 ({resourceLinks.length})
                          </h4>
                          <div className="space-y-3">
                            {resourceLinks.map((link, idx) => (
                              <div
                                key={idx}
                                className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/20 transition-colors flex flex-col gap-3 group"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <p className="text-sm font-medium text-white/90 break-words flex-1 line-clamp-2 group-hover:line-clamp-none transition-all">
                                    {link.title}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    readOnly
                                    value={link.url}
                                    aria-label="Resource Link"
                                    className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-1.5 text-xs text-secondary focus:outline-none focus-visible:ring-1 focus-visible:ring-accent font-mono"
                                  />
                                  <button
                                    onClick={() => handleCopyResource(link.url)}
                                    aria-label="Copy Link"
                                    className="p-1.5 bg-accent text-white rounded hover:bg-accent/90 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                                    title="复制链接"
                                  >
                                    {copiedLink === link.url ? (
                                      <Check size={14} aria-hidden="true" />
                                    ) : (
                                      <Copy size={14} aria-hidden="true" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isLoadingLinks &&
                        resourceLinks.length === 0 &&
                        onlineLinks.length === 0 && (
                          <div className="flex flex-col items-center justify-center space-y-4 text-secondary py-12">
                            <Info size={32} className="opacity-20" />
                            <p className="text-sm">未能提取到可用的播放或下载资源</p>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'favorites' ? 'block' : 'hidden'}`}
        >
          <div className="max-w-7xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">我的收藏</h2>

            {favorites.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-secondary bg-surface rounded-xl border border-white/5 shadow-sm">
                <Heart size={48} className="opacity-20 mb-4" />
                <p>暂无收藏的影视</p>
                <button
                  onClick={() => setActiveTab('discover')}
                  className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-white transition-colors"
                >
                  去发现看看
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6">
                {favorites.map((movie) => (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`fav-${movie.id}`}
                    className="group relative flex flex-col rounded-xl overflow-hidden bg-surface border border-white/5 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    onClick={() => handleMovieClick(movie)}
                    aria-label={`View details for ${movie.title}`}
                  >
                    <div className="aspect-[2/3] w-full relative bg-black/40 flex items-center justify-center overflow-hidden">
                      {movie.poster ? (
                        <img
                          src={movie.poster}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                            ;(e.target as HTMLImageElement).parentElement?.classList.add(
                              'fallback-bg'
                            )
                          }}
                        />
                      ) : (
                        <Film size={32} className="text-white/10" />
                      )}
                      <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setExtendedSearchMovie(movie)
                          }}
                          className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title="扩展检索：自动匹配电影/OVA/相关季数"
                        >
                          <Search size={12} className="text-accent" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">
                            扩展检索
                          </span>
                        </button>
                      <button
                        onClick={(e) => toggleFavorite(movie, e)}
                        className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300 hover:bg-white/20"
                      >
                        <Heart
                          size={14}
                          className={
                            favorites.some((f) => f.id === movie.id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-white'
                          }
                        />
                      </button>
                      {movie.rating && movie.rating !== 'N/A' && movie.rating !== '--' && (
                        <div className="absolute top-10 left-2 bg-accent/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg">
                          {movie.rating}
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1 w-full">
                      <h3
                        className="text-sm font-bold text-white mb-1 line-clamp-1"
                        style={{ textWrap: 'balance' }}
                      >
                        {i18n.language === 'zh' || i18n.language === 'zh_TW'
                          ? movie.titleZh || movie.title
                          : movie.title}
                      </h3>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'local' ? 'block' : 'hidden'}`}
        >
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">本地资源</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    // @ts-ignore
                    const folderPath = await window.api.selectFolder()
                    if (!folderPath) return
                    if (!localPaths.includes(folderPath)) {
                      setLocalPaths((prev) => [...prev, folderPath])
                    }
                    await refreshLocalLibrary()
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Folder size={16} />
                  添加路径
                </button>
                <button
                  onClick={refreshLocalLibrary}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <RefreshCw size={16} />
                  重新扫描
                </button>
              </div>
            </div>

            {localPaths.length > 0 && (
              <div className="bg-surface rounded-xl border border-white/5 p-4">
                <div className="text-sm text-secondary mb-3">已添加路径</div>
                <div className="flex flex-col gap-2">
                  {localPaths.map((p) => (
                    <div
                      key={p}
                      className="flex items-center justify-between gap-3 bg-white/5 border border-white/5 rounded-lg px-3 py-2"
                    >
                      <div className="text-xs text-white/80 font-mono truncate">{p}</div>
                      <button
                        onClick={() => {
                          setLocalPaths((prev) => prev.filter((x) => x !== p))
                          setLocalBindings((prev) => {
                            const next = { ...prev }
                            delete next[p]
                            return next
                          })
                          setLocalMissingMap((prev) => {
                            const next = { ...prev }
                            delete next[p]
                            return next
                          })
                        }}
                        className="px-2 py-1 text-xs text-secondary hover:text-danger bg-white/5 hover:bg-white/10 rounded transition-colors"
                      >
                        移除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {localSeries.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center text-secondary bg-surface rounded-xl border border-white/5 shadow-sm">
                <Folder size={48} className="opacity-20 mb-4" />
                <p>还没有扫描到本地视频文件</p>
                <p className="text-xs mt-2 opacity-70">提示：建议按“剧名/第01集.mp4”的方式命名</p>
              </div>
            ) : (
              <div className="space-y-4">
                {localSeries.map((s) => {
                  const bindUrl = localBindings[s.folderPath] || ''
                  const missingInfo = localMissingMap[s.folderPath]
                  const missingCount = missingInfo?.missing?.length || 0
                  const localMax = s.episodes.length > 0 ? Math.max(...s.episodes) : 0
                  const localMin = s.episodes.length > 0 ? Math.min(...s.episodes) : 0

                  return (
                    <div
                      key={s.id}
                      className="bg-surface rounded-xl border border-white/5 overflow-hidden"
                    >
                      <div className="p-5 border-b border-white/5 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-white">{s.title}</h3>
                            <span className="text-xs text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                              文件 {s.fileCount}
                            </span>
                            <span className="text-xs text-secondary bg-white/5 px-2 py-0.5 rounded-full">
                              识别集数 {s.episodes.length > 0 ? `${localMin}-${localMax}` : '未知'}
                            </span>
                            {missingCount > 0 && (
                              <span className="text-xs text-danger bg-danger/10 border border-danger/20 px-2 py-0.5 rounded-full">
                                缺 {missingCount} 集
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-secondary mt-2 font-mono truncate">
                            {s.folderPath}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => checkLocalMissing(s)}
                            className="px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors"
                          >
                            检测缺集
                          </button>
                          {missingCount > 0 && (
                            <button
                              onClick={async () => {
                                setActiveTab('downloads')
                                for (const link of missingInfo.missing) {
                                  await handleStartDownload(
                                    link,
                                    s.folderPath,
                                    true,
                                    s.title,
                                    undefined
                                  )
                                }
                              }}
                              className="px-3 py-2 text-xs font-medium text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              一键补全
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="text-sm text-secondary">绑定网站剧集页面 URL（用于对比缺集）</div>
                        <div className="flex gap-2">
                          <input
                            value={bindUrl}
                            onChange={(e) => {
                              const v = e.target.value
                              setLocalBindings((prev) => ({ ...prev, [s.folderPath]: v }))
                            }}
                            placeholder="例如：https://www.pdy3.com/mv/475172.html"
                            className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          />
                          <button
                            onClick={() => checkLocalMissing(s)}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                          >
                            对比
                          </button>
                        </div>

                        {missingInfo?.loading && (
                          <div className="text-xs text-secondary">正在对比并计算缺少集数…</div>
                        )}

                        {!missingInfo?.loading && missingCount > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                            {missingInfo.missing.map((link, idx) => (
                              <button
                                key={`${s.id}-miss-${idx}`}
                                onClick={() => {
                                  setActiveTab('downloads')
                                  handleStartDownload(link, s.folderPath, true, s.title, undefined)
                                }}
                                className="p-3 bg-white/5 border border-white/5 rounded-xl hover:border-accent/50 hover:bg-accent/10 transition-colors flex items-center justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                <span className="text-sm font-medium text-white/90 truncate">
                                  {link.name}
                                </span>
                                <DownloadCloud size={16} className="text-secondary group-hover:text-accent" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'downloads' ? 'block' : 'hidden'}`}
        >
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold tracking-tight">下载管理</h2>
              <div className="flex items-center gap-3">
                {downloads.some(
                  (d) =>
                    d.status === 'downloading' || d.status === 'parsing' || d.status === 'paused'
                ) && (
                  <button
                    onClick={handleCancelAllDownloads}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-danger bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  >
                    <X size={16} />
                    取消全部
                  </button>
                )}
                <button
                  onClick={() =>
                    setDownloads(
                      downloads.filter(
                        (d) =>
                          d.status === 'downloading' ||
                          d.status === 'parsing' ||
                          d.status === 'paused'
                      )
                    )
                  }
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <Trash2 size={16} />
                  清除已完成
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              {Object.keys(groupedDownloads).length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-secondary">
                  <DownloadCloud size={48} className="opacity-20 mb-4" />
                  <p>暂无下载任务</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {Object.entries(groupedDownloads).map(([title, groupDls]) => {
                    const isExpanded = expandedDownloadGroups[title] !== false // Default true
                    const totalProgress =
                        groupDls.reduce((acc, dl) => acc + dl.progress, 0) / groupDls.length
                      const totalSpeed =
                        groupDls.reduce((acc, dl) => acc + (dl.status === 'downloading' && dl.speed ? parseFloat(dl.speed) : 0), 0)
                      const allCompleted = groupDls.every((dl) => dl.status === 'completed')
                    const hasError = groupDls.some((dl) => dl.status === 'error')
                    const firstPoster = groupDls[0]?.poster

                    return (
                      <div key={title} className="flex flex-col">
                        {/* Group Header */}
                        <div
                          className="p-4 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer border-b border-white/5"
                          onClick={() => toggleDownloadGroup(title)}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            {firstPoster ? (
                              <img
                                src={firstPoster}
                                alt={title}
                                className="w-12 h-16 object-cover rounded shadow-md border border-white/10"
                              />
                            ) : (
                              <div className="w-12 h-16 bg-white/5 rounded border border-white/10 flex items-center justify-center text-white/20">
                                <Film size={20} />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-bold text-white text-base flex items-center gap-2">
                                {title}
                                <span className="text-xs text-secondary font-normal bg-white/5 px-2 py-0.5 rounded-full">
                                  共 {groupDls.length} 个任务
                                </span>
                              </h4>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex-1 max-w-xs h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${allCompleted ? 'bg-green-500' : hasError ? 'bg-red-500' : 'bg-accent'}`}
                                      style={{ width: `${totalProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-secondary font-mono flex items-center gap-2">
                                    <span>{Math.round(totalProgress)}%</span>
                                    {totalSpeed > 0 && (
                                      <span className="text-accent/80">{totalSpeed.toFixed(1)} M/s</span>
                                    )}
                                  </span>
                                </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {groupDls.some(
                              (dl) =>
                                dl.status === 'downloading' ||
                                dl.status === 'parsing' ||
                                dl.status === 'paused'
                            ) && (
                              <button
                                onClick={(e) => handleCancelGroupDownloads(e, groupDls)}
                                className="p-2 text-secondary hover:text-danger transition-colors focus-visible:outline-none"
                                title="取消该影视全部下载"
                              >
                                <X size={18} />
                              </button>
                            )}
                            <button className="p-2 text-secondary hover:text-white transition-colors focus-visible:outline-none">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                          </div>
                        </div>

                        {/* Group Items */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden bg-black/20"
                            >
                              <div className="divide-y divide-white/5">
                                {groupDls.map((dl) => (
                                  <div
                                    key={dl.id}
                                    className="p-4 pl-20 hover:bg-white/[0.02] transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                          <span className="text-sm font-medium text-white/90">
                                            {dl.name}
                                          </span>
                                          <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                                              dl.status === 'completed'
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                                                : dl.status === 'error'
                                                  ? 'bg-red-500/20 text-red-400 border border-red-500/20'
                                                  : dl.status === 'aborted'
                                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20'
                                                    : 'bg-accent/20 text-accent border border-accent/20'
                                            }`}
                                          >
                                            {dl.status === 'parsing'
                                              ? '解析中'
                                              : dl.status === 'downloading'
                                                ? '下载中'
                                                : dl.status === 'paused'
                                                  ? '已暂停'
                                                  : dl.status === 'completed'
                                                    ? '已完成'
                                                    : dl.status === 'error'
                                                      ? '失败'
                                                      : dl.status === 'aborted'
                                                        ? '已取消'
                                                        : dl.status}
                                          </span>
                                        </div>

                                        {(dl.status === 'downloading' ||
                                          dl.status === 'completed' ||
                                          dl.status === 'aborted' ||
                                          dl.status === 'paused') && (
                                          <div className="flex items-center gap-3">
                                              <div className="h-1 w-full max-w-[200px] bg-white/10 rounded-full overflow-hidden">
                                                <motion.div
                                                  className={`h-full ${dl.status === 'completed' ? 'bg-green-500' : (dl.status as string) === 'error' || dl.status === 'aborted' ? 'bg-secondary' : dl.status === 'paused' ? 'bg-yellow-500' : 'bg-accent'}`}
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${dl.progress}%` }}
                                                  transition={{ duration: 0.3 }}
                                                />
                                              </div>
                                              <span className="text-[10px] text-secondary font-mono flex items-center gap-2">
                                                <span>{dl.progress}%</span>
                                                {dl.status === 'downloading' && dl.speed && (
                                                  <span className="text-accent/80">{dl.speed} M/s</span>
                                                )}
                                              </span>
                                            </div>
                                        )}

                                        {dl.status === 'error' && dl.error && (
                                          <p className="mt-1 text-xs text-red-400">{dl.error}</p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {dl.status === 'completed' && dl.filePath && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              // @ts-ignore
                                              window.api.showItemInFolder(dl.filePath)
                                            }}
                                            className="p-1.5 text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                            title="打开所在文件夹"
                                          >
                                            <FolderOpen size={16} />
                                          </button>
                                        )}
                                        {(dl.status === 'downloading' ||
                                          dl.status === 'paused') && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (dl.status === 'downloading') {
                                                // @ts-ignore
                                                window.api.pauseDownload(dl.id)
                                                setDownloads((prev) =>
                                                  prev.map((d) =>
                                                    d.id === dl.id ? { ...d, status: 'paused' } : d
                                                  )
                                                )
                                              } else {
                                                // @ts-ignore
                                                window.api.resumeDownload(dl.id)
                                                setDownloads((prev) =>
                                                  prev.map((d) =>
                                                    d.id === dl.id
                                                      ? { ...d, status: 'downloading' }
                                                      : d
                                                  )
                                                )
                                              }
                                            }}
                                            className="p-1.5 text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                            title={dl.status === 'downloading' ? '暂停' : '继续'}
                                          >
                                            {dl.status === 'downloading' ? (
                                              <PauseCircle size={16} />
                                            ) : (
                                              <PlayCircle size={16} />
                                            )}
                                          </button>
                                        )}
                                        {(dl.status === 'downloading' ||
                                          dl.status === 'parsing' ||
                                          dl.status === 'paused') && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              // @ts-ignore
                                              window.api.cancelDownload(dl.id)
                                              setDownloads((prev) =>
                                                prev.map((d) =>
                                                  d.id === dl.id ? { ...d, status: 'aborted' } : d
                                                )
                                              )
                                            }}
                                            className="p-1.5 text-secondary hover:text-danger bg-white/5 hover:bg-white/10 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                                            title="取消"
                                          >
                                            <X size={16} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'settings' ? 'block' : 'hidden'}`}
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">{t('settings')}</h2>

            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <ShieldAlert size={18} />
                    内容过滤
                  </h3>
                  <p className="text-sm text-secondary mt-1">选中的标签类别将会在发现和搜索结果中被自动屏蔽</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {GENRES.filter((g) => g !== '全部').map((tag) => {
                    const isBlocked = blockedTags.includes(tag)
                    return (
                      <button
                        key={`block-${tag}`}
                        onClick={() => {
                          if (isBlocked) {
                            setBlockedTags((prev) => prev.filter((t) => t !== tag))
                          } else {
                            setBlockedTags((prev) => [...prev, tag])
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          isBlocked
                            ? 'bg-danger/20 text-danger border-danger/30 hover:bg-danger/30'
                            : 'bg-white/5 text-secondary border-white/5 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {tag} {isBlocked && <X size={14} className="inline ml-1 -mt-0.5" />}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-6 flex items-center justify-between gap-4 bg-white/5 border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white/90">深度过滤模式</div>
                    <div className="text-xs text-secondary mt-1">
                      搜索时会额外抓取详情页标签后再过滤，结果更准确但会变慢
                    </div>
                  </div>
                  <button
                    onClick={() => setDeepFilterEnabled((v) => !v)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      deepFilterEnabled
                        ? 'bg-accent/10 border-accent text-accent hover:bg-accent/20'
                        : 'bg-white/5 border-white/10 text-secondary hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {deepFilterEnabled ? '已开启' : '已关闭'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{t('languageSettings')}</h3>
                  <p className="text-sm text-secondary mt-1">Choose your preferred language</p>
                </div>
              </div>
              <div className="p-6 flex gap-3">
                {['zh', 'zh_TW', 'en'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => i18n.changeLanguage(lang)}
                    aria-label={`Change language to ${lang === 'zh' ? '简体中文' : lang === 'zh_TW' ? '繁體中文' : 'English'}`}
                    className={`px-6 py-3 rounded-xl text-sm font-medium transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      i18n.language === lang
                        ? 'bg-accent/10 border-accent text-accent'
                        : 'bg-white/5 border-white/5 text-secondary hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {lang === 'zh' ? '简体中文' : lang === 'zh_TW' ? '繁體中文' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-medium text-danger flex items-center gap-2">
                    <Info size={18} />
                    免责声明 (Disclaimer)
                  </h3>
                </div>
                <div className="p-6 text-sm text-secondary space-y-4 leading-relaxed">
                  <p>
                    <strong className="text-white">本项目及相关代码仅供个人学习、技术研究与编程练习使用。</strong>
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>资源版权：</strong>本项目本身不存储、不发布、不提供任何视频资源，所有数据均来自互联网公开网页的实时抓取。视频版权归原权利人所有。</li>
                    <li><strong>禁止商业与非法用途：</strong>严禁将本项目用于任何商业牟利、非法传播、侵权盗版或其他违反当地法律法规的活动。</li>
                    <li><strong>免责条款：</strong>使用者下载、运行或二次开发本项目即表示您已同意：<strong className="text-white/80">因使用本项目所产生的一切直接或间接的法律责任、版权纠纷及其他后果，均由使用者本人独立承担，项目原作者不承担任何责任。</strong></li>
                    <li>若本项目在无意中侵犯了您的合法权益，请提交 Issue，我们将在核实后尽快删除相关功能代码。</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        {/* Embedded Browser Modal */}
        <AnimatePresence>
          {activeBrowserUrl && (
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-background z-50 flex flex-col"
            >
              <div className="h-14 border-b border-white/10 bg-surface flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4 text-sm text-secondary w-full max-w-xl">
                  <Globe size={16} />
                  <div className="bg-black/50 px-4 py-1.5 rounded-md truncate w-full border border-white/5">
                    {activeBrowserUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors">
                    <Magnet size={14} />
                    {t('magneticLinks')}
                  </button>
                  <button
                    onClick={() => setActiveBrowserUrl(null)}
                    aria-label="Close browser"
                    className="p-2 hover:bg-white/10 rounded-lg text-secondary hover:text-white transition-colors ml-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-black/50 relative">
                {/* Use webview for proper Electron embedded browser support without iframe restrictions */}
                {/* @ts-ignore */}
                <webview
                  src={activeBrowserUrl}
                  className="w-full h-full border-none bg-white"
                  title="Embedded Browser"
                  {...({ allowpopups: 'true' } as any)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login/Captcha Prompt Modal */}
        <AnimatePresence>
          {showLoginPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              >
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mb-4 text-accent">
                  <LogIn size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{t('loginRequired')}</h3>
                <p className="text-secondary text-sm mb-6 leading-relaxed">{t('loginPrompt')}</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => {
                      setShowLoginPrompt(false)
                      setActiveBrowserUrl('https://example.com/login')
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors"
                  >
                    {t('proceed')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <FavoritesExtendedSearchModal
        movie={extendedSearchMovie}
        onClose={() => setExtendedSearchMovie(null)}
        onMovieClick={handleMovieClick}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        isMovieBlocked={isMovieBlocked}
      />
    </div>
  )
}
