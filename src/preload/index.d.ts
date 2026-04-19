import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      searchSites: (query: string, sites: any[]) => Promise<{ results: any[], authRequired: string | null }>,
      fetchRecommendedSites: (options?: { page?: number, pageSize?: number }) => Promise<{ sites: any[], hasMore: boolean, total: number }>,
      fetchMagnetLinks: (url: string) => Promise<{title: string, url: string}[]>,
      fetchDiscoverMovies: (filters: any) => Promise<any[]>
    }
  }
}
