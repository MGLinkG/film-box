import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      searchSites: (query: string) => Promise<{ results: any[]; authRequired: string | null }>
      fetchMagnetLinks: (url: string) => Promise<{ title: string; url: string }[]>
      fetchDiscoverMovies: (filters: any) => Promise<any[]>
      fetchMovieDetails: (
        url: string
      ) => Promise<{ onlineLinks: { name: string; urls: string[] }[]; magnetLinks: any[] }>
      fetchMovieMeta: (url: string) => Promise<{ tags: string[] }>
      scanLocalLibrary: (
        paths: string[]
      ) => Promise<{ id: string; title: string; folderPath: string; episodes: number[]; fileCount: number }[]>
      selectFolder: () => Promise<string | null>
      startDownload: (params: {
        playUrls: string[]
        name: string
        title: string
        folderPath?: string
      }) => Promise<{ success: boolean; error?: string; downloadId?: string; finalFilePath?: string }>
      abortDownload: (id: string) => Promise<boolean>
      pauseDownload: (id: string) => Promise<boolean>
      resumeDownload: (id: string) => Promise<boolean>
      cancelDownload: (id: string) => Promise<boolean>
      showItemInFolder: (path: string) => void
      onDownloadProgress: (callback: (data: any) => void) => void
    }
  }
}
