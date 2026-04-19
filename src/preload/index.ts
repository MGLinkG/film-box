import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  searchSites: (query: string, sites: any[]) => ipcRenderer.invoke('search-sites', { query, sites }),
  fetchRecommendedSites: (options?: { page?: number, pageSize?: number }) => ipcRenderer.invoke('fetch-recommended-sites', options),
  fetchMagnetLinks: (url: string) => ipcRenderer.invoke('fetch-magnet-links', url),
  fetchDiscoverMovies: (filters: any) => ipcRenderer.invoke('fetch-discover-movies', filters)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
