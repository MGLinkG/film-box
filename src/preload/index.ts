import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  searchSites: (query: string) => ipcRenderer.invoke('search-sites', { query }),
  fetchMagnetLinks: (url: string) => ipcRenderer.invoke('fetch-magnet-links', url),
  fetchDiscoverMovies: (filters: any) => ipcRenderer.invoke('fetch-discover-movies', filters),
  fetchMovieDetails: (url: string) => ipcRenderer.invoke('fetch-movie-details', url),
  fetchMovieMeta: (url: string) => ipcRenderer.invoke('fetch-movie-meta', url),
  scanLocalLibrary: (paths: string[]) => ipcRenderer.invoke('scan-local-library', paths),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  startDownload: (params: { playUrls: string[]; name: string; title: string; folderPath?: string }) =>
    ipcRenderer.invoke('start-download', params),
  abortDownload: (id: string) => ipcRenderer.invoke('abort-download', id),
  pauseDownload: (id: string) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id: string) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  showItemInFolder: (path: string) => ipcRenderer.invoke('show-item-in-folder', path),
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (_event, value) => callback(value))
  }
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
