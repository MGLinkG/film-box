import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Settings as SettingsIcon, Film, Magnet, X, Globe, LogIn, Plus, ListPlus, ExternalLink, Copy, Check, Info, Compass, RefreshCw, Upload, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CHANNELS = [
  { label: '电影', value: '1' },
  { label: '剧集', value: '2' },
  { label: '综艺', value: '3' },
  { label: '动漫', value: '4' },
  { label: '短剧', value: '30' }
];

const GENRES = ['全部', '剧情', '喜剧', '动作', '爱情', '科幻', '动画', '悬疑', '惊悚', '恐怖', '犯罪', '同性', '音乐', '歌舞', '传记', '历史', '战争', '西部', '奇幻', '冒险', '灾难', '武侠'];
const YEARS = ['全部', '2026', '2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014', '2013', '2012', '2011', '2010'];
const REGIONS = ['全部', '大陆', '美国', '香港', '台湾', '韩国', '日本', '法国', '英国', '德国', '泰国', '印度', '欧洲地区', '东南亚地区', '其他'];
const LANGUAGES = ['全部', '国语', '英语', '粤语', '闽南语', '韩语', '日语', '法语', '德语', '其他'];
const SORTS = [
  { label: '最近更新', value: 'time' },
  { label: '最多播放', value: 'hits' },
  { label: '豆瓣评分', value: 'score' }
];

