import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      searchSites: (query: string) => Promise<{ results: any[]; authRequired: string | null }>
      fetchMagnetLinks: (url: string) => Promise<{ title: string; url: string }[]>
      fetchDiscoverMovies: (filters: any) => Promise<any[]>
      fetchMovieDetails: (url: string) => Promise<{ onlineLinks: any[]; magnetLinks: any[] }>
      startDownload: (params: {
        playUrl: string
        name: string
        title: string
      }) => Promise<{ success: boolean; error?: string; downloadId?: string }>
      abortDownload: (id: string) => Promise<boolean>
      pauseDownload: (id: string) => Promise<boolean>
      resumeDownload: (id: string) => Promise<boolean>
      cancelDownload: (id: string) => Promise<boolean>
      onDownloadProgress: (callback: (data: any) => void) => void
    }
  }
}