// Initial Empty Data
const INITIAL_SITES = [
  { id: 1, name: '胖丁影视', url: 'https://www.pdy3.com' }
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'discover' | 'sites' | 'settings'>('discover');
  const [pendingTab, setPendingTab] = useState<'discover' | 'sites' | 'settings' | null>(null);
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const [query, setQuery] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [savedSites, setSavedSites] = useState<any[]>(() => {
    const saved = localStorage.getItem('user_sites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_SITES;
  });

  const [draftSites, setDraftSites] = useState<any[]>(savedSites);
  const isSitesSaved = JSON.stringify(savedSites) === JSON.stringify(draftSites);

  const handleTabChange = (tab: 'discover' | 'sites' | 'settings') => {
    if (activeTab === 'sites' && tab !== 'sites' && !isSitesSaved) {
      setPendingTab(tab);
      setShowUnsavedPrompt(true);
    } else {
      setActiveTab(tab);
    }
  };
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [activeBrowserUrl, setActiveBrowserUrl] = useState<string | null>(null);

  // Settings State
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportConfig = () => {
    try {
      const config = {
        sites: savedSites,
        language: i18n.language,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `movie-finder-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export config:', err);
    }
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        if (config.sites && Array.isArray(config.sites)) {
          setSavedSites(config.sites);
          setDraftSites(config.sites);
          localStorage.setItem('user_sites', JSON.stringify(config.sites));
        }
        
        if (config.language && ['zh', 'zh_TW', 'en'].includes(config.language)) {
          i18n.changeLanguage(config.language);
        }
        
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 3000);
      } catch (err) {
        console.error('Failed to import config:', err);
        alert('配置文件格式错误，导入失败。');
      }
      
      // Reset input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const [isAddingSite, setIsAddingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  const [isFetchingSites, setIsFetchingSites] = useState(false);
  const [discoveredSites, setDiscoveredSites] = useState<any[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [hasMoreSites, setHasMoreSites] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Magnet Links Modal State
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [resourceLinks, setResourceLinks] = useState<{title: string, url: string}[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Discover Movies State
  const [discoverFilters, setDiscoverFilters] = useState({
    channel: '1',
    type: '全部',
    region: '全部',
    language: '全部',
    year: '全部',
    sort: 'time'
  });
  const [discoverResults, setDiscoverResults] = useState<any[]>([]);
  const [isDiscoveringMovies, setIsDiscoveringMovies] = useState(false);
  const [discoverMoviesPage, setDiscoverMoviesPage] = useState(1);
  const [hasMoreDiscoverMovies, setHasMoreDiscoverMovies] = useState(true);
  const discoverMoviesObserverTarget = useRef<HTMLDivElement>(null);

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteUrl.trim()) return;
    
    // Ensure URL has protocol
    let finalUrl = newSiteUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = `https://${finalUrl}`;
    }

    setSites([...sites, { id: Date.now(), name: newSiteName.trim(), url: finalUrl }]);
    setNewSiteName('');
    setNewSiteUrl('');
    setIsAddingSite(false);
  };

  const handleFetchRecommendedSites = useCallback(async (pageToFetch = 1) => {
    if (isFetchingSites || (pageToFetch > 1 && !hasMoreSites)) return;
    
    setIsFetchingSites(true);
    try {
      // @ts-ignore
      const res = await window.api.fetchRecommendedSites({ page: pageToFetch, pageSize: 10 });
      if (pageToFetch === 1) {
        setDiscoveredSites(res.sites);
      } else {
        setDiscoveredSites(prev => [...prev, ...res.sites]);
      }
      setDiscoverPage(pageToFetch);
      setHasMoreSites(res.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingSites(false);
    }
  }, [isFetchingSites, hasMoreSites]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreSites && !isFetchingSites && discoveredSites.length > 0) {
          handleFetchRecommendedSites(discoverPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget.current, hasMoreSites, isFetchingSites, discoverPage, discoveredSites.length, handleFetchRecommendedSites]);

  const handleFetchDiscoverMovies = useCallback(async (pageToFetch = 1, filters = discoverFilters) => {
    if (isDiscoveringMovies || (pageToFetch > 1 && !hasMoreDiscoverMovies)) return;
    
    setIsDiscoveringMovies(true);
    try {
      // @ts-ignore
      const res = await window.api.fetchDiscoverMovies({
        source: savedSites.length > 0 ? savedSites[0].url : 'https://www.pdy3.com',
        channel: filters.channel,
        type: filters.type === '全部' ? '' : filters.type,
        region: filters.region === '全部' ? '' : filters.region,
        language: filters.language === '全部' ? '' : filters.language,
        year: filters.year === '全部' ? '' : filters.year,
        sort: filters.sort,
        page: pageToFetch
      });
      
      if (pageToFetch === 1) {
        setDiscoverResults(res);
      } else {
        setDiscoverResults(prev => {
          const newItems = res.filter((item: any) => !prev.some(p => p.id === item.id));
          return [...prev, ...newItems];
        });
      }
      setDiscoverMoviesPage(pageToFetch);
      // Pdy3 usually returns 72 items per page, if less, it's the end.
      setHasMoreDiscoverMovies(res.length >= 20);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDiscoveringMovies(false);
    }
  }, [isDiscoveringMovies, hasMoreDiscoverMovies, discoverFilters]);

  // Initial fetch for discover
  useEffect(() => {
    if (activeTab === 'discover' && discoverResults.length === 0) {
      handleFetchDiscoverMovies(1);
    }
  }, [activeTab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMoreDiscoverMovies && !isDiscoveringMovies && discoverResults.length > 0) {
          handleFetchDiscoverMovies(discoverMoviesPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (discoverMoviesObserverTarget.current) {
      observer.observe(discoverMoviesObserverTarget.current);
    }

    return () => {
      if (discoverMoviesObserverTarget.current) {
        observer.unobserve(discoverMoviesObserverTarget.current);
      }
    };
  }, [discoverMoviesObserverTarget.current, hasMoreDiscoverMovies, isDiscoveringMovies, discoverMoviesPage, discoverResults.length, handleFetchDiscoverMovies]);

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleMovieClick = (movie: any) => {
    setSelectedMovie(movie);
    setIsLoadingLinks(true);
    setResourceLinks([]);
    // @ts-ignore
    window.api.fetchMagnetLinks(movie.url).then(links => {
      setResourceLinks(links);
      setIsLoadingLinks(false);
    }).catch(e => {
      console.error(e);
      setIsLoadingLinks(false);
    });
  };

  const handleCopyResource = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsTranslating(true); // Re-using isTranslating as loading state
    setHasSearched(false);
    
    try {
      if (savedSites.length === 0) {
        setResults([]);
        setIsTranslating(false);
        setHasSearched(true);
        return;
      }

      // Call the Electron main process via our exposed API
      // @ts-ignore - defined in preload.d.ts
      const response = await window.api.searchSites(query, savedSites);
      
      setResults(response.results);
      
      if (response.authRequired) {
        setShowLoginPrompt(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsTranslating(false);
      setHasSearched(true);
    }
  };

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
            onClick={() => handleTabChange('discover')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'discover' ? 'bg-white/10 text-white' : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass size={18} />
            发现影视
          </button>
          <button
            onClick={() => handleTabChange('sites')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'sites' ? 'bg-white/10 text-white' : 'text-secondary hover:text-white hover:bg-white/5'
            }`}
          >
            <ListPlus size={18} />
            {t('sitesManagement')}
          </button>
          <button
            onClick={() => handleTabChange('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              activeTab === 'settings' ? 'bg-white/10 text-white' : 'text-secondary hover:text-white hover:bg-white/5'
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
        <div className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'discover' ? 'block' : 'hidden'}`}>
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Search Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">发现影视</h2>
                <button
                  onClick={() => {
                    if (hasSearched) {
                      handleSearch();
                    } else {
                      setDiscoverResults([]);
                      handleFetchDiscoverMovies(1);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <RefreshCw size={16} className={isDiscoveringMovies || isTranslating ? "animate-spin" : ""} />
                  刷新
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={20} className="text-secondary group-focus-within:text-accent transition-colors" />
                </div>
                <input
                  type="text"
                  value={query}
                  aria-label={t('searchPlaceholder')}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value === '') {
                      setHasSearched(false);
                      setResults([]);
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
                {results.length > 0 ? results.map((movie) => (
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
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement?.classList.add('fallback-bg');
                          }}
                        />
                      ) : (
                        <Film size={32} className="text-white/10" />
                      )}
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300">
                        <Magnet size={12} className="text-accent" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Get Link</span>
                      </div>
                      {movie.rating && movie.rating !== 'N/A' && (
                        <div className="absolute top-2 left-2 bg-accent/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg">
                          {movie.rating}
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1 w-full">
                      <h3 className="text-sm font-bold text-white mb-1 line-clamp-1" style={{ textWrap: 'balance' }}>
                        {i18n.language === 'zh' || i18n.language === 'zh_TW' ? (movie.titleZh || movie.title) : movie.title}
                      </h3>
                      {movie.title !== movie.titleZh && movie.titleZh && (
                        <p className="text-[10px] text-white/50 mb-2 truncate">{movie.title}</p>
                      )}
                      <div className="mt-auto pt-2 flex gap-1.5 flex-wrap">
                        {movie.tags.map((tag: string) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] text-secondary truncate max-w-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.button>
                )) : (
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
                      {CHANNELS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, channel: c.value, type: '全部' };
                            setDiscoverFilters(newFilters);
                            handleFetchDiscoverMovies(1, newFilters);
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
                      {GENRES.map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, type: c };
                            setDiscoverFilters(newFilters);
                            handleFetchDiscoverMovies(1, newFilters);
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
                      {REGIONS.map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, region: c };
                            setDiscoverFilters(newFilters);
                            handleFetchDiscoverMovies(1, newFilters);
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
                      {YEARS.map(c => (
                        <button
                          key={c}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, year: c };
                            setDiscoverFilters(newFilters);
                            handleFetchDiscoverMovies(1, newFilters);
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
                      {SORTS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => {
                            const newFilters = { ...discoverFilters, sort: c.value };
                            setDiscoverFilters(newFilters);
                            handleFetchDiscoverMovies(1, newFilters);
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
                  {discoverResults.map((movie) => (
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
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement?.classList.add('fallback-bg');
                            }}
                          />
                        ) : (
                          <Film size={32} className="text-white/10" />
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0 duration-300">
                          <Magnet size={12} className="text-accent" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white">Get Link</span>
                        </div>
                        {movie.rating && movie.rating !== 'N/A' && movie.rating !== '--' && (
                          <div className="absolute top-2 left-2 bg-accent/90 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-lg">
                            {movie.rating}
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1 w-full">
                        <h3 className="text-sm font-bold text-white mb-1 line-clamp-1" style={{ textWrap: 'balance' }}>
                          {i18n.language === 'zh' || i18n.language === 'zh_TW' ? (movie.titleZh || movie.title) : movie.title}
                        </h3>
                        <div className="mt-auto pt-2 flex gap-1.5 flex-wrap">
                          {movie.tags.map((tag: string) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] text-secondary truncate max-w-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Discover Loader */}
                {hasMoreDiscoverMovies && discoverResults.length > 0 && (
                  <div ref={discoverMoviesObserverTarget} className="py-12 flex justify-center items-center">
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

        <div className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'sites' ? 'block' : 'hidden'}`}>
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">{t('sitesManagement')}</h2>

            {/* My Sites */}
            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('mySites')}</h3>
                <div className="flex items-center gap-3">
                  {!isSitesSaved && (
                    <button 
                      onClick={() => {
                        setSavedSites(draftSites);
                        localStorage.setItem('user_sites', JSON.stringify(draftSites));
                      }}
                      className="px-4 py-2 bg-accent text-white hover:bg-accent/90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-lg shadow-accent/20"
                    >
                      <Check size={16} />
                      保存配置
                    </button>
                  )}
                  {!isAddingSite && (
                    <button 
                      onClick={() => setIsAddingSite(true)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Plus size={16} />
                      {t('addSite')}
                    </button>
                  )}
                </div>
              </div>
              <div className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {isAddingSite && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white/[0.02]"
                    >
                      <form onSubmit={handleAddSite} className="p-6 border-b border-white/5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="newSiteName" className="text-sm font-medium text-secondary">网站名称 (Site Name)</label>
                            <input
                              id="newSiteName"
                              type="text"
                              value={newSiteName}
                              onChange={(e) => setNewSiteName(e.target.value)}
                              placeholder="e.g. YTS"
                              className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white placeholder-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-transparent"
                              autoFocus
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="newSiteUrl" className="text-sm font-medium text-secondary">网站地址 (Site URL)</label>
                            <input
                              id="newSiteUrl"
                              type="url"
                              value={newSiteUrl}
                              onChange={(e) => setNewSiteUrl(e.target.value)}
                              placeholder="e.g. https://yts.mx"
                              className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-white placeholder-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingSite(false);
                              setNewSiteName('');
                              setNewSiteUrl('');
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="submit"
                            disabled={!newSiteName.trim() || !newSiteUrl.trim()}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                          >
                            {t('addSite')}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
                {draftSites.map(site => (
                  <div key={site.id} className="p-4 px-6 flex justify-between items-center hover:bg-white/[0.02] transition-colors">
                    <div>
                      <p className="font-medium text-white">{site.name}</p>
                      <p className="text-sm text-secondary">{site.url}</p>
                    </div>
                    <button 
                      onClick={() => setDraftSites(draftSites.filter(s => s.id !== site.id))}
                      aria-label={`Remove ${site.name}`}
                      className="text-secondary hover:text-danger p-2 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                {draftSites.length === 0 && !isAddingSite && (
                  <div className="p-8 text-center text-secondary text-sm">
                    暂无网站，请添加或从下方全网检索中获取。
                  </div>
                )}
              </div>
            </div>

            {/* Discover Sites */}
            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-accent/10 to-transparent">
                <div>
                  <h3 className="text-lg font-medium">{t('discoverSites')}</h3>
                  <p className="text-sm text-secondary mt-1">自动检测并测速全网可用资源站点</p>
                </div>
                <button 
                  onClick={() => handleFetchRecommendedSites(1)}
                  disabled={isFetchingSites && discoverPage === 1}
                  className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium transition-colors hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  {(isFetchingSites && discoverPage === 1) ? <Globe size={16} className="animate-spin" aria-hidden="true" /> : <Search size={16} aria-hidden="true" />}
                  {discoveredSites.length > 0 ? '重新检索' : t('autoFetch')}
                </button>
              </div>

              {(isFetchingSites && discoverPage === 1) ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="w-10 h-10 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
                  <p className="text-secondary text-sm">{t('fetchLoading')}</p>
                </div>
              ) : discoveredSites.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {discoveredSites.map((site, index) => {
                    const isAdded = sites.some(s => s.url === site.url);
                    return (
                      <div key={`${site.url}-${index}`} className="p-6 flex flex-col sm:flex-row sm:items-center gap-6 hover:bg-white/[0.02] transition-colors">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium text-white">{site.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                              site.available 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                                : 'bg-red-500/20 text-red-400 border border-red-500/20'
                            }`}>
                              {site.available ? `${site.ping}ms` : 'Timeout'}
                            </span>
                          </div>
                          <p className="text-sm text-secondary line-clamp-2">{site.desc}</p>
                          <div className="flex items-center gap-2 text-xs text-white/40">
                            <Globe size={12} />
                            {site.url}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleCopyUrl(site.url)}
                            aria-label={`Copy URL for ${site.name}`}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-secondary hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            title={t('copy')}
                          >
                            {copiedUrl === site.url ? <Check size={16} className="text-green-400" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                          </button>
                          <button
                            onClick={() => setActiveBrowserUrl(site.url)}
                            aria-label={`Open ${site.name} in browser`}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-secondary hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            title={t('open')}
                          >
                            <ExternalLink size={16} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => {
                              if (!isAdded) {
                                setSites([...sites, { id: Date.now(), name: site.name, url: site.url }]);
                              }
                            }}
                            disabled={isAdded || !site.available}
                            aria-label={isAdded ? `${site.name} added` : `Add ${site.name}`}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                              isAdded 
                                ? 'bg-white/5 text-secondary cursor-not-allowed' 
                                : site.available 
                                  ? 'bg-white text-black hover:bg-white/90' 
                                  : 'bg-white/5 text-secondary opacity-50 cursor-not-allowed'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check size={16} aria-hidden="true" />
                                {t('added')}
                              </>
                            ) : (
                              <>
                                <Plus size={16} aria-hidden="true" />
                                {t('add')}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {hasMoreSites && (
                    <div ref={observerTarget} className="p-6 flex justify-center items-center">
                      {isFetchingSites && discoverPage > 1 && (
                        <div className="flex items-center gap-2 text-secondary text-sm">
                          <Globe size={14} className="animate-spin" aria-hidden="true" />
                          <span>正在测速并加载更多网站…</span>
                        </div>
                      )}
                    </div>
                  )}
                  {!hasMoreSites && discoveredSites.length > 0 && (
                    <div className="p-6 text-center text-secondary text-sm border-t border-white/5">
                      已加载全部已知网站
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-secondary text-sm">
                  <Globe size={32} className="mx-auto mb-4 opacity-20" />
                  点击右上角按钮开始测速检索可用网站
                </div>
              )}
            </div>
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
                  <h3 className="text-xl font-bold truncate pr-4">
                    {i18n.language === 'zh' || i18n.language === 'zh_TW' ? (selectedMovie.titleZh || selectedMovie.title) : selectedMovie.title}
                  </h3>
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
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full rounded-xl shadow-lg border border-white/5 aspect-[2/3] bg-white/5 flex items-center justify-center">
                        <Film size={48} className="text-white/20" />
                      </div>
                    )}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {selectedMovie.tags.map((tag: string) => (
                        <span key={tag} className="px-2 py-1 bg-white/10 rounded text-xs text-secondary">{tag}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        <Magnet size={18} className="text-accent" />
                        资源链接 ({resourceLinks.length})
                      </h4>
                      <button
                        onClick={() => {
                          setActiveBrowserUrl(selectedMovie.url);
                          setSelectedMovie(null);
                        }}
                        className="text-xs flex items-center gap-1 text-secondary hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors"
                      >
                        <ExternalLink size={14} />
                        网页原站打开
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6">
                      {isLoadingLinks ? (
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                          <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" aria-hidden="true"></div>
                          <p className="text-secondary text-sm" aria-live="polite">正在深度解析网页提取资源…</p>
                        </div>
                      ) : resourceLinks.length > 0 ? (
                        <div className="space-y-3">
                          {resourceLinks.map((link, idx) => (
                            <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl hover:border-white/20 transition-colors flex flex-col gap-3 group">
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
                                  {copiedLink === link.url ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center space-y-4 text-secondary">
                          <Info size={32} className="opacity-20" />
                          <p className="text-sm">未能自动提取到磁力/下载链接</p>
                          <button
                            onClick={() => {
                              setActiveBrowserUrl(selectedMovie.url);
                              setSelectedMovie(null);
                            }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition-colors"
                          >
                            点击直接访问原网页查看
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex-1 overflow-y-auto p-8 lg:p-12 ${activeTab === 'settings' ? 'block' : 'hidden'}`}>
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">{t('settings')}</h2>
            
            <div className="bg-surface rounded-xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{t('languageSettings')}</h3>
                  <p className="text-sm text-secondary mt-1">Choose your preferred language</p>
                </div>
              </div>
              <div className="p-6 flex gap-3">
                {['zh', 'zh_TW', 'en'].map(lang => (
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
                <h3 className="text-lg font-medium">配置管理</h3>
                <p className="text-sm text-secondary mt-1">导入或导出您的片源网站和应用设置，防止丢失。</p>
              </div>
              <div className="p-6 flex flex-wrap gap-4">
                <button
                  onClick={handleExportConfig}
                  className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent border border-white/10"
                >
                  {exportSuccess ? <Check size={18} className="text-green-400" aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
                  {exportSuccess ? '导出成功' : '导出配置文件 (.json)'}
                </button>
                
                <div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportConfig}
                    ref={fileInputRef}
                    className="hidden"
                    id="import-config"
                  />
                  <label
                    htmlFor="import-config"
                    className="flex items-center gap-2 px-6 py-3 bg-white text-black hover:bg-white/90 rounded-xl text-sm font-medium transition-all cursor-pointer focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface"
                  >
                    {importSuccess ? <Check size={18} aria-hidden="true" /> : <Upload size={18} aria-hidden="true" />}
                    {importSuccess ? '导入成功' : '从文件导入配置'}
                  </label>
                </div>
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
                  allowpopups="true"
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
                <p className="text-secondary text-sm mb-6 leading-relaxed">
                  {t('loginPrompt')}
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => setShowLoginPrompt(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    {t('cancel')}
                  </button>
                  <button 
                    onClick={() => {
                      setShowLoginPrompt(false);
                      setActiveBrowserUrl('https://example.com/login');
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
        {/* Unsaved Prompt Modal */}
        <AnimatePresence>
          {showUnsavedPrompt && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-surface border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
              >
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 text-orange-500">
                  <Info size={24} />
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">未保存的更改</h3>
                <p className="text-secondary text-sm mb-6 leading-relaxed">
                  您在网站管理中做了修改但尚未保存。切换模块将丢失这些修改，是否继续？
                </p>
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => {
                      setShowUnsavedPrompt(false);
                      setPendingTab(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      setDraftSites(savedSites);
                      setActiveTab(pendingTab!);
                      setShowUnsavedPrompt(false);
                      setPendingTab(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    放弃更改
                  </button>
                  <button 
                    onClick={() => {
                      setSavedSites(draftSites);
                      localStorage.setItem('user_sites', JSON.stringify(draftSites));
                      setActiveTab(pendingTab!);
                      setShowUnsavedPrompt(false);
                      setPendingTab(null);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface shadow-lg shadow-accent/20"
                  >
                    保存并切换
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
